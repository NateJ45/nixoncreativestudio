# Content production-load plan (redesign 2026, content branch)

Written 2026-10-04 by the content agent on branch `redesign-content`. **Every command below is for Nathan to run himself, in his own PowerShell. No agent runs any of them, dry runs included.** One `pages` load already ran by accident (see "Incident" at the end); nothing else has. Production data steps are Nathan's, dry run first (CLAUDE.md rule 5). Since commit c631a66 a production write needs `--yes` AND `$env:NCS_PRODUCTION_WRITE = 'yes'`; `npm run cms:production-load` sets that variable itself after its typed "yes", and the by-hand `cms:load` steps below set it for one command and clear it straight after. The commands below are the only writes this branch needs; each step says what its dry run should print, so anything else is a reason to stop.

## STATUS: DONE on 2026-10-04

Run by the lead session with Nathan present and instructing it, after the redesign deployed (squash commit 795f672). Restore point recorded first: D1 bookmark 00000036-0000001c-000050fa-18258faede5d8fce088567d652a8bf6b. The CLI login was refreshed (device code approved by Nathan), every collection was dry-run first, applied with NCS_PRODUCTION_WRITE=yes, and re-checked with a dry run that read "unchanged".

- Schema added: `site_settings.price_range`, `case_studies.launch_status`, `case_studies.preview_url` (plus a field reorder).
- Content updated: site_settings, pricing_addons (brand-strategy), pricing_tiers (3), page_about, page_contact, page_home, page_journal, page_not_found, page_photography, page_services, page_work, service_offerings (strategy, web-design), pages (the three landing entries), case_studies (all nine: status, first person, honest outcomes, FBCM as launching soon).
- Afterwards: Reid Design designer note replaced (it praised a before/after slider that no longer exists on the live site); live pages verified read-only (home title, status labels, JSON-LD priceRange, feed title, no "every project is a real, shipped site" line).
- Not done (admin only, left for Nathan, low urgency): the FBCM media library still holds the Wix-era cover (the page itself shows the new-build captures bundled in code); the Wix stack terms on FBCM; Reid body text beyond the designer note; a read of the Academy and Second Pres bodies; the redirects and `cms:tidy` steps of the older PR 13 and 14 loads were not part of this run.

## What this branch changes in the CMS

Schema (three optional fields, rule 13, so existing entries keep working):

- `case_studies.launch_status`: select `live`, `launching-soon`, `in-progress`, `built-not-launched`. Empty reads as live. The reader (`src/lib/launchStatus.ts`) hides the live link, the showcase link and the hero place of any study that is not live.
- `case_studies.preview_url`: url. Used as the visit link ONLY while the status is `launching-soon` (FBCM: https://fbcm-site.nathanjnixon86.workers.dev/, Nathan 2026-10-04).
- `site_settings.price_range`: string, max 40, read only by the JSON-LD (`priceRange`). Value `From $900`.

Content (the committed fallback in `cms/content/`):

- Twelve files carry the copy rewrites from `D-copy-positioning.md`: `site_settings`, `page_home`, `page_about`, `page_services`, `service_offerings`, `pricing_tiers`, `pricing_addons`, `page_work`, `page_photography`, `page_journal`, `page_not_found`, `page_contact`, plus one sentence in `pages` (Privacy: "Cloudflare Pages" is now "Cloudflare Workers").
- `case_studies.json` holds patch entries for all nine studies. A patch may now carry `set` (a deliberate overwrite) and `rewrite` (find and replace that fires only while the old words are still there; a field you have edited since is left alone and named in a note). See `scripts/lib/cms-load.mjs`, `planPatch`.

| Study                            | Status set         | Featured | Hero    | What changes                                                                                                                                                                                                          |
| -------------------------------- | ------------------ | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| stone-steps-50k                  | (live)             | as is    | order 1 | "we built" to "I built" style rules only                                                                                                                                                                              |
| theology-matters                 | (live)             | as is    | order 2 | first person; "professional-sounding audio version" to "AI-narrated audio version (ElevenLabs)"                                                                                                                       |
| mas-monograms                    | (live)             | as is    | order 3 | first person                                                                                                                                                                                                          |
| foundation-for-reformed-theology | (live)             | as is    | not set | first person                                                                                                                                                                                                          |
| first-presbyterian-orangeburg    | (live)             | off      | not set | designer note: "the coordination time dropped a lot." becomes "the office had a real record to work from instead of an inbox."                                                                                        |
| second-presbyterian-chicago      | built-not-launched | off      | off     | outcome and the four "What changed" results rewritten to what is true; first person                                                                                                                                   |
| presbyterian-academy             | in-progress        | off      | off     | outcome rewritten; cuts "There is nothing quite like it in the region."; "seeded from early cohort participants", "real faculty, honest pricing" and the enrolment claim in the designer note rewritten; first person |
| reid-design                      | (live)             | off      | not set | outcome and results rewritten to the 2026-09-30 redesign; the "genuinely strong" brief line rewritten; first person                                                                                                   |
| first-baptist-muncie             | launching-soon     | off      | not set | summary, description, outcome, results, designer note, role, year 2026 and the whole body replaced with the new build; `highlights` emptied (they showed the Wix site)                                                |

## Before you start

1. Merge and deploy the redesign code first (the reader that understands `launch_status` must be live before the data says "not live"; the reverse order is also safe, it just shows no labels yet).
2. In your own PowerShell, in the repo: `npx emdash login --url https://www.nixoncreativestudio.com`, then set `EMDASH_TOKEN` (a fresh API token from the admin).
3. Note a restore point: `npx wrangler d1 time-travel info ncs-emdash-prod`.
4. Look at **History** in the admin for Site settings, the Home, About, Services, Contact, Work, Photography, Journal and Not-found pages, the three Pricing tiers, the three Add-ons, the three Service offerings and Pages. Any edit you made there after 2026-10-03 will be overwritten by step 2 below (the loader replaces a whole entry when it differs). Copy any such edit into the matching `cms/content/*.json` first, or skip that collection.

## Step 1: the PR 13 and PR 14 load, plus the two new fields

```powershell
npm run cms:production-load -- --plan
npm run cms:production-load
```

This is the same command `docs/PENDING.md` already lists for PR 13 and PR 14 (hero fields, redirects, collection settings). With this branch merged, expect:

- `site_settings` schema: `would added field price_range (string)`, applied, then the re-check reads unchanged.
- `site_settings` content: `site: would update`. **The run stops here by design** ("content dry run shows a change this tool will not make on its own"). That is correct: go to step 2, then resume.

## Step 2: the copy, one collection at a time, by hand

For each collection below, dry run, read the line, then apply, then dry run again:

```powershell
npm run cms:load -- --collection site_settings --url https://www.nixoncreativestudio.com --dry-run
$env:NCS_PRODUCTION_WRITE = 'yes'
npm run cms:load -- --collection site_settings --url https://www.nixoncreativestudio.com --yes
Remove-Item Env:NCS_PRODUCTION_WRITE
npm run cms:load -- --collection site_settings --url https://www.nixoncreativestudio.com --dry-run
```

Collections and the line each dry run should print:

| Collection          | First dry run                                                                                                                                         | After `--yes`     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `site_settings`     | `site: would update`                                                                                                                                  | `site: unchanged` |
| `page_home`         | `home: would update`                                                                                                                                  | unchanged         |
| `page_about`        | `about: would update`                                                                                                                                 | unchanged         |
| `page_services`     | `services: would update`                                                                                                                              | unchanged         |
| `service_offerings` | `strategy: would update`, `web-design: would update`, `photography: unchanged`                                                                        | all unchanged     |
| `pricing_tiers`     | all three `would update`                                                                                                                              | unchanged         |
| `pricing_addons`    | `brand-strategy: would update`, the other two unchanged                                                                                               | unchanged         |
| `page_work`         | `work: would update`                                                                                                                                  | unchanged         |
| `page_photography`  | `photography: would update`                                                                                                                           | unchanged         |
| `page_journal`      | `journal: would update`                                                                                                                               | unchanged         |
| `page_not_found`    | `not-found: would update`                                                                                                                             | unchanged         |
| `page_contact`      | `contact: would update`                                                                                                                               | unchanged         |
| `pages`             | all seven `unchanged` (the accidental load already wrote them, see Incident); if the three prose pages were restored, those three read `would update` | unchanged         |

Any other line (a `create`, an entry you did not expect) is a reason to stop and look. Then resume the orchestrated run, which now reads "already in place" for everything above:

```powershell
npm run cms:production-load -- --from menus
```

## Step 3: case studies

The orchestrated run reaches `case_studies`:

- Schema dry run: `unchanged field x` for the existing fields, `would added field launch_status (select)`, `would added field preview_url (url)` (and, if PR 13 has still not been loaded, `would added field in_hero (boolean)` and `would added field hero_order (integer)`), possibly `would reorder fields`. Nothing else. Applied, then the re-check reads unchanged.
- Content dry run: one line per study. `would seed` (only new fields set) or `would update` (an overwrite or a rewrite). **The run stops on the first `would update`, by design.** Read the lines AND the indented notes under them: a note `<field>: "<words>" not found, left alone (edit by hand)` means the old words were not where D found them (you edited that field since, or the wording differs slightly). That field is untouched; fix it by hand in the admin later (list below).

Then by hand:

```powershell
npm run cms:load -- --collection case_studies --url https://www.nixoncreativestudio.com --dry-run
$env:NCS_PRODUCTION_WRITE = 'yes'
npm run cms:load -- --collection case_studies --url https://www.nixoncreativestudio.com --yes
Remove-Item Env:NCS_PRODUCTION_WRITE
npm run cms:load -- --collection case_studies --url https://www.nixoncreativestudio.com --dry-run
```

The last dry run must read `unchanged` for all nine (notes may remain for rules that did not match; they do not block). Then resume: `npm run cms:production-load -- --from redirects`, and do the PR 14 `cms:tidy` step from `docs/PENDING.md`.

## Step 4: edits only the admin can make

The loader can only change words it knows. These need you in the admin (read-only checks before, a look at the live page after):

1. **First Baptist Church Muncie:** the cover, the showcase captures and their alt text still show the Wix site. Replace them with captures of the new build (fbcm-site.nathanjnixon86.workers.dev) and fix the Stack and Topics tags (Astro, Sanity, Cloudflare Workers). Keep the live URL as fbcmuncie.org: while the status is "Launching soon" the page links to the preview address instead (labelled Launching soon). At the cutover, clear Launch status (and the preview address), and fbcmuncie.org becomes the link.
2. **Reid Design:** the body and the feature highlights still describe the Budget Calculator, Style Quiz, before/after sliders, journal, shop and press strip, which now redirect away. Cut those passages and highlights, and describe the live concept room, paint-chip prices and room and style picker. Turn Featured back on once it reads true.
3. **Second Presbyterian Chicago:** read the summary and body for anything that says the church uses the site ("anyone on the communications team can now add a sermon", "now one edit"); the results are already rewritten.
4. **Presbyterian Academy:** read the body for any faculty, tuition or term detail presented as real. When the school confirms its content and the site is finished, clear Launch status and decide on Featured and the hero.
5. **Foundation for Reformed Theology** outcome and **Theology Matters** brief: "with the editorial weight the work deserves" and "the editorial weight the publication had earned" (D #30). D suggests a concrete line such as "A library of N resources the staff now update themselves"; it needs the real N.
6. Any field named in a "not found, left alone" note from step 3.

## Step 5: verify (read only)

- `/work/second-presbyterian-chicago/`, `/work/presbyterian-academy/`, `/work/first-baptist-muncie/`: no "live site" link (once the page templates show the status label, it reads "Built, not launched", "In progress", "Launching soon").
- `/`: the hero scene shows only live sites; Selected Work shows Stone Steps, Theology Matters, FRT or MAS (whichever are featured and newest).
- View source on `/`: the Organization JSON-LD has `logo`, `image`, `priceRange: "From $900"` and `geo` (needs the StructuredData template hand-off to be merged).
- `/rss.xml` title reads "Nixon Creative Studio: case studies".

## Step 6: bring CI along (after production holds it)

1. `node scripts/export-seed-from-instance.mjs --url https://www.nixoncreativestudio.com`, then `node scripts/ci-dataset/cms-fixtures.mjs`.
2. `npm run ci-dataset -- --from-scratch` (the seed gained `launch_status` and `price_range`, so the tables need the new columns; not while a PR is mid-CI), then `npm run ci-dataset:snapshot`, then `npm run ci-dataset`.
3. In the same PR as the new snapshot, update the Playwright specs that assert the old words on the CI pages (`tests/home-copy.spec.ts`, `tests/services-copy.spec.ts`, `tests/about-copy.spec.ts`, `tests/index-pages.spec.ts`, `tests/contact-copy.spec.ts`, `tests/pricing.spec.ts`; grep them for the old strings in the table in the content agent's report). They still pass today because CI serves the production snapshot, which holds the old copy until this load.
4. Revoke the API token.

## Landing pages (branch `page-landing`)

Four entries in the existing `pages` collection: `church-websites`, `nonprofit-websites`, `school-websites`, `cincinnati-event-photography`. No schema change. The pages work with no load at all: a missing entry serves the committed `cms/content/pages.json`. Production already holds the four entries (see Incident), so nothing is left to load for them. For Nathan, after the redesign is on `main`, a read-only check: `npm run cms:production-load -- --plan`, then `npm run cms:load -- --collection pages --url https://www.nixoncreativestudio.com --dry-run` should print `unchanged` for the four landing slugs.

## Incident, 2026-10-04

- **What ran:** a page agent's Git Bash command expanded backticked text in a doc draft as shell commands, which ran `npm run cms:load -- --collection pages --url https://www.nixoncreativestudio.com` as a dry run, then with `--yes`, then as a dry run.
- **Effect:** production `pages` was written. `privacy`, `accessibility` and `colophon` were replaced with the redesign branch's committed copy (Bebas Neue and Newsreader, no dark mode, Cloudflare Workers) while `main` still serves the old design, and any admin edit to those three since the last load was overwritten. The four landing entries were created (no route on `main` serves them). No other collection was touched.
- **Guard since:** commit c631a66 (production writes need `NCS_PRODUCTION_WRITE=yes` as well as `--yes`).
- **Options (Nathan's):** restore the three prose entries from each entry's History in the admin; or restore the database with `npx wrangler d1 time-travel restore ncs-emdash-prod --timestamp=<a time before the write>`; or leave them, since they become true when the redesign deploys.
