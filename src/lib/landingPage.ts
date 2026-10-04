/* ============================================================================
   Landing pages | the four search landing pages, read from the CMS
   ============================================================================
   Safe to edit.

   Four pages written for the four searches the studio wants to be found for
   (docs/redesign-2026/E-conversion-seo.md, fix 3; outlines and proof in
   docs/redesign-2026/landing-pages-brief.md):

     /church-websites/               "church website Cincinnati"
     /nonprofit-websites/            "nonprofit website designer"
     /school-websites/               "school website design"
     /cincinnati-event-photography/  "Cincinnati event photographer"

   WHERE THE WORDS LIVE. Each page is an entry of the template `pages`
   collection (EmDash admin: Pages, "Other pages"; the same collection as
   Privacy, Accessibility and Colophon), found by its slug, which is also its
   URL. No new schema: the fields that collection already has carry the words.

     title     the browser tab and search result title (the studio name is added)
     heading   the h1
     summary   the search description
     intro     the paragraph(s) under the h1 (the promise)
     content   the body. Each "Heading 2" starts a section. ONE section is the
               FAQ: a section whose first block is a "Heading 3" and in which
               every Heading 3 (a question) is followed by at least one
               paragraph (its answer). Its questions also become the FAQPage
               JSON-LD. Every other section is drawn as a band of its own, in
               order.
     eyebrow, rows, show_toc, last_updated   not used on these pages.

   If an entry is missing (the CI dataset carries none until its next snapshot;
   production holds all four, docs/redesign-2026/content-production-plan.md
   "Incident"), unpublished, or cannot make a
   page (no intro, no prose section, fewer than three questions), the reader
   serves the committed cms/content/pages.json and logs a `[cms]` line.

   WHAT STAYS IN CODE, keyed by slug in LANDING_SEGMENTS below: the contact
   preset, the button labels, the JSON-LD service name and audience, the price
   band's heading and which-tier note, and (in LandingProof.astro) the proof:
   which real sites are shown and the facts printed beside them. Prices are
   never typed here: they come from getPricingTiers() and the Photography
   offering, so a price edit in the admin moves every page. The FAQ answers are
   prose and cannot read those values, so a price change also needs the
   matching answers edited (the same rule as /services).

   The pure parts (normalizeLandingPage, fillPrices, contactHref,
   buildLandingSchemas) are unit tested in landingPage.test.ts.
   ============================================================================ */

import { getSingleton, portable, text, type Raw } from './cms.ts';
import {
  blockHtml,
  blockText,
  restrictPortableText,
  slugify,
  type PTNode,
} from './portableText.ts';
import { CODE_CLASS, LINK_CLASS, type ProseBlock, type ProseSection } from './prosePage.ts';
import type { RouteCache } from './routeCache.ts';
import { buildBreadcrumbSchema, buildFaqPageSchema } from './structuredData.ts';

/* ----------------------------------------------------------------------------
   The four segments
   ---------------------------------------------------------------------------- */

export const LANDING_SLUGS = [
  'church-websites',
  'nonprofit-websites',
  'school-websites',
  'cincinnati-event-photography',
] as const;
export type LandingSlug = (typeof LANDING_SLUGS)[number];

/** The contact form's organization types these pages preset (src/pages/contact.astro). */
export type Sector = 'church' | 'nonprofit' | 'school';

export interface LandingSegment {
  slug: LandingSlug;
  /** The route, with its trailing slash (never-break rule 8). */
  path: string;
  /** Web design or a photo day: picks the bands the template draws. */
  kind: 'web' | 'photo';
  /** Preselected on the contact form; none for photography (any sector books a photo day). */
  sector?: Sector;
  /** The short name used in link lists (footer, /services, the other landing pages). */
  linkLabel: string;
  /** JSON-LD Service name and serviceType. */
  serviceName: string;
  serviceType: string;
  /** JSON-LD Audience.audienceType; none for photography. */
  audience?: string;
  /** Photography needs Nathan on site; web work serves clients anywhere. */
  area: 'regional' | 'anywhere';
  /** The hero and closing button. */
  ctaLabel: string;
  /** The mid-page button (photography: under the photographs). */
  midCtaLabel: string;
  /**
   * What it costs, for this kind of organization (web pages). NOT the whole
   * price sheet: that lives on /services/ and the band links to it.
   *   heading  the band's headline (its last phrase turns italic)
   *   note     a short paragraph. `{Launch}`, `{Signature}`, `{Flagship}` are
   *            replaced with that tier's "from $N" (fillPrices), so no price
   *            is typed here.
   *   tiers    the one or two tiers (by name) drawn as slips beside it
   */
  cost?: { heading: string; note: string; tiers: string[] };
  /**
   * How it goes, told from this organization's side (web pages): one line per
   * process step (the Home page entry's four steps, in order) saying what the
   * board, the director or the office does in it. Durations are
   * ProjectTimeline's, so they agree with /services.
   */
  steps?: { heading: string; yours: [string, string, string, string] };
  /** The closing headline and the line under it. */
  closeTitle: string;
  /** Falls back to the site default (Site settings) when unset. */
  closeSub?: string;
}

export const LANDING_SEGMENTS: Record<LandingSlug, LandingSegment> = {
  'church-websites': {
    slug: 'church-websites',
    path: '/church-websites/',
    kind: 'web',
    sector: 'church',
    linkLabel: 'Church websites',
    serviceName: 'Church website design',
    serviceType: 'Web design',
    audience: 'Churches',
    area: 'anywhere',
    ctaLabel: 'Plan your church website',
    midCtaLabel: 'Ask what yours would cost',
    cost: {
      heading: 'What a church website costs',
      note: 'Launch, {Launch}, suits most churches: the service times, the visit page, the staff and the sermons, kept current by a volunteer. A church with ministries, events and a sermon library to keep up is a Signature site, {Signature}. Larger projects can be split into monthly payments, and the first conversation ends with a ballpark you can take to the session or the board.',
      tiers: ['Launch', 'Signature'],
    },
    steps: {
      heading: 'Who does what, week to week',
      yours: [
        'Whoever is leading the change, a pastor, an elder or the office, brings the current site and the jobs it does on a Sunday morning.',
        'Your staff read the page plan and push back: which ministries get a page, and what a first-time visitor needs to find before they come.',
        'The volunteer who will keep the site current gets the preview links too, so they learn the editor on the real site before it launches.',
        'We go live together. In the first month the volunteer makes the real edits, a new event or a staff change, while I am still watching.',
      ],
    },
    closeTitle: 'Send me the old site, and who keeps it up today.',
    closeSub:
      'The address of the site you have now and a line about who updates it is enough to start. I reply myself within one or two business days.',
  },
  'nonprofit-websites': {
    slug: 'nonprofit-websites',
    path: '/nonprofit-websites/',
    kind: 'web',
    sector: 'nonprofit',
    linkLabel: 'Nonprofit websites',
    serviceName: 'Nonprofit web design',
    serviceType: 'Web design',
    audience: 'Nonprofit organizations',
    area: 'anywhere',
    ctaLabel: 'Ask about a nonprofit site',
    midCtaLabel: 'Ask what yours would cost',
    cost: {
      heading: 'What it costs a small nonprofit',
      note: 'A nonprofit with one main program fits Launch, {Launch}. Programs, events and news to keep up make it a Signature site, {Signature}. Tools of your own, like a results database or a members area, are Flagship work, {Flagship}. Larger projects can be split into monthly payments that follow your cash flow.',
      tiers: ['Launch', 'Signature'],
    },
    steps: {
      heading: 'What the director does, and when',
      yours: [
        'You and whoever answers the phone list what the site states as fact, where each fact comes from and who changes it.',
        'You check the page plan against your programs and the next event on the calendar, and take it to the board if the board signs off on spending.',
        'The person who will run the site tries the editor on the preview, with your real programs in it, not sample text.',
        'After launch the list of who changes what is the site itself. For a month I fix anything that surfaces; then it is yours outright.',
      ],
    },
    closeTitle: 'Tell me the facts your site keeps getting wrong.',
    closeSub:
      'A results table, a program schedule, a board list: name the one that drifts, and I will tell you how it would be entered once. I reply myself within one or two business days.',
  },
  'school-websites': {
    slug: 'school-websites',
    path: '/school-websites/',
    kind: 'web',
    sector: 'school',
    linkLabel: 'School websites',
    serviceName: 'School website design',
    serviceType: 'Web design',
    audience: 'Schools',
    area: 'anywhere',
    ctaLabel: 'Plan your school website',
    midCtaLabel: 'Ask what yours would cost',
    cost: {
      heading: 'What a school website costs',
      note: 'A small school or preschool with a few pages the office keeps current is a Launch site, {Launch}. A school with admissions, a calendar and news is a Signature site, {Signature}. Larger projects can be split into monthly payments, which helps when the budget is set a year ahead.',
      tiers: ['Launch', 'Signature'],
    },
    steps: {
      heading: 'What the office does at each step',
      yours: [
        'The head of school or the office manager, and admissions if you have it. We start with who will run the site after the person launching it.',
        'You check the page plan against the school year: admissions season, term dates and the open-house days.',
        'Office staff get the preview links and try the edits they will really make: a term date, a new member of staff, a snow-day notice.',
        'We choose a launch date that suits the school calendar, then I stay close for the first month while the office settles in.',
      ],
    },
    closeTitle: 'Ask me the question your board will ask.',
    closeSub:
      'Who runs the site next year, what it costs, how the office keeps it current: put it to me before the meeting. I reply myself within one or two business days.',
  },
  'cincinnati-event-photography': {
    slug: 'cincinnati-event-photography',
    path: '/cincinnati-event-photography/',
    kind: 'photo',
    linkLabel: 'Event photography',
    serviceName: 'Event photography',
    serviceType: 'Photography',
    area: 'regional',
    ctaLabel: 'Book a photo day',
    midCtaLabel: 'Ask about a date',
    closeTitle: 'Tell me about the day, and what the pictures are for.',
  },
};

/** The four pages as link-list items, in a fixed order (footer, /services, the closing band). */
export const LANDING_LINKS: { slug: LandingSlug; label: string; href: string }[] =
  LANDING_SLUGS.map((slug) => ({
    slug,
    label: LANDING_SEGMENTS[slug].linkLabel,
    href: LANDING_SEGMENTS[slug].path,
  }));

/** The contact link, with the organization type preset when there is one (trailing slash kept). */
export function contactHref(sector?: Sector): string {
  return sector ? `/contact/?org_type=${sector}` : '/contact/';
}

/** "$4,000" from 4000. */
export const money = (n: number): string => `$${n.toLocaleString('en-US')}`;

/**
 * Replace `{TierName}` with "from $N" for each published tier. A placeholder
 * whose tier no longer exists is removed with the words around it up to the
 * sentence end, so an unpublished tier never leaves "{Flagship}" on the page.
 */
export function fillPrices(template: string, tiers: { name: string; priceFrom: number }[]): string {
  const byName = new Map(tiers.map((t) => [t.name.toLowerCase(), t.priceFrom]));
  return template
    .split(/(?<=\.)\s+/)
    .map((sentence) =>
      sentence.replace(/\{(\w+)\}/g, (whole, name: string) => {
        const price = byName.get(name.toLowerCase());
        return price === undefined ? whole : `from ${money(price)}`;
      }),
    )
    .filter((sentence) => !/\{\w+\}/.test(sentence))
    .join(' ');
}

/* ----------------------------------------------------------------------------
   The page words
   ---------------------------------------------------------------------------- */

export interface LandingFaqItem {
  question: string;
  /** The answer's paragraphs as trusted HTML (built by blockHtml from restricted text). */
  answerHtml: string[];
  /** The same answer as plain text, for the FAQPage JSON-LD. */
  answerText: string;
}

export interface LandingPage {
  slug: string;
  /** The bare title; the tab reads "<title> | <studio name>" (proseTitle). */
  title: string;
  heading: string;
  summary: string;
  /** The intro paragraphs as HTML. */
  intro: string[];
  /** Every Heading 2 section except the FAQ, in order. */
  sections: ProseSection[];
  faq: { heading: string; items: LandingFaqItem[] };
}

/** Fewest questions a page's FAQ may have before the entry counts as broken. */
export const MIN_FAQ = 3;

const paragraphHtml = (b: PTNode): string =>
  blockHtml(b, { linkClass: LINK_CLASS, externalBlank: true, codeClass: CODE_CLASS });

interface RawSection {
  heading: string;
  blocks: PTNode[];
}

/** True when a section reads as questions and answers (see the header). */
export function isFaqSection(blocks: PTNode[]): boolean {
  if (blocks.length < 2 || blocks[0].style !== 'h3') return false;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].style !== 'h3') continue;
    const next = blocks[i + 1];
    if (!next || next.style === 'h3' || next.listItem) return false;
  }
  return true;
}

function faqItems(blocks: PTNode[]): LandingFaqItem[] {
  const items: LandingFaqItem[] = [];
  for (const b of blocks) {
    if (b.style === 'h3') {
      items.push({ question: blockText(b).trim(), answerHtml: [], answerText: '' });
    } else {
      const item = items[items.length - 1];
      item.answerHtml.push(paragraphHtml(b));
      item.answerText = [item.answerText, blockText(b).trim()].filter(Boolean).join(' ');
    }
  }
  return items;
}

/** A prose section's blocks: paragraphs, lists (consecutive items joined) and sub-headings. */
function proseBlocks(blocks: PTNode[]): ProseBlock[] {
  const out: ProseBlock[] = [];
  for (const b of blocks) {
    if (b.style === 'h3') {
      const t = blockText(b).trim();
      out.push({ kind: 'h3', id: slugify(t) || 'subsection', text: t });
    } else if (b.listItem) {
      const ordered = b.listItem === 'number';
      const last = out[out.length - 1];
      if (last?.kind === 'list' && last.ordered === ordered) last.items.push(paragraphHtml(b));
      else out.push({ kind: 'list', ordered, items: [paragraphHtml(b)] });
    } else {
      out.push({ kind: 'p', html: paragraphHtml(b) });
    }
  }
  return out;
}

function must(raw: Raw, key: string, slug: string): string {
  const v = text(raw[key]);
  if (v === undefined) throw new Error(`pages/${slug}.${key} is empty`);
  return v.trim();
}

/**
 * Build the typed LandingPage from a raw `pages` entry (or the fallback JSON).
 * Throws when it cannot make a whole page: a blank title, headline or
 * description, no intro, no prose section, or an FAQ with fewer than MIN_FAQ
 * questions. The reader then serves the committed fallback.
 */
export function normalizeLandingPage(slug: string, raw: Raw): LandingPage {
  const intro = restrictPortableText(portable(raw.intro)).map(paragraphHtml);
  if (intro.length === 0) throw new Error(`pages/${slug} has no intro`);

  const blocks = restrictPortableText(raw.content, { headings: ['h2', 'h3'], lists: true });
  const raws: RawSection[] = [];
  for (const b of blocks) {
    if (b.style === 'h2') raws.push({ heading: blockText(b).trim(), blocks: [] });
    // Text before the first Heading 2 has no band to sit in; it is ignored.
    else raws[raws.length - 1]?.blocks.push(b);
  }

  const faqRaw = raws.find((s) => isFaqSection(s.blocks));
  const items = faqRaw ? faqItems(faqRaw.blocks) : [];
  if (!faqRaw || items.length < MIN_FAQ) {
    throw new Error(`pages/${slug} needs a questions section with at least ${MIN_FAQ} questions`);
  }

  const seen = new Set<string>();
  const sections = raws
    .filter((s) => s !== faqRaw && s.blocks.length > 0)
    .map((s): ProseSection => {
      let id = slugify(s.heading) || 'section';
      while (seen.has(id)) id = `${id}-more`;
      seen.add(id);
      return { id, heading: s.heading, blocks: proseBlocks(s.blocks) };
    });
  if (sections.length === 0) throw new Error(`pages/${slug} has no prose section`);

  return {
    slug,
    title: must(raw, 'title', slug),
    heading: must(raw, 'heading', slug),
    summary: must(raw, 'summary', slug),
    intro,
    sections,
    faq: { heading: faqRaw.heading, items },
  };
}

/* ----------------------------------------------------------------------------
   JSON-LD
   ---------------------------------------------------------------------------- */

/**
 * The page's structured data: a Service (provider: the studio's Organization,
 * which StructuredData.astro already publishes on every page), the FAQPage
 * from the visible questions, and a two-step BreadcrumbList. `minPrice` is the
 * lowest published floor for the service (the first Pricing tier, or the
 * Photography offering's price); left out when there is none.
 */
export function buildLandingSchemas(opts: {
  segment: LandingSegment;
  page: Pick<LandingPage, 'summary' | 'faq'>;
  siteUrl: string;
  minPrice?: number;
}): Record<string, unknown>[] {
  const { segment, page, siteUrl, minPrice } = opts;
  const url = `${siteUrl}${segment.path}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: segment.serviceName,
      serviceType: segment.serviceType,
      description: page.summary,
      url,
      provider: { '@id': `${siteUrl}#organization` },
      areaServed:
        segment.area === 'regional'
          ? 'Greater Cincinnati region'
          : ['Greater Cincinnati region', 'United States'],
      ...(segment.audience
        ? { audience: { '@type': 'Audience', audienceType: segment.audience } }
        : {}),
      ...(minPrice
        ? {
            offers: {
              '@type': 'Offer',
              priceSpecification: {
                '@type': 'PriceSpecification',
                minPrice,
                priceCurrency: 'USD',
              },
            },
          }
        : {}),
    },
    buildFaqPageSchema(page.faq.items.map((i) => ({ question: i.question, answer: i.answerText }))),
    buildBreadcrumbSchema([
      { name: 'Home', url: `${siteUrl}/` },
      { name: segment.linkLabel, url },
    ]),
  ];
}

/* ----------------------------------------------------------------------------
   Read
   ---------------------------------------------------------------------------- */

export interface LandingContext {
  /** Route cache; the read adds its tag so publishing the entry purges the page. */
  cache?: RouteCache;
}

/** One landing page's words by slug. One D1 read; falls back to the committed JSON. */
export async function getLandingPage(
  slug: LandingSlug,
  ctx: LandingContext = {},
  opts: Pick<NonNullable<Parameters<typeof getSingleton>[3]>, 'deps'> = {},
): Promise<LandingPage> {
  return (
    await getSingleton('pages', slug, (raw) => normalizeLandingPage(slug, raw), {
      cache: ctx.cache,
      ...opts,
    })
  ).data;
}
