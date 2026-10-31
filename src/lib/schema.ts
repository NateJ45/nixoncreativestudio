/* ============================================================================
   schema.org graph builders
   ============================================================================
   Pure functions that build the JSON-LD graph StructuredData.astro prints on
   every page. They live here (not in the component) so the unit tests in
   schema.test.ts can check them without a build: every node has a unique
   `@id`, and every offer equals the price a visitor sees.

   The shape, one `@graph` per page:

     studio  (ProfessionalService + LocalBusiness)  <- every page
     website (WebSite, publisher -> studio)          <- every page
     person  (Nathan, worksFor -> studio)            <- every page
     webpage (WebPage, isPartOf -> website)          <- every page
     breadcrumb (BreadcrumbList)                     <- nested pages only
     ...extra nodes the page passes in (CreativeWork, Service, FAQPage)

   Nodes point at each other with { '@id': ... } so search engines and AI
   tools read one connected description of the studio instead of several
   loose blocks. Every identity string comes from src/data/site.ts and every
   price from src/data/pricing.ts. Nothing here invents a rating, review or
   result: add one only when a real, attributed one exists.
   ============================================================================ */

import { site } from '../data/site.ts';
import type { AddOn, CarePlan, WebTier } from '../data/pricing.ts';
import { dollars, money } from './money.ts';

export type Node = Record<string, unknown>;

/** Every fixed `@id` on the site, in one place so nodes can never point at a typo. */
export const ids = {
  studio: `${site.url}/#studio`,
  website: `${site.url}/#website`,
  person: `${site.url}/about/#nathan`,
};

/** The page-level ids, derived from the page's canonical URL. */
export const pageIds = (url: string) => ({
  webpage: `${url}#webpage`,
  breadcrumb: `${url}#breadcrumb`,
  work: `${url}#work`,
  article: `${url}#article`,
});

/** The studio: a Cincinnati professional service working with clients anywhere. */
export function studioNode(lowestPrice: number): Node {
  return {
    '@type': ['ProfessionalService', 'LocalBusiness'],
    '@id': ids.studio,
    name: site.studioName,
    url: `${site.url}/`,
    email: site.email,
    // Nathan's decision (2026-10-30): keep the number exactly as site.ts has it.
    telephone: site.phone,
    description: site.tagline,
    image: `${site.url}/og-default.png`,
    logo: `${site.url}/icon-512.png`,
    // The lowest published web tier, printed as the services page prints it.
    priceRange: `${money(lowestPrice)}+`,
    founder: { '@id': ids.person },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Cincinnati',
      addressRegion: 'OH',
      addressCountry: 'US',
    },
    // Based locally; web, strategy and brand work serve clients anywhere, and
    // photography stays regional (see the per-Service areaServed on /services).
    areaServed: [
      { '@type': 'Place', name: 'Greater Cincinnati region' },
      { '@type': 'Country', name: 'United States' },
    ],
    sameAs: [site.social.instagram, site.social.linkedin],
  };
}

export function websiteNode(): Node {
  return {
    '@type': 'WebSite',
    '@id': ids.website,
    name: site.studioName,
    url: `${site.url}/`,
    inLanguage: 'en-US',
    publisher: { '@id': ids.studio },
  };
}

export function personNode(): Node {
  return {
    '@type': 'Person',
    '@id': ids.person,
    name: site.ownerName,
    jobTitle: 'Founder, designer, developer and photographer',
    url: `${site.url}/about/`,
    worksFor: { '@id': ids.studio },
    sameAs: [site.social.instagram, site.social.linkedin],
  };
}

export interface Crumb {
  name: string;
  /** Site path with its trailing slash, e.g. '/work/'. */
  path: string;
}

export function breadcrumbNode(url: string, crumbs: Crumb[]): Node {
  const trail: Crumb[] = [{ name: 'Home', path: '/' }, ...crumbs];
  return {
    '@type': 'BreadcrumbList',
    '@id': pageIds(url).breadcrumb,
    itemListElement: trail.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: new URL(c.path, site.url).toString(),
    })),
  };
}

export interface GraphInput {
  /** The page's canonical URL. */
  url: string;
  title: string;
  description: string;
  /** Crumbs after Home. Nested pages only (case studies, journal entries). */
  breadcrumbs?: Crumb[];
  /** Page-specific nodes (CreativeWork, Service, FAQPage...). */
  extra?: Node[];
  /** The lowest web tier price, for the studio's priceRange. */
  lowestPrice: number;
}

/** The whole page graph, ready for JSON.stringify. */
export function buildGraph(input: GraphInput): Node {
  const { url, title, description, breadcrumbs = [], extra = [], lowestPrice } = input;
  const p = pageIds(url);
  const webpage: Node = {
    '@type': 'WebPage',
    '@id': p.webpage,
    url,
    name: title,
    description,
    inLanguage: 'en-US',
    isPartOf: { '@id': ids.website },
    about: { '@id': ids.studio },
    ...(breadcrumbs.length ? { breadcrumb: { '@id': p.breadcrumb } } : {}),
  };
  // A page may hand in nodes that still carry their own '@context'; inside a
  // @graph only the top level needs it, so strip it.
  const cleaned = extra.map((node) => {
    const { '@context': _ctx, ...rest } = node;
    return rest;
  });
  return {
    '@context': 'https://schema.org',
    '@graph': [
      studioNode(lowestPrice),
      websiteNode(),
      personNode(),
      webpage,
      ...(breadcrumbs.length ? [breadcrumbNode(url, breadcrumbs)] : []),
      ...cleaned,
    ],
  };
}

/* ----------------------------------------------------------------------------
   Offers. Each one is read from the same pricing.ts value the page prints, so
   the structured data can never quote a different price than the page.
   ---------------------------------------------------------------------------- */

/** One Offer per web tier, at the tier's published floor. */
export function tierOffers(tiers: WebTier[]): Node[] {
  return tiers.map((t) => ({
    '@type': 'Offer',
    name: t.name,
    priceSpecification: {
      '@type': 'PriceSpecification',
      minPrice: t.priceFrom,
      priceCurrency: 'USD',
    },
  }));
}

/**
 * An Offer read from an add-on's display price: 'from $900' becomes a
 * minPrice, '$500 to $2,000' a minPrice and maxPrice.
 */
export function addOnOffer(addOn: AddOn): Node {
  const [min, max] = dollars(addOn.price);
  if (min === undefined) throw new Error(`No dollar amount in add-on price "${addOn.price}"`);
  return {
    '@type': 'Offer',
    name: addOn.name,
    priceSpecification: {
      '@type': 'PriceSpecification',
      minPrice: min,
      ...(max !== undefined ? { maxPrice: max } : {}),
      priceCurrency: 'USD',
    },
  };
}

/** One Offer per care level, priced per year or per month as the page shows it. */
export function careOffers(plans: CarePlan[]): Node[] {
  return plans.map((plan) => {
    const [price] = dollars(plan.price);
    if (price === undefined) throw new Error(`No dollar amount in care price "${plan.price}"`);
    return {
      '@type': 'Offer',
      name: plan.name,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price,
        priceCurrency: 'USD',
        // UN/CEFACT codes: ANN is a year, MON a month.
        unitCode: plan.period === '/yr' ? 'ANN' : 'MON',
      },
    };
  });
}

/** Finds an add-on by name and fails the build loudly if it was renamed. */
export function addOnNamed(addOns: AddOn[], name: string): AddOn {
  const found = addOns.find((a) => a.name === name);
  if (!found) throw new Error(`pricing.ts has no add-on named "${name}"`);
  return found;
}
