---
paths:
  - 'src/styles/**'
  - 'src/components/**'
  - 'src/layouts/**'
  - 'src/scripts/**'
  - 'src/pages/**'
---

# Styling: kit.css, page CSS, tokens, motion

Loads when styles, components, layouts, scripts or pages are touched. The design rules and the reasons for them are in `DESIGN.md` (repo root); read it before visual work. This file is the where and how.

## The files

- `src/styles/kit.css` is the shared stylesheet, imported once by `BaseLayout.astro` (and by `coming-soon.astro`, which does not use the layout). It holds the `@font-face`, the tokens, the top line, the dock, tiles, the client sheet, the closing, quote bands, the price hand, `.label`, `.giant` and `.pip`. It is plain CSS in the order things were added, with later blocks refining earlier ones, so search for a selector before adding a second rule for it.
- `src/styles/pages/*.css` is one file per page or family: `about`, `churches`, `colophon`, `legal` (privacy and accessibility), `prices` (the /services page), `start` (the /contact page), `study` (every case study), `sub` (photography and journal), `work`, `404`. Each page imports its own file in its frontmatter. Do not put page rules in `kit.css`.
- There is no Tailwind, no utility classes, no `globals.css` and no CSS-in-component framework. A new component's style goes in the page file that uses it, or in `kit.css` if two or more pages share it.

## Tokens

Declared in `:root` at the top of `kit.css`:

`--ground` (page), `--ink` (text), `--soft` (supporting text), `--card` (white), `--line` (hairlines), `--accent` (studio blue `#2f3fe6`), `--accent-soft`, `--fill`, `--on-ink`, `--on-ink-soft`, `--chip`, `--chip-ink`, `--dock`, `--wash`, `--well`, `--zebra`, `--sunk`, `--screen`, `--rim`, `--display` and `--body` (both Hanken Grotesk), `--gut` (page side padding, `clamp(1.25rem, 4vw, 4rem)`), `--edge` (the side padding that puts a full-bleed block's contents on the 90rem page's left edge), `--type-h1`, `--type-h2` and `--type-h3` (the display scale; use them rather than a new clamp) and `--ease`.

- One typeface: Hanken Grotesk, one variable file at `public/assets/fonts/hanken.woff2`, preloaded in `BaseLayout.astro`. `brand/fonts/` holds two static `.woff` weights for the OG generators only; opentype.js cannot read a variable woff2. Do not add a second face.
- Two themes, light and dark, under `data-theme` on `<html>`; DESIGN.md section 2a has the rules. Dark tokens are set again in `:root[data-theme='dark']` inside `@media screen`, dark-only rules sit in the same kind of block in the file that owns the surface, and light must stay pixel-identical when dark changes. `--accent` is blue text, `--fill` is a blue surface. A client's color on the neutral page is `var(--cm, var(--c))`. A new card's `box-shadow` starts with `var(--rim)`. There is no navy and no amber.
- A client's colors never become tokens. They arrive as `--c` (accent) and `--p` (paper, and the text color on the accent), set inline on a `.tile`, a `.band`, the sheet or the study `<body>` (`bodyStyle` on `BaseLayout`).
- A new hex or token pair clears WCAG AA and is asserted in `src/lib/kit-tokens.test.ts`; a client pair in `src/lib/case-palettes.test.ts`.

## Patterns to reuse

- **Label voice**: `.label` (small, uppercase, tracked, tabular numbers).
- **Big line**: a `.giant` inside a `.big` container, sized with `--fit` (wide) and `--fitm` (phone) in container-widths; add `data-weigh` for the scroll-driven weight gain. Check 320px.
- **Deck**: `.pip` and `.pip.flip` in two opposite corners of a portrait card, one `.pip` alone on a wide box, `.keyed` for the inner rule, `.pc` for a price card, `.tile` for a client window. No suits.
- **Hairlines for non-cards**: `border-top: 1px solid var(--line)` on lists, tables and FAQs. Do not box them.
- **Color**: the page is neutral, the studio blue is `--accent`, a client's color stays in their own surface. A `.band` and the `.end` closing never touch: keep a neutral section between them.
- **Cards** are `.card` or their own radius (1.25rem; bands and the closing 1.75rem; buttons fully round).
- **H1 reveal**: words are wrapped in the markup by `wordSpans()` (`src/lib/words.ts`; `PageHead.astro` does it). `.js .w` animates from opacity .02. This is the one allowed start below full opacity in the first viewport.
- **The closing's parts**: `.end-work` (names and the white bar, `[data-pull]` per row, in `kit.js`), `.end-index` (the ruled site index, a new link goes in one of its groups), `.end-name` (one `<i>` a letter, clipped per word), `.end-base`. Text on the closing is white or sits on white; use `--fill` for blue on white.
- **Reveals for study blocks**: `.rv` is hidden only under `.rv-on` (added by `study.js` when motion is allowed and `IntersectionObserver` exists) and shown with `.in`. Nothing in the first viewport takes it.

## Motion

- Springs are written in JavaScript: `ui.spring(k, c, v)` in `src/scripts/kit.js`, and the per-page scripts use it. CSS motion uses `--ease` or a springy bezier; keep durations short.
- Page changes are cross-document view transitions (`@view-transition { navigation: auto }` in `kit.css`; the dock keeps `view-transition-name: dock`). There is no router.
- Every moving thing has a reduced-motion answer: read `ui.reduce` in script, and add the selector to the `@media (prefers-reduced-motion: reduce)` blocks in CSS. Under reduce the view transition and smooth scroll are off, springs start at rest, footage stays a still, and nothing runs after load (`tests/reduced-motion.spec.ts`).
- The dock's motion (puck, rail, hands) is its own block in `kit.js`. `ui.spring`'s `step` takes an optional third argument, a stiffness for that step, which the puck uses so the leading edge is the quicker one. Class names in the dock are prefixed `dk-` or `fc`: `.fan`, `.rail` and `.more` already mean something on the sheet and the case studies.
- A hover that lifts its card uses `ui.stillHover` in `kit.js`, so the card cannot lift off the pointer and jitter.
- There is no Pause motion button and no `data-motion` attribute (the client sheet's looping clip has its own pause button). Footage starts only on hover or, on a touch screen, while a window is centred, and stops when it leaves; nothing else loops by itself.

## Forced colors and print

A card is drawn with a shadow and a background, so `kit.css` gives `.tile`, `.card`, `.pc-face`, `.chip` and `.dock` a 1px `CanvasText` border under `@media (forced-colors: active)`. A new surface whose edge is only a shadow joins that list (`tests/forced-colors.spec.ts`). Print hides the top line, dock, sheet and closing.

## Top line

`TopLine.astro` is the name and the status button, plus the `.reach` popover. `kit.js` adds `.float` and a transform (the pills on scrolling up) and splits the name into `.lt` letters on first use. Colors are tokens, so it follows the theme; `.top.float.on-color` puts it back on `--ink` once it has left the client's color. A new bar that sticks to the top of the screen joins the `topBar` selector in `kit.js`, so the pills do not land on it.

## Fixed elements

The viewport meta carries `viewport-fit=cover`. The dock (`Dock.astro`, design in `DESIGN.md`) sits at `bottom: max(0.9rem, env(safe-area-inset-bottom))` and the mailto toast above it. A new `position: fixed` element at a screen edge adds the matching `env(safe-area-inset-*)`.
