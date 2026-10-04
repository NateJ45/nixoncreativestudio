# Live performance numbers, post-redesign

Measured 2026-10-04 (same day the redesign went live, squash commit 795f672 on main) against https://nixoncreativestudio.com. Same method as `baseline/perf/baseline-numbers.md`: Lighthouse CLI, mobile emulation (simulated Slow 4G, 4x CPU), `--headless=new --no-sandbox`, 5 runs per URL, median run by performance score, stray headless Chrome killed before every run. Network capture: Playwright CDP, Moto G Power (2022) profile, cache off, 4 s after networkidle. Raw Lighthouse JSON in `live/raw/`, summary in `live/live-summary.json`, network capture in `live/live-network-capture.json`. Scripts: `live/run-live.mjs`, `live/analyze-live.mjs`, `live/net-live.mjs`. 35 of 35 runs completed (one retry on /work/ run 3, a null-score run discarded and repeated).

Caveats:

- Production still serves the OLD CMS copy. The production data load has not run yet, so page text and CMS-driven content are still the pre-redesign copy inside the new templates. Numbers will move again once the load runs.
- The production Cloudflare jsd bot script still affects best-practices: 82 before, 82 now on every page. The only failing audit is `deprecations`.
- The case study is a different page from baseline (baseline: `/work/first-baptist-muncie/`, now: `/work/stone-steps-50k/`), so that row is indicative, not like for like. `/church-websites/` is new, no baseline.

## Side by side: baseline production vs live now

| Page                                   | Perf before | Perf now | Change | LCP s before | LCP s now (median run) | Change         |
| -------------------------------------- | ----------- | -------- | ------ | ------------ | ---------------------- | -------------- |
| /                                      | 84          | 97       | +13    | 3.96         | 2.42                   | -1.54          |
| /work/                                 | 90          | 97       | +7     | 3.56         | 2.35                   | -1.21          |
| case study (FBM then, Stone Steps now) | 88          | 97       | +9     | 3.85         | 2.24                   | -1.61          |
| /services/                             | 97          | 98       | +1     | 2.30         | 2.09                   | -0.21          |
| /about/                                | 96          | 97       | +1     | 2.59         | 2.38                   | -0.21          |
| /contact/                              | 98          | 97       | -1     | 2.19         | 2.37                   | +0.18 (slower) |
| /church-websites/                      | n/a         | 97       | n/a    | n/a          | 2.46                   | n/a            |

## Scores and Core metrics, live (median run)

| URL                    | Perf (all 5)          | LCP s (median run) | LCP s (median of 5) | FCP s | CLS   | TBT ms | SI s | A11y | BP  | SEO |
| ---------------------- | --------------------- | ------------------ | ------------------- | ----- | ----- | ------ | ---- | ---- | --- | --- |
| /                      | 97 (95/97/97/97/97)   | 2.42               | 2.42                | 1.80  | 0.000 | 17     | 1.80 | 100  | 82  | 100 |
| /work/                 | 97 (97/97/97/98/100)  | 2.35               | 2.33                | 1.76  | 0.000 | 42     | 1.76 | 100  | 82  | 100 |
| /work/stone-steps-50k/ | 97 (96/97/97/97/100)  | 2.24               | 2.24                | 1.89  | 0.000 | 95     | 2.22 | 100  | 82  | 100 |
| /services/             | 98 (98/98/98/99/100)  | 2.09               | 1.96                | 1.89  | 0.000 | 12     | 1.89 | 100  | 82  | 100 |
| /about/                | 97 (97/97/97/98/99)   | 2.38               | 2.38                | 1.77  | 0.000 | 9      | 1.77 | 100  | 82  | 100 |
| /contact/              | 97 (97/97/97/100/100) | 2.37               | 2.36                | 1.59  | 0.000 | 9      | 1.59 | 100  | 82  | 100 |
| /church-websites/      | 97 (97/97/97/97/99)   | 2.46               | 2.47                | 1.77  | 0.000 | 28     | 1.77 | 100  | 82  | 100 |

## Change vs baseline production (other metrics, median run)

| Page       | FCP s before to now  | TBT ms before to now | SI s before to now   | A11y       | BP       | SEO        |
| ---------- | -------------------- | -------------------- | -------------------- | ---------- | -------- | ---------- |
| /          | 2.48 to 1.80 (-0.68) | 13 to 17 (+4)        | 2.48 to 1.80 (-0.68) | 100 to 100 | 82 to 82 | 100 to 100 |
| /work/     | 1.71 to 1.76 (+0.05) | 18 to 42 (+24)       | 1.71 to 1.76 (+0.05) | same       | same     | same       |
| case study | 1.30 to 1.89 (+0.59) | 11 to 95 (+84)       | 1.42 to 2.22 (+0.80) | same       | same     | same       |
| /services/ | 1.87 to 1.89 (+0.02) | 11 to 12 (+1)        | 1.87 to 1.89 (+0.02) | same       | same     | same       |
| /about/    | 1.80 to 1.77 (-0.03) | 11 to 9 (-2)         | 1.80 to 1.77 (-0.03) | same       | same     | same       |
| /contact/  | 1.68 to 1.59 (-0.09) | 11 to 9 (-2)         | 1.83 to 1.59 (-0.24) | same       | same     | same       |

CLS is 0.000 everywhere, before and after.

## LCP element, live

| URL                    | LCP element                                                                     |
| ---------------------- | ------------------------------------------------------------------------------- |
| /                      | figure.vp > div.print > picture > img.astro-m5h6ukhe (image)                    |
| /work/                 | a.wp-pic > figure.frame > div.frame-print > img (image)                         |
| /work/stone-steps-50k/ | div.reel-print > nx-reel > picture > img.nxr-poster (image, reel poster)        |
| /services/             | h1#services-hero-heading (text)                                                 |
| /about/                | p.type-lede (text)                                                              |
| /contact/              | section.band > div.ground-layers > div.g-sun > div.g-sun (decorative sun layer) |
| /church-websites/      | p.lp-hero-intro > p.type-lede (text)                                            |

## Transfer weight, Lighthouse median run (KB)

CSS shows 0 because the stylesheet is no longer a separate request; HTML grew (about 32 to 42 KB vs 24 to 28 KB) which suggests CSS is inlined. Not verified in the HTML source.

| URL                    | Total | HTML | CSS | JS  | Fonts | Images | Other | Requests |
| ---------------------- | ----- | ---- | --- | --- | ----- | ------ | ----- | -------- |
| /                      | 346   | 42   | 0   | 32  | 39    | 225    | 8     | 30       |
| /work/                 | 180   | 35   | 0   | 31  | 39    | 65     | 9     | 27       |
| /work/stone-steps-50k/ | 629   | 41   | 0   | 35  | 55    | 400    | 99    | 34       |
| /services/             | 162   | 40   | 0   | 31  | 39    | 44     | 8     | 25       |
| /about/                | 414   | 33   | 0   | 32  | 55    | 287    | 8     | 32       |
| /contact/              | 153   | 32   | 0   | 34  | 39    | 40     | 8     | 28       |
| /church-websites/      | 244   | 37   | 0   | 32  | 55    | 113    | 8     | 26       |

Baseline production totals for comparison (KB, total / JS / requests): home 585 / 140 / 47, work 585 / 141 / 45, case (FBM) 485 / 140 / 42, services 325 / 140 / 40, about 658 / 140 / 39, contact 725 / 572 / 54. The contact page lost its roughly 468 KB third-party script load (JS 572 to 34 KB).

## Playwright CDP capture (Moto G Power profile, cache off, 4 s after networkidle)

| URL                    | Requests | Total KB | Script (n / KB) | Font (n / KB) | Image (n / KB) | Third-party (n / KB) | Canvas |
| ---------------------- | -------- | -------- | --------------- | ------------- | -------------- | -------------------- | ------ |
| /                      | 28       | 558      | 9 / 31          | 3 / 39        | 12 / 444       | 3 / 10               | 0      |
| /work/                 | 31       | 569      | 9 / 30          | 3 / 39        | 15 / 463       | 3 / 10               | 0      |
| /work/stone-steps-50k/ | 31       | 677      | 10 / 34         | 4 / 54        | 10 / 504       | 3 / 10               | 0      |
| /services/             | 21       | 158      | 9 / 31          | 3 / 39        | 5 / 46         | 3 / 10               | 0      |
| /about/                | 28       | 320      | 9 / 30          | 4 / 54        | 11 / 201       | 3 / 10               | 0      |
| /contact/              | 24       | 143      | 10 / 33         | 3 / 39        | 7 / 37         | 3 / 10               | 0      |
| /church-websites/      | 23       | 248      | 9 / 30          | 4 / 54        | 6 / 125        | 3 / 10               | 0      |

Baseline home capture was 61 requests and 2597 KB (24 scripts at 393 KB, 1 webgl canvas, 1786 KB images). Live home is 28 requests and 558 KB with no canvas. The one iframe on every page is the Cloudflare bot-script frame (3 third-party requests, 10 KB), same as before.

## Honest notes

- Slower than baseline: /contact/ LCP is +0.18 s and perf -1 point. The LCP element is now a decorative gradient sun layer (`div.g-sun`) rather than the h1 text, so it paints later than the heading did. Cheap fix candidate: keep that layer out of LCP candidacy or paint it earlier.
- Total blocking time is higher than baseline on the pages that now carry media: /work/ 18 to 42 ms, case study 11 to 95 ms (a reel custom element, `nx-reel`, plus 42 KB of Media). The score still reads 97 because TBT is small in absolute terms, but it is the one metric that regressed meaningfully. The case study FCP and SI also rose by about 0.6 to 0.8 s versus FBM; that comparison is across two different case studies.
- The big wins (home +13, work +7) come from removing the 24-script WebGL home screen and the large JS bundle: JS fell from about 140 KB to about 32 KB per page.
- Best-practices is capped at 82 by the jsd bot script (`deprecations` audit); the same cap applied in the baseline.
- Production still serves old CMS copy; re-measure after the data load.
