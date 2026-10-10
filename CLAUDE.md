# Nixon Creative Studio Portfolio

Astro portfolio for Nathan Nixon, sole owner of Nixon Creative Studio in Cincinnati, OH. Web design, photography, and brand strategy for churches, schools, nonprofits, and small businesses: web design and strategy for clients anywhere, photography across the Cincinnati region. Lives at nixoncreativestudio.com.

This is a one-person project. Nathan is the owner, the designer, the photographer, and the only person editing the repo. Build for a future Nathan who hasn't touched the code in three months.

Reid Design is a separate business entity. Do not conflate it with Nixon Creative Studio.

**Rolled back 2026-10-09.** The EmDash CMS and server rendering (PRs #47 to #105) were rolled back to the static state of 7bca364: every page is prerendered and all content lives in this repo. Kept on top: the $100/mo care plan price (#41), the sync-check resync (#89) and the GA4 hostname guard (#104). The EmDash history stays in git; `main` is the only branch.

Stack in one line: Astro 7 (TypeScript strict, `output: 'static'`) served as assets by a Cloudflare Worker, MDX content collections for case studies and journal, Tailwind 4, shadcn/ui plus Starwind, React 19 islands. Full list: `docs/claude/stack.md`.

## How this file is organised

This file holds what every session needs. Path-scoped rules in `.claude/rules/` load on their own when you touch matching files. Long reference lives in `docs/claude/`. Nothing was deleted in the split, it was moved: if a rule seems missing, it is in a file in the docs map below.

## Where things live

- Case studies and journal entries: MDX in `src/content/case-studies/` and `src/content/journal/`, schemas in `src/content.config.ts`. Covers at `src/assets/case-studies/{slug}.png` (basename must match the slug).
- Contact and identity values: `src/data/site.ts`. Pricing tiers: `src/data/pricing.ts`.
- Pages: `src/pages/`; the shared shell (theme bootstrap, header, footer, meta, analytics, Coming Soon gate): `src/layouts/BaseLayout.astro`.
- Brand tokens, theme and motion vocabulary: `src/styles/globals.css`. Security headers: `public/_headers`.
- Open work and waiting-on-a-human items: `docs/PENDING.md`. Which gate covers what: `docs/TESTING.md`.
- Read the strategy doc (`docs/claude/strategy-and-audience.md`) before any design call.

## Vault

Business context, decisions and the Work log live in `_vault/clients/nixon-creative-studio.md` at the Projects root (this repo's note). Never create notes in this repo for business matters. Update repo docs (CLAUDE.md, README, `docs/`) in the same piece of work as any change, before calling it done.

## Ports

`ncs-astro-sanity-starter/PORTS.md` is the registry for improvements that generalise across the site family. Files marked `PORTABLE:` are canonical in the starter and checked by `node scripts/sync-check.mjs` (a CI gate: the build job checks the starter out at `.ncs-starter`). A generalising fix gets a port card in the same commit. Cross-project lessons go to `_vault/gotchas/` with a "Ported to" checklist. Four files are canonical HERE and ported out: `scripts/free-dist.mjs`, `scripts/with-workerd.mjs`, `scripts/sync-check.mjs`, `src/lib/contrast.ts`; read PORTS.md before editing them.

## Commands

- `npm run dev` (astro dev). Stop it before `npm run build` (port clash, see `.claude/rules/build-pipeline.md` and Gotcha 6).
- `npm run build` = `prebuild` (`free-dist`) then `placeholders`, `og:pages`, `astro build`. `npm run check` = `astro check && npm run lint`. `npm run check:full` adds unit tests and the build.
- `npm run lint`, `npm run format` / `format:check` (prettier, run it on md files too), `npm run test:unit` (`node --test`, import `.ts` with the extension).
- `npm test` runs Playwright; its webServer builds and serves `dist/client` on 4321 (`npm run serve:dist`). `npm run test:ui` opens the UI.
- `npm run check:links` runs linkinator over `dist/client` after a build (the log must say "scanned N links", N in the hundreds).
- `npm run sync-check`, `npm run free-dist`, `npm run placeholders`, `npm run og` / `og:pages` / `icons` (generators), `npm run parity capture|compare` (not in CI).
- Lighthouse: never trust a local `lhci autorun` on this Windows machine (Gotcha 9); read the CI run.

## Branches, CI and deploy

- Production deploys from Cloudflare Workers Builds on a push to `main` (Worker `nixoncreativestudio`, assets from `dist/`). Other branches get a `*-nixoncreativestudio.nathanjnixon86.workers.dev` preview. The apex is canonical; `www` 301s to it.
- `main` is the only branch. Short-lived branch, open a PR; the `main` ruleset requires PR plus green `build` and `test`. Undo with `git revert` or the Deployments tab rollback.
- Hard gates: `astro check`, lint (0 errors), `prettier --check`, unit tests, sync-check, link check, Playwright, Lighthouse accessibility = 1, LCP under 4.5s, CLS under 0.1. A format gate that only runs in CI has bitten this studio before: run prettier locally.
- Details: `.claude/rules/testing-ci.md`, `docs/claude/deployment.md`, `docs/TESTING.md`, `docs/PENDING.md` (the open-patch queue; edit registries in the same commit as the thing they track).

## Never-break rules (each one cost real time)

1. **Every page is prerendered** (`output: 'static'`). Do not add `export const prerender = false` without a planned session.
2. **Keep `imageService: 'compile'`** on the Cloudflare adapter: the runtime image service needs a binding this static deploy does not have, and covers stuck on their blur placeholder in production (`docs/claude/deployment.md`).
3. **Nothing in the first viewport may start at opacity 0** (kills LCP, Gotcha 10). Reveals below the fold only, gated on `.js`.
4. **Contact and identity strings come from `src/data/site.ts`**, never hardcoded in `.astro` files.
5. **Colors come from tokens** (`bg-primary`, `text-link`), never hex in components. Every new pair clears WCAG AA in both themes and goes in `src/lib/theme-tokens.test.ts`. Heading emphasis is a solid token span, never gradient text. Accessibility stays at Lighthouse 100.
6. **Template-expression comments are `{/* */}`**, never `<!-- -->` (breaks lint and format, Gotcha 1). A conditional `<script>` goes in its own component.
7. **Page enhancement scripts** register on `astro:page-load` with a dataset re-bind guard; always render the real final value of a `data-countup` number as static text.
8. **Radix-portal primitives hydrate with `client:only="react"`** (Sheet, Dialog, portalled DropdownMenu), or the page blanks on "Invalid hook call".
9. **Never fabricate** a testimonial, result, metric or feature screenshot. Only real, live, attributed proof goes on the site.
10. **Every `mailto:` keeps its fallback** (`src/scripts/mailto-fallback.ts`); a click that does nothing on a machine with no mail client is expected.
11. **Keep the docs TRUE**: a new route updates `tests/routes.ts`; Colophon and Privacy text are tied to the code and hosting.

## Working with Nathan (short form; full text in `docs/claude/working-style.md`)

- Desktop app, not terminal: show diffs clearly. Plan Mode for multi-file changes. Pause for confirmation before installing dependencies. Describe design changes as the visual outcome in plain language. Frame board, church or client-facing copy options collaboratively.
- Browser verification: prefer the Playwright MCP over chrome-devtools unless you need network, console or Lighthouse inspection.
- Style, in code comments, PRs, commits and site copy: warm and conversational; step-by-step for processes; no em-dashes (commas, periods, colons); no AI-tell words (delve, navigate as a verb, leverage, robust, seamless, meticulous, tapestry, realm, landscape, testament to, ever-evolving, crucial, pivotal) or patterns ("It's not just X, it's Y", "Not only... but also", "It's important to note", "When it comes to", "In the realm of", "That said"); start with the content and end on it; bold only for real emphasis; prose over bullets unless it is a list; comment code generously. Site copy example: "Modern websites for small businesses, nonprofits, churches, and schools. Based in Cincinnati, working with clients anywhere."

## Docs map

Path-scoped rules (load automatically when you touch matching files):

- `.claude/rules/homepage-and-pages.md`: homepage section order and what each section does (`src/pages`, `src/components`).
- `.claude/rules/content.md`: site data, `mailto` fallback, the three collections and their frontmatter, routes table (`src/content`, `src/data`, `src/pages`).
- `.claude/rules/styling.md`: brand colors, shadcn mapping, theme system, motion vocabulary, typography.
- `.claude/rules/components.md`: component order of preference, Button variants, `client:only`, studio components, code conventions, images.
- `.claude/rules/accessibility.md`: AA target, required patterns, token contrast, before-merging checks.
- `.claude/rules/build-pipeline.md`: `npm run build` chain, placeholders, OG cards, icons.
- `.claude/rules/testing-ci.md`: every test suite, lint and format, CI, Lighthouse, uptime and Dependabot workflows, parity harness, sync-check.
- `.claude/rules/foundation-files.md`: what is safe to edit by hand and what needs a planned session.

Reference docs, read when needed (`docs/claude/`):

- `gotchas.md`: full text of Gotchas 1 to 11 (index below). Read the entry before touching what its line mentions.
- `deployment.md`: read when changing deploys, env vars (`PUBLIC_*`), the Coming Soon gate or security headers.
- `stack.md`: read when choosing or wiring a library.
- `setup-checklist.md`: read when asked what is unconfigured or what content is outstanding.
- `working-style.md`: full communication-style text.
- `strategy-and-audience.md`: read before any design or copy call (points at `NCS-Website-Strategy.docx` in the sibling `Nixon Creative Studio Website` folder).

Existing docs: `docs/PENDING.md`, `docs/TESTING.md`, `docs/agent/component-sources.md` (where to pull components from), `docs/stack-template/` (new-site runbook), `PRODUCT.md`, `src/components/primereact/README.md`. Slash commands: `.claude/commands/rebuild.md`, `.claude/commands/visual-verify.md`.

## Gotcha index (full text: `docs/claude/gotchas.md`)

1. Lint is green and gated; a red run is your change.
2. `variant="secondary"` on Button or Badge fails contrast (unused today).
3. The `--link` comment in `globals.css` overclaims; never `text-link` on navy.
4. Live site does two redirect hops (`www` to apex, then the trailing slash); uptime checks need `curl -L`.
5. Parity harness needs no site-specific normalizer rules.
6. `npm run build` kills stale dev servers first (`free-dist.mjs`).
7. `dist/server/wrangler.json` carries `legacy_env: true`.
8. Unit tests import `.ts` with the extension.
9. `npx lhci autorun` does not complete on this Windows machine.
10. An entrance animation starting at `opacity: 0` destroys LCP.
11. WebKit drops `box-shadow` on native controls; selects use an outline ring.
