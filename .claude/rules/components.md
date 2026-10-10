---
paths:
  - 'src/components/**'
  - 'src/layouts/**'
  - 'components.json'
---

# Components, code conventions, images

Moved out of CLAUDE.md. Loads when components or layouts are touched.

## Component organization

When building UI, reach for components in this order:

1. Existing components in `src/components/` that already match this site's design
2. shadcn/ui primitives in `src/components/ui/` (radix-nova style, plus the `@fulldev` registry)
3. Starwind UI in `src/components/starwind/` for Astro-native, zero-JS primitives (accordion, dialog, dropdown, tabs) where no React state is needed
4. Aceternity UI for motion-rich blocks (hero, bento, parallax)
5. Magic UI for smaller flourishes (marquee, animated text)
6. PrimeReact (`src/components/primereact/`) only for heavy, behavior-rich widgets with no lighter equivalent (data tables, file upload, complex pickers)
7. Custom build only if nothing above fits

For where to pull each of these from (free sources, the shadcn CLI commands, the token-remap cheat sheet), see `docs/agent/component-sources.md`.

File naming:

- PascalCase for top-level components (`Hero.astro`, `SelectedWork.astro`, `ProcessBand.astro`)
- kebab-case for shadcn primitives in `src/components/ui/` (matches shadcn CLI convention)

### Custom Button variants

`src/components/ui/button.tsx` extends the shadcn defaults with two project-specific options for marketing CTAs:

- `variant="brand"` paints the button in `bg-accent` (NCS blue) with a subtle hover lift. Used on the Hero, Footer, and Header "Start a project" CTAs, the CtaBanner action, the MobileNav drawer CTA, and the contact form submit.
- `size="cta"` bumps padding and font weight to the marketing-button proportions. Pair it with `variant="brand"` for the standard recipe. The desktop header's "Start a project" CTA (which replaced the Contact nav link) uses this recipe but wraps it in `cn()` to dial the padding down so it fits the bar: note that `buttonVariants()` called directly does NOT run `twMerge`, so a padding override only takes effect through `cn()`.

All other shadcn variants and sizes are unmodified, so future `npx shadcn add` commands don't fight with these extensions.

### Radix-based primitives need `client:only="react"`

shadcn primitives that wrap Radix's Dialog (Sheet, Dialog, DropdownMenu with portal positioning) don't SSR cleanly inside Astro: the portal hook calls during server render throw "Invalid hook call" and blank the page. When a new component leans on those, hydrate it with `client:only="react"` instead of `client:load`. The trade-off is a brief moment before React mounts with no element visible; for components hidden above sm or below the fold, the delay is invisible. `MobileNav.tsx` is the existing example.

### Studio components reference

Beyond the homepage-section components (Hero, HeroShowcase, ClientMarquee, SelectedWork, PricingTeaser, ProcessBand) and the Header / Footer, these reusable components live in `src/components/`. `ProcessBand` is reused on `/services` in its soft, no-CTA variant (`variant="soft" showCta={false}`); `CtaBanner` is the tail-of-page inquiry block on `/about`, `/photography`, and `/services`.

- `BackToTop.tsx`: floating button bottom-right, rendered once in BaseLayout. Fades in after 600px scroll, honors `prefers-reduced-motion`.
- `ReadingProgress.tsx`: thin top bar that fills as the visitor scrolls. Rendered only on case study and journal detail pages.
- `CopyEmail.tsx`: mailto link plus a one-click copy-to-clipboard button with sr-live "Copied" status. Footer Contact column + Contact page sidebar.
- `ThemeToggle.tsx`: light / dark / system cycle. Header (desktop) + the mobile nav panel.
- `MobileNav.tsx`: the small-viewport navigation: a full-screen panel (a shadcn Sheet underneath, so focus-trap, Escape, scroll-lock, and dialog ARIA all stay intact). Oversized Bebas nav links, each with a short honest descriptor, hairline-divided like an editorial index, with a staggered entrance on open. Theme-aware like the rest of the site: a light surface with dark type, NCS-blue links, and a soft brand glow (`.bg-mesh-soft`) in light mode; navy with white type, sky links, and the drifting `.bg-aurora` in dark. The brand-blue "Start a project" CTA and the theme toggle carry across both themes. Below the nav sits a "Get in touch" block (email, phone, inline Instagram / LinkedIn glyphs, and the theme toggle). The active route shows in NCS blue (light) / amber (dark) with a persistent arrow. Below md (768px); `client:only="react"`. Its nav list no longer includes Contact, which is promoted to the desktop header's "Start a project" CTA; the drawer's own CTA covers it on mobile.
- `Testimonials.astro` + `TestimonialCarousel.tsx`: a "What clients say" carousel on /about. The `.astro` wrapper is collection-driven: it reads the `testimonial` field from case studies (so quotes stay tied to the client and nothing is fabricated) and renders nothing until at least one case study carries a real quote. The `.tsx` island is the Embla carousel: keyboard arrows, prev/next/dot controls, a Pause/Play toggle (SC 2.2.2), autoplay that is off under reduced motion and pauses on hover/focus, and `inert` on off-screen slides. To populate it, fill a case study's `testimonial:` frontmatter.
- `HeroCanvas.tsx`: the WebGL hero background (Three.js + `@react-three/fiber`): a fullscreen shader quad drawing a domain-warped flow of brand colors that visibly swirls, plus a soft sky bloom that follows the cursor. Theme-aware via a `uDark` uniform (in `HeroCanvasInner.tsx`, read on mount and updated live by a MutationObserver on the `.dark` class): the navy / NCS blue / sky / amber flow in dark mode, a soft light pastel wash on a near-white base in light mode. Layers over the `.band-themed` glow fallback in Hero.astro and renders nothing (so that glow shows) under reduced motion or without WebGL; pauses (frameloop "never") when the hero is off-screen or the tab is hidden; DPR capped, `powerPreference: 'low-power'`. `client:only="react"` because R3F does not server-render. Edit the GLSL in this file to retune the look; keep it subtle and on-brand (not neon).
- `HeroShowcase.astro`: the device-pairing scene in the hero's right column (at `lg` and up): a large landscape desktop browser on the left (traffic-light dots + a live host in the address bar) and a phone on the right (dark bezel + notch) overlapping its lower-right, both showing the SAME client site and both auto-scrolling the real full-page screenshot, with the next site sliding up over the current one every five seconds (a slide, not an opacity crossfade, which would ghost two sites together; the outgoing scroll is frozen so it cannot snap). Showing one site on two screens reads as responsive design; cycling the set (church, journal, race, shop, school) shows the range. NOT collection-driven: it uses a curated `sites` array of imports, since each site needs both a desktop and a mobile capture. Desktop frames reuse the full-page `{slug}-home.png` captures that drive the case-study `SiteShowcase`; phone frames use real mobile captures at `src/assets/case-studies/shots/{slug}-mobile.png` (Playwright at 560 wide, which is still the mobile layout but enough resolution to stay crisp at the phone's ~250px retina display, full page with lazy images forced to load, cropped to ~4000px). Performance: inactive screenshots are `display:none` until the script promotes them, so only the first site loads on paint and then ~one site per cycle (lighter than the old all-eager cascade); the next site is always preloaded one step ahead so a swap never lands on a blank, and both devices share one index so they never desync. The whole cluster is a mouse-only link to `/work` (`aria-hidden` + `tabindex="-1"`, out of the tab order and AT tree; the real navigation is the "See the work" CTA beside it and the Selected Work section below). All motion is gated to `prefers-reduced-motion: no-preference` (with reduced motion, and with no JS, it is a still two-device shot of the first site); the cycle and scroll pause on hover (fine pointers) and while the tab is hidden. To curate, edit the `sites` array and drop matching `-home.png` + `-mobile.png` captures.
- `ClientMarquee.astro`: the client-name ticker that rides a thin strip at the base of the Hero. Collection-driven: reads the case-studies collection for distinct client names (newest-first, de-duped), renders them as an edge-faded, auto-scrolling, hover-to-pause marquee, theme-aware for the hero floor (muted dark names on the light hero, muted white on the navy one, sky dot separators), plus an `sr-only` list of the same names for assistive tech. Decorative (`aria-hidden`). Moved here when the standalone proof band was retired and its differentiator line folded into the hero copy. The two-copy CSS loop is only gap-free while one copy is at least as wide as the viewport, so a small progressive-enhancement script (in the component) tops the track up with `aria-hidden` copies until the repeating half exceeds the viewport, seamless at any width and any number of clients, and pins a constant scroll speed; without JS the two-copy base still loops on the common case (viewport &lt;= one copy).
- `CaseStudyCover.astro`: wraps Astro `<Image />` with a plaiceholder blur preview painted as the wrapper bg, fades the real image in on load. Used by /work index cards (`fit="cover"`) and /work/[slug] hero (`fit="natural"`).
- `SiteShowcase.astro`: animated "live site" frame embedded inside case study MDX. Renders a browser-chrome window whose full-page screenshot auto-scrolls (or slow-zooms with `variant="zoom"`), pausing on hover, and links to the live site. Reduced-motion safe (the scroll freezes to a static frame). Import it plus the screenshot at the top of a case study `.mdx` and place `<SiteShowcase src={shot} alt="..." href="..." label="..." />`. Full-page screenshots live in `src/assets/case-studies/shots/{slug}-home.png` (captured with Playwright at 1440px wide). Covers in `src/assets/case-studies/{slug}.png` are real hero screenshots of the same sites.
- `BeforeAfter.astro`: draggable before/after image comparison slider for redesign case studies. Keyboard-operable (native range input). Used on the Second Presbyterian case study (the old Squarespace site vs the rebuild). Needs a real "before" screenshot saved when the project started, or captured before a DNS switchover while the old site is still live (the Wayback Machine is not reliable; archived Squarespace / WordPress pages render broken). Drop it at `src/assets/case-studies/shots/{slug}-before.png` (same aspect as the "after", e.g. 1440x1080) and follow the usage block in the component header. The "After" label uses `text-accent-foreground` so it clears contrast in dark mode.
- `FeatureHighlight.astro`: an annotated "feature spotlight" row for case studies: a framed, click-to-zoom screenshot of a real shipped feature beside a short title + caption, with an alternating `side` prop so a run of them reads as a guided tour instead of a bare bullet list. The screenshot is a `[data-zoom]` trigger for the Lightbox. Honesty rule baked into the header: only ever screenshot a feature that is actually live (a captioned shot of a feature that does not exist is a fabrication and a client-facing liability). Used on eight of the nine case studies, two real feature shots each, captured from the live site at 1440x900 and stored at `src/assets/case-studies/shots/{slug}-feature-{name}.png`. Second Presbyterian is the three-highlight exemplar (guest front door, sermon archive, four-track Get Involved). Reid Design is the only study without highlights: its richer features are built but currently switched off, so there is nothing live to screenshot honestly. Pair it with one `<Lightbox />` on the page.
- `Lightbox.astro`: click-to-zoom for any `[data-zoom]` trigger; render it once per page (every case study carrying FeatureHighlights renders it once at the end). On click it clones the trigger's `<img>` into a native `<dialog>` at full size (`sizes="95vw"` pulls the largest srcset entry, so the zoom is crisp); `showModal()` gives the focus trap, Escape-to-close, the `::backdrop`, and focus return to the trigger for free. Built with DOM methods (no `innerHTML`), reduced-motion safe.
- `ResultsBlock.astro` and `DesignerNote.astro`: case-study detail blocks rendered from the `results` and `designerNote` frontmatter (a "What changed" list and a signed note from Nathan). Both render nothing when the field is absent; never invent an outcome.
- `Terminal.astro` and `LighthouseScore.astro`: the small dark panels in the About story column; their `lines` and `scores` arrays are the content.
- `WorkFilter.tsx`: sector + year chip filters on /work index. Filters server-rendered cards by toggling a `data-hidden` attribute (no card re-render).
- `ComingSoon.astro`: the standalone "launching soon" view. Used by `/coming-soon/` directly and by BaseLayout's site-wide gate when `PUBLIC_COMING_SOON=true`.
- `StructuredData.astro`: emits JSON-LD. BaseLayout always renders the Organization / LocalBusiness schema; pages pass page-specific schemas via the `schemas` prop (Person on About, Article + CreativeWork on case studies, Service + FAQPage on /services).
- `SectionHeading.astro`: reusable section header (optional number, title, optional sub paragraph). `num` is optional on purpose; pass it only when the section is genuinely a numbered sequence. The homepage sections stopped using it; `/services` and any future inner page that wants a clean numbered or unnumbered title still can. **Always pass `headingId`** when the parent `<section>` carries `aria-labelledby`; without it, the reference points at nothing.
- `Photo.tsx`: generic `<img>` wrapper with fade-in. Used by `PhotoGallery` on the photography page (and available for any future image-on-content-page use).
- `PhotoGallery.tsx`: react-photo-album justified grid + yet-another-react-lightbox. Used by the /photography per-category galleries.
- `Newsletter.astro`, `ClientLogos.astro`, `PressMentions.astro`: scaffolds that render nothing until configured. See `docs/claude/setup-checklist.md`.

## Code conventions

- TypeScript strict mode. No `any`.
- Comment generously, especially in components that future-Nathan might edit by hand.
- At the top of each component file, add a header comment marking it `// Safe to edit` or `// Foundation, edit with care`.
- Astro components for static content. React islands only where interactivity is required (lightbox, animated hero, scroll-triggered effects).
- Prefer Astro's built-in `<Image />` and `<Picture />` components over plain `<img>` tags.
- Tailwind utility classes inline. Pull into `@apply` only when a pattern repeats four or more times.
- Use `clsx` or `class-variance-authority` for conditional classes once components get state-dependent styling.

## Image handling

- Source photos live in `src/assets/` so Astro can optimize at build time.
- Use the `<Picture />` component for art-directed images (different crops at different breakpoints).
- Always include `alt` text. `alt=""` is acceptable for purely decorative images.
- For individual photos that need a fade-in or future blur-placeholder, use the `Photo` React island in `src/components/Photo.tsx`. It expects a build-resolved src URL (typically from an Astro `import` of a JPG asset) plus width and height. The `placeholder` prop accepts a base64 data URL when blur generation gets wired later.
- For the photography page galleries, use the `PhotoGallery` React island. It composes `react-photo-album` for the justified grid with `yet-another-react-lightbox` (Zoom + Thumbnails plugins) for the fullscreen viewer. Pass a `photos` array of `{ src, width, height, alt?, caption? }`.
- `plaiceholder` is wired for case study covers. The data lives in `src/lib/coverPlaceholders.json` (generated at build time from `src/assets/case-studies/{slug}.{ext}` by `scripts/generate-placeholders.mjs`), looked up by the `CaseStudyCover.astro` wrapper which paints the blur as a CSS background while Astro's `<Image />` loads and fades in on top. Naming convention: cover filename's basename must match the case study's .mdx slug, or the lookup misses and the wrapper falls back to its `bg-bg-soft` solid placeholder.
