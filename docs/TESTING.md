# TESTING.md

A map of which gate covers what, so nobody writes a fifth suite that duplicates
the third. Created 2026-08-27 during the PORTS.md sync session (Card 15).

Registry, not a changelog: when a suite changes, edit the row.

---

## What runs, and where

Brought up to the family test standard on 2026-09-06 (WCP is the reference
implementation; reid-design-site and mas-monograms carry the same shape).

| Gate       | Command                  | Runs in CI           | Covers                                                                                                                                                      |
| ---------- | ------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type check | `npx astro check`        | `ci.yml` (build job) | TypeScript across `.astro`, `.ts`, `.tsx`                                                                                                                   |
| Lint       | `npm run lint`           | `ci.yml` (build job) | ESLint over `src` and `scripts`. A hard gate since 2026-09-06 (see below)                                                                                   |
| Format     | `npm run format:check`   | `ci.yml` (build job) | `prettier --check .` with the family `.prettierrc` (astro + tailwind plugins)                                                                               |
| Unit tests | `npm run test:unit`      | `ci.yml` (build job) | `src/lib/*.test.ts` (see below)                                                                                                                             |
| Build      | `npm run build`          | `ci.yml` (build job) | The whole site compiles and prerenders; every content-collection entry resolves; image and OG generation succeed                                            |
| Link check | `npm run check:links`    | `ci.yml` (build job) | linkinator over `dist/client`: every internal link resolves (300+ links; off-site URLs are skipped)                                                         |
| Playwright | `npm test`               | `ci.yml` (test job)  | smoke, axe light, axe dark + focus indicators, reflow at 320/768/1024/1440, on chromium and a WebKit iPhone (see below)                                     |
| Lighthouse | `npx lhci autorun`       | `lighthouse.yml`     | Accessibility (hard gate at 100), LCP under 4.5s and CLS under 0.1 (hard gates), performance / best-practices / SEO / byte weight as warnings, over 13 URLs |
| Parity     | `npm run parity compare` | **no** (by design)   | Rendered-HTML drift against a committed baseline                                                                                                            |
| Uptime     | -                        | `uptime.yml`, hourly | The live site's key routes still return 200                                                                                                                 |

`npm run check` is the quick local gate: `astro check && npm run lint`.
`npm run check:full` adds the unit tests and the build. `npm test` runs the
Playwright suites (it builds and serves `dist/client` itself); `npm run test:ui`
opens the Playwright UI.

### Playwright (`playwright.config.ts`, `tests/`)

Runs against the real production build served statically (`npm run serve:dist`
= `http-server dist/client -p 4321`), never `astro dev`. Locally an existing
server on 4321 is reused, so `npm run build && npm run serve:dist` in one
terminal and `npx playwright test --project=chromium` in another is the fast
loop. CI installs chromium and webkit and runs both projects.

| File                | Covers                                                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes.ts`         | The route list every sweep iterates: every prerendered page plus one case study standing in for the `/work/[slug]` template. Add a route when a page ships                         |
| `helpers.ts`        | `settle()`: fonts ready, transitions killed, every `[data-reveal]` forced visible, so axe and the reflow measure see the finished page                                             |
| `smoke.spec.ts`     | Every route returns 200 and its title carries the studio name                                                                                                                      |
| `a11y.spec.ts`      | axe-core default rule set (WCAG 2.x A/AA + best practices + `target-size`) on every route, zero violations                                                                         |
| `a11y-dark.spec.ts` | The same sweep with `localStorage["ncs-theme"] = "dark"` seeded before the anti-FOUC bootstrap runs, plus a check that every `/contact` field shows a focus indicator in dark mode |
| `reflow.spec.ts`    | No horizontal overflow at 320px (WCAG 1.4.10) and at 1440/1024/768                                                                                                                 |

The webkit-iphone project runs smoke and both axe sweeps; reflow drives its
own viewport widths, so it is chromium-only. `/coming-soon` is a standalone
document without the theme bootstrap, so the dark sweep skips it.

First run (2026-09-06) found one real bug: `/about` was 342px wide at 320px
because the Terminal's nowrap window title set the min-content of its grid
item. Fixed with `min-w-0` on the item.

### Unit tests (`node --experimental-strip-types --test src/lib/*.test.ts`)

Node's built-in runner, no framework. TypeScript runs through Node's type
stripping, so there is nothing to configure and nothing to install.

| File                       | Covers                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `utils.test.ts`            | `cn()` class merging: clsx syntax forms, tailwind-merge conflict resolution, falsy handling       |
| `readingTime.test.ts`      | Journal reading-time estimation                                                                   |
| `coverPlaceholder.test.ts` | The generated blur-placeholder lookup                                                             |
| `theme-tokens.test.ts`     | **Added 2026-08-27.** WCAG contrast of every rendered token pair in `globals.css`, light and dark |

`theme-tokens.test.ts` is the application of `src/lib/contrast.ts` (PORTS.md
Card 9). It parses the real hex out of the `@theme`, `:root` and `.dark` blocks,
asserts text pairs at 4.5:1 and focus-ring / control-edge pairs at 3:1, and
additionally asserts that the `@theme` literals still mirror their `:root`
twins so the palette documentation cannot quietly go stale. Its header comment
lists every deliberate non-assertion and why. 85 assertions pass as of
2026-08-27; the gate was proved to bite by temporarily lightening
`--muted-foreground`, which produced 4 failures.

**Why it exists next to Lighthouse:** axe (which is what Lighthouse's
accessibility category runs) audits the resting DOM and has **no rule** for
focus-indicator or custom-border contrast, and it only ever sees one theme per
run. The accessibility score can sit at 100 while a focus ring is invisible.
That is not hypothetical - it shipped that way in the WCP repo.

### Parity harness (`npm run parity`)

PORTS.md Card 3, installed 2026-08-27. `capture` snapshots every built page's
normalized HTML into `scripts/.parity/`; `compare` diffs a later build against
it. Neither mode builds - you build, it reads `dist/client`.

Use it for any change that is **supposed** to be render-neutral: extracting a
component, reordering imports, swapping a wrapper, bumping a dependency. It is
not a general test suite and is deliberately **not** in CI: its baselines are
intentionally moved whenever markup legitimately changes, and a gate that is
expected to be re-baselined is a gate that gets rubber-stamped.

```
npm run build
npm run parity capture      # baseline, commit scripts/.parity/*.html
...change something...
npm run build
npm run parity compare      # 23/23 PASS, or a unified diff per page
```

23 routes are auto-discovered. Determinism was measured on install across a
warm rebuild and a cold rebuild (`dist`, `.astro` and `node_modules/.astro`
deleted): 23/23 PASS both times, with **no** site-specific normalizer rules
needed despite the three.js / react-three-fiber content. The evidence is
recorded in the script's header so nobody adds a speculative rule later.

### Lighthouse (`lighthouserc.json`)

The URL list is explicit on purpose. With `staticDistDir` alone, lhci
auto-discovers pages but caps at 5, so it was testing a near-random 5 of 22
including the `/404` page and the Search Console verification stub, which
dragged accessibility below 100. The reasoning is written out at the top of
`lighthouserc.json`; read it before touching that list.

One case study stands in for all ten, since they share a layout; `/coming-soon`
is its own standalone template and is listed too.

The workflow runs on pushes to `main` and `staging` and on pull requests, so a
staging push proves the gate green before anything reaches main.

**This gate cannot be run locally on Nathan's Windows machine.** `npx lhci
autorun` dies during Chrome-profile cleanup with an `EPERM` on its own temp
directory, at collect time, before any assertion is evaluated. Reproduced twice
on 2026-08-27. See Gotcha 9 in `CLAUDE.md`. Trust the CI run.

### Uptime (`.github/workflows/uptime.yml`)

Hourly curl of 7 routes plus one redirect-shape check. Gated on the `SITE_URL`
repo variable, which is **not set yet** - see `docs/PENDING.md`. Schedule is ON
because the repo is public and Actions minutes are free there.

Best-effort only: GitHub's scheduler can be delayed under load. For real
monitoring, point UptimeRobot's free tier at the homepage.

---

## Deliberate absences

- **No console-error smoke pass.** There is significant client JS here
  (three.js / r3f, Lenis, Embla, motion) and nothing asserts that a page
  hydrates without throwing. The family standard does not include one either;
  add it here first if it ever becomes a family suite.
- **No visual-regression / screenshot suite.** The family standard runs one
  only where a site has a fixture-driven `/styleguide` route (WCP does; this
  site does not). CMS- or content-driven pages change with content and flake,
  and a canvas-heavy site is a bad candidate for screenshot diffing anyway.
  The parity harness covers markup drift.
- **No Sanity anything.** No dataset, no Studio, no generated types, so no
  typegen step, no stale-types CI guard, and no backup workflow. Content lives
  in Astro content collections and MDX. See `docs/PENDING.md`.
- **Lint is a hard gate now (2026-09-06), and must stay at 0 errors.** The
  `eslint-plugin-astro` false positive that kept it advisory (an HTML comment
  inside a `{ ... }` expression read as a JSX fragment error) is gone: those
  comments are JSX comments (`{/* */}`) now, which the plugin, prettier, and
  the Astro compiler all agree on. Keep it that way: inside a template
  expression, comment with `{/* */}`, not `<!-- -->`. The remaining output is
  a handful of unused-variable warnings, which do not fail the run.
- **`prettier-plugin-astro` cannot parse a `<script>` inside a template
  expression** (`{cond && (<script>...</script>)}`), so none of the templates
  use that pattern any more: a conditional script goes in its own component
  and the condition wraps the component (see `ComingSoonGate.astro` and
  `src/components/analytics/`). Reintroducing the pattern breaks
  `npm run format:check`.
