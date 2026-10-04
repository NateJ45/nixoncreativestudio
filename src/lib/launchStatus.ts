/* ============================================================================
   launchStatus
   ============================================================================
   Safe to edit.

   Whether a case study's site is actually live, read from the optional
   `launch_status` field on the `case_studies` collection (added in the 2026
   redesign, after D's copy audit found work presented as live that is not:
   docs/redesign-2026/D-copy-positioning.md, headline finding 2).

   The field is OPTIONAL on purpose (CLAUDE.md never-break rule 13): every entry
   that existed before it reads as empty, and empty means "live", so nothing
   changes for a live site until someone picks another value in the admin.

   The honesty rule lives HERE, in the data layer, so no template has to
   remember it: a study that is not live gets no "live site" link, no
   showcase link and no place in the homepage hero scene, whatever its other
   fields still say. The templates only decide how to SHOW the status label.

   Dependency-free so the unit tests (launchStatus.test.ts) can import it.
   ============================================================================ */

/** The values the admin offers, in the order the select lists them. */
export const LAUNCH_STATUSES = [
  'live',
  'launching-soon',
  'in-progress',
  'built-not-launched',
] as const;

export type LaunchStatus = (typeof LAUNCH_STATUSES)[number];

/** Read the stored value. Anything empty or unknown is treated as live (old entries). */
export function launchStatusOf(v: unknown): LaunchStatus {
  return typeof v === 'string' && (LAUNCH_STATUSES as readonly string[]).includes(v)
    ? (v as LaunchStatus)
    : 'live';
}

/** True only for a site a visitor can open today and see the finished work. */
export const isLive = (status: LaunchStatus): boolean => status === 'live';

/**
 * The plain words a page shows next to a study that is not live. Undefined for a live
 * study, so a template can write `{label && <span>{label}</span>}` and show nothing.
 */
export function launchStatusLabel(status: LaunchStatus): string | undefined {
  switch (status) {
    case 'launching-soon':
      return 'Launching soon';
    case 'in-progress':
      return 'In progress';
    case 'built-not-launched':
      return 'Built, not launched';
    default:
      return undefined;
  }
}

/** The link fields a study carries, before the status rule is applied. */
export interface StudyLinks {
  liveUrl?: string;
  /** The optional preview_url field: where a finished, not yet launched build can be seen. */
  previewUrl?: string;
  showcaseHref?: string;
  inHero: boolean;
}

/**
 * Apply the honesty rule: a study that is not live keeps none of its "go and look at it"
 * links (except a launching-soon study, which may keep its preview_url as the visit link) and never appears in the hero scene (selectHeroStudies also needs a live URL, so
 * dropping the URL alone would already keep it out; inHero is cleared too so the two
 * signals agree).
 */
export function gateLinks<T extends StudyLinks>(status: LaunchStatus, links: T): T {
  if (isLive(status)) return { ...links, previewUrl: undefined };
  // Launching soon: the build is finished, so its preview address may stand in as the visit
  // link (Nathan, 2026-10-04: FBCM on workers.dev). Templates label it with
  // launchStatusLabel(), never as live. The production URL is still dropped (it may be the old
  // site) and the study stays out of the hero.
  const visit = status === 'launching-soon' ? links.previewUrl : undefined;
  return {
    ...links,
    liveUrl: visit,
    previewUrl: visit,
    showcaseHref: undefined,
    inHero: false,
  };
}
