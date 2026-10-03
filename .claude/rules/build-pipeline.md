---
paths:
  - 'scripts/generate-*.mjs'
  - 'scripts/free-dist.mjs'
  - 'public/**'
  - 'package.json'
  - 'astro.config.mjs'
  - 'src/worker.ts'
  - 'wrangler.jsonc'
---

# Build pipeline, OG cards and icons

Moved out of CLAUDE.md. Loads when the build chain, generators or shipped public assets are touched.

## Build pipeline

`npm run build` is a chain:

Stop the dev server before running `npm run build`. The `@astrojs/cloudflare` adapter's prerenderer opens a tunnel during the build; with `npm run dev` still running it collides on the port and the build dies with an undici `fetch failed` / `bad port` error in `prerenderer.js`. That is a port conflict, not a code error, kill the dev server and rebuild.

1. `npm run og:pages` runs `scripts/generate-og.mjs`. Generates one per-page Open Graph card into `public/og/`: one per main route plus one per case study (`og/work/<slug>.png`) and journal entry. Main routes and journal entries (taken from `/rss.xml`, links shaped `/journal/<slug>/`, published entries only; an empty journal builds none and is not a warning) get the navy card (Bebas title + amber studio name); case studies get a cover card, the real hero screenshot filling the frame behind a navy scrim, with the title anchored bottom-left, so a shared case study previews the actual shipped work. **The case-study cards are built from EmDash, not from git:** the script reads the published entries of the instance named by the `EMDASH_URL` env var (default: the production site; the default flipped to `https://nixoncreativestudio.com` at cutover) through what an anonymous visitor can read (`/rss.xml` for slug and title, `/work/<slug>/` for the cover media URL, `/_emdash/api/media/file/<id>` for the original bytes), because the REST content API needs a login. If the instance is unreachable or returns nothing, the committed `public/og/work/*.png` cards are kept, a warning is printed and the build carries on (a CMS outage never fails or empties a build). Unchanged covers re-render byte-identical. Runs out-of-process for the same V8-isolate reason (an Astro route can't: it would need `node:crypto` in the CF prerender worker, which is why `astro-og-canvas` as a route fails here). `BaseLayout.astro` maps the current pathname to `/og/<slug>.png`. Output is deterministic, so re-running with unchanged content produces identical bytes.
2. `astro build` runs as normal. (The blur-placeholder step and `CaseStudyCover` were removed at the 2026-10 cutover; EmDash paints its own blurhash.)

Standalone scripts:

- `npm run og:pages` — re-run the per-page OG card generator (after adding a case study or changing a page title; journal cards are built at deploy time from the published entries, so a new entry's card appears on the next deploy).
- `npm run og` — re-run `scripts/generate-og-default.mjs` to regenerate `public/og-default.png`, the manual fallback card (after changing brand colors, the tagline, or the wordmark).
- `npm run icons` — re-run `scripts/generate-icons.mjs` to regenerate the favicon / app-icon set (after changing brand navy, the accent amber, the squircle radius, or the wordmark font). The mark is a white Bebas "N" on a navy squircle with one amber spark, built from the real Bebas glyph via opentype.js (same pipeline as the OG cards). Outputs `public/favicon.svg`, `public/favicon.ico` (16/32 without the spark, 48 with), `public/apple-touch-icon.png` (180, navy baked in), and the PWA `public/icon-192.png` / `icon-512.png` / `icon-512-maskable.png` referenced by `public/site.webmanifest`. One self-contained look (navy tile, no `prefers-color-scheme` flip) so it reads the same on light and dark browser chrome. Wired into `BaseLayout.astro`'s `<head>`. NOT in the build chain (icons only change when the brand does, like `og`).

`public/og-default.png`, the generated `public/og/*.png` cards, and the favicon / app-icon set (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `site.webmanifest`) are committed to the repo because they're real assets shipped to visitors. `npm run dev` reads the committed versions without re-running the scripts.
