/* ============================================================================
   structuredData
   ============================================================================
   Safe to edit.

   The studio's Organization + LocalBusiness JSON-LD, built from Site settings.
   StructuredData.astro renders it on every page (with per-page schemas after
   it). Kept here, free of Astro, so the unit tests (structuredData.test.ts) can
   check the exact shape.

   Every value is real (redesign 2026, E's SEO audit asked for logo, image,
   priceRange and geo):
   - logo: the official navy wordmark, public/brand/logo-navy.png (copied from
     docs/redesign-2026/brand/, 1423 x 361).
   - image: the default social card, public/og-default.png (1200 x 630).
   - priceRange: Site settings "price_range" (optional; left out when empty).
   - geo: the coordinates of Cincinnati itself (39.1031 N, 84.5120 W). The studio
     publishes a city, not a street address, so the point is the city's, which
     matches the PostalAddress below.
   ============================================================================ */

/** The Site settings values the schema needs (a subset of `Site` in src/data/site.ts). */
export interface OrgSite {
  studioName: string;
  ownerName: string;
  url: string;
  email: string;
  phone: string;
  tagline: string;
  social: { instagram: string; linkedin: string };
  priceRange: string;
}

/** Public paths of the two images (served from public/). */
export const LOGO_PATH = '/brand/logo-navy.png';
export const IMAGE_PATH = '/og-default.png';

/** Cincinnati, OH (city centre). */
export const CINCINNATI_GEO = { latitude: 39.1031, longitude: -84.512 } as const;

export function buildOrganizationSchema(site: OrgSite): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'LocalBusiness'],
    '@id': `${site.url}#organization`,
    name: site.studioName,
    url: site.url,
    logo: `${site.url}${LOGO_PATH}`,
    image: `${site.url}${IMAGE_PATH}`,
    email: site.email,
    telephone: site.phone,
    ...(site.priceRange ? { priceRange: site.priceRange } : {}),
    founder: { '@type': 'Person', name: site.ownerName },
    description: site.tagline,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Cincinnati',
      addressRegion: 'OH',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: CINCINNATI_GEO.latitude,
      longitude: CINCINNATI_GEO.longitude,
    },
    // Based locally, but web/strategy/brand work serves clients nationally; the
    // region Place plus the country signals both (photography stays regional, see
    // the per-Service areaServed on /services).
    areaServed: [
      { '@type': 'Place', name: 'Greater Cincinnati region' },
      { '@type': 'Country', name: 'United States' },
    ],
    sameAs: [site.social.instagram, site.social.linkedin],
  };
}
