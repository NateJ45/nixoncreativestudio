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

/*
   Scheduled posts (decided 2026-11-15: one post a week, written ahead). A post
   with a future `published` date is built only once that day has come in
   Cincinnati. Every journal list (index, post pages, RSS, llms.txt, peek.json,
   the sector pages' "Questions people ask first", the closing's link) reads
   isLive, so a post appears everywhere on the same build. The weekly
   `journal-publish.yml` workflow fires a Cloudflare deploy hook so that build
   happens without a push. `published` is a date-only value parsed as UTC
   midnight, so its calendar day is its UTC day (vault gotcha
   build-zone-shifts-date-only-values); today is read in New York.
*/

/** Today's calendar date in Cincinnati, as YYYY-MM-DD. */
export function todayInCincinnati(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Build time, or JOURNAL_NOW (an ISO date) to preview a later week: JOURNAL_NOW=2026-12-16 npm run build. */
function buildNow(): Date {
  // import.meta.env for the pages (prerendered in workerd, where process.env is empty);
  // process.env when astro.config.mjs loads this file in Node.
  const override =
    (import.meta as { env?: Record<string, string | undefined> }).env?.JOURNAL_NOW ??
    globalThis.process?.env?.JOURNAL_NOW;
  return override ? new Date(`${override}T12:00:00Z`) : new Date();
}

/** True for a post that is not a draft and whose `published` day has come. */
export function isLive(
  data: { draft?: boolean; published: Date },
  now: Date = buildNow(),
): boolean {
  return data.draft !== true && data.published.toISOString().slice(0, 10) <= todayInCincinnati(now);
}
