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
- MDX content collections for case studies, JSON-backed collection for the photography catalogue
- Tailwind 4 via `@tailwindcss/vite`. Brand tokens declared in `@theme` blocks inside `src/styles/globals.css`. There is no `tailwind.config.mjs` file
- React 19 islands for anything interactive (mobile nav drawer, contact form handler, photo lightbox). Astro components for everything static
- shadcn/ui primitives in `src/components/ui/` (Nova preset, Radix base). Includes a Nathan-added `brand` variant and `cta` size on Button for marketing CTAs
- Aceternity UI for motion-rich blocks (bento-grid, spotlight)
- Magic UI for smaller flourishes (marquee, animated-beam)
- Motion (formerly Framer Motion), Astro View Transitions, Lenis smooth scroll (respecting `prefers-reduced-motion`)
- react-photo-album for justified gallery layouts on the photography page
- yet-another-react-lightbox for fullscreen photo viewing (with Zoom and Thumbnails plugins)
- sharp for image processing; plaiceholder is installed for future blur-placeholder integration (Photo accepts a `placeholder` prop, currently unused)
- `src/data/site.ts` as the single source of truth for contact info (name, email, phone, address, studio name, social URLs, tagline, domain)
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
| Accent (NCS blue) | `#3B82C4` |
| Secondary (sky blue) | `#40AAED` |
| Tertiary (amber) | `#FFA334` |
| Base text | `#1A1A1A` |
| Section background (ultra light) | `#F4F7FA` |
| Muted text | `#6B7280` |
| White | `#FFFFFF` |

### shadcn token mapping (foundation, do not change casually)

shadcn's CLI defines its own `@theme inline` block that points `--color-primary`, `--color-secondary`, `--color-accent`, `--color-background`, `--color-foreground` at semantic tokens (`--primary`, `--secondary`, etc.) declared further down in `:root`. Without intervention, `bg-primary` would produce shadcn's default grayscale.

The `:root` block in `globals.css` overrides shadcn's defaults so `--primary` is brand navy, `--accent` is NCS blue, `--secondary` is sky blue, and so on. This means:

- `bg-primary` on a marketing surface and shadcn's Button default variant both produce brand navy.
- `bg-accent` produces NCS blue everywhere, including shadcn primitives' focus rings (`--ring` is also pointed at NCS blue).

If a new shadcn primitive ever looks "off-brand," the fix is almost always in that `:root` block, not in the primitive's source.

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
- `plaiceholder` is installed but not currently integrated; the `Photo` component's `placeholder` prop is the hook for it.

---

## Content data and contact info

`src/data/site.ts` is the single source of truth for the studio's contact and identity values. Every component that displays an email, phone, name, studio name, business address, social URL, tagline, or domain imports from this module. Update a value here once and the Header wordmark, Footer columns, Hero locale tag, Contact sidebar, contact form's subject line, and the analytics + meta description all pick it up on the next build.

Edit `src/data/site.ts` when contact info, social URLs, or the studio name change. Do not hardcode any of those strings inside `.astro` components or pages; route them through `site`.

---

## Content collections

Two collections live in `src/content/` with schemas declared in `src/content.config.ts`.

**`case-studies`** — long-form portfolio entries as MDX files in `src/content/case-studies/`. Each page at `/work/{slug}/` is auto-generated. Required frontmatter: `title`, `client`, `sector` (one of `church`, `preschool`, `nonprofit`, `small-business`), `services` (string array), `summary` (max 200 chars), `cover` (image path), `year` (int), `published` (date). Optional: `role` (string, e.g. "Designer, Developer, Photographer"), `tags` (string array for chip-style labels), `description` (longer paragraph, max 500 chars), `featured` (boolean, defaults false; controls whether the homepage Selected Work strip picks it up).

To add a new case study: drop an `.mdx` file in `src/content/case-studies/`, fill in the frontmatter, include a `cover:` pointing at an image in `src/assets/case-studies/`, write the body prose underneath. The next build creates the page at `/work/{filename}/` and includes it in the work index.

**`photos`** — JSON entries in `src/content/photos/`. Required fields: `title`, `image` (path), `category` (one of `events`, `portraits`, `environments`), `year`. Optional: `caption`, `location`, `featured`. Photography page wiring to read from this collection is planned but the entries themselves can be added any time; the directory is gitkept and ready.

---

## Safe to edit by hand

- Text content inside `src/pages/*.astro` (everything outside the frontmatter, between the tags)
- MDX files in `src/content/case-studies/` and JSON files in `src/content/photos/`
- Images in `src/assets/case-studies/`, `src/assets/photography/`, `src/assets/brand/`
- `src/data/site.ts` (contact info, social URLs, tagline)
- Copy strings and `href` values in component files
- Tailwind utility classes on existing components, when content needs different visual weight
- The "Currently" blurb in `Footer.astro` and the principles / currently arrays in `About.astro` (seasonal copy)

## Foundation, edit with care (route through a planned Claude session)

- `src/styles/globals.css` (Tailwind 4 `@theme` blocks for brand tokens, shadcn `:root` semantic-token overrides, base resets, site-wide utility classes `.ncs-container` and `.card-link`)
- `src/content.config.ts` (schema for case-studies and photos collections)
- `src/layouts/BaseLayout.astro` structure (header/footer wiring, View Transitions ClientRouter, Lenis script tag, Cloudflare Analytics, font preload)
- `src/components/ui/` shadcn primitives (installed via shadcn CLI; the custom `brand` variant and `cta` size in `button.tsx` are the only Nathan-edits)
- Aceternity / Magic UI component swaps in `src/components/ui/aceternity/` and `src/components/ui/magic/`
- React islands: `Photo.tsx`, `PhotoGallery.tsx`, `MobileNav.tsx`
- `src/scripts/lenis-init.ts` (smooth scroll setup)
- `astro.config.mjs`, `package.json`, `tsconfig.json`, `components.json`
- `public/_headers` (security response headers shipped with the deploy)
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

Two env vars must be set in Cloudflare Pages → **Settings → Build → Variables and secrets** (the Build section, not the Runtime section, because pages are prerendered):

- `PUBLIC_WEB3FORMS_KEY` — contact form access key from [web3forms.com](https://web3forms.com/). Without it the contact form falls back to a no-op action and shows an inline notice.
- `PUBLIC_CF_ANALYTICS_TOKEN` — Cloudflare Web Analytics token from dash.cloudflare.com → Analytics & Logs → Web Analytics. Without it the analytics beacon doesn't render.

Both are documented in `.env.example`; copy to `.env` and fill in real values for local dev.

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
