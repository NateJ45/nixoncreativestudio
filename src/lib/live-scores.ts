// Safe to edit.
/* ============================================================================
   Live client scores (overhaul package 4.7)
   ============================================================================
   The case-study rail shows a small dated "Measured live" line for the studies
   whose sites the studio builds end to end. The numbers come from
   src/data/live-scores.json, written by scripts/measure-live.mjs in the
   .github/workflows/live-scores.yml run (never from a local run).

   liveScoreFact() decides what the rail prints: nothing for a study with no
   entry, and nothing once the entry is older than MAX_AGE_DAYS, so a stale
   number never sits on a page claiming to be live. The age is read at build
   time; the monthly workflow keeps the data fresher than that.
   ============================================================================ */

/** An entry older than this is not shown. */
export const MAX_AGE_DAYS = 120;

export interface LiveScore {
  url: string;
  /** ISO timestamp of the measurement. */
  measuredAt: string;
  formFactor: 'mobile';
  runs: number;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  lcpMs: number;
  cls: number;
}

export interface LiveScoreFact {
  /** "Performance 98 · Accessibility 100" */
  scores: string;
  /** "31 Oct 2026" */
  date: string;
  /** The same date as YYYY-MM-DD, for <time datetime>. */
  iso: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The line to print for a study, or undefined when there is nothing honest to show. */
export function liveScoreFact(
  entry: LiveScore | undefined,
  now: Date = new Date(),
): LiveScoreFact | undefined {
  if (!entry) return undefined;
  const measured = new Date(entry.measuredAt);
  if (Number.isNaN(measured.getTime())) return undefined;
  const ageDays = (now.getTime() - measured.getTime()) / 86_400_000;
  // A date in the future means a bad clock or bad data; show nothing either way.
  if (ageDays < 0 || ageDays > MAX_AGE_DAYS) return undefined;
  if (!Number.isFinite(entry.performance) || !Number.isFinite(entry.accessibility)) {
    return undefined;
  }
  return {
    scores: `Performance ${entry.performance} · Accessibility ${entry.accessibility}`,
    date: `${measured.getUTCDate()} ${MONTHS[measured.getUTCMonth()]} ${measured.getUTCFullYear()}`,
    iso: measured.toISOString().slice(0, 10),
  };
}
