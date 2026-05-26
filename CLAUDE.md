# Nixon Creative Studio Portfolio

Astro portfolio for Nathan Nixon, sole owner of Nixon Creative Studio in West Chester, OH. Web design, photography, and brand strategy for preschools, churches, nonprofits, and small businesses in the Cincinnati region. Lives at nixoncreativestudio.com.

This is a one-person project. Nathan is the owner, the designer, the photographer, and the only person editing the repo. Build for a future Nathan who hasn't touched the code in three months.

Reid Design LLC is a separate business entity. Do not conflate it with Nixon Creative Studio.

---

## Strategy reference

All creative decisions trace back to the strategy doc:

`C:\Users\natha\Documents\Claude\Projects\Nixon Creative Studio Website\NCS-Website-Strategy.docx`

It documents the brand position, ten must-haves, page architecture, conversion strategy, and the reference site research (Brittany Chiang v4, Gianluca Gradogna, Elliott Mangham, Olia Gozha). Open it before any design call.

Related context lives in the sibling folder `C:\Users\natha\Documents\Claude\Projects\Nixon Creative Studio Website\`: the original HTML scaffold, the WordPress + Bricks build history, and the architectural notes. The Bricks-specific traps don't apply here, but the section architecture and brand work port directly.

---

## Stack

- Astro 6.3.7 with TypeScript in strict mode and `output: 'static'`
- MDX content collections for case studies and journal entries; JSON-backed collection for the photography catalogue
- Tailwind 4 via `@tailwindcss/vite`. Brand tokens declared in `@theme` blocks inside `src/styles/globals.css`. There is no `tailwind.config.mjs` file
- React 19 islands for anything interactive: mobile nav drawer, contact form handler, photo lightbox, theme toggle, back-to-top, copy-email, /work filter chips. Astro components for everything static
- shadcn/ui primitives in `src/components/ui/` (Nova preset, Radix base). Includes a Nathan-added `brand` variant and `cta` size on Button for marketing CTAs
- Aceternity UI for motion-rich blocks (bento-grid, spotlight)
- Magic UI for smaller flourishes (marquee, animated-beam)
- Motion (formerly Framer Motion), Astro View Transitions, Lenis smooth scroll (respecting `prefers-reduced-motion`)
- react-photo-album for justified gallery layouts on the photography page
- yet-another-react-lightbox for fullscreen photo viewing (with Zoom and Thumbnails plugins)
- sharp for image processing; plaiceholder wired into case study covers via `scripts/generate-placeholders.mjs` (build-time generation into `src/lib/coverPlaceholders.json`) and the `CaseStudyCover.astro` wrapper
- opentype.js (dev-only) for the OG image generator at `scripts/generate-og-default.mjs`
- `@astrojs/rss` for `/rss.xml`, surfacing case study entries to feed readers (`<link rel="alternate">` auto-discovery wired in BaseLayout)
- Dark / light / system theme system: `ThemeToggle.tsx` React island + anti-FOUC bootstrap script in BaseLayout, persisted to `localStorage["ncs-theme"]`
- `src/data/site.ts` as the single source of truth for contact info (name, email, phone, address, studio name, social URLs, tagline, domain) plus the optional `bookingUrl` and `newsletterUrl` that gate the Cal.com and Newsletter scaffolds
- Web3Forms for the contact form, Cloudflare Web Analytics for privacy-friendly traffic
- Cloudflare Pages for hosting (build command `npm run build`, output `dist/`)
- GitHub for version control

---

## Homepage architecture (locked, eight sections)

Numbered in this order in the rendered output. The numbers are the visual map for visitors.

1. Hero
2. Selected work (3 featured case studies)
3. What I do (3 service chapters)
4. Selected photography (full-bleed strip)
5. How we work (4-step process)
6. Testimonials
7. CTA banner
8. Footer

Don't reorder. Don't drop. If a section's content isn't ready yet, build a placeholder block in the right slot.

---

## Brand colors

Declared in the `@theme` block inside `src/styles/globals.css`. Reference via utility classes (`bg-primary`, `text-accent`, `border-secondary`) rather than hardcoded hex anywhere in component code.

| Role | Hex |
|---|---|
| Primary (dark navy) | `#0A1628` |
| Accent (NCS blue) | `#3478BD` |
| Link (deeper NCS blue, accent body text) | `#2A6FB0` |
| Secondary (sky blue) | `#40AAED` |
| Tertiary (amber) | `#FFA334` |
| Heading | `#0A1628` |
| Base text | `#1A1A1A` |
| Section background (ultra light) | `#F4F7FA` |
| Muted text | `#5F6573` |
| White | `#FFFFFF` |

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

---

## Theme system

Three-state toggle (light / dark / system), persisted to `localStorage["ncs-theme"]`. System is the default for first-time visitors; while set to System, the page listens to `matchMedia('(prefers-color-scheme: dark)')` and flips live when the OS changes.

The wiring, in order of execution:

1. **Anti-FOUC script in `BaseLayout.astro`** runs inline in `<head>` before first paint. Reads `localStorage["ncs-theme"]` and `prefers-color-scheme`, applies the `.dark` class on `<html>` plus an inline `color-scheme` style so native widgets (scrollbars, form controls) follow. No flash of the wrong theme on initial paint or after View Transitions.
2. **`ThemeToggle.tsx`** (React island in Header + MobileNav drawer) cycles light → dark → system on click, writes to the same localStorage key, and re-binds the matchMedia listener whenever the chosen theme changes.
3. **`globals.css`** defines color tokens for both modes. `:root` carries light; `.dark` carries the overrides. Brand `--accent` and `--secondary` keep their visual identity in both modes; only the surface and text tokens flip. See Brand colors above for the exact token responsibilities.

`--primary` (navy) deliberately stays navy in dark mode so the Footer + CtaBanner read as the darkest band on the page in both modes, and the default Button stays on-brand. `--accent-foreground` flips to navy in dark mode so white text on the brightened sky-blue accent doesn't fail contrast.

---

## Build pipeline

`npm run build` is a chain:

1. `npm run placeholders` runs `scripts/generate-placeholders.mjs`. Scans `src/assets/case-studies/` for cover images, generates a tiny base64 PNG blur preview per cover via plaiceholder, writes the lot to `src/lib/coverPlaceholders.json`. Runs out-of-process because the Cloudflare Pages prerender worker is a V8 isolate without `node:fs`.
2. `astro build` runs as normal. Pages import `coverPlaceholders.json` via the typed lookup in `src/lib/coverPlaceholder.ts` and pass blurs to `CaseStudyCover`.

Standalone scripts:

- `npm run placeholders` — re-run blur generation on demand (after adding a cover during local dev).
- `npm run og` — re-run `scripts/generate-og-default.mjs` to regenerate `public/og-default.png` (after changing brand colors, the tagline, or the wordmark in the script's inputs block).

Both `src/lib/coverPlaceholders.json` and `public/og-default.png` are committed to the repo because they're real assets shipped to visitors, not transient build artifacts. `npm run dev` reads the committed versions without re-running the scripts.

---

## Typography

- Headings (h1 through h6): Bebas Neue, weight 400. Self-hosted via `@fontsource/bebas-neue`.
- Body, UI, buttons: Source Sans 3 (variable font). Self-hosted via `@fontsource-variable/source-sans-3`.
- Labels and section numbers: `ui-monospace, 'SF Mono', monospace` (system, no file).

Font families are declared in the `@theme` block in `src/styles/globals.css` as `--font-display`, `--font-body`, `--font-mono`, which Tailwind exposes automatically as `font-display`, `font-body`, `font-mono` utility classes. Bebas Neue gets a `<link rel="preload">` hint in `BaseLayout.astro` because the hero headline is almost always the LCP element.

---

## Component organization

When building UI, reach for components in this order:

1. Existing components in `src/components/` that already match this site's design
2. shadcn/ui primitives in `src/components/ui/`
3. Aceternity UI for motion-rich blocks (hero, bento, parallax)
4. Magic UI for smaller flourishes (marquee, animated text)
5. Custom build only if nothing above fits

File naming:

- PascalCase for top-level components (`Hero.astro`, `CaseCard.astro`, `PhotoStrip.astro`)
- kebab-case for shadcn primitives in `src/components/ui/` (matches shadcn CLI convention)

### Custom Button variants

`src/components/ui/button.tsx` extends the shadcn defaults with two project-specific options for marketing CTAs:

- `variant="brand"` paints the button in `bg-accent` (NCS blue) with a subtle hover lift. Used on Hero "Start a project," CtaBanner action, and the contact form submit.
- `size="cta"` bumps padding and font weight to the marketing-button proportions. Pair it with `variant="brand"` for the standard recipe.

All other shadcn variants and sizes are unmodified, so future `npx shadcn add` commands don't fight with these extensions.

### Radix-based primitives need `client:only="react"`

shadcn primitives that wrap Radix's Dialog (Sheet, Dialog, DropdownMenu with portal positioning) don't SSR cleanly inside Astro: the portal hook calls during server render throw "Invalid hook call" and blank the page. When a new component leans on those, hydrate it with `client:only="react"` instead of `client:load`. The trade-off is a brief moment before React mounts with no element visible; for components hidden above sm or below the fold, the delay is invisible. `MobileNav.tsx` is the existing example.

### Studio components reference

Beyond the homepage-section components (Hero, SelectedWork, Services, PhotoStrip, Process, Testimonials, CtaBanner) and the Header / Footer, these reusable components live in `src/components/`:

- `BackToTop.tsx` — floating button bottom-right, rendered once in BaseLayout. Fades in after 600px scroll, honors `prefers-reduced-motion`.
- `ReadingProgress.tsx` — thin top bar that fills as the visitor scrolls. Rendered only on case study and journal detail pages.
- `CopyEmail.tsx` — mailto link plus a one-click copy-to-clipboard button with sr-live "Copied" status. Footer Contact column + Contact page sidebar.
- `ThemeToggle.tsx` — light / dark / system cycle. Header (desktop) + MobileNav drawer.
- `MobileNav.tsx` — small-viewport nav drawer via shadcn Sheet. Below md (768px).
- `CaseStudyCover.astro` — wraps Astro `<Image />` with a plaiceholder blur preview painted as the wrapper bg, fades the real image in on load. Used by /work index cards (`fit="cover"`) and /work/[slug] hero (`fit="natural"`).
- `WorkFilter.tsx` — sector + year chip filters on /work index. Filters server-rendered cards by toggling a `data-hidden` attribute (no card re-render).
- `ComingSoon.astro` — the standalone "launching soon" view. Used by `/coming-soon/` directly and by BaseLayout's site-wide gate when `PUBLIC_COMING_SOON=true`.
- `StructuredData.astro` — emits JSON-LD. BaseLayout always renders the Organization / LocalBusiness schema; pages pass page-specific schemas via the `schemas` prop (Person on About, Article + CreativeWork on case studies, Service + FAQPage on /services).
- `SectionHeading.astro` — numbered section header used by homepage section components. **Always pass `headingId`** when the parent `<section>` carries `aria-labelledby`; without it, the reference points at nothing.
- `Photo.tsx` — generic `<img>` wrapper with fade-in. Used by PhotoStrip for the homepage photography strip.
- `PhotoGallery.tsx` — react-photo-album justified grid + yet-another-react-lightbox. Used by the /photography per-category galleries.
- `Newsletter.astro`, `ClientLogos.astro`, `PressMentions.astro` — scaffolds that render nothing until configured. See the Setup checklist at the end of this doc.

---

## Code conventions

- TypeScript strict mode. No `any`.
- Comment generously, especially in components that future-Nathan might edit by hand.
- At the top of each component file, add a header comment marking it `// Safe to edit` or `// Foundation, edit with care`.
- Astro components for static content. React islands only where interactivity is required (lightbox, animated hero, scroll-triggered effects).
- Prefer Astro's built-in `<Image />` and `<Picture />` components over plain `<img>` tags.
- Tailwind utility classes inline. Pull into `@apply` only when a pattern repeats four or more times.
- Use `clsx` or `class-variance-authority` for conditional classes once components get state-dependent styling.

---

## Image handling

- Source photos live in `src/assets/` so Astro can optimize at build time.
- Use the `<Picture />` component for art-directed images (different crops at different breakpoints).
- Always include `alt` text. `alt=""` is acceptable for purely decorative images.
- For individual photos that need a fade-in or future blur-placeholder, use the `Photo` React island in `src/components/Photo.tsx`. It expects a build-resolved src URL (typically from an Astro `import` of a JPG asset) plus width and height. The `placeholder` prop accepts a base64 data URL when blur generation gets wired later.
- For the photography page galleries, use the `PhotoGallery` React island. It composes `react-photo-album` for the justified grid with `yet-another-react-lightbox` (Zoom + Thumbnails plugins) for the fullscreen viewer. Pass a `photos` array of `{ src, width, height, alt?, caption? }`.
- `plaiceholder` is wired for case study covers. The data lives in `src/lib/coverPlaceholders.json` (generated at build time from `src/assets/case-studies/{slug}.{ext}` by `scripts/generate-placeholders.mjs`), looked up by the `CaseStudyCover.astro` wrapper which paints the blur as a CSS background while Astro's `<Image />` loads and fades in on top. Naming convention: cover filename's basename must match the case study's .mdx slug, or the lookup misses and the wrapper falls back to its `bg-bg-soft` solid placeholder.

---

## Accessibility

Target: WCAG 2.1 AA in both light and dark modes. Every page currently sits at 100 Lighthouse Accessibility; preserve that bar.

### Required patterns

**Landmarks and structure.** `BaseLayout` provides `<header>`, `<main id="main">`, `<footer>`, and a "Skip to main content" link as the first focusable element. Each top-level `<section>` needs an accessible name, via either `aria-labelledby` pointing at its heading (preferred when there's a visible heading) or `aria-label="..."` (for sections without one). When using `SectionHeading`, always pass `headingId="..."` so the parent's `aria-labelledby` actually resolves; without it, the reference points at nothing.

**Heading hierarchy.** One `<h1>` per page (usually inside the hero). Don't skip levels. Section headings are `<h2>`; subsections inside them are `<h3>`. Heading text describes the content, not its position ("How we work", not "Section 5").

**Forms.** Every input gets an associated `<label for="...">`. Use native input types (`email`, `tel`, `url`) and `autocomplete` hints so browsers and password managers help. Required fields get `required`. Error containers get `role="alert"`. The contact form is the working reference pattern.

**Images.**
- Content images: descriptive `alt`. "Hero image" / "Image of X" is filler; describe what the image shows.
- Image immediately adjacent to a heading that names the same thing (card thumbnails, case-study hero below an `h1`): `alt=""`. Empty alt explicitly marks the image decorative so screen readers skip it instead of announcing the title twice.
- Decorative gradients, shapes, or pseudo-elements: `aria-hidden="true"` on the wrapper.

**Interactive elements.**
- Icon-only buttons and links require `aria-label`. Lucide SVG icons carry no accessible name on their own; the label lives on the wrapper. See `MobileNav.tsx`, `ThemeToggle.tsx` for the pattern.
- Hover and focus states must not be color-only. Pair color changes with underline, motion, or icon swap.
- Stick to native interactive elements (`<button>`, `<a>`, `<details>`, `<summary>`) whenever possible. Custom controls take real work to make accessible.

**Color tokens by responsibility** (definitions and contrast math in `globals.css`):
- `--accent` (`#3478BD` light, `#40AAED` dark): buttons, focus rings, large CTAs. Paired with white text in light mode, navy in dark.
- `--link` (`#2A6FB0` light, `#40AAED` dark): accent-toned body text (card-link arrows, Process / Services step numbers, prose anchors). Darker than `--accent` in light so body-size text clears AA.
- `--secondary` (`#40AAED`): decorative gradients and Footer body links sitting on the navy footer.
- `--muted-foreground` (`#5F6573` light, `#9CA3AF` dark): meta and supporting text on bg-soft surfaces.

New tokens or hex literals must clear WCAG AA against every surface they appear on (4.5:1 body text, 3:1 large text and UI components). Run the math in both modes before introducing one.

**Motion.** `globals.css` disables animations and transitions globally under `prefers-reduced-motion: reduce`, and the Lenis smooth scroll becomes a no-op. New animations inherit this; no per-component handling needed.

**Language and metadata.** `<html lang="en">` and the document `title` / `description` come from `BaseLayout`. Pass `title` and `description` through every page that uses the layout.

### Before merging

Run Lighthouse against any page you changed. Accessibility should stay at 100. Common regressions and what they mean:
- `color-contrast`: a token or literal used in a new context that doesn't pass. Check both modes.
- `image-alt`: missing `alt` attribute (empty `alt=""` is fine; missing isn't).
- `label`: input without an associated label.
- `link-name` / `button-name`: icon-only element without `aria-label`.

Lighthouse can't catch everything. For structural changes, also do a manual keyboard pass: Tab from the address bar through every interactive element. Each should be reachable, the focus indicator visible, and the order logical. The "Skip to main content" link should be the first thing focused after the address bar.

### Don't

- `aria-hidden="true"` on a focusable element (Tab still lands on it; screen reader hides the context).
- `tabindex` greater than 0 (breaks natural focus order).
- Remove focus outlines (`outline: none`) without a clearly visible replacement. shadcn primitives provide `focus-visible` rings already; preserve them.
- Use color as the only state cue (error red, success green) without an icon or text companion.
- Add ARIA roles to native elements that already have the right role (`role="button"` on a `<button>` is redundant).

---

## Content data and contact info

`src/data/site.ts` is the single source of truth for the studio's contact and identity values. Every component that displays an email, phone, name, studio name, business address, social URL, tagline, or domain imports from this module. Update a value here once and the Header wordmark, Footer columns, Hero locale tag, Contact sidebar, contact form's subject line, and the analytics + meta description all pick it up on the next build.

Edit `src/data/site.ts` when contact info, social URLs, or the studio name change. Do not hardcode any of those strings inside `.astro` components or pages; route them through `site`.

---

## Content collections

Three collections live in `src/content/` with schemas declared in `src/content.config.ts`.

**`case-studies`** — long-form portfolio entries as MDX files in `src/content/case-studies/`. Each page at `/work/{slug}/` is auto-generated. Required frontmatter: `title`, `client`, `sector` (one of `church`, `preschool`, `nonprofit`, `small-business`), `services` (string array), `summary` (max 200 chars), `cover` (image path), `year` (int), `published` (date). Optional: `role` (e.g. "Designer, Developer, Photographer"), `tags` (string array for chip-style labels), `description` (longer paragraph, max 500 chars), `featured` (defaults false; controls whether the homepage Selected Work strip picks it up), `updated` (date, surfaces as "Updated <month>" alongside the publish stamp), `stack` (string array, surfaces as a hover-reveal on the /work index card and inline on the detail page).

To add a new case study: drop an `.mdx` file in `src/content/case-studies/`, fill in the frontmatter, drop the cover image at `src/assets/case-studies/{slug}.{png|jpg|jpeg|webp}` (basename must match the .mdx filename for plaiceholder lookup), write the body prose underneath. The next build creates the page at `/work/{filename}/`, includes it in the /work index, generates the blur preview, and adds the entry to `/rss.xml`.

**`journal`** — short-form essays and process notes as MDX files in `src/content/journal/`. Each page at `/journal/{slug}/` is auto-generated. Required frontmatter: `title`, `summary` (max 200 chars), `published` (date). Optional: `updated` (date), `cover` (image path), `tags` (string array), `draft` (boolean — drafts render in dev but are filtered out of production builds). The /journal index renders newest-first; drafts are skipped in production. Lighter-weight than case studies: no service badges, no sidebar TOC, but still gets ReadingProgress + reading-time stamps.

**`photos`** — JSON entries in `src/content/photos/`. Required fields: `title`, `image` (path), `category` (one of `events`, `portraits`, `environments`), `year`. Optional: `caption`, `location`, `featured`. Photography page wiring to read from this collection is planned but the entries themselves can be added any time; the directory is gitkept and ready.

### Routes summary

Static routes generated at build time:

| Path | Source |
|---|---|
| `/` | `src/pages/index.astro` (8-section homepage) |
| `/about/` | `src/pages/about.astro` |
| `/services` | `src/pages/services.astro` |
| `/work/` | `src/pages/work/index.astro` (with filter chips) |
| `/work/{slug}/` | `src/pages/work/[slug].astro` (per case study) |
| `/photography/` | `src/pages/photography.astro` |
| `/journal/` | `src/pages/journal/index.astro` |
| `/journal/{slug}/` | `src/pages/journal/[slug].astro` (per entry) |
| `/now/` | `src/pages/now.astro` (Sivers-style snapshot, rewrite quarterly) |
| `/contact/` | `src/pages/contact.astro` (Web3Forms inquiry) |
| `/privacy/` | `src/pages/privacy.astro` |
| `/coming-soon/` | `src/pages/coming-soon.astro` (always live, standalone) |
| `/404` | `src/pages/404.astro` (custom not-found) |
| `/rss.xml` | `src/pages/rss.xml.js` (case studies feed) |

---

## Safe to edit by hand

- Text content inside `src/pages/*.astro` (everything outside the frontmatter, between the tags)
- MDX files in `src/content/case-studies/`, `src/content/journal/`, and JSON files in `src/content/photos/`
- Images in `src/assets/case-studies/`, `src/assets/photography/`, `src/assets/brand/` (regen blur via `npm run placeholders` after adding a case study cover during dev)
- `src/data/site.ts` (contact info, social URLs, tagline, bookingUrl, newsletterUrl)
- Copy strings and `href` values in component files
- Tailwind utility classes on existing components, when content needs different visual weight
- The "Currently" blurb in `Footer.astro` and the principles / currently arrays in `About.astro` (seasonal copy)
- The four arrays in `src/pages/now.astro` (workingOn, booking, reading, learning) plus the `lastUpdated` date — rewrite quarterly
- The `press` array in `PressMentions.astro` (populate when press happens)
- The `logos` array in `ClientLogos.astro` (populate once you have client permissions)
- Heading / sub copy on `Newsletter.astro` via props
- Brand colors / tagline / wordmark in `scripts/generate-og-default.mjs` (re-run `npm run og` after editing)

## Foundation, edit with care (route through a planned Claude session)

- `src/styles/globals.css` (Tailwind 4 `@theme` blocks for brand tokens, shadcn `:root` / `.dark` semantic-token overrides, base resets, site-wide utility classes `.ncs-container` and `.card-link`, print stylesheet, `[data-hidden]` utility)
- `src/content.config.ts` (schemas for case-studies, journal, and photos collections)
- `src/layouts/BaseLayout.astro` structure (anti-FOUC theme bootstrap, skip link, header/main/footer wiring, View Transitions ClientRouter, Lenis script tag, Cloudflare Analytics, font preload, OG meta, JSON-LD, coming-soon gate, BackToTop)
- `src/components/ui/` shadcn primitives (installed via shadcn CLI; the custom `brand` variant and `cta` size in `button.tsx` are the only Nathan-edits)
- Aceternity / Magic UI component swaps in `src/components/ui/aceternity/` and `src/components/ui/`
- React islands: `Photo.tsx`, `PhotoGallery.tsx`, `MobileNav.tsx`, `ThemeToggle.tsx`, `BackToTop.tsx`, `ReadingProgress.tsx`, `CopyEmail.tsx`, `WorkFilter.tsx`
- Astro wrappers: `CaseStudyCover.astro`, `ComingSoon.astro`, `StructuredData.astro`, `SectionHeading.astro`
- `src/lib/coverPlaceholder.ts` + `src/lib/coverPlaceholders.json` (the JSON is regenerated by the build script; don't edit by hand)
- `src/lib/readingTime.ts`
- `src/scripts/lenis-init.ts` (smooth scroll setup)
- `scripts/generate-placeholders.mjs`, `scripts/generate-og-default.mjs`
- `astro.config.mjs`, `package.json`, `tsconfig.json`, `components.json`
- `public/_headers` (security response headers shipped with the deploy)
- `public/og-default.png` (regenerate via `npm run og`)
- `public/robots.txt`

If a change requires editing the foundation set, do it in a Claude session, write the change deliberately, and update this doc when the architecture shifts.

---

## Audience

Site visitors include potential clients (small businesses, churches, schools, preschools) and other designers. Copy is confident but warm. Default explanations to non-technical readers (preschool families, church volunteers, board members) unless context makes it clear the reader is a peer.

---

## Deployment

- Production: pushes to `main` trigger a Cloudflare Pages build that serves `nixoncreativestudio.com`.
- Previews: any other branch gets its own `*-nixoncreativestudio.nathanjnixon86.workers.dev` URL.
- Build command: `npm run build`. Output directory: `dist`.
- `output: 'static'` in `astro.config.mjs` prerenders every page to HTML at build time. The `@astrojs/cloudflare` adapter is installed but inert for static pages. To opt a single page into server rendering, add `export const prerender = false` in that page's frontmatter.

### Environment variables

Set in Cloudflare Pages → **Settings → Variables and Secrets** (the Build section, not the Runtime section, because pages are prerendered):

- `PUBLIC_WEB3FORMS_KEY` — contact form access key from [web3forms.com](https://web3forms.com/). Without it the contact form falls back to a no-op action and shows an inline notice.
- `PUBLIC_CF_ANALYTICS_TOKEN` — Cloudflare Web Analytics token from dash.cloudflare.com → Analytics & Logs → Web Analytics. Without it the analytics beacon doesn't render.
- `PUBLIC_COMING_SOON` — set to the literal string `true` to gate the entire site behind the coming-soon page (see below). Unset, or any other value, takes the site live.

All three are documented in `.env.example`; copy to `.env` and fill in real values for local dev.

### Coming Soon mode

Site-wide WIP gate controlled by `PUBLIC_COMING_SOON`. When set to `true` at build time, every page that uses BaseLayout renders the `ComingSoon` component in place of its real header / main / footer. `/coming-soon/` itself is always live (it has its own minimal HTML doc, doesn't go through BaseLayout) so the page can be previewed without flipping the gate.

To flip on for production: set `PUBLIC_COMING_SOON=true` in Cloudflare Pages Variables, click Retry Deployment (or push any commit). About a minute later, the whole live site becomes the coming-soon page.

To take live: change the variable to any other value or delete it entirely, then redeploy. Normal routing returns.

Locally: control via `.env`. Unset = full WIP site; `PUBLIC_COMING_SOON=true` = preview the gated view in dev.

### Security headers

`public/_headers` ships with the deploy. Five site-wide headers Cloudflare applies to every route:

- `Strict-Transport-Security` (HSTS, one year, includeSubDomains)
- `X-Frame-Options: DENY` (clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cross-Origin-Opener-Policy: same-origin`

Content-Security-Policy is intentionally not included; doing it right requires testing because of the external Cloudflare beacon and the Web3Forms POST endpoint.

---

## Working with Nathan

- Nathan uses Claude Code from the desktop app, not the terminal. Show diffs clearly so they read well in that UI.
- Prefer Plan Mode for any multi-file change.
- Pause for confirmation before installing new dependencies.
- When proposing design changes, describe the visual outcome in plain language, not just the code.
- For board, church, or client-facing copy, frame options collaboratively rather than top-down.
- For browser-based verification (clicking through the site, screenshotting changes), prefer the Playwright MCP over chrome-devtools unless you specifically need DevTools-style inspection (network, console, Lighthouse).

---

## Communication style (Nathan's preferences)

These apply to everything written here, in code comments, in PR descriptions, in commit messages, and in copy on the site itself.

- Warm, conversational tone. Not stiff or corporate.
- Step-by-step structure for any process or how-to.
- No em-dashes. Use commas, periods, colons, or restructure the sentence.
- No AI-tell phrases: delve, navigate (as a verb), leverage, robust, seamless, meticulous, tapestry, realm, landscape, testament to, ever-evolving, crucial, pivotal.
- No AI-tell sentence patterns: "It's not just X, it's Y," "Not only... but also," "It's important to note that," "When it comes to," "In the realm of," "That said" or "With that being said" as transitions.
- Don't open replies with filler like "Certainly!", "Absolutely!", "Great question!", or "I'd be happy to help."
- Don't close replies with "I hope this helps!" or "Let me know if you have any questions." End on the actual content.
- Avoid three-item lists where the third item is filler. Two items is fine if two is the truth.
- Use bold for genuine emphasis or list labels only, never random nouns mid-sentence.
- Default to prose, not headers and bullets, unless content is genuinely a list or step-by-step.
- Comment code generously so future-Nathan can follow without reverse-engineering.

For copy on the actual site: "Modern websites for small businesses, nonprofits, churches, and schools in the Cincinnati region" beats "Bespoke digital experiences" every time.

---

## Setup checklist

Things that still need configuration before / during the public launch. Everything below ships gracefully today — components render nothing or fall back when not configured — so the site stays clean while these wait.

### Cloudflare Pages env vars (Settings → Variables and Secrets)

- [ ] `PUBLIC_WEB3FORMS_KEY` — contact form delivery (web3forms.com).
- [ ] `PUBLIC_CF_ANALYTICS_TOKEN` — Cloudflare Web Analytics.
- [ ] `PUBLIC_COMING_SOON` — set to `true` while the site is WIP; unset to launch.

### `src/data/site.ts` — fields that enable scaffolds when set

- [ ] `bookingUrl` — Cal.com / Calendly URL. When set, the Contact sidebar shows a "Book a call" block. Recommended: Cal.com (open source, free at this volume, the URL looks like `https://cal.com/nathannixon/30min`).
- [ ] `newsletterUrl` — Buttondown publish URL (or other provider's form action). When set, the `Newsletter` component renders a subscribe form. Drop `<Newsletter />` into a page (likely between Testimonials and CtaBanner on Home, or near the bottom of /about) once configured.

### Component scaffolds waiting on content

- [ ] **`ClientLogos.astro`** — populate the `logos` array once you have written permission from each client to display their logo. Drop the SVGs in `src/assets/clients/`. Render `<ClientLogos />` on Home or About when ready.
- [ ] **`PressMentions.astro`** — populate the `press` array when media / podcast / award coverage happens. Render on About when there's at least one entry.

### Real content to ship

- [ ] Replace the **testimonial placeholders** in `Testimonials.astro` with real attributed quotes.
- [ ] Drop a **real headshot** in `src/assets/brand/` and swap the gradient placeholder div in `Hero.astro` and `about.astro` for an Astro `<Image />`.
- [ ] **Real cover image** at `src/assets/case-studies/crestview-presbyterian.png` (currently a placeholder gradient).
- [ ] Additional **case studies** in `src/content/case-studies/`. For each, drop a matching cover at `src/assets/case-studies/{slug}.{ext}` so plaiceholder picks it up.
- [ ] First **journal entry** in `src/content/journal/` (the page renders an empty-state until then).

### Recurring upkeep

- [ ] Refresh the four arrays + `lastUpdated` in `src/pages/now.astro` about once a quarter.
- [ ] Refresh the "Currently" blurb in `Footer.astro` seasonally.
- [ ] Re-run `npm run og` after editing brand colors, tagline, or wordmark.
- [ ] Plaiceholder regen happens automatically on `npm run build`. During local dev, re-run `npm run placeholders` after adding a new case study cover so the dev server sees it.

### Brand drift to be aware of

The brand `--accent` value shifted from `#3B82C4` to `#3478BD` in this codebase to clear WCAG AA contrast on light surfaces with white text. If you have brand assets elsewhere (Instagram, Canva, signage, photography watermarks) on the original `#3B82C4`, those will drift a hair from the site. Same for muted text (`#6B7280` → `#5F6573`).
