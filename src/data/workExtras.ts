/* ============================================================================
   workExtras | facts and media the case studies need that the CMS has no field for
   ============================================================================
   Safe to edit. INTERIM (2026 redesign, page-work branch): the case study
   template now leads with a short facts ledger (place, what the client's team
   runs themselves) and, for two studies, a directed showreel. The
   `case_studies` collection has no fields for these yet, and the page agent
   that built the template may not change the CMS schema, so they live here,
   keyed by the entry slug. Every line below is taken from that case study's
   own published copy (its brief, results or designer note, read 2026-10-04);
   nothing is invented. When the schema gains `place`, `runs_themselves` and a
   showreel field, move the values into the admin and delete this file.

   A slug with no entry here simply shows no Place row, no "Runs it themselves"
   row and the cover image as its hero. Nothing breaks.
   ============================================================================ */
import type { ImageMetadata } from 'astro';
import fbcmCover from '../assets/case-studies/shots/first-baptist-muncie-cover.png';
import fbcmExpect from '../assets/case-studies/shots/first-baptist-muncie-detail-expect.png';
import fbcmGoals from '../assets/case-studies/shots/first-baptist-muncie-detail-goals.png';
import fbcmBuilding from '../assets/case-studies/shots/first-baptist-muncie-detail-building.png';

export interface LedgerFacts {
  /** Where the client is. */
  place?: string;
  /** What the client's own people now do without a developer. Only for a site they run. */
  runsThemselves?: string;
}

/** Source of each line: the study's brief or results on the live case study page. */
export const LEDGER_FACTS: Record<string, LedgerFacts> = {
  'stone-steps-50k': {
    place: 'Mt. Airy Forest, Cincinnati, Ohio',
    runsThemselves:
      'The race director edits race details himself; results, records and runner pages update on their own after each race.',
  },
  'theology-matters': {
    runsThemselves:
      'The editors publish new journal editions, speaker pages and the conference schedule from WordPress.',
  },
  'mas-monograms': {
    place: 'St. Matthews, South Carolina',
    runsThemselves: 'Mary Ann adds finished pieces to the gallery and adjusts prices herself.',
  },
  'foundation-for-reformed-theology': {
    runsThemselves:
      'Staff add resources, seminar details and staff changes from the WordPress admin.',
  },
  'first-presbyterian-orangeburg': {
    place: 'Orangeburg, South Carolina',
    runsThemselves: 'Staff keep the blog and the event calendar up to date.',
  },
  'second-presbyterian-chicago': { place: 'South Loop, Chicago, Illinois' },
  'presbyterian-academy': { place: 'Cincinnati, Ohio' },
  'reid-design': {
    place: 'Plainfield, Indiana',
    runsThemselves: 'Staci edits the site herself in Sanity.',
  },
  'first-baptist-muncie': {
    place: 'Muncie, Indiana',
    runsThemselves:
      'Staff click the words on a page to edit them, with a live preview before anything is published.',
  },
};

/** A directed showreel (src/components/Showreel.astro). Files live in public/reel/<slug>/. */
export interface ReelSpec {
  /** File prefix inside public/reel/<slug>/ (d8 naming: ss, rd). */
  prefix: string;
  /** What the walkthrough shows, for the poster's alt text. */
  alt: string;
  /** One honest caption line: what is live, and when it was recorded. */
  caption: string;
}

/**
 * Only for live sites, verified live on the capture date. The clips are dated captures of a
 * live page (the Stone Steps race clock is a real countdown): re-shoot with the d8 scripts
 * (docs/redesign-2026/mockups/d8-showreel/_capture) when the client site changes.
 */
export const SHOWREELS: Record<string, ReelSpec> = {
  'stone-steps-50k': {
    prefix: 'ss',
    alt: 'A walkthrough of the Stone Steps 50K home page: the race clock, the course map switching from the long loop to the short loop, and the course-records board.',
    caption:
      'The live site, recorded 4 October 2026. The race clock, the dot running the course map and the loop switch are the real page moving.',
  },
  'reid-design': {
    prefix: 'rd',
    alt: 'A walkthrough of the Reid Design home page: the concept room filling with furniture as the page scrolls, then the walls repainting in sage from a colour chip.',
    caption:
      'The live site, recorded 4 October 2026. The room filling in and the walls repainting are the real page moving.',
  },
};

/** One picture from the repo, standing in for a CMS image. */
export interface BundledShot {
  src: ImageMetadata;
  alt: string;
  title?: string;
  caption?: string;
}

/**
 * Pictures that replace stale CMS images until Nathan swaps them in the admin. First Baptist
 * Church Muncie's cover and highlights in production are captures of the OLD Wix site; these
 * are the new build, captured 2026-10-04 from https://fbcm-site.nathanjnixon86.workers.dev/
 * (never from fbcmuncie.org, which is still the Wix site). Delete an entry once the admin
 * holds the new pictures (docs/PENDING.md lists them).
 */
export const BUNDLED_MEDIA: Record<string, { cover?: BundledShot; details?: BundledShot[] }> = {
  'first-baptist-muncie': {
    cover: {
      src: fbcmCover,
      alt: 'The new First Baptist Church Muncie home page: "Praise and proclaim" over a photograph of the worship team, with the service time, address and preacher below.',
    },
    details: [
      {
        src: fbcmExpect,
        alt: 'The What to Expect band: a classroom photograph framed in an arch taken from the building, beside the Sunday times.',
        title: 'What to expect, framed by the building',
        caption:
          'The Sunday times sit beside a photograph framed in an arch drawn from the church itself, so a first-time visitor knows when to arrive and where to go.',
      },
      {
        src: fbcmGoals,
        alt: 'The Our Goals band: four photographs, each marked with a line glyph drawn from the sanctuary.',
        title: 'Four goals, four glyphs',
        caption:
          'The church’s four goals each carry a line glyph drawn from the sanctuary, so the same marks recur across the site.',
      },
      {
        src: fbcmBuilding,
        alt: 'The Our Building band: the 1927 Hannaford rendering of the church beside a timeline from 1859 to 2026.',
        title: '1859 to 1929, and on',
        caption:
          'The 1927 Hannaford rendering of the building sits beside the congregation’s timeline, from the courthouse meeting in 1859 to today.',
      },
    ],
  },
};

/**
 * Studies whose BODY in production still describes features that are not live, so the page
 * leaves the body out until Nathan rewrites it in the admin (docs/PENDING.md). Reid Design:
 * the body lists a budget calculator, a style quiz, an affiliate shop and more from the old
 * build; the live site (redesigned 2026-09-30) has the concept room, paint-chip prices and a
 * room and style picker, which the entry's outcome and results already say. Remove the slug
 * once the body is true.
 */
export const BODY_HELD_BACK = new Set<string>(['reid-design']);
