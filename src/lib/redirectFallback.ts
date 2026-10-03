/* ============================================================================
   redirectFallback (the two retired URLs, until EmDash holds them)
   ============================================================================
   Foundation, edit with care. TEMPORARY BRIDGE: delete this file (and its use in
   src/worker.ts) once production holds the rows (docs/PENDING.md).

   CMS-DESIGN PR 13 moves the site's redirects from astro.config.mjs into EmDash
   Redirects (Nathan adds one in the admin when he renames or retires a page). The
   two that existed:

     /now                            -> /about/#now   (the /now page merged into About)
     /work/west-chester-preschool    -> /work/        (a retired case study, 2026-10-01)

   They are loaded into production by `npm run cms:production-load` from
   cms/content/redirects.json, which needs an admin token Nathan does not hand to a
   Claude session. Until that has run, production has none of those rows, and the
   config redirects are gone, so these two URLs would answer 404. This list is the
   safety net: src/worker.ts consults it ONLY when the site is about to answer 404
   for a GET or HEAD, which means EmDash's own redirects (applied in its middleware,
   before the page renders) always win, and an entry in the admin can change or
   shadow these. A redirect deleted in the admin does NOT stop these two while this
   file exists, which is why it is removed once the rows are live.

   Keep this list equal to cms/content/redirects.json (a unit test checks it).
   Matching ignores a trailing slash, the way EmDash's middleware does.
   ============================================================================ */

export interface FallbackRedirect {
  source: string;
  destination: string;
  type: 301;
}

export const FALLBACK_REDIRECTS: FallbackRedirect[] = [
  { source: '/now', destination: '/about/#now', type: 301 },
  { source: '/work/west-chester-preschool', destination: '/work/', type: 301 },
];

/** The same path with the trailing slash added or removed ("/" is left alone). */
function withoutSlash(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/** The fallback redirect for a request path, or undefined. */
export function fallbackRedirect(pathname: string): FallbackRedirect | undefined {
  const path = withoutSlash(pathname);
  return FALLBACK_REDIRECTS.find((r) => r.source === path);
}
