// Every public, PRERENDERED route on the site: the single source of truth for
// the sweeps. The suites serve the static `dist/client`, so only build-time HTML
// pages belong here. This site is fully static (output: 'static', nothing opts
// out with prerender = false), so that is every page it has.
//
// One case study stands in for all of them (`/work/[slug]` share one template),
// the same choice lighthouserc.json makes. `/journal/[slug]` builds no pages
// until the first entry lands in src/content/journal; add one here when it
// does. `/coming-soon` is the standalone gate page (its own HTML document, not
// BaseLayout) and is always live, so it is swept too.
//
// First Presbyterian Church of Orangeburg is swept as well: its title is the
// longest client name, so it holds the 320px reflow guard on the case-study H1.
//
// /churches is the first sector page (src/data/sector-pages.ts); /schools,
// /nonprofits and /small-business are the lean ones. Add each new sector page here
// too. /one-page is the forwardable summary, with its own print stylesheet.
//
// Add a route here when a new PRERENDERED page ships.
export const routes = [
  '/',
  '/about',
  '/now',
  '/services',
  '/work',
  '/work/stone-steps-50k',
  '/work/first-presbyterian-orangeburg',
  '/churches',
  '/schools',
  '/nonprofits',
  '/small-business',
  '/one-page',
  '/journal',
  '/photography',
  '/contact',
  '/colophon',
  '/privacy',
  '/accessibility',
  '/coming-soon',
];
