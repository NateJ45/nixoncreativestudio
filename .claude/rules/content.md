---
paths:
  - 'src/content/**'
  - 'src/content.config.ts'
  - 'src/data/**'
  - 'src/pages/**'
---

# Content: site data, collections, routes

Loads when content, the collection schemas, site data or pages are touched.

## Content data and contact info

`src/data/site.ts` is the single source of truth for the studio's contact and identity values. Every component that displays an email, phone, name, studio name, business address, social URL, tagline, or domain imports from this module. Update a value here once and the top line, the closing, the contact page, the form's subject line and the analytics and meta descriptions all pick it up on the next build. Two sentences the closing prints live there too: `firstConversation` and `replyPromise`. `bookingOpen` shows or hides the "Booking projects" dot in the top line and the closing.

Edit `src/data/site.ts` when contact info, social URLs, or the studio name change. Do not hardcode any of those strings inside `.astro` components or pages; route them through `site`.

Every `mailto:` link site-wide has a graceful fallback (`src/scripts/mailto-fallback.ts`, loaded by `BaseLayout`). A `mailto:` only opens something if the device has a mail app registered for it; on a desktop without one the click is a silent dead-end. The script lets the click proceed (so visitors who do have a mail app still get their composer), then checks whether focus left the page; if nothing opened, it copies the address and shows a confirmation toast (`.ncs-toast` in `kit.css`). It never blocks or delays the real `mailto:`.

## Navigation and gated links (`src/data/nav.ts`)

The nav is the dock (`src/components/Dock.astro`): Work, Prices (`/services/`), About and Start a project (`/contact/`). Its four links are written in the component. To rename or reorder one, edit `Dock.astro`; the page paths and labels in `tests/chrome.spec.ts` follow.

`nav.ts` now holds only `getGatedNav()`: two pages that join the closing's site index once they have earned a link, so a link never points at an empty page. **Journal** appears once an entry is published (drafts count in `npm run dev` only, the same filter as /journal), and **Photography** once the `photos` collection holds `MIN_PHOTOS` (6) or more real photographs. Today both are off. Every href ends in a slash.

**The /journal gate.** `journalOpen(count)` in `src/data/journal-gate.ts`: with no published entry the page is noindex and out of the sitemap, and the closing has no link to it. `tests/journal-gate.spec.ts` checks it.

**The /photography gate.** One rule, `photographyOpen(count)` in `src/data/photography-gate.ts`, decides four things together: the closing's link (`nav.ts`), the page's robots `noindex` (BaseLayout's `noindex` prop, set in `src/pages/photography.astro`), the sitemap filter in `astro.config.mjs` (which counts the JSON files in `src/content/photos/` itself, because the content layer does not exist yet when the config runs), and the Photography line in `/llms.txt`. While it is closed the page still builds at `/photography/`: one portrait, the line "I photograph events, portraits and places across Cincinnati. The gallery is being assembled; ask for samples.", and a button to `/contact/?service=photography`. Never put placeholder images on it. `tests/photography-gate.spec.ts` checks all of this against the real photo count. Ungating is in `docs/PENDING.md`.

## Content collections

Three collections live in `src/content/` with schemas declared in `src/content.config.ts`.

**`case-studies`**: long-form portfolio entries as MDX files in `src/content/case-studies/`. Each page at `/work/{slug}/` is generated. Required frontmatter: `title`, `client`, `sector` (one of `church`, `school`, `nonprofit`, `small-business`), `services` (string array), `summary` (max 200 chars), `cover` (image path), `year` (int), `published` (date).

The fields the pages read today:

| Field                                     | Used for                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`, `client`, `sector`, `year`       | The page title and JSON-LD, the window's name and sector label, the case-study H1                                                                                                                                                                                                                                                                                                                                                   |
| `summary`                                 | The brief's lede (`Lede`), and the meta description when `metaDescription` is absent                                                                                                                                                                                                                                                                                                                                                |
| `metaDescription` (120 to 160)            | The study page's search and share description, in first person, written for a buyer                                                                                                                                                                                                                                                                                                                                                 |
| `hook` (max 90)                           | One true line about the live site. The window's label, the client sheet, the "Idea" chapter's title, Up next, `/llms.txt`                                                                                                                                                                                                                                                                                                           |
| `order` (int, 1..n)                       | Position in the study loop. Up next hands off to `order + 1` and wraps; `case-palettes.test.ts` checks the set runs 1..n with no gaps. (The deck order on home, /work and the closing is `DECK` in `src/lib/clients.ts`, a separate list.)                                                                                                                                                                                          |
| `palette`                                 | `{ paper, ink, accent, accentInk, typeface, swatches[] }` (six-digit hex), copied from the client's shipped tokens or sampled from the live site. Becomes `--c` (accent) and `--p` (paper) on a window, band, sheet or the study body. `markDark` and `dark` are still accepted by the schema but nothing reads them: the site has one light theme. A `# Palette source:` comment above each block says where the values came from. |
| `liveUrl`                                 | The "Visit" button, the address bar of every window, the host                                                                                                                                                                                                                                                                                                                                                                       |
| `outcome` (max 160)                       | The honest one-line result, on the study, /churches/, /work/ and the lean sector pages                                                                                                                                                                                                                                                                                                                                              |
| `role`, `stack`, `facts`                  | The study's fact row. `facts` (`{ sector?, year?, role?, stack?, host? }`) overrides the matching top-level field; leave it off unless the row should read differently (`year: '2024, rebuilt 2026'`)                                                                                                                                                                                                                               |
| `testimonials`                            | `{ quote, name, title, date, context? }` list. The client's own words, copied character for character from their email as recorded in the vault note `projects/ncs-testimonials.md`. Rendered by `QuoteBand` (home and About), printed as plain blockquotes on /churches/, and by the study's `Quotes` chapter. See "Quotes" below.                                                                                                 |
| `signatureClip`                           | `{ src, alt }` for the "Idea" chapter. `src` is the base path `npm run capture:clips` prints (`/media/{slug}-{name}.{hash}`, no extension; the MP4, WebM and WebP poster share it). Plays once when it reaches you, with a "Play it" button; never a loop. Recorded from the live, public site only.                                                                                                                                |
| `featureShotAlt`                          | The alt and caption for the "Idea" still, when the chapter is given a `still`                                                                                                                                                                                                                                                                                                                                                       |
| `featureShot`, `beforeShot`, `mobileShot` | Plain strings (file names). The body blocks name their own images by file name; keep the frontmatter strings in step with them                                                                                                                                                                                                                                                                                                      |
| `cmsShot`, `cmsShotAlt`, `cmsName`        | "What you edit": the editor screen is `public/assets/{slug}-cms.webp`. `cmsShotAlt` is required whenever `cmsShot` is set (`cmsShotProblem()` in `src/lib/study.ts`; the study page throws, so the build fails). `cmsName` names the editor (`Sanity Studio`, `WordPress`). Without `cmsShot` the page shows no band.                                                                                                               |
| `updated`, `services`                     | JSON-LD, the RSS feed and the sitemap's `lastmod` (`updated`, else `published`; bump `updated` when a study's content really changes); not shown on the page                                                                                                                                                                                                                                                                        |

Accepted by the schema but read by no page today: `tags`, `featured`, `designerNote`, `results` (the results ledger is `<ResultsBlock>` in the body), `cmsUrl`, `description` (only /churches/ reads it). Leave them out of new studies.

`cover` is still an Astro `image()` from `src/assets/case-studies/{slug}.png`. It feeds only the share card and structured data (`getImage` in `work/[slug].astro`). The picture on the page is `public/assets/{slug}-cover.webp`.

### Study body shape

Every study body uses the same chapters, in page order, as `<Chapter title="...">` wrappers. Read `src/content/case-studies/reid-design.mdx` (a CMS study) and `stone-steps-50k.mdx` (the long one) for the exact shape. The page adds its own title card on the client's color, the rail phone and Up next.

1. **The brief**: `<Lede study={props.study} />` (prints `summary`), prose, then `<ResultsBlock items={[...]} />` ("What changed": a row is a plain sentence, or `{ figure, text, source }` at display size; a figure without a real `source` fails `src/lib/case-results.test.ts`; a sourced figure also names `shot`, `shotAlt` and `shotNote`, the capture /work shows beside it, and `of` / `ofLabel` when it is part of a whole, checked by `work-figures.test.ts`).
2. **`<Idea study={props.study} />`**: a chapter titled with the study's `hook`. It shows the `signatureClip` if there is one, or a still if you pass `still="file-name"`. Leave it out when no capture shows the feature.
3. **Decisions**: one to three `<Decision title easy did>`, "the easy version" against "what I did", taken only from the study's own approach text, then any supporting prose and special blocks (`<CourseLine />` on Stone Steps).
4. **Before and after**: `<BeforeAfter before after beforeAlt afterAlt>` only where a real "before" was captured while the old site was live. The halves are labelled "Before" and "After" only, never a platform, with "Drag the middle handle, or tap anywhere on the picture, to compare..." under the picture (the tap is the non-drag alternative WCAG 2.5.7 asks for; `study.js` makes it work on iOS too).
5. **Walk the homepage**: `<SiteShowcase study label href alt />`. It opens with one line saying what the moving picture is.
6. **`<WhatYouEdit study={props.study} />`** (only renders with a `cmsShot`).
7. **`<Quotes study={props.study} />`** (only renders with testimonials).
8. **`<FullBuild more={...}>`**: "What I built", closed `<details>`: `<FeatureHighlight src alt title body side>` rows for real, live features, then the full list (`ul` becomes `FullList`) and any closing prose.

**Words for a client, not a developer** (the November 2026 clarity pass). The body, decision cards, "What I built" lists, figure `text` and `source` lines, `cmsShotAlt`, `summary` and `outcome` describe what the client gets ("editing screens the staff run", "forms that block spam without making visitors tick a box"), never the tool ("Sanity Studio", "Turnstile", "static pages", "API"). WordPress stays, because owners know it. Tool names live only in the frontmatter `stack`, which the page prints after "For the technically curious, it is built with". A `source` is written for a reader ("the official race results from RunSignUp, the timing company", "my record of the import"), and a quote's `context` says it positively when a client came back ("They came back for this rebuild in 2026"). Counts are numerals unless they start a sentence.

Image props are file names without extension from `public/assets/study/`. Their real sizes are in `src/data/study-images.json`; a name not in the JSON fails the build. Comments in an MDX body get mangled by prettier (`{/* */}` becomes `{/_ _/}`), so notes about a study go in the frontmatter's YAML comments.

#### Live scores

`src/data/live-scores.json` is written only by `.github/workflows/live-scores.yml` (monthly, by hand), through `scripts/measure-live.mjs` and `src/lib/live-scores.ts`. The study page no longer prints the scores. The workflow, the JSON and the library still run and are unit-tested, but nothing on the site reads them. Do not edit the JSON by hand or fill it from a local Lighthouse run (Gotcha 9). Either bring a "Measured live" fact back or retire the workflow (`docs/PENDING.md`).

### Adding a study

Never hard-code the number of studies anywhere; compute it from the collection (`getClients()`). To add one:

1. **MDX**: `src/content/case-studies/{slug}.mdx` with `hook`, `order` and `palette` filled, and the body chapters above. Renumber `order` so it runs 1..n in /work order.
2. **Captures in `public/assets/`**: footage `{slug}.mp4` and `{slug}-m.mp4`; stills `{slug}-m.webp`, `{slug}-cover.webp` and (with a CMS) `{slug}-cms.webp`; body images in `public/assets/study/`. `npm run capture:study {slug}` (add `--wix` for a Wix site) re-shoots the stills; look at every one. Then run `npm run stills` for the smaller `{slug}-m-320.webp` and `-448.webp` copies the cards use. Footage and phone stills are what the windows show. `npm run film:phone -- {slug} {url} --to "text at the lowest point"` films the phone footage (`{slug}-m.mp4`: 8 seconds, 60 fps, 584 by 1138, down the homepage and back) one settled frame at a time; `--click` closes a bar first, `--out` writes elsewhere for a look. Then run `npm run footage:stamp` so browsers fetch the new clip. Play a new clip and watch anything fixed to the screen: a back-to-top button caught mid-fade blinks in the footage (Theology Matters, re-filmed 2026-11-10).
3. **`study-images.json`**: add an entry (real `w` and `h`) for every image under `public/assets/study/` and for each clip poster.
4. **Deck**: add the slug to `DECK` in `src/lib/clients.ts` (a study missing from `DECK` goes last).
5. **Cover for share cards**: `src/assets/case-studies/{slug}.{png|jpg|webp}` (the `cover` field), then `npm run og:pages` writes `public/og/work/{slug}.png`.
6. **Gates**: `npm run test:unit` (palette contrast and order, sourced figures, quotes), then build, `npm run test:copy` and `npm run check:links`.

### Retiring a study

Delete the MDX, its `public/assets/{slug}*` files and `study/` images, its `study-images.json` entries, its `DECK` line, its `src/assets/case-studies/{slug}.*` cover and its `public/og/work/{slug}.png`. Renumber `order` 1..n. Add `/work/{slug}` and `/work/{slug}/` 301s to `/work/` in `public/_redirects`. Check whether a page names the study by slug (`QuoteBand` on home and About, `churches.astro`, `tests/routes.ts`, `tests/testimonials.spec.ts`, `src/lib/case-testimonials.test.ts`).

### Quotes

A client quote is only ever the client's own words. Record it verbatim in the vault note `projects/ncs-testimonials.md` first, then add it to the study's `testimonials` and the slug to `WITH_QUOTES` in `src/lib/case-testimonials.test.ts`, which fails on a quote in any other study. `date` is the day they wrote it (YYYY-MM-DD); `context` is an optional plain line that frames the quote honestly (Stone Steps: it is about the earlier refresh). Keep the client's own punctuation (Jonathan Balmer's em dash is his). Never fabricate or paraphrase one, and never add Review or AggregateRating JSON-LD for them: self-serving reviews are ineligible for rich results and a risk.

**`journal`**: buyer-question posts and build stories as MDX files in `src/content/journal/`, one page each at `/journal/{slug}/`. Required frontmatter: `title`, `summary` (110 to 160 characters: it is the meta description), `published`, `shortAnswer` (2 to 4 plain sentences with a real number; printed in the card at the top). Optional: `metaTitle` (40 characters, used when the title plus the studio name passes 64), `cluster` (`costs`, `churches`, `schools`, `nonprofits`, `accessibility`, `lab`: the index chips, labels in `src/lib/journal.ts`), `sector` (the end card's sector page), `receipt: true` (the short answer card prints PostReceipt.astro from `pricing.ts`; cost posts only), `updated` plus `changes` (always as a pair, or the build stops: the "Updated" stamp and the "What changed" line), `cover`, `tags`, `draft` (dev only, never in a production build, the RSS feed or a share card). Body: no H1; `##` headings become the contents rail, so keep them short; every table is followed by a paragraph starting `Source:` or `Sources:`; quote a price only as `pricing.ts` has it and re-read vendor prices when a post is updated. Drafts carry a `# CONFIRM` comment in their frontmatter listing the first-hand claims Nathan checks before publishing. No FAQPage schema. The post page and index are described in `.claude/rules/homepage-and-pages.md`.

**`photos`**: JSON entries in `src/content/photos/`. Required: `title`, `image` (path), `category` (`events`, `portraits`, `environments`), `year`. Optional: `caption`, `location`, `featured`. The directory is empty, so /photography/ is gated. A new, non-React gallery that reads this collection is still to be built (`docs/PENDING.md`).

### Voice

Site copy, pages, components and case-study MDX alike, is first person singular: "I", never "we", "our" or "us" about the studio. `npm run test:copy` enforces it on the built site (see `docs/TESTING.md`). A client's own words go in a `<blockquote>`, or behind `data-copy-ignore` with a comment, and stay verbatim. Do not claim capacity or scarcity ("a small number of projects each quarter") unless Nathan has confirmed it.

### Routes summary

Static routes generated at build time:

| Path               | Source                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `/`                | `src/pages/index.astro` (hero hand of clients, work grid, one quote band, prices, closing)                   |
| `/work/`           | `src/pages/work/index.astro` (sector filter, `?sector=`, `?view=list`)                                       |
| `/work/{slug}/`    | `src/pages/work/[slug].astro` (per case study)                                                               |
| `/churches/`       | `src/pages/churches.astro` (the large sector page; copy and metadata in `src/data/sector-pages.ts`)          |
| `/schools/`        | `src/pages/schools.astro`, drawn by `src/components/SectorLean.astro` from `sector-pages.ts`                 |
| `/nonprofits/`     | `src/pages/nonprofits.astro`, the same                                                                       |
| `/small-business/` | `src/pages/small-business.astro`, the same                                                                   |
| `/one-page/`       | `src/pages/one-page.astro` (the printable summary, one US Letter page)                                       |
| `/services/`       | `src/pages/services.astro` (nav label Prices)                                                                |
| `/contact/`        | `src/pages/contact.astro` (nav label Start a project; Web3Forms inquiry; prefill in `homepage-and-pages.md`) |
| `/about/`          | `src/pages/about.astro`                                                                                      |
| `/privacy/`        | `src/pages/privacy.astro`                                                                                    |
| `/accessibility/`  | `src/pages/accessibility.astro`                                                                              |
| `/colophon/`       | `src/pages/colophon.astro` (how the site is built)                                                           |
| `/photography/`    | `src/pages/photography.astro` (gated: noindex, not in the sitemap or the closing until 6 photos)             |
| `/journal/`        | `src/pages/journal/index.astro` (deck and list, cluster chips)                                               |
| `/journal/{slug}/` | `src/pages/journal/[slug].astro` (per entry)                                                                 |
| `/coming-soon/`    | `src/pages/coming-soon.astro` (always live, standalone)                                                      |
| `/404`             | `src/pages/404.astro`                                                                                        |
| `/rss.xml`         | `src/pages/rss.xml.js` (case studies feed)                                                                   |
| `/llms.txt`        | `src/pages/llms.txt.ts` (plain-text studio summary for AI tools, prerendered)                                |
| `/robots.txt`      | `public/robots.txt` (allows everything; names the AI crawlers explicitly)                                    |

Redirects: `/now` to `/about/` (Astro `redirects`), `/work/west-chester-preschool` to `/work/` (Astro `redirects`), and real 301s in `public/_redirects`: `/prices` to `/services/`, `/start` to `/contact/`, and the retired studies. There is no `[sector].astro` and no `/colophon/parts/` any more.

## Metadata and structured data

- **Titles and descriptions.** Every page passes `title` and `description` to BaseLayout. Titles stay at or under 60 characters and carry the studio name (the smoke spec checks for it); descriptions run 120 to 160 characters, written for the buyer in Nathan's first-person voice, no em-dashes. Case-study titles are built by `studyTitle()` in `src/lib/seo.ts` (sector form, then shorter forms until it fits); their descriptions come from `metaDescription`. Never hard-code the study count: `/work` and `/llms.txt` compute it from the collection. Prices in any description come from `pricing.ts`. `tests/metadata.spec.ts` fails on a long, short or duplicate title or description.
- **JSON-LD.** One `@graph` per page from `src/lib/schema.ts` (unit-tested in `schema.test.ts`). Fixed ids: `/#studio`, `/#website`, `/about/#nathan`; page ids hang off the canonical URL (`#webpage`, `#breadcrumb`, `#work`, `#article`). Nodes link with `{ '@id': ... }`. Every identity string comes from `site.ts`; the studio's telephone is `site.phone` exactly (Nathan's decision, 2026-10-30: keep the 256 number). Offers on /services are read from `pricing.ts`, and the spec checks each one appears on the page. Never add a rating, review or result that is not real and attributed. Nested pages pass `breadcrumbs` to BaseLayout. A sector page (`/churches/`) passes `pageType="CollectionPage"`, a Home > Churches trail and an ItemList of its studies by URL.
- **Share cards.** `BaseLayout` maps the pathname to `/og/{slug}.png`, written by `npm run og:pages`; a new page needs a run of it.
- **AI crawlers.** `public/robots.txt` names GPTBot, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended and CCBot with `Allow: /` (Nathan's decision, "allow AI"). `/llms.txt` lists the studio, prices and every case study (title, `hook`, summary, URL) from the same sources the pages use.
- After a deploy, run the Rich Results test on `/`, `/services/` and one case study (`docs/PENDING.md` item 0).
