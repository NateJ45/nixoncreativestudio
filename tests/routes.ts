// Every public route on the site: the single source of truth for the sweeps.
//
// The site is a HYBRID. These routes are reached over HTTP at
// PLAYWRIGHT_BASE_URL (see playwright.config.ts), never from dist/client, so
// prerendered and server-rendered pages sit in one list:
//   - SERVER-RENDERED from EmDash: '/', '/about', '/services', '/work' and every
//     '/work/<slug>' (plus /rss.xml, which is XML and so is not swept here).
//   - PRERENDERED: everything else.
//
// All nine published case studies are listed, not one standing in for the
// template: with the content in a CMS, a single entry's malformed field (a
// missing cover, an empty highlight row) breaks one page and not the others, and
// the sweeps are the only thing that would catch it. The slugs are the entries
// in the EmDash `case_studies` collection (docs/EMDASH-SCHEMA.md). Add a line
// when a case study is published; the nine pages cost about a second each per
// sweep.
//
// `/journal/[slug]` builds no pages until the first entry lands in
// src/content/journal; add one here when it does. `/coming-soon` is the
// standalone gate page (its own HTML document, not BaseLayout) and is always
// live, so it is swept too.
//
// Add a route here when a new page ships, prerendered or not.
export const caseStudySlugs = [
  'first-baptist-muncie',
  'first-presbyterian-orangeburg',
  'foundation-for-reformed-theology',
  'mas-monograms',
  'presbyterian-academy',
  'reid-design',
  'second-presbyterian-chicago',
  'stone-steps-50k',
  'theology-matters',
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
