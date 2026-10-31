// Safe to edit (the allowance); the scoring is tested in did-you-mean.test.ts.
/* ============================================================================
   Did you mean: the 404's guess at where a visitor meant to go (overhaul 2.9)
   ============================================================================
   The 404 page carries a small list of real routes, built at build time (the
   pages in the nav plus every case study). In the browser it reads the path
   that failed, scores each route against it and links the closest three.

   The score is a Damerau-Levenshtein distance (the optimal string alignment
   form: insert, delete, substitute, or swap two neighbouring letters, each
   costing 1) on the LAST path segment, because that is where typos live
   ("/work/stonesteps/", "/servics/"). A slug is also tried in pieces, so a
   visitor who typed part of a long slug still lands:

     "stone-steps-50k"  is compared as  stonesteps50k, stone, stonesteps,
                                        steps, steps50k, 50k  and its
                                        initials "ss5"
     "/work/stonesteps/"  ->  "stonesteps" matches "stonesteps" exactly

   Two forms count as close when they are at most a quarter of the longer
   one's length apart, so "/servics/" finds Services but "/pricing/" does
   not pretend to know, and a short word inside a long path ("was" in
   "/a-page-that-was-never-here/") never passes for "mas". Closer matches (distance over
   length) come first. Nothing close: the page keeps the
   list it was built with, every case study.

   No DOM here, so node --test runs it and the 404's script imports it.
   ============================================================================ */

export interface Route {
  /** The page's path, with a trailing slash ("/work/stone-steps-50k/"). */
  href: string;
  /** The link text ("Stone Steps 50K"). */
  label: string;
}

export interface Suggestion extends Route {
  /** The best edit distance found. Lower is closer. */
  distance: number;
}

/** Optimal string alignment distance: Levenshtein plus adjacent swaps. */
export function damerauLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  // d[i][j] is the distance between the first i letters of a and the first j
  // of b. Small strings only (URL segments), so a full table is fine.
  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    d.push(new Array<number>(b.length + 1).fill(0));
    d[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) d[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // delete
        d[i][j - 1] + 1, // insert
        d[i - 1][j - 1] + cost, // substitute
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // swap neighbours
      }
    }
  }
  return d[a.length][b.length];
}

/** Lowercased path segments, without empty ones or an ".html" ending. */
export function segmentsOf(path: string): string[] {
  let clean = path;
  try {
    clean = decodeURIComponent(path);
  } catch {
    // A malformed escape: score the raw text instead.
  }
  return clean
    .toLowerCase()
    .split(/[?#]/)[0]
    .split('/')
    .map((s) => s.replace(/\.html?$/, '').trim())
    .filter(Boolean);
}

/** Every way a slug is tried: whole (no separators), each run of its
    pieces three letters or longer, and its initials. */
export function slugForms(slug: string): string[] {
  const tokens = slug.split(/[-_.\s]+/).filter(Boolean);
  const forms = new Set<string>([tokens.join('')]);
  for (let start = 0; start < tokens.length; start++) {
    for (let end = start + 1; end <= tokens.length; end++) {
      const run = tokens.slice(start, end).join('');
      if (run.length >= 3) forms.add(run);
    }
  }
  if (tokens.length > 1) forms.add(tokens.map((t) => t[0]).join(''));
  return [...forms];
}

/** How far two forms may be apart: a quarter of the longer one, rounded
    down. So three-letter words must match exactly ("was" is not "mas"),
    while "fbcm" may be one edit from "fbm" and "servics" two from
    "services". */
export function allowance(a: string, b: string): number {
  return Math.floor(Math.max(a.length, b.length) / 4);
}

/**
 * The best match between what was typed and one route, or null when no pair
 * of forms is within its allowance. `ratio` (distance over the longer form)
 * ranks matches, so a near miss on a long slug beats one on a short word.
 */
export function scoreRoute(
  typed: string,
  route: Route,
): { distance: number; ratio: number } | null {
  const target = segmentsOf(route.href).at(-1);
  if (!target) return null;
  let best: { distance: number; ratio: number } | null = null;
  for (const t of slugForms(typed)) {
    for (const r of slugForms(target)) {
      const distance = damerauLevenshtein(t, r);
      if (distance > allowance(t, r)) continue;
      const ratio = distance / Math.max(t.length, r.length);
      if (!best || ratio < best.ratio) best = { distance, ratio };
    }
  }
  return best;
}

/**
 * Up to `max` routes close to the requested path, closest first. Ties go to
 * a route under the same parent ("/work/..."), then to the order given.
 * Returns [] when nothing is close.
 */
export function suggest(path: string, routes: Route[], max = 3): Suggestion[] {
  const segments = segmentsOf(path);
  const typed = segments.at(-1);
  if (!typed) return [];
  const parent = segments.length > 1 ? segments[0] : '';

  return routes
    .map((route, index) => ({
      ...route,
      score: scoreRoute(typed, route),
      sameParent: parent !== '' && segmentsOf(route.href)[0] === parent,
      index,
    }))
    .filter((r) => r.score !== null && r.href !== path)
    .sort(
      (a, b) =>
        a.score!.ratio - b.score!.ratio ||
        Number(b.sameParent) - Number(a.sameParent) ||
        a.index - b.index,
    )
    .slice(0, max)
    .map(({ href, label, score }) => ({ href, label, distance: score!.distance }));
}
