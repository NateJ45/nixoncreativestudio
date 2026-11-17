/* Helpers for the case study page that want a unit test. */

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

interface CmsShotSource {
  cmsShot?: unknown;
  cmsShotAlt?: string;
}

/**
 * Why a study's CMS fields do not fit together, or undefined when they do.
 * The study page (/work/[slug].astro) throws on it, so a `cmsShot` without its alt
 * text fails the build instead of shipping an unlabelled screenshot.
 */
export function cmsShotProblem(d: CmsShotSource): string | undefined {
  if (d.cmsShot && !d.cmsShotAlt?.trim()) {
    return 'cmsShotAlt is required when cmsShot is set: say what the editor screen shows.';
  }
  return undefined;
}

/**
 * The crew list for a study's work order: the roles the study itself credits, in its own words.
 * First the services from its frontmatter, then the parts of its `role` ("Designer, Developer"),
 * with no role said twice. "Web Design" is the service and "Designer" the role for the same work,
 * so when the role names a designer the service steps aside rather than repeat it.
 */
export function crewFor(services: string[], role?: string): string[] {
  const parts = (role ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
  const designer = parts.some((r) => /^designer$/i.test(r));
  const all = [...services.filter((s) => !(designer && /^web design$/i.test(s.trim()))), ...parts];
  const seen = new Set<string>();
  return all.filter((r) => {
    const k = r.trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
