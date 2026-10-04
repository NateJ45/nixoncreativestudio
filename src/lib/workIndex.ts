/* ============================================================================
   workIndex | how /work and the case study pages arrange the case studies
   ============================================================================
   Safe to edit. Pure functions (no EmDash import) so src/lib/workIndex.test.ts
   can run them under `node --test`.

   - arrangeWork(): the /work page's three groups. The LEAD is the live study
     with the lowest homepage scene order (Stone Steps today), else the newest
     live one; the rest of the live work follows in the same order; everything
     that is not live (launching soon, in progress, built not launched) goes to
     the quieter "Also built" strip, so unlaunched work is never presented as
     live proof (docs/redesign-2026/00-synthesis.md).
   - sectorLine(): the honest closing-CTA sentence for a case study, counted
     from the real entries ("This is one of four church sites I have built"),
     replacing the old "I work with churches like this one all the time"
     (D-copy-positioning.md line 5: an overclaim for schools and businesses).
   - prettyDomain(): "https://www.example.com/" to "example.com".
   ============================================================================ */
import type { LaunchStatus } from './launchStatus.ts';

/** The fields these helpers read; CaseStudy satisfies it. */
export interface WorkItem {
  id: string;
  sector: string;
  launchStatus: LaunchStatus;
  heroOrder?: number;
  published: Date;
}

/** Lowest scene order first (unset sorts last), then newest project first. */
export function byLeadOrder<T extends WorkItem>(a: T, b: T): number {
  const ao = a.heroOrder ?? Number.MAX_SAFE_INTEGER;
  const bo = b.heroOrder ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return b.published.valueOf() - a.published.valueOf();
}

export function arrangeWork<T extends WorkItem>(entries: T[]): { lead?: T; live: T[]; also: T[] } {
  const live = entries.filter((e) => e.launchStatus === 'live').sort(byLeadOrder);
  // Not live: launching soon first (finished work), then in progress, then built not launched.
  const rank: Record<string, number> = {
    'launching-soon': 0,
    'in-progress': 1,
    'built-not-launched': 2,
  };
  const also = entries
    .filter((e) => e.launchStatus !== 'live')
    .sort((a, b) => (rank[a.launchStatus] ?? 9) - (rank[b.launchStatus] ?? 9) || byLeadOrder(a, b));
  const [lead, ...rest] = live;
  return { lead, live: rest, also };
}

const SECTOR_WORDS: Record<string, { one: string; label: string }> = {
  church: { one: 'church', label: 'Church' },
  school: { one: 'school', label: 'School' },
  nonprofit: { one: 'nonprofit', label: 'Nonprofit' },
  'small-business': { one: 'small business', label: 'Small business' },
};

/** "Church", "Small business": the sector as a plain label. */
export function sectorLabel(sector: string): string {
  return SECTOR_WORDS[sector]?.label ?? sector.replace(/-/g, ' ');
}

const NUMBER_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/**
 * The honest count line for the closing CTA, or undefined when there is nothing true and
 * useful to say (a sector with only this one study). Counts every study in the sector,
 * launched or not, because "built" is true of all of them.
 */
export function sectorLine(entries: WorkItem[], sector: string): string | undefined {
  const words = SECTOR_WORDS[sector];
  if (!words) return undefined;
  const n = entries.filter((e) => e.sector === sector).length;
  if (n < 2) return undefined;
  const count = NUMBER_WORDS[n] ?? String(n);
  return `This is one of ${count} ${words.one} sites I have built.`;
}

/** "https://www.example.com/" to "example.com". */
export function prettyDomain(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}
