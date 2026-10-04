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
// `/journal/[slug]` is server-rendered from the CMS `posts` collection. The CI
// dataset carries one PUBLISHED test entry (`ci-test-entry`, so the list, the
// entry page and the Journal nav link render and are axe-checked) and one DRAFT
// (`ci-draft-entry`, which must never be visible). Both are written by hand in
// scripts/ci-dataset/ci-content/posts.json; production carries neither. To test
// the zero-entry state against the same code, rebuild the CI journal without them
// (NCS_CI_NO_TEST_CONTENT=1, docs/TESTING.md) and run the suites with
// JOURNAL_EMPTY=1: the entry route is then left out of the sweeps and the specs
// that care expect the empty state and no Journal link.
// `/coming-soon` is the standalone gate page (its own HTML document, not
// BaseLayout) and is always live, so it is swept too.
//
// Add a route here when a new page ships, prerendered or not.
export const caseStudySlugs = [
  'presbyterian-academy',
  'reid-design',
  'second-presbyterian-chicago',
];

export const journalSlugs = ['ci-test-entry'];
/** The CI draft entry: it exists in the CI database and must answer 404 everywhere. */
export const journalDraftSlug = 'ci-draft-entry';
/** True when the CI data was rebuilt without test content (see the header comment). */
export const journalEmpty = process.env.JOURNAL_EMPTY === '1';

export const routes = [
  '/',
  '/about',
  '/services',
  // The four search landing pages (src/lib/landingPage.ts).
  '/church-websites',
  '/nonprofit-websites',
  '/school-websites',
  '/cincinnati-event-photography',
  '/work',
  ...caseStudySlugs.map((slug) => `/work/${slug}`),
  '/journal',
  ...(journalEmpty ? [] : journalSlugs.map((slug) => `/journal/${slug}`)),
  '/photography',
  '/contact',
  '/colophon',
  '/privacy',
  '/accessibility',
  '/coming-soon',
];
