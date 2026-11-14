# Setup checklist

Read when asked what is unconfigured or what content is outstanding.

Things that still need configuration before or during the public launch. Everything below ships gracefully today (components render nothing or fall back when not configured), so the site stays clean while these wait.

## Contact form

- [ ] `TURNSTILE_SECRET` Worker secret (`npx wrangler secret put TURNSTILE_SECRET`): the secret key of the Turnstile widget "NCS studio contact form" (dashboard > Turnstile). Set it only AFTER a deploy that carries the widget, or every send fails the check. The site key is `site.turnstileSiteKey` in `src/data/site.ts`.
- [ ] `WEB3FORMS_KEY` Worker secret (`npx wrangler secret put WEB3FORMS_KEY`): the fallback if Cloudflare Email Sending fails. Without it a failed send is still stored in D1, just not emailed. Detail: `deployment.md` "Contact form".

## Cloudflare env vars (Settings → Variables and Secrets)

- [ ] `PUBLIC_CF_ANALYTICS_TOKEN`: Cloudflare Web Analytics.
- [ ] `PUBLIC_GA_ID`: GA4 Measurement ID.
- [ ] `PUBLIC_COMING_SOON`: set to `true` while the site is WIP; unset to launch.
- [ ] `PUBLIC_PREVIEW_TOKEN`: required only when the gate is on. Pick something long and random. Visit `?preview=<token>` once per browser to bypass. Token is inlined in shipped HTML, so it's a soft gate, not security.

## `src/data/site.ts`: fields that enable scaffolds when set

- [ ] `bookingUrl`: Cal.com / Calendly URL. When set, the "Book a call" calls to action appear. Recommended: Cal.com (open source, free at this volume, the URL looks like `https://cal.com/nathannixon/30min`).
- [ ] `newsletterUrl`: Buttondown publish URL (or other provider's form action). There is no newsletter component on the redesigned site, so setting it does nothing until one is built.

## Real content to ship

- [ ] **Real attributed testimonials** for Presbyterian Academy, MAS Monograms and Reid Design (`docs/PENDING.md` item 2b). Six real quotes from five clients are live in their studies' `testimonials:` frontmatter; quotes appear in quote bands (home, About) and each study's "In their words" chapter. Never fabricate one.
- [x] The studio portrait is `public/assets/portrait.webp` (home headline) and `public/assets/about/` (About, photography).
- [x] Cover, footage and phone stills for all nine studies are in `public/assets/`, named by slug (West Chester Preschool, added 2026-11-14, was filmed with `npm run film:phone -- <slug> <url> --desk` for the desktop clip). Re-capture if a client redesigns their site with `npm run capture:study <slug>`, then update the webp copies in `public/assets/` (`docs/PENDING.md` says the script still writes PNGs under `src/assets/case-studies/`). Feature and before shots are cropped by hand and left alone.
- [ ] **Before/after sliders** on the remaining redesign case studies (`<BeforeAfter>` in the study's "Before and after" chapter). Done on the Foundation for Reformed Theology, MAS Monograms, Stone Steps 50K and First Baptist Muncie. Each other one needs a real "before" screenshot saved when the project started (not the Wayback Machine, whose archives of these sites render broken). Add it to `public/assets/study/` and `src/data/study-images.json`.
- [ ] Additional **case studies** in `src/content/case-studies/`: the checklist is in `.claude/rules/content.md` ("Adding a study").
- [ ] First **journal entry** in `src/content/journal/` (until then /journal/ is empty and has no link).
- [x] **Photographs** for /photography: 159 photos and 49 films on the light table (synced from the curation folder 2026-11-14). Adding more: `docs/PENDING.md` item 2f.

## Capturing CMS screens

Each study I built on a CMS shows its editor ("What you edit", `WhatYouEdit.astro`). The chapter stays hidden until the study has a `cmsShot`.

1. In PowerShell, from the repo: `npm run capture:cms` for all seven, or `npm run capture:cms -- --only stone-steps-50k` for one.
2. A Chrome window opens on a profile kept outside the repo (a folder called `ncs-cms-capture-profile` under `%LOCALAPPDATA%`; change it with `--profile <folder>` or `$env:NCS_CMS_PROFILE`). When the terminal says "Sign in to <site> in the window, then press Enter here", sign in yourself in that window and press Enter. The script never types or keeps a password; the profile remembers the sign-in for next time.
3. It opens a real document (the Home page form in each Sanity Studio; the newest article on Theology Matters and the newest Resource on FRT in wp-admin), hides avatars, user menus, email addresses, notices and update badges, and saves a PNG at 1440x900 under `src/assets/case-studies/shots/`.
4. Look at every file: no names, emails, drafts you would not show, or half-loaded panes.
5. Make the webp copy the site serves, `public/assets/{slug}-cms.webp`, and make sure the study's frontmatter has `cmsShot` (the file name), `cmsShotAlt` (what the screen shows, for example `The Home page open in Sanity Studio`) and `cmsName` (`Sanity Studio` or `WordPress`). The build fails if `cmsShotAlt` is missing.

The admin URLs live in the `SITES` list at the top of `scripts/capture-cms.mjs`, with where each one came from.

## Recurring upkeep

- [ ] Re-run `npm run og` after changing the studio blue, the tagline or the wordmark, and `npm run og:pages` after adding a page or study.
- [ ] Re-run `npm run icons` after editing `public/favicon.svg` (regenerates the favicon and app-icon set).
- [ ] Check `src/data/study-images.json` whenever an image in `public/assets/study/` is added or replaced (the real width and height stop layout shift, and a missing name fails the build).

## Brand drift to be aware of

The studio blue is `#2f3fe6` (`--accent` in `src/styles/kit.css`). Brand assets elsewhere (Instagram, Canva, signage, photography watermarks) that use an older blue will not match it, and the old navy and amber are gone from the site. The favicon, the share cards and the console greeting all use the same blue.
