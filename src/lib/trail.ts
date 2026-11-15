/* ============================================================================
   The visitor trail (browser half)
   ============================================================================
   Safe to edit. Site-owned. The Worker half is src/trail-endpoint.ts, the table
   is migrations/0003_visitor_trail.sql, and the inquiry email reads it through
   src/lib/visitor-profile.ts. How to read it all: docs/claude/analytics.md
   section 3.

   What it records, per page view: the path and title, where the visit came from
   (on its first page), how long the page was actually in view and in use
   (paused when the tab is hidden or nobody has touched anything for 30s), how
   far down they scrolled, and short labels for what they did there: the same
   events GA4 gets through track(), the button or question they opened, and
   what they typed into the site search. Never a contact-form field, never an
   address or a name.

   Who it records: real visitors on the production hostname only, the same rule
   as the GA4 tag (no localhost, no WebDriver or headless browsers), and never
   a browser marked as Nathan's with ?me=1 (TrailHead.astro owns that flag and
   the visitor id). Playwright turns it on with window.__ncsTrailForce.

   One beacon per page view, sent again whenever the tab is hidden, the page
   is left or a View Transition swaps it. The endpoint upserts on
   (visit, page), so a resend just updates the totals.
   ============================================================================ */

import { leadSource, readTouch } from './attribution.ts';
import type { TrackParams } from './track.ts';

export const VISITOR_KEY = 'ncs-vid';
export const ME_KEY = 'ncs-me';
const VISIT_KEY = 'ncs-visit';
const ENDPOINT = '/api/trail/';
/** A visit ends after 30 minutes with no page view, like GA4's session. */
export const VISIT_GAP_MS = 30 * 60_000;
/** No input for this long and the clock stops: an open tab is not reading. */
export const IDLE_MS = 30_000;
export const MAX_EVENTS = 60;
const MAX_LABEL = 80;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/* ---- Pure helpers (unit-tested in trail.test.ts) -------------------------- */

export interface Gate {
  host: string;
  siteHost: string;
  webdriver: boolean;
  userAgent: string;
  optedOut: boolean;
  forced: boolean;
}

/** Whether this browser should keep a trail at all. */
export function shouldRun(g: Gate): boolean {
  if (g.forced) return true;
  if (g.optedOut || g.webdriver) return false;
  if (/HeadlessChrome|Lighthouse|PTST|GTmetrix|Speed Insights|bot|crawl|spider/i.test(g.userAgent))
    return false;
  const apex = g.siteHost.replace(/^www\./, '');
  if (!apex) return false;
  return g.host === apex || g.host === `www.${apex}`;
}

export interface VisitState {
  id: string;
  /** Pages seen in this visit so far. */
  n: number;
  /** Last page view, ms. */
  last: number;
}

/** Continue the saved visit, or start a new one after a 30-minute gap. */
export function nextVisit(
  saved: VisitState | null,
  now: number,
  newId: () => string,
): { visit: VisitState; fresh: boolean } {
  if (saved && UUID.test(saved.id) && now - saved.last < VISIT_GAP_MS) {
    return { visit: { id: saved.id, n: saved.n + 1, last: now }, fresh: false };
  }
  return { visit: { id: newId(), n: 1, last: now }, fresh: true };
}

/** Furthest point seen as a percent of the page, 0 to 100. */
export function scrollPercent(scrollY: number, viewport: number, docHeight: number): number {
  if (docHeight <= viewport) return 100;
  return Math.max(0, Math.min(100, Math.round(((scrollY + viewport) / docHeight) * 100)));
}

/** Collapse whitespace and cut to a short label. '' when nothing is left. */
export function tidy(s: string | null | undefined, max = MAX_LABEL): string {
  return (s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** The trail label for a GA4 event sent through track(). */
export function eventLabel(name: string, p: TrackParams = {}): string {
  const v = (k: string) => (p[k] === undefined ? '' : String(p[k]));
  switch (name) {
    case 'tool_use':
      return `tool:${v('tool_name')}`;
    case 'cta_click':
      return `cta:${v('cta_id')}`;
    case 'contact_click':
      return `contact:${v('method')}`;
    case 'book_call_click':
      return 'book_call';
    case 'visit_client_site':
      return `client_site:${v('link_domain')}`;
    case 'pricing_view':
      return `prices_seen:${v('pricing_variant') || 'block'}`;
    case 'inquiry_start':
      return 'form:started';
    case 'inquiry_step':
      return `form:${v('step_name')}`;
    case 'inquiry_error':
      return `form:error-${v('error_type')}`;
    case 'generate_lead':
      return 'form:sent';
    default:
      return name;
  }
}

/** Append a label unless it repeats the last one or the page is full. */
export function pushEvent(list: string[], label: string): string[] {
  const l = tidy(label);
  if (!l || list.length >= MAX_EVENTS || list[list.length - 1] === l) return list;
  list.push(l);
  return list;
}

/* ---- Browser wiring ------------------------------------------------------- */

interface Page {
  visit: string;
  index: number;
  path: string;
  title: string;
  source: string | null;
  started: number;
  engaged: number;
  scroll: number;
  events: string[];
  dirty: boolean;
}

let enabled = false;
let page: Page | null = null;
let lastActive = 0;
let bound = false;

function storage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/** This browser's anonymous visitor id ('' when there is none or the trail is off). */
export function visitorId(): string {
  const id = storage('local')?.getItem(VISITOR_KEY) ?? '';
  return UUID.test(id) ? id : '';
}

// The site is https-only, where every current browser has randomUUID; TrailHead.astro makes
// the visitor id the same way, and without one the trail stays off.
const uuid = (): string => crypto.randomUUID();

function payload(p: Page): string {
  return JSON.stringify({
    vid: visitorId(),
    visit: p.visit,
    i: p.index,
    path: p.path,
    title: p.title,
    src: p.source,
    t0: p.started,
    ms: p.engaged,
    sc: p.scroll,
    ev: p.events,
  });
}

/** Send the current page's totals. `wait` uses fetch so a caller can await it (the form). */
export function flush(wait = false): Promise<void> {
  if (!enabled || !page || !page.dirty || !visitorId()) return Promise.resolve();
  page.dirty = false;
  const body = payload(page);
  try {
    if (!wait && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }));
      return Promise.resolve();
    }
    return fetch(ENDPOINT, {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'content-type': 'text/plain' },
    }).then(
      () => undefined,
      () => undefined,
    );
  } catch {
    return Promise.resolve();
  }
}

/** Record a label against the current page. Safe to call any time; a no-op when off. */
export function note(label: string): void {
  if (!enabled || !page) return;
  const before = page.events.length;
  pushEvent(page.events, label);
  if (page.events.length !== before) page.dirty = true;
}

/** Called by track() for every GA4 event, whether or not GA4 itself is running. */
export function noteEvent(name: string, params?: TrackParams): void {
  note(eventLabel(name, params));
}

function measureScroll(): void {
  if (!page) return;
  const doc = document.documentElement;
  const pct = scrollPercent(window.scrollY, window.innerHeight, doc.scrollHeight);
  if (pct > page.scroll) {
    page.scroll = pct;
    page.dirty = true;
  }
}

function startPage(): void {
  const now = Date.now();
  const s = storage('session');
  let saved: VisitState | null = null;
  try {
    saved = JSON.parse(s?.getItem(VISIT_KEY) ?? 'null') as VisitState | null;
  } catch {
    saved = null;
  }
  const { visit, fresh } = nextVisit(saved, now, uuid);
  s?.setItem(VISIT_KEY, JSON.stringify(visit));
  let source: string | null = null;
  if (fresh) {
    try {
      source = leadSource(readTouch(location.href, document.referrer, location.hostname, now));
    } catch {
      source = 'unknown';
    }
  }
  page = {
    visit: visit.id,
    index: visit.n,
    path: location.pathname.slice(0, 200),
    title: tidy(document.title, 120),
    source,
    started: now,
    engaged: 0,
    scroll: 0,
    events: [],
    dirty: true,
  };
  lastActive = now;
  measureScroll();
}

function active(): void {
  lastActive = Date.now();
}

/** The label a click on a site control earns: its own words, never anything typed. */
function clickLabel(target: EventTarget | null): string {
  if (!(target instanceof Element)) return '';
  const el = target.closest('button, summary, [role="tab"], [role="slider"]');
  if (!el || el.closest('form, [data-form], #pal')) return '';
  const words = el.getAttribute('aria-label') || el.textContent;
  return words ? `click:${tidy(words, 70)}` : '';
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;
let lastSearch = '';

function onSearchInput(event: Event): void {
  const el = event.target;
  if (!(el instanceof HTMLInputElement) || el.id !== 'pal-q') return;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = tidy(el.value, 60).toLowerCase();
    // Only the settled words, and only once: "chu", then "church" is one search, and
    // backspacing to "chur" adds nothing.
    if (!page || q.length < 2 || lastSearch.startsWith(q)) return;
    const prev = `search:${lastSearch}`;
    if (lastSearch && q.startsWith(lastSearch) && page.events[page.events.length - 1] === prev)
      page.events.pop();
    lastSearch = q;
    note(`search:${q}`);
  }, 1200);
}

/**
 * Start the trail for this page. Call on every astro:page-load (initTracking
 * does). The first call binds the listeners; later calls close the previous
 * page and open the next.
 */
export function initTrail(): void {
  const w = window as unknown as { __ncsTrailForce?: boolean };
  const local = storage('local');
  enabled = shouldRun({
    host: location.hostname,
    siteHost: (() => {
      try {
        return new URL(import.meta.env.SITE ?? '').hostname;
      } catch {
        return '';
      }
    })(),
    webdriver: navigator.webdriver === true,
    userAgent: navigator.userAgent,
    optedOut: local?.getItem(ME_KEY) === '1',
    forced: w.__ncsTrailForce === true,
  });
  if (!enabled || !visitorId()) {
    enabled = false;
    return;
  }
  if (page && page.path !== location.pathname) void flush();
  startPage();

  if (bound) return;
  bound = true;
  const opts = { passive: true, capture: true } as const;
  for (const type of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'])
    addEventListener(type, active, opts);
  addEventListener(
    'scroll',
    () => {
      active();
      measureScroll();
    },
    opts,
  );
  document.addEventListener('click', (e) => note(clickLabel(e.target)), { capture: true });
  document.addEventListener('input', onSearchInput, { capture: true });
  setInterval(() => {
    if (!page || document.visibilityState !== 'visible') return;
    if (Date.now() - lastActive > IDLE_MS) return;
    page.engaged += 1000;
    page.dirty = true;
  }, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush();
  });
  addEventListener('pagehide', () => void flush());
  document.addEventListener('astro:before-swap', () => void flush());
}
