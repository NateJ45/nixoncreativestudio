# PENDING.md

The open-patch and waiting-on-a-human queue for this repo. Created 2026-08-27
during the PORTS.md sync session (Card 15).

This is a **registry, not a changelog**. It is authoritative about what is
currently open, and it gets edited in the same commit as the thing it tracks.
When an item is done, delete the row. Do not append a "resolved" note and leave
it here; that turns the file into narrative and the next session stops trusting
it.

Read this file early in any session on this repo.

---

## Waiting on a human

### A0. Regenerate the visual baselines after the review pass (added 2026-11-07)

The baselines were regenerated just before the review items changed /churches/, /contact/, /services/ and the case studies, so those pages will drift. Once that PR is on `main`, run `gh workflow run visual.yml --ref main -f update=true` and follow `docs/TESTING.md`.

### A1. Decide about Cloudflare's injected script, then enforce the CSP (added 2026-11-07)

The Content-Security-Policy ships report-only (`docs/claude/deployment.md`). Everything the build makes passes it (`tests/csp.spec.ts`). On the live site, the one thing that reports is the inline script Cloudflare's JavaScript Detections injects into some responses (the first page of a visit, in the 2026-11-07 check), which no hash can allow because it changes per request. If the policy were enforced as it stands, that script would be blocked: visitors would see nothing different, and Cloudflare would lose that bot signal. Nathan's choice, in the Cloudflare dashboard (Security settings; Bot Fight Mode can force it on): turn JS Detections off so the policy reports nothing, or keep it and accept the blocked script. Then follow the steps in the doc to enforce.

### A2. Check security.txt after the next deploy (added 2026-11-07)

Live, `/.well-known/security.txt` shows the personal Gmail, but no such file was in this repo: it appears to come from the Cloudflare zone's security.txt setting. The repo now ships `public/.well-known/security.txt` with the studio address. If the live file still shows the Gmail after a deploy, turn off or update that setting in the Cloudflare dashboard (Security Center).

### C. Repoint the capture scripts at `public/assets/` (added 2026-11-06)

`scripts/capture-case-study.mjs` and `scripts/capture-cms.mjs` still write PNGs under `src/assets/case-studies/` and `shots/`. The site now serves webp copies from `public/assets/` (`{slug}-cover.webp`, `{slug}-m.webp`, `{slug}-cms.webp`, and the footage). Until the scripts write there, a re-capture needs a hand conversion (then `npm run stills` for the smaller phone-still copies), and `study-images.json` needs the new size for anything under `public/assets/study/`.

### D. Decide what the monthly live-scores job is for (added 2026-11-06)

`.github/workflows/live-scores.yml`, `scripts/measure-live.mjs`, `src/data/live-scores.json` and `src/lib/live-scores.ts` still run, and each month a PR opens with fresh numbers, but no page prints them any more. Either bring a "Measured live" fact back into the study page (the library already hides anything older than 120 days) or retire the workflow and the library.

### E. Re-baseline the parity harness (added 2026-11-06)

`scripts/.parity/` holds HTML from the old front end, so `npm run parity compare` fails on every page. Run `capture` on a good build of the new site and commit the result, or delete the harness.

- **The `test` job is pinned to ubuntu-24.04 (2026-10-30).** `ubuntu-latest` moved to 26.04, where Playwright's WebKit will not launch, so every `[webkit-iphone]` test failed. `ci.yml` now says `runs-on: ubuntu-24.04` on that job only. Unpin it once a Playwright release supports 26.04 (try it on a branch first). Starter PORTS.md card and vault gotcha `playwright-webkit-ubuntu-26-04`.

### 0. After the cut-over: Rich Results test (added 2026-10-30, overhaul 1.9)

Once the deal redesign is live on `main`, run Google's Rich Results test
(https://search.google.com/test/rich-results) and the Schema Markup Validator
(https://validator.schema.org) on `/`, `/services/` and one case study. The
JSON-LD is one `@graph` per page (studio, WebSite, Person, WebPage, plus
BreadcrumbList, CreativeWork, Service and FAQPage where they apply); expect no
errors. Google shows no FAQ rich result for this kind of site, which is fine.
Then resubmit the sitemap in Search Console. Delete this item when done.

### 0b. Google Business Profile: reviews (added 2026-11-10)

The profile exists (on the studio Google account, signed in as the second account in Chrome,
`authuser=1`): primary category Website designer, service area Cincinnati Metropolitan Area,
no storefront. Brought up to date 2026-11-13 to match `src/data/pricing.ts`: Website design
and Website migration from $3,500, Care plans from $59, Corporate and Headshot photography from
$1,000, and under Website designer the add-ons Website copywriting from $900, Large archive
migration from $1,500, Simple wordmark $600 and Local business listings from $350. There is no
brand or graphic-design category on purpose. When prices change, change them there too. Still to
do: ask two or three past clients for a Google review (the profile has none), and add photos. Delete this item when it has reviews.

### 1. Set the `SITE_URL` repo variable

**Blocks:** `.github/workflows/uptime.yml` (installed 2026-08-27, schedule ON).

Until the variable exists the workflow logs a warning and exits 0 on every
hourly run, so it is harmless but it is also not checking anything. Verified
unset 2026-08-27 (`gh variable list` returned nothing; `gh secret list` too).

```
gh variable set SITE_URL --body https://nixoncreativestudio.com
```

Use the **apex** form with **no trailing slash**: the apex is canonical and `www` 301s to it. The
workflow follows redirects, so either works.

Nothing else in this repo reads `SITE_URL`. The canonical site origin for the
build lives in `astro.config.mjs` (`site: 'https://nixoncreativestudio.com'`)
and is unrelated.

### 2a. Case-study honesty follow-ups (added 2026-10-30, overhaul 1.3)

Nathan signed off FBCM and Reid; both are done. Only the Orangeburg hook is still open:

- **First Baptist Muncie: done (overhaul 2.4d, 2026-10-31).** Nathan signed
  off the FBCM part ("FBCM is astro now"). The study now describes the Astro +
  Sanity + Cloudflare Workers rebuild, live on www.fbcmuncie.org since
  2026-10-19, from the fbcm repo's docs and the live site. The Wix-era feature
  shots are gone; the new ones are crops of the live /visit, /history and
  /architecture pages, and the Wix home page (captured 2026-06-21) is the
  `beforeShot`. Two things for Nathan to read: the line "I had built the
  church's earlier website on Wix" (taken from the old study and the two
  testimonials, which are now labelled as written about the Wix site), and
  the designer note, kept word for word from the Wix-era study (the children's
  and youth newsletters are still separate pages on the live site).
- **First Presbyterian Orangeburg:** its `hook` ("Book the building through one
  form, not an inbox") is a draft written from the designer note (1.6). Edit or
  approve it.
- **Reid Design: done (overhaul 2.4f, 2026-10-31).** Nathan approved the
  removal ("Yes, remove them"). The study no longer mentions a Budget
  Calculator, a style quiz or before/after sliders, and the designer note about
  the slider is gone. That day on reiddesignllc.com, `/budget-calculator/` and
  `/style-quiz/` answered 404, `/quiz/` and `/calculator/` redirected to
  /services/, and `/portfolio/` redirected home (the portfolio is switched
  off in Reid's CMS). The README's Reid row was corrected in the same PR.

### 2f. Photography: keep the permissions true (opened 2026-11-11)

/photography/ is open: the light table holds 75 photos and 11 short films from
`src/content/photos/`. Every frame is Nathan's own. Before adding more, make sure the
people and places in them are fine being on a public portfolio, children above all (a church's
own photo policy covers its own channels, not this site). To add one: optimize it into
`src/assets/photography/canvas/<name>.jpg` (1800px long edge) and add
`src/content/photos/<name>.json` (fields in `src/content.config.ts`); a film also needs a short
silent mp4 in `public/photography/video/` with its poster as the image. Then run
`npm run photo-colors` so the new photo has a colour for the table (the unit test fails without it).
Give it a `set` if it comes from a shoot that already has one (or add the shoot to `SETS`), and
`"select": true` only if it displaces one of the current selects. No years in the title, caption
or alt text: the page shows no dates.
`src/lib/photo-table.test.ts` checks the files and the alt text.

### 2b. Testimonials still missing (added 2026-10-31, testimonials package)

Five studies carry their client's own words (`testimonials` frontmatter,
shown by `QuoteBand` and the study's `Quotes` chapter): Theology Matters, Foundation for Reformed
Theology, Stone Steps 50K, First Baptist Muncie (two) and First Presbyterian
Orangeburg. The homepage shows Richard Burnett's (Theology Matters).

- **Still missing: Presbyterian Academy, MAS Monograms, Reid Design.** Those
  studies show no quote until a real one arrives. The ask is Nathan's to send
  (a short three-question email; it can be drafted for him, never sent for
  him).
- **Stone Steps:** David Corfman's quote is about the earlier refresh, and the
  study says so under it. A fresh quote about the 2026 rebuild would replace
  it.
- When a quote arrives: record it verbatim in the vault note
  `projects/ncs-testimonials.md` first, then add it to the study's frontmatter
  (`quote`, `name`, `title`, `date`) and the slug to `WITH_QUOTES` in
  `src/lib/case-testimonials.test.ts`, which fails on a quote in any other
  study.

### 2c. CMS screens: captured 2026-10-31 (overhaul 3.6)

Done. All seven CMS studies have `cmsShot`, `cmsShotAlt` and `cmsName`
(Sanity: MAS, Presbyterian Academy, Reid, Stone Steps, FBCM; WordPress:
Theology Matters, FRT). They show each site's custom home screen rather than a
document form, captured from Nathan's own signed-in Chrome at 1440 wide. Before
each shot, anything private was hidden or blurred: staff names in FBCM's Fix-it
list, and the donor, readership, search-term and warning panels on the TM and
FRT dashboards. Re-shoot with the same care, either that way or with
`npm run capture:cms` (steps in `docs/claude/setup-checklist.md`). The site serves them as `public/assets/{slug}-cms.webp`.

### 2d. The /churches/ copy, and the next sector pages (added 2026-10-31, overhaul 4.2)

/churches/ shipped with today's church studies (First Baptist Muncie and First
Presbyterian Orangeburg) on Nathan's go-ahead, ahead of the four-study floor
in plan ruling 19. Its copy lives in `src/data/sector-pages.ts`.

- **Nathan to read the copy**: the H1, lede and four points were drafted from
  the two church studies and /services, and the quote picked is Kendall
  Ellis's (FBCM). Edit them in `sector-pages.ts`.
- **Nonprofits, schools, small business**: live as lean pages (`SectorLean.astro`,
  copy in `sector-pages.ts`). **Nathan to read the copy**, the tier situations in
  `SITUATIONS` and the `JOBS` placements in `src/data/jobs.ts`.

### 2e. Interaction clips: recorded 2026-10-31 (overhaul 3.5)

Done for four studies, with client permission (plan decision 11): MAS (typing
initials into the hero's Monogram Studio), FRT (a library search for "lord's
supper"), Theology Matters (an archive search for "Barmen") and Presbyterian
Academy (two topic filters in the course catalog). Stone Steps, FBCM, Reid and
Orangeburg keep their still: Stone Steps' hook is the records board, which
lists runners by name; FBCM's visit page and Reid's priced band have no
interaction worth a clip yet; Orangeburg's is a form. If a client changes one
of these features, re-run `npm run capture:clips -- <slug>` (needs ffmpeg,
`FFMPEG` env var if it is not on PATH), look at the three check frames, and
paste the printed `signatureClip` into the study.

---

## Open technical exposure (no human decision needed, just not done yet)

### 3. `wrangler` is on a caret, and the generated config still carries

`legacy_env`

PORTS.md Card 14. `wrangler` is declared `^4.156.0`, which is past 4.126.
`dist/server/wrangler.json`, which `@astrojs/cloudflare` 13.5.4 generates on
every build, contains `"legacy_env": true` (verified 2026-08-27). wrangler
4.126+ rejects that field outright. Both sides of that are true today, so the only thing keeping it latent is the deploy path below.

This is latent rather than live: `npm run deploy` runs a plain `wrangler deploy`
against the **root** `wrangler.jsonc`, which has no `legacy_env`, so the
generated file's copy is not read on the current deploy path. It becomes live
the day something starts pointing wrangler at the generated config. If that day
is ever in doubt, check the generated file for `legacy_env` first.

---

## Deliberate absences (do not "fix" these)

These are recorded so a future session stops re-deriving them.

- **No Sanity, and therefore no Sanity cards.** This is a static marketing site
  with content in Astro content collections and MDX. PORTS.md Cards 4
  (sanity-lib), 5 (stale-types CI guard), 6 (nightly Sanity backup), 10
  (embedded-studio live preview) and 11 (preview click interceptor) have nothing
  to attach to here. There is no dataset to back up and no generated types file
  to go stale.
- **No page-builder.** Card 12 is a method for converting bespoke pages into
  CMS-driven sections. There is no CMS.
