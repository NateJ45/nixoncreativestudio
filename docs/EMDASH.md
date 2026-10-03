# EmDash CMS trial (branch `emdash-trial`)

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

**Trial / CI previews** use the `ci` environment in `wrangler.jsonc` (Worker `ncs-emdash-trial`, the trial database and bucket). GitHub Actions builds with `CLOUDFLARE_ENV=ci`, so the required checks never read production data. To redeploy the trial by hand:

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

Caching: server pages send `Cache-Control: public, max-age=0, s-maxage=300,
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

## Tooling for the hybrid site (CI, tests, OG cards)

The repo used to assume `dist/client` was the whole site. It is not any more:
the pages that read EmDash are server-rendered, so every gate that served or
crawled a static tree now takes a URL. The map:

| Tool              | Takes                                         | In CI                                                |
| ----------------- | --------------------------------------------- | ---------------------------------------------------- |
| Playwright suites | `PLAYWRIGHT_BASE_URL`                         | Worker version preview from `ci.yml`                 |
| Link check        | `LINKCHECK_URL` (else `dist/client`)          | the same preview                                     |
| Lighthouse CI     | `LHCI_BASE_URL` via `scripts/lhci-config.mjs` | its own preview from `lighthouse.yml` (alias `lh-*`) |
| Parity harness    | `--url <base>` (else `dist/client`)           | not in CI, by design                                 |
| OG cards          | `EMDASH_URL` (default: the trial Worker)      | read at build time, fail-soft                        |

**Preview versions.** `.github/actions/preview-version` runs
`npx wrangler versions upload --preview-alias <ci|lh>-<branch or pr-N>` after
`npm run build` (wrangler follows `.wrangler/deploy/config.json` to
`dist/server/wrangler.json`). The version is not promoted, so production
traffic is untouched. It runs on the **production bindings** (D1, R2, KV), which
is the point: an isolated `wrangler preview` would start with empty storage and
render every server page with no content. Read-only for the suites. The URL is
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
used by `SelectedWork` and the EmDash mode of `SiteShowcase`. Use it for any
CMS image taller than about 4000 px; ordinary images keep using `Image` from
`emdash/ui`. Symptom of hitting the limit again: an image whose transfer size
equals the original file size, with `content-type: image/png` from `/_image`.
