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

## Content collections

Three collections live in `src/content/` with schemas declared in `src/content.config.ts`.

**`case-studies`**: long-form portfolio entries as MDX files in `src/content/case-studies/`. Each page at `/work/{slug}/` is auto-generated. Required frontmatter: `title`, `client`, `sector` (one of `church`, `school`, `nonprofit`, `small-business`), `services` (string array), `summary` (max 200 chars), `cover` (image path), `year` (int), `published` (date). Optional: `role` (e.g. "Designer, Developer, Photographer"), `tags` (string array for chip-style labels), `description` (longer paragraph, max 500 chars), `featured` (defaults false; the homepage Selected Work strip shows the three newest entries where `featured === true`), `updated` (date, surfaces as "Updated <month>" alongside the publish stamp), `stack` (string array, surfaces as a hover-reveal on the /work index card and inline on the detail page), `liveUrl` (URL to the shipped site; renders a "Visit the live site" link on the detail page, the strongest trust signal a web portfolio has), `outcome` (max 160 chars; the honest one-line result, surfaced in `--link` color on the /work card, the homepage strip, and the top of the detail page), and `testimonial` (`{ quote, name, title? }`; renders a pull-quote on the detail page, renders nothing when absent. Never fabricate it; an invented quote on a live client-facing site is dishonest and a liability), `results` (string array; a scannable "What changed" list rendered by `ResultsBlock`, real delivered outcomes only), and `designerNote` (a short signed first-person note rendered by `DesignerNote`).

To add a new case study: drop an `.mdx` file in `src/content/case-studies/`, fill in the frontmatter, drop the cover image at `src/assets/case-studies/{slug}.{png|jpg|jpeg|webp}` (basename must match the .mdx filename for plaiceholder lookup), write the body prose underneath. The next build creates the page at `/work/{filename}/`, includes it in the /work index, generates the blur preview, and adds the entry to `/rss.xml`.

**`journal`**: short-form essays and process notes as MDX files in `src/content/journal/`. Each page at `/journal/{slug}/` is auto-generated. Required frontmatter: `title`, `summary` (max 200 chars), `published` (date). Optional: `updated` (date), `cover` (image path), `tags` (string array), `draft` (boolean; drafts render in dev but are filtered out of production builds). The /journal index renders newest-first; drafts are skipped in production. Lighter-weight than case studies: no service badges, no sidebar TOC, but still gets ReadingProgress + reading-time stamps.

**`photos`**: JSON entries in `src/content/photos/`. Required fields: `title`, `image` (path), `category` (one of `events`, `portraits`, `environments`), `year`. Optional: `caption`, `location`, `featured`. Photography page wiring to read from this collection is planned. The `src/content/photos/` directory does not exist in git yet; create it with the first entry.

### Routes summary

Static routes generated at build time:

| Path               | Source                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `/`                | `src/pages/index.astro` (homepage: hero with client marquee, selected work, pricing teaser, process band) |
| `/about/`          | `src/pages/about.astro` (about + the merged "now" snapshot in its Currently section)                      |
| `/services/`       | `src/pages/services.astro`                                                                                |
| `/work/`           | `src/pages/work/index.astro` (with filter chips)                                                          |
| `/work/{slug}/`    | `src/pages/work/[slug].astro` (per case study)                                                            |
| `/photography/`    | `src/pages/photography.astro`                                                                             |
| `/journal/`        | `src/pages/journal/index.astro`                                                                           |
| `/journal/{slug}/` | `src/pages/journal/[slug].astro` (per entry)                                                              |
| `/contact/`        | `src/pages/contact.astro` (Web3Forms inquiry)                                                             |
| `/colophon/`       | `src/pages/colophon.astro` (how the site is built)                                                        |
| `/privacy/`        | `src/pages/privacy.astro`                                                                                 |
| `/accessibility/`  | `src/pages/accessibility.astro` (accessibility statement)                                                 |
| `/now`             | redirects to `/about/#now` (the page was merged into About)                                               |
| `/coming-soon/`    | `src/pages/coming-soon.astro` (always live, standalone)                                                   |
| `/404`             | `src/pages/404.astro` (custom not-found)                                                                  |
| `/rss.xml`         | `src/pages/rss.xml.js` (case studies feed)                                                                |
