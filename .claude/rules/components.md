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

- `TopLine`: the name and the status, "Taking new projects · Call or email" (`site.bookingOpen`; "Call or email" alone on a phone), with the skip link before it. `onColor` flips it for pages that open on a client's color.
- `Dock`: the floating nav, plain links, the one nav at every width (never-break rule 8). Labels: Work, Prices (`/services/`), About, Start a project (`/contact/`).
- `ClientSheet`: a native `<dialog>` that opens when a `Tile` is clicked. It also prints the client list as JSON in `#ncs-clients`, which `kit.js` reads.
- `Closing`: the page's last section, on every page except /contact, the 404 and /coming-soon. Takes a `lead` string (HTML, heavy words in `<b>`). It reads `getClients()`, `getGatedNav()` and `site`.
- `Analytics`, `StructuredData`, `ComingSoon`, `ComingSoonGate`, `PageHead`: head and gate plumbing. `ComingSoonGate` and `src/components/analytics/` hold the conditional inline scripts, because `prettier-plugin-astro` cannot parse a `<script>` inside a template expression.

## The deck and shared pieces

- `Tile`: a client's phone window, or with `desk` a large desktop browser window (a real link to the case study; `data-direct` keeps it a link). Takes a `Client` from `getClients()`. The footage is only fetched when something asks the window to play.
- `Caption`: the name and sector under a window; pass `index` to number it.
- `SectorLean`: the whole of a lean sector page (/schools/, /nonprofits/, /small-business/), drawn from `src/data/sector-pages.ts`.
- `QuoteBand`: a client's quote on their own color, read from the study's `testimonials` (`slug`, `quote` index, `flip`). It throws if the quote does not exist.
- `PriceHand` and `DealtPrices`: the three starting-price cards and the "Every price is public" section around them; both read `src/data/pricing.ts`.
- `window-chrome.ts` supplies the address-bar lock and the toolbar icons shared by `Tile`, the contact brief phone and the study windows.

## Case study blocks (used from the MDX body)

`Chapter` (titled wrapper), `Lede`, `Idea`, `Decision`, `FeatureHighlight`, `BeforeAfter`, `ResultsBlock`, `CourseLine` (Stone Steps only), `SiteShowcase`, `WhatYouEdit`, `Quotes`, `FullBuild`, and the markdown overrides `Prose` (for `p`), `FullList` (`ul`) and `Sub` (`h3`). `LongPhone` is the rail phone the page adds itself; `ZoomImage` is the click-to-enlarge capture used inside blocks. They are all registered in the `components` map in `src/pages/work/[slug].astro`.

- Image props are file names without extension, looked up in `src/data/study-images.json` by `studyImage()` in `src/lib/study-markup.ts`, which gives the real width and height so nothing shifts. A name that is not in the JSON fails the build.
- Text props accept `**bold**` through `inline()` and are escaped otherwise.
- No MDX comments in a body: prettier mangles `{/* */}`. Put notes in the frontmatter's YAML comments.

## `src/lib`

`clients.ts` (`getClients`, `getClient`, `toClient`, `DECK` order, sector labels and counts), `words.ts` (`wordSpans`, `plainText`, for the H1 reveal), `window-chrome.ts`, `study-markup.ts`, `study.ts` (`nextInLoop`, `cmsShotProblem`), `closer.ts` (closing sector phrases), `seo.ts` (`studyTitle`), `schema.ts` (JSON-LD), `money.ts`, `tier-costs.ts` (the five-year sums), `href.ts` (`withTrailingSlash`), `track.ts` (GA4 events), `readingTime.ts`, `contrast.ts` (PORTABLE), `live-scores.ts` (still built and tested, but no page prints it). Each has a unit test beside it where it holds logic.

## Code conventions

- TypeScript strict. Unit tests import `.ts` with the extension (Gotcha 8).
- Template-expression comments are `{/* */}`, never `<!-- -->` (Gotcha 1).
- Copy comes from `src/data/site.ts` and `src/data/pricing.ts`; do not hardcode contact strings or prices in a component.
- Every internal href ends in a slash (`withTrailingSlash()` for computed ones; `npm run check:slashes` gates it).
- Hex values do not appear in components. Use the `:root` tokens, or `--c` and `--p` for a client.
- Comment generously. The file header says what the file is for and what to leave alone.
- Site copy is first person singular (`npm run test:copy`).

## Images and media

- Footage addresses carry `?v=` and a short hash of the file (`stamped()` in `src/lib/clients.ts`, hashes in `src/data/footage-versions.json`), because `/assets/*` is cached for a month and a re-filmed clip keeps its name. After changing a clip run `npm run footage:stamp`; `footage-versions.test.ts` fails until you do.
- Footage and captures are plain files in `public/assets/`, named by study slug: `{slug}.mp4` (desktop footage), `{slug}-m.mp4` (phone footage), `{slug}-m.webp` (phone still, 584w, with `-320` and `-448` copies that the cards pick through `client.stillSet` plus a `sizes` matching each card's CSS width; `npm run stills` rewrites the copies), `{slug}-cover.webp` (desktop still), `{slug}-cms.webp` (editor screen), plus `study/*.webp` for the body images. They are cached for a month (`public/_headers`). Interaction clips stay in `public/media/` with a content hash in the name (cached for a year).
- Give every `<img>` its real `width` and `height`. Content images get a descriptive `alt`; an image beside a heading that names the same thing gets `alt=""`. A window's screen is `aria-hidden` because its link already carries a full label.
- The studio's own pictures (the portrait) are in `public/assets/`. A study's `cover` frontmatter is still an Astro `image()` from `src/assets/case-studies/`, used for the share card and structured data, not shown on the page.
