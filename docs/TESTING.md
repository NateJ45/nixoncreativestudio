# TESTING.md

A map of which gate covers what, so nobody writes a fifth suite that duplicates
the third. Created 2026-08-27 during the PORTS.md sync session (Card 15).

Registry, not a changelog: when a suite changes, edit the row.

---

## What runs, and where

Brought up to the family test standard on 2026-09-06 (WCP is the reference
implementation; reid-design-site and mas-monograms carry the same shape).

| Gate        | Command                  | Runs in CI           | Covers                                                                                                                                                                                                             |
| ----------- | ------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Type check  | `npx astro check`        | `ci.yml` (build job) | TypeScript across `.astro`, `.ts`, `.tsx`                                                                                                                                                                          |
| Lint        | `npm run lint`           | `ci.yml` (build job) | ESLint over `src` and `scripts`. A hard gate since 2026-09-06 (see below)                                                                                                                                          |
| Format      | `npm run format:check`   | `ci.yml` (build job) | `prettier --check .` with the family `.prettierrc` (astro + tailwind plugins)                                                                                                                                      |
| Unit tests  | `npm run test:unit`      | `ci.yml` (build job) | `src/lib/*.test.ts` plus `scripts/lib/*.test.mjs` (see below)                                                                                                                                                      |
| Copy lint   | `npm run test:copy`      | `ci.yml` (build job) | After the build: no "we", "our" or "us" in rendered body text of any page in `dist/client` (site copy is first person singular; see below)                                                                         |
| Build       | `npm run build`          | `ci.yml` (build job) | The whole site compiles and prerenders; every content-collection entry resolves; image and OG generation succeed                                                                                                   |
| Link check  | `npm run check:links`    | `ci.yml` (build job) | linkinator over `dist/client`: every internal link resolves (300+ links; off-site URLs are skipped)                                                                                                                |
| Slash check | `npm run check:slashes`  | `ci.yml` (build job) | Fails on any internal `href` in `dist/client` HTML without a trailing slash (no 307 redirects, PORTS Card 89)                                                                                                      |
| Playwright  | `npm test`               | `ci.yml` (test job)  | smoke, axe light, axe dark + focus indicators, reduced-motion settle, reflow at 320/768/1024/1440, first-viewport, pause motion, CLS under 0.05, metadata and JSON-LD, on chromium and a WebKit iPhone (see below) |
| Lighthouse  | `npx lhci autorun`       | `lighthouse.yml`     | Accessibility (hard gate at 100), LCP under 4.5s and CLS under 0.1 (hard gates), performance / best-practices / SEO / byte weight as warnings, over 13 URLs                                                        |
| Parity      | `npm run parity compare` | **no** (by design)   | Rendered-HTML drift against a committed baseline                                                                                                                                                                   |
| Uptime      | -                        | `uptime.yml`, hourly | The live site's key routes still return 200                                                                                                                                                                        |

The `test` job has `timeout-minutes: 30`, and its browser install runs each attempt under `timeout 360`
inside a 15-minute step (2026-10-26, starter PORTS card 70): a throttled Ubuntu mirror once held that install
for an hour across the family, and with no timeout a required check can wait for the 6-hour default.

`npm run check` is the quick local gate: `astro check && npm run lint`.
`npm run check:full` adds the unit tests and the build. `npm test` runs the
Playwright suites (it builds and serves `dist/client` itself); `npm run test:ui`
opens the Playwright UI.

### Playwright (`playwright.config.ts`, `tests/`)

Runs against the real production build served statically (`npm run serve:dist`
= `http-server dist/client -p 4321`), never `astro dev`. Locally an existing
server on 4321 is reused, so `npm run build && npm run serve:dist` in one
terminal and `npx playwright test --project=chromium` in another is the fast
loop. CI installs chromium and webkit and runs both projects.

| File                       | Covers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes.ts`                | The route list every sweep iterates: every prerendered page plus one case study standing in for the `/work/[slug]` template, Orangeburg (the longest title, for the 320px H1 guard), and `/colophon/parts`, the noindex check page that renders every shared component (overhaul 1.8). Add a route when a page ships                                                                                                                                                                                                                                                                                                                                                                                            |
| `helpers.ts`               | `settle()`: fonts ready, transitions killed, every `[data-reveal]` forced visible, so axe and the reflow measure see the finished page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `smoke.spec.ts`            | Every route returns 200 and its title carries the studio name; GA4 sends nothing off the production hostname (starter card 58)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `a11y.spec.ts`             | axe-core default rule set (WCAG 2.x A/AA + best practices + `target-size`) on every route, zero violations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `a11y-dark.spec.ts`        | The same sweep with `localStorage["ncs-theme"] = "dark"` seeded before the anti-FOUC bootstrap runs, plus a check that every `/contact` field shows a focus indicator in dark mode                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `reduced-motion.spec.ts`   | PORTABLE (starter PORTS.md card 61, 2026-09-30). With `reducedMotion: 'reduce'`, every route has no `running` animation 2.5s after load. Catches WebKit stranding 0.01ms transitions (globals.css reset now uses `0s` transitions)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `reflow.spec.ts`           | No horizontal overflow at 320px (WCAG 1.4.10), unscrolled and while scrolling (reveals pending), and settled at 320 and 1440/1024/768                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `page-weight.spec.ts`      | Per route: HTML, inline CSS, scripts, images, LCP image, preloaded fonts and JSON-LD against `page-weight.config.json` (PORTABLE spec, starter card 197; budgets are this site's own, measured 2026-10-27 plus about 25%; `maxScriptKb` cut from 430 to 120 by overhaul 1.4, when the chrome stopped shipping React). Chromium only.                                                                                                                                                                                                                                                                                                                                                                            |
| `first-viewport.spec.ts`   | Overhaul ruling 3 (2026-10-30). Every route at 1440 and 320, straight after load with no settle: each visible H1, image, picture, video, canvas, iframe and hero-reel card touching the first viewport, and every ancestor, has computed `opacity: 1` and `clip-path: none`. Exempts the hero ticker's inactive lines. No route is exempt since 1.8 rebuilt CaseStudyCover on `Media.astro` (2026-10-31). Also checks each case study's cover is its one `lcp` image (`loading="eager"`, `fetchpriority="high"`). Since 1.7, at 412 (Lighthouse mobile) and 1440, no `[data-reveal]` on screen at load is part-faded (scroll-driven reveals would otherwise wait for a scroll). Chromium only                   |
| `motion-pause.spec.ts`     | WCAG 2.2.2 (overhaul 1.7). The hero's Pause button stops the reel's CSS animations (`document.getAnimations()` play state) and the ticker (fake clock), and stays in step with the footer switch through `aria-pressed`. The footer switch is a 44px toggle; its state persists across a reload and a ClientRouter navigation. On every route, with `html[data-motion-paused]` set, no `data-motion="loop"` animation runs and Heft does not animate. Heft runs once and ends inside 2.5s; the 404 runs it in reverse and ends at 200, which is also its reduced-motion state. Chromium only                                                                                                                    |
| `metadata.spec.ts`         | Overhaul 1.9. Every route plus every case study linked from `/work/`: title at most 64 characters (aim 60) and description 110 to 160, none shared; every JSON-LD graph parses, defines each `@id` once and every `{ "@id" }` reference resolves, with no ratings or reviews; case studies carry CreativeWork and BreadcrumbList; each /services offer price appears on the page; `/llms.txt` is `text/plain` and lists every study; `/robots.txt` names the AI crawlers. Chromium only                                                                                                                                                                                                                         |
| `forced-colors.spec.ts`    | Overhaul 1.5. One route (/about): a `.band-ink` and a `.frame` dropped into the page have no edge normally, and a 1px border and a solid outline under `forcedColors: 'active'` (the stylesheet's forced-colors block). Since 1.8 a second test checks the real BrowserFrame on `/colophon/parts/`: outline, bar border and dot borders survive. Chromium only                                                                                                                                                                                                                                                                                                                                                  |
| `cls.spec.ts`              | Every route at 1440 and 390: a buffered `layout-shift` observer (skipping `hadRecentInput`), the page scrolled to the bottom and settled, largest session window under 0.05 (tighter than Lighthouse's 0.1, and covers shifts while scrolling). Chromium only (the API is Chromium-only)                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `mobile-nav.spec.ts`       | Overhaul 1.4 (ruling 5). At 390px: the menu button opens the `<dialog>` with focus on Close and `aria-expanded`; Escape and Close shut it and return focus to the button; Tab and Shift+Tab never leave it; a panel link navigates with no modal left open; a navigation started outside the panel closes it through `astro:before-swap`; axe passes on the open panel in light and dark; with JavaScript off the button is a plain link to the footer nav (`#site-nav`). Chromium only                                                                                                                                                                                                                         |
| `chrome.spec.ts`           | Overhaul 2.1. Every BaseLayout route ends on the `.band-ink` footer with a static closer H2 (no Heft) and keeps `nav#site-nav`; the footer Work column lists exactly the case studies on /work; a case-study closer links to `/contact/?from={slug}&org_type={sector}`; /contact has no closer pill; at 390px the compact header CTA is a 44px pill, absent on /contact; the header keeps its height when the page scrolls (1440 and 390). Chromium only                                                                                                                                                                                                                                                        |
| `services.spec.ts`         | Overhaul 2.5. /services: Tab to each sub-nav link and press Enter at 1440, 768 and 320, with JavaScript on and off; the target H2 sits below the sticky header and sub-nav (`scroll-padding-top`, WCAG 2.4.11). Every tier links `/contact/?tier={name}`; the add-on prices show in the closed `<details>` summary; "Recently shipped" never repeats a home study; the FAQPage JSON-LD equals the visible FAQ. Chromium only                                                                                                                                                                                                                                                                                    |
| `size-up.spec.ts`          | Overhaul 3.3. "Size up your project" on /services, with JavaScript off and on: no tier until size and features are answered, the larger answer wins (five combinations), the sites match the sector and no tier panel holds a client link, the photo line shows only when photos are needed, and "Send this to Nathan" lands on `/contact/` with `tier`, `org_type`, `service` and `from=services` (with JS, 2.7's prefill selects the org type and the budget chip). With JS the closer pill carries the answers and the status line names the tier. Chromium only                                                                                                                                             |
| `contact.spec.ts`          | Overhaul 2.7. With JavaScript off, the /contact form posts natively to Web3Forms (action, method, the four required fields, no `novalidate`, the `redirect` to `#sent`), an empty submit is blocked and the `#sent` target shows the success panel; with it on, `?from ?org_type ?tier ?service` prefill the select, the budget chip and the hidden origin fields (non-slug values ignored), the brief card fills in and is `aria-live="off"` (never `aria-hidden`), a sent form moves focus to the success heading with two studies from the sector, the clock reads "It's h:mm am/pm in Cincinnati.", and no map iframe or Google Maps request happens. Every Web3Forms request is intercepted. Chromium only |
| `work-filter.spec.ts`      | Overhaul 2.3. /work: the H1 count matches the rows and no link nests inside another; `/work/?sector=church` filters on load with the aria-live count and `aria-current`; a tab click filters in place and rewrites the URL; an unknown sector falls back to all, says so and cleans the URL; with JavaScript off every row shows and the tabs are plain links; at 1440 hovering a row swaps the preview frame's capture and host. Chromium only                                                                                                                                                                                                                                                                 |
| `reel-morph.spec.ts`       | Overhaul 3.1, site-owned. Clicking a homepage reel card: when the View Transition starts, exactly one element (the clicked `.reel-frame`) holds `cover-{slug}`, the stage holds `hero-reel`, no name is held twice, and the click lands on `/work/{slug}/` whose `.cs-stage` holds the same name. Under reduced motion and under Pause motion no reel name is set. Chromium only.                                                                                                                                                                                                                                                                                                                               |
| `no-react.spec.ts`         | Overhaul 1.4 (all routes since 2.8). Every route renders no `<astro-island>` and requests no React chunk, after a scroll and a short wait so idle and visible hydration would have fired. Chromium only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `photography-gate.spec.ts` | Overhaul 2.8. Counts the JSON files in `src/content/photos/` and, while that is under `MIN_PHOTOS` (`src/data/photography-gate.ts`), checks that `/photography/` carries a robots noindex meta, is missing from every sitemap file named in `sitemap-index.xml`, and has no link in the header or the footer nav. Once the gate opens it checks the reverse. Chromium only                                                                                                                                                                                                                                                                                                                                      |
| `walk.spec.ts`             | Overhaul 2.4b, site-owned. On `/work/stone-steps-50k/`: under reduced motion the "Walk the homepage" screen is a focusable scroll box named "Scroll the Stone Steps 50K homepage", Tab reaches it from the top of the page and Page Down / Arrow Down scroll it, with no animation on it; Pause motion (`localStorage["ncs-motion"]`) turns it back into the scroll box; with motion allowed and scroll-driven CSS supported the capture carries one scroll-linked animation; the capture box is cropped to at most 4,000px of source (ratio above 0.35) and lazy. Chromium only.                                                                                                                               |
| `course-line.spec.ts`      | Overhaul 3.2, site-owned. On `/work/stone-steps-50k/`: Tab reaches the course line's range input ("Walk the course"), the arrow keys move it 0.1 mi, Home and End go to the ends of the trace, and the readout and `aria-valuetext` (mile, loop, feet, grade) follow; the plan marker moves. Under reduced motion and under Pause motion both drawn lines carry no animation and a dash offset of 0 (drawn in full, instant); with motion allowed and scroll-driven CSS supported both draw on the figure's timeline; with JavaScript off the control is hidden and both drawings render. Chromium only.                                                                                                        |
| `not-found.spec.ts`        | Overhaul 2.9, site-owned. `/work/stonesteps/` returns 404 and its "Did you mean" list leads with Stone Steps 50K (at most three links); the empty BrowserFrame's address bar shows the requested path; with nothing close, and with JavaScript off, the list is every case study (the same set as the footer's Work column, never a typed count); axe in light and dark; no sideways scroll at 320. The 404 has no URL of its own, so it is not in `routes.ts`. Chromium only                                                                                                                                                                                                                                   |
| `testimonials.spec.ts`     | Testimonials package, site-owned. Each of the five studies with a client quote shows it (FBCM two) as a `<blockquote>` with a `<cite>`, axe-clean on the quote block in light and dark, and inside 320px with no page overflow; Presbyterian Academy, MAS and Reid show none; the homepage shows exactly one quote, linked to its study. Chromium only.                                                                                                                                                                                                                                                                                                                                                         |

The webkit-iphone project runs smoke, both axe sweeps and reduced-motion; reflow drives its
own viewport widths, so it is chromium-only, and so are page-weight, first-viewport, motion-pause, metadata, forced-colors, cls, mobile-nav, no-react, walk, course-line and not-found
(the config's `testMatch` for webkit-iphone simply does not list them). `/coming-soon` is a standalone
document, but it runs the same theme bootstrap and has its own dark tokens, so the dark sweep covers it too (since overhaul 2.9).

First run (2026-09-06) found one real bug: `/about` was 342px wide at 320px
because the Terminal's nowrap window title set the min-content of its grid
item. Fixed with `min-w-0` on the item (the Terminal itself was deleted in overhaul 2.6).

### Copy lint (`npm run test:copy`, `tests/unit/copy-rules.test.mjs`)

Added 2026-10-30 (overhaul package 1.3). Nathan is one person, so site copy
says "I", never "we", "our" or "us" about the studio. The test reads the
built HTML in `dist/client`, so it runs after `npm run build` (in CI it is the
step right after the build, not part of `test:unit`, which runs before it). It
checks rendered body text only and skips `<head>`, `<script>`, `<style>`,
`<svg>`, comments, attribute values (so `aria-label` and `alt`), every
`<blockquote>` (client quotes stay verbatim), and any element marked
`data-copy-ignore` with everything inside it. Use `data-copy-ignore` only for
text that is honestly someone else's "we" (a quoted client, Nathan's family in
the /about story) and leave a comment beside it saying why. A failure lists
the page and the sentence.

### Unit tests (`node --experimental-strip-types --test src/lib/*.test.ts`)

Node's built-in runner, no framework. TypeScript runs through Node's type
stripping, so there is nothing to configure and nothing to install.

| File                        | Covers                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils.test.ts`             | `cn()` class merging: clsx syntax forms, tailwind-merge conflict resolution, falsy handling                                                                                                                                                                                                                                                                                                                                                                                         |
| `readingTime.test.ts`       | Journal reading-time estimation                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `coverPlaceholder.test.ts`  | The generated blur-placeholder lookup                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `theme-tokens.test.ts`      | **Added 2026-08-27.** WCAG contrast of every rendered token pair in `globals.css`, light and dark                                                                                                                                                                                                                                                                                                                                                                                   |
| `ncs-tokens.test.ts`        | **Added 2026-10-31 (overhaul 1.5).** The site-owned token gate: every pair added since 1.5 (paper, `--line-strong`, `--live`, the `.band-ink` re-scope against both themes' ink) in both themes, plus the type promises: Bricolage is `--font-display` with its fallback in step with `brand.config.json`, Bebas is the wordmark only, no `text-transform` on headings, 300/650/800 weights, forced-colors borders. New pairs go here, never in the PORTABLE `theme-tokens.test.ts` |
| `case-palettes.test.ts`     | **Added 2026-10-30.** Every case study's `palette`: light text pairs 4.5:1, accent mark 3:1 on paper, a mark at 3:1 on the dark ink, the client's own dark theme where it has one; this site's text and focus ring on each client paper (2.4a); `order` runs 1..n                                                                                                                                                                                                                   |
| `study.test.ts`             | **Added 2026-10-31 (overhaul 2.4a).** The case-study frame helpers: the Up next loop by `order` (wraps, unordered studies last), the rail facts with `facts` overrides, the dark mark choice and the `--cs-*` palette style                                                                                                                                                                                                                                                         |
| `case-results.test.ts`      | **Added 2026-10-31 (overhaul 2.4c).** In every study body, each `ResultsBlock` figure (`{ figure, text, source }`) carries a non-empty `source`, so no number reaches display size unsourced (never-break rule 9); and no study has both a frontmatter `results:` list and a body ledger                                                                                                                                                                                            |
| `case-testimonials.test.ts` | **Added 2026-10-31 (testimonials package).** Every `testimonials` entry has a quote, name, title and a real ISO date (not in the future), no wrapping quote marks, and only the five studies with a received quote carry any (FBCM two). The words themselves are checked against the vault note by hand, since the vault is outside the repo                                                                                                                                       |
| `did-you-mean.test.ts`      | **Added 2026-10-31 (overhaul 2.9).** The 404's scorer (`src/lib/did-you-mean.ts`): Damerau-Levenshtein with adjacent swaps, the slug forms (whole, runs of pieces, initials), `/work/stonesteps/` suggesting Stone Steps, typos in top-level pages, part of a slug or its initials, an empty list when nothing is close, never more than three                                                                                                                                      |

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

`case-palettes.test.ts` reads each study's MDX frontmatter straight off disk
(a small YAML reader for the plain forms the files use), so it needs no Astro
runtime. The pairs and the reason for each are in its header comment. When a
real client accent fails on this site's dark ink, the fix is a `markDark`
picked from the client's own swatches (the test checks it is one), never a
changed client colour. It was proved to bite by removing MAS Monograms'
`markDark` (its indigo is 1.92:1 on ink).

### Parity harness (`npm run parity`)

PORTS.md Card 3, installed 2026-08-27. `capture` snapshots every built page's
normalized HTML into `scripts/.parity/`; `compare` diffs a later build against
it. Neither mode builds - you build, it reads `dist/client`.

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

The URL list is explicit on purpose. With `staticDistDir` alone, lhci
auto-discovers pages but caps at 5, so it was testing a near-random 5 of 22
including the `/404` page and the Search Console verification stub, which
dragged accessibility below 100. The reasoning is written out at the top of
`lighthouserc.json`; read it before touching that list.

One case study stands in for all of them, since they share a layout; `/coming-soon`
is its own standalone template and is listed too.

The workflow runs on pushes to `main` and on pull requests.

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

### Tap-target measurement (`scripts/measure-tap-targets.mjs`)

A `PORTABLE` starter file (PORTS.md card 83). It counts links and buttons whose
tappable area is under 44px at a phone width, and hit-tests any that rely on a
stretched `::after` so a grown area that steals taps from a neighbour shows up.
Not a CI gate (it needs a served site and a browser): it is the manual check to
run before and after touching links or buttons. `a11y.spec.ts` already runs
axe's `target-size` rule (the 24px AA floor); this script checks the 44px
comfort target. Exit code 1 when anything is under 44px or a tap is stolen.

```sh
npm run build && npm run serve:dist   # in another terminal
node scripts/measure-tap-targets.mjs http://127.0.0.1:4321 \
  --paths /,/about/,/services/,/work/,/work/stone-steps-50k/,/journal/,/photography/,/contact/,/colophon/,/privacy/,/accessibility/,/coming-soon/
```

Use `127.0.0.1`, not `localhost` (http-server may not answer on IPv6), and on
Git Bash set `MSYS_NO_PATHCONV=1` or the `/` paths turn into Windows paths. The
route list is `tests/routes.ts`. Content inside a closed `<details>` is skipped;
pass `--include-closed-details` to count it. Links inside a sentence of body
text are listed as exempt (WCAG 2.5.8 "Inline") and left out of the total.

Every fix is gated on `pointer: coarse` (the `pointer-coarse:min-h-11` utility
or a `@media (pointer: coarse)` block), so a mouse desktop keeps its density.
Last scan (2026-10-09, 390px, all routes): 0 under 44px (298 before the fix).

---

## Deliberate absences

- **No console-error smoke pass.** There is significant client JS here
  (React islands, the hero reel, View Transitions) and nothing asserts that a page
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
