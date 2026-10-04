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

1. `npm run og:pages` runs `scripts/generate-og.mjs`. Generates one per-page Open Graph card into `public/og/`: one per main route plus one per case study (`og/work/<slug>.png`) and journal entry. Main routes and journal entries (taken from `/rss.xml`, links shaped `/journal/<slug>/`, published entries only; an empty journal builds none and is not a warning) get the paper card (redesign 2026: survey paper with the site's contour ground, the official logo lockup top-left, the headline in Bebas Neue with its last phrase in the Newsreader italic voice in marker red and a hand-drawn marker stroke under it, the domain bottom-left); static-page words come from `cms/content/page_*.json` where a heading plus accent exists (home, about, photography, contact) and are set in the script otherwise; journal entries take the kicker "From the journal". Case studies get the same card with the kicker "Case study" and the real hero screenshot printed on the right as a tilted framed print, so a shared case study previews the actual shipped work. All drawing is in `scripts/lib/brand-card.mjs` (shared with `generate-og-default.mjs`). Fonts are local and offline: Bebas from `@fontsource`, Newsreader italic from `scripts/fonts/newsreader-latin-400-italic.woff` (a woff copy of the site's woff2, because opentype.js cannot read woff2). The generator scales glyph outlines itself because opentype.js `getPath` returned NaN coordinates for some sizes and kerning pairs (a NaN truncates the SVG path silently: the symptom was a headline cut off mid-word); `layout()` throws on NaN. Cards are palette PNGs (about 45 to 70 KB type-only, 65 to 115 KB with a print); keep each under about 120 KB. The case-study cover is the first `<img>` on `/work/<slug>/` that points at `/_emdash/api/media/file/`, so the header logo is never picked. **The case-study cards are built from EmDash, not from git:** the script reads the published entries of the instance named by the `EMDASH_URL` env var (default: the production site; the default flipped to `https://nixoncreativestudio.com` at cutover) through what an anonymous visitor can read (`/rss.xml` for slug and title, `/work/<slug>/` for the cover media URL, `/_emdash/api/media/file/<id>` for the original bytes), because the REST content API needs a login. If the instance is unreachable or returns nothing, the committed `public/og/work/*.png` cards are kept, a warning is printed and the build carries on (a CMS outage never fails or empties a build). Unchanged covers re-render byte-identical. Runs out-of-process for the same V8-isolate reason (an Astro route can't: it would need `node:crypto` in the CF prerender worker, which is why `astro-og-canvas` as a route fails here). `BaseLayout.astro` maps the current pathname to `/og/<slug>.png`. Output is deterministic, so re-running with unchanged content produces identical bytes.
2. `astro build` runs as normal. (The blur-placeholder step and `CaseStudyCover` were removed at the 2026-10 cutover; EmDash paints its own blurhash.)

Standalone scripts:

- `npm run og:pages` — re-run the per-page OG card generator (after adding a case study or changing a page title; journal cards are built at deploy time from the published entries, so a new entry's card appears on the next deploy).
- `npm run og` — re-run `scripts/generate-og-default.mjs` to regenerate `public/og-default.png`, the site-wide fallback card, which is the home card (after changing brand colours or the home tagline in `cms/content/page_home.json`). Used by the Organization schema and the coming-soon page.
- `npm run icons` — re-run `scripts/generate-icons.mjs` to regenerate the favicon / app-icon set (after changing brand ink, the marker colour, the squircle radius, or the wordmark font). The logo has no separate mark, so the icon is a DERIVED mark (Nathan to approve): a paper Bebas "N" on the logo's ink with one short vermilion china-marker stroke under it, built from the real Bebas glyph (same pipeline as the OG cards). Outputs `public/favicon.svg` (small vector), `public/favicon.ico` (16/32 a taller, slightly emboldened N with no stroke, 48 with the stroke), `public/apple-touch-icon.png` (180, ink baked in), and the PWA `public/icon-192.png` / `icon-512.png` / `icon-512-maskable.png` referenced by `public/site.webmanifest` (`theme_color` and `background_color` are the paper `#F3EEE4`, matching BaseLayout's theme-color). The maskable icon keeps the N and stroke inside the centre circle. One self-contained look (ink tile, no `prefers-color-scheme` flip) so it reads the same on light and dark browser chrome. Wired into `BaseLayout.astro`'s `<head>`. NOT in the build chain (icons only change when the brand does, like `og`).

`public/og-default.png`, the generated `public/og/*.png` cards, and the favicon / app-icon set (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `site.webmanifest`) are committed to the repo because they're real assets shipped to visitors. `npm run dev` reads the committed versions without re-running the scripts.
