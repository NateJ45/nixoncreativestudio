// Every public, PRERENDERED route on the site: the single source of truth for
// the sweeps. The suites serve the static `dist/client`, so only build-time HTML
// pages belong here. This site is fully static (output: 'static', nothing opts
// out with prerender = false), so that is every page it has.
//
// One case study stands in for all ten (`/work/[slug]` share one template),
// the same choice lighthouserc.json makes. `/journal/[slug]` builds no pages
// until the first entry lands in src/content/journal; add one here when it
// does. `/coming-soon` is the standalone gate page (its own HTML document, not
// BaseLayout) and is always live, so it is swept too.
//
// Add a route here when a new PRERENDERED page ships.
export const routes = [
  '/',
  '/about',
  '/services',
  '/work',
  '/work/second-presbyterian-chicago',
  '/journal',
  '/photography',
  '/contact',
  '/colophon',
  '/privacy',
  '/accessibility',
  '/coming-soon',
];
