---
name: Nixon Creative Studio
description: A photographer's working table. Warm fibre paper, the logo's deep ink and one china-marker red; real client work printed as frames; grounds taken from a real room and a real river.
colors:
  ink: '#0A1628'
  ink-raised: '#15233A'
  ink-body: '#1D2532'
  ink-muted: '#56585C'
  paper: '#F3EEE4'
  paper-deep: '#E9E1D2'
  paper-raised: '#FBF8F2'
  ground-wall: '#E8DFCF'
  ground-survey: '#E8E6D9'
  marker: '#AE2F1B'
  brick: '#8E2B1B'
  marker-hot: '#F2835F'
  river: '#6C8592'
  on-ink-muted: '#B8B6B0'
typography:
  display:
    fontFamily: 'Bebas Neue, Bebas Fallback (Impact), sans-serif'
    fontSize: 'clamp(3.25rem, 1.6rem + 7.2vw, 7.5rem)'
    lineHeight: 0.9
    letterSpacing: '0.01em'
  headline:
    fontFamily: 'Bebas Neue'
    fontSize: 'clamp(2.25rem, 1.5rem + 3.2vw, 4rem)'
    lineHeight: 0.95
  voice:
    fontFamily: 'Newsreader italic'
    fontSize: '0.86em of the headline'
    color: '{colors.marker}'
  lede:
    fontFamily: 'Newsreader'
    fontSize: 'clamp(1.25rem, 1.08rem + 0.75vw, 1.6rem)'
    lineHeight: 1.4
  body:
    fontFamily: 'Newsreader'
    fontSize: 'clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)'
    lineHeight: 1.6
  ui:
    fontFamily: 'system-ui sans'
    fontSize: '0.9375rem'
  caption:
    fontFamily: 'system-ui sans'
    fontSize: '0.875rem'
  numeral:
    fontFamily: 'Bebas Neue, tabular lining figures'
    fontSize: 'clamp(2.75rem, 1.8rem + 4vw, 5rem)'
rounded:
  all: '2px'
spacing:
  gutter: 'clamp(1rem, 4vw, 3.5rem)'
  band: 'clamp(4.5rem, 9vw, 8.5rem)'
components:
  button-brand:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.paper}'
    hover: '{colors.marker}'
    minHeight: '44px (header), 48px (cta size)'
  band-deep:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.paper}'
---

# Design System: Nixon Creative Studio

Tokens live in `src/styles/globals.css` (section 12 is the palette, section 7 the grounds); the CSS wins if this file and the code disagree. Strategy and audience are in `PRODUCT.md`; the research behind every decision here is in `docs/redesign-2026/` (start with `00-synthesis.md`). Written 2026-10-04 by the foundation pass of the redesign; page bodies are being rebuilt on it.

## 1. Overview

**Creative North Star: a photographer's working table, in a real room, by a real river.**

Nathan is a web designer who came from photography. The site is laid out the way he judges his own work: on a contact sheet. Real client sites are printed as frames (browser prints and film-strip frames with edge print), the keeper is circled in red china marker, and the facts are printed on the film edge. The table sits in a north-facing room where late sun comes through a sash window and lies across a limewash wall, and the studio is in Cincinnati, on the bend of the Ohio. Those three things (the sheet, the window light, the river) are the identity. None of them could be moved to another studio's site unchanged, which is the test the d9 study set.

- **One art-directed theme** since 2026-10-04. There is no dark mode, no toggle and no `.dark` token block (FBCM and Reid Design made the same call). The single "dark" is a deliberate ground, the ink board, not a theme.
- **Paper and ink, one red.** The page is warm fibre paper; text and the deep ground are the logo's ink; the one strong accent is a china-marker red. No blue on cream, no heritage green and gold, no gradients.
- **Grounds, not washes.** Each band sits on a ground and the ground changes deliberately between bands, never inside one. A page is never one flat colour from top to bottom (the old light mode's problem).
- **Show the work at a size you can read**, as prints on the table. The work leads; adjectives do not.
- **Spend motion once.** One moving ground at the top of a page, a reveal for figures below the fold, a slow drift, an arrow nudge. Nothing loops while the visitor reads except the light on the wall, and that is slow enough to read as weather.

## 2. Colors

Every pair below is asserted in `src/lib/theme-tokens.test.ts` (105 assertions), and every text token is checked against the worst pixel of each textured ground by `node scripts/brand/build-grounds.mjs --check` (31 pairs). WCAG 2 ratios.

| Token             | Hex       | Role                                                             | Contrast                                                                                          |
| ----------------- | --------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `--ink`           | `#0A1628` | The logo's navy. Headings, the deep ground, buttons              | 15.68 on paper, 13.72 on the wall, 14.46 on survey paper                                          |
| `--ink-raised`    | `#15233A` | One step up on the deep ground (cards, the lamp-lit board)       |                                                                                                   |
| `--ink-body`      | `#1D2532` | Body text (`--foreground`)                                       | 13.33 on paper, 11.86 on paper-deep, 11.66 on the wall                                            |
| `--ink-muted`     | `#56585C` | Meta and supporting text (`--muted-foreground`)                  | 6.16 on paper, 5.49 on paper-deep, 5.39 on the wall, 5.22 on its darkest pixel                    |
| `--paper`         | `#F3EEE4` | The page (`--background`)                                        |                                                                                                   |
| `--paper-deep`    | `#E9E1D2` | Sunk bands, quiet buttons (`--muted`, `--secondary`)             | ink on it 13.96                                                                                   |
| `--paper-raised`  | `#FBF8F2` | Cards, captions, popovers (`--card`)                             |                                                                                                   |
| `--ground-wall`   | `#E8DFCF` | The limewash wall (window-light ground)                          |                                                                                                   |
| `--ground-survey` | `#E8E6D9` | Survey paper (contour ground)                                    |                                                                                                   |
| `--marker`        | `#AE2F1B` | China-marker red: the italic voice, focus ring, button hover     | 5.64 on paper, 4.93 on the wall, 4.78 on its darkest pixel; paper on it 5.64                      |
| `--brick`         | `#8E2B1B` | The second accent: links and accent text (`--link`), form errors | 7.23 on paper, 6.33 on the wall                                                                   |
| `--marker-hot`    | `#F2835F` | Vermilion: the marker as it reads on ink (voice, links, ring)    | 7.07 on ink, 6.14 on ink-raised, 4.75 on the brightest lamp-lit fibre. Never text on paper (2.22) |
| `--on-ink-muted`  | `#B8B6B0` | Meta text on ink                                                 | 8.94 on ink, 6.00 on the brightest lamp-lit fibre                                                 |
| `--river`         | `#6C8592` | Ohio River slate: the river and its label on the contour ground  | decorative only (3.36 on paper)                                                                   |
| `--input`         | `#857C6B` | Form field edges (3:1 non-text)                                  | 3.57 on paper, 3.17 on paper-deep; `#8D8A83` on ink, 5.26                                         |
| `--border`        | ink 14%   | Hairlines and dividers (decorative)                              |                                                                                                   |

**How the scopes work.** Colours are plain hex in `:root` and wired to utilities through `@theme inline`, so `text-heading`, `text-link`, `bg-primary` read `var(--heading)` and friends. Two scopes re-point them:

- `.on-ink` (every deep ground adds it): paper text, vermilion links and voice, `--primary` becomes paper (so the brand button turns paper with an ink label), `--ring` becomes vermilion.
- `.ground-paper-contours`: a contour line can sit under any word, so `--muted-foreground` goes to `#48494C` (4.95:1 on the worst line pixel) and `--marker` to brick.

**Rule for CSS authors:** write `var(--link)`, `var(--heading)`, `var(--marker)` in CSS, never `var(--color-link)`. The `--color-*` aliases resolve at `:root` and ignore a ground's scope (found 2026-10-04: the whole footer rendered in paper-ground colours).

Do not add a hue. Do not put `--marker-hot` or `--river` text on paper. Do not use `text-tertiary` for words on paper (it is vermilion, a graphic colour there).

## 3. Typography

Three families by role, four files, all self-hosted woff2 latin subsets in `src/assets/fonts/` (from Fontsource):

- **Bebas Neue** (13.8 KB, preloaded): Nathan's logo face. The display line, headlines h1 to h4, numerals (prices, durations, years), the phone-menu rows. Tracking 0.01em; never body copy, never long labels.
- **Newsreader** regular (22.5 KB, preloaded), italic (24.3 KB, on demand), semibold (23.9 KB, on demand): body, ledes, h5 and h6, and the **second voice**: the italic turn at the end of a Bebas headline, in china-marker red (`.voice`, "I MAKE WEBSITES THAT / _pull their weight._"). Every big headline turns into the italic for its last phrase, so no headline is a block of caps.
- **System sans** (0 KB): the furniture. Nav, buttons, form fields and labels, captions, edge print. Legible, not expressive.

Role classes (globals.css section 5): `.type-display`, `.type-headline`, `.voice`, `.type-lede`, `.type-body`, `.type-caption`, `.type-numeral`, `.type-ui`. Use the role, not a size. Fluid scale tokens: `--text-display`, `--text-h1` to `--text-h6`, `--text-lede`, `--text-body`, `--text-ui`, `--text-caption`, `--text-numeral` (utilities `text-h2` and so on).

**Loading and CLS.** BaseLayout preloads Bebas and Newsreader regular on every page (36.2 KB, down from 42.5 KB for Bebas plus Source Sans 3). A page whose first screen sets the italic or bold text adds `preloadFonts={['italic']}` or `['semibold']` to BaseLayout. Every family has a metric-matched local fallback (`size-adjust` and ascent / descent overrides measured from the font tables): Bebas against Impact (77.47%), Newsreader against Georgia (95.74% roman, 87.45% italic, 86.15% bold). Measured CLS 0 on every Lighthouse run (home and /services, mobile).

No monospace labels, no tracked uppercase eyebrows. Uppercase small text appears only as film edge print, and only for facts.

## 4. Grounds

The material system behind `<Band ground="...">` (`src/components/Band.astro`, CSS in globals.css section 7, assets in `src/assets/grounds/`, baked by `scripts/brand/build-grounds.mjs` from the d9 study's recipes, recoloured from the live tokens).

| Ground           | What it is                                                                                                                                                                                                 | Moving layer (Band only)                                                       | Assets, as served                 | Use for                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------- | ----------------------------------------------------- |
| `paper`          | Warm fibre paper, flat                                                                                                                                                                                     | none                                                                           | 0                                 | Most bands; the default                               |
| `window-light`   | A limewash wall in shade with late sun through a six-pane sash window lying across it (leaning patch, penumbra widening with distance, falloff down the wall)                                              | the patch slides as the sun moves (16 s) and dims as a cloud passes (13 s)     | wall 0.5 KB + window 9.4 KB       | The hero: the room the work is made in                |
| `paper-contours` | Contours every 10 m round the Ohio's bend at Cincinnati with the Great Miami, Mill Creek, the Licking and the Little Miami; the river courses are traced (d6), the relief is drawn from them, not surveyed | the sheet drifts 14 by 8 px (16 s), as under a loupe                           | 11.3 KB (SVG, brotli)             | Closing and contact bands: where "Cincinnati" belongs |
| `deep`           | An ink-dyed board with fine fibres; always `.on-ink`                                                                                                                                                       | a raking lamp crosses it every 14 s, lifting the fibres, then rests off screen | ink-flat 1.5 KB + ink-rake 3.1 KB | Prices, process, the about band, the footer (still)   |

Rules:

- **One moving ground per page, at the top.** Every later band passes `still`. The footer is always still.
- **Never put a deep band under the header.** The header sits on light grounds only.
- **No ground image delays LCP.** A ground paints its colour token immediately; `src/scripts/grounds.ts` adds `html.grounds-ready` after the load event plus an idle beat, and only then do the textures attach. `astro.config.mjs` keeps `src/assets/grounds/` out of Vite's 4 KB inlining so the tiles never land in the render-blocking CSS. Without JavaScript the grounds stay flat colour.
- **Compositor only.** Only `transform` and `opacity` animate; `will-change` sits only on moving layers; `grounds.ts` pauses a band's animations while it is off screen (`.is-off`).
- **Reduced motion** shows a designed still (the sun at rest, the sheet centred, the lamp off). Nothing starts at opacity 0.
- **AA over the worst moving point**, checked per pixel by the bake script. Change a token, re-run `node scripts/brand/build-grounds.mjs` and commit the assets.

Restraint is what keeps these owned rather than decorative (d9 risk 1): make the window light bigger, sharper or faster and it becomes a filter.

## 5. Layout and rhythm

- Container: `.ncs-container` caps at 82.5rem with a fluid gutter (`--gutter`, 1rem to 3.5rem) plus the safe-area insets. Reading measure `--container-prose` 40rem.
- Bands: `.band` (rendered by `<Band>`) pads `--band-y` (4.5rem to 8.5rem). Props `tight` (half) and `flush` (none); `underHeader` pulls the first band's ground up under the transparent header.
- Spacing scale `xs` to `3xl` (`p-l`, `gap-m` ...), all fluid.
- One grammar per band: a band has one job and one composition. Break the grid on purpose with a frame, never with decoration.
- Radii: 2px everywhere (a trimmed print). Photographs and screenshots are not rounded beyond that.
- Component classes live in `@layer components`, so a utility on the same element wins.

## 6. Elevation

Printed objects on a table: a warm, soft shadow and nothing else. `--shadow-print` (toasts, back-to-top), `--shadow-frame` (screenshots), `--shadow-card` (legacy cards). No glows, no coloured shadows, no inner highlights. Separation comes from the ground changing, from hairlines (`--border`) and from the work itself.

## 7. Motion

Easing `--ease-settle` (`cubic-bezier(0.16, 1, 0.3, 1)`) for everything that settles; `--ease-sway` for the grounds. The whole vocabulary:

- **Grounds** (above). One per page.
- **Reveal** (`data-reveal`, `"left"`, `"right"`, `"fade"`): figures, frames and numerals below the fold only, never headings, prose or CTAs. Hidden state scoped to `.js`; the first block of `<main>` never waits.
- **Drift** (`.motion-drift`, `--drift`): a print lifting off the table as it crosses the viewport. Scroll-driven (`animation-timeline: view()`), compositor only; still where unsupported.
- **Nudge** (`.nudge` + `data-nudge`, and `.card-link`): the arrow moves 3px on hover and focus.
- **Phone menu**: rows rise in on open.

Everything is inside `prefers-reduced-motion: no-preference`, and the global reduce rule in globals.css section 4 zeroes the rest (starter card 61).

## 8. Components

- **Logo** (`Logo.astro`): the official lockup, navy on paper, white on ink; `lockup="responsive"` serves the top line below 48rem. Never redraw or set it in live type.
- **Header**: transparent over the first ground, a paper bar with a hairline once scrolled. Logo left; nav and "Start a project" right. The button shows at every width, phones included. Below 48rem the nav moves into the phone menu (a native `<dialog>`, `MobileMenu.astro`). No React.
- **Footer**: the deep ground, still. White lockup, "Currently" with the status dot and the button, Explore / Contact / Connect, legal row.
- **Buttons** (`buttonVariants({ variant: 'brand', size: 'cta' })`): ink with a paper label, marker red on hover and focus, a solid ring, an optional arrow nudge. On ink: paper with an ink label, vermilion on hover. 44px minimum in the header, 48px at `cta` size. `variant="secondary"` is a quiet paper-deep button (now AA). No lift, no glow, no shine.
- **Links**: text inherits its colour with a marker underline; `text-link` (brick, or vermilion on ink) for accent links; `.card-link` for "Read more" with an arrow.
- **Frame** (`Frame.astro`): a real screenshot as a print. `variant="browser"` (ink chrome bar, live address, optional "Launching soon" tag) or `variant="film"` (ink rebate, sprocket rows, edge print of facts, optional china-marker `pick` loop). Only live work is shown as live.
- **Band** (`Band.astro`): one ground, one job (section 4).
- **Printed note card** (`PhotoRateCard.astro`, the `.note` on /journal): `--card` fill, hairline, `--shadow-print`, 2px. The honest empty state: real information (a rate, a status) in the space a photograph would fill, never a placeholder picture. Inside a deep band it re-scopes to ink-raised on its own.
- **Documents** (first used on `/services`): when a thing is a real piece of paper in Nathan's work, draw it as one. A sheet of `--paper-raised` with `--shadow-print`, a Bebas title over a **double rule** (`3px double var(--heading)`, the bookkeeper's mark for "this figure is final", also under prices), hairline-ruled rows, labels in the UI sans, and at most one red-pen note in the Newsreader italic. The price list slip (dot leaders), the price sheet (`PriceTiers.astro`, the kept price circled with the china-marker loop), the one-page brief and the photo-day call sheet (`src/components/services/`). Every line on a document must restate something true elsewhere; a document is never a placeholder. A sunk band (`bg-muted`, the `--paper-deep` token on a paper ground) is how a page alternates grounds without a second texture.
- **Back to top**: a small ink square, bottom right, after 600px of scroll. No React.
- **Focus**: one ring everywhere, 3px marker (vermilion on ink), 3px offset.

## 9. Do's and don'ts

**Do**

- Lead with real work, printed big enough to read, captioned with a fact that can be checked.
- Turn every big Bebas headline into the italic voice for its last phrase.
- Change the ground between bands; keep one moving ground per page.
- Measure any new colour pair with `src/lib/contrast.ts`, add it to `theme-tokens.test.ts`, and re-run the ground check.
- Write CSS against the raw tokens (`var(--link)`), so grounds can re-scope them.
- Keep the furniture in the system sans and sentence case.

**Don't** (the AI tells, banned outright)

- No gradient text, no `background-clip: text`. Emphasis is the italic voice or a solid token.
- No side-stripes or top-stripes on cards; no accent bars as decoration.
- No eyebrow-label scaffolding (tracked uppercase or mono labels over every section).
- No decorative numbering. A number appears only when the thing is a real sequence (the four-step process) or a real figure.
- No glow blobs, aurora meshes, noise-over-gradient, cursor spotlights, shine sweeps or neon.
- No stock photography, no device mock-ups as decoration, no fake metrics, quotes or logos.
- No dark mode, no new hues, no `dark:` classes in site code.
- No `data-reveal` on headings, prose or CTAs; nothing in the first viewport at opacity 0.
- No em-dashes in site copy.

## 10. Measured (2026-10-04, local `wrangler dev` of the production build, Lighthouse 12 mobile, 3 runs each)

| Build                                  | Home score | Home LCP           | /services score | /services LCP      | CLS | TBT       |
| -------------------------------------- | ---------- | ------------------ | --------------- | ------------------ | --- | --------- |
| Before (36c3a1f)                       | 92, 97, 93 | 3.20, 2.58, 3.19 s | 99, 99, 99      | 1.69, 1.77, 1.99 s | 0   | 0 to 4 ms |
| This foundation, CSS as files          | 94, 97, 96 | 2.77, 2.45, 2.47 s | 98, 98, 98      | 2.17, 2.16, 2.15 s | 0   | 0 ms      |
| This foundation, CSS inlined (shipped) | 97, 97, 97 | 2.49, 2.43, 2.43 s | 99, 99, 99      | 1.82, 1.82, 1.82 s | 0   | 0 ms      |

Accessibility 100 on every run. JS at load fell from about 116 KB to 10 KB on both pages (the header, menu and back-to-top no longer hydrate React). The home hero itself is still the old one; its rebuild owns the rest of the LCP budget. Local numbers read differently from CI's; the CI preview run is the authority (Gotcha 9).

## 11. Open decisions (Nathan's)

1. **Dark mode is retired.** Implemented as one dedicated, revertible commit ("Retire dark mode and the theme toggle"). Confirm, or revert that commit and approve a night version of each ground.
2. **Logo source.** The header and footer use the vector rebuild (`logo.svg`), which differs from the PNG master on some glyph edges (LOGO-NOTES.md: 8.3% of ink pixels). Flip `SOURCE` in `Logo.astro` to `'raster'` for the exact PNG-derived WebPs.
3. **Furniture face.** Buttons, nav and labels use the system sans (0 KB). d7a used Bricolage Grotesque (41 KB) for that role; it would add character and cost a font file on every page.
4. **Hero ground.** `window-light` is the default for the home hero (d9's first pick); `paper-contours` is the alternative.
5. **Inlined CSS.** All CSS is inlined into each page (`build.inlineStylesheets: 'always'`): measured faster, but every HTML response carries about 25 KB of CSS and repeat views do not cache it. One line in `astro.config.mjs` to undo.
