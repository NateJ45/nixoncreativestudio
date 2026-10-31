// Safe to edit (the threshold).
/* ============================================================================
   The /photography gate: one rule, read in three places (overhaul 2.8)
   ============================================================================
   /photography/ opens to the world only once the `photos` collection
   (src/content/photos/*.json) holds MIN_PHOTOS or more real photographs.
   Until then the page still builds, but it is:

     - out of the nav and footer       src/data/nav.ts (getNav)
     - noindex                         src/pages/photography.astro (BaseLayout's
                                       `noindex` prop)
     - out of the sitemap              astro.config.mjs (the sitemap filter)

   All three ask photographyOpen() below, so the rule cannot drift. The nav and
   the page count the collection with getCollection(); the sitemap filter runs
   in Node before the content layer exists, so it counts the JSON files in
   src/content/photos itself (the same files the collection's glob loader
   reads).

   This file has no imports on purpose: astro.config.mjs loads it too.
   Ungating is in docs/PENDING.md (6 to 20 real photos with permissions).
   ============================================================================ */

/** Photography opens (nav, index, sitemap) at this many real photos. */
export const MIN_PHOTOS = 6;

/** True when the gallery holds enough real photos to open /photography/. */
export function photographyOpen(photoCount: number): boolean {
  return photoCount >= MIN_PHOTOS;
}
