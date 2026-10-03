# TESTING.md

A map of which gate covers what, so nobody writes a fifth suite that duplicates
the third. Created 2026-08-27 during the PORTS.md sync session (Card 15).

Registry, not a changelog: when a suite changes, edit the row.

---

## What runs, and where

Brought up to the family test standard on 2026-09-06 (WCP is the reference
implementation; reid-design-site and mas-monograms carry the same shape).

**Every page is server-rendered (EmDash migration, fully since CMS-DESIGN PR 2).**
Pages are rendered from D1 + R2 by the Worker, so `dist/client` holds only assets
and nothing here can serve the site statically. A route cache (Cloudflare Workers
Cache) sits in front of the Worker; on a fresh preview the first request per URL is
a `Cf-Cache-Status: MISS` (a render) and later ones are `HIT`s, so a test or audit
that needs the uncached worst case adds a fresh query string each time (the key includes it, so `?x=<random>` is always a MISS).
Playwright, the link check and Lighthouse run against a **URL**: in CI, the Worker
version preview that `ci.yml` uploads (not promoted); by hand, the `ncs-ci` Worker (`https://ncs-ci.nathanjnixon86.workers.dev`).
See CLAUDE.md Gotcha 12.

| Gate       | Command                                                 | Runs in CI                 | Covers                                                                                                                                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type check | `npx astro check`                                       | `ci.yml` (static job)      | TypeScript across `.astro`, `.ts`, `.tsx`                                                                                                                                                                                                                                                                             |
| Lint       | `npm run lint`                                          | `ci.yml` (static job)      | ESLint over `src` and `scripts`. A hard gate since 2026-09-06 (see below)                                                                                                                                                                                                                                             |
| Format     | `npm run format:check`                                  | `ci.yml` (static job)      | `prettier --check .` with the family `.prettierrc` (astro + tailwind plugins)                                                                                                                                                                                                                                         |
| Unit tests | `npm run test:unit`                                     | `ci.yml` (static job)      | `src/lib/*.test.ts` (see below)                                                                                                                                                                                                                                                                                       |
| Build      | `npm run build`                                         | `ci.yml` (site job)        | The whole site compiles (nothing is prerendered; pages render per request); every content-collection entry resolves; image and OG generation succeed                                                                                                                                                                  |
| Preview    | (CI only)                                               | `ci.yml`, `lighthouse.yml` | Uploads the built Worker as a non-promoted version with a preview alias; the three gates below test that URL. Skipped with a warning without the Cloudflare secrets                                                                                                                                                   |
| Link check | `LINKCHECK_URL=<url> npm run check:links`               | `ci.yml` (site job)        | linkinator over the preview URL: every internal link resolves and, since CMS-DESIGN PR 10, every `#fragment` finds its element (`--check-fragments`; about 190 links on the three-case-study CI dataset; off-site URLs are skipped). Falls back to `dist/client` (no HTML now, so it finds almost nothing) when unset |
| Playwright | `PLAYWRIGHT_BASE_URL=<url> npm test`                    | `ci.yml` (e2e, 3 shards)   | smoke (incl. a real 404 for an unknown case study), axe light, axe dark + focus indicators, reduced-motion settle, reflow at 320/768/1024/1440, on chromium and a WebKit iPhone, over 21 routes (see below)                                                                                                           |
| Lighthouse | `npx lhci autorun --config=lighthouserc.generated.json` | `lighthouse.yml`           | Accessibility (hard gate at 100), LCP under 4.5s and CLS under 0.1 (hard gates), performance / best-practices / SEO / byte weight as warnings, over 13 URLs on the preview (11, one per template, on pull requests, and only when a score-moving path changed; full list on main and weekly)                          |
| Parity     | `npm run parity compare`                                | **no** (by design)         | Rendered-HTML drift against a committed baseline                                                                                                                                                                                                                                                                      |
| Uptime     | -                                                       | `uptime.yml`, hourly       | The live site's key routes still return 200                                                                                                                                                                                                                                                                           |

CI shape (starter PORTS.md card 70): `ci.yml` runs `static` and `site` in parallel, then `e2e` in 3 Playwright shards against the preview `site` uploaded. The required checks `build` and `test` are aggregators over those jobs.

`npm run check` is the quick local gate: `astro check && npm run lint`.
`npm run check:full` adds the unit tests and the build. `npm test` runs the
Playwright suites against `PLAYWRIGHT_BASE_URL` (it throws a clear message when
unset); `npm run test:ui` opens the Playwright UI.

### Playwright (`playwright.config.ts`, `tests/`)

Runs against a deployed build at `PLAYWRIGHT_BASE_URL`, never `astro dev` and
no longer a static `dist/client` server (`playwright.config.ts` has no
webServer). CI sets the variable to the Worker version preview; the fast local
loop is:

```
PLAYWRIGHT_BASE_URL=https://ncs-ci.nathanjnixon86.workers.dev npx playwright test --project=chromium
```

Tests only GET pages, but they hit the Worker's real D1/R2 bindings (the small `ncs-ci` dataset in CI), so avoid running the
full sweeps against a Worker whose data is mid-edit. A local `wrangler dev` was
tried as a stand-in and rejected: it starts with an empty local D1/R2, so every
server page renders without content (and `--remote` would read production
bindings, which a test run should not). CI installs chromium and webkit and runs both projects.

| File                     | Covers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes.ts`              | The route list every sweep iterates: every page (all server-rendered), with the three case studies of the reduced `ncs-ci` CI sample listed individually (CMS content can break one page and not its siblings; production has nine). Add a route when a page ships or a case study is added to the CI dataset                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `helpers.ts`             | `settle()`: fonts ready, transitions killed, every `[data-reveal]` forced visible, so axe and the reflow measure see the finished page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `smoke.spec.ts`          | Every route returns 200 and its title carries the studio name; **CMS-DESIGN PR 4:** every route except `/coming-soon` has the header menu links (Work, Services, About), the "Start a project" button and the footer email link (read from attributes, so the mobile profile checks the same markup); an unknown `/work/<slug>/` returns a real 404 with the not-found title                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `a11y.spec.ts`           | axe-core default rule set (WCAG 2.x A/AA + best practices + `target-size`) on every route, zero violations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `a11y-dark.spec.ts`      | The same sweep with `localStorage["ncs-theme"] = "dark"` seeded before the anti-FOUC bootstrap runs, plus a check that every `/contact` field shows a focus indicator in dark mode                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `reduced-motion.spec.ts` | PORTABLE (starter PORTS.md card 61, 2026-09-30). With `reducedMotion: 'reduce'`, every route has no `running` animation 2.5s after load. Catches WebKit stranding 0.01ms transitions (globals.css reset now uses `0s` transitions)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `pricing.spec.ts`        | **CMS-DESIGN PR 5.** With JavaScript off, every tier price on `/` and `/services/` is the real CMS number as static text and equals its `data-countup-to` (the no-JS count-up check), the add-on prices render, and the Web design JSON-LD floor equals the first tier price. Chromium only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `home-copy.spec.ts`      | **CMS-DESIGN PR 6.** With JavaScript off, the `/` hero is server-rendered with the `page_home` words (the headline lead and the coloured accent as two spans, positioning, proof line and link, both buttons and their fixed hrefs), the section headings, the four "every build includes" lines and the four numbered process steps match, `/services/` shows the same steps, the hero copy sits under no `[data-reveal]` ancestor (the LCP rule), and the page has a real meta description. Chromium only                                                                                                                                                                                                                                                                                                                                                                                                     |
| `services-copy.spec.ts`  | **CMS-DESIGN PR 7.** With JavaScript off, `/services/` is server-rendered with the `page_services` and `service_offerings` words (headline, section headings, the FAQ rows, the four reasons, each chapter's title, paragraph and lines, the Web design screenshot against the two placeholder panels), and its Service and FAQPage JSON-LD equals the same content files (Strategy and Photography floors from their entries, Web design's from the first tier); title and meta description come from the entry. The expected text is read from `cms/content/*.json`.                                                                                                                                                                                                                                                                                                                                          |
| `about-copy.spec.ts`     | **CMS-DESIGN PR 8.** With JavaScript off, `/about/` is server-rendered with the `page_about` words (headline, thesis, the four story paragraphs, principles, the Currently lists and freshness pill, the four Lighthouse numbers) and the Person JSON-LD matches the entry. The acceptance gate: the headshot and every photo have alt text, load through `/_image`, and a GET of each answers `content-type: image/webp`. Passes on both the fallback and the CMS path.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `contact-copy.spec.ts`   | **CMS-DESIGN PR 9.** With JavaScript off, `/contact/` is server-rendered with the `page_contact` words (headline, intro, next steps) and each option of the Budget, Timeline and How-did-you-hear selects has a value equal to its visible label. With JavaScript on, every request to `api.web3forms.com/submit` is intercepted with `page.route()` (nothing is ever sent, no key is needed) and the multipart payload is asserted: labels in `budget`, `timeline` and `heard_from`, the code in `org_type`, an empty honeypot; a filled honeypot sends nothing; a blank budget blocks the submit; the form still binds after a View Transitions navigation; an old draft holding a code is ignored while a saved label is restored. Chromium only.                                                                                                                                                            |
| `prose-pages.spec.ts`    | **CMS-DESIGN PR 10.** With JavaScript off, every old anchor (typed into the test, not read from the JSON: privacy 6, accessibility 5 including `#how-its-checked`, `#where-it-stops`, `#report`) is an `h2` with a matching "On this page" link; the headings and list entries are the `pages.json` words in order; every list link resolves to an element; the colophon rows are the CMS words plus the computed "Last built" month and no longer claim static HTML; external links open in a new tab with `rel="noopener noreferrer"` and the email link does not. With JavaScript on, the scroll-spy binds on a direct load and after a client-side navigation from the footer and marks the section being read.                                                                                                                                                                                             |
| `index-pages.spec.ts`    | **CMS-DESIGN PR 11.** `/work/` shows the `page_work` words with the computed project count in front of the intro, and the sector chips (the `WorkFilter` island) still hide and restore cards; `/photography/` shows the `page_photography` words, only the group that has the CI test photo, the gallery with width-only `/_image` URLs (no `h=`), a real `image/webp` answer, the full-screen viewer opening and closing, and no "In progress" note; the hydrated gallery and the open viewer pass axe in light and dark (the shared sweeps only see the un-hydrated page); `/journal/` shows the `page_journal` words and the empty-state card; an unknown URL answers a REAL 404 with the `page_not_found` words and links, and `/404/` by name answers 200. The zero-photo page cannot be asserted here while the CI test photo exists: it is proved by the parity run and `photos.test.ts`. Chromium only |
| `journal.spec.ts`        | **CMS-DESIGN PR 12.** The published CI entry (`ci-test-entry`) renders its heading, h2 and h3 with ids, list, quote, tag in both places, code box (a focusable `<pre>` with no leading whitespace), resized WebP cover, `og:image` card path and Article JSON-LD; the Journal link is in the header and footer; the DRAFT (`ci-draft-entry`) is a 404 at its own address (with and without the slash) and its slug and text are absent from `/journal/`, `/rss.xml` and `/sitemap-posts.xml`; `/rss.xml` lists the entry beside the case studies; `/sitemap-posts.xml` is valid XML with trailing slashes (and an empty `<urlset>` with `JOURNAL_EMPTY=1`); `sitemap-index.xml` lists it. Skipped for the entry itself with `JOURNAL_EMPTY=1`                                                                                                                                                                   |
| `redirects-hero.spec.ts` | **CMS-DESIGN PR 13.** `/now` ends at `/about/#now` through permanent redirects and lands on the About page, the retired `/work/west-chester-preschool/` answers 301 to `/work/`, an unknown slug still answers a real 404; the hero scene renders at least one site with one address-bar host per slide and a phone slide for each, and on the CMS path every resized image URL is width-only (no `h=`) while the bundled fallback keeps its five hosts. The redirects are EmDash rows only (no code fallback), so the CI dataset must hold them. Chromium only                                                                                                                                                                                                                                                                                                                                                 |
| `reflow.spec.ts`         | No horizontal overflow at 320px (WCAG 1.4.10) and at 1440/1024/768                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

The webkit-iphone project runs smoke, both axe sweeps and reduced-motion; reflow drives its
own viewport widths, so it is chromium-only. `/coming-soon` is a standalone
document without the theme bootstrap, so the dark sweep skips it.

First run (2026-09-06) found one real bug: `/about` was 342px wide at 320px
because the Terminal's nowrap window title set the min-content of its grid
item. Fixed with `min-w-0` on the item.

### Unit tests (`node --experimental-strip-types --test src/lib/*.test.ts`)

Node's built-in runner, no framework. TypeScript runs through Node's type
stripping, so there is nothing to configure and nothing to install.

| File                       | Covers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `utils.test.ts`            | `cn()` class merging: clsx syntax forms, tailwind-merge conflict resolution, falsy handling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `readingTime.test.ts`      | Journal reading-time estimation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `coverPlaceholder.test.ts` | The generated blur-placeholder lookup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `cms.test.ts`              | **CMS-DESIGN PR 3.** `src/lib/cms.ts` and `cmsFallback.ts`: 0/1 booleans, empty repeaters, a missing entry or a D1 error falling back to the committed JSON, cache tagging, list ordering, menus                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `cmsSchema.test.ts`        | The generic schema applier against an in-memory fake of the EmDash REST API (idempotent rerun makes no writes, create-then-update order, dry run), `validateDef`, and every file in `cms/schema/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `tidyAdmin.test.ts`        | **CMS-DESIGN PR 14.** `npm run cms:tidy` against an in-memory EmDash: an empty `category` taxonomy is deleted once and a rerun changes nothing, a dry run writes nothing, a taxonomy with terms is kept, the taxonomies the site reads are never touched. `cmsSchema.test.ts` also holds the PR 14 gate: every collection has the `urlPattern` its public page needs, the sidebar order follows the design, and adding `urlPattern` and `sortOrder` to an existing collection applies once and re-checks `unchanged`.                                                                                                                                                                                                    |
| `cmsLoad.test.ts`          | The content loader (`$file` images, create/update/unchanged/publish, menus, redirects), the production guard, and every file in `cms/content/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `productionLoad.test.ts`   | `npm run cms:production-load` orchestration with fakes: plan order from the files on disk, `--only` / `--from`, dry run then apply then read-only re-check, stop on a non-`unchanged` re-check or a non-zero exit, stop before writing on an overwrite or removal, skip of already-loaded steps, the Enter pause after `site_settings` and `menus`, `pages` allowed to update fields, token scrubbing, and the classifiers against the loaders' real output                                                                                                                                                                                                                                                              |
| `site.test.ts`             | **CMS-DESIGN PR 4.** `getSite()` and the menus: the committed fallback equals the values the old `site.ts` held, CMS and fallback read paths (missing entry, D1 error, thrown read, blank required field), one read per request, menu fallback and override                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `pricing.test.ts`          | **CMS-DESIGN PR 5.** `getPricingTiers()` and `getAddOns()`: the committed fallback equals the values the old `src/data/pricing.ts` held (care plan from $100/mo), empty collection, D1 error and blank-field fallbacks, `sort_order` ordering and the 3-slot limit, one anchor tier, whole-number prices for the static count-up text                                                                                                                                                                                                                                                                                                                                                                                    |
| `homePage.test.ts`         | **CMS-DESIGN PR 6.** `getHomePage()`: the committed fallback equals the words the hero and the three sections used to hold, missing-entry, D1-error and blank-field fallbacks, a short process or includes list falling back, the CMS path, step numbers counted from order (extra rows dropped, blank rows skipped), one read per request, the title helper                                                                                                                                                                                                                                                                                                                                                             |
| `servicesPage.test.ts`     | **CMS-DESIGN PR 7.** `getServicesPage()` and `getServiceOfferings()`: the fallback equals the words and offerings `services.astro` used to hold, the Service and FAQPage JSON-LD built from the fallback AND from the CMS path is byte-equal to the golden file captured from `main`, an FAQ or price edit changes the JSON-LD, area-served and price rules, missing-entry, D1-error, empty-list and short-list fallbacks, ordering, cut lists, the title helper.                                                                                                                                                                                                                                                        |
| `aboutPage.test.ts`        | **CMS-DESIGN PR 8.** `getAboutPage()`: the fallback equals the words about.astro held and keeps pointing at the bundled pictures; the CMS path agrees word for word; the picture rules (no description drops a photo, fewer than three falls back, headshot falls back to the bundled one); the quarterly Currently edit (new lists, date, freshness, caps, unknown status, emptied list); the Person JSON-LD is byte-equal to the page before. `portableText.test.ts` also covers `blockHtml()`, and `ciFixtures.test.ts` covers `$file` images becoming media rows and `cms-media.json` being current.                                                                                                                 |
| `contactPage.test.ts`      | **CMS-DESIGN PR 9.** `getContactPage()`: the fallback equals the words and the three option lists contact.astro held (as labels); the CMS path built from the same JSON equals the fallback path; the first budget bracket starts at the lowest pricing tier and every tier floor appears in a bracket (reads `pricing_tiers.json`); rows are trimmed, de-duplicated and cut at the layout limits; a missing entry, a D1 error, a blank required field or a one-choice list serves the committed copy whole.                                                                                                                                                                                                             |
| `prosePage.test.ts`        | **CMS-DESIGN PR 10.** `getProsePage()`: the fallback is the prose privacy, accessibility and colophon held (titles, headings, ids, the email link markup, the code mark, the five-item tick list, the six colophon rows); the CMS path built from the same JSON equals the fallback path; an edited heading changes its id and list entry; the three legacy anchors hold only while the heading text does; a missing entry, a D1 error, an old template stub, a blank headline, an empty body and empty rows all serve the fallback whole; `buildSections()` rules (preamble, Heading 3, list grouping, duplicate ids, unsafe links, images). `portableText.test.ts` covers the new `code` mark and `blockHtml` options. |
| `indexPages.test.ts`       | **CMS-DESIGN PR 11.** `getWorkPage()`, `getPhotographyPage()`, `getJournalPage()` and `getNotFoundPage()`: each fallback equals the words the page held (literals copied from the `.astro` files on `main`), the CMS path built from the same JSON equals the fallback path, an edit shows, a missing entry, a D1 error or a blank required field serves the fallback, the not-found links keep internal paths only (`//host`, `https://` and bad rows dropped, capped at three) and an entry with no usable link falls back, the title helper                                                                                                                                                                           |
| `photos.test.ts`           | **CMS-DESIGN PR 11.** `getPhotos()` and the gallery helpers: an empty collection, a read error and a missing table all read as no photos (nothing to group, no hero), a photo without a description, picture, stored size or valid group is dropped without taking the others down, ordering (Order number, then year, then slug), groups in fixed order with empty ones hidden, the hero pick, and width-only resizer URLs that never carry a height (a 5000 px tall photo included) and never ask for more than the original's width                                                                                                                                                                                   |
| `journal.test.ts`          | **CMS-DESIGN PR 12.** `getJournalEntries()`, `getJournalEntry()` and `hasJournalEntries()`: zero entries, a read error, a thrown error and a missing table all read as an empty journal (logged); an entry with no title or summary is dropped; newest first; cache tags are added when the route cache is on; the menu answer is read once per request; the studio-time date format                                                                                                                                                                                                                                                                                                                                     |
| `journalBody.test.ts`      | **CMS-DESIGN PR 12.** `renderJournalBody()`: paragraphs, h2 and h3 with ids, merged quotes, flat and nested lists, marks, safe links, the code box (focusable, escaped, no whitespace inside the `<pre>`, a hostile language never becomes a class), and that pictures, tables and unknown nodes render nothing                                                                                                                                                                                                                                                                                                                                                                                                          |
| `heroSites.test.ts`        | **CMS-DESIGN PR 13.** `selectHeroStudies()`: only `in_hero` entries with BOTH captures and a usable live URL qualify, `hero_order` ascending with unnumbered last and ties newest first, an empty result (production before the data load) so the caller falls back, and the resizer URLs being width-only (never a height, the 4096 px limit)                                                                                                                                                                                                                                                                                                                                                                           |
| `cmsContent.test.ts`       | Every `cms/content/<collection>.json` satisfies its `cms/schema/<collection>.mjs` (required, maxLength, pattern, select options, repeater item counts), and `menus.json` is well formed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `ciFixtures.test.ts`       | The generated CMS part of `seed/seed.json` and `scripts/ci-dataset/cms-rows.sql` are current (re-run `node scripts/ci-dataset/cms-fixtures.mjs` after editing `cms/`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `portableText.test.ts`     | The restricted Portable Text pass (headings, marks, links, lists) and heading ids                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `theme-tokens.test.ts`     | **Added 2026-08-27.** WCAG contrast of every rendered token pair in `globals.css`, light and dark                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

`theme-tokens.test.ts` is the application of `src/lib/contrast.ts` (PORTS.md
Card 9). It parses the real hex out of the `@theme`, `:root` and `.dark` blocks,
asserts text pairs at 4.5:1 and focus-ring / control-edge pairs at 3:1, and
additionally asserts that the `@theme` literals still mirror their `:root`
twins so the palette documentation cannot quietly go stale. Its header comment
lists every deliberate non-assertion and why. 85 assertions pass as of
2026-08-27; the gate was proved to bite by temporarily lightening
`--muted-foreground`, which produced 4 failures.

**Why it exists next to Lighthouse:** axe (which is what Lighthouse's
accessibility category runs) audits the resting DOM and has **no rule** for
focus-indicator or custom-border contrast, and it only ever sees one theme per
run. The accessibility score can sit at 100 while a focus ring is invisible.
That is not hypothetical - it shipped that way in the WCP repo.

### Parity harness (`npm run parity`)

PORTS.md Card 3, installed 2026-08-27. `capture` snapshots every built page's
normalized HTML into `scripts/.parity/`; `compare` diffs a later build against
it. Neither mode builds - you build, it reads `dist/client`. With `--url <base>`
it fetches rendered HTML over HTTP instead, which is the only way to compare the
server-rendered pages (page list = the committed snapshot names plus
`--routes /a/,/b/`). The baselines predate the hybrid site and have not been
re-captured, so a URL compare of a migrated page is expected to DIFF.

**For CMS PRs** (docs/CMS-DESIGN.md 2.1): capture and compare into a throwaway directory with `--snap-dir .parity-cms` (or `PARITY_SNAP_DIR`), so the pair never overwrites the committed baselines. Capture `main` on `ncs-ci`, compare the PR preview the same day: `npm run parity capture -- --snap-dir .parity-cms --url https://ncs-ci.nathanjnixon86.workers.dev --routes /,/services/` then `npm run parity compare -- --snap-dir .parity-cms --url <PR preview URL> --routes /,/services/`. The directory is git-ignored.

Use it for any change that is **supposed** to be render-neutral: extracting a
component, reordering imports, swapping a wrapper, bumping a dependency. It is
not a general test suite and is deliberately **not** in CI: its baselines are
intentionally moved whenever markup legitimately changes, and a gate that is
expected to be re-baselined is a gate that gets rubber-stamped.

```
npm run build
npm run parity capture      # baseline, commit scripts/.parity/*.html
...change something...
npm run build
npm run parity compare      # 23/23 PASS, or a unified diff per page
```

23 routes are auto-discovered. Determinism was measured on install across a
warm rebuild and a cold rebuild (`dist`, `.astro` and `node_modules/.astro`
deleted): 23/23 PASS both times, with **no** site-specific normalizer rules
needed despite the three.js / react-three-fiber content. The evidence is
recorded in the script's header so nobody adds a speculative rule later.

### Lighthouse (`lighthouserc.json`)

The URL list is explicit on purpose. With auto-discovery lhci caps at 5, so it
was testing a near-random 5 of 22 including the `/404` page and the Search
Console verification stub, which dragged accessibility below 100. The reasoning
is written out at the top of `lighthouserc.json`; read it before touching that
list.

`lighthouserc.json` is now a template: its URLs start with `${LHCI_BASE_URL}`
(lhci does not expand environment variables), and `scripts/lhci-config.mjs`
writes the git-ignored `lighthouserc.generated.json` with the preview URL filled
in. The thresholds, the 3-run median and the gates are unchanged. `/404.html`
became `/404/`: `src/worker.ts` answers the not-found page with status 200 when
it is requested by that exact path, while a real unknown URL answers 404, which
Lighthouse refuses to audit.

The route cache changes what the 3-run median means: the first run against a
fresh preview is a MISS (cold isolate plus D1 reads) and the next two are HITs, so
the median is the cached page, which is what visitors get. Measured on ncs-ci
(2026-10-03, Lighthouse CLI mobile, same machine before and after): homepage LCP
median 3.5s before and 3.2s after (6 runs each), case study 3.9s before and 3.8s
after, `/privacy/` 2.0s before and 1.5 to 2.0s after, `/about/` 3.3s before and
2.1 to 2.3s after.

One case study stands in for the rest, since they share a layout (the
Playwright sweeps list every case study in the CI sample; Lighthouse does not, because each audit costs
three runs); `/coming-soon` is its own standalone template and is listed too.

The workflow runs on pushes to `main` and on pull requests, so a PR proves the
gate green before anything reaches main.

**This gate cannot be run locally on Nathan's Windows machine.** `npx lhci
autorun` dies during Chrome-profile cleanup with an `EPERM` on its own temp
directory, at collect time, before any assertion is evaluated. Reproduced twice
on 2026-08-27. See Gotcha 9 in `CLAUDE.md`. Trust the CI run.

### Uptime (`.github/workflows/uptime.yml`)

Hourly curl of 7 routes plus one redirect-shape check. Gated on the `SITE_URL`
repo variable, which is **not set yet** - see `docs/PENDING.md`. Schedule is ON
because the repo is public and Actions minutes are free there.

Best-effort only: GitHub's scheduler can be delayed under load. For real
monitoring, point UptimeRobot's free tier at the homepage.

---

## Deliberate absences

- **No console-error smoke pass.** There is significant client JS here
  (three.js / r3f, Lenis, Embla, motion) and nothing asserts that a page
  hydrates without throwing. The family standard does not include one either;
  add it here first if it ever becomes a family suite.
- **No visual-regression / screenshot suite.** The family standard runs one
  only where a site has a fixture-driven `/styleguide` route (WCP does; this
  site does not). CMS- or content-driven pages change with content and flake,
  and a canvas-heavy site is a bad candidate for screenshot diffing anyway.
  The parity harness covers markup drift.
- **No Sanity anything.** No dataset, no Studio, no generated types, so no
  typegen step, no stale-types CI guard, and no backup workflow. Content lives
  in Astro content collections and MDX. See `docs/PENDING.md`.
- **Lint is a hard gate now (2026-09-06), and must stay at 0 errors.** The
  `eslint-plugin-astro` false positive that kept it advisory (an HTML comment
  inside a `{ ... }` expression read as a JSX fragment error) is gone: those
  comments are JSX comments (`{/* */}`) now, which the plugin, prettier, and
  the Astro compiler all agree on. Keep it that way: inside a template
  expression, comment with `{/* */}`, not `<!-- -->`. The remaining output is
  a handful of unused-variable warnings, which do not fail the run.
- **`prettier-plugin-astro` cannot parse a `<script>` inside a template
  expression** (`{cond && (<script>...</script>)}`), so none of the templates
  use that pattern any more: a conditional script goes in its own component
  and the condition wraps the component (see `ComingSoonGate.astro` and
  `src/components/analytics/`). Reintroducing the pattern breaks
  `npm run format:check`.

## The `ncs-ci` dataset (CI previews)

CI previews do not read production and no longer read the old trial instance. The
`ci` environment in `wrangler.jsonc` binds a small dedicated set of Cloudflare
resources, created 2026-10-03:

| Thing  | Name / id                                                                |
| ------ | ------------------------------------------------------------------------ |
| Worker | `ncs-ci` (`https://ncs-ci.nathanjnixon86.workers.dev`)                   |
| D1     | `ncs-ci`, `ab647734-85f6-495c-87f5-e959d8ff1fd4`, binding `DB`           |
| R2     | `ncs-ci-media`, binding `MEDIA` (15 objects, about 16 MB)                |
| KV     | `ncs-ci-sessions`, `39bc831dbb7142d3891b9afeda2de2a2`, binding `SESSION` |

It holds three case studies, copied from the original nine so each shape of entry
is exercised: `reid-design` (no highlights, no before/after),
`presbyterian-academy` (highlights) and `second-presbyterian-chicago` (highlights
plus before/after). All three are marked featured so the homepage Selected Work
strip fills. `tests/routes.ts` lists exactly these slugs. The site title, tagline
and setup flags are set; there is no admin user, so `/_emdash/admin` is not usable
on this instance, by design (nothing needs to be edited there).

**How it is built, and how to refresh it.** The dataset is reproducible from
scripts, not hand-copied SQL (`scripts/ci-dataset/`, see its README). A committed
snapshot of production content (`rows.sql`, `media.json`, written by
`npm run ci-dataset:snapshot` from the `emdash` CLI login, read-only) is applied
to the CI resources by `npm run ci-dataset`: `rows.sql` and `fixtures.sql` into D1,
then every file in `media.json` copied into `ncs-ci-media` from the live site's
public media URLs (size and SHA-1 checked), then a verify pass through the CI
Worker. It is idempotent, so a refresh can be repeated at any time and leaves the
suites green. `npm run ci-dataset -- --from-scratch` drops every table, builds and
deploys the `ci` Worker, lets EmDash migrate and apply `seed/seed.json`, and
reloads the snapshot; use it after a seed change (a new collection or field). While
it runs the CI previews have no data, so do not start it mid-PR. Nothing in these
scripts can write to production, and the snapshot is committed, so CI renders
pinned content: Nathan's edits in the production admin never reach it.

**CMS collections and menus in CI (PR 4 onwards).** `ncs-ci` has no admin user, so
the data the site now reads from the CMS (`site_settings`, the `primary` and
`footer` menus, and the collections later PRs add) is built from the committed
sources, not from production: `node scripts/ci-dataset/cms-fixtures.mjs` writes the
collection and menu definitions into `seed/seed.json` (applied by `--from-scratch`)
and the entries into `scripts/ci-dataset/cms-rows.sql` (applied by every refresh,
after `rows.sql` and `fixtures.sql`). CI therefore exercises the "read from the CMS"
path, while production, which starts empty, exercises the fallback path; the unit
tests cover both. **Production holds PRs 4 to 12 since 2026-10-03**, so those collections are in
`PRODUCTION_HAS` and `snapshot.mjs` carries their rows (`pages` was added to its `SNAPSHOT_ALL`);
`cms-rows.sql` is down to the CI-only photo and journal entries. A collection loaded into production later
is added to `PRODUCTION_HAS` and the snapshot takes over. A schema or
menu change needs `--from-scratch` (a refresh cannot create a table); a content-only
change needs a plain refresh.

To add a case study to CI: add its slug to `CASE_STUDY_SLUGS` in
`scripts/ci-dataset/snapshot.mjs` and its term slugs to `terms.json`, add it to
`tests/routes.ts`, then run the snapshot and a refresh. Test-only rows production
should not carry go in `fixtures.sql` or, for a CMS collection, in
`scripts/ci-dataset/ci-content/<collection>.json` (PR 11's one test photo, `ci-test-photo`;
PR 12's published `ci-test-entry` and DRAFT `ci-draft-entry` in `posts.json`, where an entry
can carry `"status": "draft"` and `"terms"`): `cms-fixtures.mjs` merges those entries into `cms-rows.sql` and
`cms-media.json` for CI only, never into the fallback JSON or production.
`NCS_CI_NO_TEST_CONTENT=1 node scripts/ci-dataset/cms-fixtures.mjs` followed by a refresh
removes them, which is how the zero-photo `/photography/` render is measured on the same
data; run the script again without the variable (and refresh) to put them back. **PR 13 (redirects and the hero).** `cms/content/redirects.json` goes into the seed as EmDash redirect rows (applied on the first request after a `--from-scratch`), and `snapshot.mjs` sets `in_hero` and `hero_order` on the CI case studies that `cms/content/case_studies.json` names (Second Presbyterian 1, Presbyterian Academy 5; Reid Design is not in the production hero, so CI shows two sites where production shows five). To measure the state production is in today (no redirect rows, no hero fields set: the two URLs answer 404 and the hero uses its bundled five), run `NCS_CI_NO_REDIRECTS=1 node scripts/ci-dataset/cms-fixtures.mjs` and `NCS_CI_NO_HERO=1 npm run ci-dataset:snapshot`, then `--from-scratch`; never commit the output of either variable. `ciFixtures.test.ts` fails while the committed seed lacks the redirect rows. **The journal in CI.** With the committed data the CI journal has one published entry and one draft, so the Journal link shows in every page's menus and `/journal/ci-test-entry` is in `tests/routes.ts` for the axe sweeps in both themes. To test the zero-entry state (production's), run `NCS_CI_NO_TEST_CONTENT=1 node scripts/ci-dataset/cms-fixtures.mjs`, refresh and redeploy the same dist (clears the route cache), then run the suites with `JOURNAL_EMPTY=1` (the entry route leaves the sweeps, the smoke menu check expects no Journal link, `/journal/` expects the empty card). Restore with the script run without the variable and a refresh; never commit the variable's output. Taxonomy
links are pinned in `terms.json` because the CLI cannot read per-entry terms.

**Redeploying by hand:** `CLOUDFLARE_ENV=ci npm run build && CLOUDFLARE_ENV=ci npx wrangler deploy`.
Never run `wrangler deploy` without `CLOUDFLARE_ENV=ci`: the default config is production.

## The `studio-help` admin plugin (2026-10-03)

- `plugins/studio-help/src/*.test.ts` (in `npm run test:unit`): step navigation, once-per-user decision, seen-record parsing, card placement and the visible-target maths (`engine.test.ts`); the content-file validator and its error messages, plus the real `cms/help/tour.json` against the writing rules and `cms/schema` slugs (`validate.test.ts`).
- `tests/studio-help.spec.ts`, chromium only. Group 1 (isolation) runs against any URL, including CI: the plugin's routes answer 401/403 signed out and the public homepage has no trace of it. Group 2 drives the REAL admin and runs only with `STUDIO_HELP_ADMIN=1` against `astro dev` (it signs in through EmDash's dev-only bypass into the local emulated database; the endpoint 404s on any deployed build, so CI skips it): auto-open once, modal semantics, Tab trap, Escape, focus return, arrows, all ten steps with spotlight and viewport containment, axe on the card in both admin themes, reduced motion, the Help page, the editor panel. Recipe is in the file header.
- **Not exercised in the deployed admin:** CI and ncs-ci have no admin user, so no automated run signs in to a deployed instance. After the first deploy with the plugin, click through the list in `docs/stack-template/ADMIN-HELP.md`.
