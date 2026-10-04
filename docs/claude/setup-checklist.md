# Setup checklist

Moved out of CLAUDE.md. Read when asked what is still unconfigured, what content is outstanding, or what recurring upkeep exists.

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

- [ ] **Optional hero photograph** at `src/assets/brand/hero.jpg`. No longer a content gate: the hero ships complete today on the window-light ground with the device-pairing portfolio showcase (and is due to be rebuilt as the carousel hero). To use a real photo instead, drop it at that path and uncomment the `<Image />` import + tag in `Hero.astro`; it layers over the ground (there is no `.hero-placeholder` div anymore). Pick something that telegraphs Cincinnati and audience: a church sanctuary at golden hour, a nonprofit at work, a Cincinnati storefront.
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
