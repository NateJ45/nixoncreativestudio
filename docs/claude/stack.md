# Stack

Full library list, moved out of CLAUDE.md. Read when choosing or wiring a library.

- Astro 7 with TypeScript in strict mode and `output: 'static'`
- MDX content collections for case studies and journal entries; JSON-backed collection for the photography catalogue
- Tailwind 4 via `@tailwindcss/vite`. Brand tokens declared in `@theme` blocks inside `src/styles/globals.css`. There is no `tailwind.config.mjs` file
- React 19 islands for anything interactive: full-screen mobile nav panel, contact form handler, photo lightbox, theme toggle, WebGL hero canvas, testimonials carousel, back-to-top, copy-email, /work filter chips. Astro components for everything static
- shadcn/ui primitives in `src/components/ui/` (Nova preset, Radix base). Includes a Nathan-added `brand` variant and `cta` size on Button for marketing CTAs. `components.json` also wires the `@fulldev` registry for more free shadcn-compatible components
- Aceternity UI for motion-rich blocks (bento-grid, spotlight)
- Magic UI for smaller flourishes (marquee, animated-beam)
- Starwind UI for Astro-native, zero-JS primitives in `src/components/starwind/` (accordion, dialog, dropdown, tabs). Token-native: it reads the same semantic CSS vars as shadcn, with its own extras (`--outline`, status colors) declared in `globals.css` and mapped in `src/styles/starwind.css` (imported in BaseLayout right after globals.css). Pulls Tabler SVG icons via `@tabler/icons` and uses `tailwind-variants`
- PrimeReact as an unstyled escape hatch in `src/components/primereact/` for heavy, behavior-rich widgets (data tables, file upload, complex date or range pickers, steppers) that have no Radix / shadcn / Starwind equivalent. See `src/components/primereact/README.md` for when to reach for it and when not to
- Motion (formerly Framer Motion), Astro View Transitions, Lenis smooth scroll (respecting `prefers-reduced-motion`)
- react-photo-album for justified gallery layouts on the photography page
- yet-another-react-lightbox for fullscreen photo viewing (with Zoom and Thumbnails plugins)
- sharp for image processing; plaiceholder wired into case study covers via `scripts/generate-placeholders.mjs` (build-time generation into `src/lib/coverPlaceholders.json`) and the `CaseStudyCover.astro` wrapper
- opentype.js (dev-only) for the OG image generators: `scripts/generate-og-default.mjs` (the fallback card) and `scripts/generate-og.mjs` (per-page cards into `public/og/`, run in the build chain). Both render Bebas glyphs to SVG then rasterize with sharp, out-of-process (the CF prerender isolate has no node built-ins, so an `astro-og-canvas` route can't run here)
- `@astrojs/rss` for `/rss.xml`, surfacing case study entries to feed readers (`<link rel="alternate">` auto-discovery wired in BaseLayout)
- `astro-expressive-code` for themed code blocks in MDX (journal dev posts); its dark theme is tied to the site's `.dark` class. Must sit before `mdx()` in the integrations array
- `Analytics.astro` loads the Cloudflare Web Analytics beacon as a plain `<script defer>` (Partytown was removed 2026-09-04: its sandbox cost more main-thread time than the 7KB beacon) and, when `PUBLIC_GA_ID` is set, the GA4 gtag after the `load` event. The two script tags live in `src/components/analytics/` (`CloudflareBeacon.astro`, `GoogleAnalytics.astro`); `Analytics.astro` reads the env and wraps each in its condition
- Astro `prefetch` enabled (`prefetchAll`, viewport strategy) so links preload as they enter the viewport, pairing with the View Transitions router
- `three` + `@react-three/fiber` for the optional WebGL hero background (`HeroCanvas.tsx`), guarded behind WebGL support + reduced-motion with the CSS aurora as the fallback
- `embla-carousel-react` + `embla-carousel-autoplay` for the client-testimonials carousel (`TestimonialCarousel.tsx`)
- `@lhci/cli` (dev-only) for Lighthouse CI; see `.claude/rules/testing-ci.md`
- Dark / light / system theme system: `ThemeToggle.tsx` React island + anti-FOUC bootstrap script in BaseLayout, persisted to `localStorage["ncs-theme"]`
- `src/data/site.ts` as the single source of truth for contact info (name, email, phone, address, studio name, social URLs, tagline, domain) plus the optional `bookingUrl` and `newsletterUrl` that gate the Cal.com and Newsletter scaffolds
- Web3Forms for the contact form. Spam protection is the form's hidden honeypot field (`botcheck`) alone; the hCaptcha widget was removed. To re-add it, restore the `.h-captcha` div, the `js.hcaptcha.com/1/api.js` script tag, and the captcha gate in the contact form's submit handler, then turn hCaptcha back on in the Web3Forms dashboard (Web3Forms supports hCaptcha only, not Cloudflare Turnstile or Google reCAPTCHA). Cloudflare Web Analytics for privacy-friendly traffic
- eslint (flat config) + prettier for linting and formatting, `node --test` unit suites in `src/lib/*.test.ts`, Playwright + axe-core suites in `tests/` (smoke, accessibility in both themes, reflow), linkinator for the internal link check, and a GitHub Actions CI run on every push and PR. See `.claude/rules/testing-ci.md`
- Cloudflare for hosting: a Worker serving the static build as assets (see `wrangler.jsonc`; build command `npm run build`, output `dist/`)
- GitHub for version control
