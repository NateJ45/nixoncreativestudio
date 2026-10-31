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
2. A plain `.astro` component with native HTML (`<details>`, `<dialog>`, a real `<a>` or `<button>`) and a small `astro:page-load` script when it needs behaviour
3. The one remaining shadcn/ui primitive, `src/components/ui/button.tsx` (mostly used through `buttonVariants()` on an `<a>`)
4. Custom build otherwise. Ask Nathan before adding a dependency.

The 2026-10 overhaul (package 1.2) deleted Starwind, PrimeReact, the unused shadcn primitives and the Aceternity / Magic UI blocks (bento grid, spotlight, marquee, animated beam), along with SectionHeading, ClientLogos, PressMentions and the Embla testimonial carousel. They are in git history if one is ever needed; do not re-add them for decoration. `docs/agent/component-sources.md` is the old sourcing guide, kept for reference.

File naming:

- PascalCase for top-level components (`Hero.astro`, `SelectedWork.astro`, `ProcessBand.astro`)
- kebab-case for shadcn primitives in `src/components/ui/` (matches shadcn CLI convention)

### Custom Button variants

`src/components/ui/button.tsx` extends the shadcn defaults with two project-specific options for marketing CTAs:

- `variant="brand"` paints the button in `bg-accent` (NCS blue) with a subtle hover lift. Used on the Hero, Footer, and Header "Start a project" CTAs, the CtaBanner action, the MobileNav panel CTA, and the contact form submit.
- `size="cta"` bumps padding and font weight to the marketing-button proportions. Pair it with `variant="brand"` for the standard recipe. The desktop header's "Start a project" CTA (which replaced the Contact nav link) uses this recipe but wraps it in `cn()` to dial the padding down so it fits the bar: note that `buttonVariants()` called directly does NOT run `twMerge`, so a padding override only takes effect through `cn()`.

All other shadcn variants and sizes are unmodified, so future `npx shadcn add` commands don't fight with these extensions.

### The site chrome ships no React (overhaul 1.4)

The theme toggle, mobile nav, back-to-top, copy email, reading progress and /work filter are `.astro` markup plus small scripts that register on `astro:page-load` with a `data-bound` guard (CLAUDE.md never-break rule 7). React loads on /photography only (`PhotoGallery`), and `tests/no-react.spec.ts` fails if an `<astro-island>` or React chunk shows up anywhere else. Radix and `lucide-react` are gone: the chrome icons are inlined Lucide SVGs in `ChromeIcon.astro`, and `Button` has no `asChild` (style a link with `buttonVariants()` instead, through `cn()` when a class overrides a variant). Each control works or hides itself without JavaScript: the toggle, copy button and filter chips are hidden under `html:not(.js)`, and the menu button is a plain link to the footer nav.

### Studio components reference

Beyond the homepage-section components (Hero, HeroReel, SelectedWork, PricingTeaser, ProcessBand) and the Header / Footer, these reusable components live in `src/components/`. `ProcessBand` is reused on `/services` in its soft, no-CTA variant (`variant="soft" showCta={false}`); `CtaBanner` is the tail-of-page inquiry block on `/about`, `/photography`, and `/services`.

- `BackToTop.astro`: floating button bottom-right, rendered once in BaseLayout. Fades in after 600px scroll (and is `inert` until then), honors `prefers-reduced-motion`.
- `ReadingProgress.astro`: thin top bar that fills as the visitor scrolls (a `--progress` custom property). Rendered only on case study and journal detail pages, after the article (Gotcha 10).
- `CopyEmail.astro`: mailto link plus a one-click copy-to-clipboard button with sr-live "Copied" status. Footer Contact column + Contact page sidebar.
- `ThemeToggle.astro` (behaviour in `src/scripts/theme-toggle.ts`): light / dark / system cycle. Header (desktop) + the mobile nav panel.
- `ChromeIcon.astro`: the inlined Lucide SVGs the chrome uses (sun, moon, monitor, menu, x, arrow-up, copy, check).
- `MobileNav.astro` (behaviour in `src/scripts/mobile-nav.ts`): the small-viewport navigation, below md (768px). The menu button is a real link to the footer nav (`#site-nav`), so it works without JavaScript (overhaul ruling 5); the script upgrades it to a full-screen native `<dialog>` opened with `showModal()` (inert background, Escape), adds a Tab wrap, returns focus to the button on close, locks page scroll, and closes on `astro:before-swap` so a navigation never carries an open modal. Oversized Bebas nav links, each with a short honest descriptor, hairline-divided like an editorial index, with a staggered entrance on open. A light surface with dark type and NCS-blue links in light mode; navy with white type and sky links in dark. The "Start a project" CTA and a "Get in touch" block (email, phone, Instagram / LinkedIn glyphs, theme toggle) carry across both. The active route shows in NCS blue (light) / amber (dark) with a persistent arrow. Contact is not in its nav list; the CTA covers it. Tested by `tests/mobile-nav.spec.ts`.
- `HeroReel.astro`: the tilted wall of real client sites behind the homepage hero (five columns, desktop and phone captures, each column drifting at its own speed via a two-copy CSS loop that moves by exactly -50%). Data in `src/data/reel.ts`, captures in `src/assets/reel/` (re-shoot with `node scripts/capture-reel.mjs`). Decorative and `aria-hidden`; cards are mouse-only links to `/work/{slug}/`. Respects reduced motion, pauses off-screen and in hidden tabs, and stops when the hero carries `data-paused` (the hero's Pause button). Full behaviour in `.claude/rules/homepage-and-pages.md`.
- `CaseStudyCover.astro`: wraps Astro `<Image />` with a plaiceholder blur preview painted as the wrapper bg, fades the real image in on load. Used by /work index cards (`fit="cover"`) and /work/[slug] hero (`fit="natural"`).
- `SiteShowcase.astro`: animated "live site" frame embedded inside case study MDX. Renders a browser-chrome window whose full-page screenshot auto-scrolls (or slow-zooms with `variant="zoom"`), pausing on hover, and links to the live site. Reduced-motion safe (the scroll freezes to a static frame). Import it plus the screenshot at the top of a case study `.mdx` and place `<SiteShowcase src={shot} alt="..." href="..." label="..." />`. Full-page screenshots live in `src/assets/case-studies/shots/{slug}-home.png` (captured with Playwright at 1440px wide; re-shoot with `npm run capture:study <slug>`). Covers in `src/assets/case-studies/{slug}.png` are real hero screenshots of the same sites.
- `BeforeAfter.astro`: draggable before/after image comparison slider for redesign case studies. Keyboard-operable (native range input). Used on the Foundation for Reformed Theology, MAS Monograms and Stone Steps 50K case studies. Needs a real "before" screenshot saved when the project started, or captured before a DNS switchover while the old site is still live (the Wayback Machine is not reliable; archived Squarespace / WordPress pages render broken). Drop it at `src/assets/case-studies/shots/{slug}-before.png` (same aspect as the "after", e.g. 1440x1080) and follow the usage block in the component header. The "After" label uses `text-accent-foreground` so it clears contrast in dark mode.
- `FeatureHighlight.astro`: an annotated "feature spotlight" row for case studies: a framed, click-to-zoom screenshot of a real shipped feature beside a short title + caption, with an alternating `side` prop so a run of them reads as a guided tour instead of a bare bullet list. The screenshot is a `[data-zoom]` trigger for the Lightbox. Honesty rule baked into the header: only ever screenshot a feature that is actually live (a captioned shot of a feature that does not exist is a fabrication and a client-facing liability). Used on seven of the eight case studies, two real feature shots each, captured from the live site at 1440x900 and stored at `src/assets/case-studies/shots/{slug}-feature-{name}.png`. Reid Design is the only study without highlights: its richer features are built but currently switched off, so there is nothing live to screenshot honestly. Pair it with one `<Lightbox />` on the page.
- `Lightbox.astro`: click-to-zoom for any `[data-zoom]` trigger; render it once per page (every case study carrying FeatureHighlights renders it once at the end). On click it clones the trigger's `<img>` into a native `<dialog>` at full size (`sizes="95vw"` pulls the largest srcset entry, so the zoom is crisp); `showModal()` gives the focus trap, Escape-to-close, the `::backdrop`, and focus return to the trigger for free. Built with DOM methods (no `innerHTML`), reduced-motion safe.
- `ResultsBlock.astro` and `DesignerNote.astro`: case-study detail blocks rendered from the `results` and `designerNote` frontmatter (a "What changed" list and a signed note from Nathan). Both render nothing when the field is absent; never invent an outcome.
- `Terminal.astro` and `LighthouseScore.astro`: the small dark panels in the About story column; their `lines` and `scores` arrays are the content.
- `WorkFilter.astro`: sector chip filters on /work index. Filters server-rendered cards by toggling a `data-hidden` attribute (no card re-render).
- `ComingSoon.astro`: the standalone "launching soon" view. Used by `/coming-soon/` directly and by BaseLayout's site-wide gate when `PUBLIC_COMING_SOON=true`.
- `StructuredData.astro`: emits one JSON-LD `@graph` per page, built by `src/lib/schema.ts`: the studio (ProfessionalService + LocalBusiness), WebSite, Person (Nathan) and the page's WebPage on every page, a BreadcrumbList when BaseLayout gets `breadcrumbs`, plus the page's own nodes from the `schemas` prop (CreativeWork on case studies, Article on journal entries, Service + Offer + FAQPage on /services). See `.claude/rules/content.md`.
- `Photo.tsx`: generic `<img>` wrapper with fade-in. Used by `PhotoGallery` on the photography page (and available for any future image-on-content-page use).
- `PhotoGallery.tsx`: react-photo-album justified grid + yet-another-react-lightbox. Used by the /photography per-category galleries.
- `Newsletter.astro`: a scaffold that renders nothing until configured. See `docs/claude/setup-checklist.md`.

Testimonials: the old Embla carousel (`Testimonials.astro` + `TestimonialCarousel.tsx`) was deleted in package 1.2. The real quotes return in Phase 2 as a static block on each case study and one on the homepage; build nothing for them before then.

## Code conventions

- TypeScript strict mode. No `any`.
- Comment generously, especially in components that future-Nathan might edit by hand.
- At the top of each component file, add a header comment marking it `// Safe to edit` or `// Foundation, edit with care`.
- Astro components for static content. Interactivity is a small `astro:page-load` script first; a React island only for something as heavy as the photo gallery.
- Prefer Astro's built-in `<Image />` and `<Picture />` components over plain `<img>` tags.
- Tailwind utility classes inline. Pull into `@apply` only when a pattern repeats four or more times.
- Use `clsx` or `class-variance-authority` for conditional classes once components get state-dependent styling.

## Image handling

- Source photos live in `src/assets/` so Astro can optimize at build time.
- Use the `<Picture />` component for art-directed images (different crops at different breakpoints).
- Always include `alt` text. `alt=""` is acceptable for purely decorative images.
- For individual photos that need a fade-in or future blur-placeholder, use the `Photo` React island in `src/components/Photo.tsx`. It expects a build-resolved src URL (typically from an Astro `import` of a JPG asset) plus width and height. The `placeholder` prop accepts a base64 data URL when blur generation gets wired later.
- For the photography page galleries, use the `PhotoGallery` React island. It composes `react-photo-album` for the justified grid with `yet-another-react-lightbox` (Zoom + Thumbnails plugins) for the fullscreen viewer. Pass a `photos` array of `{ src, width, height, alt?, caption? }`.
- Tall full-page captures (`shots/*-home.png`, up to 10824px high) are never served whole into a card. `SelectedWork.astro` crops them with `coverCrop()` (`fit: 'cover'`, `position: 'top'`, depth capped at 4x the width, which still covers the hover pan), and states the real mobile box in `sizes` (`calc(100vw - 4.2rem)` for the cards, `calc(100vw - 3rem)` elsewhere) so a phone picks the 640w candidate, not 900w. Add a 640w step to `widths` whenever a new image fills a phone-width column. Home cards went from about 1000 KB to about 390 KB (2026-10-13).
- `plaiceholder` is wired for case study covers. The data lives in `src/lib/coverPlaceholders.json` (generated at build time from `src/assets/case-studies/{slug}.{ext}` by `scripts/generate-placeholders.mjs`), looked up by the `CaseStudyCover.astro` wrapper which paints the blur as a CSS background while Astro's `<Image />` loads and fades in on top. Naming convention: cover filename's basename must match the case study's .mdx slug, or the lookup misses and the wrapper falls back to its `bg-bg-soft` solid placeholder.
