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
