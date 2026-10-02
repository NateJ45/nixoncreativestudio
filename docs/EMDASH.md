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

```
npm run build && npx wrangler deploy
```

## Status (2026-10-02)

- Setup wizard done, admin passkey registered, CLI logged in
  (`npx emdash login --url <trial url>`, device-code flow approved in the browser).
- The empty-site template shipped `pages` and `posts` collections. One test post
  (`hello-emdash`) was created from the CLI; `src/pages/emdash-test.astro`
  renders it server-side via `getEmDashCollection('posts')`. Delete both when
  the trial ends. Pages that read EmDash need `export const prerender = false`
  (the rest of the site stays prerendered).

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
