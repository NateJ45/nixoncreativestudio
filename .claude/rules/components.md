---
paths:
  - 'src/components/**'
  - 'src/lib/**'
  - 'src/layouts/**'
  - 'src/pages/**'
  - 'src/scripts/**'
---

# Components, helpers and code conventions

Loads when components, layouts, scripts or `src/lib` are touched. Look and motion rules are in `DESIGN.md` and `.claude/rules/styling.md`.

## Order of preference

1. An existing component in `src/components/` that already does the job.
2. Plain `.astro` markup with native HTML (`<details>`, `<dialog>`, `<button>`, `<a>`). Interactivity is a small script, not a framework.
3. A new component, commented at the top with what it is for. Pause before adding a dependency (Nathan's rule). There is no component library: no shadcn, no Starwind, no React. `docs/agent/component-sources.md` says why.

## The chrome (every page, from `BaseLayout.astro`)

- `TopLine`: the name and the status, "Taking new projects · Text or email" (`site.bookingOpen`; "Text or email" alone under 52rem, and at 40rem and under a speech bubble with the words kept for screen readers), with the skip link before it. At 40rem and under it also carries `<ThemeFlip where="top" />`, a round moon or sun, because the dock drops its switch there. `onColor` flips it for pages that open on a client's color. Its `.reach` card carries a `[data-cincy]` time and `<PaletteOpen where="reach" />`, and it renders a `.pblur` sibling for the top edge.
- `Dock`: the floating nav, plain links, the one nav at every width (never-break rule 8). Labels: Work, Prices (`/services/`), About, Start a project (`/contact/`). The Prices hand ends in `<TierPicker part="card" />`, the theme hand in `<SoundSwitch where="dock" />`, the Work hand's caption spells the real study count with `countWord()`, and it renders a `.pblur` sibling for the bottom edge.
- `TierPicker`: the tier picker's corner card (default `part="panel"`, placed by `BaseLayout` right after `Dock`, outside `<main>`), and with `part="card"` its opener in the dock. Script `tier-picker.js`, styles `tier-picker.css`, rule `src/lib/tier-pick.ts`.
- `ClientSheet`: a native `<dialog>` that opens when a `Tile` is clicked. It also prints the client list as JSON in `#ncs-clients`, which `kit.js` reads.
- `SiteTools`: the one tag (after `ClientSheet`) for the site-wide tools: `Palette`, the Speculation Rules (one inline `<script type="speculationrules">`: prefetch, never prerender, same-site document links at `moderate` eagerness, leaving out `/api/`, any address with a query string, files, and new-tab or nofollow links), `elevate-b.css`, and the scripts `sound.js` (first, because it installs `ui.cue`), `peek.js`, `palette.js` and `sheet-drag.js`.
- `Palette` (the command palette's `<dialog>`) and `PaletteOpen` (the "Search" button with its key hint; `where="end"` in the closing's index, `where="reach"` in the top line's card). `SoundSwitch` (`where="end"` in the closing's fine print, `where="dock"` as a card in the dock's theme hand).
- `Closing`: the page's last section, on every page except /contact, the 404 and /coming-soon. Takes a `lead` string (HTML, heavy words in `<b>`). It reads `getClients()`, `getGatedNav()` and `site`. It renders `<PaletteOpen where="end" />` at the end of "The studio" column, `<SoundSwitch where="end" />` after `ThemeFlip`, and a `[data-cincy]` time in its top row.
- `Analytics`, `StructuredData`, `ComingSoon`, `ComingSoonGate`, `PageHead`: head and gate plumbing. `ComingSoonGate` and `src/components/analytics/` hold the conditional inline scripts, because `prettier-plugin-astro` cannot parse a `<script>` inside a template expression.

## The deck and shared pieces

- `Tile`: a client's phone window, or with `desk` a large desktop browser window (a real link to the case study; `data-direct` keeps it a link). Takes a `Client` from `getClients()`. The footage is only fetched when something asks the window to play. Every window carries `data-sheen` and `data-cursor="Open"`, and its screen shows the client's paper under a bar of their colour until its picture paints. `priority="low"` (Home's dealt hand) gives the phone still `fetchpriority="low"`, so a first-screen window that is not the page's main picture loads after the stylesheets and the font; never put it on a window that is a page's largest picture.
- `Caption`: the name and sector under a window; pass `index` to number it.
- `SectorLean`: the whole of a lean sector page (/schools/, /nonprofits/, /small-business/), drawn from `src/data/sector-pages.ts`.
- `QuoteBand`: a client's quote on their own color, read from the study's `testimonials` (`slug`, `quote` index, `flip`). It throws if the quote does not exist.
- `PriceHand` and `DealtPrices`: the three starting-price cards and the "Every price is public" section around them; both read `src/data/pricing.ts`. Each card has a "Turn over" button and a back with its tier's features (`price-turn.js`, `price-turn.css`, imported by `PriceHand`); the front stays the `a.pc-face` link.
- `home/WhatChanged`, `home/PhotoStrip`, `home/ProcessBeats`: the home sections after the grid (`homepage-and-pages.md`).
- `ephemera/` (the drawer): the paper objects About tells its story on, for any page to borrow. `Stamp` (a peeling stamp, a button, or `decor` for an aria-hidden span; brings `peel.js`), `CrewList` (roles with the same name against each, `site.ownerName` by default), `FilmStrip` (frames that turn from photographs to `web` pages at a labelled splice; aria-hidden), `Ticket` (paper ticket with a tear-off stub; your content in the slot, `--ticket-ground` for the notches) `Barcode` (seeded, one seed per ticket) and `Signature` (Nathan's made-up hand-drawn signature, a design mark and not his legal one: single-stroke SVG paths that write themselves in pen order when they come into view, `src/scripts/signature.js`, drawn and still with no script or reduced motion; the drawing is aria-hidden and "Signed, Nathan Nixon" is visually hidden text, or `said={false}` when the name is said beside it; its own sheet `src/styles/ephemera/signature.css`, sized and inked by `--sig-w`, `--sig-pen`, `--sig-ink`). Looks in `src/styles/ephemera.css` (newer objects bring their own sheet in `src/styles/ephemera/`); placement stays in the page's stylesheet. Real material only, words in the markup, still under reduced motion. `npm run dev` serves all of them at `/drawer/` (dev only, injected in `astro.config.mjs`); add each new object there. The shared spring step is `src/scripts/spring.js`.
- `OffTheClock`: About's four turning cards; a card's `toy` (`'reel'` or `'course'`) puts the camera roll or the course line on its back.
- `TierPicker`, `SiteTools`, `Palette`, `PaletteOpen`, `SoundSwitch`: see the chrome above.
- `Aside` (a margin note, `.mnote`, `role="note"`) and `BarChart` (a chart read from the table it wraps): journal post blocks, passed to `<Content components>` in `src/pages/journal/[slug].astro`.

## Shared scripts (`src/scripts/`)

Imported once from `BaseLayout.astro` after `kit.js`, or from `SiteTools`, and used by attribute (`styling.md`, "Patterns to reuse"). Do not rebuild one in a page script.

- `roll.js` (`data-roll`, `ui.roll`), `rise.js` (section headings), `light.js` (`--sun-x`, `--sun-y`, `data-cincy`, `data-sheen`, `ui.sheen`), `cursor.js` (`data-cursor`), `blueprint.js` (the first-load drawing, decided by an inline `<head>` script, sessionStorage `ncs-bp`), `price-morph.js` (`tier-card`).
- `sound.js` (`cue()`, installed as `ui.cue`; `setSound()`, `soundOn()`; the switches), `peek.js` and `peek-data.js` (the link previews; the one fetch of `/peek.json`, shared with the palette), `palette.js`, `sheet-drag.js`.
- `ask.js` (`wireAsk(section)`): the one "Try it" engine, for /churches/ and the lean pages.
- `prices-plan.js` (`setPlan()`, `onPlan()`, `planFromUrl()`), `prices-turn.js`, `prices-chapters.js`, `prices-steps.js`: /services. `tier-picker.js`: the dock's tier picker. `home-more.js`: home. `colophon.js`: the colophon's live facts. `colophon-deck.js`: the colophon's window deck.
- `kit.js` adds `ui.cue` (a no-op stand-in until `sound.js` loads), `ui.words(el, cls)` (the shared word splitter) and stand-ins for `ui.roll` and `ui.sheen`. Its own cues: `tick` when the dock's puck goes to a new link, `deal` as a hand opens, `open` and `close` for the client sheet.
- `mailto-fallback.ts` also copies the address on a click for a `mailto:` link whose visible words are the address, and says "Copied" (`content.md`).
- `window-chrome.ts` supplies the address-bar lock and the toolbar icons shared by `Tile`, the contact brief phone and the study windows.

## Case study blocks (used from the MDX body)

`Chapter` (titled wrapper), `Lede`, `Idea`, `Decision`, `FeatureHighlight`, `BeforeAfter`, `ResultsBlock`, `CourseLine` (Stone Steps only), `SiteShowcase`, `WhatYouEdit`, `Quotes`, `FullBuild`, and the markdown overrides `Prose` (for `p`), `FullList` (`ul`) and `Sub` (`h3`). `LongPhone` is the rail phone the page adds itself; `ZoomImage` is the click-to-enlarge capture used inside blocks. They are all registered in the `components` map in `src/pages/work/[slug].astro`.

- Image props are file names without extension, looked up in `src/data/study-images.json` by `studyImage()` in `src/lib/study-markup.ts`, which gives the real width and height so nothing shifts. A name that is not in the JSON fails the build.
- Text props accept `**bold**` through `inline()` and are escaped otherwise.
- No MDX comments in a body: prettier mangles `{/* */}`. Put notes in the frontmatter's YAML comments.

## `src/lib`

`clients.ts` (`getClients`, `getClient`, `toClient`, `DECK` order, sector labels and counts), `words.ts` (`wordSpans`, `plainText`, for the H1 reveal), `window-chrome.ts`, `study-markup.ts`, `study.ts` (`nextInLoop`, `cmsShotProblem`), `closer.ts` (closing sector phrases), `seo.ts` (`studyTitle`), `schema.ts` (JSON-LD), `money.ts`, `tier-costs.ts` (the five-year sums), `href.ts` (`withTrailingSlash`), `track.ts` (GA4 events), `readingTime.ts`, `contrast.ts` (PORTABLE), `live-scores.ts` (still built and tested, but no page prints it), `tier-pick.ts` (the three questions, `suggestTier()`, `whyLine()`, `pickTiers()`, shared by /services and the dock's tier picker), `journal-art.ts` (`faceSvg()`, one line drawing per journal cluster), `table-chart.ts` (reads a post's table for `BarChart`), and `journal.ts` (now also `railDays()` and `splitHighlight()`). Each has a unit test beside it where it holds logic.

## Code conventions

- TypeScript strict. Unit tests import `.ts` with the extension (Gotcha 8).
- Template-expression comments are `{/* */}`, never `<!-- -->` (Gotcha 1).
- Copy comes from `src/data/site.ts` and `src/data/pricing.ts`; do not hardcode contact strings or prices in a component.
- Every internal href ends in a slash (`withTrailingSlash()` for computed ones; `npm run check:slashes` gates it).
- Every link to another site opens in a new tab: `target="_blank" rel="noopener noreferrer"` in components, and `src/components/ProseLink.astro` (MDX's `a`, using `isExternalHref()` in `src/lib/external.ts`) for Markdown links in case studies and journal posts.
- Hex values do not appear in components. Use the `:root` tokens, or `--c` and `--p` for a client.
- Comment generously. The file header says what the file is for and what to leave alone.
- Site copy is first person singular (`npm run test:copy`).

## Images and media

- Footage addresses carry `?v=` and a short hash of the file (`stamped()` in `src/lib/clients.ts`, hashes in `src/data/footage-versions.json`), because `/assets/*` is cached for a month and a re-filmed clip keeps its name. After changing a clip run `npm run footage:stamp`; `footage-versions.test.ts` fails until you do.
- Footage and captures are plain files in `public/assets/`, named by study slug: `{slug}.mp4` (desktop footage), `{slug}-m.mp4` (phone footage), `{slug}-m.webp` (phone still, 584w, with `-320` and `-448` copies that the cards pick through `client.stillSet` plus a `sizes` matching each card's CSS width; `npm run stills` rewrites the copies), `{slug}-cover.webp` (desktop still), `{slug}-cms.webp` (editor screen), plus `study/*.webp` for the body images. They are cached for a month (`public/_headers`). Interaction clips stay in `public/media/` with a content hash in the name (cached for a year).
- Give every `<img>` its real `width` and `height`. Content images get a descriptive `alt`; an image beside a heading that names the same thing gets `alt=""`. A window's screen is `aria-hidden` because its link already carries a full label.
- The studio's own pictures (the portrait) are in `public/assets/`. A study's `cover` frontmatter is still an Astro `image()` from `src/assets/case-studies/`, used for the share card and structured data, not shown on the page.
