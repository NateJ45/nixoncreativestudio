/* ============================================================================
   caseStudies (EmDash reader)
   ============================================================================
   Foundation, edit with care.

   The one place the site reads case studies from the EmDash CMS. Every page or
   component that used to call getCollection('case-studies') calls
   getCaseStudies() / getCaseStudy() instead, so the stored shape (documented in
   docs/EMDASH-SCHEMA.md) is only interpreted here.

   Everything here runs at request time (D1 read; the whole site is server-rendered
   since CMS-DESIGN PR 2). Pass `Astro.cache` to getCaseStudies() / getCaseStudy():
   they add the cache tags of every row they read, so the route cache can purge the
   page when Nathan publishes an edit (src/lib/routeCache.ts).

   Gotchas handled here so pages do not have to remember them:
   - `featured` comes back from D1 as 0 or 1, so it is turned into a boolean.
   - `published` is the project date field (an ISO string), NOT the system
     `published_at` column (which is the migration moment). It is turned into a
     Date, and every list is sorted newest first on it.
   - services, tags and stack are flat TAXONOMIES (`service`, `topic`, `stack`;
     the built-in `tag` taxonomy belongs to posts, so case study tags are
     `topic`), not fields. EmDash hydrates them onto `data.terms`, keyed by
     taxonomy name: `data.terms.service` is an array of { slug, label, ... } in
     the taxonomy's term order. We read the labels, which are the original
     strings. (The per-entry call getEntryTerms() needs entry.data.id, the ULID,
     not the slug; hydration makes that unnecessary here.)
   - `results` is a repeater: rows of { text }. Flattened to string[] here.
   - Empty optional fields may come back as null; the helpers return undefined
     for those so a plain truthiness check works in templates.
   ============================================================================ */

import { getEmDashCollection, getEmDashEntry, getTaxonomyTermsWithCacheHint } from 'emdash';
import type { ImageValue } from 'emdash';
import type { RouteCache } from './routeCache';

/** A Portable Text block. Kept loose on purpose; the renderer does the work. */
export type PTBlock = {
  _type: string;
  _key?: string;
  style?: string;
  children?: { text?: string }[];
  [key: string]: unknown;
};

/** One row of the `highlights` repeater (see docs/EMDASH-SCHEMA.md). */
export interface Highlight {
  image: ImageValue;
  alt: string;
  title: string;
  caption: string;
  side?: 'left' | 'right';
  eyebrow?: string;
}

export interface CaseStudy {
  /** The entry slug, which is also the /work/<slug>/ URL segment. */
  id: string;
  title: string;
  client: string;
  sector: 'church' | 'school' | 'nonprofit' | 'small-business';
  services: string[];
  role?: string;
  tags: string[];
  stack: string[];
  summary: string;
  description?: string;
  cover?: ImageValue;
  featured: boolean;
  published: Date;
  updated?: Date;
  liveUrl?: string;
  outcome?: string;
  testimonial?: { quote: string; name: string; title?: string };
  results: string[];
  designerNote?: string;
  body: PTBlock[];
  showcaseDesktop?: ImageValue;
  showcaseMobile?: ImageValue;
  showcaseAlt?: string;
  showcaseHref?: string;
  showcaseLabel?: string;
  showcaseVariant: 'scroll' | 'zoom';
  highlights: Highlight[];
  beforeImage?: ImageValue;
  beforeAlt?: string;
  beforeLabel?: string;
  afterImage?: ImageValue;
  afterAlt?: string;
  afterLabel?: string;
}

// entry.data is untyped at the EmDash boundary; read it through a loose record.
type Raw = Record<string, unknown>;

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
/**
 * Term order per taxonomy: label -> position in the taxonomy's own term list.
 * An entry's hydrated `data.terms` come back alphabetical, but the original
 * stack and tag lists were written in a deliberate order ("Astro, Sanity, ..."),
 * and the migration creates the terms in an order that preserves it. Sorting by
 * the taxonomy order restores it.
 */
type TermOrder = Record<string, Map<string, number>>;
async function loadTermOrder(cache?: RouteCache): Promise<TermOrder> {
  const order: TermOrder = {};
  for (const name of ['service', 'topic', 'stack']) {
    const { data: terms, cacheHint } = await getTaxonomyTermsWithCacheHint(name);
    // Reordering or renaming a term must rebuild the pages that show it.
    if (cache?.enabled) cache.set(cacheHint);
    order[name] = new Map(terms.map((t, i) => [t.label, i]));
  }
  return order;
}

/** Labels of the terms hydrated for one taxonomy (data.terms[taxonomy]), in taxonomy order. */
const termLabels = (d: Raw, taxonomy: string, order: TermOrder): string[] => {
  const terms = (d.terms as Record<string, { label?: string }[]> | undefined)?.[taxonomy];
  if (!Array.isArray(terms)) return [];
  const pos = (label: string) => order[taxonomy]?.get(label) ?? Number.MAX_SAFE_INTEGER;
  return terms
    .map((t) => String(t.label ?? ''))
    .filter(Boolean)
    .sort((a, b) => pos(a) - pos(b));
};
/** Repeater rows { text } to string[]. */
const rowTexts = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map((r) => String((r as { text?: unknown })?.text ?? '')).filter(Boolean)
    : [];
const date = (v: unknown): Date | undefined => {
  if (typeof v !== 'string' || !v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.valueOf()) ? undefined : d;
};
const img = (v: unknown): ImageValue | undefined =>
  v && typeof v === 'object' ? (v as ImageValue) : undefined;

function normalize(id: string, d: Raw, order: TermOrder): CaseStudy {
  const quote = str(d.testimonial_quote);
  return {
    id,
    title: String(d.title ?? ''),
    client: String(d.client ?? ''),
    sector: d.sector as CaseStudy['sector'],
    services: termLabels(d, 'service', order),
    role: str(d.role),
    tags: termLabels(d, 'topic', order),
    stack: termLabels(d, 'stack', order),
    summary: String(d.summary ?? ''),
    description: str(d.description),
    cover: img(d.cover),
    featured: Boolean(d.featured),
    published: date(d.published) ?? new Date(0),
    updated: date(d.updated),
    liveUrl: str(d.live_url),
    outcome: str(d.outcome),
    testimonial: quote
      ? { quote, name: String(d.testimonial_name ?? ''), title: str(d.testimonial_title) }
      : undefined,
    results: rowTexts(d.results),
    designerNote: str(d.designer_note),
    body: Array.isArray(d.body) ? (d.body as PTBlock[]) : [],
    showcaseDesktop: img(d.showcase_desktop),
    showcaseMobile: img(d.showcase_mobile),
    showcaseAlt: str(d.showcase_alt),
    showcaseHref: str(d.showcase_href),
    showcaseLabel: str(d.showcase_label),
    showcaseVariant: d.showcase_variant === 'zoom' ? 'zoom' : 'scroll',
    highlights: Array.isArray(d.highlights) ? (d.highlights as Highlight[]) : [],
    beforeImage: img(d.before_image),
    beforeAlt: str(d.before_alt),
    beforeLabel: str(d.before_label),
    afterImage: img(d.after_image),
    afterAlt: str(d.after_alt),
    afterLabel: str(d.after_label),
  };
}

/**
 * Every published case study, newest project first. Throws if the CMS read fails.
 * Pass `Astro.cache` so the page is tagged with the rows it rendered.
 */
export async function getCaseStudies(cache?: RouteCache): Promise<CaseStudy[]> {
  const { entries, error, cacheHint } = await getEmDashCollection('case_studies');
  if (error) throw error;
  if (cache?.enabled) cache.set(cacheHint);
  const order = await loadTermOrder(cache);
  return entries
    .map((e) => normalize(e.id, e.data as Raw, order))
    .sort((a, b) => b.published.valueOf() - a.published.valueOf());
}

/** One case study by slug, or undefined when it does not exist (caller 404s). */
export async function getCaseStudy(
  slug: string,
  cache?: RouteCache,
): Promise<CaseStudy | undefined> {
  const { entry, error, cacheHint } = await getEmDashEntry('case_studies', slug);
  if (error) throw error;
  if (cache?.enabled) cache.set(cacheHint);
  return entry ? normalize(entry.id, entry.data as Raw, await loadTermOrder(cache)) : undefined;
}

/** Plain text of a Portable Text body, for reading-time estimates. */
export function bodyText(body: PTBlock[]): string {
  return body.map((b) => (b.children ?? []).map((c) => c.text ?? '').join('')).join('\n');
}

/** Heading slug, matching what Astro's MDX pipeline produced (the old TOC ids). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

/** The h2 headings of a body, for the sticky table of contents. */
export function bodyHeadings(body: PTBlock[]): { text: string; slug: string }[] {
  return body
    .filter((b) => b.style === 'h2')
    .map((b) => {
      const text = (b.children ?? []).map((c) => c.text ?? '').join('');
      return { text, slug: slugify(text) };
    });
}

/**
 * Split a body into the three runs the page needs, per the placement rule in
 * docs/EMDASH-SCHEMA.md. The page renders:
 *
 *   PortableText(brief), before/after slider, PortableText(approach),
 *   highlights, PortableText(rest)
 *
 * where brief ends just before the 'The approach' heading, approach runs from
 * that heading through the 'What we built' heading (inclusive, so the
 * highlights land right under it), and rest is everything after. If a
 * heading is missing the body degrades gracefully: the slider and highlights
 * simply land at the end of the run that exists.
 */
export function splitBody(body: PTBlock[]) {
  const text = (b: PTBlock) => (b.children ?? []).map((c) => c.text ?? '').join('');
  const at = (label: string) => body.findIndex((b) => b.style === 'h2' && text(b) === label);
  const approach = at('The approach');
  const built = at('What we built');
  const a = approach >= 0 ? approach : body.length;
  const b = built >= a ? built + 1 : a;
  return { brief: body.slice(0, a), approach: body.slice(a, b), rest: body.slice(b) };
}
