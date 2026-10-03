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

### 1. Set the `SITE_URL` repo variable

**Blocks:** `.github/workflows/uptime.yml` (installed 2026-08-27, schedule ON).

Until the variable exists the workflow logs a warning and exits 0 on every
hourly run, so it is harmless but it is also not checking anything. Verified
unset 2026-08-27 (`gh variable list` returned nothing; `gh secret list` too).

```
gh variable set SITE_URL --body https://www.nixoncreativestudio.com
```

Use the **www** form with **no trailing slash**. The apex 301s to www, and the
workflow follows redirects, so the apex form also works; www just saves a hop
on every route.

Nothing else in this repo reads `SITE_URL`. The canonical site origin for the
build lives in `astro.config.mjs` (`site: 'https://nixoncreativestudio.com'`)
and is unrelated.

### 2. Decide what to do about the `--link` comment in `globals.css`

**File:** `src/styles/globals.css`, the `--link` declaration in `:root`
(and the matching paragraph under "Brand colors" in `CLAUDE.md`).

The comment reads `/* AA on #FFFFFF, #F4F7FA, and #0A1628 */`. Measured
2026-08-27:

| pair                   | ratio      | AA body text (4.5:1) |
| ---------------------- | ---------- | -------------------- |
| `#2A6FB0` on `#FFFFFF` | 5.25:1     | pass                 |
| `#2A6FB0` on `#F4F7FA` | 4.88:1     | pass                 |
| `#2A6FB0` on `#0A1628` | **3.45:1** | **fail**             |

The third claim is wrong. It is **not** a live accessibility defect: the pair
is not rendered anywhere. In light mode the Footer is a light `.band-themed`
surface, and the navy Footer is a dark-mode-only state where the link colour
switches to `--secondary` (`#7AC8F0`, 9.8:1 on navy). So this is a documentation
error, not a bug.

It is left for a human because `globals.css` is a "foundation, edit with care"
file per `CLAUDE.md`, and because there are two defensible fixes:

- **a)** Correct the comment to say AA on the two paper surfaces only. Zero
  risk, and the token keeps its current value.
- **b)** Darken `--link` until it genuinely clears 4.5:1 on navy too, making the
  comment true and giving a future navy-in-light-mode surface a safe link
  colour. This changes rendered colour on every page and needs an eye on it.

Option (a) is the recommendation. Whichever is chosen, add the navy pair to
`src/lib/theme-tokens.test.ts` afterwards so the claim is machine-checked from
then on.

---

### Add the Cloudflare secrets CI needs for the Worker preview

**Blocks:** the Worker preview upload in `.github/actions/preview-version`, and
with it the `test` job in `ci.yml`, the link check, and `lighthouse.yml`. Until
both secrets exist those steps are skipped with a warning annotation ("Preview
skipped"), so the pipeline is green but the Playwright, link-check and Lighthouse
gates are NOT running. Added 2026-10-02 with the hybrid-site tooling.

Add as repository secrets (Settings > Secrets and variables > Actions):

- `CLOUDFLARE_ACCOUNT_ID`: the account id (dash.cloudflare.com, any Worker's
  overview page, or `npx wrangler whoami`).
- `CLOUDFLARE_API_TOKEN`: an API token with **Account > Workers Scripts > Edit**
  (uploading a version), plus **Read** on the resources the bindings in
  `wrangler.jsonc` name: **Account > D1 > Read** (`DB`), **Account > Workers R2
  Storage > Read** (`MEDIA`) and **Account > Workers KV Storage > Read**
  (`SESSION`). Scope it to this account only. Wrangler may also want
  **User > User Details > Read** and **Account > Account Settings > Read** for
  `whoami`-style lookups; add them if the first run asks. It does not need Pages,
  zone or DNS permissions: nothing in CI deploys.

`gh secret set CLOUDFLARE_ACCOUNT_ID` and `gh secret set CLOUDFLARE_API_TOKEN`
from a shell where `gh` is logged in. After adding, push a branch and confirm the
log of the "Upload Worker preview version" step ends with a `Preview: https://ci-...`
line.

### Load the PR 4 to 11 data into production in one command (`npm run cms:production-load`)

**Done 2026-10-03:** production now holds the schema and content for site_settings, menus, pricing_addons, pricing_tiers, page_about, page_contact, page_home, page_journal, page_not_found, page_photography, page_services, page_work, service_offerings and pages, and the schema (no content) for photos and posts. `PRODUCTION_HAS` and `SNAPSHOT_ALL` were updated and `ncs-ci` rebuilt from them in PR 13. What is still open from the per-PR rows below is each page's **edit proof** (change a field in the admin, publish, see it live, restore from History) and the explanatory notes for Nathan; the "needs `EMDASH_TOKEN`" load steps in them are finished (the load for PR 13 is its own row below).

Added 2026-10-03. The per-PR rows below (PR 4 to 11) can all be done by one command Nathan runs in his own PowerShell: `npx emdash login --url https://www.nixoncreativestudio.com`, set `EMDASH_TOKEN`, note a D1 Time Travel restore point (`npx wrangler d1 time-travel info ncs-emdash-prod`), then `npm run cms:production-load -- --plan` and `npm run cms:production-load`. Steps and stop rules are in `docs/LAUNCH-RUNBOOK.md` ("One command for every block below"). It has not been run against production. After a clean run: the follow-ups it prints (`PRODUCTION_HAS`, seed re-export, `ncs-ci` rebuild), each row's edit proof, then revoke the token and delete the rows below.

### Load the PR 13 data into production, with PR 14's (needs `EMDASH_TOKEN` from Nathan)

**Blocks:** nothing visible. PR 13 (redirects and the hero scene) ships safe with production lacking the two new `case_studies` fields and the two redirect rows: the hero scene falls back to the five bundled sites it always showed, and `/now` and `/work/west-chester-preschool` answer 301 from `src/lib/redirectFallback.ts`. Until the load, ticking a case study into the hero is not possible (the fields do not exist) and the Redirects screen in the admin is empty.

Commands and the exact lines to expect: `docs/LAUNCH-RUNBOOK.md` ("PR 13") and `docs/CMS-DESIGN.md` 2.6 ("PR 13 data"). Nathan creates a new API token, runs `npm run cms:production-load` (everything already loaded reads "already in place"; new are `case_studies`, schema then five `would seed` patches, and `redirects`), then does the edit proof (un-tick a hero site, add and delete a redirect).

**PR 14 rides on the same command (verified read-only on 2026-10-03, nothing written).** `npm run cms:production-load` now also applies collection settings to 14 collections that already exist: a `urlPattern` on every page-mapped collection (this is the fix for the admin "live view" button that went to a 404), `sortOrder` 13 on `case_studies` and 15 on `photos` (Journal stays 14). Each shows as `would applied collection settings (group ...)` in the dry run and must read `unchanged collection settings` in the re-check; `pages` and `posts` already read unchanged. Then one extra command, `npm run cms:tidy -- --url https://www.nixoncreativestudio.com --dry-run`, then the same with `--yes` (not `--dry-run`): it deletes the empty template `category` taxonomy (a dry run on production printed `would deleted taxonomy category`, widget areas and sections empty, menus primary and footer only). After the load: open Home page in the admin and press "live view" (it must open `/`), then check the sidebar order (Site settings, Pages, Pricing & services, Case Studies, Journal, Photography). Then re-export the seed (`node scripts/export-seed-from-instance.mjs --url https://www.nixoncreativestudio.com`) and run `node scripts/ci-dataset/cms-fixtures.mjs`.

**Nathan, for the editing guide (PR 14):** do the three practice edits in `docs/EDITING-GUIDE.md` (a price, a FAQ answer, the Currently block) from the guide alone, and say what was unclear. Two decisions are still open there: the optional second Editor-role login (needs a second email address) and the optional catch-all page route (not built; see docs/CMS-DESIGN.md questions 1 and 8).

**After the rows are live, delete the temporary code fallback:** `src/lib/redirectFallback.ts` (+ `redirectFallback.test.ts`), its use in `src/worker.ts` (item 5 of the header comment) and the matching lines in CLAUDE.md Gotcha 18. Until then a redirect deleted in the admin keeps working invisibly. Also then: re-export the seed with the token (`node scripts/export-seed-from-instance.mjs --url https://www.nixoncreativestudio.com`) so `seed/seed.json` carries the live redirect rows, and run `node scripts/ci-dataset/cms-fixtures.mjs`.

For Nathan on the way: the hero scene shows five sites in `hero_order` 1 to 5 (Second Presbyterian, Theology Matters, Stone Steps 50K, MAS Monograms, Presbyterian Academy). A site joins it only with BOTH its desktop and mobile capture set and a live URL; to add one, open its case study, tick "Show in the homepage device scene" and give it the next number. The two bundled-image fallbacks in `HeroShowcase.astro` (`bundledSites`) and the ten `*-home.png` / `*-mobile.png` files they import stay until you are sure you no longer want a no-database fallback; the files and the array can then be deleted together (CMS-DESIGN PR 14).

### Load the PR 4 data into production (needs `EMDASH_TOKEN` from Nathan)

**Blocks:** nothing visible. PR 4 (Site settings and menus) ships safe with production empty, because every read falls back to the committed JSON. Until the data is loaded, the footer, header, phone menu, JSON-LD and feed read from `cms/content/` and the admin's Site settings screen and Menus do not exist yet or are empty, so an edit there changes nothing.

The exact command list is in `docs/CMS-DESIGN.md` 2.6 ("PR 4 data") and `docs/LAUNCH-RUNBOOK.md`. It also needs `npx emdash login`, then the CI follow-up (add `site_settings` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs`, re-export the seed, rebuild `ncs-ci`). Delete this row after the edit proof (change the footer "Currently" line, publish, see it live, restore from History). This is also the first real run of the schema applier and content loader, so it closes row 7 below if both reruns print only `unchanged`. Also confirm there that the log line `[cms] site_settings/site is missing or unpublished` stops appearing in Workers observability.

Decision for Nathan on the way: the design (CMS-DESIGN 1.2) listed a `footer_blurb` field, but the footer has no brand paragraph today (its bottom row is the tagline), so it was left out rather than add a field that edits nothing. Say if you want a footer paragraph; it is a small follow-up.

### Load the PR 5 data into production (needs `EMDASH_TOKEN` from Nathan)

**Blocks:** nothing visible. PR 5 (Pricing) ships safe with production empty, because the homepage "What it costs" band and the /services tier and add-on cards fall back to the committed `cms/content/pricing_tiers.json` and `pricing_addons.json`, which hold the current numbers (Launch $4,000, Signature $7,000, Flagship $12,000, care plan from $100/mo). Until the data is loaded, the admin has no Pricing tiers or Add-ons screens, so a price cannot be edited there.

The exact command list is in `docs/CMS-DESIGN.md` 2.6 ("PR 5 data") and `docs/LAUNCH-RUNBOOK.md`; run it in the same session as the PR 4 load (one `npx emdash login`, one token). Then the CI follow-up (add both collections to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs`, re-export the seed, rebuild `ncs-ci`) and the edit proof (Launch's starting price 4000 to 4100, publish, see $4,100 on /services and /, restore from History). Delete this row after that. A price change also needs two prose edits that are still code: the /services FAQ answer "What does it cost?" and the /contact budget brackets.

### Load the PR 6 data into production (needs `EMDASH_TOKEN` from Nathan)

**Blocks:** nothing visible. PR 6 (Homepage copy) ships safe with production empty, because the hero, Selected Work, "What it costs" and "How we work" copy (and the homepage title and description) fall back to the committed `cms/content/page_home.json`, which holds the current words. Until the data is loaded, the admin has no Home page screen, so the homepage words cannot be edited there.

The exact command list is in `docs/CMS-DESIGN.md` 2.6 ("PR 6 data") and `docs/LAUNCH-RUNBOOK.md`; run it in the same session as the PR 4 and PR 5 loads (one `npx emdash login`, one token). Then the CI follow-up (add `page_home` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs`, re-export the seed, rebuild `ncs-ci`) and the edit proof (the hero's coloured headline words, publish, see them on /, restore from History). Delete this row after that.

Two things for Nathan on the way. (1) The homepage had no meta description of its own (Google saw the bare studio name); the design seeds one from the tagline, so merging this PR changes it, which is the only rendered difference. Say if you would rather write a different one. (2) A pre-existing typo in the live hero ("photographed byone person", no space before the link) was fixed in PR 7 with `{proof.before}{' '}` in `Hero.astro`, the only rendered change on the homepage.

### Load the PR 7 data into production (needs `EMDASH_TOKEN` from Nathan)

**Blocks:** nothing visible. PR 7 (Services) ships safe with production empty, because /services falls back to the committed `cms/content/page_services.json` and `service_offerings.json`, which hold the current words and produce byte-identical structured data (the JSON-LD golden file is a unit test). Until the data is loaded, the admin's Services page and Service offerings screens do not exist and an edit there is impossible.

The exact command list is in `docs/CMS-DESIGN.md` 2.6 ("PR 7 data") and `docs/LAUNCH-RUNBOOK.md`; run it in the same session as the PR 4 to 6 loads (one `npx emdash login`, one token). Save the live JSON-LD before and after and `cmp` them (they must match), then the CI follow-up (add both collections to `PRODUCTION_HAS`, re-export the seed, rebuild `ncs-ci`) and the edit proof (the first FAQ answer, publish, see it in the page and the JSON-LD, restore from History). Also run the live /services URL through Google's Rich Results test and screenshot it. Delete this row after that.

For Nathan on the way: the Web design screenshot on /services is still an image file in the code, not a CMS upload (the picture's description is editable; the image swap comes with the About headshot work in PR 8). The FAQ answers that quote prices ("What does it cost?", "Do you offer maintenance?") are now editable in the admin but remain plain text: after a price change, update them there.

### Load the PR 8 data into production (needs `EMDASH_TOKEN` from Nathan)

**Blocks:** nothing visible. PR 8 (About) ships safe with production empty: /about renders from `cms/content/page_about.json` and the bundled pictures, byte-for-byte what it showed before (apart from one fixed missing space, below). Until the data is loaded the admin has no About page screen.

Commands: `docs/CMS-DESIGN.md` 2.6 ("PR 8 data") and `docs/LAUNCH-RUNBOOK.md`; run them in the same session as the PR 4 to 7 loads. This is the first load that uploads files: `cms:load` runs `emdash media upload` for the headshot and five photos (about 1.2 MB), de-duplicated by SHA-1. After it, add `page_about` to `PRODUCTION_HAS` in `cms-fixtures.mjs`, re-export the seed, rebuild `ncs-ci`, and check the pictures still come back as `image/webp` from `/_image` on the live domain (a GET, not HEAD).

For Nathan on the way: the live thesis line read "small businessesaround Cincinnati" (a missing space); PR 8 fixes it. The offering picture on /services is still an image file in code: the CMS image path now exists (`EmDashPhoto`), but adding an `image` field to `service_offerings` is a separate small change (say if you want it).

### Load the PR 9 data into production (needs `EMDASH_TOKEN` from Nathan)

**Blocks:** nothing visible. PR 9 (Contact) ships safe with production empty: /contact renders from `cms/content/page_contact.json`, byte-for-byte what it showed before except that the Budget, Timeline and How-did-you-hear options now submit their visible labels (that change ships with the code, not with the data). Until the data is loaded the admin has no Contact page screen.

Commands: `docs/CMS-DESIGN.md` 2.6 ("PR 9 data") and `docs/LAUNCH-RUNBOOK.md`; run them in the same session as the PR 4 to 8 loads. No files upload. After it, add `page_contact` to `PRODUCTION_HAS` in `cms-fixtures.mjs`, re-export the seed and rebuild `ncs-ci`.

### One real Web3Forms submission per option list (Nathan, after PR 9 deploys)

**Blocks:** nothing; it is the last acceptance step of CMS-DESIGN PR 9, which only a person with the real inbox can do. The tests intercept the POST and prove the payload carries labels, but no agent sends a real message.

On the live site (the Web3Forms key is live there), send one inquiry that picks a Budget, a Timeline and a "How did you hear" choice, then open the email Web3Forms delivers and confirm those three lines show the visible text ("Under $4,000", not `under-4k`). If a line shows a code or is blank, tell Claude. Inquiries already in your inbox show the old codes; new ones show words.

For Nathan on the way: renaming a choice in the Contact page screen changes what arrives in your inbox from then on, so a rename mid-quarter makes old and new emails read differently. The first Budget choice should always start at your lowest tier price; after a price change, update both.

### Load the PR 10 data into production (needs `EMDASH_TOKEN` from Nathan)

**Blocks:** nothing visible. PR 10 (Privacy, Accessibility, Colophon) ships safe with production empty: the three pages render from `cms/content/pages.json`, the same words and markup as before apart from three explained non-visual differences (developer comments dropped, one shared scroll-spy script, a renamed marker attribute). Until the data is loaded the admin's "Other pages" entry has only Title and Content and no Privacy, Accessibility or Colophon entries.

Commands: `docs/CMS-DESIGN.md` 2.6 ("PR 10 data") and `docs/LAUNCH-RUNBOOK.md`; run them in the same session as the PR 4 to 9 loads. Unlike the earlier loads this one extends a collection production already has, so look at `npx emdash content list pages` first. No files upload. After it, add `pages` to `PRODUCTION_HAS` in `cms-fixtures.mjs`, re-export the seed and rebuild `ncs-ci`.

For Nathan on the way: the Colophon's stack and hosting rows and the Privacy analytics text are now editable in the admin but must stay true; they are tied to the code and the hosting, so ask for a check before changing them. The email in the links is typed text, so change it in these entries too if you change it in Site settings.

### Load the PR 11 data into production (needs `EMDASH_TOKEN` from Nathan)

**Blocks:** nothing visible. PR 11 (Work, Photography, Journal, Not-found, Photos) ships safe with production empty: the four pages render from `cms/content/page_work.json`, `page_photography.json`, `page_journal.json` and `page_not_found.json`, the same words and markup as before apart from one explained difference (an apostrophe in a few sentences prints as `&#39;`, which renders the same), and `/photography/` keeps its "In progress" state because production has zero photos. Until the data is loaded the admin has no Work page, Photography page, Journal page, Not-found page or Photos screens.

Commands: `docs/CMS-DESIGN.md` 2.6 ("PR 11 data") and `docs/LAUNCH-RUNBOOK.md`; run them in the same session as the PR 4 to 10 loads. `photos` is schema only (no content file): after it, Nathan adds photos in the admin and the gallery appears on its own. After the load, add the four page collections (not `photos`) to `PRODUCTION_HAS` in `cms-fixtures.mjs`, re-export the seed and rebuild `ncs-ci`.

For Nathan on the way: every photo needs a description for screen readers ("what the photo shows", not a title); a photo without one is left out of the page on purpose. Tick "Use as the opening picture" on the one photo you want behind the headline; if none is ticked the first photo is used. The viewer does not show captions yet (it needs one extra plugin, a visual change that was not part of this PR).

### Apply the PR 12 schema (the Journal) to production (needs `EMDASH_TOKEN` from Nathan)

**Blocks:** nothing visible. PR 12 (the journal moves into EmDash, the Astro `journal` and `photos` collections are deleted) ships safe with production empty: the code reads the template `posts` collection, which production already has with no entries, so `/journal/` shows its "first entry is coming" card, the Journal link stays out of the menus, `/journal/<anything>/` answers 404 and `/rss.xml` is unchanged. What is missing is only the admin side: the collection still carries the template labels (Posts) until the schema is applied, so Nathan cannot yet write a journal entry with the required Summary and `updated` fields, and `/sitemap-posts.xml` lists nothing until an entry is published.

Commands: `docs/CMS-DESIGN.md` 2.6 ("PR 12 data") and `docs/LAUNCH-RUNBOOK.md` ("PR 12"), which also holds the before-and-after checks and the edit proof (draft is invisible, publish shows the entry, the Journal link and the feed item, unpublish takes them away). There is no content to load.

For Nathan on the way: (1) After the schema is applied, resubmit `sitemap-index.xml` in Search Console once (it lists `sitemap-posts.xml` now). (2) A journal entry's share card is built at deploy time, so re-run the latest Workers Build after publishing a new entry if you want its social preview image to appear at once. (3) Pictures inside an entry's body are not drawn yet (the cover image is); tell me if you want them and I will add them (it means resolving EmDash media references in `src/lib/journalBody.ts`).

### Delete the unused case-study capture files? (already done in PR 12; confirm you are happy)

**Blocks:** nothing. PR 12 deleted 35 images under `src/assets/case-studies/` that nothing imports (the eight covers other than `second-presbyterian-chicago.png`, and every feature, before and after capture; 25 MB). Their pictures live in EmDash media (R2) and the files are in git history (`git log --diff-filter=D -- src/assets/case-studies`). The home and mobile captures stay because `HeroShowcase` imports ten of them (as its fallback `bundledSites` since PR 13) and `SiteShowcase`'s dead slug mode still globs them. If you wanted the originals kept in the working tree as a local backup, restore them from history.

### Decide whether to raise the route cache lifetime (purge on publish is proven)

**Blocks:** nothing. Nathan confirmed on 2026-10-03 that an admin edit shows on the live site within seconds, so purge-by-tag works on this zone. `PAGE_MAX_AGE` in `src/lib/routeCache.ts` is still 5 minutes (it is now only the fallback for a missed purge). Raising it to a day (the design used 86400) would make more visits a cache HIT; the cost is that a purge that fails for any reason leaves a page stale for a day instead of five minutes. Say which you want. The editing guide and CLAUDE.md say "within seconds, five minutes at worst", which stays true at 5 minutes and would need the last half changed if the lifetime goes up.

Also open: the first request per URL after each deploy is a cache MISS (about 0.5 to 1.6 s on ncs-ci). A post-deploy warm-up (a GET of each route from the deploy workflow) would hide that from visitors; not built.

---

## Cutover tasks (EmDash migration)

The step-by-step launch plan, with the rollback, is in `docs/LAUNCH-RUNBOOK.md`.
The list below is the repo clean-up that plan depends on.

Things the hybrid-site tooling deliberately leaves in place until the main
session cuts over. Each is a deletion or a flip; do them in the cutover commit.

- **OG default (done).** `EMDASH_URL` in `scripts/generate-og.mjs` now defaults to
  the production site (`https://www.nixoncreativestudio.com`); the trial is gone.
- **Case-study leftovers (mostly done in PR 12).** The MDX case studies and the Astro
  collections are gone, and so are 35 unreferenced images under
  `src/assets/case-studies/`. What remains there is deliberate: the home and mobile
  captures `HeroShowcase` imports (CMS-DESIGN PR 13 moved the hero scene to the CMS;
  they stay as its no-database fallback until you decide otherwise, see the PR 13
  row above) and the `/services` cover. `scripts/migrate-case-studies.mjs`
  and `scripts/emdash-schema-case-studies.mjs` are the one-time import scripts; the MDX
  they read is in git history only, so they cannot run again and can be deleted.
- **The placeholder pipeline is already removed** (no `generate-placeholders.mjs`,
  `coverPlaceholders.json`, `coverPlaceholder.ts` or build step remain).
- **Point the tooling at the real domain.** CI Worker name in `wrangler.jsonc`
  (`ncs-ci`, since 2026-10-03); alias length is budgeted for a name up
  to about 27 characters. Re-check the `image.remotePatterns` hosts, the
  `SITE_URL` variable (item 1) and the default `PLAYWRIGHT_BASE_URL` examples in
  the docs.
- **Re-capture the parity baselines** from the hybrid site
  (`node scripts/page-parity.mjs capture --url <base>`), once, deliberately, and
  say so in the commit message. Today they are the static-build baselines.
- **Secrets**: see "Add the Cloudflare secrets CI needs" above.

## Open technical exposure (no human decision needed, just not done yet)

### 3. `react` / `react-dom` are on carets

PORTS.md Card 13. Both resolve to 19.2.6 today, but `package.json` declares
`^19.2.6` for each. The moment an install drags one of them forward
independently, the build dies inside workerd behind a wall of Miniflare stack
frames, with the real message (`Incompatible React versions`) buried **above**
the `MiniflareCoreError`. presacademy lost a session to exactly this on
2026-08-25.

The fix is to pin both **exact**, no caret. Not done here because it is a
lockfile-affecting change and this sync session deliberately made none. Do it
in its own commit, ideally alongside the next dependency bump.

### 4. `wrangler` is on a caret, and the generated config still carries

`legacy_env`

PORTS.md Card 14. `wrangler` is declared `^4.94.0` and resolves to 4.94.0.
`dist/server/wrangler.json`, which `@astrojs/cloudflare` 13.5.4 generates on
every build, contains `"legacy_env": true` (verified 2026-08-27). wrangler
4.126+ rejects that field outright.

This is latent rather than live: `npm run deploy` runs a plain `wrangler deploy`
against the **root** `wrangler.jsonc`, which has no `legacy_env`, so the
generated file's copy is not read on the current deploy path. It becomes live
the day either the caret resolves past 4.126 **and** something starts pointing
wrangler at the generated config. Pin `wrangler` to `~4.94.0` if that day is
ever in doubt.

### 5. `scripts/with-workerd.mjs` is installed but not wired

PORTS.md Card 1. Deliberate. The wrapper exists to work around a workerd crash
that only happens on Astro 7 / `@astrojs/cloudflare` 14, where the prerender is
routed through `@cloudflare/vite-plugin`. This repo is Astro 6.3.7 / adapter
13.5.4, the crash does not occur, and the wrapper would be a no-op.

Wire it as part of the Astro 7 upgrade, not before:

```json
"build": "node scripts/with-workerd.mjs npm run placeholders && ..."
```

(the exact shape needs thought, because `build` here is a three-command chain).

### 6. Seed export: the token-only and menu paths are unproven

`scripts/export-seed-from-instance.mjs` (CMS-DESIGN PR 1) now exports collection `titleField` / `sortOrder` / `admin` and the redirect list over REST when `EMDASH_TOKEN` is set, and menus through `emdash menu get`. Production has no menus or redirects today and no token was available when it was written, so those three paths ran only as far as "nothing to export". The first CMS PR that adds a menu, a redirect or a `titleField` must create an API token (Settings, API tokens), run `node scripts/export-seed-from-instance.mjs --url https://www.nixoncreativestudio.com --check`, and fix the field-name mapping in the script if the output is wrong. Delete this row once a seed with a real menu round-trips.

Also open from the same PR: `scripts/ci-dataset/terms.json` pins each CI case study's taxonomy terms by hand because the CLI cannot read per-entry terms; with a token the script could read them over REST instead.

### 7. The CMS tooling has not run against a live authenticated instance

`scripts/cms/apply-schema.mjs` and `scripts/cms/load-content.mjs` (CMS-DESIGN PR 3) were tested against in-memory fakes of the EmDash REST API and the `emdash` CLI, because `ncs-ci` has no admin user and so no API token. Three response shapes are read defensively because they were never observed: a field row's sort key (`sortOrder` or `sort_order`), a menu item's URL key (`customUrl`, `custom_url` or `url`), and the `content get --raw` result (`data` and `_rev` at the top level). The first content PR (4) must start with `npm run cms:schema -- --collection <slug> --url <instance> --dry-run` (docs/CMS-DESIGN.md 2.6), then a second real run that prints only `unchanged`. If a shape differs, fix the one helper (`scripts/lib/emdash-schema.mjs` or `scripts/lib/cms-load.mjs`) and add the observed shape to its unit test. Delete this row once a real schema apply and a real content load both rerun as no-ops.

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
- **No visual-regression suite.** The family standard runs one only where a
  site has a fixture-driven `/styleguide` route; this site does not. The
  Playwright / axe / reflow suite (Card 8) landed 2026-09-06; see
  `docs/TESTING.md`.
