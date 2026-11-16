/* ============================================================================
   Microsoft Clarity: session replays, heatmaps, rage and dead clicks
   ============================================================================
   Site-owned. Runs from the layout's script bundle (BaseLayout.astro), reading
   the project id from <meta name="ncs-clarity">, which Analytics.astro prints
   only when PUBLIC_CLARITY_ID is set (components/analytics/Clarity.astro).
   It is not an inline script on purpose: every inline script costs a sha256 in
   the CSP line of public/_headers, and Cloudflare rejects a line over 2,000
   characters (the deploy failed at 2,037 on 2026-11-15).

   Same rules as the GA4 tag: production hostname only, never in an automated
   browser, script element built at runtime. Its own rules:
     - Not before the visitor does something (scroll, tap, key, mouse move) or
       6 seconds after this runs, so it never sits in front of the LCP.
     - Never with Global Privacy Control, or in a browser marked as Nathan's
       (?me=1, TrailHead.astro).
   The contact form carries data-clarity-mask, so nothing typed into it is
   recorded; Clarity's Balanced masking covers other inputs.

   Each session is tagged with the visitor id (clarity('identify')), the same
   id the trail and the inquiry email use, plus where the visitor first came
   from. In Clarity: Recordings > Filters > Custom user ID.
   ============================================================================ */

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[] };

let started = false;

export function initClarity(): void {
  if (started) return;
  const id = document.querySelector<HTMLMetaElement>('meta[name="ncs-clarity"]')?.content ?? '';
  if (!/^[a-z0-9]{6,20}$/i.test(id)) return;
  const automated =
    navigator.webdriver ||
    /HeadlessChrome|Lighthouse|PTST|GTmetrix|Speed Insights/i.test(navigator.userAgent);
  const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
  let me = false;
  let vid = '';
  let touch: { landing?: string; utm_source?: string; referrer?: string } | null = null;
  try {
    me = localStorage.getItem('ncs-me') === '1';
    vid = localStorage.getItem('ncs-vid') ?? '';
    touch = JSON.parse(localStorage.getItem('ncs-first-touch') ?? 'null');
  } catch {
    // Storage blocked: no id and no tags, Clarity still records.
  }
  let siteHost = '';
  try {
    siteHost = new URL(import.meta.env.SITE ?? '').hostname.replace(/^www\./, '');
  } catch {
    siteHost = '';
  }
  const onSite =
    siteHost && (location.hostname === siteHost || location.hostname === `www.${siteHost}`);
  if (automated || me || gpc === true || !onSite) return;
  started = true;

  const w = window as unknown as { clarity?: ClarityFn };
  const queue: ClarityFn =
    w.clarity ??
    Object.assign(
      function (...args: unknown[]) {
        (queue.q = queue.q ?? []).push(args);
      },
      { q: [] as unknown[] },
    );
  w.clarity = queue;
  if (vid) queue('identify', vid);
  if (touch) {
    queue('set', 'first_landing', touch.landing || '/');
    queue('set', 'first_source', touch.utm_source || touch.referrer || 'direct');
  }

  let loaded = false;
  const load = () => {
    if (loaded) return;
    loaded = true;
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.clarity.ms/tag/${id}`;
    document.head.appendChild(s);
  };
  for (const t of ['scroll', 'pointerdown', 'pointermove', 'keydown', 'touchstart'])
    addEventListener(t, load, { once: true, passive: true });
  setTimeout(load, 6000);
}
