# Launch-day runbook: EmDash cutover (PR #47)

Written 2026-10-02. Nothing here has been run against production.

Decisions made with Nathan: launch behind the existing coming-soon gate (about
15 minutes of coming-soon for visitors), and bring the content across with the
setup wizard's "Import an existing EmDash site", using a fresh `.emdash` export
from the trial.

## Before launch (no effect on the live site)

1. Create production resources, separate from the trial's:
   `npx wrangler d1 create ncs-emdash-prod`,
   `npx wrangler r2 bucket create ncs-emdash-media-prod`,
   `npx wrangler kv namespace create ncs-emdash-sessions-prod`.
2. On the PR branch, edit `wrangler.jsonc`: `name` to `nixoncreativestudio`, then the
   new D1 id, R2 bucket name and KV id. Keep `worker_loaders`, the cron trigger and
   the `IMAGES` binding as they are.
3. Set the runtime secret on the live Worker before the first deploy of the new code:
   generate a key with `npx emdash secrets generate` (print only, do not write it to a
   tracked file), then `npx wrangler secret put EMDASH_ENCRYPTION_KEY --name nixoncreativestudio`.
   Also set `EMDASH_SITE_URL=https://www.nixoncreativestudio.com` as a Worker variable.
   Visitors land on `www` (the apex 301s to it), and the passkey binds to the host you
   register on.
4. Remove what the CMS replaces (done by the cutover and CMS-DESIGN PR 12: the MDX case
   studies, `src/content.config.ts` and its collections): the placeholder pipeline
   (`scripts/generate-placeholders.mjs`, `src/lib/coverPlaceholder*.ts`,
   `coverPlaceholders.json`, and `placeholders` in the build chain), and flip the
   `EMDASH_URL` default in `scripts/generate-og.mjs` to the production domain.
   Then re-run `npm test` and `npm run check:links` against a preview URL.
5. Check `image.remotePatterns` in `astro.config.mjs` lists every host that will serve
   the site. A host missing from it silently serves full-size originals (see
   `docs/EMDASH.md`, "Trusted image hosts are a silent failure").
6. Export a fresh package from the trial right before launch:
   `npx emdash site export --url https://ncs-emdash-trial.nathanjnixon86.workers.dev --output site.emdash`
   (last test: 70 files, 85 MB). The trial database is the only copy of the nine case
   studies until production holds them, so it must stay until the import in Launch
   step 3 is verified. CI no longer uses it (CI runs on the `ncs-ci` sample).
7. In Cloudflare, add build variables `PUBLIC_COMING_SOON=true` and a long random
   `PUBLIC_PREVIEW_TOKEN` (see CLAUDE.md, "Coming Soon mode").

## Launch

1. Merge the PR. Workers Builds builds and deploys. The site shows the coming-soon page.
2. Visit `https://www.nixoncreativestudio.com/?preview=<token>` once to bypass the gate.
3. Open `https://www.nixoncreativestudio.com/_emdash/admin/`. In the wizard choose
   **Import an existing EmDash site**, register the passkey, then upload `site.emdash`.
4. In EmDash Settings, set the site URL to `https://nixoncreativestudio.com` (the apex,
   so sitemap URLs match the canonical tags, which are apex today), plus title,
   tagline, social links and the default social image.
5. Check: `/`, `/work/`, a case study, `/rss.xml`, `/sitemap-index.xml` (it should list
   `sitemap-case_studies.xml`), `/robots.txt`, an image's `Cache-Control` (use GET, not
   HEAD), and a throttled-mobile LCP trace against the 4.5 s gate.
6. Remove `PUBLIC_COMING_SOON` and `PUBLIC_PREVIEW_TOKEN` and let it rebuild. The site
   is live.

## Rollback

Cloudflare dashboard, Workers, `nixoncreativestudio`, Deployments: roll back to the
previous (static) version. The static version does not use the database, so there is no
data step.

## After launch

- Resubmit `sitemap-index.xml` in Search Console.
- Decide the apex versus `www` canonical mismatch (it exists on `main` today and is not
  part of this work).
- Delete the trial Worker (`ncs-emdash-trial`), the `ncs-emdash` database, the
  `ncs-emdash-media` bucket and the trial KV namespace once production holds the
  imported content (CI was repointed at `ncs-ci` on 2026-10-03, so nothing else
  reads them).
- Rewrite the homepage, stack and content-collection sections of CLAUDE.md for the hybrid
  architecture, and update the vault note.
- (Done 2026-10-03) The `staging` branch was retired.

## CMS content PRs: production data steps (CMS-DESIGN 2.1 and 2.6)

Run by the main session, with Nathan's go-ahead, after a content PR (4 to 13) merges. The tooling PR (3) itself needs none of this: it creates no collection and moves no content. Nothing below runs from a builder agent, and none of it touches the live pages until the code that reads the data has deployed.

Once per session: `npx emdash login --url https://www.nixoncreativestudio.com` (device code, Nathan approves in his browser). That login alone is enough since 2026-10-03: the schema, content, menu and redirect scripts fall back to the token it stored (`storedLoginToken()` in `scripts/lib/emdash-rest.mjs`, read at run time, never printed or logged). Setting `EMDASH_TOKEN=<API token from Settings, API tokens>` still works and takes priority. If the stored login has expired, log in again.

1. Record a rollback point: note the time, so `wrangler d1 time-travel restore ncs-emdash-prod --timestamp <iso>` is ready if a bulk step goes wrong.
2. Check the definitions offline: `npm run cms:schema -- --all --check`.
3. Look before writing: `npm run cms:schema -- --collection <collection> --url https://www.nixoncreativestudio.com --dry-run`. Every line should read `would added field ...` on a first run.
4. Apply the schema: the same command with `--yes` instead of `--dry-run`. Run it a second time; every line must read `unchanged`.
5. Look at the content: `npm run cms:load -- --collection <collection> --url https://www.nixoncreativestudio.com --dry-run`.
6. Load it: the same command with `--yes`. A second run must report `unchanged` for every entry. Menus and redirects: `npm run cms:load -- --collection menus --url ... --yes` and `--collection redirects`.
7. Re-export the seed and rebuild `ncs-ci` as in docs/CMS-DESIGN.md 2.1 step 4 (`node scripts/export-seed-from-instance.mjs --url https://www.nixoncreativestudio.com`, then `npm run ci-dataset -- --from-scratch`, `npm run ci-dataset:snapshot`, `npm run ci-dataset`).
8. After the PR deploys: the edit proof from CMS-DESIGN 2.1 (change a field, publish, see it live, restore from History).

### One command for every block below: `npm run cms:production-load`

Added 2026-10-03. Instead of typing the per-PR blocks that follow, Nathan runs ONE command in his own PowerShell window. It does the same schema and content steps for every migrated area, in the order below, and stops at the first error or surprise. The per-PR blocks stay as the reference for what each step should print and for the proofs that come after.

```powershell
npx emdash login --url https://www.nixoncreativestudio.com     # once, device code
$env:EMDASH_TOKEN = '<API token from Settings, API tokens>'    # keep it in 1Password; never paste it into chat
npx wrangler d1 time-travel info ncs-emdash-prod               # read-only: note the timestamp (the restore point)
npm run cms:production-load -- --plan                          # prints the ordered plan, no network
npm run cms:production-load                                    # the real run: shows the plan, asks you to type yes
```

What it does, per collection: schema dry run, schema apply, a read-only re-check that must say `unchanged` on every line, then the same three for the content. A step already reading `unchanged` is skipped, so rerunning is safe.

- **Order.** `site_settings` and `menus` first, alone: the run pauses for Enter after them (the first real run of the loaders against a live site), then `pricing_*`, `page_*`, `service_offerings`, `pages`, `photos` (schema only), `posts`, `case_studies` (the one EXISTING collection in the plan: PR 13 adds the hero fields to it, see "PR 13" below), `redirects` last. The list is read from `cms/schema/*.mjs` and `cms/content/*.json`, so PRs 12 to 14 are picked up with no edit.
- **`pages`** already exists in production from the template, so its schema step should print `updated field title`, `updated field content`, `added field` x7, `reorder fields`, `applied collection settings` (the PR 10 block). Every other collection must print only `added` or `created` lines the first time; an `updated field`, a `removed` or `dropped` field, a content `update`, or a menu `rebuild` of an existing menu stops the run before anything is written, because it would overwrite something an editor changed.
- **Stopping and resuming.** On a stop it prints the offending lines and the exact next command. Fix the cause, then `npm run cms:production-load -- --from <collection>`. `--only <collection>` runs one. The log is in `.cms-load-log/` (git-ignored, no secrets); paste it or let the main session read it.
- **Not automated, by design.** After a clean run it prints the follow-ups and does none of them: add the collections to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs`, re-export the seed with `scripts/export-seed-from-instance.mjs`, rebuild `ncs-ci`, then do each PR's before/after page comparison and edit proof below. Finally revoke the API token.
- It refuses to start without `EMDASH_TOKEN` and a stored `emdash login`, never prints the token, and spawns `apply-schema.mjs` and `load-content.mjs`, so their own production guard still applies. `--yes` skips the typed confirmation and is for tests only. It has not been run against production (no token in the build session); the first real run is Nathan's.

Take the "before" snapshots of the live pages (the `curl` lines in each block below) BEFORE running it, not after.

### PR 14: Admin tidy and the editing guide (run together with PR 13's data; not run)

PR 14 changes admin settings only, so the public site renders exactly as before (parity on `ncs-ci`: 14 of 14 pages PASS). What the main session does, after `npx emdash login --url https://www.nixoncreativestudio.com` (the login expires within hours; any read, for example `npx emdash content list pages --url https://www.nixoncreativestudio.com`, refreshes it):

1. `npm run cms:production-load -- --plan` lists the 18 steps. The collection-settings changes do not appear as separate lines in the plan; they appear in each collection's dry run.
2. `npm run cms:production-load`. New in the output, per collection (all other lines read `unchanged`): `would applied collection settings (group ...)` for site_settings, pricing_addons, pricing_tiers, the eight page_* collections, service_offerings, photos and case_studies (which also shows `would added field in_hero`, `would added field hero_order` and `would reorder fields` from PR 13). Each is applied once and the read-only re-check must read `unchanged collection settings`. `pages` and `posts` already read unchanged. The settings written: a `urlPattern` per collection (the admin's "live view" address), `sortOrder` 13 on `case_studies` and 15 on `photos`.
3. `npm run cms:tidy -- --url https://www.nixoncreativestudio.com --dry-run`, expect `would deleted taxonomy category (empty, unused by the site)` and `unchanged` for widget areas, sections and menus. Then the same command with `--yes` instead of `--dry-run`; a rerun prints `unchanged taxonomy category (already gone)`. It refuses (prints `skipped`) if the taxonomy has terms.
4. The checks: open Pages, Home page in the admin and press "live view": it must open `/` (it used to open `/page_home/home/`, a 404). Do the same on About, a Pricing tier (opens `/services/`), a Photo (opens `/photography/`). The sidebar order must read Site settings, Pages (nine entries), Pricing & services, Case Studies, Journal, Photography, Media.
5. Follow-ups: `node scripts/export-seed-from-instance.mjs --url https://www.nixoncreativestudio.com` (re-exports the seed with the live sortOrder and urlPattern values), `node scripts/ci-dataset/cms-fixtures.mjs`, commit the seed.

Rollback: every change is a collection setting or an empty taxonomy. Setting a `urlPattern` back to empty (Content Types, the collection's settings) restores the old guess; a deleted `category` taxonomy can be re-created in Taxonomies (it held nothing).

Nathan's acceptance test is the three practice edits in `docs/EDITING-GUIDE.md` (a price, a FAQ answer, the Currently block), done from the guide alone.

### PR 13: Redirects and the hero scene (needs `EMDASH_TOKEN` from Nathan; not run)

Production already holds every collection from PRs 4 to 12 (loaded with `npm run cms:production-load` on 2026-10-03; `photos` and `posts` are schema only). PR 13 shipped before a token was available for it, so production has neither the two new `case_studies` fields nor the two redirect rows. **The live site works without these steps and renders exactly as before:** the hero scene falls back to its five bundled sites (`bundledSites` in `src/components/HeroShowcase.astro`), and `/now` and `/work/west-chester-preschool` answered 301 from a temporary code fallback (since deleted, now that the redirect rows are live; the old `astro.config.mjs` redirects are gone). So the steps can run any time after the PR deploys, together with PR 14's.

What the loader will do (nothing here is run yet):

- `case_studies` **schema**: `unchanged field x` for the 32 existing fields (checked field by field against the live schema on 2026-10-03), `added field in_hero (boolean)`, `added field hero_order (integer)`, and `reorder fields` (production lists `results` before `testimonial_name` and `testimonial_title`; the definition has it after them, which only changes the order of the edit form). Any `updated field`, `removed`, or `dropped` line stops the run before anything is written.
- `case_studies` **content**: five `patch` entries (`cms/content/case_studies.json`): `second-presbyterian-chicago` 1, `theology-matters` 2, `stone-steps-50k` 3, `mas-monograms` 4, `presbyterian-academy` 5. The dry run prints `<slug>: would seed`; it sets ONLY a field the entry holds nothing for, so a rerun never undoes a hero choice Nathan makes in the admin (`<slug>: unchanged`). It never creates an entry.
- `redirects`: `redirect /now: would created`, `redirect /work/west-chester-preschool: would created`. Needs `EMDASH_TOKEN` (REST), like `menus`.

```powershell
npx emdash login --url https://www.nixoncreativestudio.com     # once, device code
$env:EMDASH_TOKEN = '<API token from Settings, API tokens>'    # needs EMDASH_TOKEN from Nathan; keep it in 1Password, never paste it into chat
npx wrangler d1 time-travel info ncs-emdash-prod               # read-only: note the timestamp (the restore point)
npm run cms:production-load -- --plan                          # everything else reads "already in place"; new: case_studies, redirects
npm run cms:production-load -- --only case_studies            # the new schema and the five hero patches
```

Only the new work, by hand (same checks, one collection at a time; all needs `EMDASH_TOKEN` from Nathan):

```bash
npm run cms:schema -- --all --check
npm run cms:schema -- --collection case_studies --url https://www.nixoncreativestudio.com --dry-run   # expect: unchanged x32, would added field in_hero, would added field hero_order, would reorder fields
npm run cms:schema -- --collection case_studies --url https://www.nixoncreativestudio.com --yes
npm run cms:schema -- --collection case_studies --url https://www.nixoncreativestudio.com --yes       # second run: every line "unchanged"
npm run cms:load -- --collection case_studies --url https://www.nixoncreativestudio.com --dry-run     # expect: five "would seed"
npm run cms:load -- --collection case_studies --url https://www.nixoncreativestudio.com --yes
npm run cms:load -- --collection case_studies --url https://www.nixoncreativestudio.com --yes         # second run: "unchanged"
npm run cms:load -- --collection redirects --url https://www.nixoncreativestudio.com --dry-run        # expect: two "would created"
npm run cms:load -- --collection redirects --url https://www.nixoncreativestudio.com --yes
npm run cms:load -- --collection redirects --url https://www.nixoncreativestudio.com --yes            # second run: two "unchanged"
```

Before the load save the live homepage and the two redirects: `curl -sL https://www.nixoncreativestudio.com/ > home-before.html`, `curl -s -D - -o /dev/null https://www.nixoncreativestudio.com/now/` and the same for `/work/west-chester-preschool/` (both `301`). After the load and a short wait (a publish purges the cached pages within seconds; five minutes at worst): both still answer `301` (now from EmDash: its Redirects screen shows hit counts), and `home-after.html` differs from `home-before.html` only in the hero scene's images (see docs/CMS-DESIGN.md, "PR 13 notes"). The five sites show in the same order with the same address-bar hosts.

**The edit proof (once, in the production admin).** Open a case study, untick "Show in the homepage device scene", publish, reload `/` within seconds (five minutes at worst) and see the scene without that site; tick it again and restore the order from History. Then add a redirect (Redirects, add `/ci-check` to `/work/`), request `/ci-check/` (301), and delete the redirect. This is the live proof that an admin redirect works.

**Done 2026-10-03: the code fallback is deleted.** The redirect rows are live, so the temporary `src/lib/redirectFallback.ts` (and its use in `src/worker.ts`) is gone; `cms/content/redirects.json` stays as the record. A redirect deleted in the admin now really stops working. The CI follow-ups: nothing to add to `PRODUCTION_HAS` (`case_studies` is already snapshotted, redirects come from the seed), but re-export the seed with the token so the seed carries the redirect rows: `node scripts/export-seed-from-instance.mjs --url https://www.nixoncreativestudio.com`, `node scripts/ci-dataset/cms-fixtures.mjs`, and review `git diff seed/seed.json`.

### PR 12: Journal into EmDash and the cleanup (needs `EMDASH_TOKEN` from Nathan; not run)

PR 12 shipped before any production write was possible, and production's CMS is still empty. The live site works without these steps: `/journal/` shows its "first entry is coming" card, the Journal link stays out of the header and footer menus, `/journal/<anything>/` answers 404, and `/rss.xml` is byte-identical to before (the code reads the template `posts` collection, which production already has and which holds no entries). What these steps do is turn the collection into the Journal in the admin (label "Journal", the `/journal/{slug}/` address, an `updated` field, a required 200-character summary, the `seo` support the sitemap needs) and un-hide it. There is no content to load: Nathan writes entries by hand in the admin, so there is no `cms:load` step and `posts` is not in the CI snapshot.

`npm run cms:production-load` (above) already includes this step: it plans `posts` after `photos`, lists `posts` first (expect no entries), and treats `updated field title`, `content` and `excerpt` as expected (as it does for `pages`), because `posts` exists from the template. It has no content step. The commands below are the same step typed by hand, with the before-and-after checks and the edit proof.

```bash
npx emdash login --url <prod>                       # once, device code
export EMDASH_TOKEN=...                             # needs EMDASH_TOKEN from Nathan: Settings, API tokens (keep in 1Password)
npx emdash content list posts --url <prod>          # expect: no entries. If the template left a post, delete it in the admin first
npm run cms:schema -- --all --check
npm run cms:schema -- --collection posts --url <prod> --dry-run   # expect: updated field title, content and excerpt (labels, excerpt now required with a 200 limit), added field updated, reorder fields, applied collection settings (label, supports, urlPattern, hidden, sortOrder, titleField)
npm run cms:schema -- --collection posts --url <prod> --yes
npm run cms:schema -- --collection posts --url <prod> --yes       # second run: every line "unchanged"
```

Before the schema run save the live pages and feed: `for p in journal about; do curl -sL <prod>/$p/ > $p-before.html; done`, `curl -s <prod>/rss.xml > rss-before.xml`, `curl -s <prod>/sitemap-index.xml > sitemap-index-before.xml`. After the run and a short wait (a publish purges the cached pages within seconds; five minutes at worst): `/journal/` and `/about/` must match their "before" files (the Journal card still shows, the Journal link is still absent from the menus), `rss.xml` must be byte-identical, `curl -s <prod>/sitemap-posts.xml` must print a valid empty `<urlset>` (HTTP 200), and `curl -s -o /dev/null -w '%{http_code}\n' <prod>/journal/no-such-entry/` must print 404. The new deploy changes the sitemap index in one way only: it now also lists `sitemap-posts.xml` (valid and empty until an entry is published), so resubmit `sitemap-index.xml` in Search Console once.

**The edit proof (do it once, in the production admin).** Nothing below is automated and none of it should be run until the code is on production.

1. In `/_emdash/admin`, open Journal and add an entry with a title, a summary, a cover image (optional) and a short body with one Heading 2, one list and one code block. Save it as a DRAFT. Request `<prod>/journal/<its-slug>/` (it must answer 404), then check the draft is absent from `<prod>/journal/`, `<prod>/rss.xml`, `<prod>/sitemap-posts.xml` and the menus. This is the live proof that a draft is never visible.
2. Publish it. Within seconds (the route cache is purged by tag; five minutes at worst): `/journal/` lists it with its date and reading time, `/journal/<slug>/` renders, the Journal link appears in the header and footer on any page (for example `/about/`), `/rss.xml` carries it and `/sitemap-posts.xml` lists `/journal/<slug>/` with a trailing slash. Run the entry page through axe or Lighthouse accessibility in both themes.
3. Unpublish it (or delete it) and confirm the Journal link, the list entry, the feed item and the sitemap row all go away within seconds (five minutes at worst) and `/journal/` is back to its card.
4. Its share card (`/og/journal/<slug>.png`) only exists for entries published before the last deploy, because `scripts/generate-og.mjs` runs at build time. To make a new entry's card appear, re-run the latest Workers Build (or push any commit to `main`); until then the entry's share preview shows no image.

Not done in this PR, on purpose: deleting the unused template `category` taxonomy (the design puts it in PR 14; it is empty and attached to `posts` only), and the admin sidebar ordering. If a real entry needs a picture inside the body, say so: pictures, tables and embeds in a journal body are not drawn yet (docs/EMDASH.md, "Journal").

### PR 11: Work, Photography, Journal, Not-found pages and Photos (needs `EMDASH_TOKEN` from Nathan; not run)

PR 11 shipped before any production write was possible, and production's CMS is still empty. The live site works without these steps: /work, /photography, /journal and the 404 page render from the committed `cms/content/page_work.json`, `page_photography.json`, `page_journal.json` and `page_not_found.json`, and /photography shows its "In progress" state because production has zero photos (the page treats an empty collection, a read error and a missing `photos` table alike). These steps create the four page screens and the Photos list in the admin. No files upload and `photos` has no content to load: Nathan adds photos by hand afterwards.

```bash
npx emdash login --url <prod>                       # once, device code
export EMDASH_TOKEN=...                             # needs EMDASH_TOKEN from Nathan: Settings, API tokens (keep in 1Password)
npm run cms:schema -- --all --check
npm run cms:schema -- --collection page_work --url <prod> --dry-run          # expect: would created collection, would added field x10
npm run cms:schema -- --collection page_work --url <prod> --yes
npm run cms:schema -- --collection page_work --url <prod> --yes              # second run: every line "unchanged"
npm run cms:schema -- --collection page_photography --url <prod> --dry-run   # expect: would created collection, would added field x15
npm run cms:schema -- --collection page_photography --url <prod> --yes
npm run cms:schema -- --collection page_photography --url <prod> --yes       # second run: every line "unchanged"
npm run cms:schema -- --collection page_journal --url <prod> --dry-run       # expect: would created collection, would added field x9
npm run cms:schema -- --collection page_journal --url <prod> --yes
npm run cms:schema -- --collection page_journal --url <prod> --yes           # second run: every line "unchanged"
npm run cms:schema -- --collection page_not_found --url <prod> --dry-run     # expect: would created collection, would added field x6
npm run cms:schema -- --collection page_not_found --url <prod> --yes
npm run cms:schema -- --collection page_not_found --url <prod> --yes         # second run: every line "unchanged"
npm run cms:schema -- --collection photos --url <prod> --dry-run             # expect: would created collection, would added field x9
npm run cms:schema -- --collection photos --url <prod> --yes
npm run cms:schema -- --collection photos --url <prod> --yes                 # second run: every line "unchanged"
npm run cms:load -- --collection page_work --url <prod> --dry-run            # expect: would create work
npm run cms:load -- --collection page_work --url <prod> --yes
npm run cms:load -- --collection page_photography --url <prod> --dry-run     # expect: would create photography
npm run cms:load -- --collection page_photography --url <prod> --yes
npm run cms:load -- --collection page_journal --url <prod> --dry-run         # expect: would create journal
npm run cms:load -- --collection page_journal --url <prod> --yes
npm run cms:load -- --collection page_not_found --url <prod> --dry-run       # expect: would create not-found
npm run cms:load -- --collection page_not_found --url <prod> --yes
# second run of each load: "unchanged"
```

Before the first load save the live pages: `for p in work photography journal; do curl -sL <prod>/$p/ > $p-before.html; done`, and `curl -s -o 404-before.html -w '%{http_code}\n' <prod>/no-such-page-check/` (it must print 404). After the load and a short wait (a publish purges the cached pages within seconds; five minutes at worst) each page must match its "before" file except for the `&#39;` apostrophe entity in the sentences that now print from the CMS (and the `/work/` count and cards, which follow the case studies); the unknown URL must still answer 404. The edit proofs: in `/_emdash/admin`, Photography page, change the headline's accent phrase, publish, reload /photography within seconds (five minutes at worst), restore from History; then add the first real photo under Photography, Photos (upload, description for screen readers, group, year), publish, and see /photography switch from "In progress" to the gallery within seconds (five minutes at worst), then run the page through axe or Lighthouse accessibility once with the gallery scrolled into view. Not-found page: change the first link's words, publish, request an unknown URL and see the new words with status 404, restore from History. Then add `page_work`, `page_photography`, `page_journal` and `page_not_found` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs` (keep `photos` out: CI's test photo is hand-written in `scripts/ci-dataset/ci-content/photos.json`) and re-export the seed and rebuild `ncs-ci` as in docs/CMS-DESIGN.md 2.1 step 4.

### PR 10: Privacy, Accessibility and Colophon (needs `EMDASH_TOKEN` from Nathan; not run)

PR 10 shipped before any production write was possible, and production's CMS is still empty. The live site works without these steps: /privacy, /accessibility and /colophon render from the committed `cms/content/pages.json`. These steps extend the EmDash template's existing `pages` collection (it already holds Title and Content) and create the three entries. No files upload.

```bash
npx emdash login --url <prod>                       # once, device code
export EMDASH_TOKEN=...                             # needs EMDASH_TOKEN from Nathan: Settings, API tokens (keep in 1Password)
npx emdash content list pages --url <prod>          # note any existing entries first
npm run cms:schema -- --all --check
npm run cms:schema -- --collection pages --url <prod> --dry-run   # expect: updated field title, updated field content, added field x7, reorder fields, applied collection settings
npm run cms:schema -- --collection pages --url <prod> --yes
npm run cms:schema -- --collection pages --url <prod> --yes       # second run: every line "unchanged"
npm run cms:load -- --collection pages --url <prod> --dry-run     # expect: would create privacy, accessibility, colophon
npm run cms:load -- --collection pages --url <prod> --yes
npm run cms:load -- --collection pages --url <prod> --yes         # second run: "unchanged"
```

Before the first load save the live pages: `for p in privacy accessibility colophon; do curl -sL <prod>/$p/ > $p-before.html; done`. After the load and a short wait (a publish purges the cached pages within seconds; five minutes at worst) each page should match its "before" file except for the three explained differences in docs/CMS-DESIGN.md "PR 10 notes" (developer comments, the shared script, `data-prose-toc`) and the colophon's "Last built" month. The edit proof: in `/_emdash/admin`, Other pages, Privacy, change one sentence in "Cookies" and set "Last updated" to today, publish, reload /privacy within seconds (five minutes at worst), restore from History. Then add `pages` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs` and re-export the seed and rebuild `ncs-ci` as in docs/CMS-DESIGN.md 2.1 step 4.

### PR 9: Contact page (needs `EMDASH_TOKEN` from Nathan; not run)

PR 9 shipped before any production write was possible, and production's CMS is still empty. The live site works without these steps: `/contact` renders from the committed `cms/content/page_contact.json`, and the form already submits labels (that part is code). These steps create the Contact page screen in the admin. No files upload.

```bash
npx emdash login --url <prod>                       # once, device code
export EMDASH_TOKEN=...                             # needs EMDASH_TOKEN from Nathan: Settings, API tokens (keep in 1Password)
npm run cms:schema -- --all --check
npm run cms:schema -- --collection page_contact --url <prod> --dry-run   # expect: would created collection, would added field x13
npm run cms:schema -- --collection page_contact --url <prod> --yes
npm run cms:schema -- --collection page_contact --url <prod> --yes       # second run: every line "unchanged"
npm run cms:load -- --collection page_contact --url <prod> --dry-run     # expect: would create contact
npm run cms:load -- --collection page_contact --url <prod> --yes
npm run cms:load -- --collection page_contact --url <prod> --yes         # second run: "unchanged"
```

Before the first load save the live page: `curl -sL <prod>/contact/ > contact-before.html`. After the load and a short wait (a publish purges the cached pages within seconds; five minutes at worst), the page should match it exactly. The edit proof: in `/_emdash/admin`, Contact page, rename one Budget choice, publish, reload /contact within seconds (five minutes at worst) (the select shows the new text and its option value is the same text), restore from History. The one step only Nathan can do, a real inquiry showing the three labels in the email, is in docs/PENDING.md. Then add `page_contact` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs` and re-export the seed and rebuild `ncs-ci` as in docs/CMS-DESIGN.md 2.1 step 4.

### PR 8: About page (needs `EMDASH_TOKEN` from Nathan; not run)

PR 8 shipped before any production write was possible, and production's CMS is still empty. The live site works without these steps: `/about` renders from the committed `cms/content/page_about.json` and the bundled pictures. These steps create the About page screen in the admin and upload the six pictures to R2.

```bash
npx emdash login --url <prod>                       # once, device code
export EMDASH_TOKEN=...                             # needs EMDASH_TOKEN from Nathan: Settings, API tokens (keep in 1Password)
npm run cms:schema -- --all --check
npm run cms:schema -- --collection page_about --url <prod> --dry-run   # expect: would created collection, would added field x35
npm run cms:schema -- --collection page_about --url <prod> --yes
npm run cms:schema -- --collection page_about --url <prod> --yes       # second run: every line "unchanged"
npm run cms:load -- --collection page_about --url <prod> --dry-run     # expect: would upload 6 images, would create about
npm run cms:load -- --collection page_about --url <prod> --yes         # uploads headshot.jpg and five photos, then creates and publishes
npm run cms:load -- --collection page_about --url <prod> --yes         # second run: "unchanged", nothing uploaded
```

Before the first load save the live structured data and page: `curl -sL <prod>/about/ > about-before.html`. After the load and a short wait (a publish purges the cached pages within seconds; five minutes at worst), check: the six `<img>` now start with `/_image?href=https%3A%2F%2F...%2F_emdash%2Fapi%2Fmedia%2Ffile%2F` and each answers `content-type: image/webp` to `curl -s -D - -o /dev/null <url>`; the Person JSON-LD block is unchanged; everything else in the HTML matches the before file apart from the `<img>` tags. The edit proof: in `/_emdash/admin`, About page, change a Working on line, set "Currently last updated" to today, publish, reload /about within seconds (five minutes at worst), restore from History.

### PR 7: Services page and service offerings (needs `EMDASH_TOKEN` from Nathan; not run)

PR 7 shipped before any production write was possible, and production's CMS is still empty. The live site works without these steps: `/services` renders from the committed `cms/content/page_services.json` and `service_offerings.json`, byte-for-byte what it showed before (its structured data included), so they can run any time after the PR deploys, independent of PRs 4 to 6. Stop on any surprise in a dry run. `<prod>` is `https://www.nixoncreativestudio.com`.

```bash
npx emdash login --url <prod>                       # once, device code
export EMDASH_TOKEN=...                             # needs EMDASH_TOKEN from Nathan: Settings, API tokens (keep in 1Password)
npm run cms:schema -- --all --check
npm run cms:schema -- --collection page_services --url <prod> --dry-run      # expect: would created collection, would added field x17
npm run cms:schema -- --collection page_services --url <prod> --yes
npm run cms:schema -- --collection page_services --url <prod> --yes          # second run: every line "unchanged"
npm run cms:schema -- --collection service_offerings --url <prod> --dry-run  # expect: would created collection, would added field x9
npm run cms:schema -- --collection service_offerings --url <prod> --yes
npm run cms:schema -- --collection service_offerings --url <prod> --yes      # second run: every line "unchanged"
npm run cms:load -- --collection page_services --url <prod> --dry-run        # expect: would create services
npm run cms:load -- --collection page_services --url <prod> --yes
npm run cms:load -- --collection service_offerings --url <prod> --dry-run    # expect: would create strategy, web-design, photography
npm run cms:load -- --collection service_offerings --url <prod> --yes
npm run cms:load -- --collection page_services --url <prod> --yes            # second run: "unchanged"
npm run cms:load -- --collection service_offerings --url <prod> --yes        # second run: "unchanged"
```

Before the first load, save the live structured data: `curl -s <prod>/services/ | grep -o '<script type="application/ld+json">[^<]*</script>' > jsonld-before.txt`. After the load and a short wait (a publish purges the cached pages within seconds; five minutes at worst), save it again and `cmp` the two files: they must be identical (the Strategy $1,500 and Photography $900 floors are now `service_offerings.price_from`, so a typo there would show up here). Then CI: add `'page_services'` and `'service_offerings'` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs`, `node scripts/export-seed-from-instance.mjs --url <prod>` (token), `node scripts/ci-dataset/cms-fixtures.mjs`, `npm run ci-dataset -- --from-scratch`, `npm run ci-dataset:snapshot`, `npm run ci-dataset`, commit. Finally the edit proof: change the first FAQ answer in Services page, publish, reload `/services/` within seconds (five minutes at worst), restore from History; and run the live URL through Google's Rich Results test (screenshot).

### PR 6: Home page copy (needs `EMDASH_TOKEN` from Nathan; not run)

PR 6 shipped before any production write was possible. The live site works without these steps: the hero, the Selected Work, pricing and process copy, and the title and meta description render from the committed `cms/content/page_home.json`, the same words as before (the one visible difference is the homepage meta description, which was the bare studio name and is now the tagline; CMS-DESIGN 2.5, PR 6 notes). So the steps can run any time after the PR deploys, independent of PRs 4 and 5. Stop on any surprise in a dry run. `<prod>` is `https://www.nixoncreativestudio.com`.

```bash
npx emdash login --url <prod>                       # once, device code
export EMDASH_TOKEN=...                             # Settings, API tokens (keep in 1Password)
npm run cms:schema -- --all --check
npm run cms:schema -- --collection page_home --url <prod> --dry-run   # expect: would created collection, would added field x25
npm run cms:schema -- --collection page_home --url <prod> --yes
npm run cms:schema -- --collection page_home --url <prod> --yes       # second run: every line "unchanged"
npm run cms:load -- --collection page_home --url <prod> --dry-run     # expect: would create home
npm run cms:load -- --collection page_home --url <prod> --yes
npm run cms:load -- --collection page_home --url <prod> --yes         # second run: "unchanged"
```

Then switch CI to read the real row: add `'page_home'` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs` (and the PR 4 and PR 5 collections if their data is already loaded), run `node scripts/export-seed-from-instance.mjs --url <prod>` (needs the token), `node scripts/ci-dataset/cms-fixtures.mjs`, `npm run ci-dataset -- --from-scratch`, `npm run ci-dataset:snapshot`, `npm run ci-dataset`, and commit `seed/seed.json`, `rows.sql`, `cms-rows.sql`, `media.json`. Finally the edit proof: in `/_emdash/admin`, open Home page, change the headline's coloured part (Headline, the coloured last part) from "pull their weight." to anything, publish, reload `/` within seconds (five minutes at worst) and see it in the hero, then restore it from History. Check the Services page too: its "How we work" steps are the same fields.

### PR 5: Pricing tiers and add-ons (needs `EMDASH_TOKEN` from Nathan; not run)

PR 5 shipped before any production write was possible. The live site works without these steps (the homepage teaser and /services render from the committed `cms/content/pricing_*.json`, the same numbers as before), so they can run any time after the PR deploys, independent of PR 4's data. Stop on any surprise in a dry run. `<prod>` is `https://www.nixoncreativestudio.com`.

```bash
npx emdash login --url <prod>                       # once, device code
export EMDASH_TOKEN=...                             # Settings, API tokens (keep in 1Password)
npm run cms:schema -- --all --check
npm run cms:schema -- --collection pricing_tiers --url <prod> --dry-run   # expect: would created collection, would added field x10
npm run cms:schema -- --collection pricing_tiers --url <prod> --yes
npm run cms:schema -- --collection pricing_tiers --url <prod> --yes       # second run: every line "unchanged"
npm run cms:schema -- --collection pricing_addons --url <prod> --dry-run  # expect: would created collection, would added field x4
npm run cms:schema -- --collection pricing_addons --url <prod> --yes
npm run cms:schema -- --collection pricing_addons --url <prod> --yes      # second run: every line "unchanged"
npm run cms:load -- --collection pricing_tiers --url <prod> --dry-run     # expect: would create launch, signature, flagship
npm run cms:load -- --collection pricing_tiers --url <prod> --yes
npm run cms:load -- --collection pricing_addons --url <prod> --dry-run    # expect: would create photography, brand-strategy, care-plan
npm run cms:load -- --collection pricing_addons --url <prod> --yes
npm run cms:load -- --collection pricing_tiers --url <prod> --yes         # second run: "unchanged"
npm run cms:load -- --collection pricing_addons --url <prod> --yes        # second run: "unchanged"
```

Then switch CI to read the real rows: add `'pricing_tiers'` and `'pricing_addons'` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs` (and `'site_settings'` if PR 4's data is already loaded), run `node scripts/export-seed-from-instance.mjs --url <prod>` (needs the token), `node scripts/ci-dataset/cms-fixtures.mjs`, `npm run ci-dataset -- --from-scratch`, `npm run ci-dataset:snapshot`, `npm run ci-dataset`, and commit `seed/seed.json`, `rows.sql`, `cms-rows.sql`, `media.json`. Finally the edit proof: in `/_emdash/admin`, open Pricing tiers, change Launch's starting price (4000 to 4100), publish, reload `/services/` and `/` within seconds (five minutes at worst) and see $4,100 (and the Web design JSON-LD floor), then restore it from History. The prices here also appear in prose that stays in code until PRs 7 and 9 (the /services FAQ answer "What does it cost?" and the /contact budget brackets), so a real price change is three edits, not one.

### PR 4: Site settings and menus (needs `EMDASH_TOKEN` from Nathan; not run)

PR 4 shipped before any production write was possible. The live site works without these steps (it renders from the committed fallback in `cms/content/`), so they can run any time after the PR deploys, in this order. They are the first real run of the schema applier and loader (docs/PENDING.md row 7), so start with the dry runs and stop on any surprise. Menus and the schema go through REST and need the token; the entry goes through the CLI login. `<prod>` is `https://www.nixoncreativestudio.com`.

```bash
npx emdash login --url <prod>
export EMDASH_TOKEN=...        # Nathan: Settings, API tokens

# 1. note the time for a rollback point: npx wrangler d1 time-travel info ncs-emdash-prod
# 2. schema
npm run cms:schema -- --all --check
npm run cms:schema -- --collection site_settings --url <prod> --dry-run   # all "would ..."
npm run cms:schema -- --collection site_settings --url <prod> --yes
npm run cms:schema -- --collection site_settings --url <prod> --yes       # all "unchanged"
# 3. content: the entry, then the two menus
npm run cms:load -- --collection site_settings --url <prod> --dry-run
npm run cms:load -- --collection site_settings --url <prod> --yes
npm run cms:load -- --collection menus --url <prod> --dry-run
npm run cms:load -- --collection menus --url <prod> --yes
npm run cms:load -- --collection site_settings --url <prod> --yes         # "unchanged"
npm run cms:load -- --collection menus --url <prod> --yes                 # "unchanged"
```

Then CI: add `'site_settings'` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs`, `node scripts/export-seed-from-instance.mjs --url <prod>` (token; it now emits the collection and both menus, so check the `git diff seed/seed.json` is only formatting), `node scripts/ci-dataset/cms-fixtures.mjs`, `npm run ci-dataset -- --from-scratch`, `npm run ci-dataset:snapshot`, `npm run ci-dataset`, commit. Finally the edit proof: change "Footer Currently line" in Site settings, publish, reload a page within 5 minutes, restore from History. If the live site shows no change at all after the load, the first suspect is the entry's `status` (it must be published) and then the `[cms]` lines in Workers observability.
