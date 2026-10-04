---
paths:
  - 'src/components/**'
  - 'src/layouts/**'
  - 'src/pages/**'
  - 'components.json'
  - 'starwind.config.json'
---

# Components, code conventions and images

Moved out of CLAUDE.md. Loads when components, layouts or pages are touched.

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

Beyond those, the homepage-section components (Hero, HeroShowcase, ClientMarquee, SelectedWork, PricingTeaser, ProcessBand, all due to be rebuilt) and the Header / Footer, these reusable components live in `src/components/`. `ProcessBand` is reused on `/services` in its soft, no-CTA variant (`variant="soft" showCta={false}`); `CtaBanner` is the tail-of-page inquiry block on `/about`, `/photography`, and `/services`.

- `ReadingProgress.tsx` — thin top bar that fills as the visitor scrolls. Rendered only on journal entry pages (the 2026 case study template dropped it, and its React cost).
- `CopyEmail.tsx` — mailto link plus a one-click copy-to-clipboard button with sr-live "Copied" status. Contact page sidebar (the footer uses a plain mailto link).
- `Testimonials.astro` + `TestimonialCarousel.tsx` — a "What clients say" carousel on /about. The `.astro` wrapper is collection-driven: it reads the `testimonial` field from case studies (so quotes stay tied to the client and nothing is fabricated) and renders nothing until at least one case study carries a real quote. The `.tsx` island is the Embla carousel: keyboard arrows, prev/next/dot controls, a Pause/Play toggle (SC 2.2.2), autoplay that is off under reduced motion and pauses on hover/focus, and `inert` on off-screen slides. To populate it, fill a case study's `testimonial:` frontmatter.
- `HeroShowcase.astro` — the device-pairing scene in the hero's right column (at `lg` and up): a large landscape desktop browser on the left (traffic-light dots + a live host in the address bar) and a phone on the right (dark bezel + notch) overlapping its lower-right, both showing the SAME client site and both auto-scrolling the real full-page screenshot, with the next site sliding up over the current one every five seconds (a slide, not an opacity crossfade, which would ghost two sites together; the outgoing scroll is frozen so it cannot snap). Showing one site on two screens reads as responsive design; cycling the set (church, journal, race, shop, school) shows the range. **Built from the case studies since CMS-DESIGN PR 13:** `Hero.astro` reads the published case studies through `getCaseStudies()`, `selectHeroStudies()` (`src/lib/heroSites.ts`) keeps the ones with `in_hero` ticked AND both `showcase_desktop` and `showcase_mobile` set, ordered by `hero_order` (unnumbered last), and hands them to both renders as `sites`; the address bar shows the host of `live_url` without `www.`. The images are width-only `/_image?href=<media url>&w=N&f=webp` URLs (`resizedImage()`; never a height, because the captures are 4000 to 10000 px tall and the resizer ignores anything 4096 px or taller, docs/EMDASH.md). **Fallback:** with no qualifying entry (production until the PR 13 data is loaded, because the two fields do not exist there yet; every site un-ticked; a failed read) the scene is the `bundledSites` array in the component, the five bundled `{slug}-home.png` + `{slug}-mobile.png` captures it showed before, so it can never come up empty. Editors tick "Show in the homepage device scene" on a case study and set its order; the five bundled sites are the migration's `cms/content/case_studies.json`. The bundled desktop frames are the full-page `{slug}-home.png` captures that used to drive the case-study `SiteShowcase`; phone frames are real mobile captures at `src/assets/case-studies/shots/{slug}-mobile.png` (Playwright at 560 wide, which is still the mobile layout but enough resolution to stay crisp at the phone's ~250px retina display, full page with lazy images forced to load, cropped to ~4000px). Performance: inactive screenshots are `display:none` until the script promotes them, so only the first site loads on paint and then ~one site per cycle (lighter than the old all-eager cascade); the next site is preloaded one step ahead (2.5s after `load`, and only by the stage that is actually displayed, see Gotcha 14) so a swap never lands on a blank, and both devices share one index so they never desync. The whole cluster is a mouse-only link to `/work` (`aria-hidden` + `tabindex="-1"`, out of the tab order and AT tree; the real navigation is the "See the work" CTA beside it and the Selected Work section below). All motion is gated to `prefers-reduced-motion: no-preference` (with reduced motion, and with no JS, it is a still two-device shot of the first site); the cycle and scroll pause on hover (fine pointers) and while the tab is hidden. To curate the scene, tick `in_hero` and set `hero_order` on case studies in the admin (both captures must be set); the bundled `bundledSites` array is only the safety net.
- `ClientMarquee.astro` — the client-name ticker that rides a thin strip at the base of the Hero. Collection-driven: reads the case-studies collection for distinct client names (newest-first, de-duped), renders them as an edge-faded, auto-scrolling, hover-to-pause marquee, theme-aware for the hero floor (muted dark names on the light hero, muted white on the navy one, sky dot separators), plus an `sr-only` list of the same names for assistive tech. Decorative (`aria-hidden`). Moved here when the standalone proof band was retired and its differentiator line folded into the hero copy. The two-copy CSS loop is only gap-free while one copy is at least as wide as the viewport, so a small progressive-enhancement script (in the component) tops the track up with `aria-hidden` copies until the repeating half exceeds the viewport, seamless at any width and any number of clients, and pins a constant scroll speed; without JS the two-copy base still loops on the common case (viewport &lt;= one copy).
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
- Use the `<Picture />` component for art-directed images (different crops at different breakpoints).
- Always include `alt` text. `alt=""` is acceptable for purely decorative images.
- For individual photos that need a fade-in or future blur-placeholder, use the `Photo` React island in `src/components/Photo.tsx`. It expects a build-resolved src URL (typically from an Astro `import` of a JPG asset) plus width and height. The `placeholder` prop accepts a base64 data URL when blur generation gets wired later.
- For the photography page galleries, use the `PhotoGallery` React island. It composes `react-photo-album` for the justified grid with `yet-another-react-lightbox` (Zoom + Thumbnails plugins) for the fullscreen viewer. Pass a `photos` array of `{ src, width, height, alt?, caption? }`.
