---
paths:
  - 'cms/**'
  - 'src/lib/**'
  - 'src/data/**'
  - 'src/pages/**'
  - 'scripts/cms/**'
  - 'scripts/lib/**'
  - 'scripts/ci-dataset/**'
  - 'seed/**'
  - 'plugins/**'
---

# CMS, content editing and site data

Moved out of CLAUDE.md. Loads when CMS schema, content, readers, pages or the loader scripts are touched.

## Content editing (CMS-DESIGN PR 14: how Nathan runs the site by hand)

Everything editable lives in the EmDash admin at `/_emdash/admin`; `docs/EDITING-GUIDE.md` is the plain-language walkthrough Nathan follows (a table of "I want to change X, go to Y", three practice edits, adding a case study, Journal entry, photo, redirect and menu link, rollback). Keep that guide true: a change to what the admin offers updates it in the same piece of work.

- **Where each thing lives.** One `cms/schema/<collection>.mjs` per collection (the one definition of its fields, limits and sidebar settings), one `cms/content/<collection>.json` per collection (the committed fallback and the seed). Singleton pages are `page_*` collections with one entry each (`page_home`, `page_about`, `page_services`, `page_contact`, `page_work`, `page_photography`, `page_journal`, `page_not_found`); `site_settings` holds the shared contact and chrome copy; `pricing_tiers`, `pricing_addons` and `service_offerings` hold the repeated blocks; `pages` holds Privacy, Accessibility and Colophon; `posts` is the Journal; `photos`, `case_studies`, menus and redirects complete the set.
- **Publishing.** Save keeps a draft, Publish makes it live; a publish purges the cached pages by tag, so an edit shows within seconds (Nathan confirmed this on 2026-10-03). The route cache's 5-minute lifetime is only the fallback if a purge is missed. Say "within seconds, five minutes at worst", never "about 5 minutes".
- **Journal Summary is required, in code.** The schema cannot make an existing optional field required (Gotcha 17), so `src/lib/journal.ts` hides any entry with an empty Summary. The guide says so in bold: an entry without a Summary is silently hidden.
- **The admin's "live view" button** uses each collection's `urlPattern`. A fixed address with no `{slug}` is valid (EmDash's `compileUrlPattern` accepts zero placeholders; the admin's `contentUrl()` just returns the pattern), so every `page_*` collection carries its page's address (`/`, `/about/`, ... `/404/`), `site_settings` points at `/`, the pricing and offerings collections at `/services/`, `photos` at `/photography/`. Without a pattern the admin guesses `/<collection>/<slug>/`, which is a 404 for a singleton. A new collection that maps to a public page gets a `urlPattern` in its schema file; `src/lib/cmsSchema.test.ts` lists every collection's expected pattern and fails if one is missing.
- **Sidebar order and groups** are collection settings (`sortOrder`, `group`) in the schema files: Site settings (0), Pages group (1 to 9), Pricing & services (10 to 12), Case Studies (13), Journal (14), Photography (15). Taxonomies follow their collection's group. EmDash cannot hide Comments, Widgets, Sections or Bylines; they are empty and the guide says to ignore them. `npm run cms:tidy -- --url <instance> [--dry-run]` deletes the unused template `category` taxonomy (refuses if it has terms) and reports leftover widget areas, sections and menus.
- **The Content Types screen is the dangerous one.** Deleting or retyping a field there deletes its data and History does not cover it. The recommendation in the guide is a second Editor-role login (needs a second email address from Nathan; docs/CMS-DESIGN.md question 1); the recovery is `cms/schema` plus `apply-schema.mjs` and D1 Time Travel.
- **What stays in code** (button hrefs, UI strings, templates, OG card titles, analytics IDs, brand tokens): docs/CMS-DESIGN.md 1.14. The optional catch-all `src/pages/[slug].astro` for brand-new plain pages was designed and deliberately NOT built (Nathan has not answered question 8, and a catch-all route puts the 404 path at risk); a new plain page is a code change.
- **Production data steps are run by the main session**, in Nathan's presence, with `npm run cms:production-load` (schema and content, ending in a read-only "unchanged" re-check) and `npm run cms:tidy`. Never from a delegated agent, never without `--dry-run` first. The login `npx emdash login` stores expires within hours; any read through the CLI (for example `npx emdash content list pages --url <prod>`) refreshes it, otherwise log in again.

## Content data and contact info

The studio's contact and identity values live in the EmDash admin, under **Site settings** (collection `site_settings`, one entry with the slug `site`; schema `cms/schema/site_settings.mjs`). `src/data/site.ts` is the only way the site reads them: `const site = await getSite(Astro)` in an `.astro` file (or `getSite(context)` in an endpoint). Every component that displays an email, phone, name, studio name, location, social URL, tagline, the footer "Currently" line or the default closing-banner copy goes through it, so one edit in the admin reaches the Header wordmark, the Footer, the phone menu, the Contact sidebar, the JSON-LD, the feed title and the meta fallback within seconds of publishing (the publish purges the cached pages; the 5-minute lifetime is only the backup). `getSite()` reads once per request (memoised on `Astro.request`) and tags the page so a publish purges it.

**Fallback.** If the entry is missing, unpublished or unreadable, `getSite()` serves `cms/content/site_settings.json` (the literal values the old `site.ts` held) and logs a `[cms] ...` line; the menus fall back to `cms/content/menus.json` the same way. Production had no data loaded when this shipped (it needs `EMDASH_TOKEN`, see docs/LAUNCH-RUNBOOK.md), so until the load runs the live site renders from the fallback and looks exactly as before. Edit the JSON when a default changes; edit the admin for day-to-day changes.

Stays in code, on purpose: `SITE_DOMAIN` and `SITE_URL` (bound to the deployment and the admin passkey origin; import them when you only need the origin). Do not hardcode any contact or identity string inside `.astro` components or pages. A React island must not import `src/data/site.ts` (it would put the CMS reader in the browser bundle): pass values in as props from the Astro parent, as `Header.astro` does for `MobileNav`.

**Menus.** The header nav is the `primary` menu and the footer nav the `footer` menu (Menus in the admin). A menu item's "Title attribute" is shown as the visible descriptor under its label in the phone menu, never as an HTML `title`. The Journal auto-hide stays in code: any item whose URL starts with `/journal` is dropped while no journal entry is published (`hasJournalEntries()`, a draft does not count). Contact is not in `primary` (it is the header "Start a project" button).

Every `mailto:` link site-wide has a graceful fallback (`src/scripts/mailto-fallback.ts`, wired in BaseLayout). A `mailto:` only opens something if the device has a mail app registered for it; on a desktop without one the click is a silent dead-end. The script lets the click proceed (so visitors who do have a mail app still get their composer), then checks whether focus left the page; if nothing opened, it copies the address and shows a confirmation toast (`.ncs-toast` in globals.css). It never blocks or delays the real `mailto:`. This is why an email click "doing nothing" on a machine with no mail client is expected behavior, not a broken link.

## Content collections

There are no Astro content collections and no `src/content/` folder (CMS-DESIGN PR 12 deleted them); case studies, the journal and photos are EmDash collections (see the hybrid section at the top). `src/live.config.ts` is the only content config.

**Case studies are not an Astro collection any more.** They live in EmDash (collection `case_studies`); see the hybrid section at the top and `docs/EMDASH-SCHEMA.md`. To add one, use the admin at `/_emdash/admin/`. Its OG card appears at the next build (`npm run og:pages` reads the live site).

**`journal`** (the EmDash `posts` collection, Journal in the admin): short-form essays and process notes. Each page at `/journal/{slug}/` is one published entry. Required: title and Summary (max 200 characters); optional: Cover image, Body, Last updated, Tags. Save as a draft to stage an entry (never visible); publish to put it on `/journal/`. The /journal index renders newest-first. Lighter-weight than case studies: no service badges, no sidebar TOC, but still gets ReadingProgress and reading-time stamps. Details above ("Since CMS-DESIGN PR 12").

**`photos`**: the Photography page reads the `photos` collection in EmDash (Photography, Photos in the admin; fields `title`, `image`, `alt`, `category` events, portraits or environments, `year`, optional `caption`, `location`, `featured`, `sort_order`).

### Routes summary

Routes (all server-rendered per request, route-cached):

| Path               | Source                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `/`                | `src/pages/index.astro` (homepage: hero with client marquee, selected work, pricing teaser, process band) |
| `/about/`          | `src/pages/about.astro` (about + the merged "now" snapshot in its Currently section)                      |
| `/services`        | `src/pages/services.astro`                                                                                |
| `/work/`           | `src/pages/work/index.astro` (lead print, live sheet, Also built strip)                                   |
| `/work/{slug}/`    | `src/pages/work/[slug].astro` (per case study)                                                            |
| `/photography/`    | `src/pages/photography.astro`                                                                             |
| `/journal/`        | `src/pages/journal/index.astro`                                                                           |
| `/journal/{slug}/` | `src/pages/journal/[slug].astro` (per entry)                                                              |
| `/contact/`        | `src/pages/contact.astro` (Web3Forms inquiry)                                                             |
| `/colophon/`       | `src/pages/colophon.astro` (how the site is built)                                                        |
| `/privacy/`        | `src/pages/privacy.astro`                                                                                 |
| `/accessibility/`  | `src/pages/accessibility.astro` (accessibility statement)                                                 |
| `/now`             | 301 to `/about/#now` (an EmDash Redirects row)                                                            |
| `/coming-soon/`    | `src/pages/coming-soon.astro` (always live, standalone)                                                   |
| `/404`             | `src/pages/404.astro` (custom not-found)                                                                  |
| `/rss.xml`         | `src/pages/rss.xml.js` (case studies feed)                                                                |
