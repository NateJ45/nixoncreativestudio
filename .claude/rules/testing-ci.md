---
paths:
  - 'tests/**'
  - 'src/lib/**'
  - '.github/workflows/**'
  - 'playwright.config.ts'
  - 'lighthouserc.json'
  - 'eslint.config.js'
  - '.prettierrc'
  - '.prettierignore'
  - 'scripts/**'
  - 'package.json'
---

# Testing, linting, and CI

Moved out of CLAUDE.md. Loads when tests, unit-tested libs, workflows or tool configs are touched.

The repo carries a light quality-gate layer, matched to the rest of Nathan's Astro + Cloudflare sites.

WCP is the reference for this standard; reid-design-site and mas-monograms carry the same shape. `docs/TESTING.md` is the map of what covers what.

- `npm test` runs the Playwright suites in `tests/` (`playwright.config.ts`): `smoke` (every route 200s with the studio name in its title), `a11y` (axe-core default rules on every route, zero violations), `a11y-dark` (the same sweep with `localStorage["ncs-theme"]` seeded to `dark` before the anti-FOUC bootstrap runs, plus a focus-indicator check on the contact form), `reduced-motion` (PORTABLE, starter PORTS.md card 61: nothing still running 2.5s after load under `reducedMotion: 'reduce'`), and `reflow` (no horizontal overflow at 320px, WCAG 1.4.10, and at 1440/1024/768). Chromium runs everything; a WebKit iPhone 14 profile runs smoke, both axe sweeps and reduced-motion. The config's webServer builds and serves `dist/client` on 4321 (`npm run serve:dist`), and locally an already-running server there is reused. `tests/routes.ts` is the route list: add a line when a prerendered page ships. `npm run test:ui` opens the Playwright UI.
- `npm run test:unit` runs the `node --test` unit suites in `src/lib/*.test.ts` (currently `cn`, `readingTime`, `coverPlaceholder`, and `theme-tokens`). They run under Node's native type stripping, so they import the `.ts` modules directly with no build step.
- `src/lib/theme-tokens.test.ts` is the **theme-token contrast gate**, added 2026-08-27. It parses the real hex out of the `@theme`, `:root` and `.dark` blocks of `globals.css` and asserts every rendered token pair against WCAG AA (4.5:1 for text, 3:1 for focus rings and control edges), in **both** modes, plus that the `@theme` literals still mirror their `:root` twins. It exists because axe (and therefore the Lighthouse accessibility category) has no rule for focus-indicator or custom-border contrast and only ever sees one theme per run: the score can sit at 100 while a focus ring is invisible. The math lives in `src/lib/contrast.ts`. Its header comment lists every deliberate non-assertion; read that before adding or removing a pair.
- `npm run lint` runs eslint (flat config in `eslint.config.js`) over `src` and `scripts`. A hard gate in CI since 2026-09-06 (0 errors; a few unused-variable warnings remain and do not fail it). The old `eslint-plugin-astro` false positive (an HTML comment inside a `{ ... }` expression read as a JSX error) is gone because every such comment is a JSX comment now. Inside a template expression, comment with `{/* */}`, never `<!-- -->`.
- `npm run format` runs prettier across the repo (family config in `.prettierrc`: single quotes, semis, trailing commas, printWidth 100, `prettier-plugin-astro` + `prettier-plugin-tailwindcss`; ignore list in `.prettierignore`). `npm run format:check` is the CI form. `prettier-plugin-astro` cannot parse a `<script>` nested inside a template expression, so a conditional script goes in its own component and the condition wraps the component (`ComingSoonGate.astro`, `src/components/analytics/`).
- `npm run check` is the quick gate: `astro check && npm run lint`. `npm run check:full` adds the unit tests and the build.
- `npm run check:links` runs linkinator over `dist/client` after a build; every internal link must resolve (off-site URLs are skipped). The log must say "scanned N links" with N in the hundreds.
- `.github/workflows/ci.yml` runs on pushes to `main`, on pull requests, and by hand. Job `build`: `npm ci`, sync-check against the starter (on drift, `scripts/propose-drift.mjs` opens a PR in the starter, then the gate still fails), `astro check`, lint, format check, unit tests, build, link check. `build` and `test` are required status checks in the `main` ruleset (PR plus green CI), so keep those job names and never add a path filter to `ci.yml`. Job `test` (parallel): Playwright browsers, `npm test`, and the `playwright-report/` artifact (14 days).
- `.github/workflows/lighthouse.yml` runs Lighthouse CI (`@lhci/cli`, config in `lighthouserc.json`) against the built static output on pushes to `main` and on PRs. **Accessibility is a hard gate at minScore 1** (the 100-a11y bar the studio sells), and so are LCP under 4.5s and CLS under 0.1; performance / best-practices / SEO scores and total byte weight are warnings so normal CI variance doesn't block a PR. It runs on `ubuntu-latest`; see Gotcha 9 in `docs/claude/gotchas.md` for why the local run is not trustworthy on Windows.
- `.github/workflows/uptime.yml` curls the live site's key routes hourly and fails the run if any does not end at 200. Gated on the `SITE_URL` repo variable, which is not set yet (see `docs/PENDING.md`). Schedule is on because the repo is public and Actions minutes are free there.
- `.github/workflows/dependabot-auto-merge.yml` squash-merges a Dependabot PR (minor and patch only) once every check run on it is green.
- `npm run parity capture` / `compare` is the **rendered-HTML parity harness** (`scripts/page-parity.mjs`, baselines committed in `scripts/.parity/`). It never builds; you build, it reads `dist/client`. Reach for it on any change that is supposed to be render-neutral. Deliberately not in CI, because its baselines are meant to be re-captured when markup legitimately changes and a gate that gets re-baselined is a gate that gets rubber-stamped.
- `npm run sync-check` diffs this repo's copies of the shared "library of record" files against `ncs-astro-sanity-starter` (point at it with `NCS_STARTER_DIR`). Four files are marked canonical here: `scripts/free-dist.mjs`, `scripts/with-workerd.mjs`, `scripts/sync-check.mjs`, and `src/lib/contrast.ts`. Read that repo's `PORTS.md` before editing any of them, and port a fix back rather than patching locally. **This is a CI gate since 2026-09-06** (PORTS.md card 36): the build job checks the starter out at `.ncs-starter` and runs the script against it on every push and PR, so drift fails the build instead of waiting for someone to run it by hand.
- `npm run free-dist` is the manual form of the `prebuild` hook (Gotcha 6 in `docs/claude/gotchas.md`).
- `docs/PENDING.md` is the authoritative open-patch and waiting-on-a-human queue; `docs/TESTING.md` maps which gate covers what. Both are registries: edit them in the same commit as the thing they track.

One JSON-import note: `src/lib/coverPlaceholder.ts` imports its JSON with `with { type: 'json' }`. Node's native ESM loader (used by the test runner) requires that attribute, and Vite accepts it during the build, so the one import works in both places.
