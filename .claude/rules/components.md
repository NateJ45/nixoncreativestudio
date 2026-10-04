---
paths:
  - 'src/components/**'
  - 'src/layouts/**'
  - 'src/pages/**'
  - 'components.json'
---

# Components, code conventions and images

Moved out of CLAUDE.md. Loads when components, layouts or pages are touched.

## Component organization

When building UI, reach for components in this order:

1. Existing components in `src/components/` that already match this site's design (the 2026 primitives below come first)
2. An Astro component with native HTML (`<dialog>`, `<details>`, popover) and a few lines of script
3. A shadcn/ui primitive in `src/components/ui/` (only `button.tsx` and `marquee.tsx` are installed). The Starwind kit, PrimeReact and the other shadcn, Aceternity and Magic UI primitives were deleted in the 2026-10-04 performance pass because nothing used them and Tailwind put their classes into every page's CSS. Re-adding one runs its CLI and adds a package: ask Nathan first, and delete it again if the page that wanted it goes
4. Custom build only if nothing above fits

Every file under `src/` feeds Tailwind's class scan, so an unused component is not free: its classes ship inlined in every page. Delete what nothing imports.

For where to pull each of these from (free sources, the shadcn CLI commands, the token-remap cheat sheet), see `docs/agent/component-sources.md`.

File naming:

- PascalCase for top-level components (`Band.astro`, `Frame.astro`, `home/HeroReel.astro`)
- kebab-case for shadcn primitives in `src/components/ui/` (matches shadcn CLI convention)

### Custom Button variants

`src/components/ui/button.tsx` extends the shadcn defaults with two project-specific options for marketing CTAs:

- `variant="brand"` is the call to action (DESIGN.md "Buttons"): ink with a paper label at rest, china-marker red on hover and focus, a solid focus ring, no lift or glow; put `<span data-nudge aria-hidden="true">&rarr;</span>` inside for the arrow nudge. Inside a deep ground (`.on-ink`) the same tokens make it a paper button with an ink label. Used by the header, footer and phone-menu "Start a project" buttons, the closing bands and the contact form submit.
- `size="cta"` bumps padding and font weight to the marketing-button proportions. Pair it with `variant="brand"` for the standard recipe. The desktop header's "Start a project" CTA (which replaced the Contact nav link) uses this recipe but wraps it in `cn()` to dial the padding down so it fits the bar: note that `buttonVariants()` called directly does NOT run `twMerge`, so a padding override only takes effect through `cn()`.

All other shadcn variants and sizes are unmodified, so future `npx shadcn add` commands don't fight with these extensions.

### Radix-based primitives need `client:only="react"`

shadcn primitives that wrap Radix's Dialog (Sheet, Dialog, DropdownMenu with portal positioning) don't SSR cleanly inside Astro: the portal hook calls during server render throw "Invalid hook call" and blank the page. When a new component leans on those, hydrate it with `client:only="react"` instead of `client:load`, or better, use a native `<dialog>` as `MobileMenu.astro` does: React islands are the largest mobile LCP cost on this site (docs/redesign-2026/C-performance-forensics.md), so the shared chrome (header, phone menu, footer, back-to-top) carries none.

### Studio components reference

The 2026 redesign primitives (DESIGN.md section 8) come first:

- `Band.astro` — one full-bleed section on one ground: `ground="paper" | "paper-contours" | "window-light" | "deep"`, plus `still`, `underHeader`, `tight`, `flush`, `container`, `as`, `labelledby`, `label`. Every redesigned page is a run of Bands.
- `Frame.astro` — a real client screenshot as a print: `variant="browser"` (ink chrome bar with the live address and an optional tag) or `variant="film"` (film rebate, sprocket rows, edge print of facts, optional china-marker `pick`). Takes an `astro:assets` import or a CMS URL with width and height; `eager` only for the LCP frame.
- `Logo.astro` — the official lockup: `tone="navy" | "white"`, `lockup="full" | "top" | "responsive"`, `width`, `topWidth`, `eager`. Alt text from `getSite()`. `SOURCE` picks the vector rebuild or the PNG-derived WebPs (`scripts/brand/build-logo.mjs` makes both).
- `MobileMenu.astro` — the phone menu: a header button that opens a full-screen native `<dialog>` (focus trap, Escape, inert page) with the menu rows, the Start a project button and the contact lines. Its nav is labelled "Menu" so the smoke test's `nav[aria-label="Primary"]` stays the desktop nav.
- `BackToTop.astro` — a small ink button bottom right after 600 px of scroll; plain HTML and a few lines of script.

Beyond those, the homepage components (`src/components/home/`: HomeHero, HeroReel, ProofSheet, HomePrices, HomeProcess, HomeAbout, HomeClose and DeferredPicture, described in `homepage-and-pages.md`) and the Header / Footer, these reusable components live in `src/components/`. `/services` has its own components: `PriceTiers` (the ruled price sheet, built so the homepage can adopt it) and `src/components/services/` (`BriefSheet`, `ProjectTimeline`, `CallSheet`); `CtaBanner` is the tail-of-page inquiry block on `/about` and `/photography`. `ProcessBand` and `SelectedWork` had no caller left after the 2026 home and services rebuilds and were deleted.

- `ReadingProgress.tsx` — thin top bar that fills as the visitor scrolls. Rendered only on journal entry pages (the 2026 case study template dropped it, and its React cost).
- `CopyEmail.tsx` — mailto link plus a one-click copy-to-clipboard button with sr-live "Copied" status. No longer used on /contact (the redesign uses plain mailto links there, so the page loads no React); the footer uses a plain mailto link too.
- `Testimonials.astro` + `TestimonialCarousel.tsx` — a "What clients say" carousel on /about. The `.astro` wrapper is collection-driven: it reads the `testimonial` field from case studies (so quotes stay tied to the client and nothing is fabricated) and renders nothing until at least one case study carries a real quote. The `.tsx` island is the Embla carousel: keyboard arrows, prev/next/dot controls, a Pause/Play toggle (SC 2.2.2), autoplay that is off under reduced motion and pauses on hover/focus, and `inert` on off-screen slides. To populate it, fill a case study's `testimonial:` frontmatter.
- `Showreel.astro` + `src/scripts/showreel.ts` — the directed showreel on a case study hero (the d8 "hybrid": a camera over 2x stills with short live clips cut in, as a dependency-free `<nx-reel>` custom element). The server sends a `<picture>` poster (the LCP: eager, `fetchpriority="high"`, explicit size; a 4:5 phone cut at 600px and below; a designed still under reduced motion). The player fetches nothing until `load`, the poster decode, 700 ms and an idle callback, and only within 300px of the viewport; it plays only while 40% visible, pauses off screen and in hidden tabs, has a 44px Play/Pause button, and never builds under reduced motion. Files in `public/reel/<slug>/` (timeline JSON, strips, plates, VP9 clips); which studies have one is `SHOWREELS` in `src/data/workExtras.ts` (live sites only). Re-shoot with the d8 capture scripts when a client site changes.
- `WorkPrint.astro` — one case study on `/work` as a print on the table: the cover in a `Frame` (browser or film with its facts on the edge, optional china-marker pick), sector and place, the title (links to the case study), the outcome, "Read the case study" and the visit link (named a preview for a launching-soon study). The page decides size and placement.
- `BeforeAfter.astro` — draggable before/after image comparison slider (native range input, keyboard operable; the frame shows the focus ring). Rendered by the case study template in its "In the details" band when an entry has both `before_image` and `after_image`. Labels are sentence-case ink and paper chips. Needs real screenshots of the old site taken before the switchover (the Wayback Machine renders old sites broken).
- `Lightbox.astro` — click-to-zoom for any `[data-zoom]` trigger; render it once per page (the case study template renders it with its detail crops). On click it clones the trigger's `<img>` into a native `<dialog>` at full size (`sizes="95vw"` pulls the largest srcset entry, so the zoom is crisp); `showModal()` gives the focus trap, Escape-to-close, the `::backdrop`, and focus return to the trigger for free. Built with DOM methods (no `innerHTML`), reduced-motion safe.
- `ComingSoon.astro` — the standalone "launching soon" view. Used by `/coming-soon/` directly and by BaseLayout's site-wide gate when `PUBLIC_COMING_SOON=true`.
- `StructuredData.astro` — emits JSON-LD. BaseLayout always renders the Organization / LocalBusiness schema; pages pass page-specific schemas via the `schemas` prop (Person on About, Article + CreativeWork on case studies, Service + FAQPage on /services).
- `SectionHeading.astro` — reusable section header (optional number, title, optional sub paragraph). `num` is optional on purpose; pass it only when the section is genuinely a numbered sequence. The homepage sections stopped using it; `/services` and any future inner page that wants a clean numbered or unnumbered title still can. **Always pass `headingId`** when the parent `<section>` carries `aria-labelledby`; without it, the reference points at nothing.
- `Photo.tsx` — generic `<img>` wrapper with fade-in. Used by `PhotoGallery` on the photography page (and available for any future image-on-content-page use).
- `PhotoGallery.tsx` — react-photo-album justified grid + yet-another-react-lightbox. Used by the /photography per-category galleries.
- `Newsletter.astro`, `ClientLogos.astro`, `PressMentions.astro` — scaffolds that render nothing until configured. See the Setup checklist at the end of this doc.

## Code conventions

- TypeScript strict mode. No `any`.
- Comment generously, especially in components that future-Nathan might edit by hand.
- At the top of each component file, add a header comment marking it `// Safe to edit` or `// Foundation, edit with care`.
- Astro components for static content. React islands only where interactivity is required and a few lines of script will not do (the photo gallery and lightbox, the contact form copy button, the work filter).
- Prefer Astro's built-in `<Image />` and `<Picture />` components over plain `<img>` tags.
- Tailwind utility classes inline. Pull into `@apply` only when a pattern repeats four or more times.
- Use `clsx` or `class-variance-authority` for conditional classes once components get state-dependent styling.

## Image handling

- Source photos live in `src/assets/` so Astro can optimize at build time.
- Use the `<Picture />` component for art-directed images (different crops at different breakpoints), and for every photograph: `formats={['avif', 'webp']}` with `pictureAttributes={{ class: 'contents' }}` so the `<picture>` adds no box and the img's own classes still lay it out. AVIF halved the About photos (216 to 131 KB at load, 2026-10-04). `sizes` must describe the rendered width at each breakpoint (measure it at 390 and 1440); a single value for prints of different widths under-serves the wide one.
- Always include `alt` text. `alt=""` is acceptable for purely decorative images.
- For individual photos that need a fade-in or future blur-placeholder, use the `Photo` React island in `src/components/Photo.tsx`. It expects a build-resolved src URL (typically from an Astro `import` of a JPG asset) plus width and height. The `placeholder` prop accepts a base64 data URL when blur generation gets wired later.
- For the photography page galleries, use the `PhotoGallery` React island. It composes `react-photo-album` for the justified grid with `yet-another-react-lightbox` (Zoom + Thumbnails plugins) for the fullscreen viewer. Pass a `photos` array of `{ src, width, height, alt?, caption? }`.
