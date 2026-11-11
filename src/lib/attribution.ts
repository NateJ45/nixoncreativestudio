/* ============================================================================
   First-touch attribution: where a visitor first came from
   ============================================================================
   Safe to edit. Site-owned.

   The question this answers: "which of my channels actually brings inquiries?"
   GA4 can tell you a lot, but it samples, it misses visitors who block it, and
   it forgets after 14 months. The inquiry row in D1 is forever. So on the very
   first page of a visit we note, in this browser only:

     landing    the path they landed on (no query string)
     referrer   the HOSTNAME of the site that sent them (never the full URL),
                or '' when they typed the address or came from a bookmark
     utm_*      utm_source, utm_medium, utm_campaign when the link carried them
     at         when, as epoch ms, so the inquiry can say "first visit 12 days ago"

   It is kept in localStorage under one key, first touch wins (a later visit
   from Google does not overwrite the Instagram link that first brought them).
   A per-tab page count lives in sessionStorage. Nothing here is sent anywhere
   on its own: the contact form copies it into hidden fields when, and only
   when, the visitor chooses to send an inquiry, and generate_lead carries the
   short source label. /privacy says so.

   Every storage call is wrapped: private windows and blocked storage make it
   a silent no-op, and the form still sends.
   ============================================================================ */

export interface FirstTouch {
  landing: string;
  referrer: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  at: number;
}

const KEY = 'ncs-first-touch';
const PAGES_KEY = 'ncs-pages-seen';

/** Short slug-like labels only: anything else is dropped, so no free text leaks in. */
const SAFE = /^[a-z0-9][a-z0-9._\-/]{0,79}$/i;

function safe(v: string | null | undefined): string {
  const s = (v ?? '').trim().toLowerCase();
  return SAFE.test(s) ? s : '';
}

/** Hostnames of AI assistants and answer engines, so a lead can say it came from one. */
export const AI_HOSTS =
  /(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|bard\.google\.com|copilot\.microsoft\.com|you\.com|phind\.com|poe\.com|meta\.ai|deepseek\.com|grok\.com)$/;

const SEARCH_HOSTS =
  /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org|brave\.com|kagi\.com)$/;
const SOCIAL_HOSTS =
  /(^|\.)(instagram\.com|facebook\.com|fb\.com|linkedin\.com|lnkd\.in|t\.co|x\.com|twitter\.com|threads\.net|pinterest\.com|reddit\.com|youtube\.com|nextdoor\.com)$/;

/**
 * Build the first-touch record from the current page. `ownHost` is this
 * site's hostname, so internal navigation never counts as a referrer.
 */
export function readTouch(
  href: string,
  referrer: string,
  ownHost: string,
  now: number,
): FirstTouch {
  const url = new URL(href);
  let refHost = '';
  try {
    if (referrer) refHost = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    refHost = '';
  }
  const own = ownHost.replace(/^www\./, '').toLowerCase();
  if (refHost === own) refHost = '';
  const p = url.searchParams;
  return {
    // SAFE wants a letter or digit first, so check the path without its leading slash.
    landing: `/${safe(url.pathname.slice(1))}`,
    referrer: safe(refHost),
    utm_source: safe(p.get('utm_source')),
    utm_medium: safe(p.get('utm_medium')),
    utm_campaign: safe(p.get('utm_campaign')),
    at: now,
  };
}

/**
 * One short label for "where this lead came from", used as the GA4
 * lead_source parameter and shown in the inquiry email. Order: an explicit
 * utm_source wins, then the referrer's kind, then direct.
 */
export function leadSource(t: FirstTouch | null): string {
  if (!t) return 'unknown';
  if (t.utm_source) return t.utm_source;
  const r = t.referrer;
  if (!r) return 'direct';
  if (AI_HOSTS.test(r)) return `ai-${r}`.slice(0, 60);
  if (SEARCH_HOSTS.test(r))
    return `search-${r
      .replace(/\.[a-z.]+$/, '')
      .split('.')
      .pop()}`;
  if (SOCIAL_HOSTS.test(r))
    return `social-${r
      .replace(/\.[a-z]+$/, '')
      .split('.')
      .pop()}`;
  return `referral-${r}`.slice(0, 60);
}

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The saved first touch, or null when there is none or storage is blocked. */
export function getFirstTouch(): FirstTouch | null {
  try {
    const raw = store()?.getItem(KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as FirstTouch;
    return typeof t?.at === 'number' ? t : null;
  } catch {
    return null;
  }
}

/** Pages viewed in this tab's visit so far. */
export function pagesSeen(): number {
  try {
    return Number(sessionStorage.getItem(PAGES_KEY) ?? '0') || 0;
  } catch {
    return 0;
  }
}

/**
 * Call on every page load (astro:page-load). Saves the first touch once and
 * counts the page. A visit that arrives with fresh UTM tags after 90 days
 * replaces an old first touch, so a returning campaign click is not lost.
 */
export function noteVisit(): void {
  try {
    const now = Date.now();
    const current = readTouch(location.href, document.referrer, location.hostname, now);
    const saved = getFirstTouch();
    const stale = saved && now - saved.at > 90 * 864e5 && (current.utm_source || current.referrer);
    if (!saved || stale) store()?.setItem(KEY, JSON.stringify(current));
    sessionStorage.setItem(PAGES_KEY, String(pagesSeen() + 1));
  } catch {
    // Attribution is a nice-to-have; never let it break a page.
  }
}

/** The hidden form fields the contact form sends, from the saved first touch. */
export function attributionFields(now: number = Date.now()): Record<string, string> {
  const t = getFirstTouch();
  if (!t) return { lead_source: 'unknown', pages_seen: String(pagesSeen()) };
  const days = Math.max(0, Math.floor((now - t.at) / 864e5));
  return {
    lead_source: leadSource(t),
    first_landing: t.landing,
    first_referrer: t.referrer,
    utm_source: t.utm_source,
    utm_medium: t.utm_medium,
    utm_campaign: t.utm_campaign,
    days_since_first: String(days),
    pages_seen: String(pagesSeen()),
  };
}
