# Redesign 2026: build notes for page agents

How to run, check and screenshot the redesigned site on this Windows PC, written by the foundation agent on 2026-10-04 after doing each step for real. The design system itself is `DESIGN.md` at the repo root; read it first.

## Page agent starter checklist

1. Work in your own git worktree on a branch off `redesign-2026` (never the main checkout, never a copied folder). Run `npm ci` there once.
2. Read `DESIGN.md`, `CLAUDE.md` (the 18 never-break rules), `.claude/rules/styling.md` and `components.md`, then the mock-up rationale for your page in `docs/redesign-2026/mockups/`.
3. Build the page as a run of `<Band ground="...">` sections. One moving ground per page, at the top (`still` on every later band). Never a deep band under the header.
4. Type by role (`.type-display`, `.type-headline` with a `.voice` italic turn, `.type-lede`, `.type-caption`, `.type-numeral`). Colours from tokens only. In CSS write `var(--link)`, never `var(--color-link)` (DESIGN.md section 2).
5. Real client screenshots through `<Frame>`; only live work presented as live. Real copy from the CMS readers (`src/lib/*.ts`); identity strings from `getSite()`; every internal link with its trailing slash.
6. Nothing in the first viewport at opacity 0; `data-reveal` only on figures below the fold. If your first screen sets the italic voice, pass `preloadFonts={['italic']}` to BaseLayout.
7. Delete the legacy utilities your page stops using (`.surface-card`, `.spotlight-card`, `.hover-lift`, `.link-underline`, globals.css section 9) once nothing else uses them, and grep first.
8. Run the gates below, screenshot at 1440 and 390 (and check 320 for overflow), axe the page, then commit with the docs your change made stale.

## Run the site locally

There are two ways. Both serve the committed fallback content (`cms/content/*.json`): the local D1 is empty, so every CMS reader logs `[cms] ... serving the committed fallback` and renders the fallback. That is expected, not an error. Photos and journal entries have no fallback, so `/photography` shows its "In progress" state and the Journal link is hidden locally.

### A. `astro dev` (fast iteration, hot reload)

```sh
npx astro dev --port 4410 --host 127.0.0.1
```

- No env vars needed. Leave `PUBLIC_COMING_SOON` unset (or the gate hides the site; see `docs/claude/deployment.md` for the bypass).
- The first request takes 30 to 60 s (EmDash typegen plus dependency optimisation); later ones 2 to 7 s. A "Failed to run dependency scan ... PARSE_ERROR" block in the log is a known, harmless warning from comments in a few `.astro` frontmatters.
- Pick your own port (4410 to 4499 for page agents) so parallel agents do not collide. Stop it with the task stop in your harness, or by killing that port's process; `npm run build` also kills stale dev servers holding `dist` (`scripts/free-dist.mjs`, Gotcha 6).
- In dev the logo and other assets load slowly on the first view; wait 3 s before a screenshot or the header can look empty.

### B. The production build under `wrangler dev` (what Lighthouse should measure)

```sh
node scripts/free-dist.mjs          # frees dist if an old server holds it (EPERM otherwise)
npx astro build                     # about 1 to 2 minutes; `npm run build` also regenerates OG cards from the live site
npx wrangler dev -c dist/server/wrangler.json --port 8790 --ip 127.0.0.1
```

- This is the real Worker with the real route cache code, CSS inlined exactly as production ships it, and local (empty) D1/R2/KV bindings. First request about 15 s, then fast.
- Use `npx astro build`, not `npm run build`, when you only need a local preview: `og:pages` reads the live site and rewrites `public/og/` cards.
- Stop `wrangler dev` before building again; if `astro build` fails with `EPERM ... dist\client`, run `node scripts/free-dist.mjs` and retry.
- Never `wrangler deploy` from a page branch (CLAUDE.md: production deploys only from Workers Builds on `main`).

## Screenshots, axe and overflow (Playwright, local)

Final verification is the PR's CI run against the `ncs-ci` Worker preview (`npm test` targets a URL, never a local server). For iteration, a throwaway script against either local server is fine. The foundation's script (copy it from the session scratchpad pattern below) does, per route and width: a fold shot, a slow scroll-through (400 px steps, 200 ms each, so `data-reveal` fires; Lenis smooth scroll makes fast scroll-throughs capture blank bands), a full-page shot, `scrollWidth - innerWidth` overflow, small-target listing, and an axe run with `@axe-core/playwright`:

```js
import { chromium } from 'playwright';
import AxeBuilderPkg from '@axe-core/playwright';
const AxeBuilder = AxeBuilderPkg.default ?? AxeBuilderPkg;
// newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
// await page.goto(base + route, { waitUntil: 'load' }); await page.waitForTimeout(2500);
// for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await sleep(200); }
// const res = await new AxeBuilder({ page }).analyze();  // expect res.violations to be []
```

Git Bash on this PC rewrites an argument like `/` or `/services/` into a Windows path: run such scripts with `MSYS_NO_PATHCONV=1`. Write helper scripts to a file with the Write tool (inline heredocs lose backslashes). Look at every screenshot with the Read tool; a large uniform band means a reveal did not fire, so re-take it.

## Lighthouse (local, mobile)

`lhci autorun` does not complete on this machine (Gotcha 9). The CLI does:

```sh
node node_modules/lighthouse/cli/index.js http://127.0.0.1:8790/services/ --form-factor=mobile --output=json --output-path=out.json --quiet --chrome-flags="--headless=new --no-sandbox"
```

Kill stray headless Chrome between runs (PowerShell: `Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match '--headless' } | Stop-Process -Force`). About one run in three fails with `NO_NAVSTART` (a Chrome temp-profile problem): discard and re-run. Report the median of at least 3 runs against the production build under `wrangler dev`, not `astro dev`. The CI Lighthouse workflow on the PR is the authority.

## The other gates

```sh
npx astro check            # 0 errors expected (about 24 hints are normal)
npm run lint               # 0 errors; 2 old warnings (migrate-case-studies, BeforeAfter) are known
npx prettier --check .     # format every file you touched with --write first, md included
npm run test:unit          # 472 pass at the foundation commit
npm run sync-check         # needs the starter checkout; see .claude/rules/testing-ci.md
node scripts/brand/build-grounds.mjs --check   # only if you touched a colour token
```

`npm run check` is `astro check` plus lint.

## Playwright specs the foundation changed

- `tests/a11y-dark.spec.ts` deleted with dark mode; its contact-form focus-ring check moved into `tests/a11y.spec.ts` ("Focus indicators are visible on form fields").
- `tests/index-pages.spec.ts`: the photography gallery axe test runs once (no theme loop).
- `playwright.config.ts`: webkit-iphone runs `smoke`, `a11y`, `reduced-motion`.
- `tests/smoke.spec.ts` still checks `header nav[aria-label="Primary"] a` (the desktop nav, server-rendered at every width) and `header a[href="/contact/"]` (the header button, now visible on phones too). The phone menu is a `<dialog>` whose nav is labelled "Menu", so it does not double the Primary list. Keep both labels if you touch the header.
- `tests/prose-pages.spec.ts` asserts the Colophon rows against `cms/content/pages.json`. The foundation changed two Colophon rows and two Accessibility paragraphs (fonts, theme); `scripts/ci-dataset/rows.sql` carries the same edit by hand so CI agrees. See `docs/PENDING.md` for the production load.
- 2026-10-04 CI-failure pass: the CMS rows in `scripts/ci-dataset/rows.sql` (site_settings, page_home, page_services, page_contact, page_work, page_not_found, pricing_tiers, pricing_addons, service_offerings) were brought back in line with `cms/content/*.json` by hand, same row ids, because the copy specs compare the preview to the JSON. After any copy edit in `cms/content`, make the matching `rows.sql` row carry it too, then apply the dataset to `ncs-ci`.
- The sitemap integration lists every static server route on its own, so a page that must stay out (`/coming-soon/`, `/cincinnati-event-photography/` while noindex) goes in the `filter` in `astro.config.mjs`, not just out of `customPages`.
- A headline built from two expressions needs an explicit `{' '}` between them: Astro drops the line break, and the heading reads "That pagewandered off." (also to screen readers).

## Grounds and logo assets

- `node scripts/brand/build-grounds.mjs` re-bakes `src/assets/grounds/` from the tokens in `globals.css` and checks every text token against each ground's worst pixel; `--check` only checks.
- `node scripts/brand/build-logo.mjs` copies the vector logo from `docs/redesign-2026/brand/` into `src/assets/brand/` and regenerates the PNG-derived WebP fallbacks.
