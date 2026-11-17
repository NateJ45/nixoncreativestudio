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

// One study's own words for a job, put in About's vocabulary: nouns for the work, not the person.
// Only what a study says is mapped; nothing is added. A word with no entry here is kept as written.
const WORK_NOUN: Record<string, string> = {
  'web design': 'Design',
  designer: 'Design',
  developer: 'The build',
  photography: 'Photos',
  photographer: 'Photos',
};

/** "Publicity Chair (volunteer)" becomes "Publicity (volunteer)"; a plain "Designer" becomes "Design". */
function workNoun(raw: string): string {
  const volunteer = /\(volunteer\)/i.test(raw) ? ' (volunteer)' : '';
  const bare = raw.replace(/\(volunteer\)/i, '').trim();
  const mapped = WORK_NOUN[bare.toLowerCase()];
  if (mapped) return mapped + volunteer;
  return bare.replace(/\s+chair$/i, '') + volunteer;
}

/**
 * The crew list for a study's work order, as nouns for the work (About's vocabulary: Strategy,
 * Design, The build, Photos). It maps only what the study's own `services` and `role` say, in that
 * order, with no job said twice: "Web Design" and "Designer" are both Design, "Developer" is The
 * build, and a job with no entry above (Brand identity, Online store, Social media) stays as written.
 */
export function crewFor(services: string[], role?: string): string[] {
  const parts = (role ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  return [...services, ...parts].map(workNoun).filter((r) => {
    const k = r.toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
