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
