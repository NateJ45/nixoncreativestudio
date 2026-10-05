/* ============================================================================
   About page | The /about words, photos and numbers, read from the CMS
   ============================================================================
   Foundation, edit with care.

   /about reads one thing through here, getAboutPage(): the `page_about`
   singleton (entry `about`, EmDash admin: Pages, "About page"; schema in
   cms/schema/page_about.mjs). It carries the headline and intro, the headshot,
   the one-line thesis, the story, the "Outside the studio" photos, the three
   principles, the Currently lists (and the date that drives the freshness
   pill), the Testimonials heading, the four Lighthouse scores and the job title
   in the Person structured data.

   If the entry is missing, unpublished or unreadable, the reader serves the
   committed cms/content/page_about.json (the literal text and bundled pictures
   about.astro used to hold) and logs a `[cms]` line, so a broken edit never
   blanks the page. That fallback is also what production serves until its data
   is loaded (docs/LAUNCH-RUNBOOK.md).

   PICTURES. A CMS entry carries real EmDash media (`image` fields, served from
   R2 and resized to WebP through /_image). The committed fallback instead
   carries `{ "$file": "src/assets/..." }` references to the images bundled with
   the site; the `image()` helper reads those as "no CMS image", and this module
   keeps the path as `file` so about.astro can look the bundled asset up. So each
   picture is either `image` (CMS media) or `file` (bundled), never both.

   Alt text is required. A photo whose description is blank is left out of the
   gallery (the design's rule: a picture can never ship without alt text), and a
   headshot that is missing or has no description falls back to the bundled
   headshot with its stock description, so the portrait never goes blank.

   The pure helpers (normalizeAboutPage, buildPersonSchema, freshnessLabel,
   aboutTitle) are unit tested in aboutPage.test.ts, including a golden check
   that the Person JSON-LD is byte-equal to what the page emitted before.

   Stays in code (docs/CMS-DESIGN.md 1.7): the typing Terminal, the rail words
   (About, In short, Story, ...), section order, and the testimonial quotes
   (they come from the case studies).
   ============================================================================ */

import type { ImageValue } from 'emdash';
import { choice, date, getSingleton, image, int, portable, rows, text, type Raw } from './cms.ts';
import type { RouteCache } from './routeCache.ts';
import type { PTNode } from './portableText.ts';

/** A picture: CMS media (`image`) or a bundled asset named by its repo path (`file`). */
export interface AboutPicture {
  image?: ImageValue;
  /** Repo path of a bundled asset, e.g. `src/assets/about/family.jpg` (fallback only). */
  file?: string;
}

export interface AboutPhoto extends AboutPicture {
  caption: string;
  alt: string;
}

export interface PrincipleItem {
  title: string;
  body: string;
}

export type BookingStatus = 'open' | 'limited';

export interface BookingItem {
  label: string;
  status: BookingStatus;
  detail: string;
}

export interface ReadingItem {
  title: string;
  author: string;
  note?: string;
}

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface AboutPage {
  /** Page title without the studio name; the page adds it (see aboutTitle). */
  seoTitle: string;
  seoDescription: string;
  /** Closing banner overrides; undefined means the site default. */
  ctaTitle?: string;
  ctaSub?: string;
  heading: string;
  headingAccent: string;
  intro: string;
  headshot: AboutPicture & { alt: string };
  thesis: { before: string; accent: string; after: string };
  story: { heading: string; sub: string; body: PTNode[] };
  outside: { heading: string; sub: string; photos: AboutPhoto[] };
  principles: { heading: string; sub: string; items: PrincipleItem[] };
  currently: {
    heading: string;
    sub: string;
    /** The day the lists were last rewritten, `YYYY-MM-DD`. */
    updated: string;
    workingOn: string[];
    booking: BookingItem[];
    reading: ReadingItem[];
    learning: string[];
  };
  testimonials: { heading: string; sub: string };
  lighthouse: LighthouseScores;
  jobTitle: string;
}

/** Slots the layout has. Anything past these never renders. */
export const PHOTO_SLOTS = 6;
export const PHOTO_MIN = 3;
export const PRINCIPLE_SLOTS = 3;
export const WORKING_ON_SLOTS = 3;
export const BOOKING_SLOTS = 3;
export const READING_SLOTS = 4;
export const LEARNING_SLOTS = 4;

/** The headshot bundled with the site, used when the CMS headshot is unusable. */
export const BUNDLED_HEADSHOT: AboutPicture & { alt: string } = {
  file: 'src/assets/brand/headshot.jpg',
  alt: 'Nathan Nixon, smiling outdoors',
};

/** A required string; a blank one makes the entry unusable (the reader then falls back). */
function must(raw: Raw, key: string): string {
  const v = text(raw[key]);
  if (v === undefined) throw new Error(`page_about.${key} is empty`);
  return v;
}

/** A required Lighthouse score: a whole number from 0 to 100. */
function score(raw: Raw, key: string): number {
  const n = int(raw[key]);
  if (n === undefined || n < 0 || n > 100) throw new Error(`page_about.${key} is not 0 to 100`);
  return n;
}

/**
 * The picture a stored image field holds: CMS media, or (for the committed
 * fallback) the bundled asset's repo path, or neither.
 */
export function picture(v: unknown): AboutPicture {
  const media = image(v);
  if (media) return { image: media };
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const file = (v as Raw).$file;
    if (typeof file === 'string' && file.trim() !== '') return { file };
  }
  return {};
}

const hasPicture = (p: AboutPicture): boolean => p.image !== undefined || p.file !== undefined;

/**
 * The `YYYY-MM-DD` day of a stored date. The page works in whole days (the pill
 * says "Updated 3 days ago"), so a time of day, and the time zone it was typed
 * in, are ignored: the day as written is the day shown.
 */
export function dayOf(v: unknown): string | undefined {
  if (typeof v === 'string') {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(v.trim());
    if (m && !Number.isNaN(new Date(`${m[1]}T00:00:00`).valueOf())) return m[1];
  }
  const d = date(v);
  return d ? d.toISOString().slice(0, 10) : undefined;
}

/** "October 1, 2026" for a `YYYY-MM-DD` day. Local midnight, so no zone shifts it a day. */
export function updatedLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${iso}T00:00:00`));
}

/**
 * Relative freshness for the status pill: today / N days / N weeks / N months.
 * If it ever reads "8 months ago", that is the nudge to rewrite the lists.
 * `now` is injectable for the tests.
 */
export function freshnessLabel(iso: string, now: number = Date.now()): string {
  const days = Math.max(0, Math.floor((now - new Date(`${iso}T00:00:00`).getTime()) / 86_400_000));
  if (days <= 0) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  if (days < 14) return `Updated ${days} days ago`;
  if (days < 60) return `Updated ${Math.round(days / 7)} weeks ago`;
  const months = Math.round(days / 30);
  return `Updated ${months} ${months === 1 ? 'month' : 'months'} ago`;
}

/**
 * Build the typed AboutPage from a raw `page_about` entry (or the fallback
 * JSON). Throws when a required field is blank, the story is empty, fewer than
 * three usable photos or exactly-three principles are not all there, or a list
 * is empty, so the reader serves the committed fallback instead of a half-empty
 * page. Lists that are too long are cut.
 */
export function normalizeAboutPage(raw: Raw): AboutPage {
  const body = portable(raw.story_body);
  if (body.length === 0) throw new Error('page_about.story_body is empty');

  const photos = rows(raw.photos, (r): AboutPhoto | undefined => {
    const pic = picture(r.image);
    const caption = text(r.caption);
    const alt = text(r.alt);
    // A photo with no picture, caption or description is skipped, never shipped bare.
    if (!hasPicture(pic) || caption === undefined || alt === undefined) return undefined;
    return { ...pic, caption, alt };
  }).slice(0, PHOTO_SLOTS);
  if (photos.length < PHOTO_MIN) {
    throw new Error(`page_about.photos needs ${PHOTO_MIN} photos with a description`);
  }

  const principles = rows(raw.principles, (r): PrincipleItem | undefined => {
    const title = text(r.title);
    const bodyText = text(r.body);
    return title === undefined || bodyText === undefined ? undefined : { title, body: bodyText };
  }).slice(0, PRINCIPLE_SLOTS);
  if (principles.length < PRINCIPLE_SLOTS) {
    throw new Error(`page_about.principles needs ${PRINCIPLE_SLOTS} complete principles`);
  }

  const workingOn = rows(raw.working_on, (r) => text(r.text)).slice(0, WORKING_ON_SLOTS);
  const booking = rows(raw.booking, (r): BookingItem | undefined => {
    const label = text(r.label);
    const detail = text(r.detail);
    return label === undefined || detail === undefined
      ? undefined
      : { label, detail, status: choice<BookingStatus>(r.status, ['open', 'limited'], 'open') };
  }).slice(0, BOOKING_SLOTS);
  const reading = rows(raw.reading, (r): ReadingItem | undefined => {
    const title = text(r.title);
    const author = text(r.author);
    return title === undefined || author === undefined
      ? undefined
      : { title, author, note: text(r.note) };
  }).slice(0, READING_SLOTS);
  const learning = rows(raw.learning, (r) => text(r.text)).slice(0, LEARNING_SLOTS);
  for (const [name, list] of [
    ['working_on', workingOn],
    ['booking', booking],
    ['reading', reading],
    ['learning', learning],
  ] as const) {
    if (list.length === 0) throw new Error(`page_about.${name} has no complete rows`);
  }

  const updated = dayOf(raw.currently_updated);
  if (updated === undefined) throw new Error('page_about.currently_updated is not a date');

  // The headshot: CMS media needs its description; otherwise the bundled one stands in.
  const headshotPic = picture(raw.headshot);
  const headshotAlt = text(raw.headshot_alt);
  const headshot =
    hasPicture(headshotPic) && headshotAlt !== undefined
      ? { ...headshotPic, alt: headshotAlt }
      : BUNDLED_HEADSHOT;

  return {
    seoTitle: must(raw, 'seo_title'),
    seoDescription: must(raw, 'seo_description'),
    ctaTitle: text(raw.cta_title),
    ctaSub: text(raw.cta_sub),
    heading: must(raw, 'heading'),
    headingAccent: must(raw, 'heading_accent'),
    intro: must(raw, 'intro'),
    headshot,
    thesis: {
      before: must(raw, 'thesis_before'),
      accent: must(raw, 'thesis_accent'),
      after: must(raw, 'thesis_after'),
    },
    story: { heading: must(raw, 'story_heading'), sub: must(raw, 'story_sub'), body },
    outside: { heading: must(raw, 'outside_heading'), sub: must(raw, 'outside_sub'), photos },
    principles: {
      heading: must(raw, 'principles_heading'),
      sub: must(raw, 'principles_sub'),
      items: principles,
    },
    currently: {
      heading: must(raw, 'currently_heading'),
      sub: must(raw, 'currently_sub'),
      updated,
      workingOn,
      booking,
      reading,
      learning,
    },
    testimonials: {
      heading: must(raw, 'testimonials_heading'),
      sub: must(raw, 'testimonials_sub'),
    },
    lighthouse: {
      performance: score(raw, 'lighthouse_performance'),
      accessibility: score(raw, 'lighthouse_accessibility'),
      bestPractices: score(raw, 'lighthouse_best_practices'),
      seo: score(raw, 'lighthouse_seo'),
    },
    jobTitle: must(raw, 'job_title'),
  };
}

/**
 * The page <title>. The stored value is the bare name ("About"); the studio name
 * is added so a tab reads "About | Nixon Creative Studio". If an edit already
 * includes the studio name it is left alone.
 */
export function aboutTitle(seoTitle: string, studioName: string): string {
  return seoTitle.includes(studioName) ? seoTitle : `${seoTitle} | ${studioName}`;
}

/* ----------------------------------------------------------------------------
   JSON-LD
   ---------------------------------------------------------------------------- */

/** What the Person schema needs from the site settings. */
export interface PersonSite {
  url: string;
  ownerName: string;
  social: { instagram: string; linkedin: string };
}

/**
 * The Person structured data for /about: the studio owner, linked back to the
 * Organization BaseLayout defines site-wide. The key order is the order the page
 * emitted before this moved to the CMS (the byte-equality test pins it).
 */
export function buildPersonSchema(about: Pick<AboutPage, 'jobTitle'>, site: PersonSite) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${site.url}/about/#person`,
    name: site.ownerName,
    jobTitle: about.jobTitle,
    worksFor: { '@id': `${site.url}#organization` },
    url: `${site.url}/about/`,
    sameAs: [site.social.instagram, site.social.linkedin],
  };
}

/* ----------------------------------------------------------------------------
   Read
   ---------------------------------------------------------------------------- */

/** What the reader needs from the caller: `Astro` in a page. */
export interface AboutContext {
  /** Route cache; the read adds its tag so publishing the entry purges the page. */
  cache?: RouteCache;
}

/** The /about page. One D1 read; falls back to the committed JSON. */
export async function getAboutPage(
  ctx: AboutContext = {},
  opts: Pick<NonNullable<Parameters<typeof getSingleton>[3]>, 'deps'> = {},
): Promise<AboutPage> {
  return (
    await getSingleton('page_about', 'about', normalizeAboutPage, {
      cache: ctx.cache,
      ...opts,
    })
  ).data;
}
