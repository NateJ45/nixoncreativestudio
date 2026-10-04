---
paths:
  - 'src/styles/**'
  - 'src/layouts/**'
  - 'src/components/ui/**'
  - 'src/components/starwind/**'
  - 'src/components/primereact/**'
  - 'src/live.config.ts'
  - 'src/scripts/**'
  - 'astro.config.mjs'
  - 'package.json'
  - 'tsconfig.json'
  - 'components.json'
  - 'eslint.config.js'
  - 'playwright.config.ts'
  - 'public/_headers'
  - 'public/robots.txt'
  - 'public/site.webmanifest'
  - '.github/workflows/**'
---

# Safe to edit vs foundation files

Moved out of CLAUDE.md. Loads when a foundation file is touched.

## Safe to edit by hand

- Text content inside `src/pages/*.astro` (everything outside the frontmatter, between the tags)
- **Everything that is words, prices, pictures, menus, redirects, case studies, journal entries or photos is edited in the EmDash admin, not in files.** The step-by-step guide is `docs/EDITING-GUIDE.md`; "Content editing" above is the architecture. The committed `cms/content/*.json` files are only the no-database fallback and the seed for a fresh instance; edit them when a default changes, never for a day-to-day edit.
- Images in `src/assets/case-studies/`, `src/assets/photography/`, `src/assets/brand/` (case-study images live in EmDash now; the folder only feeds the homepage hero showcase)
- Copy strings and `href` values in component files
- Tailwind utility classes on existing components, when content needs different visual weight
- The `press` array in `PressMentions.astro` (populate when press happens)
- The `logos` array in `ClientLogos.astro` (populate once you have client permissions)
- Heading / sub copy on `Newsletter.astro` via props
- Brand colors / tagline / wordmark in `scripts/generate-og-default.mjs` (re-run `npm run og` after editing)

## Foundation, edit with care (route through a planned Claude session)

- `src/styles/globals.css` (Tailwind 4 `@theme` blocks for brand tokens, shadcn `:root` semantic-token overrides, base resets, site-wide utility classes `.ncs-container` and `.card-link`, print stylesheet, `[data-hidden]` utility, and the Starwind extra semantic tokens `--outline` + status colors in `:root`)
- `src/styles/starwind.css` (Starwind accordion keyframes + `@theme inline` mappings for its extra tokens; imported in BaseLayout right after globals.css)
- `src/live.config.ts` (the EmDash live collection; there is no `src/content.config.ts` any more)
- `src/layouts/BaseLayout.astro` structure (the `.js` marker script, skip link, header/main/footer wiring, View Transitions ClientRouter, Lenis script tag, Cloudflare Analytics, font preload, OG meta, JSON-LD, coming-soon gate, BackToTop)
- `src/components/ui/` shadcn primitives (installed via shadcn CLI; the custom `brand` variant and `cta` size in `button.tsx` are the only Nathan-edits)
- `src/components/starwind/` Starwind Astro-native primitives + `starwind.config.json` (vendored as a unit with `src/styles/starwind.css`)
- `src/components/primereact/` PrimeReact escape hatch (passthrough + island + README)
- Aceternity / Magic UI component swaps in `src/components/ui/aceternity/` and `src/components/ui/`
- React islands: `Photo.tsx`, `PhotoGallery.tsx`, `TestimonialCarousel.tsx`, `ReadingProgress.tsx`, `CopyEmail.tsx`
- Astro wrappers: `HeroShowcase.astro`, `ComingSoon.astro`, `StructuredData.astro`, `SectionHeading.astro`
- The 2026 design primitives: `Band.astro`, `Frame.astro`, `Logo.astro`, `MobileMenu.astro`, `BackToTop.astro`, `Header.astro`, `Footer.astro`, `src/scripts/grounds.ts`, the assets in `src/assets/grounds/`, `src/assets/brand/` and `src/assets/fonts/` (regenerate with `scripts/brand/`), and `DESIGN.md`
- `src/lib/readingTime.ts`
- `src/lib/cms.ts`, `src/lib/cmsFallback.ts`, `src/lib/portableText.ts`, `src/components/emdash/RestrictedPortableText.astro`, `scripts/lib/emdash-schema.mjs`, `scripts/lib/cms-load.mjs`, `scripts/cms/` (the CMS foundation; a bug here reaches every editable page)
- `src/scripts/lenis-init.ts` (smooth scroll setup)
- `scripts/generate-og-default.mjs`, `scripts/generate-icons.mjs`
- `astro.config.mjs`, `package.json`, `tsconfig.json`, `components.json`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `playwright.config.ts`, `lighthouserc.json`, `.github/workflows/ci.yml`, `.github/workflows/lighthouse.yml`
- `ComingSoonGate.astro` and `src/components/analytics/` (the inline script tags BaseLayout and Analytics render conditionally)
- `public/_headers` (security response headers shipped with the deploy)
- `public/og-default.png` (regenerate via `npm run og`)
- `public/favicon.svg`, `public/favicon.ico`, `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-512-maskable.png`, `public/site.webmanifest` (regenerate the icon set via `npm run icons`)
- `public/robots.txt`

If a change requires editing the foundation set, do it in a Claude session, write the change deliberately, and update this doc when the architecture shifts.
