---
paths:
  - 'src/styles/**'
  - 'src/components/**'
  - 'src/layouts/**'
  - 'src/scripts/**'
  - 'src/pages/**'
---

# Styling: palette, grounds, type, motion

Loads when styles, components, layouts or pages are touched. The design system is `DESIGN.md` at the repo root (north star, every token with its contrast, the grounds, components, do's and don'ts, open decisions). This file is the working summary; the CSS in `src/styles/globals.css` wins if they disagree.

## Palette and tokens

One art-directed theme since the 2026 redesign: warm fibre paper, the logo's ink, one china-marker red. Every colour is a plain hex literal in `:root` (globals.css section 12) and is wired to utilities through `@theme inline` (section 11), so `bg-primary`, `text-heading`, `text-link`, `text-text-muted`, `bg-bg-soft`, `border-border`, `ring-ring` all work. Use utilities or tokens, never hex in a component.

| Token                                     | Hex       | Use                                                   |
| ----------------------------------------- | --------- | ----------------------------------------------------- |
| `--ink` (`--primary`, `--heading`)        | `#0A1628` | Headings, buttons, the deep ground                    |
| `--ink-body` (`--foreground`)             | `#1D2532` | Body text                                             |
| `--ink-muted` (`--muted-foreground`)      | `#56585C` | Meta text                                             |
| `--paper` (`--background`)                | `#F3EEE4` | The page                                              |
| `--paper-deep` (`--muted`, `--secondary`) | `#E9E1D2` | Sunk bands, quiet buttons                             |
| `--paper-raised` (`--card`)               | `#FBF8F2` | Cards, popovers                                       |
| `--marker` (`--accent`, `--ring`)         | `#AE2F1B` | The italic voice, button hover, focus ring            |
| `--brick` (`--link`, `--destructive`)     | `#8E2B1B` | Links and accent text, form errors                    |
| `--marker-hot` (`--tertiary`)             | `#F2835F` | The marker on ink; graphic marks. Never text on paper |

shadcn mapping: `--primary` is ink (default Button), `--accent` is the marker, `--secondary` is paper-deep (so `variant="secondary"` is now AA; Gotcha 2 is retired). If a shadcn primitive looks off-brand, fix `:root`, not the primitive.

**Scopes.** `.on-ink` (every deep ground) re-points the semantic tokens: paper text, vermilion links and voice, paper buttons with ink labels, a vermilion ring. `.ground-paper-contours` darkens `--muted-foreground` and turns `--marker` brick. **So in CSS write `var(--link)`, `var(--heading)`, `var(--marker)`; never `var(--color-link)`**: the `--color-*` aliases resolve at `:root` and ignore the scope (Gotcha 26).

Every new pair goes into `src/lib/theme-tokens.test.ts`; any token change re-runs `node scripts/brand/build-grounds.mjs` (it checks text against each ground's worst pixel).

## Theme

One theme. No dark mode, no toggle, no `.dark` block, no stored preference. `@custom-variant dark (&:is(.dark *))` stays only so the `dark:` utilities inside vendored shadcn primitives stay inert (without it Tailwind 4 would follow `prefers-color-scheme`); nothing adds `.dark`, and site code never writes `dark:`. The inline script in `BaseLayout.astro` only adds `.js` to `<html>`. The removal is one revertible commit ("Retire dark mode and the theme toggle").

## Grounds and bands

Pages are runs of `<Band ground="...">` (`src/components/Band.astro`): `paper` (default), `window-light` (limewash wall and late sun, the hero), `paper-contours` (the Ohio bend, closing bands), `deep` (ink board under a raking lamp, always `.on-ink`). Props: `still`, `underHeader`, `tight`, `flush`, `container`, `as`, `labelledby`, `label`. The classes (`ground ground-window-light` and so on) also work alone on a section: texture without the moving layer.

- One moving ground per page, at the top; `still` on the rest; the footer is always still.
- Never a deep band under the header (the header sits on light grounds only).
- Textures attach after the load event (`html.grounds-ready`, `src/scripts/grounds.ts`) and never sit in the CSS (`astro.config.mjs` keeps `src/assets/grounds/` out of Vite's inlining), so they never delay LCP.
- Moving layers animate transform and opacity only, pause off screen (`.is-off`) and show a still under reduced motion.
- Component classes are in `@layer components`, so a utility on the same element wins; a component's scoped `<style>` beats both.

## Type

- Bebas Neue (logo face): display, h1 to h4, numerals. Newsreader: body, ledes, h5 and h6, and the italic **second voice** (`.voice`, marker red) that ends each big headline. System sans: nav, buttons, labels, captions, form fields.
- Role classes: `.type-display`, `.type-headline`, `.voice`, `.type-lede`, `.type-body`, `.type-caption`, `.type-numeral`, `.type-ui`. Scale tokens `--text-display`, `--text-h1` to `--text-h6`, `--text-lede`, `--text-body`, `--text-ui`, `--text-caption`, `--text-numeral`.
- Fonts are self-hosted in `src/assets/fonts/` with metric-matched fallbacks, each face split into a preloadable `-core` file and a `-ext` file by `unicode-range` (regenerate both with `python scripts/brand/subset-fonts.py`; never edit the woff2 files by hand). BaseLayout preloads the Bebas and Newsreader regular core files; add `preloadFonts={['italic']}` (or `'semibold'`) when the first screen uses them.
- No mono or tracked-uppercase eyebrows; uppercase small text only as film edge print of facts.

## Motion vocabulary

Defined once in globals.css section 8. Use these; don't reinvent:

- `data-reveal` (+ `fade` / `left` / `right`, stagger with `style="--reveal-delay: 90ms"`): figures, frames and numerals below the fold only. Hidden state scoped to `.js`; the first block of `<main>` never waits (never-break rule 2). **Screenshot trap:** a fast or `fullPage`-only capture leaves revealed bands blank; scroll through in 400 px steps with pauses first.
- `.motion-drift` (`--drift`): a scroll-driven translate as an element crosses the viewport; still where unsupported.
- `.nudge` + `data-nudge` on an arrow, and `.card-link`: the 3 px arrow nudge.
- `data-countup data-countup-to="10"`: count-ups. Always render the real final value as the static text.
- The grounds (above).
- Gone, do not bring back: aurora, grain, `.band-themed`, `.bg-mesh-soft`, `.bg-dotgrid`, `.shine`, the cursor spotlight glow (`.spotlight-card` is now inert), gradient text, the WebGL hero.

Legacy utilities still used by pages not yet rebuilt (`.surface-card`, `.hover-lift`, `.spotlight-card`, `.link-underline`) live in globals.css section 9, retinted. New work does not use them; delete each when its last user goes.

**No-JS robustness:** reveal hidden states are scoped to `.js`; grounds stay flat colour; the phone menu needs JS to open, but the header button to /contact/ and the footer nav stay usable without it. Page enhancement scripts register on `astro:page-load` with a dataset re-bind guard.
