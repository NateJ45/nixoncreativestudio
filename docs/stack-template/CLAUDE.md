# [Project Name] — CLAUDE.md template

This is a portable CLAUDE.md template extracted from the Nixon Creative Studio portfolio. Drop it into the root of a new Astro project and replace every `[bracketed placeholder]` with project-specific content. The infrastructure choices (Astro, Tailwind 4, shadcn, React 19, Cloudflare Pages) are deliberate and tested; the brand and content schema are blanks for the new project to fill in.

Companion setup runbook lives at `SETUP.md` next to this file. Follow it once to bootstrap the project from scratch.

---

## About this project

[One paragraph on who owns the site, who it's for, what it sells, and where it lives on the internet. Keep it grounded: who's the audience, what's the conversion goal, where does it live.]

Build for a future you who hasn't touched the code in three months.

---

## Stack

Pinned versions reflect what's known to work together. Bump deliberately, not casually.

- Astro 6.3.x with TypeScript in strict mode and `output: 'static'`
- MDX content collections for long-form content (case studies, journal, posts). JSON-backed collections for catalogue data (photos, products, listings)
- Tailwind 4 via `@tailwindcss/vite`. Brand tokens declared in `@theme` blocks inside `src/styles/globals.css`. There is no `tailwind.config.mjs` file
- React 19 islands for anything interactive (mobile nav drawer, contact form handler, lightbox, theme toggle, back-to-top, copy-email, filter chips). Astro components for everything static
- shadcn/ui primitives in `src/components/ui/` (Nova preset, Radix base, `@fulldev` registry added to `components.json`). Extend Button with project-specific marketing variants only when the standard variants don't carry the brand
- Starwind UI in `src/components/starwind/` (accordion, dialog, dropdown, tabs). Astro-native, zero client-side JS, token-native via semantic CSS variables. Config in `starwind.config.json`. Icons via `@tabler/icons` imported as Astro SVG components. Supplementary styles in `src/styles/starwind.css` (accordion keyframes, `@theme` mappings for Starwind-only tokens like `--outline` and the status colors), imported in BaseLayout after `globals.css`
- PrimeReact (unstyled) in `src/components/primereact/` as an escape hatch for behavior-heavy widgets only: data tables, file upload, complex date/range pickers, multi-step steppers. Not a replacement for accordions, dialogs, dropdowns, tabs, or any marketing layout. See `src/components/primereact/README.md` before reaching for it
- DX and CI: ESLint flat config (`eslint.config.js`), Prettier (`.prettierrc`, `.prettierignore`). npm scripts: `test` (node `--experimental-strip-types --test src/lib/*.test.ts`), `lint`, `lint:fix`, `format`, `check` (build + test). Unit suites live in `src/lib/*.test.ts`. GitHub Actions CI at `.github/workflows/ci.yml` runs install, build, and test. Lint is advisory and not gated in CI because `eslint-plugin-astro` currently throws a false parse error on valid Astro files that put an HTML comment inside a `{...}` expression
- Motion (formerly Framer Motion), Astro View Transitions, Lenis smooth scroll (respecting `prefers-reduced-motion`)
- react-photo-album for justified gallery layouts when galleries are needed
- yet-another-react-lightbox for fullscreen photo viewing (with Zoom and Thumbnails plugins)
- sharp for image processing; plaiceholder wired into cover images via `scripts/generate-placeholders.mjs` (build-time generation into `src/lib/coverPlaceholders.json`) and a `CoverImage.astro` wrapper
- opentype.js (dev-only) for the OG image generator at `scripts/generate-og-default.mjs`
- `@astrojs/rss` for `/rss.xml` if the project has a blog-shaped collection (`<link rel="alternate">` auto-discovery wired in BaseLayout)
- `@astrojs/sitemap` for `sitemap-index.xml` (production sitemap)
- Dark / light / system theme system: a `ThemeToggle.tsx` React island plus an anti-FOUC bootstrap script in BaseLayout, persisted to `localStorage["[project-key]-theme"]`
- `src/data/site.ts` as the single source of truth for contact info (name, email, phone, address, business name, social URLs, tagline, domain) plus any optional feature URLs (booking, newsletter) that gate dependent scaffolds
- Web3Forms for the contact form, Cloudflare Web Analytics for privacy-friendly traffic
- Cloudflare Pages for hosting (build command `npm run build`, output `dist/`)
- GitHub for version control

---

## Page architecture

[Lock in the page architecture for this site here. List the home page sections in render order. The number is the visual map for visitors and the renaming map for future-you.]

[Example only, replace:]

1. Hero
2. [Section 2]
3. [Section 3]
4. [...]
5. Footer

Don't reorder. Don't drop. If a section's content isn't ready yet, build a placeholder block in the right slot.

---

## Brand colors

Declared in the `@theme` block inside `src/styles/globals.css`. Reference via utility classes (`bg-primary`, `text-accent`, `border-secondary`) rather than hardcoded hex anywhere in component code.

| Role | Hex |
|---|---|
| Primary | `[#______]` |
| Accent | `[#______]` |
| Link (accent body text) | `[#______]` |
| Secondary | `[#______]` |
| Tertiary | `[#______]` |
| Heading | `[#______]` |
| Base text | `[#______]` |
| Section background (soft) | `[#______]` |
| Muted text | `[#______]` |
| White | `#FFFFFF` |

Every token must clear WCAG AA against every surface it appears on. Body text needs 4.5:1, large text and UI components need 3:1. Run the math in both light and dark before introducing one. The `--link` token is intentionally a darker shade of `--accent` so accent-toned *body-size* text passes 4.5:1; `--accent` itself stays vibrant for buttons, focus rings, and large CTAs where white foreground carries the contrast.

### shadcn token mapping (foundation, do not change casually)

shadcn's CLI defines its own `@theme inline` block that points `--color-primary`, `--color-secondary`, `--color-accent`, `--color-background`, `--color-foreground` at semantic tokens (`--primary`, `--secondary`, etc.) declared further down in `:root`. Without intervention, `bg-primary` would produce shadcn's default grayscale.

The `:root` block in `globals.css` overrides shadcn's defaults so `--primary` is the brand primary, `--accent` is the brand accent, `--secondary` is the brand secondary, and so on. This means:

- `bg-primary` on a marketing surface and shadcn's Button default variant both produce the brand primary.
- `bg-accent` produces the brand accent everywhere, including shadcn primitives' focus rings (`--ring` is also pointed at the brand accent).

If a new shadcn primitive ever looks "off-brand," the fix is almost always in that `:root` block, not in the primitive's source.

---

## Theme system

Three-state toggle (light / dark / system), persisted to `localStorage["[project-key]-theme"]`. System is the default for first-time visitors; while set to System, the page listens to `matchMedia('(prefers-color-scheme: dark)')` and flips live when the OS changes.

The wiring, in order of execution:

1. **Anti-FOUC script in `BaseLayout.astro`** runs inline in `<head>` before first paint. Reads the localStorage key and `prefers-color-scheme`, applies the `.dark` class on `<html>` plus an inline `color-scheme` style so native widgets (scrollbars, form controls) follow. No flash of the wrong theme on initial paint or after View Transitions.
2. **`ThemeToggle.tsx`** (React island in Header and the mobile nav drawer) cycles light → dark → system on click, writes to the same localStorage key, and re-binds the matchMedia listener whenever the chosen theme changes.
3. **`globals.css`** defines color tokens for both modes. `:root` carries light; `.dark` carries the overrides. Brand `--accent` and `--secondary` keep their visual identity in both modes; only the surface and text tokens flip.

`--primary` deliberately stays the same in dark mode if the design uses it as a "darkest band" surface (Footer, CTA banner) so those sections read as the darkest part of the page in both modes, and the default Button stays on-brand. `--accent-foreground` flips so foreground text on a brightened accent still passes contrast.

---

## Build pipeline

`npm run build` is a chain:

1. `npm run placeholders` runs `scripts/generate-placeholders.mjs`. Scans cover image directories, generates a tiny base64 PNG blur preview per image via plaiceholder, writes the lot to `src/lib/coverPlaceholders.json`. Runs out-of-process because the Cloudflare Pages prerender worker is a V8 isolate without `node:fs`.
2. `astro build` runs as normal. Pages import `coverPlaceholders.json` via the typed lookup in `src/lib/coverPlaceholder.ts` and pass blurs to `CoverImage`.

Standalone scripts:

- `npm run placeholders` to re-run blur generation on demand (after adding a cover during local dev).
- `npm run og` to re-run `scripts/generate-og-default.mjs` and regenerate `public/og-default.png` (after changing brand colors, the tagline, or the wordmark in the script's inputs block).

Both `src/lib/coverPlaceholders.json` and `public/og-default.png` are committed to the repo because they're real assets shipped to visitors, not transient build artifacts. `npm run dev` reads the committed versions without re-running the scripts.

---

## Typography

- Headings (h1 through h6): [headline typeface]. Self-hosted via `@fontsource/[slug]` or `@fontsource-variable/[slug]`.
- Body, UI, buttons: [body typeface] (variable font preferred). Self-hosted via `@fontsource-variable/[slug]`.
- Labels and section numbers: `ui-monospace, 'SF Mono', monospace` (system, no file).

Font families are declared in the `@theme` block in `src/styles/globals.css` as `--font-display`, `--font-body`, `--font-mono`, which Tailwind exposes automatically as `font-display`, `font-body`, `font-mono` utility classes. Give the display face a `<link rel="preload">` hint in `BaseLayout.astro` if it's almost always the LCP element.

---

## Component organization

When building UI, reach for components in this order:

1. Existing components in `src/components/` that already match this site's design
2. shadcn/ui primitives in `src/components/ui/` (Radix base, interactive, works in React islands)
3. Starwind UI in `src/components/starwind/` (Astro-native static primitives with zero client JS: accordion, dialog, dropdown, tabs)
4. Aceternity UI for motion-rich blocks (hero, bento, parallax)
5. Magic UI for smaller flourishes (marquee, animated text)
6. PrimeReact (unstyled, `src/components/primereact/`) for heavy behavior-rich widgets only (data tables, file upload, complex pickers, steppers). Read the README before using it
7. Custom build only if nothing above fits

File naming:

- PascalCase for top-level components (`Hero.astro`, `Card.astro`, `Strip.astro`)
- kebab-case for shadcn primitives in `src/components/ui/` (matches shadcn CLI convention)

### Custom Button variants (optional)

If marketing CTAs need a project-specific look, extend `src/components/ui/button.tsx` with new variant/size options rather than overriding the shadcn defaults inline. The convention from the source project is `variant="brand"` + `size="cta"`. Document the recipe here so future-you doesn't reinvent it. Leave the other shadcn variants and sizes unmodified so future `npx shadcn add` commands don't fight with the extensions.

### Radix-based primitives need `client:only="react"`

shadcn primitives that wrap Radix's Dialog (Sheet, Dialog, DropdownMenu with portal positioning) don't SSR cleanly inside Astro. The portal hook calls during server render throw "Invalid hook call" and blank the page. When a new component leans on those, hydrate it with `client:only="react"` instead of `client:load`. The trade-off is a brief moment before React mounts with no element visible; for components hidden above sm or below the fold, the delay is invisible. The mobile nav is the existing reference.

---

## Code conventions

- TypeScript strict mode. No `any`.
- Comment generously, especially in components that future-you might edit by hand.
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
- For individual photos that need a fade-in or future blur-placeholder, use the `Photo` React island in `src/components/Photo.tsx`. It expects a build-resolved src URL (typically from an Astro `import` of a JPG asset) plus width and height. The `placeholder` prop accepts a base64 data URL.
- For gallery pages, use the `PhotoGallery` React island. It composes `react-photo-album` for the justified grid with `yet-another-react-lightbox` (Zoom + Thumbnails plugins) for the fullscreen viewer. Pass a `photos` array of `{ src, width, height, alt?, caption? }`.
- `plaiceholder` is wired for cover images. The data lives in `src/lib/coverPlaceholders.json` (generated at build time from a known assets folder by `scripts/generate-placeholders.mjs`), looked up by the `CoverImage.astro` wrapper which paints the blur as a CSS background while Astro's `<Image />` loads and fades in on top. Naming convention: cover filename's basename must match the content entry's slug, or the lookup misses and the wrapper falls back to its solid placeholder.

---

## Accessibility

Target: WCAG 2.1 AA in both light and dark modes. Aim for 100 Lighthouse Accessibility on every page and preserve that bar after edits.

### Required patterns

**Landmarks and structure.** `BaseLayout` provides `<header>`, `<main id="main">`, `<footer>`, and a "Skip to main content" link as the first focusable element. Each top-level `<section>` needs an accessible name, via either `aria-labelledby` pointing at its heading (preferred when there's a visible heading) or `aria-label="..."` (for sections without one). When using `SectionHeading`, always pass `headingId="..."` so the parent's `aria-labelledby` actually resolves; without it, the reference points at nothing.

**Heading hierarchy.** One `<h1>` per page (usually inside the hero). Don't skip levels. Section headings are `<h2>`; subsections inside them are `<h3>`. Heading text describes the content, not its position ("How we work", not "Section 5").

**Forms.** Every input gets an associated `<label for="...">`. Use native input types (`email`, `tel`, `url`) and `autocomplete` hints so browsers and password managers help. Required fields get `required`. Error containers get `role="alert"`.

**Images.**
- Content images: descriptive `alt`. "Hero image" or "Image of X" is filler; describe what the image shows.
- Image immediately adjacent to a heading that names the same thing (card thumbnails, hero below an `h1`): `alt=""`. Empty alt explicitly marks the image decorative so screen readers skip it instead of announcing the title twice.
- Decorative gradients, shapes, or pseudo-elements: `aria-hidden="true"` on the wrapper.

**Interactive elements.**
- Icon-only buttons and links require `aria-label`. SVG icons carry no accessible name on their own; the label lives on the wrapper.
- Hover and focus states must not be color-only. Pair color changes with underline, motion, or icon swap.
- Stick to native interactive elements (`<button>`, `<a>`, `<details>`, `<summary>`) whenever possible. Custom controls take real work to make accessible.

**Color tokens by responsibility** (definitions and contrast math in `globals.css`):
- `--accent`: buttons, focus rings, large CTAs. Paired with foreground text designed to clear AA at large size.
- `--link`: accent-toned body-size text (card arrows, step numbers, prose anchors). A darker shade of accent so body text clears 4.5:1.
- `--secondary`: decorative gradients and links sitting on darker surfaces.
- `--muted-foreground`: meta and supporting text on soft surfaces.

**Motion.** `globals.css` disables animations and transitions globally under `prefers-reduced-motion: reduce`, and Lenis smooth scroll becomes a no-op. New animations inherit this; no per-component handling needed.

**Language and metadata.** `<html lang="en">` and the document `title` and `description` come from `BaseLayout`. Pass `title` and `description` through every page that uses the layout.

### Before merging

Run Lighthouse against any page you changed. Accessibility should stay at 100. Common regressions and what they mean:

- `color-contrast`: a token or literal used in a new context that doesn't pass. Check both modes.
- `image-alt`: missing `alt` attribute (empty `alt=""` is fine; missing isn't).
- `label`: input without an associated label.
- `link-name` or `button-name`: icon-only element without `aria-label`.

For structural changes, also do a manual keyboard pass: Tab from the address bar through every interactive element. Each should be reachable, the focus indicator visible, and the order logical. The "Skip to main content" link should be the first thing focused after the address bar.

### Don't

- `aria-hidden="true"` on a focusable element (Tab still lands on it; screen reader hides the context).
- `tabindex` greater than 0 (breaks natural focus order).
- Remove focus outlines (`outline: none`) without a clearly visible replacement. shadcn primitives provide `focus-visible` rings already; preserve them.
- Use color as the only state cue (error red, success green) without an icon or text companion.
- Add ARIA roles to native elements that already have the right role (`role="button"` on a `<button>` is redundant).

---

## Content data and contact info

`src/data/site.ts` is the single source of truth for the studio's contact and identity values. Every component that displays an email, phone, name, business name, address, social URL, tagline, or domain imports from this module. Update a value here once and the Header wordmark, Footer columns, Hero locale tag, Contact sidebar, contact form's subject line, and the analytics and meta description all pick it up on the next build.

Edit `src/data/site.ts` when contact info, social URLs, or the business name change. Do not hardcode any of those strings inside `.astro` components or pages; route them through `site`.

---

## Content collections

Define collections in `src/content/` with schemas in `src/content.config.ts`. The pattern from the source project:

- A long-form MDX collection for portfolio entries or articles. Required frontmatter at minimum: `title`, `summary`, `published`, `cover`. Optional: `updated`, `tags`, `featured`, `draft`.
- A short-form MDX collection for journal or blog posts. Same shape as above, minus the project-specific fields. Drafts skipped from production builds.
- A JSON-backed collection for catalogue data (photos, products, listings). Schema validates each entry. No MDX body.

[Document this project's specific schemas here once defined.]

To add a new entry: drop the file in the matching folder, fill in frontmatter, drop the cover image at the path the schema expects (basename must match the entry slug for plaiceholder lookup). The next build creates the page, includes it in the index, generates the blur preview, and (for content with an RSS feed) adds the entry to `/rss.xml`.

---

## Routes summary

[Fill this in once routes are defined.]

| Path | Source |
|---|---|
| `/` | `src/pages/index.astro` |
| ... | ... |
| `/rss.xml` | `src/pages/rss.xml.js` |
| `/404` | `src/pages/404.astro` |

---

## Safe to edit by hand

- Text content inside `src/pages/*.astro` (everything outside the frontmatter)
- MDX files in `src/content/[collection]/` and JSON files in catalogue collections
- Images in `src/assets/` (regen blur via `npm run placeholders` after adding a cover during dev)
- `src/data/site.ts` (contact info, social URLs, tagline, feature URLs)
- Copy strings and `href` values in component files
- Tailwind utility classes on existing components, when content needs different visual weight
- Brand colors, tagline, and wordmark in `scripts/generate-og-default.mjs` (re-run `npm run og` after editing)

## Foundation, edit with care (route through a planned Claude session)

- `src/styles/globals.css` (Tailwind 4 `@theme` block, shadcn `:root` / `.dark` overrides, base resets, site-wide utility classes, print stylesheet, `[data-hidden]` utility)
- `src/content.config.ts` (collection schemas)
- `src/layouts/BaseLayout.astro` (anti-FOUC theme bootstrap, skip link, header/main/footer wiring, View Transitions ClientRouter, Lenis script tag, Cloudflare Analytics, font preload, OG meta, JSON-LD, coming-soon gate, BackToTop)
- `src/components/ui/` shadcn primitives (installed via shadcn CLI; document any project-specific extensions)
- `src/components/starwind/` (accordion, dialog, dropdown, tabs). Upgrade via Starwind CLI, not by hand
- `src/components/primereact/` (`PrimeIsland.tsx`, `passthrough.ts`). Passthrough config controls all PrimeReact styling; edit `passthrough.ts` for visual changes, not component source
- `src/styles/starwind.css` (accordion keyframes, `@theme` Starwind token mappings). Changes here can break Starwind components
- Aceternity / Magic UI component swaps
- React islands: `Photo.tsx`, `PhotoGallery.tsx`, `MobileNav.tsx`, `ThemeToggle.tsx`, `BackToTop.tsx`, `ReadingProgress.tsx`, `CopyEmail.tsx`, content filters
- Astro wrappers: `CoverImage.astro`, `ComingSoon.astro`, `StructuredData.astro`, `SectionHeading.astro`
- `src/lib/coverPlaceholder.ts` and `src/lib/coverPlaceholders.json` (the JSON is regenerated by the build script; don't edit by hand)
- `src/lib/readingTime.ts`
- `src/scripts/lenis-init.ts` (smooth scroll setup)
- `scripts/generate-placeholders.mjs`, `scripts/generate-og-default.mjs`
- `astro.config.mjs`, `package.json`, `tsconfig.json`, `components.json`, `starwind.config.json`
- `eslint.config.js`, `.prettierrc`, `.prettierignore` (DX config; lint rules affect all files)
- `.github/workflows/ci.yml` (CI pipeline: install, build, test; changing this gates or unblocks deploys)
- `public/_headers` (security response headers shipped with the deploy)
- `public/og-default.png` (regenerate via `npm run og`)
- `public/robots.txt`

If a change requires editing the foundation set, do it in a Claude session, write the change deliberately, and update this doc when the architecture shifts.

---

## Audience

[Describe who reads this site and the register the copy should hit. Are the visitors potential clients? Customers? Peers? What's their technical level? Set the writing tone here so every future copy edit lands in the same voice.]

---

## Deployment

- Production: pushes to `main` trigger a Cloudflare Pages build that serves `[domain]`.
- Previews: any other branch gets its own `*-[project].pages.dev` URL.
- Build command: `npm run build`. Output directory: `dist`.
- `output: 'static'` in `astro.config.mjs` prerenders every page to HTML at build time. The `@astrojs/cloudflare` adapter stays installed so individual pages can opt into server rendering later via `export const prerender = false` in that page's frontmatter, but for a static portfolio it's effectively inert.

### Environment variables

Set in Cloudflare Pages → **Settings → Variables and Secrets** (the Build section, not the Runtime section, because pages are prerendered):

- `PUBLIC_WEB3FORMS_KEY` — contact form access key from [web3forms.com](https://web3forms.com/). Without it the contact form falls back to a no-op action and shows an inline notice.
- `PUBLIC_CF_ANALYTICS_TOKEN` — Cloudflare Web Analytics token from dash.cloudflare.com → Analytics & Logs → Web Analytics. Without it the analytics beacon doesn't render.
- `PUBLIC_COMING_SOON` — set to the literal string `true` to gate the entire site behind the coming-soon page (see below). Unset, or any other value, takes the site live.
- `PUBLIC_PREVIEW_TOKEN` — random secret string used by the gate's inline script to recognize your bypass. Required only when the gate is on. The token is inlined into shipped HTML at build time, so anyone viewing source can see it: soft gate, not security.

All four are documented in `.env.example`; copy to `.env` and fill in real values for local dev.

### Coming Soon mode

Site-wide WIP gate controlled by `PUBLIC_COMING_SOON`, enforced client-side via a synchronous inline script in BaseLayout's `<head>`. When the env var is `true` at build time, every page ships with both the real content and a `ComingSoon` overlay; the gate script decides which the visitor sees by toggling `html.[project]-gated` before first paint based on a `localStorage["[project]-preview"]` value or a `?preview=<TOKEN>` URL param.

`/coming-soon/` itself is always live regardless of the gate. It's a standalone page with its own minimal HTML doc that doesn't go through BaseLayout, so it can be previewed without flipping anything.

**To enable the gate**: set `PUBLIC_COMING_SOON=true` and `PUBLIC_PREVIEW_TOKEN=<your-secret>` in Cloudflare Pages → Variables and Secrets. Trigger a redeploy.

**To bypass on a device you own**: visit any URL with `?preview=<your-secret>` appended. The script saves the token to `localStorage["[project]-preview"]` and reloads the page without the query param. From then on, that browser bypasses the gate on every page.

**To revoke your own bypass**: clear localStorage for the site in your browser.

**To rotate the token**: change `PUBLIC_PREVIEW_TOKEN` and redeploy. Any cached localStorage value stops matching; visit the bypass URL with the new token to re-enable.

**To take the site live**: change `PUBLIC_COMING_SOON` to any other value (or delete it entirely) and redeploy. The gate script and overlay don't ship at all, and `<meta name="robots" content="noindex">` is also removed.

**Soft gate, not security**. The real page HTML ships in source regardless of bypass state. Anyone who curls the URL or views source sees the full content; the `PUBLIC_PREVIEW_TOKEN` is also visible in the inlined gate script. For real auth, layer Cloudflare Access on top.

**Local dev**: with `PUBLIC_COMING_SOON=true` in `.env`, the gate works locally too. Without bypass it shows ComingSoon; with `?preview=<token>` you bypass like in prod. Unset `PUBLIC_COMING_SOON` (or set to false) to skip the gate entirely during local work.

### Security headers

`public/_headers` ships with the deploy. Five site-wide headers Cloudflare applies to every route:

- `Strict-Transport-Security` (HSTS, one year, includeSubDomains)
- `X-Frame-Options: DENY` (clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cross-Origin-Opener-Policy: same-origin`

Content-Security-Policy is intentionally not included; doing it right requires testing because of the external Cloudflare beacon and the Web3Forms POST endpoint.

---

## Working with Claude

- Use Claude Code from the desktop app, not the terminal. Show diffs clearly so they read well in that UI.
- Prefer Plan Mode for any multi-file change.
- Pause for confirmation before installing new dependencies.
- When proposing design changes, describe the visual outcome in plain language, not just the code.
- For browser-based verification (clicking through the site, screenshotting changes), prefer the Playwright MCP over chrome-devtools unless you specifically need DevTools-style inspection (network, console, Lighthouse).

---

## Communication style

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
- Comment code generously so future-you can follow without reverse-engineering.

For copy on the site itself: prefer plain, specific descriptions over abstract claims. "Modern websites for [audience] in [region]" beats "Bespoke digital experiences" every time.

---

## Setup checklist

Things that still need configuration before or during the public launch. Everything below should ship gracefully today (components render nothing or fall back when not configured) so the site stays clean while these wait.

### Cloudflare Pages env vars (Settings → Variables and Secrets)

- [ ] `PUBLIC_WEB3FORMS_KEY` — contact form delivery (web3forms.com).
- [ ] `PUBLIC_CF_ANALYTICS_TOKEN` — Cloudflare Web Analytics.
- [ ] `PUBLIC_COMING_SOON` — set to `true` while the site is WIP; unset to launch.
- [ ] `PUBLIC_PREVIEW_TOKEN` — required only when the gate is on. Pick something long and random.

### `src/data/site.ts` — fields that enable scaffolds when set

- [ ] `bookingUrl` — Cal.com / Calendly URL. When set, the Contact sidebar shows a "Book a call" block.
- [ ] `newsletterUrl` — Buttondown publish URL (or other provider's form action). When set, the `Newsletter` component renders a subscribe form.

### Real content to ship

- [ ] Real testimonial quotes in the testimonials section.
- [ ] Real headshot in `src/assets/brand/`.
- [ ] First content entries in `src/content/[collections]/`.
- [ ] Matching cover images at the path the schema expects.

### Recurring upkeep

- [ ] Refresh seasonal copy (footer "Currently", any "Now" page) on whatever cadence you decide.
- [ ] Re-run `npm run og` after editing brand colors, tagline, or wordmark.
- [ ] Plaiceholder regen happens automatically on `npm run build`. During local dev, re-run `npm run placeholders` after adding a new cover so the dev server sees it.
