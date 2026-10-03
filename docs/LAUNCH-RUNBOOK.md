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
