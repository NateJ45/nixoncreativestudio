// Safe to edit (labels and order).
/* ============================================================================
   The light table's data rules (/photography)
   ============================================================================
   Pure functions the page uses to turn the `photos` collection into prints:
   the order they are laid in, the filters, and the words on each print. The
   page renders the result as plain markup (a grid of buttons); the script in
   src/scripts/photo-table.js only lays that markup out on the endless table.
   Also here: the two bits of maths that give the table its depth (how fast a
   column slides, how much a print shrinks toward the edge) and the colour
   helpers for the wash. Unit tested in src/lib/photo-table.test.ts.
   ============================================================================ */

/** The kinds of work, in the order their filters appear. */
export const KINDS = [
  'weddings',
  'worship',
  'community',
  'events',
  'portraits',
  'landscapes',
  'environments',
] as const;
export type Kind = (typeof KINDS)[number];

/** The filter's words for each kind. */
export const KIND_LABEL: Record<Kind, string> = {
  weddings: 'Weddings',
  worship: 'Worship',
  community: 'Community',
  events: 'Events',
  portraits: 'Portraits',
  landscapes: 'Landscapes',
  environments: 'Places',
};

export interface PrintIn {
  slug: string;
  category: Kind;
  featured?: boolean;
  video?: string;
}

/**
 * Deal the prints so neighbours differ: one from each kind in turn (largest
 * kind first), so the table never shows a run of six wedding frames together.
 * Within a kind the collection's own order (alphabetical by file) is kept, then
 * spread with a fixed stride so a single shoot does not sit in a clump. The
 * featured print, if any, goes first: the table opens centred on it.
 * Deterministic, so the build and the test agree.
 */
export function dealOrder<T extends PrintIn>(prints: T[]): T[] {
  const byKind = new Map<Kind, T[]>();
  for (const p of prints) {
    const list = byKind.get(p.category) ?? [];
    list.push(p);
    byKind.set(p.category, list);
  }
  // Spread each kind with a stride that is coprime with its length.
  const spread = (list: T[]): T[] => {
    const n = list.length;
    if (n < 3) return list;
    let stride = Math.max(2, Math.round(n / 3));
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    while (gcd(stride, n) !== 1) stride++;
    return list.map((_, i) => list[(i * stride) % n]);
  };
  const piles = [...byKind.values()]
    .map(spread)
    .sort((a, b) => b.length - a.length || a[0].slug.localeCompare(b[0].slug));
  const out: T[] = [];
  while (piles.some((p) => p.length)) {
    for (const pile of piles) {
      const next = pile.shift();
      if (next) out.push(next);
    }
  }
  const first = out.findIndex((p) => p.featured);
  if (first > 0) out.unshift(...out.splice(first, 1));
  return out;
}

/** The filters to show: only the kinds that have prints, in KINDS order, with counts. */
export function filtersFor(prints: PrintIn[]): { kind: Kind; label: string; count: number }[] {
  return KINDS.map((kind) => ({
    kind,
    label: KIND_LABEL[kind],
    count: prints.filter((p) => p.category === kind).length,
  })).filter((f) => f.count > 0);
}

/** The small line on an open print: kind, who for, year. Missing parts are left out. */
export function printLine(p: { category: Kind; client?: string; year: number; video?: string }) {
  return [p.video ? 'Film' : KIND_LABEL[p.category], p.client, String(p.year)]
    .filter(Boolean)
    .join(' · ');
}

/* ---- Depth ---------------------------------------------------------------- */

/**
 * How fast a column slides up and down compared with the table itself (1 moves
 * with it). Neighbours get different speeds, so the columns part and close as
 * you travel and the table reads as having depth. All of them stay close to 1:
 * a column that ran at half speed would look broken, not deep.
 */
const COLUMN_SPEEDS = [1, 0.86, 1.1, 0.92, 1.06, 0.88, 1.12, 0.95];
export function columnSpeed(col: number): number {
  const n = COLUMN_SPEEDS.length;
  return COLUMN_SPEEDS[((Math.round(col) % n) + n) % n];
}

/** The smallest a print gets, out at the corners of the table. */
export const LENS_MIN = 0.86;

/**
 * The lens: a print in the middle of the table is full size, and it eases
 * smaller toward the corners, so the middle print is the subject. `d` is the
 * distance from the middle, 0 at the centre and 1 at a corner. Never larger
 * than 1, never smaller than LENS_MIN, and it only ever falls as d grows.
 */
export function lensScale(d: number): number {
  const t = Math.max(0, Math.min(1, (Math.abs(d) - 0.3) / 0.8));
  return 1 - (1 - LENS_MIN) * t * t * (3 - 2 * t);
}

/* ---- Colour ---------------------------------------------------------------- */

/** "#rrggbb" to [r, g, b]. Anything else gives null, and the table keeps its own colour. */
export function hexToRgb(hex: string | undefined): [number, number, number] | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex ?? '');
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}
