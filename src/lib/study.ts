// Safe to edit.
/* ============================================================================
   Case-study frame helpers (overhaul package 2.4a)
   ============================================================================
   Small pure functions the /work/[slug] template uses, kept here so they can
   be unit tested without an Astro runtime (src/lib/study.test.ts):

     nextInLoop    which study the Up next panel hands off to (by `order`,
                   wrapping from the last study back to the first)
     studyFacts    the rail's fact list (sector, year, role, stack, host),
                   from `facts` where set, else the study's own fields
     paletteStyle  the client's palette as scoped --cs-* custom properties
     darkMark      the client colour used for marks on this site's dark ink

   Nothing here invents a value: every fact and colour comes from the study's
   frontmatter, and a missing field simply drops out.
   ============================================================================ */

/** How each sector reads as a fact ("Church", "Small business"). */
export const SECTOR_LABEL: Record<string, string> = {
  church: 'Church',
  school: 'School',
  nonprofit: 'Nonprofit',
  'small-business': 'Small business',
};

/** The palette shape from src/content.config.ts (only what this file reads). */
export interface StudyPalette {
  paper: string;
  ink: string;
  accent: string;
  accentInk: string;
  markDark?: string;
  dark?: { paper: string; ink: string; accent: string; accentInk?: string };
  typeface: string;
  swatches: string[];
}

/** The fields of a study that the fact list reads. */
export interface FactSource {
  sector: string;
  year: number;
  role?: string;
  stack?: string[];
  liveUrl?: string;
  facts?: {
    sector?: string;
    year?: string;
    role?: string;
    stack?: string[];
    host?: string;
  };
}

export interface Fact {
  label: string;
  value: string;
  /** Set on the host fact: the full URL, printed in place of the host on paper. */
  url?: string;
}

/** The host as people say it: no protocol, no "www.", no trailing slash. */
export function hostOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

/**
 * The rail's facts, in a fixed order. A `facts` key wins over the matching
 * top-level field (so a study can say "2024, rebuilt 2026"); a fact with no
 * value at all is left out rather than shown empty.
 */
export function studyFacts(d: FactSource): Fact[] {
  const out: Fact[] = [];
  const sector = d.facts?.sector ?? SECTOR_LABEL[d.sector] ?? d.sector;
  out.push({ label: 'Sector', value: sector });
  out.push({ label: 'Year', value: d.facts?.year ?? String(d.year) });
  const role = d.facts?.role ?? d.role;
  if (role) out.push({ label: 'Role', value: role });
  const stack = d.facts?.stack ?? d.stack;
  if (stack && stack.length > 0) out.push({ label: 'Stack', value: stack.join(', ') });
  const host = d.facts?.host ?? (d.liveUrl ? hostOf(d.liveUrl) : undefined);
  if (host) out.push({ label: 'Host', value: host, url: d.liveUrl });
  return out;
}

/**
 * The study after `id` in the loop. Studies are ranked by `order` (studies
 * with no order go last, by id, so a half-dressed new study still builds),
 * and the last one hands back to the first. Returns undefined when the
 * collection holds only `id` itself.
 */
export function nextInLoop<T extends { id: string; order?: number }>(
  studies: T[],
  id: string,
): T | undefined {
  const ranked = [...studies].sort(
    (a, b) =>
      (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
      a.id.localeCompare(b.id),
  );
  if (ranked.length < 2) return undefined;
  const i = ranked.findIndex((s) => s.id === id);
  if (i === -1) return undefined;
  return ranked[(i + 1) % ranked.length];
}

/**
 * The client colour for marks (the 4px rule) on this site's dark ink:
 * `markDark` where the client's accent is too dark for ink, else the
 * client's own dark accent where it ships a dark theme, else the accent.
 * The same choice src/lib/case-palettes.test.ts checks at 3:1 on ink.
 */
export function darkMark(p: StudyPalette): string {
  return p.markDark ?? p.dark?.accent ?? p.accent;
}

/**
 * The palette as an inline style of scoped custom properties. The template
 * reads them with a site-token fallback (var(--cs-paper, var(--paper))), so
 * a study without a palette renders in the site's own colours.
 */
export function paletteStyle(p: StudyPalette | undefined): string | undefined {
  if (!p) return undefined;
  return [
    `--cs-paper: ${p.paper}`,
    `--cs-ink: ${p.ink}`,
    `--cs-accent: ${p.accent}`,
    `--cs-accent-ink: ${p.accentInk}`,
    `--cs-mark-dark: ${darkMark(p)}`,
  ].join('; ');
}
