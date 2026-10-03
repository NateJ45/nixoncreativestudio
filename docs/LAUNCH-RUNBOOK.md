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
4. Remove what the CMS replaces: `src/content/case-studies/*.mdx`, the `case-studies`
   collection in `src/content.config.ts`, the placeholder pipeline
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

Once per session: `npx emdash login --url https://www.nixoncreativestudio.com` (device code, Nathan approves in his browser) and `export EMDASH_TOKEN=<API token from Settings, API tokens>`.

1. Record a rollback point: note the time, so `wrangler d1 time-travel restore ncs-emdash-prod --timestamp <iso>` is ready if a bulk step goes wrong.
2. Check the definitions offline: `npm run cms:schema -- --all --check`.
3. Look before writing: `npm run cms:schema -- --collection <collection> --url https://www.nixoncreativestudio.com --dry-run`. Every line should read `would added field ...` on a first run.
4. Apply the schema: the same command with `--yes` instead of `--dry-run`. Run it a second time; every line must read `unchanged`.
5. Look at the content: `npm run cms:load -- --collection <collection> --url https://www.nixoncreativestudio.com --dry-run`.
6. Load it: the same command with `--yes`. A second run must report `unchanged` for every entry. Menus and redirects: `npm run cms:load -- --collection menus --url ... --yes` and `--collection redirects`.
7. Re-export the seed and rebuild `ncs-ci` as in docs/CMS-DESIGN.md 2.1 step 4 (`node scripts/export-seed-from-instance.mjs --url https://www.nixoncreativestudio.com`, then `npm run ci-dataset -- --from-scratch`, `npm run ci-dataset:snapshot`, `npm run ci-dataset`).
8. After the PR deploys: the edit proof from CMS-DESIGN 2.1 (change a field, publish, see it live, restore from History).

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

Before the first load save the live structured data and page: `curl -sL <prod>/about/ > about-before.html`. After the load and a five-minute wait, check: the six `<img>` now start with `/_image?href=https%3A%2F%2F...%2F_emdash%2Fapi%2Fmedia%2Ffile%2F` and each answers `content-type: image/webp` to `curl -s -D - -o /dev/null <url>`; the Person JSON-LD block is unchanged; everything else in the HTML matches the before file apart from the `<img>` tags. The edit proof: in `/_emdash/admin`, About page, change a Working on line, set "Currently last updated" to today, publish, reload /about within five minutes, restore from History.

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

Before the first load, save the live structured data: `curl -s <prod>/services/ | grep -o '<script type="application/ld+json">[^<]*</script>' > jsonld-before.txt`. After the load and a five-minute wait, save it again and `cmp` the two files: they must be identical (the Strategy $1,500 and Photography $900 floors are now `service_offerings.price_from`, so a typo there would show up here). Then CI: add `'page_services'` and `'service_offerings'` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs`, `node scripts/export-seed-from-instance.mjs --url <prod>` (token), `node scripts/ci-dataset/cms-fixtures.mjs`, `npm run ci-dataset -- --from-scratch`, `npm run ci-dataset:snapshot`, `npm run ci-dataset`, commit. Finally the edit proof: change the first FAQ answer in Services page, publish, reload `/services/` within five minutes, restore from History; and run the live URL through Google's Rich Results test (screenshot).

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

Then switch CI to read the real row: add `'page_home'` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs` (and the PR 4 and PR 5 collections if their data is already loaded), run `node scripts/export-seed-from-instance.mjs --url <prod>` (needs the token), `node scripts/ci-dataset/cms-fixtures.mjs`, `npm run ci-dataset -- --from-scratch`, `npm run ci-dataset:snapshot`, `npm run ci-dataset`, and commit `seed/seed.json`, `rows.sql`, `cms-rows.sql`, `media.json`. Finally the edit proof: in `/_emdash/admin`, open Home page, change the headline's coloured part (Headline, the coloured last part) from "pull their weight." to anything, publish, reload `/` within five minutes and see it in the hero, then restore it from History. Check the Services page too: its "How we work" steps are the same fields.

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

Then switch CI to read the real rows: add `'pricing_tiers'` and `'pricing_addons'` to `PRODUCTION_HAS` in `scripts/ci-dataset/cms-fixtures.mjs` (and `'site_settings'` if PR 4's data is already loaded), run `node scripts/export-seed-from-instance.mjs --url <prod>` (needs the token), `node scripts/ci-dataset/cms-fixtures.mjs`, `npm run ci-dataset -- --from-scratch`, `npm run ci-dataset:snapshot`, `npm run ci-dataset`, and commit `seed/seed.json`, `rows.sql`, `cms-rows.sql`, `media.json`. Finally the edit proof: in `/_emdash/admin`, open Pricing tiers, change Launch's starting price (4000 to 4100), publish, reload `/services/` and `/` within five minutes and see $4,100 (and the Web design JSON-LD floor), then restore it from History. The prices here also appear in prose that stays in code until PRs 7 and 9 (the /services FAQ answer "What does it cost?" and the /contact budget brackets), so a real price change is three edits, not one.

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
