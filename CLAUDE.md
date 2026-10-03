# Nixon Creative Studio Portfolio

Astro portfolio for Nathan Nixon, sole owner of Nixon Creative Studio in Cincinnati, OH. Web design, photography, and brand strategy for churches, schools, nonprofits, and small businesses: web design and strategy for clients anywhere, photography across the Cincinnati region. Lives at nixoncreativestudio.com.

This is a one-person project. Nathan is the owner, the designer, the photographer, and the only person editing the repo. Build for a future Nathan who hasn't touched the code in three months.

Reid Design is a separate business entity. Do not conflate it with Nixon Creative Studio.

---

## Strategy reference

All creative decisions trace back to the strategy doc:

`C:\Users\natha\Documents\Claude\Projects\Nixon Creative Studio Website\NCS-Website-Strategy.docx`

It documents the brand position, ten must-haves, page architecture, conversion strategy, and the reference site research (Brittany Chiang v4, Gianluca Gradogna, Elliott Mangham, Olia Gozha). Open it before any design call.

Related context lives in the sibling folder `C:\Users\natha\Documents\Claude\Projects\Nixon Creative Studio Website\`: the original HTML scaffold, the WordPress + Bricks build history, and the architectural notes. The Bricks-specific traps don't apply here, but the section architecture and brand work port directly.

---

## Server-rendered site on EmDash (live since 2026-10-03; fully server-rendered since CMS-DESIGN PR 2)

Read this first. Sections below that still describe a fully static site, MDX case studies, blur placeholders or `dist/client` as the site are superseded by it.

- **Case studies live in EmDash** (Cloudflare's CMS: D1 database, R2 media, KV sessions), not in git. The collection is `case_studies`; the admin is at `/_emdash/admin/` (passkey login). Taxonomies: `service`, `topic`, `stack`. The schema is reproducible from `seed/seed.json` and `scripts/lib/case-studies-schema.mjs`; the shape of every field is in `docs/EMDASH-SCHEMA.md`. The reader is `src/lib/caseStudies.ts`.
- **Everything is server-rendered** (`output: 'server'`, CMS-DESIGN PR 2, 2026-10-03). No page is prerendered, so `dist/client` holds only assets (`/_astro`, `/og`, icons, `robots.txt`, `sitemap-*.xml`), never HTML. Speed comes from the **route cache** (Astro route caching on Cloudflare's Workers Cache, `cache: { provider: cacheCloudflare() }` in `astro.config.mjs`): `BaseLayout` gives every public page a lifetime (`cachePublicPage()` in `src/lib/routeCache.ts`, 5 minutes plus a week of stale-while-revalidate), the CMS readers add the cache tags of the rows each page rendered (`getCaseStudies(Astro.cache)`), and a publish in the admin purges those tags. A new page needs nothing: use `BaseLayout` and it is cached; a new CMS reader must take `Astro.cache` and call `cache.set(cacheHint)` or the page is not purged on publish. See Gotcha 15 for the traps. The editor toolbar is `toolbar: 'client'` so cached HTML is identical for everyone.
- **Images from the CMS** are resized at request time by the Cloudflare Images binding (`imageService: { build: 'compile', runtime: 'cloudflare-binding' }`). Two silent failures to know: a host missing from `image.remotePatterns` serves full-size originals, and any resize request 4096 px tall or more returns the untouched original (tall screenshots use `src/components/emdash/ScrollShot.astro`, width only). `src/worker.ts` adds a 30-day cache header and the edge cache for `/_image` and media files, plus the trailing-slash redirect, the route-cache safety net and the security headers on HTML (Gotcha 15). Local images on formerly static pages (`/about`, `/services`, `/photography`) now go through the same runtime resizer instead of build-time files.
- **Config:** the top level of `wrangler.jsonc` is PRODUCTION (Worker `nixoncreativestudio`, D1 `ncs-emdash-prod`, R2 `ncs-emdash-media-prod`). The `ci` environment is the small dedicated CI Worker `ncs-ci` (D1 `ncs-ci`, R2 `ncs-ci-media`, KV `ncs-ci-sessions`, a three-case-study sample, see docs/TESTING.md); GitHub Actions builds with `CLOUDFLARE_ENV=ci`, so the required checks never read production data. Never run `wrangler deploy` locally without `CLOUDFLARE_ENV=ci`: production deploys only from Workers Builds on a push to `main`.
- **The CI dataset is rebuilt from scripts, never hand-copied.** `npm run ci-dataset` refreshes `ncs-ci` from the committed snapshot (`scripts/ci-dataset/rows.sql`, `media.json`, `terms.json`, `fixtures.sql`); `-- --from-scratch` drops and rebuilds it after a seed change; `npm run ci-dataset:snapshot` re-reads production (CLI login, read-only) to rewrite the snapshot. These scripts cannot write to production. See `scripts/ci-dataset/README.md` and docs/TESTING.md.
- **Tests, Lighthouse and the link check run against a Worker preview URL** (`PLAYWRIGHT_BASE_URL`, `LINKCHECK_URL`), not a static folder. See Testing below and `docs/TESTING.md`.
- **OG cards** for case studies are built from the live CMS pages by `scripts/generate-og.mjs` (`EMDASH_URL`, default the production site). If it cannot read the CMS it keeps the committed cards.
- **Details and history:** `docs/EMDASH.md` (what exists, gotchas), `docs/LAUNCH-RUNBOOK.md` (launch and rollback), `docs/PENDING.md`. The official EmDash guidance for agents is vendored in `.claude/skills/building-emdash-site/`.

---

## Content editing (CMS-DESIGN PR 14: how Nathan runs the site by hand)

Everything editable lives in the EmDash admin at `/_emdash/admin`; `docs/EDITING-GUIDE.md` is the plain-language walkthrough Nathan follows (a table of "I want to change X, go to Y", three practice edits, adding a case study, Journal entry, photo, redirect and menu link, rollback). Keep that guide true: a change to what the admin offers updates it in the same piece of work.

- **Where each thing lives.** One `cms/schema/<collection>.mjs` per collection (the one definition of its fields, limits and sidebar settings), one `cms/content/<collection>.json` per collection (the committed fallback and the seed). Singleton pages are `page_*` collections with one entry each (`page_home`, `page_about`, `page_services`, `page_contact`, `page_work`, `page_photography`, `page_journal`, `page_not_found`); `site_settings` holds the shared contact and chrome copy; `pricing_tiers`, `pricing_addons` and `service_offerings` hold the repeated blocks; `pages` holds Privacy, Accessibility and Colophon; `posts` is the Journal; `photos`, `case_studies`, menus and redirects complete the set.
- **Publishing.** Save keeps a draft, Publish makes it live; a publish purges the cached pages by tag, so an edit shows within seconds (Nathan confirmed this on 2026-10-03). The route cache's 5-minute lifetime is only the fallback if a purge is missed. Say "within seconds, five minutes at worst", never "about 5 minutes".
- **Journal Summary is required, in code.** The schema cannot make an existing optional field required (Gotcha 17), so `src/lib/journal.ts` hides any entry with an empty Summary. The guide says so in bold: an entry without a Summary is silently hidden.
- **The admin's "live view" button** uses each collection's `urlPattern`. A fixed address with no `{slug}` is valid (EmDash's `compileUrlPattern` accepts zero placeholders; the admin's `contentUrl()` just returns the pattern), so every `page_*` collection carries its page's address (`/`, `/about/`, ... `/404/`), `site_settings` points at `/`, the pricing and offerings collections at `/services/`, `photos` at `/photography/`. Without a pattern the admin guesses `/<collection>/<slug>/`, which is a 404 for a singleton. A new collection that maps to a public page gets a `urlPattern` in its schema file; `src/lib/cmsSchema.test.ts` lists every collection's expected pattern and fails if one is missing.
- **Sidebar order and groups** are collection settings (`sortOrder`, `group`) in the schema files: Site settings (0), Pages group (1 to 9), Pricing & services (10 to 12), Case Studies (13), Journal (14), Photography (15). Taxonomies follow their collection's group. EmDash cannot hide Comments, Widgets, Sections or Bylines; they are empty and the guide says to ignore them. `npm run cms:tidy -- --url <instance> [--dry-run]` deletes the unused template `category` taxonomy (refuses if it has terms) and reports leftover widget areas, sections and menus.
- **The Content Types screen is the dangerous one.** Deleting or retyping a field there deletes its data and History does not cover it. The recommendation in the guide is a second Editor-role login (needs a second email address from Nathan; docs/CMS-DESIGN.md question 1); the recovery is `cms/schema` plus `apply-schema.mjs` and D1 Time Travel.
- **What stays in code** (button hrefs, UI strings, templates, OG card titles, analytics IDs, brand tokens): docs/CMS-DESIGN.md 1.14. The optional catch-all `src/pages/[slug].astro` for brand-new plain pages was designed and deliberately NOT built (Nathan has not answered question 8, and a catch-all route puts the 404 path at risk); a new plain page is a code change.
- **Production data steps are run by the main session**, in Nathan's presence, with `npm run cms:production-load` (schema and content, ending in a read-only "unchanged" re-check) and `npm run cms:tidy`. Never from a delegated agent, never without `--dry-run` first. The login `npx emdash login` stores expires within hours; any read through the CLI (for example `npx emdash content list pages --url <prod>`) refreshes it, otherwise log in again.

---

## Stack

- Astro 7 with TypeScript in strict mode and `output: 'server'` with the Cloudflare route cache (see the section above)
- No Astro content collections any more (CMS-DESIGN PR 12 deleted `journal` and `photos`; the case studies went in the EmDash migration): case studies, journal entries and photos are EmDash collections (`case_studies`, `posts` shown as Journal, `photos`), read through `src/lib/caseStudies.ts`, `src/lib/journal.ts` and `src/lib/photos.ts`. `src/live.config.ts` is the only content config
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
- opentype.js (dev-only) for the OG image generators: `scripts/generate-og-default.mjs` (the fallback card) and `scripts/generate-og.mjs` (per-page cards into `public/og/`, run in the build chain). Both render Bebas glyphs to SVG then rasterize with sharp, out-of-process (the CF prerender isolate has no node built-ins, so an `astro-og-canvas` route can't run here)
- `@astrojs/rss` for `/rss.xml`, surfacing case study entries to feed readers (`<link rel="alternate">` auto-discovery wired in BaseLayout)
- `astro-expressive-code` and `@astrojs/mdx` were REMOVED in CMS-DESIGN PR 14 (unused since PR 12: no `.mdx` file is left, journal code blocks are drawn by `src/lib/journalBody.ts`). If MDX ever comes back, reinstall both and put expressive-code before `mdx()` in the integrations array.
- `Analytics.astro` loads the Cloudflare Web Analytics beacon as a plain `<script defer>` (Partytown was removed 2026-09-04: its sandbox cost more main-thread time than the 7KB beacon) and, when `PUBLIC_GA_ID` is set, the GA4 gtag after the `load` event. The two script tags live in `src/components/analytics/` (`CloudflareBeacon.astro`, `GoogleAnalytics.astro`); `Analytics.astro` reads the env and wraps each in its condition
- Astro `prefetch` enabled (`prefetchAll`, viewport strategy) so links preload as they enter the viewport, pairing with the View Transitions router
- `three` + `@react-three/fiber` for the optional WebGL hero background (`HeroCanvas.tsx`), guarded behind WebGL support + reduced-motion with the CSS aurora as the fallback
- `embla-carousel-react` + `embla-carousel-autoplay` for the client-testimonials carousel (`TestimonialCarousel.tsx`)
- `@lhci/cli` (dev-only) for Lighthouse CI; see "Testing, linting, and CI" below
- Dark / light / system theme system: `ThemeToggle.tsx` React island + anti-FOUC bootstrap script in BaseLayout, persisted to `localStorage["ncs-theme"]`
- `src/data/site.ts` exposes `getSite()`, which reads the shared values (name, email, phone, location, social URLs, tagline, the optional booking and newsletter URLs that gate the Cal.com and Newsletter scaffolds, the footer "Currently" line, the default closing-banner copy, the feed title) from the EmDash **Site settings** entry (`site_settings`, CMS-DESIGN PR 4), falling back to the committed `cms/content/site_settings.json`. Only the domain and canonical URL stay in code (`SITE_DOMAIN`, `SITE_URL`). The header and footer navigation are the EmDash **Menus** `primary` and `footer`, read through `getMenuItems()` in `src/lib/cms.ts` with the same fallback. `src/lib/pricing.ts` exposes `getPricingTiers()` and `getAddOns()`, which read the EmDash **Pricing tiers** and **Add-ons** collections (`pricing_tiers`, `pricing_addons`, CMS-DESIGN PR 5; schemas `cms/schema/pricing_*.mjs`) for the homepage teaser and `/services`, falling back to the committed `cms/content/pricing_tiers.json` and `pricing_addons.json` (the values `src/data/pricing.ts` used to hold; that file is deleted). `src/lib/homePage.ts` exposes `getHomePage()`, which reads the homepage words (hero headline as a plain lead plus a separate accent field, positioning and proof lines, button labels, the Selected Work, "What it costs" and "How we work" headings and copy, the four process steps, the closing CTA block, plus the page title and meta description) from the EmDash **Home page** entry (`page_home`, entry `home`, CMS-DESIGN PR 6; schema `cms/schema/page_home.mjs`), falling back to the committed `cms/content/page_home.json` (the literal text the components used to hold). One D1 read per request shared by the Hero, SelectedWork, PricingTeaser and ProcessBand (also on `/services`)
- Web3Forms for the contact form. Spam protection is the form's hidden honeypot field (`botcheck`) alone; the hCaptcha widget was removed. To re-add it, restore the `.h-captcha` div, the `js.hcaptcha.com/1/api.js` script tag, and the captcha gate in the contact form's submit handler, then turn hCaptcha back on in the Web3Forms dashboard (Web3Forms supports hCaptcha only, not Cloudflare Turnstile or Google reCAPTCHA). Cloudflare Web Analytics for privacy-friendly traffic
- eslint (flat config) + prettier for linting and formatting, `node --test` unit suites in `src/lib/*.test.ts`, Playwright + axe-core suites in `tests/` (smoke, accessibility in both themes, reflow), linkinator for the internal link check, and a GitHub Actions CI run on every push and PR. See "Testing, linting, and CI" below
- Cloudflare for hosting: a Worker that renders every page and serves `dist/client` as assets (see `wrangler.jsonc`; build command `npm run build`, output `dist/`), with Workers Cache in front of it
- GitHub for version control

---

## Homepage architecture

The homepage renders in this order: Hero, Selected Work, What it costs (the pricing teaser), Process Band, then the Footer (from `BaseLayout`). Section order IS the IA, not decoration. The previous eight-section frame (Hero, SelectedWork, Services, PhotoStrip, Process, Testimonials, CtaBanner, Footer) was retired during the rewrite documented in PRODUCT.md; an impeccable critique flagged numbered-eyebrow scaffolds, three-stacked-card-grid monotony, and photo-shy presentation as the loudest AI tells on the page, and the rewrite undoes them.

1. **Hero** (`src/components/Hero.astro`). A tall opening (sized with a clamp, `min-height: clamp(39rem, 72svh, 49rem)`, rather than a full 100svh, so it does not leave big empty bands above and below the content on large screens), theme-aware via `.band-themed` (a bright light surface with a soft brand glow in light mode, the navy aurora in dark). The layout is layered, not a two-column split: an oversized Bebas headline ("I make websites that pull their weight.") with a one-line audience statement (the sectors plus a "wherever you are" reach), the Cincinnati-base differentiator line ("Based in Cincinnati. Every site designed, built, and photographed by one person, start to finish"), and two CTAs sits on the left, over a right-weighted scene (`HeroShowcase.astro`) of a landscape desktop browser and a phone, both showing the same real client site, auto-scrolling, with the next site sliding in over the current one every five seconds, emerging from behind the headline. The scene is held to the site's content width (`.ncs-container`), so its right edge lines up with the header nav and it never bleeds into the page margins (which show the WebGL flow). In dark mode the WebGL flow fills basically the whole hero; legibility over it comes from three things together: a softened left scrim (`.hero-scrim`, semi-opaque navy under the headline fading to clear, so the flow still shows through on the left), a soft navy text-shadow on the headline, and the device scene sitting to the right, away from the headline's core. In light mode the desktop scrim and the headline shadow drop away (both gated to `.dark`) so the dark-navy headline reads cleanly over the light flow; the light-mode WebGL is the more active, colourful version, and on mobile a soft light scrim veil sits under the copy (with a light halo on the muted proof line) so it stays legible over that flow. The headline accent is amber over the dark hero and shifts to NCS blue (`text-link`) in light mode, where amber would fail contrast. The copy container is `pointer-events-none` so the scene stays hoverable on the right; the copy column re-enables pointer events for its links. Below `lg` the desktop scene is hidden; the single phone showcase becomes a faded, oversized backdrop that the copy sits over (the `.hero-mobile-scene` layer, `HeroShowcase variant="phone"` at a theme-aware opacity (0.5 in light, 0.85 in dark, since dark's scrim veils it) with a top fade-out), so the hero fills the screen instead of stacking the copy above a separate device block. The background is a domain-warped WebGL brand-color flow (`HeroCanvas.tsx`, cursor-reactive, desktop-only and lazy-loaded on idle) over the `.band-themed` glow + grain that carries the background on phones/tablets and as the reduced-motion/no-WebGL fallback. The WebGL itself is theme-aware through a `uDark` uniform (read on mount and updated live by a MutationObserver on the `.dark` class): the navy flow filling basically the whole hero (the horizontal weighting is theme-aware) in dark mode, a soft light pastel wash weighted to the left (around the headline) in light, so the desktop hero re-colours the moment the theme toggles. The headline scales by both viewport width and height (`clamp(..., min(9.5vw, 15vh), ...)`) so the CTAs never clip on short laptops; the copy uses `.ncs-container`, so it stays aligned with the header wordmark and the sections below. The studio wordmark lives in the sticky header, which takes the hero's own surface colour (light over the light hero, navy over the dark one), not in the hero itself. A real Nathan-shot photo is an optional layer, not a content gate: the `<Image />` slot is commented at the top of the component and would sit over the WebGL/aurora. A thin client-name marquee (`ClientMarquee.astro`) rides a strip at the base of the hero (theme-aware names: muted dark on the light hero floor, muted white on the navy one, with sky dot separators, edge-faded, auto-scrolling, pausing on hover); the device scene is inset above it by `--hero-marquee-h` so the screenshots never cross the names. The one honest line of proof that used to sit in its own band ("designed, built, and photographed by one person, start to finish") is now hero copy; the separate proof band was retired.
2. **Selected Work** (`src/components/SelectedWork.astro`). Three featured case studies, asymmetric: one large primary card (4:3 image + body in a two-column grid at desktop, stacked on mobile) followed by two medium cards in a 50/50 row. It is collection-driven: the component reads `getCollection('case-studies')`, filters to `featured === true`, sorts newest-first, and takes the top three (newest is the primary). Cards render real optimized covers through `EmDashCover` (and the hover-scroll frames through `ScrollShot`), and each surfaces the case study's `outcome` line in `--link` color above the summary so the proof-point reads at first scan instead of buried in body copy. Curate the homepage by setting `featured: true` on exactly the three entries you want here. The whole list is an `<ol>` because curation order matters; each card is a single `<a>` so the click target covers image + body together.
3. **What it costs** (`src/components/PricingTeaser.astro`). A value-anchored pricing band between Selected Work and the Process Band. It leads with the value floor every build includes (a custom design you own, 100/100 accessibility, strategy and a content system, one person start to finish), then the three web tiers from the CMS Pricing tiers (`getPricingTiers()` in `src/lib/pricing.ts`, committed-JSON fallback) as a hairline-ruled progression (NOT a card slab) with the Signature tier anchored ("where most projects land" plus a brighter accent price), each carrying its typical range and scope points. Prices count up on scroll (the real number is the static fallback), and a reassurance line (free first conversation, monthly payments) precedes the link to `/services`. Sits on a soft `.bg-mesh-soft` glow so it reads as a designed surface without becoming a second full band before the Process Band.
4. **Process Band** (`src/components/ProcessBand.astro`). A band that combines the four-step process and the inquiry CTA. It uses the theme-aware `.band-themed` surface: light (with a soft accent glow) in light mode, navy aurora in dark mode. Step numbers (01–04) are the ONLY deliberately numbered sequence on the homepage; they earn their place because the process is genuinely ordered. The CTA title is specific to audience ("Tell me what you are building.") and the button leads to `/contact`. Closes the page on one strong block instead of three stacked sections.
5. **Footer**, rendered by `BaseLayout`, is theme-aware via `.band-themed` (the same surface as the Process Band and CtaBanner): a bright light surface with a soft brand glow in light mode, the navy aurora in dark. In dark mode it continues the navy from the Process Band as one continuous dark block; in light mode it reads bright, continuing the light Process Band, so the page stays light and airy from the hero through the footer. Dark mode stays immersive navy. The accent seam line at its top edge (`.footer-seam`, now an `::after` since `.band-themed` owns `::before` for the glow) is dark-mode only; in light mode the footer and the band above it are already the same light surface, so no seam is needed.

Services, photography, and testimonials each live elsewhere, not on the homepage:

- **Services** copy lives on `/services` and `/about`.
- **Photography** has its own `/photography` page; on the homepage the work itself is carried above the fold by the device-pairing `HeroShowcase`, not by a four-up photo tile strip.
- **Testimonials** belong inside individual case study pages where the quote has earned context (and the /about carousel reads the same `testimonial` frontmatter). A standalone "what people say" band on the homepage at three equal cards put quotes at the lowest-impact layout for the format.

`ProcessBand` is one component used in two placements, so the four steps read identically across the site: the homepage closes with it (`variant="band"`, CTA on), and `/services` reuses it mid-page (`variant="soft"`, `showCta={false}`). The old standalone `Process.astro` was deleted in favor of this. The `CtaBanner` component is the tail-of-page inquiry block on `/about`, `/photography`, and `/services`.

Since CMS-DESIGN PR 6 the WORDS in the Hero, Selected Work heading, What it costs and Process Band come from the **Home page** CMS entry through `getHomePage()` (`src/lib/homePage.ts`, committed fallback `cms/content/page_home.json`); the layout, section order, link targets, step numbers and the hero's CSS-only entrance stay in the components. The hero is still server-rendered with no JS reveal gate, so the LCP element is the one it was (Gotchas 10 and 14). The proof line carries an explicit `{proof.before}{' '}` before the link, because Astro collapses the newline there ("photographed byone person" until PR 7); keep it if the template is reformatted.

Since CMS-DESIGN PR 7 the words on `/services` (headline, cost and why-it-costs copy, the FAQ) are the **Services page** CMS entry (`getServicesPage()`) and the three chapters are **Service offerings** (`getServiceOfferings()`), both in `src/lib/servicesPage.ts` with committed fallbacks `cms/content/page_services.json` and `service_offerings.json`. The Service and FAQPage JSON-LD is built from those rows by `buildServiceSchemas()` (pinned byte-for-byte by `src/lib/servicesPage.jsonld.golden.json`), including the Strategy $1,500 and Photography $900 floors, so a price or FAQ change needs no code edit. The Web design screenshot stays an image file in `services.astro` (`offeringImages`, shown only when the entry has a picture description); placeholder SVGs, section order and the hero flow card stay in code.

Since CMS-DESIGN PR 8 the words, photos, Currently lists and Lighthouse numbers on `/about` are the **About page** CMS entry (`getAboutPage()` in `src/lib/aboutPage.ts`, committed fallback `cms/content/page_about.json`, schema `cms/schema/page_about.mjs`). The Person JSON-LD is built from it (`buildPersonSchema()`, pinned byte-for-byte by a unit test), `Testimonials` and `LighthouseScore` take their heading and numbers as props, and the rail location stamp reads Site settings. The typing `Terminal` stays in code. **Pictures** are the point of this PR: a CMS entry holds real EmDash media (headshot, 3 to 6 photos), rendered by `src/components/emdash/EmDashPhoto.astro` as width-only `/_image?href=<media url>&w=N&f=webp` URLs (resized WebP, never the original); the committed fallback holds `{ "$file": "src/assets/..." }` references, which `about.astro` maps to the bundled assets and renders with Astro's `<Image>` exactly as before, so production (CMS empty) is unchanged. A photo with no description is skipped; fewer than three usable photos, a missing story, an empty Currently list or a bad date makes the whole entry fall back; a headshot without a description falls back to the bundled headshot. The story is rendered as bare `<p>` elements from `restrictPortableText()` plus `blockHtml()` (`src/lib/portableText.ts`), NOT through `RestrictedPortableText`, because importing `emdash/ui`'s `PortableText` adds its 9.5 KB stylesheet as an extra render-blocking `<link>` to the page.

Since CMS-DESIGN PR 9 the words on `/contact` (headline, intro, the sidebar's "What happens next" lines and "Where I am" text, the closing banner) and the three form choice lists are the **Contact page** CMS entry (`getContactPage()` in `src/lib/contactPage.ts`, committed fallback `cms/content/page_contact.json`, schema `cms/schema/page_contact.mjs`). **The Budget range, Project timeline and How-did-you-hear selects submit the visible LABEL** (`<option value="Under $4,000">`), so Web3Forms emails "Budget: Under $4,000" and not a code; Nathan decided this, and it means renaming a choice in the admin changes the emails with it. Organization type keeps its codes (the case-study sector slugs that `/contact?org_type=<sector>` relies on) and stays in code, as do the field labels, help and error text, the success panel and the Web3Forms wiring (key, honeypot `botcheck`, hidden fields, the `astro:page-load` re-bind guard). The draft restore only restores a select if an option with that exact value still exists, so a draft saved before the change (codes) or a renamed choice leaves the select on its placeholder. Keep the budget brackets in line with the Pricing tiers: the first bracket starts at the lowest tier price (a unit test checks the committed lists against `pricing_tiers.json`; it cannot see admin edits). `tests/contact-copy.spec.ts` intercepts the Web3Forms POST with `page.route()` and asserts the payload carries labels; **never submit a real message from a test**.

Since CMS-DESIGN PR 10 the text of `/privacy`, `/accessibility` and `/colophon` is one entry each of the template `pages` collection ("Other pages" in the admin; `getProsePage()` in `src/lib/prosePage.ts`, committed fallback `cms/content/pages.json`, schema `cms/schema/pages.mjs`), and the three routes are short files that hand it to `src/components/ProsePage.astro`. The body is Portable Text restricted to paragraphs, headings 2 and 3, lists, strong, em, code and safe links, turned into plain HTML by `blockHtml()` (not `RestrictedPortableText`: its `emdash/ui` stylesheet is a render-blocking link). Every Heading 2 is a section and a line in the "On this page" list; its id is `slugify(heading)` except three Accessibility headings pinned by `LEGACY_ANCHORS` (`#how-its-checked`, `#where-it-stops`, `#report`), so reword one and its anchor changes. `show_toc` picks the layout (document with the list, or the Colophon's ledger of rows). The scroll-spy is one script keyed on `nav[aria-label="On this page"]`, bound on `astro:page-load` with the dataset guard. The Colophon's "Last built" row stays in code. Keep these pages TRUE: the Colophon stack, type and hosting rows and the Privacy analytics description are tied to the code and the hosting, so check them after a change to either. `npm run check:links` now also checks fragments (`--check-fragments`).

Since CMS-DESIGN PR 11 the words on `/work`, `/photography`, `/journal` and the 404 page are four more singleton entries (**Work page**, **Photography page**, **Journal page**, **Not-found page**; readers in `src/lib/indexPages.ts`, committed fallback `cms/content/page_work.json`, `page_photography.json`, `page_journal.json`, `page_not_found.json`, schemas `cms/schema/page_*.mjs`), and the photography page's pictures are the new **`photos`** collection (`getPhotos()` in `src/lib/photos.ts`, schema `cms/schema/photos.mjs`, admin group "Photography"). **`photos` has no committed fallback on purpose**: zero photos, a read error and a missing table all give the page's honest "In progress" state, which is what production shows until Nathan adds the first photo in the admin. Every photo needs a description for screen readers (`alt`); a photo without one, without a picture or without a stored size is left out rather than shipped without alt text. Pictures are served as resized WebP through width-only `/_image?href=...&w=N&f=webp` URLs (never a height, or a tall photo meets the 4096 px resizer limit in `docs/EMDASH.md`): the hero and cards use `EmDashPhoto`, the justified gallery gets `srcSet` and a larger `lightboxSrc` through `PhotoGallery.tsx`. The gallery is empty in the server HTML until its `client:visible` island hydrates, so any axe run must scroll it into view (`tests/index-pages.spec.ts` does). The 404 page still answers a real 404 for an unknown URL, and `/404/` by name still answers 200 for the Lighthouse audit. CI carries one hand-written test photo (`scripts/ci-dataset/ci-content/photos.json`, CI only; production has none), and `NCS_CI_NO_TEST_CONTENT=1 node scripts/ci-dataset/cms-fixtures.mjs` plus a refresh measures the zero-photo page. The Journal entries are the `posts` collection since PR 12 (next paragraph). Still in code: the Work chips and cards, the project count, the Photography "In progress" label and link, the "Where these photos come from" note, the Journal card's mark and buttons.

Since CMS-DESIGN PR 12 the **Journal** is the template `posts` collection, relabelled (admin: Journal; schema `cms/schema/posts.mjs`: `title`, `featured_image` as Cover image, `content` as Body, `excerpt` as the required 200-character Summary, `updated`; tags are the built-in `tag` taxonomy). `/journal/` and `/journal/<slug>/` read the PUBLISHED entries through `getJournalEntries()` / `getJournalEntry()` (`src/lib/journal.ts`); `/rss.xml` carries them beside the case studies; `src/pages/sitemap-posts.xml.ts` is the journal sitemap (valid and EMPTY while nothing is published, because the stock EmDash handler answers 404 and the index would list a broken child); `generate-og.mjs` builds a navy `og/journal/<slug>.png` per entry from `/rss.xml`. **There is no committed fallback, on purpose**: zero entries, a read error and a missing table all read as an empty journal, so `/journal/` shows its "first entry is coming" card and the Journal menu item stays hidden (`hasJournalEntries()`, memoised per request, tags every page with `posts` so the first publish purges the nav everywhere). **A draft is never visible**: an unknown slug and a draft slug both answer a real 404; the CI dataset carries one draft (`ci-draft-entry`) so tests catch a leak. The publish date is EmDash's `published_at`, shown in `America/New_York`. **The body is drawn by `renderJournalBody()` (`src/lib/journalBody.ts`), not by `emdash/ui`'s `PortableText`**: importing that component made its 9.5 KB stylesheet the shared `ui.*.css` chunk and loaded it on the homepage, `/services`, `/work` and every case study (found by parity, 8/14 PASS; the PR 8 trap again). Supported: paragraphs, h2/h3 with ids, quotes, nested lists, bold, italic, inline code, safe links and code blocks (plain monospace boxes, focusable, NO syntax colouring). **Pictures, tables and embeds in a body are not drawn yet**; the cover image is the picture an entry has. A new entry's share card exists only after the next deploy (build-time script). Still in code: the Journal card's mark and buttons, the "Latest" badge, the "Filed under" label.

Don't reorder these sections. The hero no longer depends on any single content gate: the WebGL flow and the device-pairing showcase fill it today, so it ships complete.

---

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

---

## Theme system

Three-state toggle (light / dark / system), persisted to `localStorage["ncs-theme"]`. System is the default for first-time visitors; while set to System, the page listens to `matchMedia('(prefers-color-scheme: dark)')` and flips live when the OS changes.

The wiring, in order of execution:

1. **Anti-FOUC script in `BaseLayout.astro`** runs inline in `<head>` before first paint. Reads `localStorage["ncs-theme"]` and `prefers-color-scheme`, applies the `.dark` class on `<html>` plus an inline `color-scheme` style so native widgets (scrollbars, form controls) follow. No flash of the wrong theme on initial paint or after View Transitions.
2. **`ThemeToggle.tsx`** (React island in the Header and the mobile nav panel) cycles light → dark → system on click, writes to the same localStorage key, and re-binds the matchMedia listener whenever the chosen theme changes.
3. **`globals.css`** defines color tokens for both modes. `:root` carries light; `.dark` carries the overrides. Brand `--accent` and `--secondary` keep their visual identity in both modes; only the surface and text tokens flip. See Brand colors above for the exact token responsibilities.

`--primary` (navy) deliberately stays navy in dark mode so the default Button and the navy aurora bands stay on-brand. The Hero, Footer, Process Band, and CtaBanner are all theme-aware via `.band-themed` (light surface + soft brand glow in light mode, navy aurora in dark), so light mode reads bright and airy from top to bottom while dark mode stays one immersive navy field. `--accent-foreground` flips to navy in dark mode so white text on the brightened sky-blue accent doesn't fail contrast.

---

## Motion and effects system

The site runs a deliberately animation-rich, polished design. The homepage and inner pages lean into scroll motion, animated backgrounds, and hover micro-interactions on purpose. The one hard constraint: every effect must stay WCAG AA and reduced-motion safe, which the system below handles automatically.

The motion layer is two files plus a vocabulary of declarative classes and `data-*` attributes, all defined once in `src/styles/globals.css` (section 6) and wired in `src/layouts/BaseLayout.astro`:

- **`src/scripts/enhance.ts`** (imported in BaseLayout, runs on every `astro:page-load`) powers `[data-spotlight]` (sets `--mx`/`--my` for a cursor-tracking glow), `[data-countup]` (animates a number up to `data-countup-to` when scrolled into view; optional `-suffix`/`-prefix`/`-duration`), and `[data-header]` (toggles `data-scrolled` for the sticky frosted header). (The old `[data-magnetic]` cursor-follow button pull was removed.)
- **The reveal observer** (inline `<script>` at the end of BaseLayout, also on `astro:page-load`) adds `.is-visible` to `[data-reveal]` elements as they enter the viewport.

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

---

## Build pipeline

`npm run build` is a chain:

Stop the dev server before running `npm run build`. The `@astrojs/cloudflare` adapter's prerenderer opens a tunnel during the build; with `npm run dev` still running it collides on the port and the build dies with an undici `fetch failed` / `bad port` error in `prerenderer.js`. That is a port conflict, not a code error, kill the dev server and rebuild.

1. `npm run og:pages` runs `scripts/generate-og.mjs`. Generates one per-page Open Graph card into `public/og/`: one per main route plus one per case study (`og/work/<slug>.png`) and journal entry. Main routes and journal entries (taken from `/rss.xml`, links shaped `/journal/<slug>/`, published entries only; an empty journal builds none and is not a warning) get the navy card (Bebas title + amber studio name); case studies get a cover card, the real hero screenshot filling the frame behind a navy scrim, with the title anchored bottom-left, so a shared case study previews the actual shipped work. **The case-study cards are built from EmDash, not from git:** the script reads the published entries of the instance named by the `EMDASH_URL` env var (default: the production site; the default flipped to `https://nixoncreativestudio.com` at cutover) through what an anonymous visitor can read (`/rss.xml` for slug and title, `/work/<slug>/` for the cover media URL, `/_emdash/api/media/file/<id>` for the original bytes), because the REST content API needs a login. If the instance is unreachable or returns nothing, the committed `public/og/work/*.png` cards are kept, a warning is printed and the build carries on (a CMS outage never fails or empties a build). Unchanged covers re-render byte-identical. Runs out-of-process for the same V8-isolate reason (an Astro route can't: it would need `node:crypto` in the CF prerender worker, which is why `astro-og-canvas` as a route fails here). `BaseLayout.astro` maps the current pathname to `/og/<slug>.png`. Output is deterministic, so re-running with unchanged content produces identical bytes.
2. `astro build` runs as normal. (The blur-placeholder step and `CaseStudyCover` were removed at the 2026-10 cutover; EmDash paints its own blurhash.)

Standalone scripts:

- `npm run og:pages` — re-run the per-page OG card generator (after adding a case study or changing a page title; journal cards are built at deploy time from the published entries, so a new entry's card appears on the next deploy).
- `npm run og` — re-run `scripts/generate-og-default.mjs` to regenerate `public/og-default.png`, the manual fallback card (after changing brand colors, the tagline, or the wordmark).
- `npm run icons` — re-run `scripts/generate-icons.mjs` to regenerate the favicon / app-icon set (after changing brand navy, the accent amber, the squircle radius, or the wordmark font). The mark is a white Bebas "N" on a navy squircle with one amber spark, built from the real Bebas glyph via opentype.js (same pipeline as the OG cards). Outputs `public/favicon.svg`, `public/favicon.ico` (16/32 without the spark, 48 with), `public/apple-touch-icon.png` (180, navy baked in), and the PWA `public/icon-192.png` / `icon-512.png` / `icon-512-maskable.png` referenced by `public/site.webmanifest`. One self-contained look (navy tile, no `prefers-color-scheme` flip) so it reads the same on light and dark browser chrome. Wired into `BaseLayout.astro`'s `<head>`. NOT in the build chain (icons only change when the brand does, like `og`).

`public/og-default.png`, the generated `public/og/*.png` cards, and the favicon / app-icon set (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `site.webmanifest`) are committed to the repo because they're real assets shipped to visitors. `npm run dev` reads the committed versions without re-running the scripts.

---

## Testing, linting, and CI

The repo carries a light quality-gate layer, matched to the rest of Nathan's Astro + Cloudflare sites.

WCP is the reference for this standard; reid-design-site and mas-monograms carry the same shape. `docs/TESTING.md` is the map of what covers what.

- `npm test` runs the Playwright suites in `tests/` (`playwright.config.ts`): `smoke` (every route 200s with the studio name in its title), `a11y` (axe-core default rules on every route, zero violations), `a11y-dark` (the same sweep with `localStorage["ncs-theme"]` seeded to `dark` before the anti-FOUC bootstrap runs, plus a focus-indicator check on the contact form), `reduced-motion` (PORTABLE, starter PORTS.md card 61: nothing still running 2.5s after load under `reducedMotion: 'reduce'`), and `reflow` (no horizontal overflow at 320px, WCAG 1.4.10, and at 1440/1024/768). Chromium runs everything; a WebKit iPhone 14 profile runs smoke, both axe sweeps and reduced-motion. **The suites run against a URL, `PLAYWRIGHT_BASE_URL`, with no webServer** (the site is hybrid, so `dist/client` is not the whole site; see Gotcha 12). Unset, the config throws a message saying so. Locally: `PLAYWRIGHT_BASE_URL=https://ncs-ci.nathanjnixon86.workers.dev npx playwright test --project=chromium`. CI points it at the Worker version preview. `tests/routes.ts` is the route list (prerendered and server-rendered alike, the three case studies in the reduced `ncs-ci` sample, not all nine): add a line when a page ships or a case study is added to the CI dataset. `services-copy` (CMS-DESIGN PR 7: with JavaScript off, `/services/` is server-rendered with the `page_services` and `service_offerings` words and its Service and FAQPage JSON-LD equals the same content files), `home-copy` (CMS-DESIGN PR 6: with JavaScript off, the hero headline is server-rendered with the lead and the accent as separate spans and equals the `page_home` words, the section headings, the four "every build includes" lines and the four process steps match on `/` and `/services/`, the hero copy sits under no `[data-reveal]` ancestor, and the page has a real meta description) runs on chromium. `pricing` (CMS-DESIGN PR 5: with JavaScript off, every tier price on `/` and `/services/` is the real number as static text and equals its `data-countup-to`, the add-on prices show, and the Web design JSON-LD floor equals the first tier's price) runs on chromium. `smoke` also asserts an unknown `/work/<slug>/` answers a real 404 with the not-found page, and (CMS-DESIGN PR 4) that every route except `/coming-soon` carries the header menu links (Work, Services, About), the "Start a project" button and the footer email, which holds whether the CMS or the committed fallback served the chrome. `npm run test:ui` opens the Playwright UI.
- `npm run test:unit` runs the `node --test` unit suites in `src/lib/*.test.ts` (currently `cn`, `readingTime`, and `theme-tokens`, plus the CI/OG helper tests, the CMS reader, schema and loader suites, and for PR 4 `site.test.ts` (the fallback equals the old hardcoded values, CMS and fallback read paths, one read per request, menus), `cmsContent.test.ts` (every `cms/content/*.json` satisfies its schema) and `ciFixtures.test.ts` (the generated `seed/seed.json` CMS part and `cms-rows.sql` are current), and for PR 5 `pricing.test.ts` (the fallback equals the old `pricing.ts` values including the $100/mo care plan, CMS and fallback read paths, ordering, one anchor tier), and for PR 6 `homePage.test.ts` (the fallback equals the old hardcoded hero and section copy, missing entry, D1 error and short-list fallbacks, CMS path, step numbers counted from order, one read per request, the title helper), and for PR 7 `servicesPage.test.ts` (the fallback equals the old /services copy, JSON-LD byte-equal to the golden file on the fallback and CMS paths, FAQ and price edits flow into the structured data, fallbacks, ordering)). They run under Node's native type stripping, so they import the `.ts` modules directly with no build step.
- `src/lib/theme-tokens.test.ts` is the **theme-token contrast gate**, added 2026-08-27. It parses the real hex out of the `@theme`, `:root` and `.dark` blocks of `globals.css` and asserts every rendered token pair against WCAG AA (4.5:1 for text, 3:1 for focus rings and control edges), in **both** modes, plus that the `@theme` literals still mirror their `:root` twins. It exists because axe (and therefore the Lighthouse accessibility category) has no rule for focus-indicator or custom-border contrast and only ever sees one theme per run: the score can sit at 100 while a focus ring is invisible. The math lives in `src/lib/contrast.ts`. Its header comment lists every deliberate non-assertion; read that before adding or removing a pair.
- `npm run lint` runs eslint (flat config in `eslint.config.js`) over `src` and `scripts`. A hard gate in CI since 2026-09-06 (0 errors; a few unused-variable warnings remain and do not fail it). The old `eslint-plugin-astro` false positive (an HTML comment inside a `{ ... }` expression read as a JSX error) is gone because every such comment is a JSX comment now. Inside a template expression, comment with `{/* */}`, never `<!-- -->`.
- `npm run format` runs prettier across the repo (family config in `.prettierrc`: single quotes, semis, trailing commas, printWidth 100, `prettier-plugin-astro` + `prettier-plugin-tailwindcss`; ignore list in `.prettierignore`). `npm run format:check` is the CI form. `prettier-plugin-astro` cannot parse a `<script>` nested inside a template expression, so a conditional script goes in its own component and the condition wraps the component (`ComingSoonGate.astro`, `src/components/analytics/`).
- `npm run check` is the quick gate: `astro check && npm run lint`. `npm run check:full` adds the unit tests and the build.
- `npm run check:links` (`scripts/check-links.mjs`) runs linkinator over the URL in `LINKCHECK_URL` (CI: the Worker preview); every internal link must resolve (off-site URLs are skipped). With `LINKCHECK_URL` unset it falls back to `dist/client`, which holds no HTML now that every page is server-rendered, so that mode finds almost nothing; always set `LINKCHECK_URL`. The log must say "scanned N links" with N in the hundreds.
- `.github/workflows/ci.yml` runs on pushes to `main`, on pull requests, and by hand. Job `build`: `npm ci`, drift check, `astro check`, lint, format check, unit tests, build, then **upload the Worker as a non-promoted version** (`.github/actions/preview-version`: `npx wrangler versions upload --preview-alias ci-<branch or pr-N>`, URL parsed from the `WRANGLER_OUTPUT_FILE_PATH` ndjson `version-upload` entry, falling back to the "Version Preview Alias URL:" log line) and run the link check against that URL. Job `test` (needs `build`): Playwright browsers, `npm test` with `PLAYWRIGHT_BASE_URL` set to the preview URL, and the `playwright-report/` artifact (14 days). Needs repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (docs/PENDING.md); without them (fork PRs) the upload, link check and `test` job are skipped with a warning annotation, not failed.
- `.github/workflows/lighthouse.yml` runs Lighthouse CI (`@lhci/cli`, config in `lighthouserc.json`) against a Worker version preview (same `preview-version` action, alias prefix `lh`) on pushes to `main` and on PRs; `lighthouserc.json` is a template whose URLs start with `${LHCI_BASE_URL}`, and `scripts/lhci-config.mjs` writes the git-ignored `lighthouserc.generated.json` that lhci reads. The audit list is unchanged except `/404.html` became `/404/` (`src/worker.ts` answers the not-found page with status 200 when it is requested by that exact path; a real unknown URL answers 404 and Lighthouse refuses 4xx pages). The first run per URL on a fresh preview is a route-cache MISS and the next two are HITs, so the median of three measures the cached page. **Accessibility is a hard gate at minScore 1** (the 100-a11y bar the studio sells), and so are LCP under 4.5s and CLS under 0.1; performance / best-practices / SEO scores and total byte weight are warnings so normal CI variance doesn't block a PR. It runs on `ubuntu-latest`; see Gotcha 9 for why the local run is not trustworthy on Windows.
- **There is no `staging` branch** (retired 2026-10-03). Work on a short-lived branch and open a PR: CI and Lighthouse run on the PR against a Worker preview, Cloudflare also gives every branch its own preview URL, and a bad change is undone with `git revert` or the Deployments tab rollback. The old `deploy-staging.yml` and the Dependabot staging fast-forward were removed.
- `.github/workflows/uptime.yml` curls the live site's key routes hourly and fails the run if any does not end at 200. Gated on the `SITE_URL` repo variable, which is not set yet (see `docs/PENDING.md`). Schedule is on because the repo is public and Actions minutes are free there.
- `npm run parity capture` / `compare` is the **rendered-HTML parity harness** (`scripts/page-parity.mjs`, baselines committed in `scripts/.parity/`). It never builds; you build, it reads `dist/client`, or with `--url <base>` it fetches the rendered HTML over HTTP so the server-rendered pages (which are not in `dist/client`) can be compared too (page list = the committed snapshot names, plus `--routes /a/,/b/`). Baselines were captured from the static build and have NOT been re-captured for the hybrid site, so expect DIFFs on migrated pages. Reach for it on any change that is supposed to be render-neutral. Deliberately not in CI, because its baselines are meant to be re-captured when markup legitimately changes and a gate that gets re-baselined is a gate that gets rubber-stamped.
- For CMS PRs the parity pair (main on `ncs-ci`, then the PR preview) goes into a throwaway directory so it cannot overwrite those baselines: add `--snap-dir .parity-cms` (or set `PARITY_SNAP_DIR`) to both `capture` and `compare`. `.parity-cms/` is git-ignored. Recipe in docs/CMS-DESIGN.md 2.1 and docs/TESTING.md.
- **`plugins/studio-help/`** is a reusable EmDash admin plugin (first-run tour, Help page, dashboard widget, per-screen notes) driven by `cms/help/tour.json`. Registered in `astro.config.mjs`; touches no public page byte. Details in `docs/EMDASH.md` ("Admin help plugin"), tests in `docs/TESTING.md`, reuse recipe in `docs/stack-template/ADMIN-HELP.md`. Edit the JSON, not the code, to change the words; bump `tour.id` to re-show it. `astro dev` now works on a clean checkout (zustand `optimizeDeps.exclude`) and `tests/studio-help.spec.ts` drives a local dev admin with `STUDIO_HELP_ADMIN=1`.
- **CMS tooling (CMS-DESIGN PR 3).** `npm run cms:schema` (`scripts/cms/apply-schema.mjs`, generic applier `scripts/lib/emdash-schema.mjs`) makes an instance match `cms/schema/<collection>.mjs`; `npm run cms:load` (`scripts/cms/load-content.mjs`, logic in `scripts/lib/cms-load.mjs`) loads `cms/content/*.json` (entries and images through the `emdash` CLI login, menus and redirects through REST with `EMDASH_TOKEN`); `npm run cms:pt -- file.md` turns Markdown into Portable Text JSON for a content file. Both write scripts are idempotent, take `--dry-run`, and refuse any target that is not the `ncs-ci` Worker or a local address unless `--yes` is passed. `npm run cms:production-load` (`scripts/cms/production-load.mjs`, logic in `scripts/lib/production-load.mjs`) is Nathan's one-command production load: it runs both scripts for every collection found in `cms/schema/` and `cms/content/` in a safe order, re-checks each step read-only, stops on the first non-`unchanged` or overwrite, and logs to the git-ignored `.cms-load-log/`; flags `--plan`, `--only`, `--from`. Builder sessions never run it against production (no token); see `docs/LAUNCH-RUNBOOK.md`. The pages read the content through `src/lib/cms.ts` (`getSingleton`, `getOrdered`, `getMenuItems`), which falls back to the committed JSON, logs `[cms] ...` and tags the route cache; `src/lib/portableText.ts` and `RestrictedPortableText.astro` are the restricted renderer for the About story and prose pages. PR 4 moved the shared chrome onto it (Site settings and the two menus); PRs 5 to 13 move the pages. The CI dataset gets the CMS collections and menus from `scripts/ci-dataset/cms-fixtures.mjs` (generated `seed/seed.json` entries plus `cms-rows.sql`) until production holds the data; **production has held PRs 4 to 12 since 2026-10-03** (`PRODUCTION_HAS` lists them, `snapshot.mjs` carries their rows; `photos` and `posts` are schema-only there and CI keeps its hand-written test photo and journal entries). **PR 13** adds the one existing collection to the loader (`cms/schema/case_studies.mjs`, plus `cms/content/case_studies.json`, whose `"patch": true` entries set a field only when the entry holds nothing for it) and `cms/content/redirects.json`; the redirect rows are live in production (no code fallback; Gotcha 18), and the hero scene keeps its bundled five as a fallback until its fields are loaded. Production steps: docs/LAUNCH-RUNBOOK.md, details and builder notes: docs/CMS-DESIGN.md ("PR 3 notes", 2.6).
- `npm run sync-check` diffs this repo's copies of the shared "library of record" files against `ncs-astro-sanity-starter` (point at it with `NCS_STARTER_DIR`). Four files are marked canonical here: `scripts/free-dist.mjs`, `scripts/with-workerd.mjs`, `scripts/sync-check.mjs`, and `src/lib/contrast.ts`. Read that repo's `PORTS.md` before editing any of them, and port a fix back rather than patching locally. **This is a CI gate since 2026-09-06** (PORTS.md card 36): the build job checks the starter out at `.ncs-starter` and runs the script against it on every push and PR, so drift fails the build instead of waiting for someone to run it by hand.
- `npm run free-dist` is the manual form of the `prebuild` hook. See Gotchas.
- `docs/PENDING.md` is the authoritative open-patch and waiting-on-a-human queue; `docs/TESTING.md` maps which gate covers what. Both are registries: edit them in the same commit as the thing they track.

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

- `BackToTop.tsx` — floating button bottom-right, rendered once in BaseLayout. Fades in after 600px scroll, honors `prefers-reduced-motion`.
- `ReadingProgress.tsx` — thin top bar that fills as the visitor scrolls. Rendered only on case study and journal detail pages.
- `CopyEmail.tsx` — mailto link plus a one-click copy-to-clipboard button with sr-live "Copied" status. Footer Contact column + Contact page sidebar.
- `ThemeToggle.tsx` — light / dark / system cycle. Header (desktop) + the mobile nav panel.
- `MobileNav.tsx` — the small-viewport navigation: a full-screen panel (a shadcn Sheet underneath, so focus-trap, Escape, scroll-lock, and dialog ARIA all stay intact). Oversized Bebas nav links, each with a short honest descriptor, hairline-divided like an editorial index, with a staggered entrance on open. Theme-aware like the rest of the site: a light surface with dark type, NCS-blue links, and a soft brand glow (`.bg-mesh-soft`) in light mode; navy with white type, sky links, and the drifting `.bg-aurora` in dark. The brand-blue "Start a project" CTA and the theme toggle carry across both themes. Below the nav sits a "Get in touch" block (email, phone, inline Instagram / LinkedIn glyphs, and the theme toggle). The active route shows in NCS blue (light) / amber (dark) with a persistent arrow. Below md (768px); `client:only="react"`. Its nav list no longer includes Contact, which is promoted to the desktop header's "Start a project" CTA; the drawer's own CTA covers it on mobile.
- `Testimonials.astro` + `TestimonialCarousel.tsx` — a "What clients say" carousel on /about. The `.astro` wrapper is collection-driven: it reads the `testimonial` field from case studies (so quotes stay tied to the client and nothing is fabricated) and renders nothing until at least one case study carries a real quote. The `.tsx` island is the Embla carousel: keyboard arrows, prev/next/dot controls, a Pause/Play toggle (SC 2.2.2), autoplay that is off under reduced motion and pauses on hover/focus, and `inert` on off-screen slides. To populate it, fill a case study's `testimonial:` frontmatter.
- `HeroCanvas.tsx` — the WebGL hero background (Three.js + `@react-three/fiber`): a fullscreen shader quad drawing a domain-warped flow of brand colors that visibly swirls, plus a soft sky bloom that follows the cursor. Theme-aware via a `uDark` uniform (in `HeroCanvasInner.tsx`, read on mount and updated live by a MutationObserver on the `.dark` class): the navy / NCS blue / sky / amber flow in dark mode, a soft light pastel wash on a near-white base in light mode. Layers over the `.band-themed` glow fallback in Hero.astro and renders nothing (so that glow shows) under reduced motion or without WebGL; pauses (frameloop "never") when the hero is off-screen or the tab is hidden; DPR capped, `powerPreference: 'low-power'`. `client:only="react"` because R3F does not server-render. Edit the GLSL in this file to retune the look; keep it subtle and on-brand (not neon).
- `HeroShowcase.astro` — the device-pairing scene in the hero's right column (at `lg` and up): a large landscape desktop browser on the left (traffic-light dots + a live host in the address bar) and a phone on the right (dark bezel + notch) overlapping its lower-right, both showing the SAME client site and both auto-scrolling the real full-page screenshot, with the next site sliding up over the current one every five seconds (a slide, not an opacity crossfade, which would ghost two sites together; the outgoing scroll is frozen so it cannot snap). Showing one site on two screens reads as responsive design; cycling the set (church, journal, race, shop, school) shows the range. **Built from the case studies since CMS-DESIGN PR 13:** `Hero.astro` reads the published case studies through `getCaseStudies()`, `selectHeroStudies()` (`src/lib/heroSites.ts`) keeps the ones with `in_hero` ticked AND both `showcase_desktop` and `showcase_mobile` set, ordered by `hero_order` (unnumbered last), and hands them to both renders as `sites`; the address bar shows the host of `live_url` without `www.`. The images are width-only `/_image?href=<media url>&w=N&f=webp` URLs (`resizedImage()`; never a height, because the captures are 4000 to 10000 px tall and the resizer ignores anything 4096 px or taller, docs/EMDASH.md). **Fallback:** with no qualifying entry (production until the PR 13 data is loaded, because the two fields do not exist there yet; every site un-ticked; a failed read) the scene is the `bundledSites` array in the component, the five bundled `{slug}-home.png` + `{slug}-mobile.png` captures it showed before, so it can never come up empty. Editors tick "Show in the homepage device scene" on a case study and set its order; the five bundled sites are the migration's `cms/content/case_studies.json`. The bundled desktop frames are the full-page `{slug}-home.png` captures that used to drive the case-study `SiteShowcase`; phone frames are real mobile captures at `src/assets/case-studies/shots/{slug}-mobile.png` (Playwright at 560 wide, which is still the mobile layout but enough resolution to stay crisp at the phone's ~250px retina display, full page with lazy images forced to load, cropped to ~4000px). Performance: inactive screenshots are `display:none` until the script promotes them, so only the first site loads on paint and then ~one site per cycle (lighter than the old all-eager cascade); the next site is preloaded one step ahead (2.5s after `load`, and only by the stage that is actually displayed, see Gotcha 14) so a swap never lands on a blank, and both devices share one index so they never desync. The whole cluster is a mouse-only link to `/work` (`aria-hidden` + `tabindex="-1"`, out of the tab order and AT tree; the real navigation is the "See the work" CTA beside it and the Selected Work section below). All motion is gated to `prefers-reduced-motion: no-preference` (with reduced motion, and with no JS, it is a still two-device shot of the first site); the cycle and scroll pause on hover (fine pointers) and while the tab is hidden. To curate the scene, tick `in_hero` and set `hero_order` on case studies in the admin (both captures must be set); the bundled `bundledSites` array is only the safety net.
- `ClientMarquee.astro` — the client-name ticker that rides a thin strip at the base of the Hero. Collection-driven: reads the case-studies collection for distinct client names (newest-first, de-duped), renders them as an edge-faded, auto-scrolling, hover-to-pause marquee, theme-aware for the hero floor (muted dark names on the light hero, muted white on the navy one, sky dot separators), plus an `sr-only` list of the same names for assistive tech. Decorative (`aria-hidden`). Moved here when the standalone proof band was retired and its differentiator line folded into the hero copy. The two-copy CSS loop is only gap-free while one copy is at least as wide as the viewport, so a small progressive-enhancement script (in the component) tops the track up with `aria-hidden` copies until the repeating half exceeds the viewport, seamless at any width and any number of clients, and pins a constant scroll speed; without JS the two-copy base still loops on the common case (viewport &lt;= one copy).
- `SiteShowcase.astro` — animated "live site" frame embedded inside case study MDX. Renders a browser-chrome window whose full-page screenshot auto-scrolls (or slow-zooms with `variant="zoom"`), pausing on hover, and links to the live site. Reduced-motion safe (the scroll freezes to a static frame). Import it plus the screenshot at the top of a case study `.mdx` and place `<SiteShowcase src={shot} alt="..." href="..." label="..." />`. Full-page screenshots live in `src/assets/case-studies/shots/{slug}-home.png` (captured with Playwright at 1440px wide). Covers in `src/assets/case-studies/{slug}.png` are real hero screenshots of the same sites.
- `BeforeAfter.astro` — draggable before/after image comparison slider for redesign case studies. Keyboard-operable (native range input). Used on the Second Presbyterian case study (the old Squarespace site vs the rebuild). Needs a real "before" screenshot saved when the project started, or captured before a DNS switchover while the old site is still live (the Wayback Machine is not reliable; archived Squarespace / WordPress pages render broken). Drop it at `src/assets/case-studies/shots/{slug}-before.png` (same aspect as the "after", e.g. 1440x1080) and follow the usage block in the component header. The "After" label uses `text-accent-foreground` so it clears contrast in dark mode.
- `FeatureHighlight.astro` — an annotated "feature spotlight" row for case studies: a framed, click-to-zoom screenshot of a real shipped feature beside a short title + caption, with an alternating `side` prop so a run of them reads as a guided tour instead of a bare bullet list. The screenshot is a `[data-zoom]` trigger for the Lightbox. Honesty rule baked into the header: only ever screenshot a feature that is actually live (a captioned shot of a feature that does not exist is a fabrication and a client-facing liability). Used on eight of the nine case studies, two real feature shots each, captured from the live site at 1440x900 and stored at `src/assets/case-studies/shots/{slug}-feature-{name}.png`. Second Presbyterian is the three-highlight exemplar (guest front door, sermon archive, four-track Get Involved). Reid Design is the only study without highlights: its richer features are built but currently switched off, so there is nothing live to screenshot honestly. Pair it with one `<Lightbox />` on the page.
- `Lightbox.astro` — click-to-zoom for any `[data-zoom]` trigger; render it once per page (every case study carrying FeatureHighlights renders it once at the end). On click it clones the trigger's `<img>` into a native `<dialog>` at full size (`sizes="95vw"` pulls the largest srcset entry, so the zoom is crisp); `showModal()` gives the focus trap, Escape-to-close, the `::backdrop`, and focus return to the trigger for free. Built with DOM methods (no `innerHTML`), reduced-motion safe.
- `WorkFilter.tsx` — sector + year chip filters on /work index. Filters server-rendered cards by toggling a `data-hidden` attribute (no card re-render).
- `ComingSoon.astro` — the standalone "launching soon" view. Used by `/coming-soon/` directly and by BaseLayout's site-wide gate when `PUBLIC_COMING_SOON=true`.
- `StructuredData.astro` — emits JSON-LD. BaseLayout always renders the Organization / LocalBusiness schema; pages pass page-specific schemas via the `schemas` prop (Person on About, Article + CreativeWork on case studies, Service + FAQPage on /services).
- `SectionHeading.astro` — reusable section header (optional number, title, optional sub paragraph). `num` is optional on purpose; pass it only when the section is genuinely a numbered sequence. The homepage sections stopped using it; `/services` and any future inner page that wants a clean numbered or unnumbered title still can. **Always pass `headingId`** when the parent `<section>` carries `aria-labelledby`; without it, the reference points at nothing.
- `Photo.tsx` — generic `<img>` wrapper with fade-in. Used by `PhotoGallery` on the photography page (and available for any future image-on-content-page use).
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

---

## Accessibility

Target: WCAG 2.1 AA in both light and dark modes. Every page currently sits at 100 Lighthouse Accessibility; preserve that bar. Verified with axe-core (WCAG 2.0 A + AA, 2.1 AA) across every page in both themes: zero violations. The `.github/workflows/lighthouse.yml` gate keeps accessibility at 100 on every build.

### Conformance target is AA, deliberately (not AAA)

AA is the standard for this site, by choice, in line with W3C's own guidance that AAA is not recommended as a blanket requirement for whole sites. AAA is not targeted because a few of its criteria pull against a brand-led design, and the gap is small and intentional, not an oversight:

- **1.4.6 Enhanced contrast (7:1):** the accent-toned tokens clear AA but sit just under 7:1 by design, to keep the NCS-blue identity vivid: `--link` `#2A6FB0` on white (5.25:1), `--muted-foreground` `#5F6573` on white (5.84:1), white-on-`--accent` buttons (~4.7:1), footer sky-on-navy (~6.5:1). Body text and headings already exceed 7:1. Pushing these to 7:1 would mean darkening the brand blues; that trade was declined.
- **2.5.5 Target Size (44px):** on phones the interactive controls (hamburger, mobile-nav close + social + theme toggle, back-to-top, copy-email button, before/after handle, carousel arrows + dots, footer links) are sized to the 44px comfort target, so the AAA bar is effectively met on mobile. A few standalone text links (the wordmark, the hero "See the work" link, the footer email link, the decorative client marquee) still size to their text height (24-34px); they clear the AA 24px rule (2.5.8) and the inline-text exception covers links inside prose. A mouse-driven desktop deliberately keeps its tuned compact density: footer link tap-height and copy-email sizing are gated on `pointer: coarse`, so every touch device (phone and tablet, including iPads) gets the 44px targets while a desktop with a mouse stays compact. Gating on input type, not screen width, is what keeps tablets covered.
- **3.1.5 Reading Level / 2.4.9 Link Purpose (link-only):** confident marketing copy and repeated "Read the case study" links don't meet the AAA bars.

If a token's contrast is ever changed, re-check it against AA (4.5:1 body, 3:1 large/UI) in both themes; AA is the line that must not regress.

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

**Motion.** `globals.css` disables animations (0.01ms, so `animationend` still fires) and transitions (`0s` duration AND delay, since 2026-09-30, starter PORTS.md card 61: a 0.01ms transition on `all` strands in WebKit; so `transitionend` does not fire under reduce) globally under `prefers-reduced-motion: reduce`, and the Lenis smooth scroll becomes a no-op. New animations inherit this; no per-component handling needed.

**Mobile and safe areas.** The viewport meta carries `viewport-fit=cover` so the navy hero and footer run edge-to-edge into the notch on modern phones. Because of that, content that touches a screen edge must add the matching `env(safe-area-inset-*)`: side insets are handled once in `.ncs-container` (so every page's content clears a landscape notch), and the sticky header, the mobile-nav panel (`.mnav-shell`), the fixed back-to-top button, and the lightbox close button each add their own top/bottom/side inset. `env()` resolves to 0 on non-notched devices, so these read as the flat base padding everywhere except the phones that need them. If you add a new `position: fixed` element at a screen edge, or remove `viewport-fit=cover`, revisit those insets. Touch targets are sized to 44px on touch devices (see Target Size above); reach for the `pointer-coarse:` variant (not a `max-*` width breakpoint) when a control should stay compact for a mouse but grow for touch, so phones and tablets are both covered. Form inputs stay at `text-base` (16px) so iOS doesn't zoom on focus.

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

The studio's contact and identity values live in the EmDash admin, under **Site settings** (collection `site_settings`, one entry with the slug `site`; schema `cms/schema/site_settings.mjs`). `src/data/site.ts` is the only way the site reads them: `const site = await getSite(Astro)` in an `.astro` file (or `getSite(context)` in an endpoint). Every component that displays an email, phone, name, studio name, location, social URL, tagline, the footer "Currently" line or the default closing-banner copy goes through it, so one edit in the admin reaches the Header wordmark, the Footer, the phone menu, the Contact sidebar, the JSON-LD, the feed title and the meta fallback within seconds of publishing (the publish purges the cached pages; the 5-minute lifetime is only the backup). `getSite()` reads once per request (memoised on `Astro.request`) and tags the page so a publish purges it.

**Fallback.** If the entry is missing, unpublished or unreadable, `getSite()` serves `cms/content/site_settings.json` (the literal values the old `site.ts` held) and logs a `[cms] ...` line; the menus fall back to `cms/content/menus.json` the same way. Production had no data loaded when this shipped (it needs `EMDASH_TOKEN`, see docs/LAUNCH-RUNBOOK.md), so until the load runs the live site renders from the fallback and looks exactly as before. Edit the JSON when a default changes; edit the admin for day-to-day changes.

Stays in code, on purpose: `SITE_DOMAIN` and `SITE_URL` (bound to the deployment and the admin passkey origin; import them when you only need the origin). Do not hardcode any contact or identity string inside `.astro` components or pages. A React island must not import `src/data/site.ts` (it would put the CMS reader in the browser bundle): pass values in as props from the Astro parent, as `Header.astro` does for `MobileNav`.

**Menus.** The header nav is the `primary` menu and the footer nav the `footer` menu (Menus in the admin). A menu item's "Title attribute" is shown as the visible descriptor under its label in the phone menu, never as an HTML `title`. The Journal auto-hide stays in code: any item whose URL starts with `/journal` is dropped while no journal entry is published (`hasJournalEntries()`, a draft does not count). Contact is not in `primary` (it is the header "Start a project" button).

Every `mailto:` link site-wide has a graceful fallback (`src/scripts/mailto-fallback.ts`, wired in BaseLayout). A `mailto:` only opens something if the device has a mail app registered for it; on a desktop without one the click is a silent dead-end. The script lets the click proceed (so visitors who do have a mail app still get their composer), then checks whether focus left the page; if nothing opened, it copies the address and shows a confirmation toast (`.ncs-toast` in globals.css). It never blocks or delays the real `mailto:`. This is why an email click "doing nothing" on a machine with no mail client is expected behavior, not a broken link.

---

## Content collections

There are no Astro content collections and no `src/content/` folder (CMS-DESIGN PR 12 deleted them); case studies, the journal and photos are EmDash collections (see the hybrid section at the top). `src/live.config.ts` is the only content config.

**Case studies are not an Astro collection any more.** They live in EmDash (collection `case_studies`); see the hybrid section at the top and `docs/EMDASH-SCHEMA.md`. To add one, use the admin at `/_emdash/admin/`. Its OG card appears at the next build (`npm run og:pages` reads the live site).

**`journal`** (the EmDash `posts` collection, Journal in the admin): short-form essays and process notes. Each page at `/journal/{slug}/` is one published entry. Required: title and Summary (max 200 characters); optional: Cover image, Body, Last updated, Tags. Save as a draft to stage an entry (never visible); publish to put it on `/journal/`. The /journal index renders newest-first. Lighter-weight than case studies: no service badges, no sidebar TOC, but still gets ReadingProgress and reading-time stamps. Details above ("Since CMS-DESIGN PR 12").

**`photos`**: the Photography page reads the `photos` collection in EmDash (Photography, Photos in the admin; fields `title`, `image`, `alt`, `category` events, portraits or environments, `year`, optional `caption`, `location`, `featured`, `sort_order`).

### Routes summary

Routes (all server-rendered per request, route-cached):

| Path               | Source                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `/`                | `src/pages/index.astro` (homepage: hero with client marquee, selected work, pricing teaser, process band) |
| `/about/`          | `src/pages/about.astro` (about + the merged "now" snapshot in its Currently section)                      |
| `/services`        | `src/pages/services.astro`                                                                                |
| `/work/`           | `src/pages/work/index.astro` (with filter chips)                                                          |
| `/work/{slug}/`    | `src/pages/work/[slug].astro` (per case study)                                                            |
| `/photography/`    | `src/pages/photography.astro`                                                                             |
| `/journal/`        | `src/pages/journal/index.astro`                                                                           |
| `/journal/{slug}/` | `src/pages/journal/[slug].astro` (per entry)                                                              |
| `/contact/`        | `src/pages/contact.astro` (Web3Forms inquiry)                                                             |
| `/colophon/`       | `src/pages/colophon.astro` (how the site is built)                                                        |
| `/privacy/`        | `src/pages/privacy.astro`                                                                                 |
| `/accessibility/`  | `src/pages/accessibility.astro` (accessibility statement)                                                 |
| `/now`             | 301 to `/about/#now` (an EmDash Redirects row)                                                            |
| `/coming-soon/`    | `src/pages/coming-soon.astro` (always live, standalone)                                                   |
| `/404`             | `src/pages/404.astro` (custom not-found)                                                                  |
| `/rss.xml`         | `src/pages/rss.xml.js` (case studies feed)                                                                |

---

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

- `src/styles/globals.css` (Tailwind 4 `@theme` blocks for brand tokens, shadcn `:root` / `.dark` semantic-token overrides, base resets, site-wide utility classes `.ncs-container` and `.card-link`, print stylesheet, `[data-hidden]` utility, and the Starwind extra semantic tokens `--outline` + status colors in `:root` / `.dark`)
- `src/styles/starwind.css` (Starwind accordion keyframes + `@theme inline` mappings for its extra tokens; imported in BaseLayout right after globals.css)
- `src/live.config.ts` (the EmDash live collection; there is no `src/content.config.ts` any more)
- `src/layouts/BaseLayout.astro` structure (anti-FOUC theme bootstrap, skip link, header/main/footer wiring, View Transitions ClientRouter, Lenis script tag, Cloudflare Analytics, font preload, OG meta, JSON-LD, coming-soon gate, BackToTop)
- `src/components/ui/` shadcn primitives (installed via shadcn CLI; the custom `brand` variant and `cta` size in `button.tsx` are the only Nathan-edits)
- `src/components/starwind/` Starwind Astro-native primitives + `starwind.config.json` (vendored as a unit with `src/styles/starwind.css`)
- `src/components/primereact/` PrimeReact escape hatch (passthrough + island + README)
- Aceternity / Magic UI component swaps in `src/components/ui/aceternity/` and `src/components/ui/`
- React islands: `Photo.tsx`, `PhotoGallery.tsx`, `MobileNav.tsx`, `ThemeToggle.tsx`, `HeroCanvas.tsx`, `TestimonialCarousel.tsx`, `BackToTop.tsx`, `ReadingProgress.tsx`, `CopyEmail.tsx`, `WorkFilter.tsx`
- Astro wrappers: `HeroShowcase.astro`, `ComingSoon.astro`, `StructuredData.astro`, `SectionHeading.astro`
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

---

## Audience

Site visitors include potential clients (small businesses, churches, schools) and other designers. Copy is confident but warm. Default explanations to non-technical readers (church volunteers, nonprofit staff, board members) unless context makes it clear the reader is a peer.

---

## Deployment

- Production: pushes to `main` trigger a Cloudflare build and deploy that serves `nixoncreativestudio.com`.
- Previews: any other branch gets its own `*-nixoncreativestudio.nathanjnixon86.workers.dev` URL.
- Build command: `npm run build`. Output directory: `dist`.
- `output: 'server'` in `astro.config.mjs`: every page renders on the Worker per request and is cached by the route cache (the Workers Cache needs `cache.enabled`, which the adapter writes into the generated `dist/server/wrangler.json` because the cache provider is set; wrangler 4.69 or newer). Do not add `export const prerender = true` to a page without reading Gotcha 15: a prerendered page would show a stale copy of anything the CMS owns.
- The adapter is configured with `imageService: { build: 'compile', runtime: 'cloudflare-binding' }`: with nothing prerendered, `<Image />` resizes at request time through the Images binding (`/_image`, cached 30 days by `src/worker.ts`). Do not remove the binding: the adapter's default runtime image service points the HTML at a `/_image?...` endpoint that needs the Cloudflare Images binding, which left every case-study cover stuck on its blur-up placeholder in production. Build-time images need no binding.

### Environment variables

Set in the Cloudflare dashboard → **Settings → Variables and Secrets** (the Build section, not the Runtime section: `PUBLIC_*` values are inlined into the bundle at build time, even though pages render per request):

- `PUBLIC_WEB3FORMS_KEY` — contact form access key from [web3forms.com](https://web3forms.com/). Without it the contact form falls back to a no-op action and shows an inline notice.
- `PUBLIC_CF_ANALYTICS_TOKEN` — Cloudflare Web Analytics token from dash.cloudflare.com → Analytics & Logs → Web Analytics. Without it the analytics beacon doesn't render.
- `PUBLIC_GA_ID` — the GA4 web data stream Measurement ID (`G-...`) for property 532519109. Without it no GA4 script renders. The property went dark in 2026-06 because the Astro rebuild shipped without the tag; restored 2026-09-04.
- `PUBLIC_COMING_SOON` — set to the literal string `true` to gate the entire site behind the coming-soon page (see below). Unset, or any other value, takes the site live.
- `PUBLIC_PREVIEW_TOKEN` — random secret string used by the gate's inline script to recognize your bypass. Required for the bypass to work; pick something long and unguessable. The token is inlined into shipped HTML at build time, so anyone viewing source can see it — soft gate, not security.

All four are documented in `.env.example`; copy to `.env` and fill in real values for local dev.

### Coming Soon mode

Site-wide WIP gate controlled by `PUBLIC_COMING_SOON`, enforced client-side via a synchronous inline script in BaseLayout's `<head>`. When the env var is `true` at build time, every page ships with both the real content and a `ComingSoon` overlay; the gate script decides which the visitor sees by toggling `html.ncs-gated` before first paint based on a `localStorage["ncs-preview"]` value or a `?preview=<TOKEN>` URL param.

`/coming-soon/` itself is always live regardless of the gate — it's a standalone page with its own minimal HTML doc that doesn't go through BaseLayout, so it can be previewed without flipping anything.

The implementation history is worth knowing about: an earlier attempt put the gate in `functions/_middleware.js` (Cloudflare Pages Function), but the project deploys via the `@astrojs/cloudflare` adapter as a Worker with the assets binding, not as a plain Pages project, so `functions/` never fired. Client-side gating works regardless of the deploy mechanism.

**To enable the gate**: set `PUBLIC_COMING_SOON=true` and `PUBLIC_PREVIEW_TOKEN=<your-secret>` in the Cloudflare dashboard → Variables and Secrets. Trigger a redeploy. About a minute later every visitor to the site (except you, see below) sees the coming-soon view.

**To bypass on a device you own**: visit any URL with `?preview=<your-secret>` appended, e.g.

```
https://nixoncreativestudio.com/?preview=<your-secret>
```

The script saves the token to `localStorage["ncs-preview"]` and reloads the page without the query param. From then on, that browser bypasses the gate on every page.

**To revoke your own bypass**: clear localStorage for the site in your browser (or run `localStorage.removeItem('ncs-preview')` in DevTools).

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
- Start with the content and end on it: no greeting filler, no closing offer to help.
- Avoid three-item lists where the third item is filler. Two items is fine if two is the truth.
- Use bold for genuine emphasis or list labels only, never random nouns mid-sentence.
- Default to prose, not headers and bullets, unless content is genuinely a list or step-by-step.
- Comment code generously so future-Nathan can follow without reverse-engineering.

For copy on the actual site: "Modern websites for small businesses, nonprofits, churches, and schools. Based in Cincinnati, working with clients anywhere." beats "Bespoke digital experiences" every time.

---

## Setup checklist

Things that still need configuration before / during the public launch. Everything below ships gracefully today — components render nothing or fall back when not configured — so the site stays clean while these wait.

### Cloudflare env vars (Settings → Variables and Secrets)

- [ ] `PUBLIC_WEB3FORMS_KEY` — contact form delivery (web3forms.com).
- [ ] `PUBLIC_CF_ANALYTICS_TOKEN` — Cloudflare Web Analytics.
- [ ] `PUBLIC_GA_ID` — GA4 Measurement ID.
- [ ] `PUBLIC_COMING_SOON` — set to `true` while the site is WIP; unset to launch.
- [ ] `PUBLIC_PREVIEW_TOKEN` — required only when the gate is on. Pick something long and random. Visit `?preview=<token>` once per browser to bypass. Token is inlined in shipped HTML, so it's a soft gate, not security.

### Site settings (EmDash admin) — fields that enable scaffolds when set

- [ ] `booking_url` — Cal.com / Calendly URL. When set, the Contact sidebar shows a "Book a call" block. Recommended: Cal.com (open source, free at this volume, the URL looks like `https://cal.com/nathannixon/30min`).
- [ ] `newsletter_url` — Buttondown publish URL (or other provider's form action). When set, the `Newsletter` component renders a subscribe form. Drop `<Newsletter />` into a page (most natural fit: near the bottom of `/about` or `/journal`; the homepage intentionally doesn't carry a newsletter block) once configured.

### Component scaffolds waiting on content

- [ ] **`ClientLogos.astro`** — populate the `logos` array once you have written permission from each client to display their logo. Drop the SVGs in `src/assets/clients/`. Render `<ClientLogos />` on Home or About when ready.
- [ ] **`PressMentions.astro`** — populate the `press` array when media / podcast / award coverage happens. Render on About when there's at least one entry.

### Real content to ship

- [ ] **Optional hero photograph** at `src/assets/brand/hero.jpg`. No longer a content gate: the hero ships complete today with the domain-warp WebGL flow plus the device-pairing portfolio showcase. To use a real photo instead, drop it at that path and uncomment the `<Image />` import + tag in `Hero.astro`; it layers over the WebGL / `.band-themed` glow (there is no `.hero-placeholder` div anymore). Pick something that telegraphs Cincinnati and audience: a church sanctuary at golden hour, a nonprofit at work, a Cincinnati storefront.
- [ ] **Real attributed testimonials** filled into a case study's `testimonial:` frontmatter. That renders a pull-quote on the case study page and populates the /about carousel (`Testimonials.astro` + `TestimonialCarousel.tsx`), which shows nothing until at least one real quote exists. The homepage carries no standalone testimonials band; quotes live where the context lives. Never fabricate one.
- [ ] Drop a **real headshot** in `src/assets/brand/` for the `/about` page and swap the gradient placeholder div in `about.astro` for an Astro `<Image />`.
- [x] **Real cover images** for the case studies in `src/assets/case-studies/{slug}.png`. Done: the covers live in EmDash media now (the repo copies were deleted in PR 12 except `second-presbyterian-chicago.png`, which `/services` imports). The full-page captures `src/assets/case-studies/shots/{slug}-home.png` and `{slug}-mobile.png` stay because `HeroShowcase` imports ten of them (PR 13 moves the hero scene). Re-capture if a client redesigns their site.
- [ ] **Before/after sliders** on the remaining redesign case studies via `BeforeAfter.astro`. Done on Second Presbyterian (old Squarespace vs the rebuild). Each other one needs a real "before" screenshot saved when the project started (not the Wayback Machine, whose archives of these sites render broken). Upload it as the case study's before image in the admin (the repo copies of the old before shots were deleted in PR 12; git history has them).
- [ ] Additional **case studies**: add them in the EmDash admin (`/_emdash/admin/`); there is no folder to drop files in.
- [ ] First **journal entry**: write it under Journal in the EmDash admin (the page renders an empty-state until one is published; the schema must be applied in production first, docs/LAUNCH-RUNBOOK.md "PR 12").

### Recurring upkeep

- [ ] Refresh the four arrays + `lastUpdated` in the Currently section of `src/pages/about.astro` about once a quarter.
- [ ] Refresh the footer "Currently" line (Site settings in the EmDash admin) seasonally.
- [ ] Re-run `npm run og` after editing brand colors, tagline, or wordmark.
- [ ] Re-run `npm run icons` after editing brand navy, the accent amber, or the wordmark font (regenerates the favicon / app-icon set).

### Brand drift to be aware of

The brand `--accent` value shifted from `#3B82C4` to `#3478BD` in this codebase to clear WCAG AA contrast on light surfaces with white text. If you have brand assets elsewhere (Instagram, Canva, signage, photography watermarks) on the original `#3B82C4`, those will drift a hair from the site. Same for muted text (`#6B7280` → `#5F6573`).

---

## Gotchas

Things that cost real time, with the reason attached. Add to the list when
something bites; a gotcha written a week later is a gotcha written from memory.
Every entry below was measured, not assumed.

1. **`npm run lint` is green and gated (since 2026-09-06), so a red run is
   your change.** The 7 false-positive errors that used to sit on a clean tree
   (an `eslint-plugin-astro` misread of `<!-- -->` inside a `{ ... }`
   expression) are gone because those comments became `{/* */}`. Writing an
   HTML comment inside a template expression brings the error back, and it
   breaks `npm run format:check` too. The only expected output is a handful
   of unused-variable warnings.

2. **`variant="secondary"` on the shadcn Button or Badge fails contrast.** In
   light mode that renders `--secondary-foreground` (white) on `--secondary`
   (sky blue `#40AAED`): **2.56:1**, well under the 4.5:1 the rest of this site
   holds. It is not a live defect only because the variant is unused across the
   entire codebase. The day you reach for it, either fix the token pair or use
   a different variant, and add the pair to `src/lib/theme-tokens.test.ts`.
   Dark mode is fine (navy on lighter sky, 9.8:1).

3. **The `--link` comment in `globals.css` overclaims.** It says AA on
   `#FFFFFF`, `#F4F7FA` **and** `#0A1628`. The first two are true (5.25:1 and
   4.88:1); navy is **3.45:1** and fails body text. Harmless today because the
   pair is never rendered (the navy Footer is a dark-mode state, where the link
   colour switches to `--secondary`), but do not trust the comment as a licence
   to put `text-link` on a navy surface. Logged in `docs/PENDING.md`.

4. **The live site does two redirect hops, so uptime checks need `-L`.**
   `nixoncreativestudio.com` 301s to `www.`, and `www.…/about` 307s to
   `/about/`. A curl check copied from a sibling repo that asserts a literal
   `200` without following redirects fails **every** route and reads like an
   outage. `.github/workflows/uptime.yml` uses `curl -sSL` and trailing slashes
   for this reason.

5. **The parity harness needs no site-specific normalizer rules here, and that
   was measured.** Despite the three.js / r3f content and the pre-build asset
   generation (`placeholders`, `og:pages`), three builds (a warm rebuild and a
   fully cold one with `dist`, `.astro` and `node_modules/.astro` deleted) all
   produced 23/23 PASS. The r3f content ships as an `<astro-island>` and
   hydrates in the browser, so no canvas output ever reaches the compared HTML.
   Do not add a speculative normalizer rule: a rule that strips more than the
   varying value is a hole in the gate, not a fix.

6. **`npm run build` now kills stale dev servers first.** The `prebuild` hook
   runs `scripts/free-dist.mjs`, which stops any `node.exe` / `workerd.exe`
   whose command line mentions **both** this project directory **and** a dev
   server (wrangler / miniflare / http-server / astro preview). It exists
   because a running `wrangler dev` holds a handle on `dist/` and the next
   build dies with `EPERM, Permission denied: \\?\...\dist\client`, which reads
   like a permissions problem and is not. Windows only; it no-ops on CI.

7. **`dist/server/wrangler.json` carries `legacy_env: true`.** The adapter
   writes it on every build, and wrangler 4.126+ rejects that field outright.
   Latent rather than live, because `npm run deploy` runs a plain
   `wrangler deploy` against the **root** `wrangler.jsonc`, which has no such
   field. It becomes a real failure if anything ever points wrangler at the
   generated config while `wrangler` (declared `^4.94.0`) has resolved past
   4.126. See `docs/PENDING.md`.

8. **Unit tests import `.ts` with the extension.** They run under Node's native
   type stripping (`node --experimental-strip-types --test`), so
   `import { contrastRatio } from './contrast.ts'` is correct and
   `from './contrast'` will not resolve. Same reasoning as the
   `with { type: 'json' }` note above: the test runner is Node, not Vite.

9. **`npx lhci autorun` does not complete on this Windows machine.** It reaches
   "Healthcheck passed", collects the Accessibility artifact, and then dies
   during Chrome-profile cleanup:
   `Runtime error encountered: EPERM, Permission denied:
\\?\C:\Users\...\AppData\Local\Temp\lighthouse.NNNNNNNN`, preceded by a
   `taskkill ... process not found` from the Chrome launcher. Reproduced twice
   on 2026-08-27, including after clearing every stale `lighthouse.*` temp
   directory, so it is not a leftover-handle problem. It fails at **collect**
   time, before a single assertion is evaluated, which means a local red here
   says nothing about the accessibility gate. `lighthouse.yml` runs on
   `ubuntu-latest` and is unaffected. Read the CI run, not the local one.

10. **An entrance animation that starts at `opacity: 0` destroys Largest
    Contentful Paint.** Chrome does not count a zero-opacity element as a
    contentful paint, so whatever is on the first screen simply does not exist
    for LCP until the fade has run. Two shapes of this cost a red Lighthouse
    gate on 2026-09-06: the JS-gated `[data-reveal]` state pushed `/contact` to
    LCP 5.8s (the h1 painted 1.65s after first paint) and `/404` to a similar
    miss, and `/coming-soon`, whose whole entrance was a CSS fade, produced no
    LCP value at all ("audit did not produce a value"), which also voids the
    whole performance category. The rule is: nothing in the first viewport may
    start at opacity 0. Below-the-fold reveals are fine, a translate-only lift
    is fine, and `globals.css` now exempts the first block of `<main>` from the
    reveal gate. Do not "fix" this by animating from `opacity: 0.01`; that
    fakes the metric without the visitor seeing anything sooner.

11. **WebKit drops `box-shadow` on natively rendered form controls, so a
    Tailwind `focus:ring-*` is invisible on a `<select>` in Safari and on iOS.**
    The four selects on `/contact` had no focus ring at all there while every
    text field on the same classes did; the select does enter `:focus` (this is
    not a harness artifact, confirmed by screenshot in a real WebKit), the
    engine just never paints the shadow. `outline` paints on native controls in
    every engine and follows the border radius, so selects carry their ring as
    an outline. The webkit-iphone project of `tests/a11y-dark.spec.ts` is what
    caught it; if a sibling repo "fixed" the same failure by skipping the check
    on webkit, that repo probably still ships the bug.

12. **`dist/client` is not the site, it is only the assets.** Since the EmDash
    migration pages are rendered from D1 + R2 by the Worker (hybrid until
    CMS-DESIGN PR 2, now every page: nothing is prerendered). Anything that assumed a static tree is wrong for them:
    `http-server dist/client` (404s on `/`), a linkinator crawl of `dist/client`
    (reports the server pages as broken), lhci `staticDistDir`, and the parity
    harness's default mode. Playwright, the link check and Lighthouse therefore
    all take a URL (`PLAYWRIGHT_BASE_URL`, `LINKCHECK_URL`, `LHCI_BASE_URL`);
    CI supplies a Worker version preview and Nathan supplies the ncs-ci URL by
    hand. A local `wrangler dev` cannot stand in: it starts with an empty local
    D1/R2, so every server page renders with no content (`--remote` would read
    the live bindings, which a test run should not). If a tool "finds nothing"
    or 404s on `/`, check which tree it is reading before debugging the page.

13. **The OG generator reads public pages, not the EmDash REST API.**
    `GET /_emdash/api/content/case_studies` answers 401 to an anonymous caller,
    so `scripts/generate-og.mjs` takes slugs and titles from `/rss.xml` and the
    cover from the first `<img>` on `/work/<slug>/`. If those pages change shape
    (the cover stops being the first image on the page, a title leaves the feed),
    the script warns and keeps the committed cards rather than failing, so the
    symptom is stale cards, not a red build. Check the `[og]` lines in the build
    log after touching `/work/[slug]` or the RSS route.

14. **Lighthouse counts every request that starts before the observed LCP, so
    below-the-fold image downloads inflate the homepage LCP.** Measured
    2026-10-03 on the ncs-ci Worker (Lighthouse CLI mobile, simulated
    throttling, same method before and after): median LCP 6297ms with the six
    Selected Work screenshots loading, 3586ms with just those requests blocked
    (`--blocked-url-patterns=*emdash*`). The LCP element was the hero phone image
    (115 KB, 891ms on the wire); the rest was the lazy-image pile-up. A native
    `loading="lazy"` image is NOT held back inside Chrome's lazy-load distance
    (1250px or more), and a phone's first screen plus the hero reaches that. So
    `ScrollShot` has a `defer` prop (used by `SelectedWork`): placeholder `src`,
    real URL in `data-defer-*`, promoted on scroll-into-view (no rootMargin) or
    3.5s after `load`, with a `<noscript>` real image. `HeroShowcase` follows the
    same logic: its next-site preload waits 2.5s after `load` (was 0.8s), and
    only the stage that is actually displayed (a `matchMedia` on the same lg
    breakpoint Hero.astro hides it with) downloads or cycles, because the hidden
    desktop cluster used to fetch its own captures on phones. When the homepage
    LCP regresses with no code change, look at what starts before the LCP in the
    trace before blaming the LCP element. Local Lighthouse on this Windows
    machine reads higher than CI in absolute terms (GPU start-up delays first
    paint by about a second), so compare before and after on the same machine,
    never against the CI number.

15. **The route cache is a second layer in front of the Worker, and it stores
    whatever a response asks for.** Added 2026-10-03 (CMS-DESIGN PR 2). The
    Cloudflare adapter's cache provider turns on Workers Cache
    (`cache.enabled` in the generated wrangler config); it works on workers.dev
    previews too, so `Cf-Cache-Status: MISS` then `HIT` on two GETs proves it.
    The cache is partitioned by Worker version, so every deploy starts cold, and
    the first visitor to a URL pays a render (about 1 to 1.6s on ncs-ci: cold
    isolate plus D1 reads) instead of the 90ms a static file took. Warm TTFB is
    about 80ms, below the static numbers. Traps, each one measured or read from
    source rather than assumed:
    - **No global `routeRules`.** The design sketch had `'/[...path]'`; it also
      matches `/_emdash/**`, and the adapter only stamps `no-store` on a response
      that has no cache lifetime, so admin and API responses would become
      cacheable. Pages opt in through `cachePublicPage()` in BaseLayout instead.
    - **A page is purged only by the tags it carries.** A new CMS reader that does
      not call `cache.set(cacheHint)` leaves its page uncached-by-tag: it expires
      on the lifetime (5 minutes), not on publish. `getCaseStudies(Astro.cache)`
      is the pattern. EmDash's publish route calls `cache.invalidate({ tags:
[collection, id] })`.
    - **Never cache a non-200.** The cache stores a 404 as happily as a 200, so a
      slug published after someone requested it would keep returning 404. Unknown
      slugs call `Astro.cache.set(false)`, and `src/worker.ts` forces
      `Cloudflare-CDN-Cache-Control: no-store` on anything that is not a clean 200
      or that sets a cookie. `?_edit` and `?_preview` URLs are never cached.
    - **`public/_headers` no longer reaches HTML.** It only applies to files the
      assets binding serves, and no HTML is a file now, so `src/worker.ts` adds
      the same five security headers to every HTML response outside `/_emdash`.
      Keep the two lists in step.
    - **Trailing slashes.** The static asset handler used to redirect `/about` to
      `/about/`; `src/worker.ts` does it now (301, skipping `/_*` and
      extension paths). `trailingSlash: 'always'` in astro.config was rejected
      because it would also redirect EmDash's `/_emdash/api/*` routes.
    - **`/404/` answers 200, an unknown URL answers 404**, both from the same
      page, because Lighthouse refuses 4xx pages and the gate audits that template.
    - **Purge on publish is proven on the live zone** (Nathan confirmed on 2026-10-03: an
      admin edit shows on the live site within seconds). The 5-minute lifetime is only the
      fallback for a missed purge; the editing guide says "within seconds, five minutes at
      worst". Raising `PAGE_MAX_AGE` to a day is now a free choice (docs/PENDING.md).

16. **EmDash does not enforce a limit on a repeater sub-field.** Verified in
    `node_modules/emdash/src/api/schemas/schema.ts` (1.1.0): a sub-field keeps
    only `slug`, `type`, `label`, `required` and `options`, so a `maxLength` on
    one is stripped silently. The per-row limits in docs/CMS-DESIGN.md (FAQ
    answers, process-step bodies) are labels and editing-guide text, not server
    rules; the component must tolerate a longer value. Repeater-level
    `minItems` / `maxItems` are enforced. `validateDef()` warns about each
    sub-field limit. Related: `titleField` and `commentsEnabled` cannot be sent
    when a collection is created, which is why `applyCollectionSchema` applies
    the settings in a second PUT after the fields.

17. **What the first real production load taught (2026-10-03, PRs 68 to 70).**
    Keep these in mind for any new field or any value you add to `cms/content`.
    (a) **Booleans are stored as 0/1**, so a stored `false` reads back `0`; the
    loader folds booleans before comparing and `src/lib/cms.ts` normalises them,
    and a new reader must do the same (`Boolean(d.in_hero)`, never `=== true`).
    (b) **Images come back without `src`** and with extra `meta` (blurhash,
    dominant colour), so the loader compares a stored image by its media `id`
    and `alt` only. (c) **A datetime field needs a full ISO timestamp**
    (`2026-10-03T00:00:00.000Z`); a bare `2026-10-03` is rejected with "Invalid
    input", so write ISO strings in `cms/content/*.json`. (d) **An existing
    optional field cannot be made required** (nor given a `maxLength`): the
    schema PUT fails with `FIELD_UPDATE_REQUIRES_MIGRATION`. Every field you add
    to a collection that already has entries must be optional and the page must
    enforce the rule itself (the Journal's required summary is enforced by
    `/journal/` leaving the entry out). `in_hero` and `hero_order` follow this.
    (e) **`supports` comes back without `"seo"`**: EmDash keeps the SEO panel as
    the `hasSeo` flag, so `cms/schema/case_studies.mjs` omits it from `supports`
    (listing it made the applier's comparison never read "unchanged") and the CI
    seed adds it back (`seedCollection`).
18. **Redirects are EmDash rows, edited in the admin.** The two retired URLs
    (`/now`, `/work/west-chester-preschool`) are rows in production EmDash
    (loaded 2026-10-03; `cms/content/redirects.json` is the committed record the
    loader and the CI seed use). Add, change or delete one in the admin under
    Redirects. EmDash's middleware applies them before a page renders (it matches
    with or without a trailing slash, and a destination with a `#fragment` is
    accepted). `astro.config.mjs` has NO `redirects` and `src/worker.ts` has no
    redirect code: a config redirect would shadow the row, and the temporary code
    fallback was deleted so a row removed in the admin really stops working.
19. **A prefetch is only worth anything if the browser may reuse it, and every
    internal link must already carry its trailing slash.** Measured 2026-10-03 on
    the live site with a real foreground browser: Astro's viewport prefetch fired
    for every link, then the click fetched the page AGAIN (80 to 400ms per
    navigation, against about 5ms when pages were static files). Two causes.
    (a) The route cache sends the browser `Cache-Control: no-cache` and no ETag,
    so the prefetched copy can never be reused. `finalize()` in `src/worker.ts`
    now gives a clean cached 200 HTML page `public, max-age=120,
stale-while-revalidate=3600` for the browser only (the edge lifetime is
    untouched; the editor view, previews, cookies and `/_emdash` never qualify).
    A publish therefore reaches a returning browser within about 2 minutes, not
    instantly. (b) Menu and button links without a slash (`/about`) were
    prefetched, then 301-redirected by the Worker, then fetched again. Menu items
    go through `withTrailingSlash()` in `src/lib/cms.ts`; hardcoded links need the
    slash by hand. Also measured: after the 5-minute edge lifetime a page is still
    served instantly (`CF-Cache-Status: UPDATING`, 85ms) while it refreshes, so
    visitors only wait for a render on the first request per Cloudflare location
    after a deploy (about 0.4 to 1.3s, 22 D1 reads). A test of "cold" needs a
    cache-busting query string, not a repeat request.
20. **Cold renders are D1 round-trips, so the Worker is placed next to the
    database (Smart Placement, 2026-10-03).** A page render makes 11 to 26
    sequential D1 reads; with the Worker at the visitor's edge and D1 in ENAM
    each one paid the distance. `"placement": { "mode": "smart" }` in
    `wrangler.jsonc` (production and the `ci` environment) runs it near D1.
    Measured on ncs-ci with cache-busted GETs (18 requests per run, 3 to 4 runs per setting; script idea:
    `?cold=<random>` so the route cache cannot answer): average cold render
    about 815ms without placement, about 570ms with it (about 30% faster; run-to-run noise is about 100ms, so never trust one pair of runs). Cache hits never run the Worker,
    so they are unchanged. Check the `Cf-Placement` response header (`remote-DFW`
    when active); it needs some traffic after a deploy before it takes effect.
    Ruled out in the same pass: bundle size (19 MB, 4.9 MB gzip, but Worker
    startup is 21 ms, shown in the CI "Worker Startup Time" line), and the cache
    lifetime (stale pages are served instantly while they refresh). Also tried and
    dropped: starting the layout, header, footer and homepage reads together with
    `Promise.all` (3 runs: about 572ms against about 570ms, no gain, so the
    sequencing is inside EmDash, not in our components). The zone already has
    Tiered Cache, Smart Tiered Cache, HTTP/3, Early Hints, Brotli and 0-RTT on.
21. **Any admin write purges pages, and the next view of each purged page is a
    cold render (about 0.4 to 1.4s instead of about 35ms).** Found 2026-10-03:
    a Lighthouse trace on the live homepage showed LCP 960ms with 853ms of it
    waiting for the first byte, and a poll of `/`, `/about/` and `/work/` every
    15s showed all three flip from HIT to MISS at the same instant, twice. The
    Worker log (`observability` query grouped by `$metadata.trigger`) showed a
    content loader writing `POST /_emdash/api/menus/{primary,footer}/items` at
    that moment. Every page carries the menu tag, so one menu write clears the
    whole site; a case study edit clears `/`, `/work/` and its own page. Purges
    remove the entry, so stale-while-revalidate does not cover them. Practical
    rules: do not run `cms:load` or `cms:production-load` (or edit menus, site
    settings or case studies) right before showing the site to someone, and
    expect the first visitor to each page after a deploy or edit to pay the cold
    render. A "pages are slow" check must first confirm `CF-Cache-Status: HIT`
    on the page (poll it a few times, no cache-busting) before blaming code.
22. **`.github/workflows/warm-cache.yml` re-warms the pages every 5 minutes.**
    It reads the page list from the live `/sitemap-0.xml` plus the case studies
    in `/rss.xml` and GETs each, printing status, `CF-Cache-Status` and time per
    page (open a run to see which pages were cold). It exists for Gotcha 21: a
    deploy or an admin write leaves pages cold, and this brings them back within
    minutes. It warms the Cloudflare location nearest GitHub's servers and the
    shared upper tier, not every location, and GitHub's scheduler can run late,
    so treat it as a mitigation, not a guarantee. It never fails the run
    (`uptime.yml` is the alarm). A new public page needs nothing: the sitemap
    and feed pick it up. Measured when first run: colophon, privacy and
    photography were cold (about 1s each) and all 15 pages were hits after one
    pass.

23. **The `www` to apex redirect rule must leave `/_emdash/` AND `/_astro/`
    alone, or the admin breaks.** The zone Redirect Rule (Cloudflare dashboard,
    Rules, not in the repo) sends `www` to the apex with a 301 except for paths
    under `/_emdash/`, because the admin passkey is bound to `www`. The admin
    page itself is on `www`, but a plugin's admin script is an Astro island served
    from `/_astro/`, and a browser will not follow a cross-origin redirect for a
    module script. With only `/_emdash/` exempt the admin sat on "Loading
    EmDash..." with `Failed to fetch dynamically imported module .../PluginRegistry.*.js`
    in the console (2026-10-03, the day the studio-help plugin shipped). Fixed
    through the API (expression below); both prefixes are now exempt. If the rule
    is ever recreated or edited, keep both. Check: `curl -s -o /dev/null -w "%{http_code}"
https://www.nixoncreativestudio.com/_astro/<any chunk>.js` must be 200, while
    `https://www.nixoncreativestudio.com/about/` must still 301 to the apex.
    `(http.host eq "www.nixoncreativestudio.com" and not starts_with(http.request.uri.path, "/_emdash/") and not starts_with(http.request.uri.path, "/_astro/"))`
