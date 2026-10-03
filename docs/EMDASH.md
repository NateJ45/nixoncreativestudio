# EmDash CMS trial (branch `emdash-trial`, history)

> **The trial instance has been replaced.** CI previews now run on the small `ncs-ci`
> Worker, D1 and R2 (docs/TESTING.md, "The `ncs-ci` dataset"), and the trial Worker,
> database, bucket and KV namespace described below were deleted after that change
> merged. Everything below is the record of the trial as it was on 2026-10-02.

Started 2026-10-02. Trying Cloudflare's EmDash 1.1.0 on this portfolio. Nothing
here touches the live site: it deploys as its own Worker.

## What exists

| Thing       | Value                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| Trial site  | https://ncs-emdash-trial.nathanjnixon86.workers.dev                                                   |
| Admin       | `/_emdash/admin` (first visit runs the setup wizard)                                                  |
| Worker      | `ncs-emdash-trial` (live Worker `nixoncreativestudio` is untouched)                                   |
| D1 database | `ncs-emdash` (id in `wrangler.jsonc`), binding `DB`                                                   |
| R2 bucket   | `ncs-emdash-media`, binding `MEDIA`                                                                   |
| Secret      | `EMDASH_ENCRYPTION_KEY` on the Worker; local copy in `.env` (gitignored)                              |
| Files added | `src/worker.ts`, `src/live.config.ts`, EmDash block in `astro.config.mjs`, `wrangler.jsonc` rewritten |

## How it coexists with the site

The site stays `output: 'static'`; EmDash built fine that way and every existing
page still prerenders. Case studies, journal and photos remain Astro content
collections in git. EmDash does NOT import them (docs: "EmDash does not copy
file-based entries into its database"), so the CMS is empty until collections
are created in the admin and pages are changed to call `getEmDashCollection()`.

## Gotchas found

1. **zustand vs EmDash shim.** EmDash aliases `use-sync-external-store/shim/with-selector.js`
   to a shim with named exports only. `zustand` (via `@react-three/fiber`, the
   WebGL hero) default-imports it, so the build failed with `MISSING_EXPORT`.
   A small Vite plugin in `astro.config.mjs` (`ncs-zustand-sync-store-shim`)
   rewrites zustand's import. Re-check after upgrading emdash or zustand.
2. **Sessions.** The live site had `session: false`; EmDash sign-in then fails with "needs an Astro session driver". Removed it; the adapter now uses KV binding `SESSION` (namespace `ncs-emdash-sessions`).
3. The Cloudflare API MCP connector in Claude Code has an invalid token; all
   provisioning was done with the wrangler OAuth login instead.

## Deploy / redeploy

**Production** deploys only from Workers Builds on a push to `main` (build `npm run build`, deploy `npx wrangler deploy`, both using the top level of `wrangler.jsonc`). Do not run `wrangler deploy` locally without `CLOUDFLARE_ENV`: since the 2026-10 cutover config, the default is the live Worker.

**CI previews** use the `ci` environment in `wrangler.jsonc` (Worker `ncs-ci`, D1 `ncs-ci`, R2 `ncs-ci-media`, KV `ncs-ci-sessions`: a three-case-study sample, see docs/TESTING.md). GitHub Actions builds with `CLOUDFLARE_ENV=ci`, so the required checks never read production data. To redeploy it by hand:

```
CLOUDFLARE_ENV=ci npm run build && CLOUDFLARE_ENV=ci npx wrangler deploy
```

## Status (2026-10-02)

- Setup wizard done, admin passkey registered, CLI logged in
  (`npx emdash login --url <trial url>`, device-code flow approved in the browser).
- The empty-site template shipped `pages` and `posts` collections (kept; the journal may use them). The test post and `src/pages/emdash-test.astro` were deleted in the taxonomy pass.
  Pages that read EmDash need `export const prerender = false` (the rest of the site stays prerendered).

## Open

- Decide whether the journal (or case studies) should move into EmDash. They
  are still MDX in git; EmDash does not import them.
- Custom domain: set `EMDASH_SITE_URL` first, or passkeys break.

## Case studies now read from EmDash (2026-10-02)

Every page that reads case studies now reads the EmDash `case_studies`
collection (shape in `docs/EMDASH-SCHEMA.md`). The old MDX files and the Astro
`case-studies` collection are still in the repo, untouched, until cutover.

Converted:

- `src/lib/caseStudies.ts` (new): the one reader. `getCaseStudies()` (sorted
  newest project date first, `featured` as a boolean), body helpers
  (`splitBody`, `bodyHeadings`, `slugify`), and `CACHE_CONTROL`.
- `src/pages/work/index.astro`, `src/pages/work/[slug].astro` (now a server
  route, no getStaticPaths; unknown slug returns an empty-body 404 so Astro
  serves the site 404 page with a real 404 status), `src/pages/rss.xml.js`.
- `src/components/SelectedWork.astro`, `ClientMarquee.astro`, `Testimonials.astro`.
- Pages that render those components became server-rendered too: `/` (index),
  `/about`, `/services`. Everything else stays prerendered.
- New: `src/components/emdash/EmDashCover.astro` (CaseStudyCover equivalent),
  `src/components/emdash/CaseHeading.astro` (adds h2/h3 ids for the TOC).
- `SiteShowcase`, `FeatureHighlight`, `BeforeAfter` accept EmDash image values
  (`desktop`/`mobile`, `image`, `beforeImage`/`afterImage`) as well as the old
  imports, so the static MDX pages keep working.

(SUPERSEDED by "Route cache" at the end of this file: the `CACHE_CONTROL` header
was removed in CMS-DESIGN PR 2.) Caching: server pages send `Cache-Control: public, max-age=0, s-maxage=300,
stale-while-revalidate=86400`. Astro route caching (`Astro.cache`) is not
configured in `astro.config.mjs` (EmDash logs "cache.set() was called but
caching is not enabled"), so a header is used. Note a Worker response is not
cached by Cloudflare automatically on workers.dev; the header only takes effect
behind a cache rule or the Cache API on the production zone.

Known gaps found while converting:

1. **No image resizing.** EmDash's `Image` emits a srcset whose every entry is
   the same original file, because `imageService: 'compile'` cannot transform a
   runtime remote URL. Covers are 0.7 to 1.9 MB PNGs and the full-page captures
   up to 7 MB, versus the resized WebP the static site serves. Needs Cloudflare
   Images (or an R2 resize step) before cutover.
2. **Sitemap.** `@astrojs/sitemap` only lists prerendered routes, so `/`,
   `/work/` and the 10 `/work/<slug>/` URLs drop out. Add them via `customPages`
   in `astro.config.mjs`.
3. OG image: the page no longer passes `ogImage`, so BaseLayout derives
   `/og/work/<slug>.png` (the live site currently points at the cover JPG).

## Image resizing (solved 2026-10-02)

EmDash's `Image` builds its `srcset` through Astro's image service. With the
old `imageService: 'compile'` alone, every srcset entry pointed at the
full-size original (covers 0.7 to 1.9 MB). Two settings fix it, both in
`astro.config.mjs`:

1. `cloudflare({ imageService: { build: 'compile', runtime: 'cloudflare-binding' } })`
   keeps build-time optimization for the site's own images and adds the
   Cloudflare Images binding (`IMAGES`, auto-created) for CMS media at runtime.
2. `image.remotePatterns` must list every origin that serves media (production
   domain, www, and the trial workers.dev host). Without it Astro silently
   passes the URL through and the srcset repeats the original.

Measured on the trial: a 666 KB PNG cover serves as 31 KB WebP at 640w and
63 KB at 1080w. Cost note: Cloudflare Images transformations are free up to
5,000 unique transformations a month (each image-at-a-width counts once), far
above this site's roughly 50 images x 8 widths.

## Editor-friendly schema pass (2026-10-02)

Services, tags and stack were raw JSON textareas in the editor. Now:

- `services`, `tags`, `stack` are flat taxonomies `service`, `topic`, `stack` (chip pickers
  in the sidebar). `topic` rather than `tag` because the template's built-in `tag`
  taxonomy belongs to posts. `results` is a repeater of `{ text }`; `sector` and
  `showcase_variant` are selects with real options.
- Indexed: published, featured, year, sector. Searchable: title, summary, body.
  Collection supports drafts, revisions, seo, search; sidebar group "Portfolio".
- `src/lib/caseStudies.ts` reads terms from `entry.data.terms` and sorts them by the
  taxonomy's term order (hydrated terms are alphabetical, the MDX lists were not).
  Markup is unchanged: server pages match the live site's page heights at 1440 and
  390, filter chips give the same counts, axe is clean in both themes.
- Schema definition: `scripts/lib/case-studies-schema.mjs`; run via
  `scripts/emdash-schema-case-studies.mjs` and `scripts/migrate-case-studies.mjs`
  (need `EMDASH_TOKEN` for the REST steps). `seed/seed.json` (from
  `scripts/export-seed-from-instance.mjs`) will create the production schema.
  Full detail in docs/EMDASH-SCHEMA.md.

## Tooling for the server-rendered site (CI, tests, OG cards)

The repo used to assume `dist/client` was the whole site. It is not any more:
the pages that read EmDash are server-rendered, so every gate that served or
crawled a static tree now takes a URL. The map:

| Tool              | Takes                                         | In CI                                                |
| ----------------- | --------------------------------------------- | ---------------------------------------------------- |
| Playwright suites | `PLAYWRIGHT_BASE_URL`                         | Worker version preview from `ci.yml`                 |
| Link check        | `LINKCHECK_URL` (else `dist/client`)          | the same preview                                     |
| Lighthouse CI     | `LHCI_BASE_URL` via `scripts/lhci-config.mjs` | its own preview from `lighthouse.yml` (alias `lh-*`) |
| Parity harness    | `--url <base>` (else `dist/client`)           | not in CI, by design                                 |
| OG cards          | `EMDASH_URL` (default: production)            | read at build time, fail-soft                        |

**Preview versions.** `.github/actions/preview-version` runs
`npx wrangler versions upload --preview-alias <ci|lh>-<branch or pr-N>` after
`npm run build` (wrangler follows `.wrangler/deploy/config.json` to
`dist/server/wrangler.json`). The version is not promoted, so production
traffic is untouched. In CI it runs on the **`ncs-ci` bindings** (D1, R2, KV), which
is the point: an isolated `wrangler preview` would start with empty storage and
render every server page with no content, and production data is never read.
Read-only for the suites. The URL is
parsed from the `version-upload` line of the `WRANGLER_OUTPUT_FILE_PATH` ndjson
(`preview_alias_url`; field names read from the wrangler 4.146 source), falling
back to the log line `Version Preview Alias URL: https://...`. Aliases need
lowercase letters, digits and dashes, a leading letter, and
`<alias>-<worker-name>` within 63 characters, so the action truncates the branch
slug to 28 characters. Preview URLs exist only if the Worker's workers.dev
previews are on (the default) and the Worker implements no Durable Object; if the
upload returns no URL the action fails with that explanation. Needs the repo
secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (docs/PENDING.md);
without them the preview-dependent steps skip with a warning.

**OG cards.** `scripts/generate-og.mjs` cannot use the REST content API (401
without a login), so it reads `/rss.xml` (slug, title), `/work/<slug>/` (first
`<img>` = cover, whose URL carries the media id) and
`/_emdash/api/media/file/<id>` (original bytes) from `EMDASH_URL`. Verified
2026-10-02 against the trial: nine case studies read, and the regenerated cards
are byte-identical to the committed ones. An unreachable instance keeps every
committed `public/og/work/*.png` and exits 0.

## Image caching and measured performance (2026-10-02)

EmDash serves media, and Astro's `/_image` resizer serves the resized WebP, both
with `Cache-Control: max-age=0, must-revalidate`, so every view re-ran the
transform (about 0.22s each). `src/worker.ts` now wraps the EmDash handler for
GET requests to `/_image` and `/_emdash/api/media/file/`: it sets a 30-day
cache header and stores the response in Cloudflare's edge cache. Measured on
the trial: a never-seen width took 1.36s once, then 0.12s afterwards.

Why it lives in the Worker entry: it is outermost, so it does not depend on
middleware order. A first attempt as `src/middleware.ts` was judged broken only
because the check used `curl -I`; HEAD requests are skipped on purpose, so the
attempt was never proven to fail. Test with GET: `curl -s -D - -o /dev/null <url>`.

Throttled-mobile trace (Fast 4G, 4x CPU) of a case study, trial vs live:
LCP 1.41s vs 1.43s once warm. The first load after a deploy measured 3.68s
because the resized images did not exist yet; the cache above is what keeps
real visitors off that path. The gate is LCP under 4.5s.

## Trusted image hosts are a silent failure (found by Lighthouse CI, 2026-10-02)

Lighthouse CI hard-failed LCP at 8.0 s on `/work/` and 11.5 s on a case study
(gate: 4.5 s). The report showed 700 KB to 1.1 MB raw PNGs: the CI preview lives
at `lh-pr-47-ncs-emdash-trial.nathanjnixon86.workers.dev`, which was not in
`image.remotePatterns`, so Astro served the originals instead of `/_image`
WebP. No error, no warning. `image.remotePatterns` now trusts
`**.nathanjnixon86.workers.dev` (trial, CI aliases, version URLs, the production
workers.dev URL) plus the apex and `www`. Verified on a preview alias: 9 resized
images, 0 raw. Rule: any new host that serves the site (a custom domain, a
staging alias) must be added to that list, or its CMS images go out full size.

## The 4096px resizer limit (found by Lighthouse CI, 2026-10-02)

Cloudflare's image resizer silently returns the **untouched original** for any
request whose height is 4096 px or more (every fit mode; width-only requests
for the same file work). EmDash's `Image` always sends width AND height, so the
tall full-page showcase screenshots came back as 6.9 MB and 2.6 MB PNGs, which
made the homepage 10.9 MB in Lighthouse (the branch's biggest regression against
`main`'s 1.7 MB). `src/components/emdash/ScrollShot.astro` renders those
screenshots with width-only `/_image` URLs instead (160 to 380 KB each) and is
used by `SelectedWork` (with `defer`, so the six cards stop competing with the
hero image; see CLAUDE.md Gotcha 14) and the EmDash mode of `SiteShowcase`. Use it for any
CMS image taller than about 4000 px; ordinary images keep using `Image` from
`emdash/ui`. Symptom of hitting the limit again: an image whose transfer size
equals the original file size, with `content-type: image/png` from `/_image`.

## Route cache (CMS-DESIGN PR 2, 2026-10-03)

The site is `output: 'server'`: every page renders on the Worker, nothing is
prerendered, and `dist/client` holds only assets. A route cache keeps that fast.

**How it is wired**

- `astro.config.mjs`: `cache: { provider: cacheCloudflare() }` (from
  `@astrojs/cloudflare/cache`) and EmDash `toolbar: 'client'`. The adapter then
  writes `cache: { enabled: true }` into the generated wrangler config, which
  turns on Cloudflare **Workers Cache**: a cache in front of the Worker, owned by
  the Worker, partitioned by Worker version (every deploy starts cold). It works
  on workers.dev previews as well as on the production zone, and zone Cache Rules
  have no effect on it.
- `src/lib/routeCache.ts`: `cachePublicPage()`, called from `BaseLayout` (and
  `coming-soon.astro`, which has no layout), sets the lifetime (`PAGE_MAX_AGE`,
  5 minutes, plus `PAGE_SWR`, a week of stale-while-revalidate). It skips `?_edit`
  and `?_preview`.
- `src/lib/caseStudies.ts`: `getCaseStudies(Astro.cache)` and
  `getCaseStudy(slug, Astro.cache)` call `cache.set(cacheHint)` for the rows and
  the three taxonomies they read, so each page carries those cache tags.
- The adapter turns the hints into `Cloudflare-CDN-Cache-Control` and `Cache-Tag`
  headers. EmDash's publish, unpublish and term routes call
  `cache.invalidate({ tags })`, which is `cache.purge({ tags })` on the platform.
- `src/worker.ts` is the safety net: anything that is not a clean 200, or that
  sets a cookie, is forced to `no-store`; unknown slugs also call
  `Astro.cache.set(false)`.
- No global `routeRules` (the design sketch had `'/[...path]'`): it would also
  match `/_emdash/**` and make signed-in admin responses cacheable.

**Measured on ncs-ci, 2026-10-03** (curl TTFB, 10 GETs each, before = `main`,
after = this PR; first request after a deploy is a cold MISS):

| Page                                 | Before (median / max) | After warm (median / max) | After first request (MISS) |
| ------------------------------------ | --------------------- | ------------------------- | -------------------------- |
| `/`                                  | 200 ms / 1203 ms      | 86 ms / 98 ms             | 554 ms                     |
| `/about/`                            | 186 ms / 203 ms       | 84 ms / 101 ms            | about 1.3 s                |
| `/privacy/`                          | 90 ms / 147 ms        | 82 ms / 90 ms             | about 1.6 s                |
| `/contact/`                          | 90 ms / 136 ms        | 81 ms / 85 ms             | 1257 ms                    |
| `/work/second-presbyterian-chicago/` | 186 ms / 209 ms       | 83 ms / 88 ms             | 1611 ms                    |

The cache works here (`Cf-Cache-Status: MISS` then `HIT`, `Age` header present).
The trade is that the first visitor to a URL after a deploy or a purge pays a
render of about 0.5 to 1.6 s (a static file took 90 ms); stale-while-revalidate
keeps every later visitor on a fast copy. Lighthouse LCP (mobile, simulated, same
machine, median of 6 where noted): `/` 3.5 s before, 3.2 s after; case study 3.9 s
before, 3.8 s after; `/privacy/` 2.0 s before, 1.5 to 2.0 s after.

**Other things that changed with it**

- Images on formerly static pages (`/about`, `/services`, `/photography`) are
  resized at request time through the Images binding like the CMS images, and
  cached 30 days by `src/worker.ts`, instead of being build-time files.
- `public/_headers` no longer reaches HTML; `src/worker.ts` adds the five
  security headers to HTML outside `/_emdash`.
- `/about` redirects to `/about/` (301) from `src/worker.ts`; `/404/` answers 200
  when requested by name so Lighthouse CI can audit it; real unknown URLs 404.
- The sitemap lists every page by hand in `astro.config.mjs` `customPages`.
- `/journal/<slug>/` is a server route (`getEntry`); there are no entries yet.

**Editing guide wording, until the first production proof:** "allow up to 5
minutes" is the honest promise; a publish normally shows at once because it
purges the page's tags. See docs/PENDING.md for the proof step.

**If the cache ever has to be turned off:** remove `cache:` from
`astro.config.mjs` (pages then carry `no-store`, and Workers Cache is off in the
next version), or set `PAGE_MAX_AGE` to `0`. The documented fallback (a short
`s-maxage` edge cache in `src/worker.ts`) was NOT needed: the route cache works.

## CMS foundation (CMS-DESIGN PR 3, 2026-10-03)

The shared tooling every content PR builds on. It changes no page and creates no collection; `cms/schema/` and `cms/content/` are empty until PR 4. Design and builder notes: docs/CMS-DESIGN.md ("PR 3 notes" and 2.6); the editable-content model is there too.

| Piece                                                                                                  | Where                                                                                          |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Generic schema applier (create, fields, order, then update-only settings; idempotent; dry run)         | `scripts/lib/emdash-schema.mjs`, command `npm run cms:schema` (`scripts/cms/apply-schema.mjs`) |
| Content loader (CLI for entries and media, REST for menus and redirects; `$file` images, SHA-1 de-dup) | `scripts/lib/cms-load.mjs`, `scripts/lib/emdash-media.mjs`, command `npm run cms:load`         |
| Reader with the committed-JSON fallback and cache tagging                                              | `src/lib/cms.ts`, `src/lib/cmsFallback.ts`                                                     |
| Restricted Portable Text pass and component                                                            | `src/lib/portableText.ts`, `src/components/emdash/RestrictedPortableText.astro`                |
| Markdown to Portable Text JSON for content files                                                       | `npm run cms:pt -- file.md`                                                                    |

Things found while reading EmDash 1.1.0 for this (all confirmed in `node_modules/emdash/src`):

- A repeater sub-field keeps only `slug`, `type`, `label`, `required` and `options`; a sub-field `maxLength` is stripped by the server. Repeater-level `minItems` and `maxItems` are enforced.
- The create-collection endpoint rejects `titleField` and `commentsEnabled`; they are update-only, and `titleField` must name an existing field. The applier therefore creates, adds fields, then PUTs the full settings.
- `getMenuWithCacheHint`, `getEmDashEntry` and `getEmDashCollection` all return a `cacheHint`; the reader passes each to `Astro.cache.set()` so the route cache is tagged (section "Route cache" above).
- The write scripts refuse any target that is not the `ncs-ci` Worker or a local address unless `--yes` is passed (`scripts/cms/args.mjs`).

## Index pages and photos (CMS-DESIGN PR 11, 2026-10-03)

/work, /photography, /journal and the 404 page read one singleton each (`page_work` entry `work`, `page_photography` entry `photography`, `page_journal` entry `journal`, `page_not_found` entry `not-found`), and /photography reads its pictures from the new `photos` collection. Design: docs/CMS-DESIGN.md sections 1.9 and 1.11 and "PR 11 notes".

- **Readers.** `src/lib/indexPages.ts` (the four singletons, committed fallback `cms/content/page_*.json`) and `src/lib/photos.ts` (`getPhotos()`, grouping, the hero pick, the gallery URLs). Schemas `cms/schema/page_work.mjs`, `page_photography.mjs`, `page_journal.mjs`, `page_not_found.mjs` (admin group "Pages", sort 5 to 8) and `photos.mjs` (group "Photography", sort 13).
- **`photos` has no fallback JSON.** Zero photos, a read error and a missing table all read as "no photos", and the page shows its "In progress" state. Production starts there.
- **Pictures are width-only `/_image` URLs.** `resizedUrl()` builds `/_image?href=<absolute media URL>&w=N&f=webp` and never a height, so a tall photo cannot hit the 4096 px resizer limit (section "The 4096px resizer limit"). The hero and the category cards render through `EmDashPhoto.astro`; the gallery passes `srcSet` and a larger `lightboxSrc` to `PhotoGallery.tsx`. The host must stay in `image.remotePatterns`.
- **The gallery is empty in the server HTML** until the `client:visible` island hydrates (react-photo-album measures its container first), so an axe run must scroll it into view: `tests/index-pages.spec.ts` does, in both themes and with the viewer open.
- **The 404 page** still answers a real 404 for an unknown URL; `/404/` by name still answers 200 for the Lighthouse audit (both measured on `ncs-ci`). The page reads its entry with the route cache only when its status is below 400.
- **CI test photo.** One hand-written photo in `scripts/ci-dataset/ci-content/photos.json`, merged into the CI rows and R2 by `cms-fixtures.mjs`. `NCS_CI_NO_TEST_CONTENT=1` leaves it out (and the refresh deletes it) to measure the zero-photo render.
- **Production data is not loaded** (no admin token). Commands: docs/CMS-DESIGN.md 2.6 ("PR 11 data") and docs/LAUNCH-RUNBOOK.md. No files upload.

## Prose pages (CMS-DESIGN PR 10, 2026-10-03)

/privacy, /accessibility and /colophon read one entry each of the `pages` collection (slugs `privacy`, `accessibility`, `colophon`). Design: docs/CMS-DESIGN.md section 1.10 and "PR 10 notes".

- **Reader and template.** `getProsePage(slug)` in `src/lib/prosePage.ts`; `src/components/ProsePage.astro` draws it (document layout when `show_toc` is on, ledger layout when off); schema `cms/schema/pages.mjs` (9 fields, label "Other pages", group "Pages", sort 9); fallback `cms/content/pages.json`.
- **`pages` is not new.** It is the EmDash template's collection (Title and Content), already in production and in `seed/seed.json`; the schema file extends it (so `cms:schema` reports updated and added fields, not a created collection) and `cms-fixtures.mjs` replaces its seed entry by slug.
- **Body rendering.** `restrictPortableText()` (headings 2 and 3, lists, strong, em, code and safe links) then `blockHtml()` build HTML strings printed with `set:html`. `RestrictedPortableText.astro` is deliberately not used: the PR 8 run measured its `emdash/ui` stylesheet as an extra render-blocking link.
- **Anchors.** A section id is `slugify(heading text)`; `LEGACY_ANCHORS` keeps the three Accessibility ids that differ (`how-its-checked`, `where-it-stops`, `report`) while the heading text is unchanged.
- **Fallback rules.** A missing, unpublished or unreadable entry, a blank title, headline or description, a document with no body or a ledger with no rows serves the committed JSON whole (this also protects against an old template stub with the same slug).
- **Production data is not loaded** (no admin token). Commands: docs/CMS-DESIGN.md 2.6 ("PR 10 data") and docs/LAUNCH-RUNBOOK.md. No files upload.
- **Parity, measured on `ncs-ci`.** `/`, `/about/`, `/services/`, `/contact/` PASS; the three prose pages differ only by the removed developer comments, the shared scroll-spy script and the `data-prose-toc` marker (details in the PR 10 notes).

## Contact page (CMS-DESIGN PR 9, 2026-10-03)

The /contact words and the three form choice lists read from the `page_contact` singleton (entry `contact`). Design: docs/CMS-DESIGN.md section 1.8 and "PR 9 notes".

- **Reader.** `getContactPage()` in `src/lib/contactPage.ts`; schema `cms/schema/page_contact.mjs` (13 fields, admin group "Pages", sort 4); fallback `cms/content/page_contact.json`.
- **Labels are the submitted values.** The Budget, Timeline and Heard-from selects render `<option value={label}>{label}</option>`, so Web3Forms emails the words. Organization type keeps its codes. Rows are trimmed and de-duplicated by the reader, because the label is the value.
- **Fallback rules.** Missing, unpublished or unreadable entry, a blank required field or a list with fewer than two usable rows serves the committed JSON whole.
- **Form handler unchanged** except the draft restore only restores a select when an option with that value exists (old drafts hold codes). Honeypot, hidden fields, the `astro:page-load` re-bind guard and the Web3Forms key handling are as before.
- **Production data is not loaded** (no admin token). Commands: docs/CMS-DESIGN.md 2.6 ("PR 9 data") and docs/LAUNCH-RUNBOOK.md. No files upload.
- **Parity, measured on `ncs-ci`.** `/`, `/services/`, `/about/` PASS; `/contact/` differs only by the 16 option values (codes to labels), the draft-restore guard in the page script, and the intro apostrophe printed as `&#39;` (a literal one before; same rendering). Details in the PR 9 notes.

## About page (CMS-DESIGN PR 8, 2026-10-03)

The /about words, photos, Currently block, Lighthouse numbers and the Person JSON-LD read from the `page_about` singleton (entry `about`). Design: docs/CMS-DESIGN.md section 1.7 and "PR 8 notes".

- **Reader.** `getAboutPage()` in `src/lib/aboutPage.ts`; schema `cms/schema/page_about.mjs` (35 fields, admin group "Pages", sort 3); fallback `cms/content/page_about.json`.
- **Images.** CMS media renders through `src/components/emdash/EmDashPhoto.astro` (width-only `/_image` URLs, so the 4096 px trap cannot bite, and no stylesheet or script is added to the page, unlike `Image` from `emdash/ui`). The fallback's bundled files render with Astro `<Image>` as before. Measured on `ncs-ci` (CMS path): the 125 KB headshot JPEG is served as a 22 KB `image/webp` at 432 w, all six pictures answer `content-type: image/webp`, checked with `curl -s -D - -o /dev/null` (GET). `tests/about-copy.spec.ts` asserts this for every picture on both paths.
- **Fallback rules.** Missing, unpublished or unreadable entry, a blank required field, no story, fewer than three usable photos, fewer than three principles, an empty Currently list or an invalid date serves the committed JSON. A photo without a description or a picture is dropped. A headshot with no picture or no description uses the bundled headshot.
- **Story.** Paragraphs only, rendered by `blockHtml()`. Do not switch it to `RestrictedPortableText` without accepting an extra render-blocking stylesheet on /about (and the chunk rename it causes on other pages).
- **Production data is not loaded** (no admin token). Commands: docs/CMS-DESIGN.md 2.6 ("PR 8 data") and docs/LAUNCH-RUNBOOK.md. The loader uploads the six images with `emdash media upload`.
- **Parity, measured on `ncs-ci`.** Captured on `main`, then the PR deployed twice. Fallback path (no `ec_page_about` rows): 5/5 PASS on `/about/`, `/`, `/services/`, `/work/`, `/contact/`, images included. CMS path: 5/5 PASS with the six `<img>` elements (and the headshot's wrapper div) normalised out, which are the only intended difference (CMS media URLs instead of bundled assets). Normalisations needed, none of them rendered change: the `<astro-island uid>` hash differs because the build ran from a different checkout path; Astro prints an apostrophe from an expression as `&#39;`, where the old static text had a literal one. One deliberate change: the thesis sentence rendered "small businessesaround Cincinnati" on the live page (no space after the blue span, the same bug as the hero's "byone person"); it now has `{' '}`. With that space applied to the baseline both paths pass.
- **CI exercises the CMS path.** `cms-fixtures.mjs` now turns `$file` images into media rows (`cms-rows.sql`) and an upload list (`scripts/ci-dataset/cms-media.json`); `rebuild.mjs` uploads those six files to `ncs-ci-media` from the checkout. Production media files stay copied from the live site.

## Services page (CMS-DESIGN PR 7, 2026-10-03)

The /services words, the three service chapters and the FAQ read from a singleton and a list. Design: docs/CMS-DESIGN.md section 1.6 and "PR 7 notes".

| What                                                                                                                                                                                                                                      | Where it is edited                                                                                             | How the site reads it                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Page headline and intro, the cost section heading, paragraph and note, the add-ons heading, "Why it costs" heading, sub, four reasons and closing paragraph, FAQ heading, sub and rows, title, description, closing banner title and text | Admin, **Services page** (collection `page_services`, entry `services`; `cms/schema/page_services.mjs`)        | `getServicesPage(Astro)` in `src/lib/servicesPage.ts`, used by `src/pages/services.astro`   |
| The three chapters: name, summary, paragraph, included lines, standalone starting price, picture description, placeholder icon, area served, order                                                                                        | Admin, **Service offerings** (collection `service_offerings`, entries `strategy`, `web-design`, `photography`) | `getServiceOfferings(Astro)`: first 3 by `sort_order`                                       |
| The Service (one per offering) and FAQPage structured data                                                                                                                                                                                | Derived from the two sources above, never edited by hand                                                       | `buildServiceSchemas()` in `servicesPage.ts`, emitted through `BaseLayout`'s `schemas` prop |

Behaviour worth knowing:

- **Fallback.** A missing, unpublished or unreadable entry, a blank required field, fewer than four reasons, fewer than three complete FAQ rows, or an offering with no included lines serves the committed `cms/content/page_services.json` and `service_offerings.json` (the whole list for offerings) and logs `[cms] ... serving the committed fallback`. Production has no data loaded when this ships, so it renders from the fallback and looks exactly as before.
- **Structured data cannot drift from the page.** The Service and FAQPage JSON-LD is built from the same rows the page renders. `src/lib/servicesPage.jsonld.golden.json` pins it to what the live page emitted before the move (a unit test, byte-equal via `JSON.stringify`, on both the fallback and CMS paths). Strategy and Photography carry their own floors in `price_from`; Web design's follows the first Pricing tier, so leave its `price_from` empty.
- **The Web design picture is still code.** An `offeringImages` map in `services.astro` (keyed by the offering slug) holds the screenshot; the entry's "Describe the picture" box must be filled in for it to show, otherwise the placeholder panel renders. A CMS image upload comes with PR 8's image path.
- **Rendered difference.** None on /services, on the fallback path or the CMS path (parity PASS, and the JSON-LD block is byte-identical by `cmp`). The only DIFF in the whole compared set is the homepage hero proof line, which gained the space it was missing ("photographed by one person", fixed in `Hero.astro` with `{proof.before}{' '}`).
- **Production data is not loaded** (no admin token). Commands: docs/CMS-DESIGN.md 2.6 ("PR 7 data") and docs/LAUNCH-RUNBOOK.md.

## Home page copy (CMS-DESIGN PR 6, 2026-10-03)

The words on the homepage read from one singleton. Design: docs/CMS-DESIGN.md section 1.4 and "PR 6 notes".

| What                                                                                                                                                               | Where it is edited                                                                      | How the site reads it                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Hero headline (lead and coloured accent as two fields), positioning, proof line and its link text, both button labels                                              | Admin, **Home page** (collection `page_home`, entry `home`; `cms/schema/page_home.mjs`) | `getHomePage(Astro)` in `src/lib/homePage.ts`, used by `Hero.astro`                                                          |
| Selected Work heading, sub and tail link; "What it costs" heading, sub, includes list, reassurance and link; "How we work" heading, sub, four steps; closing block | Same entry                                                                              | `SelectedWork.astro`, `PricingTeaser.astro`, `ProcessBand.astro` (which `/services` also renders), all through `getHomePage` |
| Page title and meta description                                                                                                                                    | Same entry (`seo_title`, `seo_description`)                                             | `index.astro` passes them to `BaseLayout`                                                                                    |

Behaviour worth knowing:

- **Fallback.** A missing, unpublished or unreadable entry, a blank required field, or a process or includes list shorter than four, serves the committed `cms/content/page_home.json` and logs `[cms] ... serving the committed fallback`. Production has no data loaded when this ships, so it renders from the fallback.
- **One read per request.** The hero, three sections and `/services`' process band share one memoised read (a `WeakMap` on `Astro.request`) and one cache tag, so a publish purges `/` and `/services/`.
- **The hero stays the LCP element it was.** Still server-rendered, still the CSS-only first-frame entrance, no `data-reveal` anywhere in it (CLAUDE.md Gotchas 10 and 14). Measured on `ncs-ci`, Lighthouse CLI mobile, same machine, route cache warm: median LCP 3614 ms on `main` (12 runs) against 3615 ms on the CMS path (12 runs) and 3624 ms on the fallback path (16 runs); the LCP element is the hero phone screenshot in all of them. The distribution is bimodal (a 2.7 to 2.9 s cluster and a 3.6 s cluster), so a 6-run median can swing by 400 ms by luck; use at least 12 runs when comparing.
- **Not in the entry on purpose:** section order, every link target, the step numbers (counted from order), the hero device scene and the client marquee.
- **Rendered difference.** The only DIFF against `main` on all five compared routes is the homepage meta, og and twitter description: it was the bare studio name and is now the tagline (the design seeds it that way, 1.1). The hero proof line rendered "photographed byone person" (no space before the link) in this PR; PR 7 fixed it.
- **Production data is not loaded** (no admin token). Commands: docs/CMS-DESIGN.md 2.6 ("PR 6 data") and docs/LAUNCH-RUNBOOK.md.

## Pricing (CMS-DESIGN PR 5, 2026-10-03)

The homepage "What it costs" band and the /services tier cards and add-on cards read from two list collections. Design: docs/CMS-DESIGN.md section 1.5 and "PR 5 notes".

| What                                                                                                                             | Where it is edited                                                                                                               | How the site reads it                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| The three web tiers (name, starting price, who it is for, range line, paragraph, included lines, recommended flag, badge, order) | Admin, **Pricing tiers** (collection `pricing_tiers`, entries `launch`, `signature`, `flagship`; `cms/schema/pricing_tiers.mjs`) | `getPricingTiers(Astro)` in `src/lib/pricing.ts`: first 3 by `sort_order`, only the first recommended tier keeps the accent and badge |
| The "Add to any project" cards (name, price as text, note, order)                                                                | Admin, **Add-ons** (collection `pricing_addons`, entries `photography`, `brand-strategy`, `care-plan`)                           | `getAddOns(Astro)`: first 3 by `sort_order`                                                                                           |

Behaviour worth knowing:

- **Fallback.** An empty, unpublished or unreadable collection (or a tier with a blank required field) serves the committed `cms/content/pricing_tiers.json` and `pricing_addons.json` as one whole list and logs `[cms] ... serving the committed fallback`. Production has no data loaded when this ships, so it renders from the fallback and looks exactly as before. `src/data/pricing.ts` is deleted; nothing imports it.
- **Count-up.** The price is an integer field; the template prints it as the static text of the count-up span and as `data-countup-to`, so a visitor with no JavaScript sees the real number. `tests/pricing.spec.ts` proves it with scripts off.
- **Prices elsewhere stay prose.** The /services FAQ ("What does it cost?", "Do you offer maintenance?") and the /contact budget brackets are text until PR 9 (the FAQ moved to the Services page entry in PR 7, as editable text). The Web design JSON-LD offer takes its floor from the first tier; the Strategy ($1,500) and Photography ($900) floors moved into `service_offerings.price_from` in PR 7.
- **Production data is not loaded** (no admin token). Commands: docs/CMS-DESIGN.md 2.6 ("PR 5 data") and docs/LAUNCH-RUNBOOK.md.

## Site settings and menus (CMS-DESIGN PR 4, 2026-10-03)

The first content PR: the shared chrome reads from the CMS. Design: docs/CMS-DESIGN.md sections 1.2 and 1.3 and "PR 4 notes".

| What                                                                                                                                              | Where it is edited                                                                                      | How the site reads it                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Contact details, socials, tagline, footer "Currently" line, default closing-banner copy, header button text, default meta description, feed title | Admin, **Site settings** (collection `site_settings`, one entry `site`; `cms/schema/site_settings.mjs`) | `getSite(Astro)` in `src/data/site.ts`, one read per request |
| Header and footer navigation                                                                                                                      | Admin, **Menus**, `primary` and `footer`                                                                | `getMenuItems('primary' or 'footer')` in `src/lib/cms.ts`    |
| Domain and canonical URL                                                                                                                          | Code: `SITE_DOMAIN`, `SITE_URL` in `src/data/site.ts`                                                   | Imported where only the origin is needed                     |

Behaviour worth knowing:

- **Fallback.** A missing, unpublished or unreadable entry or menu serves the committed `cms/content/site_settings.json` and `menus.json`, and logs `[cms] ... serving the committed fallback`. A blank required field in the admin counts as unreadable (the whole entry falls back rather than a half-empty footer). An absent collection (production today, before the data is loaded) is handled the same way, so no page errors.
- **Production is still empty.** The schema and content were committed but not loaded (no admin token). Load them with the commands in docs/CMS-DESIGN.md 2.6 ("PR 4 data") and docs/LAUNCH-RUNBOOK.md. Nothing visible changes when they land, because the fallback holds the same values.
- **The phone menu** (`MobileNav.tsx`, a React island) gets every value as a prop from `Header.astro`; a menu item's "Title attribute" is its visible descriptor. Do not import `src/data/site.ts` in an island.
- **Journal** items in either menu are hidden in code while no journal entry is published.
- **Parity.** The PR was proved byte-identical to `main` on all 14 pages and `/rss.xml` on `ncs-ci`, on both the fallback path and the CMS path, apart from the `MobileNav` island's `uid` and serialised props.
- **A stale cache looks like a failed rebuild.** `npm run ci-dataset -- --from-scratch` requests `/` once before it loads the rows, and the route cache keeps that empty homepage for 5 minutes (the Selected Work strip missing, about 24 KB lighter). A parity capture taken straight after a rebuild reads it; wait out the cache window and capture again.
