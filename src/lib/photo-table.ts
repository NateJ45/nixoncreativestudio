// Safe to edit (labels and order).
/* ============================================================================
   The light table's data rules (/photography)
   ============================================================================
   Pure functions the page uses to turn the `photos` collection into prints:
   the order they are laid in, the filters, and the words on each print. The
   page renders the result as plain markup (a grid of buttons); the script in
   src/scripts/photo-table.js only lays that markup out on the endless table.
   Unit tested in src/lib/photo-table.test.ts.
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
