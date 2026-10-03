/* ============================================================================
   routeCache
   ============================================================================
   Foundation, edit with care.

   Shared helpers for Astro's route cache (CMS-DESIGN PR 2). The cache itself is
   Cloudflare's Workers Cache, switched on by `cache: { provider:
   cacheCloudflare() }` in astro.config.mjs. A page is cached only when
   something calls `Astro.cache.set()`:

   - BaseLayout calls cachePublicPage(), which gives every public page a
     lifetime (PAGE_MAX_AGE, then stale-while-revalidate for a week).
   - The CMS readers (src/lib/caseStudies.ts) call cache.set(cacheHint), which
     adds the TAGS of every row the page rendered. A publish, unpublish or term
     change in the EmDash admin purges those tags, so the page is rebuilt on the
     next request. The lifetime is therefore only the ceiling on a missed purge,
     not the normal delay. It is kept short (5 minutes) until a real publish has
     been seen to purge on the live zone; then raise it (the design sketch used
     a day). Visitors never wait on it: stale-while-revalidate serves the old
     copy while a fresh one is built.

   There is deliberately no site-wide `routeRules` entry. It would also match
   /_emdash/** (the admin and its API), and signed-in responses must never be
   cacheable. Anything that does not call cache.set() stays uncached, because
   the Cloudflare adapter stamps `Cloudflare-CDN-Cache-Control: no-store` on it.
   ============================================================================ */

import type { CacheHint } from 'emdash';

/** The slice of `Astro.cache` these helpers use. */
export interface RouteCache {
  enabled?: boolean;
  set(hint: CacheHint | { maxAge?: number; swr?: number } | false): void;
}

/** Cache lifetime. Purge-by-tag makes an edit live at once; this caps a missed purge. */
export const PAGE_MAX_AGE = 60 * 5;
export const PAGE_SWR = 60 * 60 * 24 * 7;

/**
 * Give a public page its cache lifetime. Skipped (and any earlier hint
 * cleared) for the editor's `?_edit` view and for `?_preview` links, which
 * render fresh content for one person and must never be stored.
 * A no-op in dev, where Astro supplies a stub cache.
 */
export function cachePublicPage(cache: RouteCache | undefined, url: URL): void {
  if (!cache?.enabled) return;
  if (url.searchParams.has('_edit') || url.searchParams.has('_preview')) {
    cache.set(false);
    return;
  }
  cache.set({ maxAge: PAGE_MAX_AGE, swr: PAGE_SWR });
}
