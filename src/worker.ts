// Foundation, edit with care.
// Worker entry for EmDash on Cloudflare. Re-exports the plugin bridge, wires the
// scheduled handler (publishing scheduled posts, plugin cron), and wraps every
// request on the way in and out. The wrapper is outermost, so it does not depend
// on the order of Astro/EmDash middleware. (A first attempt as src/middleware.ts
// was judged broken only because the check used HEAD requests; it was never
// proven to fail, so do not read this as a verified limitation of middleware.)
//
// What the wrapper does (since CMS-DESIGN PR 2 every page is server-rendered, so
// the Worker now answers everything the static assets used to):
//
// 1. Trailing-slash redirect. The static asset handler used to 301 `/about` to
//    `/about/`. With nothing prerendered, a page path without a slash would
//    serve a second live copy, so it is redirected here. Skipped for anything
//    starting with `/_` (/_emdash, /_astro, /_image) and for paths whose last
//    segment has a file extension (/rss.xml, /sitemap-*.xml, /og/*.png).
//
// 2. Long-lived caching for CMS images. EmDash serves media files, and Astro's
//    /_image resizer serves the resized WebP copies, both with `Cache-Control:
//    max-age=0, must-revalidate`. Every page view re-ran the image transform
//    (about 0.22s each). These URLs are safe to cache for a long time: a media
//    file's URL contains its unique id, and the resizer URL contains that URL
//    plus the width, so a changed image is a new URL. 30 days (not "immutable
//    for a year") leaves room for an editor replacing an asset in place. Two
//    layers: the Cache-Control header (browser + CDN) and Cloudflare's edge
//    cache (caches.default) so the transform runs once per image-and-width, not
//    once per visitor. Measured on the trial: a fresh width took 1.36s, then
//    0.12s once cached. The route-cache provider stamps `Cloudflare-CDN-Cache-
//    Control: no-store` on every Astro response, which would also switch off the
//    Workers Cache for these URLs, so that header is replaced with the same
//    30-day lifetime here.
//
// 3. A safety net for the route cache (astro.config.mjs `cache`). The Workers
//    Cache sits IN FRONT of this Worker and stores whatever lifetime a response
//    asks for, whatever its status. Anything that is not a clean 200, or that
//    sets a cookie, is forced to `no-store` here, so a 404, a redirect or an
//    error page can never be stored (a case study published tomorrow must not
//    hit a cached 404 today).
//
// 4. Security headers on HTML pages. `public/_headers` only applies to files the
//    assets binding serves, and the HTML pages no longer are files, so the same
//    five headers are added to every HTML response here. Not applied under
//    /_emdash (the admin), where framing and window rules are EmDash's call.
//
// Testing note: use GET, not `curl -I`. A HEAD request skips the image-cache
// branch on purpose (method check), which sent the first debugging pass the
// wrong way.
import type { ExportedHandler } from '@cloudflare/workers-types';
import handler, { createScheduledHandler, PluginBridge } from '@emdash-cms/cloudflare/worker';

export { PluginBridge };

const CACHEABLE_PREFIXES = ['/_image', '/_emdash/api/media/file/'];
const CACHE_CONTROL = 'public, max-age=2592000, stale-while-revalidate=86400';
const CDN_CACHE_CONTROL = 'Cloudflare-CDN-Cache-Control';
// What the browser may do with a cached public page (see finalize).
const BROWSER_CACHE_CONTROL = 'public, max-age=120, stale-while-revalidate=3600';

// The five site-wide headers from public/_headers. Keep the two lists in step.
const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

/** True for a GET to a page-like path that is missing its trailing slash. */
function needsTrailingSlash(pathname: string): boolean {
  if (pathname === '/' || pathname.endsWith('/') || pathname.startsWith('/_')) return false;
  const last = pathname.slice(pathname.lastIndexOf('/') + 1);
  return !last.includes('.');
}

/**
 * Route-cache safety net plus security headers (items 3 and 4 in the header
 * comment). Returns the response untouched when there is nothing to change.
 */
function finalize(res: Response, pathname: string): Response {
  // A WebSocket upgrade (plugin bridge, admin) must pass through as it is.
  if ((res as unknown as { webSocket?: unknown }).webSocket) return res;

  const storeNever = res.status !== 200 || res.headers.has('Set-Cookie');
  const isHtml = (res.headers.get('Content-Type') ?? '').includes('text/html');
  const addSecurity = isHtml && !pathname.startsWith('/_emdash');
  if (!storeNever && !addSecurity) return res;

  const headers = new Headers(res.headers as unknown as HeadersInit);
  if (storeNever) {
    headers.set(CDN_CACHE_CONTROL, 'no-store');
    headers.delete('Cache-Tag');
  }
  if (addSecurity) {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  }
  // Let the BROWSER reuse a public page for a short while. The route cache sends
  // the browser `Cache-Control: no-cache`, which forbids reuse, so Astro's
  // viewport prefetch was downloaded and then thrown away: every click fetched
  // the page again (measured 2026-10-03: a prefetch followed by a second GET on
  // click, 80 to 400ms per navigation). With a lifetime the click is served from
  // the prefetched copy. Only for a clean 200 HTML page the route cache is
  // already storing (it carries a CDN lifetime that is not no-store); the
  // editor view, previews, cookies and the admin never qualify. The browser copy
  // is also served stale while it refreshes (Age from the edge counts against
  // max-age, so without the stale window an older edge copy would never reuse).
  const cdn = res.headers.get(CDN_CACHE_CONTROL);
  if (!storeNever && addSecurity && cdn && !/no-store/i.test(cdn)) {
    headers.set('Cache-Control', BROWSER_CACHE_CONTROL);
  }
  return new Response(res.body as unknown as BodyInit, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export default {
  ...handler,
  async fetch(request, env, ctx) {
    if (!handler.fetch) return undefined as never;
    const url = new URL(request.url);
    const { pathname } = url;
    const isGet = request.method === 'GET';

    if ((isGet || request.method === 'HEAD') && needsTrailingSlash(pathname)) {
      return Response.redirect(`${url.origin}${pathname}/${url.search}`, 301) as unknown as Awaited<
        ReturnType<NonNullable<typeof handler.fetch>>
      >;
    }

    const cacheable = isGet && CACHEABLE_PREFIXES.some((p) => pathname.startsWith(p));
    if (!cacheable) {
      const res = await handler.fetch(request, env, ctx);
      const out = finalize(res as unknown as Response, pathname);
      // The not-found page itself, requested by name, answers 200 (as the
      // prerendered /404 did) so Lighthouse CI, which refuses any 4xx page, can
      // audit its template. A real unknown URL still answers 404.
      if (pathname === '/404/' && out.status === 404) {
        return new Response(out.body as unknown as BodyInit, {
          status: 200,
          headers: new Headers(out.headers as unknown as HeadersInit),
        }) as unknown as typeof res;
      }
      return out as unknown as typeof res;
    }

    const edge = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
    const hit = await edge?.match(request as unknown as Request);
    if (hit) return hit as unknown as Response as never;

    const res = await handler.fetch(request, env, ctx);
    // Only cache clean successes; leave errors, redirects and partial content alone.
    if (res.status !== 200) return finalize(res as unknown as Response, pathname) as never;

    const headers = new Headers(res.headers as unknown as HeadersInit);
    headers.set('Cache-Control', CACHE_CONTROL);
    headers.set(CDN_CACHE_CONTROL, CACHE_CONTROL);
    headers.delete('Cache-Tag');
    const out = new Response(res.body as unknown as BodyInit, { status: 200, headers });
    if (edge) ctx.waitUntil(edge.put(request as unknown as Request, out.clone()));
    return out as unknown as typeof res;
  },
  scheduled: createScheduledHandler(),
} satisfies ExportedHandler;
