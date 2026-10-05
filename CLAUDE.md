# Nixon Creative Studio Portfolio

Astro portfolio for Nathan Nixon, sole owner of Nixon Creative Studio in Cincinnati, OH. Web design, photography, and brand strategy for churches, schools, nonprofits, and small businesses: web design and strategy for clients anywhere, photography across the Cincinnati region. Lives at nixoncreativestudio.com.

This is a one-person project. Nathan is the owner, the designer, the photographer, and the only person editing the repo. Build for a future Nathan who hasn't touched the code in three months.

Reid Design is a separate business entity. Do not conflate it with Nixon Creative Studio.

Stack in one line: Astro 7 (TypeScript strict, `output: 'server'`) on a Cloudflare Worker with the Workers Cache route cache, EmDash CMS (D1, R2, KV) for case studies, journal, photos and every page's words, Tailwind 4, shadcn/ui, React 19 islands. Full list: `docs/claude/stack.md`.

## How this file is organised

This file holds what every session needs. Path-scoped rules in `.claude/rules/` load on their own when you touch matching files. Long reference lives in `docs/claude/`. Nothing was deleted in the split, it was moved: if a rule seems missing, it is in a file in the docs map below.

## Where things live

- Words, prices, menus, redirects, case studies, journal, photos: the EmDash admin at `/_emdash/admin/` (passkey login), not files. Committed fallback and seed: `cms/content/*.json`; field definitions: `cms/schema/*.mjs`; readers: `src/lib/*.ts`; shared values via `getSite()` in `src/data/site.ts`.
- Case studies are collection `case_studies` in EmDash (D1, R2, KV), read by `src/lib/caseStudies.ts`. There are no Astro content collections and no `src/content/`; `src/live.config.ts` is the only content config.
- Cache and headers: `src/worker.ts`, `src/lib/routeCache.ts`, `cachePublicPage()` in `BaseLayout`. `public/_headers` no longer reaches HTML (Gotcha 15).
- The 2026 redesign is live (rounds 1 and 2); where it stopped, what Nathan has decided and what to try next: `docs/redesign-2026/ROUND-2-HANDOFF.md`. Design system: `DESIGN.md`.
- Open work and waiting-on-a-human items: `docs/PENDING.md`. Which gate covers what: `docs/TESTING.md`.
- Read `docs/claude/strategy-and-audience.md` before any design call (the original strategy docx was deleted; use `PRODUCT.md` and `docs/`).
- The design system is `DESIGN.md` (palette, type, grounds, components, open decisions). The 2026 redesign lives in `docs/redesign-2026/`; page agents start with its `BUILD-NOTES.md`.

## Vault

Business context, decisions and the Work log live in `_vault/clients/nixon-creative-studio.md` at the Projects root (this repo's note; internal project, no Work log rows). Never create notes in this repo for business matters. Update repo docs (CLAUDE.md, README, `docs/`) in the same piece of work as any change, before calling it done.

## Ports

`ncs-astro-sanity-starter/PORTS.md` is the registry for improvements that generalise across the site family. Files marked `PORTABLE:` are canonical in the starter and checked by `node scripts/sync-check.mjs` (a CI gate: the build job checks the starter out at `.ncs-starter`). A generalising fix gets a port card in the same commit. Cross-project lessons go to `_vault/gotchas/` with a "Ported to" checklist. Four files are canonical HERE and ported out: `scripts/free-dist.mjs`, `scripts/with-workerd.mjs`, `scripts/sync-check.mjs`, `src/lib/contrast.ts`; read PORTS.md before editing them.

## Commands

- `npm run dev` (astro dev). Stop it before `npm run build` (port clash, see `.claude/rules/build-pipeline.md` and Gotcha 6).
- `npm run build` = `og:pages` then `astro build`. `npm run check` = `astro check && npm run lint`. `npm run check:full` adds unit tests and the build.
- `npm run lint`, `npm run format` / `format:check` (prettier, run it on md files too), `npm run test:unit` (`node --test`, import `.ts` with the extension).
- `npm test` runs Playwright against a URL, never a local server: `PLAYWRIGHT_BASE_URL=https://ncs-ci.nathanjnixon86.workers.dev npx playwright test --project=chromium`. `npm run test:ui` opens the UI.
- `npm run check:links` needs `LINKCHECK_URL` set (the log must say "scanned N links", N in the hundreds).
- `npm run sync-check`, `npm run free-dist`, `npm run og` / `og:pages` / `icons` (generators), `npm run parity capture|compare` (not in CI).
- CMS: `npm run cms:schema`, `cms:load`, `cms:pt -- file.md` (all take `--dry-run`, refuse any non-`ncs-ci` target without `--yes`), `cms:production-load`, `cms:tidy`. CI data: `npm run ci-dataset`, `ci-dataset:snapshot`.
- Lighthouse: never trust a local `lhci autorun` on this Windows machine (Gotcha 9); read the CI run.

## Branches, CI and deploy

- Production deploys only from Workers Builds on a push to `main` (Worker `nixoncreativestudio`, D1 `ncs-emdash-prod`, R2 `ncs-emdash-media-prod`). Never run `wrangler deploy` locally without `CLOUDFLARE_ENV=ci`.
- There is no `staging` branch (retired 2026-10-03). Short-lived branch, open a PR; CI (`ci.yml`: parallel `static` + `site`, then 3 weighted `e2e` shards (`PWTEST_SHARD_WEIGHTS`, recipe in `docs/TESTING.md`); the required checks `build` and `test` are aggregators, never rename them or path-filter `ci.yml`) and Lighthouse (`lighthouse.yml`: path-filtered on PRs with a one-URL-per-template sample, full list on main and weekly; keep its name, the Dependabot auto-merge workflow listens for it) run against a Worker version preview built with `CLOUDFLARE_ENV=ci` (Worker `ncs-ci`), so required checks never read production data. Undo with `git revert` or the Deployments tab rollback.
- Hard gates: `astro check`, lint (0 errors), `prettier --check`, unit tests, sync-check, link check, Playwright, Lighthouse accessibility = 1, LCP under 4.5s, CLS under 0.1. A format gate that only runs in CI has bitten this studio before: run prettier locally.
- Details: `.claude/rules/testing-ci.md`, `docs/claude/deployment.md`, `docs/LAUNCH-RUNBOOK.md`, `docs/TESTING.md`, `docs/PENDING.md` (the open-patch queue; edit registries in the same commit as the thing they track).

## Never-break rules (each one cost real time)

1. **Every page is server-rendered and route-cached.** Do not add `export const prerender = true`; use `BaseLayout` and the page is cached. A new CMS reader must take `Astro.cache` and call `cache.set(cacheHint)` or publish will not purge it. No global `routeRules` (Gotcha 15).
2. **Nothing in the first viewport may start at opacity 0** (kills LCP, Gotcha 10). Reveals below the fold only, gated on `.js`.
3. **Do not remove the Images binding** or the `imageService` config; CMS images resize at request time. Resize requests 4096 px tall or more return the original, so use width-only URLs (`docs/claude/emdash-architecture.md`).
4. **Never import `emdash/ui`'s `PortableText`** on a public page: its 9.5 KB stylesheet becomes a render-blocking link everywhere. Use `blockHtml()` / `renderJournalBody()`.
5. **Production data steps** (`cms:production-load`, `cms:tidy`) run from the main session in Nathan's presence, `--dry-run` first, never from a delegated agent.
6. **Contact and identity strings come from `getSite()`**, never hardcoded in `.astro` files; React islands get them as props and must not import `src/data/site.ts`.
7. **Colors come from tokens** (`bg-primary`, `text-link`; in CSS the raw `var(--link)`), never hex in components. Every new pair clears WCAG AA and goes into `theme-tokens.test.ts` (one theme; dark mode was retired in the 2026 redesign). Heading emphasis is a solid token span, never gradient text. Accessibility stays at Lighthouse 100.
8. **Internal links carry their trailing slash** (menu items go through `withTrailingSlash()`), or prefetch is wasted on a 301 (Gotcha 19).
9. **The `www` to apex redirect rule must exempt `/_emdash/` and `/_astro/`**, or the admin breaks (Gotcha 24).
10. **Template-expression comments are `{/* */}`**, never `<!-- -->` (breaks lint and format, Gotcha 1). A conditional `<script>` goes in its own component.
11. **Page enhancement scripts** register on `astro:page-load` with a dataset re-bind guard; always render the real final value of a `data-countup` number as static text.
12. **Never submit a real message from a test** (`tests/contact-copy.spec.ts` intercepts the Web3Forms POST with `page.route()`).
13. **New fields on a collection that already has entries must be optional** and booleans are read with `Boolean()` (stored 0/1); datetimes are full ISO strings (Gotcha 17).
14. **Say "within seconds, five minutes at worst"** about an admin edit reaching the live site, never "about 5 minutes".
15. **Do not run `cms:load`, edit menus or site settings right before showing the site**: any admin write purges pages and the next view is a cold render (Gotcha 21).
16. **Every `mailto:` keeps its fallback** (`src/scripts/mailto-fallback.ts`); a click that does nothing on a machine with no mail client is expected.
17. **Keep the docs TRUE**: a change to what the admin offers updates `docs/EDITING-GUIDE.md`; a new route updates `tests/routes.ts`; Colophon and Privacy text are tied to the code and hosting.
18. **Writes to a live, shared system (Cloudways, the Cloudflare dashboard or API, production D1/R2, live Sheets) are refused by the auto-mode classifier even when Nathan says yes in chat.** Never route around a refusal through another tool. Build a paste-ready artifact plus a numbered run list, then verify afterwards with read-only calls. Full rule and pattern: `.claude/rules/live-writes.md`.

## Working with Nathan (short form; full text in `docs/claude/working-style.md`)

- Desktop app, not terminal: show diffs clearly. Plan Mode for multi-file changes. Pause for confirmation before installing dependencies. Describe design changes as the visual outcome in plain language. Frame board, church or client-facing copy options collaboratively.
- Browser verification: prefer the Playwright MCP over chrome-devtools unless you need network, console or Lighthouse inspection.
- Style, in code comments, PRs, commits and site copy: warm and conversational; step-by-step for processes; no em-dashes (commas, periods, colons); no AI-tell words (delve, navigate as a verb, leverage, robust, seamless, meticulous, tapestry, realm, landscape, testament to, ever-evolving, crucial, pivotal) or patterns ("It's not just X, it's Y", "Not only... but also", "It's important to note", "When it comes to", "In the realm of", "That said"); start with the content and end on it; bold only for real emphasis; prose over bullets unless it is a list; comment code generously. Site copy example: "Modern websites for small businesses, nonprofits, churches, and schools. Based in Cincinnati, working with clients anywhere."

## Docs map

Path-scoped rules (load automatically when you touch matching files):

- `.claude/rules/homepage-and-pages.md`: homepage section order, every CMS-DESIGN PR 6 to 12 page contract (`src/pages`, `src/components`, `src/lib`).
- `.claude/rules/cms-content.md`: content editing, site data and menus, collections, routes table (`cms/`, `src/lib`, `src/data`, `scripts/cms`).
- `.claude/rules/styling.md`: palette and scopes, grounds and bands, type roles, motion vocabulary (summary of `DESIGN.md`).
- `.claude/rules/components.md`: component order of preference, Button variants, `client:only`, studio components, code conventions, images.
- `.claude/rules/accessibility.md`: AA target, required patterns, token contrast, before-merging checks.
- `.claude/rules/build-pipeline.md`: `npm run build` chain, OG cards, icons.
- `.claude/rules/testing-ci.md`: every test suite, lint and format, CI and Lighthouse workflows, parity harness, CMS tooling, sync-check.
- `.claude/rules/live-writes.md`: the auto-mode classifier blocks live-system writes; the paste-ready handoff pattern.
- `.claude/rules/foundation-files.md`: what is safe to edit by hand and what needs a planned session.

Reference docs, read when needed (`docs/claude/`):

- `emdash-architecture.md`: read before changing rendering, caching, images, wrangler config or the CI dataset.
- `gotchas.md`: full text of Gotchas 1 to 27 (index below). Read the entry before touching what its line mentions.
- `deployment.md`: read when changing deploys, env vars (`PUBLIC_*`), the Coming Soon gate or security headers.
- `stack.md`: read when choosing or wiring a library.
- `setup-checklist.md`: read when asked what is unconfigured or what content is outstanding.
- `working-style.md`: full communication-style text.
- `strategy-and-audience.md`: read before any design or copy call (the original strategy docx was deleted 2026-10-03).

Existing docs: `docs/EMDASH.md` (what exists, gotchas), `docs/EMDASH-SCHEMA.md`, `docs/CMS-DESIGN.md`, `docs/CMS-INVENTORY.md`, `docs/EDITING-GUIDE.md` (Nathan's plain-language walkthrough), `docs/LAUNCH-RUNBOOK.md` (launch and rollback), `docs/PENDING.md`, `docs/TESTING.md`, `docs/agent/component-sources.md` (where to pull components from), `docs/stack-template/` (new-site runbook), `PRODUCT.md`. The official EmDash agent guidance is vendored in `.claude/skills/building-emdash-site/`.

## Gotcha index (full text: `docs/claude/gotchas.md`)

1. Lint is green and gated; a red run is your change.
2. Retired: `variant="secondary"` used to fail contrast (now AA).
3. Retired: the old `--link` navy claim (palette replaced 2026-10-04).
4. Live site does two redirect hops; uptime checks need `curl -L`.
5. Parity harness needs no site-specific normalizer rules.
6. `npm run build` kills stale dev servers first (`free-dist.mjs`).
7. `dist/server/wrangler.json` carries `legacy_env: true`.
8. Unit tests import `.ts` with the extension.
9. `npx lhci autorun` does not complete on this Windows machine.
10. An entrance animation starting at `opacity: 0` destroys LCP.
11. WebKit drops `box-shadow` on native controls; selects use an outline ring.
12. `dist/client` is only assets; tools must take a URL.
13. The OG generator reads public pages, not the EmDash REST API.
14. Below-the-fold image downloads inflate the homepage LCP (`defer`, preload timing).
15. The route cache stores what a response asks for (tags, non-200, headers, trailing slashes, `/404/`).
16. EmDash does not enforce limits on repeater sub-fields.
17. First production load lessons (booleans 0/1, images, ISO datetimes, no optional-to-required, `supports`).
18. Redirects are EmDash rows; no code redirects.
19. Prefetch needs browser-reusable caching and trailing slashes on every link.
20. Smart Placement puts the Worker next to D1 (cold renders about 30% faster).
21. Any admin write purges pages; next view is a cold render.
22. There is no cache warm-up; a GitHub Action cannot be one (Bot Fight Mode).
23. Mobile speed: how to measure, what moved it, dead ends.
24. The `www` redirect rule must exempt `/_emdash/` and `/_astro/`.
25. Committed parity baselines and Markdown docs feed Tailwind's scan; `globals.css` excludes them with `@source not`.
26. In CSS read `var(--link)`, never `var(--color-link)`: the alias ignores a ground's scope.
27. Vite inlines assets under 4 KB into CSS; `astro.config.mjs` keeps the ground textures out.
