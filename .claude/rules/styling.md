---
paths:
  - 'src/styles/**'
  - 'src/components/**'
  - 'src/layouts/**'
  - 'src/scripts/**'
  - 'src/pages/**'
---

# Styling: brand colors, theme, motion, typography

Moved out of CLAUDE.md. Loads when styles, components, layouts or pages are touched.

## Brand colors

Declared in the `@theme` block inside `src/styles/globals.css`. Reference via utility classes (`bg-primary`, `text-accent`, `border-secondary`) rather than hardcoded hex anywhere in component code.

| Role                                     | Hex       |
| ---------------------------------------- | --------- |
| Primary (dark navy)                      | `#0A1628` |
| Accent (NCS blue)                        | `#3478BD` |
| Link (deeper NCS blue, accent body text) | `#2A6FB0` |
| Secondary (sky blue)                     | `#40AAED` |
| Tertiary (amber)                         | `#FFA334` |
| Heading                                  | `#0A1628` |
| Base text                                | `#1A1A1A` |
| Section background (ultra light)         | `#F4F7FA` |
| Muted text                               | `#5F6573` |
| White                                    | `#FFFFFF` |

The accent and muted-text values are shifted slightly darker from their
original brand swatches (`#3B82C4` and `#6B7280`) so white-on-accent and
muted-on-soft-bg both clear WCAG AA 4.5:1. The shifts are small enough
to be visually unchanged in normal use. `--link` is a dedicated darker
NCS blue used for accent-toned body text (Footer rest links, card-link
arrows, Process / Services step numbers, prose anchors) so the brand
`--accent` can keep its vibrancy for buttons, focus rings, and large
CTAs where the white foreground carries the contrast.

### shadcn token mapping (foundation, do not change casually)

shadcn's CLI defines its own `@theme inline` block that points `--color-primary`, `--color-secondary`, `--color-accent`, `--color-background`, `--color-foreground` at semantic tokens (`--primary`, `--secondary`, etc.) declared further down in `:root`. Without intervention, `bg-primary` would produce shadcn's default grayscale.

The `:root` block in `globals.css` overrides shadcn's defaults so `--primary` is brand navy, `--accent` is NCS blue, `--secondary` is sky blue, and so on. This means:

- `bg-primary` on a marketing surface and shadcn's Button default variant both produce brand navy.
- `bg-accent` produces NCS blue everywhere, including shadcn primitives' focus rings (`--ring` is also pointed at NCS blue).

If a new shadcn primitive ever looks "off-brand," the fix is almost always in that `:root` block, not in the primitive's source.

## Theme system

Three-state toggle (light / dark / system), persisted to `localStorage["ncs-theme"]`. System is the default for first-time visitors; while set to System, the page listens to `matchMedia('(prefers-color-scheme: dark)')` and flips live when the OS changes.

The wiring, in order of execution:

1. **Anti-FOUC script in `BaseLayout.astro`** runs inline in `<head>` before first paint. Reads `localStorage["ncs-theme"]` and `prefers-color-scheme`, applies the `.dark` class on `<html>` plus an inline `color-scheme` style so native widgets (scrollbars, form controls) follow. No flash of the wrong theme on initial paint or after View Transitions.
2. **`ThemeToggle.tsx`** (React island in the Header and the mobile nav panel) cycles light → dark → system on click, writes to the same localStorage key, and re-binds the matchMedia listener whenever the chosen theme changes.
3. **`globals.css`** defines color tokens for both modes. `:root` carries light; `.dark` carries the overrides. Brand `--accent` and `--secondary` keep their visual identity in both modes; only the surface and text tokens flip. See Brand colors above for the exact token responsibilities.

`--primary` (navy) deliberately stays navy in dark mode so the default Button and the navy aurora bands stay on-brand. The Hero, Footer, Process Band, and CtaBanner are all theme-aware via `.band-themed` (light surface + soft brand glow in light mode, navy aurora in dark), so light mode reads bright and airy from top to bottom while dark mode stays one immersive navy field. `--accent-foreground` flips to navy in dark mode so white text on the brightened sky-blue accent doesn't fail contrast.

## Motion and effects system

The site runs a deliberately animation-rich, polished design. The homepage and inner pages lean into scroll motion, animated backgrounds, and hover micro-interactions on purpose. The one hard constraint: every effect must stay WCAG AA and reduced-motion safe, which the system below handles automatically.

The motion layer is two files plus a vocabulary of declarative classes and `data-*` attributes, all defined once in `src/styles/globals.css` (section 6) and wired in `src/layouts/BaseLayout.astro`:

- **`src/scripts/enhance.ts`** (imported in BaseLayout, runs on every `astro:page-load`) powers `[data-spotlight]` (sets `--mx`/`--my` for a cursor-tracking glow), `[data-countup]` (animates a number up to `data-countup-to` when scrolled into view; optional `-suffix`/`-prefix`/`-duration`), and `[data-header]` (toggles `data-scrolled` for the sticky frosted header). (The old `[data-magnetic]` cursor-follow button pull was removed.)
- **The reveal observer** (inline `<script>` at the end of BaseLayout, also on `astro:page-load`) adds `.is-visible` to `[data-reveal]` elements as they enter the viewport. **Screenshot trap:** a Playwright `fullPage` capture does not scroll, so the observer never fires below the first viewport and every revealed band is captured at opacity 0 (a blank grey band, not a bug in the page). Scroll through the page in viewport-sized steps to the bottom, wait a beat, then capture (`.claude/commands/visual-verify.md` step 5). Re-take any screenshot with a large uniform band.

Vocabulary (use these; don't reinvent):

- `data-reveal` (+ variants `fade` / `scale` / `left` / `right` / `blur`) for scroll-in reveals; stagger siblings with inline `style="--reveal-delay: 120ms"`.
- `.spotlight-card` + `data-spotlight` on a `position:relative` card for a cursor glow (put inner content in `relative z-10`).
- add `.shine` (or `className="shine"` on the shadcn Button) to a CTA for a hover light sweep. (There is no cursor-follow "magnetic" pull anymore; it was removed site-wide.)
- `data-countup data-countup-to="10"` for count-ups. **Always render the real final value as the span's static text** so no-JS visitors and crawlers see the true number; `enhance.ts` animates from 0 up to it.
- **Heading emphasis: solid tokens, never gradient text.** Gradient text (`background-clip:text` over a gradient) was removed site-wide; it is an impeccable absolute-ban tell. The old `.text-gradient` / `.text-gradient-bright` utilities are deleted. For an accent phrase, wrap it in a solid token span: `text-tertiary` (amber, AA on the navy/dark heroes) or `text-link` (NCS blue, AA on light surfaces). Carry the rest of the emphasis with Bebas Neue weight and size.
- `.surface-card` for an elevated card in **both** themes (tinted card surface + soft layered shadow + 1px top highlight + border, all from the `--shadow-card` / `--card-highlight` tokens). This is how light mode gets real depth (light has no color-step for elevation the way dark does). Compose with `data-spotlight` + `.hover-lift`. Used by /work cards, homepage Selected Work, /services offerings. The framed-artifact shadow (SiteShowcase, BeforeAfter) is the shared `--shadow-frame` token.
- `.bg-dotgrid` (faint masked dot grid) and `.bg-mesh-soft` (low-opacity brand glow) give a light section quiet atmosphere without copying the dark aurora. Static, decorative (`z-index:-1` inside an isolated context), no reduced-motion concern.
- `.bg-aurora` (+ `.grain`) on a `position:relative isolate` dark band for a drifting brand mesh (content at `relative z-10`); `.hover-lift`, `.link-underline` for smaller touches.
- `.band-themed` for a closing/process band that should read **light in light mode** (soft accent glow on `bg-bg-soft`) and **navy aurora in dark mode**. It sets the surface + decorative glow per theme via `::before`; put theme-aware text tokens on top (`text-heading`, `text-text-muted`, `text-link`), never `text-primary-foreground`. Used by CtaBanner, ProcessBand, the Journal empty-state card, the About portrait frame, and now the Hero (under its light-tuned WebGL flow) and the Footer, so light mode reads bright and airy end to end while dark mode stays immersive navy. The Footer keeps its own top accent line via `.footer-seam::after` (dark mode only), since `.band-themed` owns `::before`.

**No-JS robustness:** the reveal hidden state is scoped to `.js` (added to `<html>` by the anti-FOUC script before first paint), so without JS every `[data-reveal]` element stays fully visible. Any new always-hidden-until-JS pattern must follow the same `.js` gating. Page-level enhancement scripts (contact form, the prose-page scroll-spy in `ProsePage.astro`, journal heading tagger) must register on `astro:page-load` with a dataset re-bind guard so they survive View Transitions navigations.

## Typography

- Headings (h1 through h6): Bebas Neue, weight 400. Self-hosted via `@fontsource/bebas-neue`.
- Body, UI, buttons: Source Sans 3 (variable font). Self-hosted via `@fontsource-variable/source-sans-3`.
- Labels and section numbers: `ui-monospace, 'SF Mono', monospace` (system, no file).

Font families are declared in the `@theme` block in `src/styles/globals.css` as `--font-display`, `--font-body`, `--font-mono`, which Tailwind exposes automatically as `font-display`, `font-body`, `font-mono` utility classes. Bebas Neue gets a `<link rel="preload">` hint in `BaseLayout.astro` because the hero headline is almost always the LCP element.
