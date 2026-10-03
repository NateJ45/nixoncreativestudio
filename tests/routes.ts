// Every public route on the site: the single source of truth for the sweeps.
//
// The site is a HYBRID. These routes are reached over HTTP at
// PLAYWRIGHT_BASE_URL (see playwright.config.ts), never from dist/client, so
// prerendered and server-rendered pages sit in one list:
//   - SERVER-RENDERED from EmDash: '/', '/about', '/services', '/work' and every
//     '/work/<slug>' (plus /rss.xml, which is XML and so is not swept here).
//   - PRERENDERED: everything else.
//
// REDUCED CI SAMPLE. CI runs against the small `ncs-ci` dataset (the `ci`
// environment in wrangler.jsonc), which holds only the three case studies below,
// copied from the original nine so each shape of entry is covered: Reid Design
// (no highlights, no before/after), Presbyterian Academy (highlights, no
// before/after) and Second Presbyterian (highlights plus before/after). The
// production site carries all nine (docs/EMDASH-SCHEMA.md), so a sweep pointed at
// production by hand will 404 on nothing but will not exercise the other six.
// When you add a case study to the CI dataset (docs/TESTING.md), add its slug
// here; when you publish one in production only, no change is needed.
//
// `/journal/[slug]` builds no pages until the first entry lands in
// src/content/journal; add one here when it does. `/coming-soon` is the
// standalone gate page (its own HTML document, not BaseLayout) and is always
// live, so it is swept too.
//
// Add a route here when a new page ships, prerendered or not.
export const caseStudySlugs = [
  'presbyterian-academy',
  'reid-design',
  'second-presbyterian-chicago',
];

export const routes = [
  '/',
  '/about',
  '/services',
  '/work',
  ...caseStudySlugs.map((slug) => `/work/${slug}`),
  '/journal',
  '/photography',
  '/contact',
  '/colophon',
  '/privacy',
  '/accessibility',
  '/coming-soon',
];
