/* ============================================================================
   SEO title helpers
   ============================================================================
   Search results cut a title off at roughly 60 characters, so page titles are
   written to fit. Hand-written titles live on each page; case-study titles are
   built here from the collection, because a new study should get a good title
   without anyone remembering to write one.

   The smoke spec (tests/smoke.spec.ts) expects the studio name in every title,
   so every candidate below keeps it.
   ============================================================================ */

/** The longest title that shows in full in most search results. */
export const TITLE_MAX = 60;

/** Returns the first candidate that fits in `max` characters, else the last one. */
export function fitTitle(candidates: string[], max = TITLE_MAX): string {
  return candidates.find((c) => c.length <= max) ?? candidates[candidates.length - 1];
}

/** The plain-English sector word used in case-study titles ('small-business' -> 'small business'). */
export function sectorWord(sector: string): string {
  return sector.replace(/-/g, ' ');
}

/**
 * Title for a case study page. Tries the most specific form first and falls
 * back to shorter ones until it fits:
 *   'Stone Steps 50K: nonprofit website | Nixon Creative Studio'
 *   'First Baptist Church Muncie website | Nixon Creative Studio'
 *   'First Presbyterian Church of Orangeburg | Nixon Creative Studio' (63, the
 *    one study whose name alone is too long; the client's name wins)
 */
export function studyTitle(title: string, sector: string, studio: string): string {
  return fitTitle([
    `${title}: ${sectorWord(sector)} website | ${studio}`,
    `${title} website | ${studio}`,
    `${title} | ${studio}`,
  ]);
}
