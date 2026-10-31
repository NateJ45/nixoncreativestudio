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
// First Presbyterian Church of Orangeburg is swept as well (overhaul ruling 16):
// its title is the longest client name, so it holds the 320px reflow guard on
// the case-study H1 (--text-h1-long, overflow-wrap: anywhere).
//
// /colophon/parts is the noindex check page for the shared components
// (Section, BrowserFrame, FramePair, Media; overhaul package 1.8). It is swept
// like any page, so axe in both themes, reflow at 320 and first-viewport cover
// every part.
//
// Add a route here when a new PRERENDERED page ships.
export const routes = [
  '/',
  '/about',
  '/services',
  '/work',
  '/work/stone-steps-50k',
  '/work/first-presbyterian-orangeburg',
  '/journal',
  '/photography',
  '/contact',
  '/colophon',
  '/colophon/parts',
  '/privacy',
  '/accessibility',
  '/coming-soon',
];
