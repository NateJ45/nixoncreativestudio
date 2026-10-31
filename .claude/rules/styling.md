---
paths:
  - 'src/styles/**'
  - 'src/components/**'
  - 'src/layouts/**'
  - 'src/scripts/**'
  - 'src/pages/**'
---

# Styling: type, tokens, surfaces, grid, theme, motion

Loads when styles, components, layouts, scripts or pages are touched. The type and token layer was rebuilt in overhaul package 1.5 (2026-10-31). `src/styles/globals.css` is **frozen** after packages 1.5 and 1.7 (plan ruling 10): page and component CSS goes in scoped `<style>` blocks, and only shared tokens and primitives live in `globals.css`.

The idea the system serves: the site is a reel of real client websites, and it uses **weight as its emphasis**. Surfaces are white, paper and ink separated by hairlines. Blue is kept for things you can click.

## Type

Three faces, all self-hosted, latin subset only, `font-display: swap`:

| Face                         | Token / utility                    | Used for                                                                               | Preloaded |
| ---------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------- | --------- |
| Bricolage Grotesque Variable | `--font-display`, `font-display`   | every heading (h1 to h6) and the display utilities                                     | yes       |
| Source Sans 3 Variable       | `--font-body`, `font-body`         | body, UI, buttons, forms                                                               | yes       |
| Bebas Neue 400               | `--font-wordmark`, `font-wordmark` | the header wordmark "NIXON CREATIVE STUDIO" (and the journal "NCS" mark), nothing else | no        |
| System mono                  | `--font-mono`, `font-mono`         | metadata only (rail labels, hosts, dates, sector)                                      | no file   |

Bebas stays for the wordmark by Nathan's decision (2026-10-30). Never use `font-wordmark` on a heading. OG cards and the favicon keep their Bebas mark (generated separately, see `build-pipeline.md`).

The two variable faces are declared by hand in `globals.css` section 2 (the latin `@font-face` copied from `@fontsource-variable/*`), because those packages have no per-subset stylesheet and the full one ships cyrillic, greek and vietnamese blocks. Bebas uses `@fontsource/bebas-neue/latin-400.css`. `BaseLayout.astro` preloads Bricolage (41 KB) and Source Sans (29 KB): 2 of the 3 preloads `tests/page-weight.config.json` allows, each under `maxFontKb` 120. Bebas is not preloaded: the wordmark is never the LCP element.

### Scale

Tokens in the `@theme` block. Each size carries its own line-height, tracking and weight (Tailwind 4's `--text-x--line-height` and friends), so `text-h3` on a `<p>` looks like an h3 with no extra classes; `font-*` and `leading-*` utilities still override.

| Token                      | Size                                       | Leading | Tracking | Weight | Where                                    |
| -------------------------- | ------------------------------------------ | ------- | -------- | ------ | ---------------------------------------- |
| `--text-display`           | `clamp(3rem, min(6.2vw, 10.5vh), 6.25rem)` | 0.95    | -0.045em | 300    | the homepage hero statement only         |
| `--text-h1`                | `clamp(2.75rem, 5.2vw, 4.75rem)`           | 1       | -0.035em | 300    | page H1s                                 |
| `--text-h1-long`           | `clamp(2.25rem, 5.2vw, 4.75rem)`           | 1       | -0.035em | 300    | the case-study title (long client names) |
| `--text-h2`                | `clamp(2rem, 3.4vw, 3.25rem)`              | 1.05    | -0.03em  | 300    | section titles                           |
| `--text-h3`                | `clamp(1.375rem, 2vw, 1.75rem)`            | 1.15    | -0.02em  | 650    | subsections                              |
| `--text-h4` to `--text-h6` | about 1.375rem down to 1rem                | 1.2-1.3 | small    | 650    | labels, card titles                      |

Headings use `text-wrap: balance`. Every heading wraps long words (`overflow-wrap: break-word`), and h1 uses `overflow-wrap: anywhere` so a long client name can never push a 320px page sideways (plan ruling 16; `tests/reflow.spec.ts` sweeps `/work/first-presbyterian-orangeburg`, the longest title).

### Weight is the emphasis

- h1 and h2 sit at 300. Put the heavy phrase in `<b>` (or `<strong>`), which goes to 800: `A one-person studio for <b>organizations that take their work seriously.</b>`
- h3 and below sit at 650.
- Headings are never coloured, capitalised or gradient for emphasis. No `text-link` or `text-tertiary` spans inside a heading, no `uppercase`, no `background-clip: text`. Copy is sentence case exactly as written; the base heading rule has no `text-transform`.
- A card heading that is itself a link may change colour on hover or focus (a link state, not emphasis).
- One weight animation per page, on the H1's heavy phrase: wrap it in `<Heft text="..." />` (`src/components/Heft.astro`, package 1.7), which renders the `<b>`. H2s stay static at 300/800.

### Metric-matched fallbacks

While Bricolage loads, headings draw in `'Bricolage Grotesque Variable Fallback'` (Arial scaled to Bricolage's letter width, ascent and descent), named second in `--font-display`, so a title breaks where the real one will and nothing jumps when the font lands. It is written by the PORTABLE `npm run font-fallback`, driven by `brand/brand.config.json` (edit the config, never the script). The variable package ships woff2 only, which the script cannot read, so it runs with `--file` pointed at the static twin's latin-400 `.woff` (same font, not a dependency):

```powershell
npm pack @fontsource/bricolage-grotesque@5.3.0 --pack-destination $env:TEMP
tar -xzf "$env:TEMP\fontsource-bricolage-grotesque-5.3.0.tgz" -C $env:TEMP
node scripts/font-fallback.mjs --file "$env:TEMP\package\files\bricolage-grotesque-latin-400-normal.woff"
```

Then set the `Source:` line in `src/styles/font-fallbacks.css` back to the package name (the script prints the temp path). The Bebas wordmark has its own fallback in `src/styles/wordmark-fallback.css` (regenerate command in its header), kept apart because the script rewrites `font-fallbacks.css`. `src/lib/ncs-tokens.test.ts` fails if `--font-display`, the config and the fallback face drift apart.

## Color and surfaces

### Brand values

Declared once in `globals.css` (`@theme` literals for reference, `:root` / `.dark` for the live values). Components use utilities (`bg-paper`, `text-link`, `border-line`), never hex.

| Role                              | Light     | Dark      |
| --------------------------------- | --------- | --------- |
| Primary (dark navy)               | `#0A1628` | `#0A1628` |
| Accent (NCS blue: buttons, focus) | `#3478BD` | `#40AAED` |
| Link (accent-toned text)          | `#2A6FB0` | `#40AAED` |
| Secondary (sky blue)              | `#40AAED` | `#7AC8F0` |
| Tertiary (amber)                  | `#FFA334` | `#FFA334` |
| Heading                           | `#0A1628` | `#F4F7FA` |
| Base text                         | `#1A1A1A` | `#E5E7EB` |
| Background (white surface)        | `#FFFFFF` | `#050B16` |
| Muted text                        | `#5F6573` | `#9CA3AF` |

The accent and muted values sit a hair darker than the original swatches (`#3B82C4`, `#6B7280`) so they clear AA; `--link` is the darker NCS blue for body-size accent text so `--accent` keeps its vibrancy on buttons and focus rings.

### Surface roles (package 1.5)

Existing brand values in new roles, in `:root` / `.dark`, with utilities from the `@theme inline` block:

| Token            | Utility                | Light     | Dark      | Meaning                                                       |
| ---------------- | ---------------------- | --------- | --------- | ------------------------------------------------------------- |
| `--paper`        | `bg-paper`             | `#F4F7FA` | `#0A1628` | the alternate section surface                                 |
| `--ink`          | `bg-ink`               | `#0A1628` | `#0A1628` | the solid navy band (`.band-ink`), navy in both themes        |
| `--ink-raised`   | `bg-ink-raised`        | `#0F1E33` | `#0F1E33` | a raised panel inside an ink band                             |
| `--line`         | `border-line`          | `#DDE3EA` | `#1A2A40` | decorative 1px hairline at a change of surface                |
| `--line-strong`  | `border-line-strong`   | `#7D8797` | `#5B6B84` | a hairline that must be seen (3:1): frame dots, control edges |
| `--frame-ring`   | `ring-frame-ring`      | `#D3DAE3` | `#22324A` | the 1px ring around a framed artifact                         |
| `--live`         | `text-live`, `bg-live` | `#A85D00` | `#FFA334` | amber means "live now" and nothing else (AA as text in light) |
| `--shadow-frame` | (var)                  | soft navy | deep      | the frame shadow                                              |
| `--radius-frame` | `rounded-frame`        | 10px      | 10px      | the one radius for a framed site, photo or form               |
| `--radius-pill`  | `rounded-pill`         | 999px     | 999px     | the CTA pill, status chips                                    |

Rules: NCS blue appears only on actions and focus (the CTA pill, links, focus rings, the active nav item). Sky is the dark-mode link colour. Amber means live. Client colours never carry text (Phase 2).

### Surfaces and primitives

- **`.band-ink`**: the solid navy block every page ends on (the Footer, with its closer, since package 2.1) and any other ink section. It re-scopes the text roles for its children in both themes: headings `#fff`, body `#E5E7EB`, links and focus `#40AAED`, meta `#A7B0BE`, and the button to navy on sky. It re-declares the `--color-*` aliases too, so scoped CSS that reads `var(--color-heading)` follows. Never put `text-primary-foreground` or a hex on top of it; the normal tokens just work.
- **`.frame`**: the one treatment for a real artifact (client site, photo, the form): `--radius-frame`, a 1px `--frame-ring` ring and `--shadow-frame`. `BrowserFrame.astro` (1.8) builds on it.
- **`.hairline`**: a 1px `--line` top rule at a change of surface.
- **`.band-themed`** (older): a flat band, `bg-bg-soft` in light, navy in dark. Still used by two inset cards until Phase 2 replaces them (CtaBanner was deleted and the Footer moved to `.band-ink` in package 2.1; ProcessBand moved to a `Section` in 2.2).
- **`.surface-card`** (older): the elevated card. Retired in Phase 2 ("only real artifacts get a frame").
- **Forced colors**: `@media (forced-colors: active)` gives `.frame`, `.surface-card`, `.band-ink`, `.band-themed` and `.hairline` a real border or outline, because forced-colors mode drops shadows and backgrounds. A new surface that relies on a shadow or background for its edge joins that list. `tests/forced-colors.spec.ts` checks one route.

### shadcn token mapping (foundation, do not change casually)

shadcn's `@theme inline` block points `--color-primary`, `--color-accent`, `--color-background` and friends at semantic tokens (`--primary`, `--accent`) declared in `:root`. The `:root` block overrides shadcn's defaults with the brand values, so `bg-primary` is navy and `bg-accent` is NCS blue everywhere, including the Button's focus ring (`--ring`). If a primitive looks off-brand, the fix is in that `:root` block, not the primitive.

### Contrast tests

- `src/lib/theme-tokens.test.ts` (PORTABLE, never edit) asserts the older shadcn pairs in both themes. Keep every token it parses (`--outline` included).
- `src/lib/ncs-tokens.test.ts` (site-owned) asserts every pair added since 1.5: paper, ink, `.band-ink`, `--line-strong`, `--live`, plus the font and forced-colors promises above. **A new rendered pair goes here**, in both themes.

## Grid and rhythm

- **`.page-grid`**: 12 columns with a `--grid-gutter` gap. Children span all 12 on small screens. From lg (64rem): `.grid-rail` columns 1 to 3 (the mono label rail; `Section.astro` in 1.8 makes it sticky), `.grid-body` 4 to 12, `.grid-prose` 4 to 10 capped at 68ch (about 40rem), `.grid-wide` 1 to 12, `.grid-full` bleeds to the viewport edges.
- **`--space-section`** (`clamp(5rem, 10vw, 9rem)`, utility `py-section`) is the section rhythm; it replaces the mixed `py-xl` / `py-2xl` as pages move over in Phase 2.
- `.ncs-container` caps the content at 82.5rem with safe-area side padding.

## Theme system

Three-state toggle (light / dark / system), persisted to `localStorage["ncs-theme"]`. System is the default; while set to System the page follows `prefers-color-scheme` live.

1. **Anti-FOUC script in `BaseLayout.astro`** runs inline in `<head>` before first paint: reads the stored choice and `prefers-color-scheme`, applies `.dark` on `<html>` plus an inline `color-scheme`.
2. **`ThemeToggle.astro`** (in the Header and the mobile nav panel; behaviour in `src/scripts/theme-toggle.ts`) cycles light, dark, system on click and writes the same key. One matchMedia listener, registered once per tab, re-applies the theme when the OS flips while the choice is system. Without JavaScript the button is hidden and the system theme still applies.
3. **`globals.css`**: `:root` carries light, `.dark` the overrides. `--primary` stays navy in dark mode so the default Button and navy bands stay on-brand; `--accent-foreground` flips to navy because white on the brightened sky accent fails contrast.

## Motion

Deliberately small since package 1.2 (the aurora, grain, shine, spotlight, float, hover-lift, mesh and dot-grid layers, their keyframes, the left / right / scale / blur reveal variants and Lenis were retired; do not bring them back). Package 1.7 (2026-10-31) built the system: `globals.css` section 6, `src/scripts/motion.ts` and `src/components/Heft.astro`. Every effect stays WCAG AA and reduced-motion safe, and `globals.css` is frozen after 1.7, so new motion lives in scoped styles and uses the vocabulary below.

**Tokens** (`:root`): durations `--dur-instant` 120ms, `--dur-quick` 200ms, `--dur-settle` 420ms, `--dur-scene` 640ms, `--dur-heft` 1500ms; easings `--ease-settle` (entrances), `--ease-glide` (state to state, the heft curve), `--ease-exit` (leaving). Use these, never a new literal. Rise distance is 8px; stagger is 70ms, capped at 6 steps.

**Four verbs, and nothing else moves:**

- **Settle** (entrances). Two variants only:
  - `data-reveal`: fades in and rises 8px.
  - `data-reveal="frame"`: a clip-path unveil from the bottom, for media (a framed site or photo). No opacity change.
  - `data-reveal-group` on a parent steps its children's reveals 70ms apart (CSS `:nth-child`, capped at 6 steps). Use it instead of inline delays; the old `style="--reveal-delay: …"` still works in the fallback but is legacy.
  - The default is scroll-driven CSS (`animation-timeline: view()`, inside `@supports` and `prefers-reduced-motion: no-preference`), so a reveal needs no script. One catch: a block on screen at load (straddling the fold, or above it after a mid-page reload) would sit part-faded until a scroll, which also fails Lighthouse colour contrast, so `motion.ts` marks those `.is-visible` and they show in full (`tests/first-viewport.spec.ts` checks it at 412 and 1440). Where scroll-driven CSS is unsupported, `motion.ts` adds `.is-visible` with an IntersectionObserver and a transition plays. The finished state is always what the markup renders, and the hidden state is gated on `.js`, so without JS everything is visible.
  - **Never on first-viewport content** (ruling 3): no `data-reveal` on an H1, on first-viewport media, or on anything else in the first screen. `tests/first-viewport.spec.ts` checks H1s and media; a `!important` backstop in section 6 shows anything tagged in `<main>`'s first block regardless.
- **Glide** (state to state): page transitions. The ClientRouter's View Transition fades the old page out (`--dur-quick`, `--ease-exit`) and settles the new one 8px up (`--dur-settle`, `--ease-settle`). The header and footer are static groups (`transition:name="site-header"` / `"site-footer"`, no animation), and the wordmark keeps `transition:name="site-wordmark"`. Every `::view-transition-*` animation is `none` under reduced motion and while `html[data-motion-paused]` is set.
- **Heft** (the weight signature): `Heft.astro`, one per page, on the H1's heavy phrase only (ruling 9). H2s stay static 300/800. See `components.md`.
- **Drift**: the hero reel only.

A scrub is not a loop: the case-study "Walk the homepage" (`SiteShowcase.astro`, 2.4b) moves only with page scroll, on a scroll-driven timeline inside `@supports` and `prefers-reduced-motion: no-preference`, and stands down to a plain scroll box under `html[data-motion-paused]`.

**Loops and Pause motion.** Anything that repeats opts in with `data-motion="loop"` on itself or a wrapper (the reel stage, the ticker, the footer and About status dots, the terminal cursor, the 404 numeral, the Coming Soon background). One rule in section 6 sets `animation-play-state: paused` on a loop while it is off screen (`data-motion-offscreen`, set by `motion.ts`), while the tab is hidden (`html[data-motion-hidden]`) and while the visitor has paused motion (`html[data-motion-paused]`). A script-driven loop asks `loopMayRun(el)` from `motion.ts` on every tick (the hero ticker is the pattern). An untagged loop ignores the pause and slips past `tests/motion-pause.spec.ts` (which checks every tagged loop on every route), so always tag it. A loading spinner (the contact form's) is not a loop.

The Pause motion state is persisted in `localStorage["ncs-motion"]` (`"paused"` or absent) and applied before first paint by the BaseLayout bootstrap (and the standalone `/coming-soon` page), next to the theme bootstrap, so a visitor who paused never sees a frame of motion. Any `<button data-motion-toggle aria-pressed>` sets and reflects it; today that is `MotionToggle.astro` (in the footer's utility row and the mobile menu) and the hero's Pause button.

Also:

- No count-ups: numbers and prices are static text (the `data-countup` handler was removed in package 2.2; the leftover `[data-countup]` tabular-nums rule in frozen `globals.css` is dead and can go when globals next opens).
- `.link-underline` for the grow-from-the-left underline on hover and focus.
- `src/scripts/enhance.ts` (every `astro:page-load`) powers the header's `data-scrolled` state and the `[data-prose]` heading anchors. Page scripts register on `astro:page-load` with a dataset re-bind guard so they survive View Transitions.
- The global reduced-motion block zeroes transitions (duration and delay `0s`, starter card 61) and shortens animations to 0.01ms.
