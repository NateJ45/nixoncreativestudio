# Nixon Creative Studio Portfolio

Astro portfolio for Nathan Nixon, sole owner of Nixon Creative Studio in Cincinnati, OH. Web design, photography, and brand strategy for churches, schools, nonprofits, and small businesses: web design and strategy for clients anywhere, photography across the Cincinnati region. Lives at nixoncreativestudio.com.

This is a one-person project. Nathan is the owner, the designer, the photographer, and the only person editing the repo. Build for a future Nathan who hasn't touched the code in three months.

Reid Design is a separate business entity. Do not conflate it with Nixon Creative Studio.

**History.** The EmDash CMS and server rendering (PRs #47 to #105) were rolled back on 2026-10-09 to the static state of 7bca364: every page is prerendered and all content lives in this repo. The care plan pricing (now the four care levels in `src/data/pricing.ts`) and the sync-check and GA4 hostname fixes were kept. In November 2026 the whole front end was replaced with the design called "the deal" (ported from a mock in the motion lab). It left Tailwind, shadcn, React, dark mode and the old homepage behind. `main` is the only branch.

Stack in one line: Astro 7 (TypeScript strict, `output: 'static'`) served as assets by a Cloudflare Worker (whose only code is video byte ranges and the contact endpoint, `src/worker.ts`), MDX content collections for case studies and journal, plain CSS (`src/styles/kit.css` plus one file per page), plain processed Astro scripts, one typeface (Hanken Grotesk). No Tailwind, React or shadcn. Full list: `docs/claude/stack.md`.

## How this file is organised

This file holds what every session needs. Path-scoped rules in `.claude/rules/` load on their own when you touch matching files. Long reference lives in `docs/claude/`. If a rule seems missing, it is in a file in the docs map below.

## Where things live

- Case studies and journal entries: MDX in `src/content/case-studies/` and `src/content/journal/`, schemas in `src/content.config.ts`. A study's footage, captures and stills are in `public/assets/` under its slug (see `.claude/rules/content.md`).
- Contact and identity values: `src/data/site.ts`. Pricing tiers: `src/data/pricing.ts` (the one place a price lives; pages, FAQ, JSON-LD and `/llms.txt` read it). The client list and deck order: `src/lib/clients.ts`. Sector pages and tier situations: `src/data/sector-pages.ts`. The /work index by job: `src/data/jobs.ts`. The five-year sums: `src/lib/tier-costs.ts`.
- Page titles, meta descriptions and JSON-LD: `.claude/rules/content.md` ("Metadata and structured data").
- Pages: `src/pages/`. The shared shell (head, top line, dock, client sheet, analytics, Coming Soon gate): `src/layouts/BaseLayout.astro`.
- Look and tokens: `DESIGN.md` (the rules) and `src/styles/kit.css` (the code; tokens in `:root`). Page styles: `src/styles/pages/*.css`. Scripts: `src/scripts/kit.js` plus one per page. Security and cache headers: `public/_headers`.
- Open work and waiting-on-a-human items: `docs/PENDING.md`. Which gate covers what: `docs/TESTING.md`.
- Gmail signatures (full and compact) with copy buttons: `docs/email-signature/index.html`. Their headshots are served from `public/email/`; keep those file names, every sent email points at them.
- Read the strategy doc (`docs/claude/strategy-and-audience.md`) before any design call.

## Vault

Business context, decisions and the Work log live in `_vault/clients/nixon-creative-studio.md` at the Projects root (this repo's note). Never create notes in this repo for business matters. Update repo docs (CLAUDE.md, README, `DESIGN.md`, `docs/`) in the same piece of work as any change, before calling it done.

## Ports

`ncs-astro-sanity-starter/PORTS.md` is the registry for improvements that generalise across the site family. Files marked `PORTABLE:` are canonical in the starter and checked by `node scripts/sync-check.mjs` (a CI gate: the build job checks the starter out at `.ncs-starter`). A generalising fix gets a port card in the same commit. Cross-project lessons go to `_vault/gotchas/` with a "Ported to" checklist. Four files are canonical HERE and ported out: `scripts/free-dist.mjs`, `scripts/with-workerd.mjs`, `scripts/sync-check.mjs`, `src/lib/contrast.ts`; read PORTS.md before editing them.

## Commands

- `npm run dev` (astro dev). Stop it before `npm run build` (port clash, see `.claude/rules/build-pipeline.md` and Gotcha 6).
- `npm run build` = `prebuild` (`free-dist`), then `og:pages`, `node scripts/with-workerd.mjs astro build` (the Windows workerd shim), then `finish-share-cards` and `write-csp` (fills the CSP hashes in `dist/client/_headers`). `npm run check` = `astro check && npm run lint`. `npm run check:full` adds unit tests and the build.
- `npm run lint`, `npm run format` / `format:check` (prettier, run it on md files too), `npm run test:unit` (`node --test` over `src/lib/*.test.ts`, plus `test:scripts`; import `.ts` with the extension).
- `npm test` runs Playwright; its webServer builds and serves `dist/client` on 4321 (`npm run serve:dist`). Set `PW_PORT` when another worktree holds 4321. `npm run test:ui` opens the UI.
- `npm run test:copy` (after a build) is the copy lint: built pages may not say "we", "our" or "us" in body text, because site copy is first person singular (`tests/unit/copy-rules.test.mjs`; `<blockquote>` and `data-copy-ignore` are skipped).
- `npm run check:links` (linkinator over `dist/client`; the log must say "scanned N links", N in the hundreds) and `npm run check:slashes` (no slashless internal href).
- `npm run og` (default share card), `og:pages` (per-page cards, runs in the build), `icons` (rasterizes `public/favicon.svg` into the icon set). `npm run sync-check`, `free-dist`, `parity capture|compare` (not in CI; its baselines predate the redesign).
- No font-fallback step: `scripts/font-fallback.mjs` is a PORTABLE starter file with no npm script, and `brand/brand.config.json` is gone. Hanken is preloaded and swaps.
- Local only, look at every output before committing: `npm run capture:study <slug>` (re-shoots a study's captures from its `liveUrl`; `--wix` for a Wix site), `npm run capture:cms` (Nathan signs in; `docs/claude/setup-checklist.md`), `npm run capture:clips -- <slug>` (needs ffmpeg; writes the interaction clip into `public/media/`), `node scripts/build-course-line.mjs` (regenerates `src/data/stone-steps-course.ts` from the sibling stonesteps-50k repo). The capture scripts still write PNGs under `src/assets/case-studies/`; the site serves webp copies from `public/assets/` (`docs/PENDING.md`).
- `node scripts/measure-live.mjs` is CI only: the monthly `live-scores.yml` workflow writes `src/data/live-scores.json` and opens a PR. The page no longer prints the scores, so the workflow and `src/lib/live-scores.ts` run with nothing reading them (`docs/PENDING.md`). Never run it from this PC or hand-edit the JSON.
- Lighthouse: never trust a local `lhci autorun` on this Windows machine (Gotcha 9); read the CI run.

## Branches, CI and deploy

- Production deploys from Cloudflare Workers Builds on a push to `main` (Worker `nixoncreativestudio`, assets from `dist/`). Other branches get a `*-nixoncreativestudio.nathanjnixon86.workers.dev` preview. The apex is canonical; `www` 301s to it.
- `main` is the only branch. Short-lived branch, open a PR; the `main` ruleset requires PR plus green `build` and `test`. Undo with `git revert` or the Deployments tab rollback.
- Hard gates: `astro check`, lint (0 errors), `prettier --check`, unit tests (including `kit-tokens` and `case-palettes`), sync-check, copy lint, link and slash checks, Playwright (including `tests/page-weight.spec.ts`, budgets in `tests/page-weight.config.json`: raise one only with the reason in `_why`), Lighthouse accessibility = 1, LCP under 4.5s, CLS under 0.1. A format gate that only runs in CI has bitten this studio before: run prettier locally.
- Visual baselines (`visual.yml`, manual, not required) are Linux PNGs, light only; regenerate after a deliberate visual change (`docs/TESTING.md`).
- Details: `.claude/rules/testing-ci.md`, `docs/claude/deployment.md`, `docs/TESTING.md`, `docs/PENDING.md` (edit registries in the same commit as the thing they track).

## Never-break rules (each one cost real time)

1. **Every page is prerendered** (`output: 'static'`). Do not add `export const prerender = false` without a planned session.
2. **Keep `imageService: 'compile'`** on the Cloudflare adapter: the runtime image service needs a binding this static deploy does not have (`docs/claude/deployment.md`).
3. **Nothing in the first viewport may start at opacity 0** (kills LCP, Gotcha 10). Study blocks (`.rv`) reveal below the fold only, gated on `.rv-on`. One deliberate exception: the H1's words (`.w`) start at opacity .02, so they still paint; the small `.me` portrait in the home headline is exempt in `tests/first-viewport.spec.ts`.
4. **Contact and identity strings come from `src/data/site.ts`**, never hardcoded in `.astro` files.
5. **Colors come from tokens** in `:root` of `src/styles/kit.css` (`var(--accent)`), never a new hex in a component. A client's color arrives only through `--c` and `--p`. Every new pair clears WCAG AA and goes in `src/lib/kit-tokens.test.ts` (or `case-palettes.test.ts` for a client pair). Emphasis in a heading is weight only (500 lead, `<b>` at 700), never colour alone, capitals or gradient text. Light and dark are both designed, so a change answers both, and light stays pixel-identical when only dark changes (`DESIGN.md` section 2a). Accessibility stays at Lighthouse 100.
6. **Template-expression comments are `{/* */}`**, never `<!-- -->` (breaks lint and format, Gotcha 1). A conditional `<script>` goes in its own component.
7. **Scripts are plain processed Astro scripts** (`src/scripts/kit.js` plus one per page). There is no ClientRouter: pages change by cross-document view transition (`@view-transition` in `kit.css`), so scripts run on load and there is no `astro:page-load`. Numbers and prices are plain static text.
8. **The dock (`src/components/Dock.astro`) is the one nav at every width**, plain links, no drawer or menu button, and it works with no JavaScript. Keep chrome and content in the markup. Keep React off every page (`tests/no-react.spec.ts`; the /photography gallery needs a new non-React build, `docs/PENDING.md`).
9. **Never fabricate** a testimonial, result, metric or feature screenshot. Only real, live, attributed proof goes on the site.
10. **Every `mailto:` keeps its fallback** (`src/scripts/mailto-fallback.ts`); a click that does nothing on a machine with no mail client is expected.
11. **Keep the docs TRUE**: a new route updates `tests/routes.ts`; Colophon and Privacy text are tied to the code and hosting (`tests/colophon.spec.ts`).

## Working with Nathan (short form; full text in `docs/claude/working-style.md`)

- Desktop app, not terminal: show diffs clearly. Plan Mode for multi-file changes. Pause for confirmation before installing dependencies. Describe design changes as the visual outcome in plain language. Frame board, church or client-facing copy options collaboratively.
- Browser verification: prefer the Playwright MCP over chrome-devtools unless you need network, console or Lighthouse inspection.
- Style, in code comments, PRs, commits and site copy: warm and conversational; step-by-step for processes; no em-dashes (commas, periods, colons); no AI-tell words (delve, navigate as a verb, leverage, robust, seamless, meticulous, tapestry, realm, landscape, testament to, ever-evolving, crucial, pivotal) or patterns ("It's not just X, it's Y", "Not only... but also", "It's important to note", "When it comes to", "In the realm of", "That said"); start with the content and end on it; bold only for real emphasis; prose over bullets unless it is a list; comment code generously. Site copy example: "Modern websites for small businesses, nonprofits, churches, and schools. Based in Cincinnati, working with clients anywhere."

## Docs map

Path-scoped rules (load automatically when you touch matching files):

- `.claude/rules/homepage-and-pages.md`: the routes and what each page is made of (`src/pages`, `src/scripts`).
- `.claude/rules/content.md`: site data, `mailto` fallback, gated links, the three collections, the case study body shape, retire-or-add checklist, routes table, metadata (`src/content`, `src/data`, `src/pages`).
- `.claude/rules/styling.md`: `kit.css`, per-page CSS, tokens, the deck, big lines, color rules, motion (`src/styles`, `src/scripts`).
- `.claude/rules/components.md`: the components, the study blocks, `src/lib` helpers, code conventions, images.
- `.claude/rules/accessibility.md`: AA target, required patterns, token contrast, before-merging checks.
- `.claude/rules/build-pipeline.md`: `npm run build` chain, OG cards, icons, fonts.
- `.claude/rules/testing-ci.md`: every test suite, lint and format, CI, Lighthouse, workflows, sync-check.
- `.claude/rules/foundation-files.md`: what is safe to edit by hand and what needs a planned session.

Reference docs, read when needed:

- `DESIGN.md`: the design system (YAML tokens plus the rules). Read before any visual work.
- `docs/claude/gotchas.md`: full text of the gotchas (index below). Read the entry before touching what its line mentions.
- `docs/claude/deployment.md`: deploys, env vars (`PUBLIC_*`), the Coming Soon gate, security and cache headers.
- `docs/claude/stack.md`: what is installed and why.
- `docs/claude/setup-checklist.md`: what is unconfigured, what content is outstanding, how to capture CMS screens.
- `docs/claude/working-style.md`: full communication-style text.
- `docs/claude/strategy-and-audience.md`: read before any design or copy call (points at `NCS-Website-Strategy.docx` in the sibling `Nixon Creative Studio Website` folder).
- `docs/PENDING.md`, `docs/TESTING.md`, `PRODUCT.md`, `docs/agent/component-sources.md` (a short note on where components come from), `docs/stack-template/` (new-site runbook for the Tailwind starter stack, not this site). Slash commands: `.claude/commands/rebuild.md`, `.claude/commands/visual-verify.md`.

## Gotcha index (full text: `docs/claude/gotchas.md`; numbers are stable, 2 and 3 retired)

1. Lint is green and gated; a red run is your change.
2. Live site does two redirect hops (`www` to apex, then the trailing slash); uptime checks need `curl -L`.
3. Parity baselines predate the redesign; recapture before trusting `parity compare`.
4. `npm run build` kills stale dev servers first (`free-dist.mjs`).
5. `dist/server/wrangler.json` carries `legacy_env: true`.
6. Unit tests import `.ts` with the extension.
7. `npx lhci autorun` does not complete on this Windows machine.
8. An entrance animation starting at `opacity: 0` destroys LCP (the H1 words start at .02 on purpose).
9. WebKit drops `box-shadow` on native controls; form fields show focus as an outline.
