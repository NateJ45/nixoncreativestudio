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

Nathan is a web designer who came from photography. The site is laid out the way he judges his own work: on a contact sheet. Real client sites are printed as frames (browser prints and film-strip frames with edge print), and the facts are printed on the film edge. The table sits in a north-facing room where late sun comes through a sash window and lies across a limewash wall, and the studio is in Cincinnati, on the bend of the Ohio. Those three things (the sheet, the window light, the river) are the identity. None of them could be moved to another studio's site unchanged, which is the test the d9 study set.

- **One art-directed theme** since 2026-10-04. There is no dark mode, no toggle and no `.dark` token block (FBCM and Reid Design made the same call). The single "dark" is a deliberate ground, the ink board, not a theme.
- **Paper and ink, one red.** The page is warm fibre paper; text and the deep ground are the logo's ink; the one strong accent is a china-marker red. No blue on cream, no heritage green and gold, no gradients.
- **Grounds, not washes.** Each band sits on a ground and the ground changes deliberately between bands, never inside one. A page is never one flat colour from top to bottom (the old light mode's problem).
- **Show the work at a size you can read**, as prints on the table. The work leads; adjectives do not.
- **Spend motion once, and make it the work.** One moving ground at the top of a page, a reveal for figures below the fold, a slow drift, an arrow nudge. The one thing that plays is real client work: on the home page the reel's centre frame and the proof sheet's lead frame run a short muted loop of the live site, with a visible Pause, never under reduced motion or Save-Data (round 2, 2026-10-04). Nothing else loops while the visitor reads.

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

Three families by role, four faces, all self-hosted woff2 from Fontsource's latin subsets, each split into a "core" and an "ext" file by `unicode-range` (`scripts/brand/subset-fonts.py`, sources in `scripts/brand/font-sources/`): core holds what English copy uses (ASCII, curly quotes, dashes, ellipsis, (c), the middle dot) and is about 40% smaller; ext holds the accented letters and rarer marks and downloads only on a page whose text needs one. Sizes below are the core files.

- **Bebas Neue** (9.6 KB, preloaded): Nathan's logo face. The display line, headlines h1 to h4, numerals (prices, durations, years), the phone-menu rows. Tracking 0.01em; never body copy, never long labels.
- **Newsreader** regular (13.8 KB, preloaded), italic (15.3 KB, on demand), semibold (14.8 KB, on demand): body, ledes, h5 and h6, and the **second voice**: the italic turn at the end of a Bebas headline, in china-marker red (`.voice`, "I MAKE WEBSITES THAT / _pull their weight._"). Every big headline turns into the italic for its last phrase, so no headline is a block of caps.
- **System sans** (0 KB): the furniture. Nav, buttons, form fields and labels, captions, edge print. Legible, not expressive.

Role classes (globals.css section 5): `.type-display`, `.type-headline`, `.voice`, `.type-lede`, `.type-body`, `.type-caption`, `.type-numeral`, `.type-ui`. Use the role, not a size. Fluid scale tokens: `--text-display`, `--text-h1` to `--text-h6`, `--text-lede`, `--text-body`, `--text-ui`, `--text-caption`, `--text-numeral` (utilities `text-h2` and so on).

**Loading and CLS.** BaseLayout preloads the core files of Bebas and Newsreader regular on every page (23.4 KB; 36.2 KB before the core/ext split, 42.5 KB for Bebas plus Source Sans 3 before that). A page whose first screen sets the italic or bold text adds `preloadFonts={['italic']}` or `['semibold']` to BaseLayout. Every family has a metric-matched local fallback (`size-adjust` and ascent / descent overrides measured from the font tables): Bebas against Impact (77.47%), Newsreader against Georgia (95.74% roman, 87.45% italic, 86.15% bold). Machines without Impact and Georgia (Linux, so the CI Lighthouse runner, and ChromeOS) get a second set: `Bebas Fallback Narrow` against Arial Narrow / Liberation Sans Narrow (70.8%) and `Newsreader Fallback Times` against Times New Roman / Liberation Serif / Tinos (105.06% roman, 97.39% italic, 103.27% bold); without it the swap moved /contact/ by CLS 0.30 in CI (2026-10-04). Two rules keep a late font from moving a first screen: a hero measure is written in `em`, never `ch` (`ch` follows whichever font is showing), and a measure must not sit right on a line break of the real font (the /photography/ headline is 6.3em so both fonts break it the same way). Measured CLS 0 on every Lighthouse run (home, /services, /contact, /photography, mobile); `tests/layout-stability.spec.ts` holds it with the fonts deliberately delayed.

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
- **The header sits on light grounds,** with one exception: the home hero is the deep ground, and the page passes `headerOnInk` to BaseLayout so the header shows its on-ink face (white logo, paper nav, paper button) until it scrolls, then the usual paper bar. Any other page that wants a deep first band does the same; never put ink under the plain header.
- **No ground image delays LCP.** A ground paints its colour token immediately; `src/scripts/grounds.ts` adds `html.grounds-ready` after the load event plus an idle beat, and only then do the textures attach. `astro.config.mjs` keeps `src/assets/grounds/` out of Vite's 4 KB inlining so the tiles never land in the render-blocking CSS. Without JavaScript the grounds stay flat colour.
- **A layer never depends on the band's height.** Place ground layers with fixed lengths (`rem`, `vw`), never a `%` top or left: the window-light sun was `top: -6%`, so every change in the hero's height (a font swapping in) moved a viewport-sized layer and Chrome scored the whole hero as shifted (CI CLS 0.30 on /contact/, 2026-10-04). `inset: 0` layers that only grow are fine; layers that move are not.
- **Compositor only.** Only `transform` and `opacity` animate; `will-change` sits only on moving layers; `grounds.ts` pauses a band's animations while it is off screen (`.is-off`).
- **Reduced motion** shows a designed still (the sun at rest, the sheet centred, the lamp off). Nothing starts at opacity 0.
- **AA over the worst moving point**, checked per pixel by the bake script. Change a token, re-run `node scripts/brand/build-grounds.mjs` and commit the assets.

Restraint is what keeps these owned rather than decorative (d9 risk 1): make the window light bigger, sharper or faster and it becomes a filter.

### Hero ground (home, round 2, 2026-10-04)

The home hero is the one place the river is turned up. **Chosen: `ink`**: the deep ground under the header, the lamp crossing it, the Ohio's contours drawn light on the ink (paper at 16%), the river's bed one step up (ink-raised) and its banks and name in vermilion (34%). It was set beside the alternative at 1440 and 390 and is the one that reads as a poster rather than a page; the tagline, in paper Bebas at up to 11.25rem with the vermilion italic turn, is the brightest thing on the screen. **Kept as a switch: `paper`**: the survey sheet turned up (the contour brown at 42%, the bed a step darker, the banks in river slate 70%), the ink tagline with the brick turn. Switch with one line, `HERO_GROUND` in `src/lib/homeWork.ts` (it also tells BaseLayout whether the header sits on ink); the colours are tokens in `src/lib/heroGround.ts`.

- **Drawn with masks, not images.** `home/ContourLayers.astro` stacks three CSS masks of the foundation's contour sheet (`src/assets/home/contours-{lines,bed,edge,edge-phone}.svg`, white on transparent, split by `node scripts/brand/build-hero-contours.mjs`) over one-colour gradient fills. A background image attached after load became the LCP element (2.6 s, 2026-10-04); a mask never is. Masks attach after the load event like every texture.
- **Contrast is checked per pixel** by `src/lib/heroContours.test.ts` (every hero text colour over the ground, the bed and each line at its opacity). Body text on either ground is paper or ink; the vermilion and brick turns are display size only (3:1). axe cannot see a mask, which is why the fills are gradients: it leaves those pixels to the test instead of scoring text against a solid wash.
- The river's name shows at desktop only (the phone mask has none: it would sit under the words). The closing band uses the `paper` tokens without the name.

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
- **Header**: transparent over the first ground, a paper bar with a hairline once scrolled. Logo left; nav and "Start a project" right. The button shows at every width, phones included. Below 48rem the nav moves into the phone menu (a native `<dialog>`, `MobileMenu.astro`): a modal with `aria-expanded` on the trigger, Tab kept inside, Escape back to the trigger; without JavaScript the same dialog is a popover the buttons open (`popovertarget`). No React.
- **Footer**: the deep ground, still. White lockup, "Currently" with the status dot and the button, Explore / Contact / Connect, legal row.
- **Buttons** (`buttonVariants({ variant: 'brand', size: 'cta' })`): ink with a paper label, marker red on hover and focus, a solid ring, an optional arrow nudge. On ink: paper with an ink label, vermilion on hover. 44px minimum in the header, 48px at `cta` size. `variant="secondary"` is a quiet paper-deep button (now AA). No lift, no glow, no shine.
- **Links**: text inherits its colour with a marker underline; `text-link` (brick, or vermilion on ink) for accent links; `.card-link` for "Read more" with an arrow.
- **Frame** (`Frame.astro`): a real screenshot as a print. `variant="browser"` (ink chrome bar, live address, optional "Launching soon" tag) or `variant="film"` (ink rebate, sprocket rows, edge print of facts). Only live work is shown as live: a study that is not live shows its status tag and no address. **Each device once (2026-10-04 review: "one idea stamped by formula"):** no drawn marker loop over any picture on the home page (Nathan, round 2: the centre frame reads as focused by size, shadow and caption); film edges only on the home proof sheet and the /work lead; plain browser frames everywhere else, including the landing pages, /services and /contact.
- **Photo print** (/about, scoped `.print`): a personal photograph with a trimmed `--paper-raised` border (0.4 to 0.75rem), 2px radius and `--shadow-frame`, captioned below in `.type-caption` with a checkable fact. Small prints sit in one justified row (flex-grow = width/height, every other print a little lower), never as heroes; at most a 1.25deg tilt, and only at desktop.
- **Band** (`Band.astro`): one ground, one job (section 4).
- **Showreel** (`Showreel.astro`, `src/scripts/showreel.ts`): a directed walkthrough of a live client site on its case study, a camera over sharp stills with short live clips cut in. Poster first (it is the LCP), nothing downloads until after load and idle, plays only in view, a Play/Pause button, a designed still under reduced motion. Only on case studies, never the home hero.
- **WorkPrint** (`WorkPrint.astro`): one study on /work as a print on the table, a Frame plus its sector, title, outcome and two links. The /work page varies its size and placement so no two neighbours share a shape.
- **Facts ledger** (case studies): the job's facts as plain-label rows on hairlines (Place, Year, My role, What they run themselves), sentence case, no mono. The stack is one caption line under it.
- **Hero reel** (`home/HeroReel.astro`, the home page): the fan of browser prints from Nathan's sketch. A scroll-snap row whose frames take their fan position from a CSS view timeline; arrows on a strip of film underneath (on screens 1100px and wider they sit at the centre frame's sides, so they show above the fold, and the strip keeps the counter and the Pause button); the centre frame lifted by the deepest shadow on the table, never a drawn loop; a caption naming the centre site with one proven fact. Never auto-advances. **The centre frame is live:** centred and in view, it plays its short muted loop of the real site (`public/reel/home/manifest.json`, keyed by reel slide id, read at build time by `reelClips()`; a slide with no clip shows its still), laid exactly over the still, which stays underneath as the poster; clips wait for load and idle, only the centre one loads, the next one when the visitor reaches for the reel; none under reduced motion, Save-Data or no JavaScript. The start frame's still is the LCP image when it is the largest thing on screen (on a phone the poster-scale headline is, and that is fine: it is text and paints at once); every other frame is parked until after load, then only the frames on show load, their neighbours when the visitor reaches for the reel, the rest as it travels (Gotcha 14).
- **Proof sheet** (`home/ProofSheet.astro`): the work band shows a detail of each site that the hero reel does not (never the same picture or fact twice on the page). Three compositions: the lead as a strip of film (edge print in the flow so it wraps whole on a phone) with its first frame live (`home/LiveClip.astro`: the Stone Steps course map moving as on the real page, a still underneath, a Pause button on the frame) beside its note; a pair of plain matted prints with the words under each, hung at different heights; a wide strip with the words in columns above. The red italic turn under a name is used once, on the lead.
- **DeferredPicture** (`home/DeferredPicture.astro`): a below-the-fold picture parked in `data-` attributes until after load and an idle beat, then promoted half a screen before it scrolls into view (no timer: an idle visitor fetches none), with a `<noscript>` copy. Use it for any picture that sits inside Chrome's lazy-load distance on a phone; a picture several screens down (the home About band) takes plain `loading="lazy"`.
- **Printed note card** (`PhotoRateCard.astro`, the `.note` on /journal): `--card` fill, hairline, `--shadow-print`, 2px. The honest empty state: real information (a rate, a status) in the space a photograph would fill, never a placeholder picture. Inside a deep band it re-scopes to ink-raised on its own.
- **Documents** (first used on `/services`): when a thing is a real piece of paper in Nathan's work, draw it as one. A sheet of `--paper-raised` with `--shadow-print`, a Bebas title over a **double rule** (`3px double var(--heading)`, the bookkeeper's mark for "this figure is final", also under prices), hairline-ruled rows, labels in the UI sans, and at most one red-pen note in the Newsreader italic. The price list slip (dot leaders), the price sheet (`PriceTiers.astro`, the kept price circled with the china-marker loop), the one-page brief and the photo-day call sheet (`src/components/services/`). Every line on a document must restate something true elsewhere; a document is never a placeholder. A sunk band (`bg-muted`, the `--paper-deep` token on a paper ground) is how a page alternates grounds without a second texture.
- **Landing-page bands** (`src/components/landing/`): `LandingCost` (a paragraph in the reader's terms and the one or two tiers that fit as small price slips, linking to the full sheet on /services, never the sheet itself) and `LandingSteps` (the four process steps told from the client's side, as a `ledger`, `pairs` or `rail`). Each landing page composes them differently; facts are written as sentences, never as a row of big figures.
- **Tap target** (`.tap-target`, globals.css): 44 by 44 on a coarse pointer and on screens up to 64rem, untouched on a desktop mouse. Header nav, footer links and the contents lists already meet it on their own.
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
- No stat triplets (three big figures with a caption each). A fact is a sentence.
- No hard offset shadows (`6px 6px 0`); elevation is `--shadow-print` or `--shadow-frame`.

## 10. Measured (2026-10-04, local `wrangler dev` of the production build, Lighthouse 12 mobile, 3 runs each)

| Build                                  | Home score | Home LCP           | /services score | /services LCP      | CLS | TBT       |
| -------------------------------------- | ---------- | ------------------ | --------------- | ------------------ | --- | --------- |
| Before (36c3a1f)                       | 92, 97, 93 | 3.20, 2.58, 3.19 s | 99, 99, 99      | 1.69, 1.77, 1.99 s | 0   | 0 to 4 ms |
| This foundation, CSS as files          | 94, 97, 96 | 2.77, 2.45, 2.47 s | 98, 98, 98      | 2.17, 2.16, 2.15 s | 0   | 0 ms      |
| This foundation, CSS inlined (shipped) | 97, 97, 97 | 2.49, 2.43, 2.43 s | 99, 99, 99      | 1.82, 1.82, 1.82 s | 0   | 0 ms      |

**Performance pass (2026-10-04, branch `perf-pass`, same method, median of 3; LCP in ms, transfer at load in KB):**

| Change                                                                              | Home LCP / KB | /services  | /about     | /contact   | /photography |
| ----------------------------------------------------------------------------------- | ------------- | ---------- | ---------- | ---------- | ------------ |
| Before the pass                                                                     | 1999 / 315    | 1901 / 244 | 1997 / 437 | 1824 / 199 | 1752 / 259   |
| 1. Dead kit and packages out, Tailwind scan narrowed (inline CSS 137 to 100 KB raw) | 1831 / 304    | 1748 / 228 | 1990 / 420 | 1824 / 188 | 1747 / 236   |
| 2. Fonts split core / ext (preloaded 60 to 39 KB)                                   | 1886 / 283    | 1553 / 207 | 1848 / 391 | 1694 / 167 | 1534 / 216   |
| 3. AVIF and true `sizes` on the About, contact, call-sheet photos                   | 1875 / 283    | 1555 / 207 | 1702 / 306 | 1615 / 164 | 1532 / 216   |
| 4. Prefetch on hover, icons cached                                                  | 1930 / 253    | 1546 / 134 | 1530 / 232 | 1714 / 121 | 1537 / 114   |
| Final build                                                                         | 1859 / 253    | 1545 / 134 | 1690 / 232 | 1557 / 121 | 1533 / 114   |

Scores 99 to 100 throughout (they were already 99 locally, so the score cannot show the gain; LCP and bytes do). 5. The analytics beacon after load (A/B with a dummy token, median of 5): home LCP 2015 to 1850, /contact 1862 to 1558. CLS 0 and TBT 0 in every run. Production also carries Cloudflare's Bot Fight Mode script, which only the dashboard can remove: `docs/redesign-2026/performance-handoff.md`.

Accessibility 100 on every run. JS at load fell from about 116 KB to 10 KB on both pages (the header, menu and back-to-top no longer hydrate React). The home hero itself is still the old one; its rebuild owns the rest of the LCP budget. Local numbers read differently from CI's; the CI preview run is the authority (Gotcha 9).

**Round 2, home (2026-10-04, branch `v2-hero`, same method, 4 runs):** score 99, 99, 99, 99; LCP 1790, 1905, 1853, 1911 ms (the element is the poster-scale headline on the simulated phone); CLS 0; TBT 0 to 63 ms; 389 KB transferred; accessibility 100; home JS 11.8 KB gzipped. A first build with the contour lines as a background image measured LCP 2.26 to 2.61 s with the LCP on that layer; the masks fixed it.

## 11. Open decisions (Nathan's)

1. **Dark mode is retired.** Implemented as one dedicated, revertible commit ("Retire dark mode and the theme toggle"). Confirm, or revert that commit and approve a night version of each ground.
2. **Logo source.** The header and footer use the vector rebuild (`logo.svg`), which differs from the PNG master on some glyph edges (LOGO-NOTES.md: 8.3% of ink pixels). Flip `SOURCE` in `Logo.astro` to `'raster'` for the exact PNG-derived WebPs.
3. **Furniture face.** Buttons, nav and labels use the system sans (0 KB). d7a used Bricolage Grotesque (41 KB) for that role; it would add character and cost a font file on every page.
4. **Hero ground.** Round 2 (2026-10-04) moved the home hero to the `ink` ground with the contours turned up (section 4, "Hero ground"); `paper` is the one-line alternative.
5. **Inlined CSS.** All CSS is inlined into each page (`build.inlineStylesheets: 'always'`): measured faster, but every HTML response carries about 25 KB of CSS and repeat views do not cache it. One line in `astro.config.mjs` to undo.
