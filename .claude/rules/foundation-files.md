---
paths:
  - 'src/**'
  - 'scripts/**'
  - 'public/**'
  - 'astro.config.mjs'
  - 'package.json'
  - 'tsconfig.json'
---

# Safe to edit by hand vs foundation files

Loads when source, scripts, public assets or config are touched.

## Safe to edit by hand

- Text content inside `src/pages/*.astro` (everything outside the frontmatter, between the tags). Keep the H1's `aria-label` in step with its visible words.
- MDX files in `src/content/case-studies/` and `src/content/journal/`, and JSON files in `src/content/photos/`.
- `src/data/site.ts` (contact info, social URLs, tagline, `bookingOpen`, `firstConversation`, `replyPromise`, `bookingUrl`, `newsletterUrl`), `src/data/pricing.ts`, `src/data/sector-pages.ts` (the /churches/ copy), `src/data/nav.ts` (the two gated links).
- The order of the deck: `DECK` in `src/lib/clients.ts`.
- Copy strings and `href` values in component files.
- Footage, captures and study images in `public/assets/` and `public/assets/study/` (add the real size to `src/data/study-images.json` for any image under `study/`).
- Page-specific CSS in `src/styles/pages/*.css`, when the change is that page's own.
- Share-card titles and pictures in the `PAGES` and `POST_PHOTO` lists of `scripts/generate-og.mjs` (re-run `npm run og` after editing).

## Foundation, edit with care (route through a planned Claude session)

- `src/styles/kit.css`: the tokens in `:root`, the `@font-face`, the top line, dock, tiles, client sheet, closing, bands, price hand, `.label`, `.giant`, `.pip`, the view-transition rules, the reduced-motion and forced-colors blocks and print. Every page depends on it. `DESIGN.md` says what it should look like, and `src/lib/kit-tokens.test.ts` gates the colors.
- `src/scripts/kit.js`: the shared behaviour (footage, the closing deck, bands, the dock highlight, the client sheet, the price hand, `[data-weigh]`) and the exported `ui` and `sites` the page scripts import.
- `src/layouts/BaseLayout.astro` structure: head, font preload, canonical and OG meta, JSON-LD, the Coming Soon gate, analytics, the top line, dock and client sheet, and the scripts it loads. There is no router and no theme bootstrap in it.
- `src/content.config.ts` (the schemas for case-studies, journal and photos).
- Site chrome and shared pieces: `TopLine`, `Dock`, `Closing`, `ClientSheet`, `Tile`, `QuoteBand`, `PriceHand`, `DealtPrices`, `PageHead`, `ComingSoon`, `ComingSoonGate`, `StructuredData`, `Analytics` and `src/components/analytics/` (the conditional inline scripts), and `src/lib/clients.ts`, `words.ts`, `window-chrome.ts` and `study-markup.ts`.
- `src/pages/contact.astro` with `src/scripts/contact.js`: the production inquiry pipeline (Web3Forms). Copy is safe to edit; the form structure, field names and wiring are not.
- `src/lib/contrast.ts` (PORTABLE, canonical here) and the other PORTABLE files named in `PORTS.md`.
- `scripts/generate-og.mjs`, `generate-icons.mjs`, `finish-share-cards.mjs`, `write-csp.mjs`, `free-dist.mjs`, `with-workerd.mjs`, `sync-check.mjs`.
- `astro.config.mjs`, `package.json`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `playwright.config.ts`, `playwright.visual.config.ts`, `lighthouserc.json`, `wrangler.jsonc`, `.github/workflows/ci.yml` and `lighthouse.yml`.
- `public/_headers` (security and cache headers), `public/_redirects` (real 301s), `public/robots.txt`.
- `public/og-default.png`, the generated `public/og/*.png`, and `public/favicon.svg` with the icon set it generates (`npm run icons`) and `public/site.webmanifest`.
- `public/assets/fonts/hanken.woff2` (the one font) and `brand/fonts/*.woff` (for the OG generators only).

If a change requires editing the foundation set, do it in a Claude session, write the change deliberately, and update CLAUDE.md, `DESIGN.md` or this file when the architecture shifts.
