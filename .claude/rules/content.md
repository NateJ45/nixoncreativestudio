---
paths:
  - 'src/content/**'
  - 'src/content.config.ts'
  - 'src/data/**'
  - 'src/pages/**'
---

# Content: site data, collections, routes

Moved out of CLAUDE.md. Loads when content, the collection schemas, site data or pages are touched.

## Content data and contact info

`src/data/site.ts` is the single source of truth for the studio's contact and identity values. Every component that displays an email, phone, name, studio name, business address, social URL, tagline, or domain imports from this module. Update a value here once and the Header wordmark, Footer columns, Contact sidebar, contact form's subject line, and the analytics + meta description all pick it up on the next build.

Edit `src/data/site.ts` when contact info, social URLs, or the studio name change. Do not hardcode any of those strings inside `.astro` components or pages; route them through `site`.

Every `mailto:` link site-wide has a graceful fallback (`src/scripts/mailto-fallback.ts`, wired in BaseLayout). A `mailto:` only opens something if the device has a mail app registered for it; on a desktop without one the click is a silent dead-end. The script lets the click proceed (so visitors who do have a mail app still get their composer), then checks whether focus left the page; if nothing opened, it copies the address and shows a confirmation toast (`.ncs-toast` in globals.css). It never blocks or delays the real `mailto:`. This is why an email click "doing nothing" on a machine with no mail client is expected behavior, not a broken link.

## Site navigation (`src/data/nav.ts`, overhaul 1.8)

The header, the mobile menu and the footer read one list. `getNav()` returns Work, Services, About plus the gated pages (header and MobileNav; Contact is left out because the "Start a project" button covers it); `getFooterNav()` adds Contact for the footer's Studio column, which is also the no-JS target of the menu button (`#site-nav`). Every href ends in a slash.

Two links are gated at build time so a link never points at an empty page: **Journal** appears once an entry is published (drafts count in `npm run dev` only, the same filter as /journal), and **Photography** once the `photos` collection holds `MIN_PHOTOS` (6) or more real photographs. Today both are off. To rename, reorder or add a page, edit `BASE` in `nav.ts`; the header, the mobile menu and the footer follow. The footer's Work column is not in `nav.ts`: it lists every case study straight from the collection, grouped by sector.

**The /photography gate (overhaul 2.8).** One rule, `photographyOpen(count)` in `src/data/photography-gate.ts` (`MIN_PHOTOS` lives there too; `nav.ts` re-exports it), decides four things together: the nav link (`nav.ts`), the page's robots `noindex` (BaseLayout's `noindex` prop in `src/pages/photography.astro`), the sitemap filter in `astro.config.mjs` (which counts the JSON files in `src/content/photos/` itself, because the content layer does not exist yet when the config runs), and the Photography line in `/llms.txt`. While it is closed the page still builds at `/photography/`: one real photo, the line "I photograph events, portraits and places across Cincinnati. The gallery is being assembled; ask for samples.", and a pill to `/contact/?service=photography`. Never put placeholder images on it. `tests/photography-gate.spec.ts` checks all of this against the real photo count. Ungating is in `docs/PENDING.md`.

## Content collections

Three collections live in `src/content/` with schemas declared in `src/content.config.ts`.

**`case-studies`**: long-form portfolio entries as MDX files in `src/content/case-studies/`. Each page at `/work/{slug}/` is auto-generated. Required frontmatter: `title`, `client`, `sector` (one of `church`, `school`, `nonprofit`, `small-business`), `services` (string array), `summary` (max 200 chars), `cover` (image path), `year` (int), `published` (date). Optional: `role` (e.g. "Designer, Developer, Photographer"), `tags` (string array for chip-style labels), `description` (longer paragraph, max 500 chars), `featured` (defaults false; unused since overhaul 2.2, when the home's Selected work switched to the three lowest `order` values), `updated` (date, surfaces as "Updated <month>" alongside the publish stamp), `stack` (string array, inline on the detail page), `liveUrl` (URL to the shipped site; renders the "Visit {domain} ↗" button in the detail page's title card and the Host fact, the strongest trust signal a web portfolio has), `outcome` (max 160 chars; the honest one-line result, surfaced in `--link` color on the homepage strip and under the summary at the top of the detail page's body), and `testimonial` (`{ quote, name, title? }`; renders a pull-quote on the detail page, renders nothing when absent. Never fabricate it; an invented quote on a live client-facing site is dishonest and a liability), `results` (string array; a scannable "What changed" list rendered by `ResultsBlock`, real delivered outcomes only), `designerNote` (a short signed first-person note rendered by `DesignerNote`), and `metaDescription` (120 to 160 chars; the study page's search description and CreativeWork description, written for a buyer in first person; falls back to `summary`).

#### Overhaul fields (package 1.6, 2026-10-30)

All optional in the schema, but every live study carries `hook`, `order` and `palette` (the reel and `case-palettes.test.ts` require them).

| Field                                     | Shape                                                                                                           | What it is for                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hook`                                    | string, max 90                                                                                                  | One true line about the live site in Nathan's plain voice. The hero reel's hover tag and "Now showing" ticker read it (`getReelSites()` in `src/data/reel.ts`); the title card shows it under the client name.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `order`                                   | int, 1..n                                                                                                       | Position in the study loop. Matches the /work order (newest `published` first); Up next hands off to `order + 1` and wraps. The unit test checks the set runs 1..n with no gaps.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `palette`                                 | `{ paper, ink, accent, accentInk, markDark?, dark?: { paper, ink, accent, accentInk? }, typeface, swatches[] }` | The client's own colours (six-digit hex) and faces, copied from the client repo's shipped tokens, or sampled with getComputedStyle from the live site when there is no repo (Orangeburg). Used only for surfaces, rules, swatches and non-text marks. `dark` only where the client site really ships a dark theme (today Stone Steps and Presbyterian Academy); never invent one. `markDark` is the client swatch used for marks on this site's dark ink when `accent` is under 3:1 there. `typeface` reads heading face first, e.g. `'Fraunces / Source Sans 3'`. A `# Palette source:` comment above each block says where the values came from. |
| `featureShot`, `beforeShot`, `mobileShot` | image paths, relative to the .mdx like `cover`                                                                  | Captures for the redesigned study page. `mobileShot` is `shots/{slug}-mobile.png` from `npm run capture:study`; `beforeShot` only where the old site was captured while still live (FRT, MAS, Stone Steps). `featureShot` feeds the Signature band ("The idea", package 2.4b), which the study page shows only when a study sets it (set in 2.4c to the feature each hook names; MAS, Reid and FBCM leave it unset because no current capture shows it). The stage is a `FramePair` of `shots/{slug}-home.png` (found by file name) and `mobileShot`.                                                                                              |
| `facts`                                   | `{ sector?, year?, role?, stack?: string[], host? }`                                                            | Overrides for the study's fact row. Each missing key falls back to the top-level field (`sector`, `year`, `role`, `stack`, the host of `liveUrl`). Leave it off unless the row should read differently, e.g. `year: '2024, rebuilt 2026'`.                                                                                                                                                                                                                                                                                                                                                                                                         |

Testimonial fields are not part of this set; Phase 2 widens `testimonial` to a list.

### Study body shape (overhaul 2.4c)

Every study body runs in the same order, and its H2s are the rail's chapter list:

1. No `<Signature>` in the body: the template renders the "The idea" band from `hook` and `featureShot`, between the stage and the brief. Set `featureShot` to a real still of the feature the hook names, or leave it unset when no capture shows it (MAS, Reid and FBCM today).
2. `## The brief`: prose.
3. `## Decisions`: one to three `<Decision title easy did>`, "the easy version" against "what I did", taken only from the study's own approach text and designer note, with any supporting prose after them.
4. `## What I built`: `<FeatureHighlight>` rows (real, live features only), then "The full build" list.
5. `## Before and after`: `<BeforeAfter>`, only where `beforeShot` exists. `beforePlatform` / `afterPlatform` only where the study already names the old platform.
6. `## Walk the homepage`: `<SiteShowcase>`.
7. `<ResultsBlock items={[...]} />`: "What changed". A row is a plain sentence, or `{ figure, text, source }` set at display size; a figure without a real `source` is not allowed (`src/lib/case-results.test.ts`). The ledger lives in the body now, so a study does not also set frontmatter `results:` (the test fails on both; the template would print the ledger twice).
8. `<Lightbox />` when the page has a zoomable screenshot.

Comments in an MDX body get mangled by prettier (`{/* */}` becomes `{/_ _/}`), so notes about a study go in the frontmatter's YAML comments.

#### The case-study page (package 2.4a)

`src/pages/work/[slug].astro`, top to bottom: the title card (a band in `palette.paper` with a 4px `palette.accent` top rule, text in this site's own colours (client colours never carry text); in dark mode this site's ink with only the client's dark mark and swatches, ruling 8) holding the breadcrumb (Work / {sector plural} / {client}, the same trail as the BreadcrumbList JSON-LD, the sector crumb linking to `/work/?sector={sector}`), the client name as the H1 (`text-h1-long`, the whole name in one `Heft`), the `hook` at 1.5rem/300 (falls back to `summary`), the "Visit {domain} ↗" pill, the stage (`FramePair`, `lcp`, `transition:name="cover-{id}"`, never `data-reveal`) and the Specimen strip. Then the rail (`StudyRail`: facts and chapters) beside the body (`summary`, `outcome`, the MDX, `results`, `designerNote`, `testimonial`), the Up next panel (the next study by `order`, looping) and the footer's sector closer. `title`, `services` and `tags` are no longer shown on the page (`title` still feeds the page title and JSON-LD, `services` the keywords). Print: the ink footer, Up next and the chapter list drop out, and hosts print as full URLs.

To add a new case study: drop an `.mdx` file in `src/content/case-studies/`, fill in the frontmatter, drop the cover image at `src/assets/case-studies/{slug}.{png|jpg|jpeg|webp}` (basename must match the .mdx filename for plaiceholder lookup), write the body prose underneath. The next build creates the page at `/work/{filename}/`, includes it in the /work index, generates the blur preview, and adds the entry to `/rss.xml`.

### Retire or add a study: checklist

Never hard-code the number of studies anywhere; compute it from the collection. Then, for each study added or retired, walk this list:

1. **MDX**: add `src/content/case-studies/{slug}.mdx` with `hook`, `order` and `palette` filled (or delete it). Renumber `order` so it still runs 1..n in /work order; that is the Up next loop.
2. **Captures**: `npm run capture:study {slug}` (add `--wix` for a Wix site) for the cover and the `shots/` files, and look at every one. On retire, delete `src/assets/case-studies/{slug}.png` and `shots/{slug}-*`.
3. **Reel**: add or remove the site in `reelSites` and `reelColumns` in `src/data/reel.ts`, then `node scripts/capture-reel.mjs {slug}` (or delete `src/assets/reel/{slug}-*.jpg`).
4. **OG card**: `npm run og:pages` writes `public/og/work/{slug}.png`; delete it on retire.
5. **Redirects**: on retire, add `/work/{slug}` and `/work/{slug}/` 301s to `/work/` in `public/_redirects`.
6. **Routes**: `tests/routes.ts` lists one sample study (Stone Steps); change it only if that study is the one retiring.
7. **Gates**: `npm run test:unit` (palette contrast and order, sourced figures), then build and `npm run check:links`.

**`journal`**: short-form essays and process notes as MDX files in `src/content/journal/`. Each page at `/journal/{slug}/` is auto-generated. Required frontmatter: `title`, `summary` (max 200 chars), `published` (date). Optional: `updated` (date), `cover` (image path), `tags` (string array), `draft` (boolean; drafts render in dev but are filtered out of production builds). The /journal index renders newest-first; drafts are skipped in production. Lighter-weight than case studies: no service badges, no chapter rail, but still gets the CSS reading bar (`ScrollProgress`) and reading-time stamps.

**`photos`**: JSON entries in `src/content/photos/`. Required fields: `title`, `image` (path), `category` (one of `events`, `portraits`, `environments`), `year`. Optional: `caption`, `location`, `featured`. The directory holds only a `.gitkeep` today, so the collection is empty and /photography is gated (above). Each entry's image goes in `src/assets/photography/` (also empty: the gradient placeholder files were deleted in overhaul 2.8). The gallery that reads this collection comes back in package 4.6.

### Voice

Site copy, pages, components and case-study MDX alike, is first person singular: "I", never "we", "our" or "us" about the studio. `npm run test:copy` enforces it on the built site (see `docs/TESTING.md`). A client's own words go in a `<blockquote>`, or behind `data-copy-ignore` with a comment, and stay verbatim. Do not claim capacity or scarcity ("a small number of projects each quarter") unless Nathan has confirmed it.

### Routes summary

Static routes generated at build time:

| Path               | Source                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `/`                | `src/pages/index.astro` (homepage: hero reel, selected work, pricing teaser, process band)                   |
| `/about/`          | `src/pages/about.astro` (about + the merged "now" snapshot in its Currently section)                         |
| `/services/`       | `src/pages/services.astro`                                                                                   |
| `/work/`           | `src/pages/work/index.astro` (sector tabs, `?sector=`)                                                       |
| `/work/{slug}/`    | `src/pages/work/[slug].astro` (per case study)                                                               |
| `/photography/`    | `src/pages/photography.astro` (gated: noindex, not in the sitemap or menus until 6 real photos)              |
| `/journal/`        | `src/pages/journal/index.astro`                                                                              |
| `/journal/{slug}/` | `src/pages/journal/[slug].astro` (per entry)                                                                 |
| `/contact/`        | `src/pages/contact.astro` (Web3Forms inquiry)                                                                |
| `/colophon/`       | `src/pages/colophon.astro` (how the site is built)                                                           |
| `/colophon/parts/` | `src/pages/colophon/parts.astro` (noindex check page for the shared components, not in the sitemap or menus) |
| `/privacy/`        | `src/pages/privacy.astro`                                                                                    |
| `/accessibility/`  | `src/pages/accessibility.astro` (accessibility statement)                                                    |
| `/now`             | redirects to `/about/#now` (the page was merged into About)                                                  |
| `/coming-soon/`    | `src/pages/coming-soon.astro` (always live, standalone)                                                      |
| `/404`             | `src/pages/404.astro` (custom not-found)                                                                     |
| `/rss.xml`         | `src/pages/rss.xml.js` (case studies feed)                                                                   |
| `/llms.txt`        | `src/pages/llms.txt.ts` (plain-text studio summary for AI tools, prerendered)                                |
| `/robots.txt`      | `public/robots.txt` (allows everything; names the AI crawlers explicitly)                                    |

## Metadata and structured data (overhaul 1.9, 2026-10-30)

- **Titles and descriptions.** Every page passes `title` and `description` to BaseLayout. Titles stay at or under 60 characters and carry the studio name (the smoke spec checks for it); descriptions run 120 to 160 characters, written for the buyer in Nathan's first-person voice, no em-dashes. Case-study titles are built by `studyTitle()` in `src/lib/seo.ts` (sector form, then shorter forms until it fits); their descriptions come from `metaDescription`. Never hard-code the study count: `/work` and `/llms.txt` compute it from the collection. Prices in any description come from `pricing.ts`. `tests/metadata.spec.ts` fails on a long, short or duplicate title or description.
- **JSON-LD.** One `@graph` per page from `src/lib/schema.ts` (unit-tested in `schema.test.ts`). Fixed ids: `/#studio`, `/#website`, `/about/#nathan`; page ids hang off the canonical URL (`#webpage`, `#breadcrumb`, `#work`, `#article`). Nodes link with `{ '@id': ... }`. Every identity string comes from `site.ts`; the studio's telephone is `site.phone` exactly (Nathan's decision, 2026-10-30: keep the 256 number). Offers on /services are read from `pricing.ts`, and the spec checks each one appears on the page. Never add a rating, review or result that is not real and attributed. Nested pages pass `breadcrumbs` to BaseLayout.
- **AI crawlers.** `public/robots.txt` names GPTBot, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended and CCBot with `Allow: /` (Nathan's decision, "allow AI"). `/llms.txt` lists the studio, prices and every case study (title, `hook` when present, summary, URL) from the same sources the pages use.
- After a deploy, run the Rich Results test on `/`, `/services/` and one case study (`docs/PENDING.md` item 0).
