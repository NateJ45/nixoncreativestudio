/* ============================================================================
   Journal helpers
   ============================================================================
   The pure parts of /journal and /journal/{slug}: cluster names, the order of
   the deck, the end cards and the table of contents. No astro:content import,
   so journal.test.ts can check them with node --test. The pages pass in what
   getCollection() returned.
   ============================================================================ */

/** The clusters a post can belong to (content.config.ts `cluster`), in chip order. */
export const CLUSTERS = [
  { key: 'costs', label: 'Costs' },
  { key: 'churches', label: 'Churches' },
  { key: 'schools', label: 'Schools' },
  { key: 'nonprofits', label: 'Nonprofits' },
  { key: 'accessibility', label: 'Accessibility' },
  { key: 'lab', label: 'Built in the lab' },
] as const;

export type ClusterKey = (typeof CLUSTERS)[number]['key'];

/** The chip and card label for a cluster, or '' for a post with none. */
export function clusterLabel(key: string | undefined): string {
  return CLUSTERS.find((c) => c.key === key)?.label ?? '';
}

export interface PostLike {
  id: string;
  data: { published: Date; cluster?: string; draft?: boolean };
}

/** Newest first; two posts on the same day fall back to their slug, so the order never wobbles. */
export function newestFirst<T extends PostLike>(posts: T[]): T[] {
  return [...posts].sort(
    (a, b) => b.data.published.valueOf() - a.data.published.valueOf() || a.id.localeCompare(b.id),
  );
}

/**
 * The chips the index shows: All, then every cluster that has at least one post, with its count.
 * A cluster with nothing in it yet gets no chip, so a press never empties the page.
 */
export function clusterChips(posts: PostLike[]): { key: string; label: string; n: number }[] {
  const counted = CLUSTERS.map((c) => ({
    key: c.key as string,
    label: c.label as string,
    n: posts.filter((p) => p.data.cluster === c.key).length,
  })).filter((c) => c.n > 0);
  return [{ key: 'all', label: 'All', n: posts.length }, ...counted];
}

/** A heading as the table of contents lists it. */
export interface TocItem {
  slug: string;
  text: string;
}

/** The post's `##` headings (Astro's render() headings, depth 2 only). */
export function tocItems(headings: { depth: number; slug: string; text: string }[]): TocItem[] {
  return headings.filter((h) => h.depth === 2).map((h) => ({ slug: h.slug, text: h.text }));
}

/** `changes` only means something on a post that has been updated. Returns the problem, or ''. */
export function changesProblem(data: { updated?: Date; changes?: string }): string {
  if (data.changes && !data.updated) return 'changes is set but updated is not: add the date';
  if (data.updated && !data.changes)
    return 'updated is set but changes is not: say in one line what changed';
  return '';
}

/** A day on the deck's date rail, and the posts published on it, in deck order. */
export interface RailDay<T> {
  /** The day as YYYY-MM-DD: the key the rail and the cards share. */
  day: string;
  date: Date;
  posts: T[];
}

/**
 * The rail's rows: one a day, in the order the days first appear, so eight posts written on one
 * day show that day once with its count instead of the same date eight times.
 */
export function railDays<T extends { day: string; date: Date }>(posts: T[]): RailDay<T>[] {
  const days: RailDay<T>[] = [];
  for (const p of posts) {
    const row = days.find((d) => d.day === p.day);
    if (row) row.posts.push(p);
    else days.push({ day: p.day, date: p.date, posts: [p] });
  }
  return days;
}

/**
 * The short answer split round its key phrase, for the marker on a post's card. `highlight` must
 * be copied exactly from the short answer; a phrase that is not in it is a mistake, so `problem`
 * says so and the page stops the build.
 */
export function splitHighlight(
  text: string,
  highlight: string | undefined,
): { before: string; mark: string; after: string; problem: string } {
  if (!highlight) return { before: text, mark: '', after: '', problem: '' };
  const at = text.indexOf(highlight);
  if (at < 0)
    return {
      before: text,
      mark: '',
      after: '',
      problem: 'highlight is not in shortAnswer: copy the phrase exactly',
    };
  return {
    before: text.slice(0, at),
    mark: highlight,
    after: text.slice(at + highlight.length),
    problem: '',
  };
}
