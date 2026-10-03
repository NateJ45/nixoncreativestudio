# ci-dataset

Scripts that keep the CI dataset (D1 `ncs-ci`, R2 `ncs-ci-media`, Worker `ncs-ci`) in line with a committed snapshot of production content, so it can be refreshed or rebuilt from nothing without hand-copied SQL. Design: `docs/CMS-DESIGN.md` section 2.3. How CI uses the dataset: `docs/TESTING.md`.

## What is here

| File                     | Role                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `snapshot.mjs`           | Reads production through the `emdash` CLI login and writes `rows.sql` and `media.json`. Read-only.         |
| `rebuild.mjs`            | Applies the snapshot to the CI resources. Refresh by default, `--from-scratch` to rebuild.                 |
| `lib.mjs`                | Shared helpers. The only place that can write, and it can only reach the `ncs-ci` resources.               |
| `rows.sql`, `media.json` | GENERATED, committed. Do not edit by hand.                                                                 |
| `terms.json`             | Hand-edited. Which taxonomy terms each CI case study carries (the CLI cannot read per-entry terms).        |
| `fixtures.sql`           | Hand-written. The options the site needs plus test-only rows production should not carry (photo, journal). |

## Commands

```bash
npm run ci-dataset                 # refresh: apply rows.sql + fixtures.sql, copy R2 files, verify
npm run ci-dataset -- --dry-run    # print the plan, change nothing
npm run ci-dataset -- --from-scratch
npm run ci-dataset:snapshot        # re-read production, rewrite rows.sql + media.json
npm run ci-dataset:snapshot -- --check   # exit 1 if the committed snapshot is out of date
```

You need `wrangler login` as an account that owns the ncs-ci resources, and the `emdash` CLI logged in to production (`npx emdash login --url https://www.nixoncreativestudio.com`) for the snapshot only. The refresh needs no production login: it fetches media from the live site's public URLs.

## When to run which

- **Normal day:** nothing. CI reads the pinned snapshot. Edits Nathan makes in the production admin never reach CI.
- **A CMS PR adds a collection or needs new test content:** re-export the seed (`node scripts/export-seed-from-instance.mjs --url https://www.nixoncreativestudio.com`), run `npm run ci-dataset -- --from-scratch`, then `npm run ci-dataset:snapshot`, then `npm run ci-dataset` again and commit `seed/seed.json`, `rows.sql`, `media.json`. A plain refresh cannot apply a seed change: it stops with "ncs-ci has no table ..." and tells you to use `--from-scratch`.
- **CI data looks wrong or empty:** `npm run ci-dataset` (refresh). It is idempotent, so run it as often as you like.

## --from-scratch, step by step

1. Drops every table in `ncs-ci` (children before the tables they reference, FTS virtual tables first).
2. `CLOUDFLARE_ENV=ci npm run build` then `npx wrangler deploy` of the `ci` Worker.
3. One GET of `/` so EmDash runs its migrations and applies `seed/seed.json`.
4. The refresh below.

**While it runs, CI previews have no data.** Do not start it while a PR is mid-CI.

## What a refresh does

1. Checks every table named in `rows.sql` exists in `ncs-ci`.
2. Runs `rows.sql` (deletes of rows not in the snapshot, then `INSERT OR REPLACE` for media, taxonomy terms, content rows and term links), then `fixtures.sql`.
3. For each file in `media.json`: skips it when `ncs-ci-media` already holds an object of the same key and size, otherwise downloads it from `https://www.nixoncreativestudio.com/_emdash/api/media/file/<key>`, checks size and SHA-1 against `media.json`, and uploads it.
4. GETs `/`, `/work/`, every CI case study, and every media file through the CI Worker, and exits 1 on any miss.

## Safety

- Nothing here can write to production. `lib.mjs` has no helper for production D1 or R2, refuses any D1 name other than `ncs-ci`, and checks `wrangler.jsonc` `env.ci` still names the same resources before running.
- Production is read only through the `emdash` CLI login and public media URLs.
- Media keep production's storage keys, so an R2 copy is a straight copy under the same key. The 15 objects the hand-built dataset had under its own keys were deleted once, by hand, after the first from-scratch rebuild.
- Never run `wrangler deploy` without `CLOUDFLARE_ENV=ci`. `--from-scratch` sets it for you.

## Adding a case study to CI

1. Add the slug to `CASE_STUDY_SLUGS` in `snapshot.mjs`, and an entry to `terms.json`.
2. Add the slug to `caseStudySlugs` in `tests/routes.ts`.
3. `npm run ci-dataset:snapshot`, then `npm run ci-dataset`.

## Adding a collection to the snapshot

The design's singleton and list collections are already in `SNAPSHOT_ALL` in `snapshot.mjs` and are skipped (with a note in `rows.sql`) until they exist in production. A collection not listed there needs one line added. Fixtures for collections production should not carry (`photos`, journal `posts`) go in `fixtures.sql`.

## Known limits

- Taxonomy links are pinned in `terms.json` because the CLI cannot read per-entry terms. If a case study's tags change in production, CI keeps the old ones until `terms.json` is edited.
- `emdash:site_id` and `emdash:seed_complete` are minted by EmDash on first run, so a `--from-scratch` gives the dataset a new site id. Nothing depends on it.
- The refresh deletes case study rows that are not in the snapshot, but leaves unrelated tables (comments, 404 log, schedulers) alone.
