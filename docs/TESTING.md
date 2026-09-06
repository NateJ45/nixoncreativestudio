# TESTING.md

A map of which gate covers what, so nobody writes a fifth suite that duplicates
the third. Created 2026-08-27 during the PORTS.md sync session (Card 15).

Registry, not a changelog: when a suite changes, edit the row.

---

## What runs, and where

| Gate       | Command                  | Runs in CI           | Covers                                                                                                                |
| ---------- | ------------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Build      | `npm run build`          | `ci.yml`             | The whole site compiles and prerenders; every content-collection entry resolves; image and OG generation succeed      |
| Unit tests | `npm test`               | `ci.yml`             | `src/lib/*.test.ts` (see below)                                                                                       |
| Lighthouse | `npx lhci autorun`       | `lighthouse.yml`     | Accessibility (hard gate at 100), plus performance / best-practices / SEO as warnings, over 12 explicitly listed URLs |
| Lint       | `npm run lint`           | **no**               | ESLint over `src` and `scripts`                                                                                       |
| Parity     | `npm run parity compare` | **no** (by design)   | Rendered-HTML drift against a committed baseline                                                                      |
| Uptime     | -                        | `uptime.yml`, hourly | The live site's key routes still return 200                                                                           |

`npm run check` is the local shorthand for what `ci.yml` does: build, then test.

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

One case study stands in for all ten, since they share a layout.

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

- **No Playwright / axe / reflow suite** (PORTS.md Card 8). This is the real
  gap. What is missing specifically:
  - a **320px** reflow sweep. WCAG 1.4.10 starts at 320 and Lighthouse does not
    test reflow at all. WCP's 2026-07-14 audit swept 752 route-by-width
    combinations and every finding was somewhere nobody had screenshotted.
  - a **dark-mode** axe pass. This site has a full three-state theme toggle, and
    axe audits one resting DOM per run. Lighthouse runs light only, so dark mode
    has no automated accessibility coverage at all today. `theme-tokens.test.ts`
    covers dark-mode _contrast_, which is the largest slice of that risk, but
    not landmarks, names, or roles.
  - a **console-error smoke** pass. There is significant client JS here
    (three.js / r3f, Lenis, Embla, motion) and nothing asserts that a page
    hydrates without throwing.
- **No visual-regression / screenshot suite.** The parity harness covers markup
  drift; nothing covers rendered pixels. Deliberate - a canvas-heavy site is a
  bad candidate for screenshot diffing.
- **No Sanity anything.** No dataset, no Studio, no generated types, so no
  typegen step, no stale-types CI guard, and no backup workflow. Content lives
  in Astro content collections and MDX. See `docs/PENDING.md`.
- **Lint is not in CI, and exits 1 today.** `npm run lint` reports 7 errors and
  5 warnings (measured 2026-08-27). All 7 errors are the same known
  `eslint-plugin-astro` false positive that `CLAUDE.md` documents: the plugin
  misreads an HTML comment inside a `{ ... }` expression as a JSX fragment
  error. They sit in `contact.astro`, `journal/index.astro`,
  `photography.astro`, `services.astro` and `work/index.astro`. Nothing in
  `src/lib` or `scripts` lints dirty. Lint stays advisory and out of `ci.yml`
  for exactly this reason - the build is the source of truth. Do not read a red
  `npm run lint` as evidence your change broke something; diff it against this
  baseline first.
