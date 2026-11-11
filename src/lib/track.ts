/* ============================================================================
   GA4 events (overhaul package 4.1)
   ============================================================================
   Safe to edit. Site-owned on purpose: the GA4 tag itself lives in the
   PORTABLE src/components/analytics/GoogleAnalytics.astro, which is canonical
   in the starter and stays untouched. This file only CALLS window.gtag.

   No-op rule. Every event goes through track(), and track() does nothing at
   all unless window.gtag is a function. GoogleAnalytics.astro only defines
   gtag on the production hostname, in a real (non-automated) browser, and only
   when PUBLIC_GA_ID is set. So local dev, CI, previews and Playwright send
   nothing unless a test stubs window.gtag itself (tests/track.spec.ts does).

   No personal data. Event parameters are fixed labels the site wrote: where
   the click was (header, footer, main, menu), a client site's hostname, the
   pricing block's variant. Never a form field value, never an email address,
   never link text (the CopyEmail link text IS the address). The /privacy
   Analytics section names every event below; add a line there when you add
   one here.

   The events:
     generate_lead      the contact form posted and Web3Forms said OK. Fired
                        from the form script in src/pages/contact.astro.
     visit_client_site  a "Visit <host>" or "Live at <host>" link on a study.
                        Param: link_domain (the client site's hostname).
     book_call_click    the "Open my calendar" link on /contact (only shown
                        when site.bookingUrl is set).
     contact_click      any mailto: or sms: link (picked up automatically, no
                        attribute needed) or a CopyEmail copy button.
                        Param: method ('mailto' or 'copy').
     pricing_view       a pricing block scrolled into view, once per page.
                        Param: pricing_variant ('teaser' or 'full').
     cta_click          any other element with data-cta="<id>", such as Size
                        up's "Send this to Nathan" (data-cta="size_up_send").
                        Param: cta_id.
   Every click event also carries cta_location.

   Markup:
     data-cta="visit_client_site"   (or book_call_click, contact_click, or
                                     any other id, which becomes cta_click)
     data-cta-method="copy"         contact_click only
     data-cta-location="hero"       optional; otherwise the nearest landmark
     data-track-view="pricing_view" on the element whose first sighting counts
     data-track-variant="teaser"    optional param for pricing_view
   ============================================================================ */

import { noteVisit } from './attribution.ts';

export type TrackParams = Record<string, string | number | boolean>;

type Gtag = (command: 'event', name: string, params?: TrackParams) => void;

/** Event names the click layer may send as-is. Any other data-cta id becomes cta_click. */
export const NAMED_EVENTS = ['visit_client_site', 'book_call_click', 'contact_click'] as const;

/** A param value is only sent when it looks like a short label, never free text. */
// Slashes are allowed so a landing path (work/stone-steps-50k) can ride along; '@' and spaces never are.
const LABEL = /^[a-z0-9][a-z0-9._/-]{0,79}$/i;

function gtagOf(win: unknown): Gtag | undefined {
  const g = (win as { gtag?: unknown } | undefined)?.gtag;
  return typeof g === 'function' ? (g as Gtag) : undefined;
}

/**
 * Send one GA4 event. Does nothing when gtag is absent (no consent, dev, CI,
 * an automated browser) and never throws, so a tracking bug can't break a
 * click or a form. Params that are not short labels are dropped.
 */
export function track(name: string, params: TrackParams = {}, win: unknown = globalThis): void {
  const gtag = gtagOf(win);
  if (!gtag) return;
  const clean: TrackParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && !LABEL.test(value)) continue;
    clean[key] = value;
  }
  try {
    gtag('event', name, clean);
  } catch {
    // Analytics must never get in the visitor's way.
  }
}

/** The hostname of an http(s) URL without "www.", or '' when it isn't one. */
export function linkDomain(href: string): string {
  try {
    const url = new URL(href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** The smallest slice of an element this module reads, so it can be unit tested. */
export interface CtaTarget {
  /** data-cta, if the element has one. */
  cta?: string;
  /** data-cta-method. */
  method?: string;
  /** The element's href (anchors only). */
  href?: string;
  /** Where on the page it sits: data-cta-location, else the landmark. */
  location: string;
}

/** Work out which event a click on this target sends, or null for none. */
export function eventFor(target: CtaTarget): { name: string; params: TrackParams } | null {
  const base: TrackParams = { cta_location: target.location };
  const href = target.href ?? '';
  const id = target.cta;

  if (id === 'visit_client_site') {
    const domain = linkDomain(href);
    return { name: id, params: domain ? { ...base, link_domain: domain } : base };
  }
  if (id === 'book_call_click') return { name: id, params: base };
  if (id === 'contact_click' || (!id && /^(mailto|sms|tel):/i.test(href))) {
    const method =
      target.method ||
      (/^mailto:/i.test(href)
        ? 'mailto'
        : /^sms:/i.test(href)
          ? 'text'
          : /^tel:/i.test(href)
            ? 'call'
            : 'other');
    return { name: 'contact_click', params: { ...base, method } };
  }
  if (id) return { name: 'cta_click', params: { ...base, cta_id: id } };
  return null;
}

/* ---- Browser wiring ------------------------------------------------------- */

function locationOf(el: Element): string {
  const own = el.closest<HTMLElement>('[data-cta-location]')?.dataset.ctaLocation;
  if (own) return own;
  if (el.closest('dialog')) return 'menu';
  if (el.closest('header')) return 'header';
  if (el.closest('footer')) return 'footer';
  if (el.closest('main')) return 'main';
  return 'page';
}

function onClick(event: Event): void {
  const start = event.target;
  if (!(start instanceof Element)) return;
  // An explicit data-cta wins; otherwise any mailto: link counts.
  const el =
    start.closest<HTMLElement>('[data-cta]') ??
    start.closest('a[href^="mailto:" i], a[href^="sms:" i], a[href^="tel:" i]');
  if (!el) return;
  const result = eventFor({
    cta: (el as HTMLElement).dataset.cta,
    method: (el as HTMLElement).dataset.ctaMethod,
    href: el.getAttribute('href') ?? undefined,
    location: locationOf(el),
  });
  if (result) track(result.name, result.params);
}

/* ---- Tool use ----------------------------------------------------------------
   The site's toys (draw a card, the tier picker, the receipt, the first-Sunday
   tool...) are part of the pitch, so it is worth knowing which ones people
   actually touch. The first click or change inside one sends tool_use once per
   page, with tool_name from the table below and tool_result saying what kind of
   control it was. Nothing typed is ever read. The contact form is left out on
   purpose: it sends its own inquiry_start and inquiry_step events. */
export const TOOLS: [selector: string, name: string][] = [
  ['[data-draw]', 'draw_card'],
  ['[data-sun]', 'first_sunday'],
  ['[data-size]', 'size_frame'],
  ['[data-rcpt]', 'live_receipt'],
  ['[data-reply]', 'reply_order'],
  ['[data-ba]', 'before_after'],
  ['[data-theme-flip]', 'theme_flip'],
  ['[data-sheet]', 'client_sheet'],
  ['#fit', 'fit_quiz'],
  ['#pick', 'tier_picker'],
  ['#costs', 'cost_compare'],
  ['#faq', 'faq'],
  ['#jobs', 'work_jobs'],
  ['[data-f]', 'work_filter'],
  ['[data-v]', 'work_view'],
];

const toolsSeen = new Set<string>();

/** The tool a control belongs to, or '' when it is not one of ours. */
export function toolOf(el: Element): string {
  for (const [selector, name] of TOOLS) if (el.closest(selector)) return name;
  return '';
}

function onInteract(event: Event): void {
  const start = event.target;
  if (!(start instanceof Element)) return;
  const el = start.closest('button, input, select, summary, [role="slider"]');
  if (!el || el.closest('[data-form], [data-cta]')) return;
  const name = toolOf(el);
  if (!name || toolsSeen.has(name)) return;
  toolsSeen.add(name);
  const kind = el.tagName === 'SUMMARY' ? 'open' : el.tagName.toLowerCase();
  track('tool_use', { tool_name: name, tool_result: kind });
}

let viewObserver: IntersectionObserver | undefined;

/** Watch this page's [data-track-view] elements; each one fires once. */
function watchViews(): void {
  viewObserver?.disconnect();
  viewObserver = undefined;
  const targets = document.querySelectorAll<HTMLElement>('[data-track-view]');
  if (targets.length === 0 || !('IntersectionObserver' in window)) return;
  const seen = new Set<string>();
  viewObserver = new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        observer.unobserve(el);
        const name = el.dataset.trackView ?? '';
        // Two pricing blocks on one page still count as one pricing_view.
        if (!name || seen.has(name)) continue;
        seen.add(name);
        const variant = el.dataset.trackVariant;
        track(name, variant ? { pricing_variant: variant } : {});
      }
    },
    // Counts once the block is a little way into the viewport, not on a
    // one-pixel graze while scrolling past.
    { threshold: 0.25 },
  );
  targets.forEach((el) => viewObserver!.observe(el));
}

/**
 * Bind the click listener once (it is delegated on document, so it survives
 * View Transitions) and re-scan view targets on every astro:page-load.
 */
export function initTracking(): void {
  // First-touch attribution (src/lib/attribution.ts): stored in this browser only,
  // read by the contact form when someone chooses to send an inquiry.
  noteVisit();
  const w = window as unknown as { __ncsTrackBound?: boolean };
  if (!w.__ncsTrackBound) {
    w.__ncsTrackBound = true;
    // Capture phase, so a handler that stops propagation can't hide a click.
    document.addEventListener('click', onClick, { capture: true });
    document.addEventListener('click', onInteract, { capture: true });
    document.addEventListener('change', onInteract, { capture: true });
  }
  watchViews();
}
