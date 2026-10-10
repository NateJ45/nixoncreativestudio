# Setup checklist

Moved out of CLAUDE.md. Read when asked what is unconfigured or what content is outstanding.

Things that still need configuration before / during the public launch. Everything below ships gracefully today (components render nothing or fall back when not configured), so the site stays clean while these wait.

## Cloudflare env vars (Settings → Variables and Secrets)

- [ ] `PUBLIC_WEB3FORMS_KEY`: contact form delivery (web3forms.com).
- [ ] `PUBLIC_CF_ANALYTICS_TOKEN`: Cloudflare Web Analytics.
- [ ] `PUBLIC_GA_ID`: GA4 Measurement ID.
- [ ] `PUBLIC_COMING_SOON`: set to `true` while the site is WIP; unset to launch.
- [ ] `PUBLIC_PREVIEW_TOKEN`: required only when the gate is on. Pick something long and random. Visit `?preview=<token>` once per browser to bypass. Token is inlined in shipped HTML, so it's a soft gate, not security.

## `src/data/site.ts`: fields that enable scaffolds when set

- [ ] `bookingUrl`: Cal.com / Calendly URL. When set, the Contact sidebar shows a "Book a call" block. Recommended: Cal.com (open source, free at this volume, the URL looks like `https://cal.com/nathannixon/30min`).
- [ ] `newsletterUrl`: Buttondown publish URL (or other provider's form action). When set, the `Newsletter` component renders a subscribe form. Drop `<Newsletter />` into a page (most natural fit: near the bottom of `/about` or `/journal`; the homepage intentionally doesn't carry a newsletter block) once configured.

## Component scaffolds waiting on content

- [ ] **`ClientLogos.astro`**: populate the `logos` array once you have written permission from each client to display their logo. Drop the SVGs in `src/assets/clients/`. Render `<ClientLogos />` on Home or About when ready.
- [ ] **`PressMentions.astro`**: populate the `press` array when media / podcast / award coverage happens. Render on About when there's at least one entry.

## Real content to ship

- [ ] **Optional hero photograph** at `src/assets/brand/hero.jpg`. No longer a content gate: the hero ships complete today with the domain-warp WebGL flow plus the device-pairing portfolio showcase. To use a real photo instead, drop it at that path and uncomment the `<Image />` import + tag in `Hero.astro`; it layers over the WebGL / `.band-themed` glow (there is no `.hero-placeholder` div anymore). Pick something that telegraphs Cincinnati and audience: a church sanctuary at golden hour, a nonprofit at work, a Cincinnati storefront.
- [ ] **Real attributed testimonials** filled into a case study's `testimonial:` frontmatter. That renders a pull-quote on the case study page and populates the /about carousel (`Testimonials.astro` + `TestimonialCarousel.tsx`), which shows nothing until at least one real quote exists. The homepage carries no standalone testimonials band; quotes live where the context lives. Never fabricate one.
- [ ] Drop a **real headshot** in `src/assets/brand/` for the `/about` page and swap the gradient placeholder div in `about.astro` for an Astro `<Image />`.
- [x] **Real cover images** for the case studies in `src/assets/case-studies/{slug}.png`. Done: each is a real hero screenshot of the live site (captured with Playwright). Full-page screenshots also live in `src/assets/case-studies/shots/{slug}-home.png` and drive the animated `SiteShowcase` inside each study. Re-capture if a client redesigns their site.
- [ ] **Before/after sliders** on the remaining redesign case studies via `BeforeAfter.astro`. Done on Second Presbyterian (old Squarespace vs the rebuild). Each other one needs a real "before" screenshot saved when the project started (not the Wayback Machine, whose archives of these sites render broken). Drop it at `src/assets/case-studies/shots/{slug}-before.png` and follow the usage block in the component.
- [ ] Additional **case studies** in `src/content/case-studies/`. For each, drop a matching cover at `src/assets/case-studies/{slug}.{ext}` so plaiceholder picks it up.
- [ ] First **journal entry** in `src/content/journal/` (the page renders an empty-state until then).

## Recurring upkeep

- [ ] Refresh the four arrays + `lastUpdated` in the Currently section of `src/pages/about.astro` about once a quarter.
- [ ] Refresh the "Currently" blurb in `Footer.astro` seasonally.
- [ ] Re-run `npm run og` after editing brand colors, tagline, or wordmark.
- [ ] Re-run `npm run icons` after editing brand navy, the accent amber, or the wordmark font (regenerates the favicon / app-icon set).
- [ ] Plaiceholder regen happens automatically on `npm run build`. During local dev, re-run `npm run placeholders` after adding a new case study cover so the dev server sees it.

## Brand drift to be aware of

The brand `--accent` value shifted from `#3B82C4` to `#3478BD` in this codebase to clear WCAG AA contrast on light surfaces with white text. If you have brand assets elsewhere (Instagram, Canva, signage, photography watermarks) on the original `#3B82C4`, those will drift a hair from the site. Same for muted text (`#6B7280` → `#5F6573`).
