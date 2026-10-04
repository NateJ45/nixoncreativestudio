# C. Performance forensics (mobile), 2026-10-04

Measure-only pass. No repo code changed, nothing committed, no forms submitted. Scripts and raw data: `docs/redesign-2026/C-perf/` (`forensics.mjs`, `summarize.mjs`, `probe-home.mjs`, `repeat-view.mjs`, `results-*.jsonl`, slim per-run records; full Lighthouse JSON kept for round 1 of each condition in `C-perf/raw/`).

## 0. Two corrections to the baseline, read first

1. **The baseline Playwright capture was a DESKTOP load, not mobile.** `net-capture.mjs` used `devices['Moto G Power (2022)']`, which does not exist in the installed Playwright (device list has Moto G4, Pixel 5/7 only). The spread of `undefined` silently gave the default 1280x720 desktop context (confirmed: `window.innerWidth` was 1280 in the probe). So the "2.6 MB total, 1.8 MB images, 245 KB HeroCanvasInner, 1 WebGL canvas" figures describe the desktop homepage. On a real phone viewport (412x823, dpr 1.75, same probe): **0 canvases, HeroCanvas chunk and HeroCanvasInner never requested** (`HeroCanvas` is `client:media="(min-width: 1024px)"` in `Hero.astro`). The Lighthouse numbers (585 KB prod, 616 KB CI) were the right mobile numbers all along.
2. **The CI preview is not the same build as production for the hero image.** Production serves the LCP image at `w=420&q=55` (64 KB). CI serves `w=420` with no `q` (115 KB, the pre-quality-change build). So CI scoring higher than prod (94 vs 84) happens despite a heavier hero image there.

Real mobile page weight, measured with a mobile-viewport Playwright load that waits 5 s after load (includes the deferred Selected Work images that start 3.5 s after load): CI 1.2 MB / 36 requests, prod 1.7 MB / 48 requests. Lighthouse stops at `load`, so it sees 0.6 MB.

## (a) Measured cost table (CI preview home, Lighthouse CLI 12.6.1, mobile, simulated Slow 4G / 4x CPU)

Method: per class, `--blocked-url-patterns` (or a local HTML-rewriting proxy for DOM-level changes), round-robin with an unblocked control in the same session. Delta = median of class minus median of control. Controls drift between sessions (CI home control median 2973 ms in the main batch, 3620 ms in the proxy batch), so deltas are only comparable inside one table. LCP is bimodal on this machine (about 2.7 to 2.9 s or about 3.6 s, a 0.8 s step), so min-max is shown; treat deltas under about 250 ms as noise.

### CI preview, home, n=7 per condition (median of 7)

| Class (what was blocked)                                          | Transfer saved (KB)               | LCP delta (ms)                | Score delta         | n   | Reading                                                                                               |
| ----------------------------------------------------------------- | --------------------------------- | ----------------------------- | ------------------- | --- | ----------------------------------------------------------------------------------------------------- |
| control                                                           | 0 (616 KB, 37 req)                | 0 (LCP 2973, range 2721-3627) | 0 (94, range 87-96) | 7   |                                                                                                       |
| 1 WebGL canvas + `HeroCanvas*` chunk                              | 2                                 | -167                          | +2                  | 7   | Nothing was requested on mobile; delta is noise                                                       |
| 2 hero image (`shot-img`, exact LCP URL)                          | 115                               | +1045                         | -8                  | 7   | LCP moves to a later image; blocking it is not a saving                                               |
| 2b all images (`/_image`, media)                                  | 247                               | +66                           | -2                  | 7   | LCP element becomes the grain overlay, so the metric changed; FCP flat (1733 vs 1725)                 |
| 3 client marquee (DOM removed via proxy, 5 runs, see table below) | 140                               | -79                           | +2                  | 5   | Within proxy noise (proxy control -78)                                                                |
| 4 fonts (`*.woff2`)                                               | 43                                | +636                          | -5                  | 7   | Not separable: fallback font reflow, 9 extra requests. Blocking fonts hurts; do not read it as a cost |
| 5 all React island JS                                             | 110                               | -100                          | 0                   | 7   | Small on CI                                                                                           |
| 6 Lenis                                                           | 0 (6 KB, loaded after LCP window) | -170                          | +1                  | 7   | Noise                                                                                                 |
| 7 beacon/jsd/Turnstile                                            | 0 (CI has none)                   | -108                          | 0                   | 7   | CI has no beacon; control for noise                                                                   |
| 7b page prefetch (the 6 to 8 pages `ClientRouter` fetches)        | 147                               | -247                          | +1                  | 7   | Borderline                                                                                            |
| JS floor (all `*.js` blocked)                                     | 395                               | -250                          | +1                  | 7   | Even zero JS gives only -250 ms on CI home                                                            |
| "floor" (islands + lenis + prefetch + beacon)                     | 257                               | -117                          | +1                  | 7   |                                                                                                       |
| "floorimg" (floor + hero image blocked)                           | 371                               | -556                          | +3                  | 7   | LCP element becomes the next image                                                                    |

### CI preview, home, DOM-level classes via proxy (n=5, same session as its own control)

| Class                                                            | Transfer (KB)                   | LCP ms median (range) | Score          | n   |
| ---------------------------------------------------------------- | ------------------------------- | --------------------- | -------------- | --- |
| direct control                                                   | 616                             | 3620 (2710-3624)      | 87 (87-96)     | 5   |
| proxy passthrough control                                        | 630                             | 3542 (2641-3544)      | 90 (88-96)     | 5   |
| marquee element removed                                          | 476                             | 3540 (3096-3548)      | 89 (88-93)     | 5   |
| the 3 stylesheets inlined into the HTML (no stylesheet requests) | 737 (inlined CSS is not cached) | **2623 (2618-3532)**  | **96 (90-96)** | 5   |

The proxy itself costs nothing measurable (control vs passthrough, -78 ms). Inlining CSS is the one non-JS lever that moved LCP by about 1 s in the median (4 of 5 runs at 2.62 s against 4 of 5 control runs at 3.62 s). It is consistent with Lighthouse's own render-blocking audit: the three stylesheets (25 KB main CSS, 3 KB, 3 KB) are listed with 457 to 757 ms estimated savings. n=5 and bimodal, so confirm with more runs before relying on the full second; the direction is supported by the audit.

### Production, home, n=5 per condition

| Class                                    | Transfer saved (KB) | LCP delta (ms)                | Score delta         | n               |
| ---------------------------------------- | ------------------- | ----------------------------- | ------------------- | --------------- |
| control (584 KB, 47 req)                 | 0                   | 0 (LCP 3956, range 3084-4003) | 0 (85, range 85-93) | 5               |
| 1 WebGL                                  | 1                   | -26                           | 0                   | 5               |
| 2 hero image                             | 65                  | +496                          | -4                  | 5               |
| 2b all images                            | 184                 | -280                          | +2                  | 5               |
| 4 fonts                                  | 44                  | +1                            | 0                   | 5               |
| **5 React island JS**                    | 109                 | **-896**                      | **+8**              | 5 (93, 3060 ms) |
| 6 Lenis                                  | 1                   | 0                             | 0                   | 5               |
| **7 Cloudflare beacon + jsd**            | 20                  | **-467**                      | **+4**              | 5               |
| 7b page prefetch                         | 271                 | -2                            | 0                   | 5               |
| JS floor (no JS at all)                  | 413                 | **-1241**                     | **+10**             | 5 (95, 2715 ms) |
| floor (islands, lenis, prefetch, beacon) | 288                 | -1231                         | +10                 | 5               |
| floorimg                                 | 352                 | -1502                         | +12                 | 5 (97, 2454 ms) |

### Secondary pages, CI preview (n=5)

| Page / class                              | Transfer saved (KB) | LCP delta (ms) | Score delta                                                                                                                                     |
| ----------------------------------------- | ------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| /work/ control                            | 380 KB              | 0 (2974)       | 0 (93)                                                                                                                                          |
| /work/ images blocked                     | 112                 | -172           | +1                                                                                                                                              |
| /work/ islands blocked                    | 108                 | -476           | +4                                                                                                                                              |
| /work/ prefetch blocked                   | 26                  | -83            | +1                                                                                                                                              |
| /work/ no JS                              | 174                 | -712           | +5                                                                                                                                              |
| case study control (presbyterian-academy) | 495 KB              | 0 (3771)       | 0 (88)                                                                                                                                          |
| case images blocked                       | 247                 | -449           | +3                                                                                                                                              |
| case islands blocked                      | 108                 | **-933**       | **+7**                                                                                                                                          |
| case prefetch blocked                     | 0                   | -104           | +1                                                                                                                                              |
| case no JS                                | 148                 | -1656          | +10 (caveat: LCP element switches from the lead paragraph to the header wordmark, so this number is partly a changed metric, not a pure saving) |

Case study LCP is the lead paragraph (text), with observed element render delay 869 ms in control against 83 ms with no JS. No image is involved, so for that page the cost is JS and render path, not bytes of imagery.

Other classes (not LCP-relevant, measured for completeness):

- **CSS size:** 3 files, 25 + 3 + 3 KB brotli (main file is 135 KB raw, 8 `@font-face` blocks with `unicode-range`, only the latin subset is fetched). All three are render-blocking.
- **Fonts:** 2 files, 14 KB (Bebas Neue latin) + 29 KB (Source Sans 3 variable latin), both preloaded, immutable 1-year cache. **Geist is not shipped** (no `@font-face`, 0 bytes); `@fontsource-variable/geist` is still a dead dependency in `package.json`.
- **Images binding (`/_image`):** WebP only (no AVIF), width-only resize. Hero served at 420 w for an element rendered 287 CSS px x 1.75 dpr = 502 device px (about 16% soft, acceptable). Prod hero is q=55 (64 KB), CI is not (115 KB). Cache: `public, max-age=2592000, stale-while-revalidate=86400`, `CF-Cache-Status: HIT`. Fonts, JS, CSS: `immutable`, 1 year. HTML: `max-age=120, swr=3600` (route cache). Repeat view (same browser context): 8 KB (CI) and 11 KB (prod) over the wire for the whole homepage; every asset was served from the browser cache.
- **Layout shift:** CLS 0.000 in every run. **TBT:** 0 to 21 ms everywhere (7 to 21 on prod, 0 on CI).

## (b) Ranked causes

### The 84 (prod) vs 94 (CI) gap and the 3.0 to 4.0 s LCP

Lighthouse's LCP is a simulated number: observed LCP in the same traces is 300 to 500 ms; the simulator then replays the dependency graph at 1.6 Mbps / 150 ms RTT / 4x CPU. TBT is about 0, so main-thread work is not the cost (first-strike hypothesis "JS execution time" fails on the TBT data). What the simulator charges is **bytes and round trips in front of the LCP paint**:

1. **JavaScript that is fetched before the LCP paint competes for the simulated pipe (largest, measured).** Island JS is about 110 KB (React 64 KB `client.*.js`, MobileNav 16 KB, bundle 9.5 KB, rest small), roughly 0.55 s at 1.6 Mbps. Blocking it moved LCP by -896 ms and +8 points on prod home, -933 ms on a case study, -476 ms on /work/, but only -100 ms on CI home (noisy there). Zero-JS floor: prod +10 points, LCP 2715 ms.
2. **Cloudflare beacon.min.js + `jsd` main.js on production only (measured, 20 KB, 8 fewer requests):** -467 ms, +4 points on prod home. This is part of the prod vs CI gap by construction (CI has neither). It also costs prod Best Practices (82 vs 100, the `jsd` `StorageType.persistent` deprecation).
3. **Three render-blocking stylesheets (31 KB):** inlining them gave -1 s on CI home (n=5, bimodal) and matches the render-blocking audit (457 to 757 ms each). Prod carries the same three.
4. **The hero image itself (115 KB CI, 64 KB prod).** Removing it is not an option (LCP just moves to the next image, +496 to +1045 ms), but the image is the floor: with all of 1 to 3 removed and the hero blocked the score is 97 and 2.4 s. A 64 KB hero on prod should already beat CI's 115 KB, yet prod is slower, so the image is not what separates them.
5. **Page prefetch (6 to 9 whole pages, 147 KB CI / 271 KB prod, 25 KB each):** only -247 ms on CI, -2 ms on prod. Real transfer cost on every home load, but not an LCP cause in the model.

What is NOT a cost on mobile (measured, not assumed): WebGL canvas and its 245 KB chunk (not requested; delta within noise on both targets), Lenis (6 KB, loads after the window), the client marquee (DOM, -79 ms against a -78 ms proxy control), fonts (43 KB, preloaded; blocking them made things worse), CLS and TBT.

Unexplained, stated plainly: (i) why prod loses more from JS than CI does (-896 vs -100 ms on home) is not proven. Candidates: prod has 10 more requests (beacon, jsd, 9 prefetches vs 6), hence more contention before the LCP request completes in the simulator; prod's graph sits permanently in the slow LCP mode while CI flips between modes; the prod Worker HTML is warmer/colder at different times. (ii) The 0.8 s bimodal step in CI controls (2.7 to 2.9 s vs 3.6 s) has no proven cause; it is about the size of one 150 ms-RTT x few round trips, or of one 110 KB JS batch, and it accounts for the 87 vs 95 score swings. Three alternatives to test next: whether an island script lands inside or outside the LCP request window (trace `lcp-discovery` ordering), whether the prefetch fetches begin before the LCP image completes, and whether font preload vs CSS arrival order changes the first paint.

## (c) Proposed hard performance budget for the redesign (mobile, Lighthouse simulated Slow 4G, home and every page)

| Item                     | Budget                                                                       | Today (CI / prod home)                  |
| ------------------------ | ---------------------------------------------------------------------------- | --------------------------------------- |
| HTML (brotli)            | <= 30 KB                                                                     | 27 / 28                                 |
| CSS (brotli, total)      | <= 30 KB, critical CSS inlined, no render-blocking stylesheet                | 31 / 30, 3 blocking files               |
| JS before the LCP paint  | <= 30 KB (0 React islands needed to paint)                                   | about 120 / 140, all fetched before LCP |
| JS total at `load`       | <= 70 KB                                                                     | 120 / 140                               |
| Third-party JS           | 0 at load (analytics only after load / idle; accept beacon only if deferred) | 0 / 20                                  |
| Fonts                    | <= 45 KB, 2 files, preloaded                                                 | 43 / 43                                 |
| LCP image                | <= 60 KB, eager + `fetchpriority=high`, or LCP is text                       | 115 / 64                                |
| Images at `load`, total  | <= 120 KB                                                                    | 243 / 179                               |
| Total transfer at `load` | <= 300 KB                                                                    | 616 / 584                               |
| Requests at `load`       | <= 25                                                                        | 37 / 47                                 |
| Prefetch                 | none on first load (move to hover/intent)                                    | 6 to 9 pages, 147 to 271 KB             |
| LCP (simulated)          | <= 2.5 s median of 5, p-worst <= 3.0 s                                       | 2.7-3.6 / 3.1-4.0                       |
| TBT                      | <= 50 ms                                                                     | 0 / 17                                  |
| CLS                      | 0                                                                            | 0                                       |
| Score                    | >= 95 median of 5, none under 90                                             | 94 / 85                                 |

Sizing basis: at 1.6 Mbps, 1 KB costs about 5 ms, so 110 KB of island JS is about 0.55 s and a 245 KB chunk about 1.2 s.

**What cannot fit:**

- **The WebGL hero cannot fit any mobile budget.** The 245 KB `HeroCanvasInner` chunk alone would cost about 1.2 s of simulated LCP and blow the JS budget 3.5 times. Today it is already excluded from phones (`client:media >= 1024px`), which is why it measured as zero cost; keep it that way or drop it. On desktop it can survive only as an idle-loaded, post-LCP enhancement with its own desktop budget (lazy chunk <= 250 KB, loaded after `load` plus idle, with the CSS aurora as the first-paint state, never LCP). If the redesign wants a headline motion piece on mobile, it must be CSS or a < 30 KB inline script.
- **Hydrating React islands for the header (MobileNav, ThemeToggle, BackToTop) at load** does not fit; each pulls React (64 KB) onto the critical window. Native `<details>` / `popover` nav and a tiny vanilla toggle fit.
- **ClientRouter view transitions with eager prefetch** (5 KB + page fetches) do not fit as default behavior.
- **A below-the-fold image pile (all of Selected Work at `load`)** does not fit; the existing deferral (gotcha 14) is correct and must carry over.
- A 3.5 s timer to fetch deferred images is fine for score but real mobile weight reaches 1.2 to 1.7 MB within 5 s; if "page weight" is ever marketed, that is the honest figure.

## (d) Stone Steps and Reid comparison and the "must beat or match" goal

From the baseline (Lighthouse CLI, same machine and method, n=5 each, median): **stonesteps50k.com 86** (LCP 3.81 s, FCP 2.42 s, 843 KB, 398 KB third-party gtag + beacon, LCP element a headline span) and **reiddesignllc.com 83** (LCP 4.14 s, 815 KB, 201 KB fonts, 300 KB third-party). Both are Nathan's own recent builds; neither uses WebGL on its measured path (Reid has a canvas on desktop, the baseline capture there was also desktop).

Reading: both lose on third-party (gtag 174 KB) and weight, not on a hero feature. The current studio home is 85 (prod) to 94 (CI), so prod already matches Stone Steps within noise (score noise on one site is 87 to 96) and CI beats both. "Match" is ~86 and is already met; "beat" needs a clear margin over a noisy 83 to 86. A defensible standard is: median of 5 >= 95 with every run >= 90 and LCP <= 2.5 s, which beats both by 9 to 12 points and 1.3 to 1.6 s of LCP, and which the measured floor (97 / 2.4 s with image-only left) shows is reachable only by removing front-loaded JS and render-blocking CSS, not by trimming images or the canvas. Any claim must be made against medians of at least 5 runs of the same session, because a single run swings 8 to 10 points.

## (e) Reconciling the market-research agent's 252 ms unthrottled NCS LCP

Both numbers are real and measure different things. Unthrottled, my mobile-viewport Playwright probe of the CI home recorded LCP 272 ms (hero image painted at 272 ms, TTFB 95 ms, DCL 238 ms, load 247 ms), and Lighthouse's own trace shows observed LCP phases summing to about 300 to 500 ms; that matches the 252 ms the other agent saw. The 2.7 to 4.0 s figures are Lighthouse's simulated Slow 4G (1.6 Mbps down, 150 ms RTT) plus 4x CPU slowdown applied to that same trace, which stretches a 115 KB image, 31 KB of CSS and about 110 KB of JS into seconds. Real users on good LTE or Wi-Fi get something near the fast figure; users on the throttled profile (PageSpeed's mobile score, slow phones) get the slow one. Budgets should therefore be stated in bytes and request counts (stable) as well as simulated LCP.

## Gates: commands, runs, discards

- Environment: Windows 11, Node 24.16, Lighthouse 12.6.1 (`node node_modules/lighthouse/cli/index.js <url> --form-factor=mobile --output=json --quiet --chrome-flags="--headless=new --no-sandbox"` plus `--blocked-url-patterns=<pattern>` per class; default simulated throttling). Headless Chrome killed before every run (`kill-headless.ps1`, headless processes only). Never `lhci autorun`.
- Driver: `node docs/redesign-2026/C-perf/forensics.mjs <ci|prod> <home|work|case> <rounds> <conditions> <tag>`, round-robin (round 1 runs every condition once, then round 2, ...). `summarize.mjs <tag>` makes the tables.
- Valid runs used: CI home 12 conditions x 7 = 84; CI home proxy batch 4 x 5 = 20; prod home 12 x 5 = 60; CI /work/ 5 x 5 = 25; CI case 5 x 5 = 25. Total 214. Medians reported with min-max.
- Probes (no Lighthouse): `probe-home.mjs` (mobile viewport 412x823 dpr 1.75, confirmed 0 canvas, no WebGL chunk, unthrottled LCP 272 ms), `repeat-view.mjs` (cold then warm load on CI and prod).
- Discarded / failed runs (all recorded, files in `C-perf/discarded/`, 20 JSON files): about 6 `NO_NAVSTART` retries (the known Chrome temp-profile EPERM problem; each retried up to 3 times and the retry used) across smoke and main batches; and several dozen attempts lost to my own tooling mistakes, not to the site: (1) the first proxy design ran the proxy inside the same Node process that blocks on `spawnSync`, so every proxy-condition run timed out (no JSON); (2) the proxy then returned corrupted HTML because Chrome and curl advertise `zstd`, which my decoder did not handle (fixed by forcing `br, gzip` upstream); (3) the marquee mode name did not match the condition name (no-op); (4) inlined CSS used `String.replace` with `$` patterns (broke the page, giving a meaningless 100/867 ms result that was thrown away). The final proxy batch had zero discards; its marquee removal was verified in the HTML (element gone, 115,537 to 113,041 bytes). The 3 smoke runs (`smoke-*`) were not counted.
- Not done: WebGL cost on desktop (out of scope, mobile only); a hero-image variant sweep (CI and prod hero differ in quality, so a q-sweep through the proxy is the obvious next test); more than 5 runs of the CSS-inline condition; Stone Steps and Reid ablations (baseline numbers reused, same day, same method).
- Caveat for the whole report: this lab's absolute numbers read higher than CI's Lighthouse (gotcha 14). Use the deltas and the ranking, not the absolute values.
