/* ============================================================================
   Index pages | /work, /photography, /journal and the not-found page, read from the CMS
   ============================================================================
   Foundation, edit with care.

   Four small singletons share this file because each is only a handful of strings
   (CMS-DESIGN 1.9). Every one follows the same rule as the larger pages: read the
   published entry, and if it is missing, unpublished, unreadable or half-filled,
   serve the committed copy in cms/content/<collection>.json (the literal text the
   .astro page used to hold) and log a `[cms]` line. That fallback is also what
   production serves until its data is loaded (docs/LAUNCH-RUNBOOK.md).

     getWorkPage()         page_work         entry `work`          /work/
     getPhotographyPage()  page_photography  entry `photography`   /photography/
     getJournalPage()      page_journal      entry `journal`       /journal/
     getNotFoundPage()     page_not_found    entry `not-found`     the 404 page

   The photos themselves are not read here: see src/lib/photos.ts.

   Stays in code (docs/CMS-DESIGN.md 1.9): the Work filter chips and cards (they are
   the case studies), the project count, the Journal card's mark and buttons, the
   Photography "In progress" label and link, and every layout.
   ============================================================================ */

import { getSingleton, rows, text, type Raw } from './cms.ts';
import type { RouteCache } from './routeCache.ts';

/** A required string; a blank one makes the entry unusable (the reader then falls back). */
function must(collection: string, raw: Raw, key: string): string {
  const v = text(raw[key]);
  if (v === undefined) throw new Error(`${collection}.${key} is empty`);
  return v;
}

/** Fields every page entry shares: tab title, description and the closing banner overrides. */
interface PageBasics {
  /** Page title without the studio name; the page adds it (see indexTitle). */
  seoTitle: string;
  seoDescription: string;
  /** Closing banner overrides; undefined means the site default. */
  ctaTitle?: string;
  ctaSub?: string;
}

function basics(collection: string, raw: Raw): PageBasics {
  return {
    seoTitle: must(collection, raw, 'seo_title'),
    seoDescription: must(collection, raw, 'seo_description'),
    ctaTitle: text(raw.cta_title),
    ctaSub: text(raw.cta_sub),
  };
}

/**
 * The page <title>. The stored value is the bare name ("Selected work"); the
 * studio name is added so a tab reads "Selected work | Nixon Creative Studio". An
 * edit that already includes the studio name is left alone.
 */
export function indexTitle(seoTitle: string, studioName: string): string {
  return seoTitle.includes(studioName) ? seoTitle : `${seoTitle} | ${studioName}`;
}

/** What a reader needs from its caller: `Astro` in a page. */
export interface IndexContext {
  /** Route cache; the read adds its tag so publishing the entry purges the page. */
  cache?: RouteCache;
}

/** Test seam: the same `deps` option the other page readers take. */
type ReadOpts = Pick<NonNullable<Parameters<typeof getSingleton>[3]>, 'deps'>;

/* ----------------------------------------------------------------------------
   /work
   ---------------------------------------------------------------------------- */

export interface WorkPage extends PageBasics {
  /** Small label above the headline; undefined hides it. */
  eyebrow?: string;
  heading: string;
  /** The paragraph that follows the printed project count ("6 projects"). */
  intro: string;
  emptyFilterMessage: string;
  liveHeading: string;
  liveBody: string;
}

export function normalizeWorkPage(raw: Raw): WorkPage {
  return {
    ...basics('page_work', raw),
    eyebrow: text(raw.eyebrow),
    heading: must('page_work', raw, 'heading'),
    intro: must('page_work', raw, 'intro'),
    emptyFilterMessage: must('page_work', raw, 'empty_filter_message'),
    liveHeading: must('page_work', raw, 'live_heading'),
    liveBody: must('page_work', raw, 'live_body'),
  };
}

/** The /work words. One D1 read; falls back to the committed JSON. */
export async function getWorkPage(ctx: IndexContext = {}, opts: ReadOpts = {}): Promise<WorkPage> {
  return (await getSingleton('page_work', 'work', normalizeWorkPage, { cache: ctx.cache, ...opts }))
    .data;
}

/* ----------------------------------------------------------------------------
   /photography
   ---------------------------------------------------------------------------- */

/** The three photo groups, in display order. They are the `photos.category` choices. */
export const PHOTO_CATEGORIES = ['events', 'portraits', 'environments'] as const;
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

export interface PhotographyPage extends PageBasics {
  /** Headline: the plain part, then the accent phrase set in amber. */
  heading: string;
  headingAccent: string;
  intro: string;
  /** Title and paragraph for each group (the old CATEGORY_META). */
  categories: Record<PhotoCategory, { title: string; body: string }>;
  emptyHeading: string;
  emptyBody: string;
}

export function normalizePhotographyPage(raw: Raw): PhotographyPage {
  const group = (id: PhotoCategory) => ({
    title: must('page_photography', raw, `${id}_title`),
    body: must('page_photography', raw, `${id}_intro`),
  });
  return {
    ...basics('page_photography', raw),
    heading: must('page_photography', raw, 'heading'),
    headingAccent: must('page_photography', raw, 'heading_accent'),
    intro: must('page_photography', raw, 'intro'),
    categories: {
      events: group('events'),
      portraits: group('portraits'),
      environments: group('environments'),
    },
    emptyHeading: must('page_photography', raw, 'empty_heading'),
    emptyBody: must('page_photography', raw, 'empty_body'),
  };
}

/** The /photography words. One D1 read; falls back to the committed JSON. */
export async function getPhotographyPage(
  ctx: IndexContext = {},
  opts: ReadOpts = {},
): Promise<PhotographyPage> {
  return (
    await getSingleton('page_photography', 'photography', normalizePhotographyPage, {
      cache: ctx.cache,
      ...opts,
    })
  ).data;
}

/* ----------------------------------------------------------------------------
   /journal
   ---------------------------------------------------------------------------- */

export interface JournalPage extends PageBasics {
  heading: string;
  intro: string;
  emptyKicker: string;
  emptyHeading: string;
  emptyBody: string;
}

export function normalizeJournalPage(raw: Raw): JournalPage {
  return {
    ...basics('page_journal', raw),
    heading: must('page_journal', raw, 'heading'),
    intro: must('page_journal', raw, 'intro'),
    emptyKicker: must('page_journal', raw, 'empty_kicker'),
    emptyHeading: must('page_journal', raw, 'empty_heading'),
    emptyBody: must('page_journal', raw, 'empty_body'),
  };
}

/** The /journal words. One D1 read; falls back to the committed JSON. */
export async function getJournalPage(
  ctx: IndexContext = {},
  opts: ReadOpts = {},
): Promise<JournalPage> {
  return (
    await getSingleton('page_journal', 'journal', normalizeJournalPage, {
      cache: ctx.cache,
      ...opts,
    })
  ).data;
}

/* ----------------------------------------------------------------------------
   The not-found page
   ---------------------------------------------------------------------------- */

export interface NotFoundLink {
  label: string;
  /** An internal path: starts with exactly one slash. */
  href: string;
}

export interface NotFoundPage {
  seoTitle: string;
  seoDescription: string;
  /** The small mono status line above the headline. */
  label: string;
  heading: string;
  body: string;
  /** One to three links; the first is drawn as the button, the rest as plain links. */
  links: NotFoundLink[];
}

/** The most links the page has room for (matches the schema's maxItems). */
export const NOT_FOUND_LINK_SLOTS = 3;

/**
 * An internal path and nothing else: one leading slash, no scheme, no protocol-relative
 * `//host`, no whitespace. An editor's typo ("work/", "https://...") is dropped rather than
 * allowed to send a lost visitor off-site.
 */
export function isInternalPath(href: string): boolean {
  return /^\/(?!\/)\S*$/.test(href);
}

export function normalizeNotFoundPage(raw: Raw): NotFoundPage {
  const links = rows(raw.links, (r): NotFoundLink | undefined => {
    const label = text(r.label)?.trim();
    const href = text(r.href)?.trim();
    return label && href && isInternalPath(href) ? { label, href } : undefined;
  }).slice(0, NOT_FOUND_LINK_SLOTS);
  // A page with nowhere to send the visitor is a dead end: fall back instead.
  if (links.length === 0) throw new Error('page_not_found.links has no usable link');
  return {
    seoTitle: must('page_not_found', raw, 'seo_title'),
    seoDescription: must('page_not_found', raw, 'seo_description'),
    label: must('page_not_found', raw, 'label'),
    heading: must('page_not_found', raw, 'heading'),
    body: must('page_not_found', raw, 'body'),
    links,
  };
}

/** The not-found words. One D1 read; falls back to the committed JSON. */
export async function getNotFoundPage(
  ctx: IndexContext = {},
  opts: ReadOpts = {},
): Promise<NotFoundPage> {
  return (
    await getSingleton('page_not_found', 'not-found', normalizeNotFoundPage, {
      cache: ctx.cache,
      ...opts,
    })
  ).data;
}
