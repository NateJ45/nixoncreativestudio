/* ============================================================================
   Services page | The /services words and offerings, read from the CMS
   ============================================================================
   Foundation, edit with care.

   /services reads two things through here:
     - getServicesPage()     the page words (`page_services`, entry `services`):
                             headline, cost and why-it-costs copy, the FAQ rows,
                             the closing banner override
     - getServiceOfferings() the three service chapters (`service_offerings`)

   Both live in the EmDash admin (Pages, "Services page"; Pricing & services,
   "Service offerings"; schemas in cms/schema/). If an entry is missing,
   unpublished or unreadable, the reader serves the committed copy in
   cms/content/page_services.json and service_offerings.json (the literal text
   services.astro used to hold) and logs a `[cms]` line, so a broken edit never
   blanks the page. That fallback is also what production serves until its data
   is loaded (docs/LAUNCH-RUNBOOK.md).

   buildServiceSchemas() turns the same data into the page's JSON-LD (one Service
   per offering plus the FAQPage), so the structured data Google reads can never
   disagree with the visible page. It is a pure function with a unit test that
   pins its output byte-for-byte to what the page emitted before the move.

   Stays in code (docs/CMS-DESIGN.md 1.6): section order, the three-service flow
   card, "What's included", the placeholder icon SVG markup, the Web design
   picture (an image file in src/assets, not a CMS upload yet) and the process
   steps (the homepage's).
   ============================================================================ */

import { choice, getOrdered, getSingleton, int, rows, text, texts, type Raw } from './cms.ts';
import type { RouteCache } from './routeCache.ts';

/** One FAQ row. Also the source of the FAQPage JSON-LD. */
export interface FaqItem {
  question: string;
  answer: string;
}

export interface WhyItem {
  title: string;
  body: string;
}

export interface ServicesPage {
  /** Page title without the studio name; the page adds it (see pageTitle). */
  seoTitle: string;
  seoDescription: string;
  /** Closing banner overrides; undefined means the site default. */
  ctaTitle?: string;
  ctaSub?: string;
  heading: string;
  intro: string;
  pricing: { heading: string; sub: string; footnote: string };
  addonsHeading: string;
  why: { heading: string; sub: string; items: WhyItem[]; closing: string };
  faq: { heading: string; sub: string; items: FaqItem[] };
}

export type PlaceholderIcon = 'strategy' | 'photography' | 'none';
export type AreaServed = 'regional' | 'anywhere';

export interface ServiceOffering {
  /** The entry slug: `strategy`, `web-design`, `photography`. */
  slug: string;
  title: string;
  lede: string;
  body: string;
  /** Standalone starting price for the JSON-LD Offer; undefined for none. */
  priceFrom?: number;
  /** Description of the picture; empty means "show the placeholder panel". */
  imageAlt?: string;
  placeholderIcon: PlaceholderIcon;
  points: string[];
  areaServed: AreaServed;
}

/** The layout has three chapters, and the FAQ allows ten rows; more never render. */
export const OFFERING_SLOTS = 3;
export const WHY_SLOTS = 4;
export const FAQ_SLOTS = 10;

/** The slug whose JSON-LD floor follows the first Pricing tier (PR 5). */
export const WEB_DESIGN_SLUG = 'web-design';

/** A required string; a blank one makes the entry unusable (the reader then falls back). */
function must(raw: Raw, key: string, where: string): string {
  const v = text(raw[key]);
  if (v === undefined) throw new Error(`${where}.${key} is empty`);
  return v;
}

/**
 * Build the typed ServicesPage from a raw `page_services` entry (or the fallback
 * JSON). Throws when a required field is blank or the reasons list is short or an
 * FAQ has fewer than three complete rows, so the reader serves the committed
 * fallback instead of a half-empty page. Lists that are too long are cut.
 */
export function normalizeServicesPage(raw: Raw): ServicesPage {
  const why = rows(raw.why_items, (r): WhyItem | undefined => {
    const title = text(r.title);
    const body = text(r.body);
    return title === undefined || body === undefined ? undefined : { title, body };
  }).slice(0, WHY_SLOTS);
  if (why.length < WHY_SLOTS) {
    throw new Error(`page_services.why_items needs ${WHY_SLOTS} complete reasons`);
  }
  const faq = rows(raw.faq, (r): FaqItem | undefined => {
    const question = text(r.question);
    const answer = text(r.answer);
    return question === undefined || answer === undefined ? undefined : { question, answer };
  }).slice(0, FAQ_SLOTS);
  if (faq.length < 3) throw new Error('page_services.faq needs at least 3 complete questions');
  const w = 'page_services';
  return {
    seoTitle: must(raw, 'seo_title', w),
    seoDescription: must(raw, 'seo_description', w),
    ctaTitle: text(raw.cta_title),
    ctaSub: text(raw.cta_sub),
    heading: must(raw, 'heading', w),
    intro: must(raw, 'intro', w),
    pricing: {
      heading: must(raw, 'pricing_heading', w),
      sub: must(raw, 'pricing_sub', w),
      footnote: must(raw, 'pricing_footnote', w),
    },
    addonsHeading: must(raw, 'addons_heading', w),
    why: {
      heading: must(raw, 'why_heading', w),
      sub: must(raw, 'why_sub', w),
      items: why,
      closing: must(raw, 'why_closing', w),
    },
    faq: { heading: must(raw, 'faq_heading', w), sub: must(raw, 'faq_sub', w), items: faq },
  };
}

/**
 * Build one offering from a raw `service_offerings` entry (or the fallback JSON).
 * Throws on a blank title, summary, paragraph or fewer than one included line, so
 * the reader serves the committed fallback instead of a half-empty chapter.
 */
export function normalizeOffering(raw: Raw, slug = ''): ServiceOffering {
  const points = texts(raw.points);
  if (points.length === 0) throw new Error('service_offerings.points is empty');
  const priceFrom = int(raw.price_from);
  return {
    slug,
    title: must(raw, 'title', 'service_offerings'),
    lede: must(raw, 'lede', 'service_offerings'),
    body: must(raw, 'body', 'service_offerings'),
    priceFrom: priceFrom !== undefined && priceFrom > 0 ? priceFrom : undefined,
    imageAlt: text(raw.image_alt),
    placeholderIcon: choice<PlaceholderIcon>(
      raw.placeholder_icon,
      ['strategy', 'photography', 'none'],
      'none',
    ),
    points,
    areaServed: choice<AreaServed>(raw.area_served, ['regional', 'anywhere'], 'anywhere'),
  };
}

/**
 * The page <title>. The stored value is the bare name ("Services"); the studio
 * name is added so a tab reads "Services | Nixon Creative Studio". If an edit
 * already includes the studio name it is left alone.
 */
export function servicesTitle(seoTitle: string, studioName: string): string {
  return seoTitle.includes(studioName) ? seoTitle : `${seoTitle} | ${studioName}`;
}

/* ----------------------------------------------------------------------------
   JSON-LD
   ---------------------------------------------------------------------------- */

/**
 * The Service (one per offering) and FAQPage structured data for /services.
 *
 * The key order matters to the byte-equality test: it is the order the page
 * emitted before this moved to the CMS. `webDesignFloor` is the first Pricing
 * tier's starting price, which stands in for a Web design offering that has no
 * price of its own (CMS-DESIGN PR 5); an offering's own price wins when set.
 */
export function buildServiceSchemas(
  offerings: ServiceOffering[],
  faq: FaqItem[],
  siteUrl: string,
  webDesignFloor?: number,
): Record<string, unknown>[] {
  return [
    ...offerings.map((service) => {
      const priceFrom =
        service.priceFrom ?? (service.slug === WEB_DESIGN_SLUG ? webDesignFloor : undefined);
      return {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: service.title,
        description: service.body,
        provider: { '@id': `${siteUrl}#organization` },
        // Photography needs the studio on site, so it stays regional; strategy,
        // web design and brand work serve clients anywhere (region + country).
        areaServed:
          service.areaServed === 'regional'
            ? 'Greater Cincinnati region'
            : ['Greater Cincinnati region', 'United States'],
        // Publish the "from" floor as an Offer, only when the service has one.
        ...(priceFrom
          ? {
              offers: {
                '@type': 'Offer',
                priceSpecification: {
                  '@type': 'PriceSpecification',
                  minPrice: priceFrom,
                  priceCurrency: 'USD',
                },
              },
            }
          : {}),
      };
    }),
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ];
}

/* ----------------------------------------------------------------------------
   Reads
   ---------------------------------------------------------------------------- */

/** What the readers need from the caller: `Astro` in a page. */
export interface ServicesContext {
  /** Route cache; the read adds its tag so publishing an entry purges the page. */
  cache?: RouteCache;
}

/** The /services words. One D1 read; falls back to the committed JSON. */
export async function getServicesPage(
  ctx: ServicesContext = {},
  opts: Pick<NonNullable<Parameters<typeof getSingleton>[3]>, 'deps'> = {},
): Promise<ServicesPage> {
  return (
    await getSingleton('page_services', 'services', normalizeServicesPage, {
      cache: ctx.cache,
      ...opts,
    })
  ).data;
}

/** The three service chapters, in order. Falls back to the committed JSON. */
export async function getServiceOfferings(
  ctx: ServicesContext = {},
  opts: Pick<NonNullable<Parameters<typeof getOrdered>[2]>, 'deps'> = {},
): Promise<ServiceOffering[]> {
  const entries = await getOrdered('service_offerings', normalizeOffering, {
    cache: ctx.cache,
    limit: OFFERING_SLOTS,
    ...opts,
  });
  return entries.map((e) => e.data);
}
