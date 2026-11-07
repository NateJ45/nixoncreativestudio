// Safe to edit (the threshold).
/* ============================================================================
   The /journal gate: one rule, read in two places
   ============================================================================
   /journal/ opens to the world with its first published entry. Until then the
   page still builds (tests/routes.ts sweeps it) but it is noindex and out of the
   sitemap, the same way /photography/ waits for its photos:

     - noindex           src/pages/journal/index.astro (BaseLayout's `noindex`)
     - out of the sitemap astro.config.mjs (the sitemap filter)

   The closing's link to it is gated the same way in src/data/nav.ts.

   This file has no imports on purpose: astro.config.mjs loads it too.
   ============================================================================ */

/** True once at least one journal entry is published. */
export function journalOpen(publishedEntries: number): boolean {
  return publishedEntries > 0;
}
