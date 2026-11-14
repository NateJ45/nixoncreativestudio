---
paths:
  - 'scripts/**'
  - 'package.json'
  - 'astro.config.mjs'
  - 'public/**'
---

# Build pipeline

Loads when build scripts, generated assets or the Astro config are touched.

Stop the dev server before running `npm run build`. The `@astrojs/cloudflare` adapter's prerenderer opens a tunnel during the build; with `npm run dev` still running it collides on the port and the build dies with an undici `fetch failed` / `bad port` error in `prerenderer.js`. That is a port conflict, not a code error: kill the dev server and rebuild.

`npm run build` is a chain:

0. `prebuild` runs `scripts/free-dist.mjs` (PORTABLE, canonical here), which stops any stale dev server holding `dist/` (Gotcha 6).
1. `npm run og:pages` runs `scripts/generate-og.mjs`. It writes one 1200x630 Open Graph card per page into `public/og/` (one per main route, one per case study at `og/work/<slug>.png`, one per published journal post) plus the fallback `public/og-default.png`. The look follows the Facebook cover: the light paper background, a studio-blue panel on the left with "Nixon Creative Studio", the page title and the domain in Hanken Grotesk (500 and 800), and one to three tilted tiles of real work on the right (client-site captures from `src/assets/case-studies/`, photos from `src/assets/photography/canvas/` and `src/assets/about/`). Case studies show the desktop capture with the phone capture beside it. Each static page's title, layout and pictures are set in the script's `PAGES` list; journal posts use their cover, else `POST_PHOTO`, else their cluster's photo. The script fails the build if a non-dynamic page in `src/pages/` has no `PAGES` entry, if two cards share a title, or if two cards are byte-identical, so every page always has its own card with the studio name. Case-study and journal pages no longer pass `ogImage`; they use the generated card (the cover stays as the JSON-LD image). opentype.js cannot read a variable woff2, so the two static weights live at `brand/fonts/hanken-grotesk-latin-500-normal.woff` and `...-800-normal.woff` (SIL OFL), laid out glyph by glyph into SVG paths. It runs out of process because the Cloudflare prerender worker is a V8 isolate without `node:fs`. `BaseLayout.astro` maps the current pathname to `/og/<slug>.png`. Output is deterministic. Look at a contact sheet of the cards after changing the script.
2. `node scripts/with-workerd.mjs astro build` runs the build. The wrapper (PORTABLE, identical to the starter's copy) points Miniflare at wrangler's workerd on Windows when the plugin's copy would crash, and is a no-op on Linux CI. Do not call bare `astro build` from the npm script.
3. `node scripts/finish-share-cards.mjs` (PORTABLE, PORTS card 215) recompresses PNG share cards in `dist/client/og/` and `og-default.png` losslessly, because some link previews drop a picture over about 600 KB, and warns about any page whose share picture is missing or over 600 KB. It never fails a build.
4. `node scripts/write-csp.mjs` hashes every inline script and `<style>` in `dist/client` and writes them into `dist/client/_headers`, in place of the two markers in the Content-Security-Policy line (`docs/claude/deployment.md`). It fails the build if a marker has gone or a line passes Cloudflare's 2,000 characters.
5. `node scripts/add-video-worker.mjs` adds `src/worker.ts` to the generated deploy config, for footage byte ranges.

There is no placeholder step and no `coverPlaceholders.json` any more: covers are not blurred up on the page. `npm run build` no longer runs `placeholders`.

## Standalone scripts (not in the build chain)

- `npm run og`: same as `og:pages` (one generator writes every card and `og-default.png`). Run it after adding a page, case study or post, or changing a title, then commit the PNGs.
- `npm run icons`: `scripts/generate-icons.mjs` rasterizes `public/favicon.svg` (the white N on the studio blue) into `public/favicon.ico` (16, 32 and 48), `apple-touch-icon.png` (180, blue baked in), and the PWA `icon-192.png`, `icon-512.png` and `icon-512-maskable.png` referenced by `public/site.webmanifest`. Edit the SVG, then run it. Icons only change when the brand does.
- `node scripts/build-course-line.mjs` (local only): rewrites `src/data/stone-steps-course.ts` from the Stone Steps repo's `scripts/data/course-profile.json` (default path `../../clients/stonesteps-50k/...`, or `--source <file>`). Run it when that repo re-measures the course, read the diff and commit the generated file.
- `npm run film:phone`: `scripts/film-phone.mjs` films a phone footage clip straight into `public/assets/{slug}-m.mp4` (needs ffmpeg, like `capture:clips`; see `.claude/rules/content.md`). The desktop footage has no script yet.
- `npm run capture:study`, `capture:cms` and `capture:clips`: local capture tools (see `docs/claude/setup-checklist.md` and `.claude/rules/content.md`). They still write under `src/assets/case-studies/` and `public/media/`; the site serves its stills and footage from `public/assets/` (`docs/PENDING.md`).
- `scripts/font-fallback.mjs` is a PORTABLE starter file with no npm script here, and it needs a `brand/brand.config.json` this repo no longer has. Hanken Grotesk is preloaded and swaps, with no metric-matched fallback face.

## Committed generated files

`public/og-default.png`, the generated `public/og/*.png` cards, the favicon and app-icon set and `public/site.webmanifest` are committed because they are real assets shipped to visitors. `npm run dev` reads the committed versions without re-running the scripts.

## Fonts and static assets

The one font is `public/assets/fonts/hanken.woff2` (declared in `kit.css`, preloaded in `BaseLayout.astro`). Footage, captures and study images are plain files in `public/assets/` and clips in `public/media/`; `public/_headers` caches `/assets/*` for a month and `/media/*` and `/_astro/*` for a year.
