# Baseline performance numbers

Measured 2026-10-04 with Lighthouse CLI, mobile emulation, default simulated Slow 4G / 4x CPU, headless Chrome, 5 runs per URL, median by performance score. Raw JSON in raw/.

## Scores and Core metrics (median run)

| URL           | Perf (all 5)          | LCP s (median run) | LCP s (median of 5) | FCP s | CLS   | TBT ms | SI s | A11y | BP  | SEO |
| ------------- | --------------------- | ------------------ | ------------------- | ----- | ----- | ------ | ---- | ---- | --- | --- |
| prod-home     | 84 (83/84/84/84/86)   | 3.96               | 3.98                | 2.48  | 0.000 | 13     | 2.48 | 100  | 82  | 100 |
| prod-work     | 90 (86/89/90/96/98)   | 3.56               | 3.55                | 1.71  | 0.000 | 18     | 1.71 | 100  | 82  | 100 |
| prod-case     | 88 (85/85/88/88/88)   | 3.85               | 3.86                | 1.30  | 0.000 | 11     | 1.42 | 100  | 82  | 100 |
| prod-services | 97 (96/96/97/97/97)   | 2.30               | 2.39                | 1.87  | 0.000 | 11     | 1.87 | 100  | 82  | 100 |
| prod-about    | 96 (95/96/96/98/98)   | 2.59               | 2.59                | 1.80  | 0.000 | 11     | 1.80 | 100  | 82  | 100 |
| prod-contact  | 98 (97/98/98/100/100) | 2.19               | 2.19                | 1.68  | 0.000 | 11     | 1.83 | 100  | 82  | 100 |
| ci-home       | 94 (88/94/94/95/96)   | 2.88               | 2.83                | 1.74  | 0.000 | 0      | 1.74 | 100  | 100 | 100 |
| ci-work       | 92 (89/90/92/93/93)   | 3.09               | 3.09                | 2.03  | 0.000 | 0      | 2.03 | 100  | 100 | 100 |
| ci-case       | 89 (88/89/89/89/89)   | 3.71               | 3.66                | 1.66  | 0.000 | 0      | 1.66 | 100  | 100 | 100 |
| ci-services   | 98 (98/98/98/100/100) | 2.10               | 2.10                | 1.65  | 0.000 | 0      | 1.65 | 100  | 100 | 100 |
| ci-about      | 97 (97/97/97/97/97)   | 2.34               | 2.41                | 1.66  | 0.000 | 0      | 1.66 | 100  | 100 | 100 |
| ci-contact    | 98 (98/98/98/98/99)   | 2.19               | 2.24                | 1.68  | 0.000 | 0      | 1.74 | 100  | 100 | 100 |
| stonesteps    | 86 (84/85/86/87/87)   | 3.81               | 3.81                | 2.42  | 0.000 | 19     | 2.42 | 100  | 100 | 100 |
| reid          | 83 (83/83/83/84/84)   | 4.14               | 4.01                | 2.60  | 0.000 | 15     | 2.60 | 100  | 100 | 100 |

## LCP element (median run)

| URL           | Final URL                                                            | LCP element                                                               |
| ------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| prod-home     | https://nixoncreativestudio.com/                                     | div.dev-screen > div.shot > picture > img.shot-img                        | <img class="shot-img" alt="" width="545" height="4000" src="https://nixoncreativestudio.co |
| prod-work     | https://nixoncreativestudio.com/work/                                | a.surface-card > div.relative > div.relative > img.relative               | <img src="https://nixoncreativestudio.com/_image?href=https%3A%2F%2Fwww.nixoncreativ…" src |
| prod-case     | https://nixoncreativestudio.com/work/first-baptist-muncie/           | header.py-2xl > div.ncs-container > div.flex > p.max-w-[56ch]             | <p class="max-w-[56ch] text-lg leading-[1.6] text-text">                                   |
| prod-services | https://nixoncreativestudio.com/services/                            | div.ncs-container > div.grid > div.flex > p.max-w-[52ch]                  | <p class="max-w-[52ch] text-lg leading-[1.6] text-text is-visible" data-reveal="" style="- |
| prod-about    | https://nixoncreativestudio.com/about/                               | div.grid > div.min-w-0 > div.mt-l > p.max-w-[58ch]                        | <p class="max-w-[58ch] text-lg leading-[1.6] text-text is-visible" data-reveal="right" sty |
| prod-contact  | https://nixoncreativestudio.com/contact/                             | main#main > section.pt-2xl > div.ncs-container > h1#contact-hero-heading  | <h1 id="contact-hero-heading" class="max-w-[22ch] leading-[0.95] is-visible" data-reveal=" |
| ci-home       | https://ncs-ci.nathanjnixon86.workers.dev/                           | div.dev-screen > div.shot > picture > img.shot-img                        | <img class="shot-img" alt="" width="545" height="4000" src="https://ncs-ci.nathanjnixon86. |
| ci-work       | https://ncs-ci.nathanjnixon86.workers.dev/work/                      | a.surface-card > div.relative > div.relative > img.relative               | <img src="https://ncs-ci.nathanjnixon86.workers.dev/_image?href=https%3A%2F%2Fncs-ci…" src |
| ci-case       | https://ncs-ci.nathanjnixon86.workers.dev/work/presbyterian-academy/ | header.py-2xl > div.ncs-container > div.flex > p.max-w-[56ch]             | <p class="max-w-[56ch] text-lg leading-[1.6] text-text">                                   |
| ci-services   | https://ncs-ci.nathanjnixon86.workers.dev/services/                  | div.ncs-container > div.grid > div.flex > p.max-w-[52ch]                  | <p class="max-w-[52ch] text-lg leading-[1.6] text-text is-visible" data-reveal="" style="- |
| ci-about      | https://ncs-ci.nathanjnixon86.workers.dev/about/                     | div.grid > div.min-w-0 > div.mt-l > p.max-w-[58ch]                        | <p class="max-w-[58ch] text-lg leading-[1.6] text-text is-visible" data-reveal="right" sty |
| ci-contact    | https://ncs-ci.nathanjnixon86.workers.dev/contact/                   | main#main > section.pt-2xl > div.ncs-container > h1#contact-hero-heading  | <h1 id="contact-hero-heading" class="max-w-[22ch] leading-[0.95] is-visible" data-reveal=" |
| stonesteps    | https://stonesteps50k.com/                                           | div.relative > h1#home-0 > span.hand > span.stamp-word                    | <span class="stamp-word inline-block whitespace-nowrap" style="--wi:2">                    |
| reid          | https://reiddesignllc.com/                                           | main#main > section.home-hero > div.home-hero__photo > img.home-hero__img | <img src="https://cdn.sanity.io/images/ba403vjc/production/b8c0eb7780298dbf210638a70…" src |

## Transfer weight (median run, KB)

| URL           | Total | HTML | CSS | JS  | Fonts | Images | Other | Third-party | Requests |
| ------------- | ----- | ---- | --- | --- | ----- | ------ | ----- | ----------- | -------- |
| prod-home     | 585   | 28   | 30  | 140 | 43    | 179    | 165   | 10          | 47       |
| prod-work     | 585   | 26   | 27  | 141 | 44    | 283    | 65    | 10          | 45       |
| prod-case     | 485   | 26   | 29  | 140 | 42    | 212    | 36    | 10          | 42       |
| prod-services | 325   | 28   | 29  | 140 | 43    | 50     | 36    | 10          | 40       |
| prod-about    | 658   | 26   | 24  | 140 | 43    | 389    | 37    | 10          | 39       |
| prod-contact  | 725   | 24   | 24  | 572 | 43    | 26     | 36    | 468         | 54       |
| ci-home       | 616   | 27   | 31  | 120 | 43    | 243    | 153   | 0           | 37       |
| ci-work       | 380   | 22   | 28  | 122 | 43    | 108    | 59    | 0           | 32       |
| ci-case       | 495   | 26   | 30  | 122 | 43    | 242    | 33    | 0           | 33       |
| ci-services   | 302   | 27   | 29  | 120 | 43    | 50     | 33    | 0           | 30       |
| ci-about      | 635   | 25   | 25  | 120 | 43    | 389    | 33    | 0           | 29       |
| ci-contact    | 703   | 24   | 25  | 552 | 43    | 26     | 33    | 458         | 45       |
| stonesteps    | 843   | 95   | 0   | 316 | 91    | 337    | 3     | 398         | 43       |
| reid          | 815   | 22   | 42  | 309 | 201   | 235    | 6     | 300         | 40       |

## Run warnings

none

### prod-home: every script request with initiator (Playwright, Moto G Power profile, cache off, 4s after networkidle)

Requests 61, total 2597 KB. DOM: 1 canvas (webgl), 1 iframe.

| Class        | Requests | KB   |
| ------------ | -------- | ---- |
| Document     | 1        | 28   |
| Font         | 2        | 42   |
| Script       | 24       | 393  |
| _third-party | 7        | 10   |
| Stylesheet   | 3        | 30   |
| Image        | 12       | 1786 |
| Other        | 15       | 315  |
| Ping         | 1        | 0    |
| XHR          | 3        | 2    |

| KB    | Script                                                                | Initiated by                                                          |
| ----- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 245.1 | /_astro/HeroCanvasInner.BFKeqcRO.js                                   | about:client                                                          |
| 64.4  | /_astro/client.B6G_3ZpY.js                                            | /_astro/client.Bqcbbect.js                                            |
| 16.0  | /_astro/MobileNav.CF22-RY2.js                                         | /                                                                     |
| 10.1  | https://static.cloudflareinsights.com/beacon.min.js                   | HTML parser (/)                                                       |
| 9.7   | /cdn-cgi/challenge-platform/h/b/scripts/jsd/d76008a69eab/main.js?     | other                                                                 |
| 9.5   | /_astro/bundle-mjs.BSGNpUx9.js                                        | /_astro/button.fIM4w4B8.js                                            |
| 6.2   | /_astro/lenis.CBb5hlKm.js                                             | /_astro/BaseLayout.astro_astro_type_script_index_0_lang.CMdAl8Jb.js   |
| 5.3   | /_astro/ClientRouter.astro_astro_type_script_index_0_lang.D-mgMtnq.js | HTML parser (/)                                                       |
| 4.0   | /_astro/react.4Ml5mXYG.js                                             | /_astro/client.Bqcbbect.js                                            |
| 3.2   | /_astro/button.fIM4w4B8.js                                            | /_astro/BackToTop.DXKJI-u9.js                                         |
| 2.2   | /_astro/scheduler.CkHYoDQb.js                                         | /_astro/client.B6G_3ZpY.js                                            |
| 2.1   | /_astro/createLucideIcon.5YcM64va.js                                  | /_astro/BackToTop.DXKJI-u9.js                                         |
| 2.1   | /_astro/react-dom.ouJl1E6H.js                                         | /_astro/MobileNav.CF22-RY2.js                                         |
| 1.8   | /_astro/prefetch.BcwjOXjC.js                                          | /_astro/ClientRouter.astro_astro_type_script_index_0_lang.D-mgMtnq.js |
| 1.7   | /_astro/ThemeToggle.DbBBYXDO.js                                       | /_astro/ThemeToggle.BYnieQnD.js                                       |
| 1.6   | /_astro/client.Bqcbbect.js                                            | /                                                                     |
| 1.3   | /_astro/preload-helper.CdOlPual.js                                    | /_astro/BaseLayout.astro_astro_type_script_index_0_lang.CMdAl8Jb.js   |
| 1.3   | /_astro/HeroCanvas.BiI4n9Gr.js                                        | /                                                                     |
| 1.3   | /_astro/BackToTop.DXKJI-u9.js                                         | /                                                                     |
| 1.1   | /_astro/use-sync-external-store-with-selector.BhEY8GnY.js             | about:client                                                          |
| 1.0   | /_astro/BaseLayout.astro_astro_type_script_index_0_lang.CMdAl8Jb.js   | HTML parser (/)                                                       |
| 0.9   | /_astro/jsx-runtime.CwfEasPC.js                                       | /_astro/HeroCanvas.BiI4n9Gr.js                                        |
| 0.7   | /_astro/ThemeToggle.BYnieQnD.js                                       | /                                                                     |
| 0.5   | /_astro/page.COFkPLcF.js                                              | HTML parser (/)                                                       |

### ci-home: every script request with initiator (Playwright, Moto G Power profile, cache off, 4s after networkidle)

Requests 48, total 1941 KB. DOM: 1 canvas (webgl), 0 iframe.

| Class      | Requests | KB   |
| ---------- | -------- | ---- |
| Document   | 1        | 27   |
| Font       | 2        | 42   |
| Script     | 22       | 373  |
| Stylesheet | 3        | 30   |
| Image      | 12       | 1276 |
| Other      | 8        | 192  |

| KB    | Script                                                                | Initiated by                                                          |
| ----- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 245.1 | /_astro/HeroCanvasInner.C8UjLWrT.js                                   | about:client                                                          |
| 64.4  | /_astro/client.DKCfLovD.js                                            | /_astro/client.BiWp8E80.js                                            |
| 15.9  | /_astro/MobileNav.BSpc_Gin.js                                         | /                                                                     |
| 9.5   | /_astro/bundle-mjs.BSGNpUx9.js                                        | /_astro/button.fIM4w4B8.js                                            |
| 6.3   | /_astro/lenis.CBb5hlKm.js                                             | /_astro/BaseLayout.astro_astro_type_script_index_0_lang.CMdAl8Jb.js   |
| 5.3   | /_astro/ClientRouter.astro_astro_type_script_index_0_lang.D-mgMtnq.js | HTML parser (/)                                                       |
| 4.1   | /_astro/react.4Ml5mXYG.js                                             | /_astro/HeroCanvas.6wll93xU.js                                        |
| 3.2   | /_astro/button.fIM4w4B8.js                                            | /_astro/MobileNav.BSpc_Gin.js                                         |
| 2.2   | /_astro/scheduler.CkHYoDQb.js                                         | /_astro/client.DKCfLovD.js                                            |
| 2.1   | /_astro/createLucideIcon.5YcM64va.js                                  | /_astro/MobileNav.BSpc_Gin.js                                         |
| 2.1   | /_astro/react-dom.ouJl1E6H.js                                         | /_astro/client.DKCfLovD.js                                            |
| 1.8   | /_astro/prefetch.BcwjOXjC.js                                          | /_astro/ClientRouter.astro_astro_type_script_index_0_lang.D-mgMtnq.js |
| 1.7   | /_astro/ThemeToggle.DbBBYXDO.js                                       | /_astro/MobileNav.BSpc_Gin.js                                         |
| 1.6   | /_astro/client.BiWp8E80.js                                            | /                                                                     |
| 1.4   | /_astro/preload-helper.CdOlPual.js                                    | /_astro/BaseLayout.astro_astro_type_script_index_0_lang.CMdAl8Jb.js   |
| 1.3   | /_astro/HeroCanvas.6wll93xU.js                                        | /                                                                     |
| 1.3   | /_astro/BackToTop.DXKJI-u9.js                                         | /                                                                     |
| 1.1   | /_astro/use-sync-external-store-with-selector.BhEY8GnY.js             | about:client                                                          |
| 1.0   | /_astro/BaseLayout.astro_astro_type_script_index_0_lang.CMdAl8Jb.js   | HTML parser (/)                                                       |
| 0.9   | /_astro/jsx-runtime.CwfEasPC.js                                       | /_astro/HeroCanvas.6wll93xU.js                                        |
| 0.7   | /_astro/ThemeToggle.BYnieQnD.js                                       | /                                                                     |
| 0.4   | /_astro/page.COFkPLcF.js                                              | HTML parser (/)                                                       |

### stonesteps: every script request with initiator (Playwright, Moto G Power profile, cache off, 4s after networkidle)

Requests 45, total 830 KB. DOM: 0 canvas (none), 0 iframe.

| Class        | Requests | KB  |
| ------------ | -------- | --- |
| Document     | 1        | 95  |
| Font         | 3        | 91  |
| Script       | 23       | 316 |
| Image        | 16       | 328 |
| _third-party | 6        | 354 |
| XHR          | 1        | 0   |
| Fetch        | 1        | 0   |

| KB    | Script                                                                                     | Initiated by                                                                               |
| ----- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| 174.4 | https://www.googletagmanager.com/gtag/js?id=G-3K0QCR2ZD2                                   | https://stonesteps50k.com/                                                                 |
| 57.0  | https://stonesteps50k.com/_astro/client.DcPXfqwG.js                                        | https://stonesteps50k.com/_astro/client.DbDZ2wHQ.js                                        |
| 13.2  | https://stonesteps50k.com/_astro/MobileNav.BnS06Pjj.js                                     | https://stonesteps50k.com/                                                                 |
| 13.1  | https://stonesteps50k.com/_astro/utils.BG_vSxBb.js                                         | https://stonesteps50k.com/_astro/MobileNav.BnS06Pjj.js                                     |
| 10.4  | https://stonesteps50k.com/_astro/dist.DwG0iUaO.js                                          | https://stonesteps50k.com/_astro/sonner.DjSqtsBV.js                                        |
| 10.1  | https://static.cloudflareinsights.com/beacon.min.js/v31edd6df95cf4e85bb4c19e7a9bdbcba17883 | HTML parser (https://stonesteps50k.com/)                                                   |
| 6.3   | https://stonesteps50k.com/_astro/lenis.CBb5hlKm.js                                         | https://stonesteps50k.com/_astro/BaseLayout.astro_astro_type_script_index_0_lang.6QGvAA_x. |
| 6.2   | https://stonesteps50k.com/_astro/ClientRouter.astro_astro_type_script_index_0_lang.BXnoM8s | HTML parser (https://stonesteps50k.com/)                                                   |
| 4.2   | https://stonesteps50k.com/_astro/react.DoC3YXG9.js                                         | https://stonesteps50k.com/_astro/client.DbDZ2wHQ.js                                        |
| 2.5   | https://stonesteps50k.com/_astro/tslib.es6.DqYt9XRJ.js                                     | https://stonesteps50k.com/_astro/MobileNav.BnS06Pjj.js                                     |
| 2.5   | https://stonesteps50k.com/_astro/CoursePosterBand.astro_astro_type_script_index_0_lang.D3v | HTML parser (https://stonesteps50k.com/)                                                   |
| 2.0   | https://stonesteps50k.com/_astro/ThemeToggle.DqJw1bgW.js                                   | https://stonesteps50k.com/_astro/ThemeToggle.6iry9knj.js                                   |
| 2.0   | https://stonesteps50k.com/_astro/react-dom.Ddm_1IKw.js                                     | https://stonesteps50k.com/_astro/MobileNav.BnS06Pjj.js                                     |
| 2.0   | https://stonesteps50k.com/_astro/sonner.DjSqtsBV.js                                        | https://stonesteps50k.com/                                                                 |
| 1.6   | https://stonesteps50k.com/_astro/client.DbDZ2wHQ.js                                        | https://stonesteps50k.com/                                                                 |
| 1.4   | https://stonesteps50k.com/_astro/createLucideIcon.Dqldm4KQ.js                              | https://stonesteps50k.com/_astro/MobileNav.BnS06Pjj.js                                     |
| 1.4   | https://stonesteps50k.com/_astro/preload-helper.CdOlPual.js                                | https://stonesteps50k.com/_astro/BaseLayout.astro_astro_type_script_index_0_lang.6QGvAA_x. |
| 1.4   | https://stonesteps50k.com/_astro/medium._55tLXfl.js                                        | https://stonesteps50k.com/_astro/MobileNav.BnS06Pjj.js                                     |
| 1.2   | https://stonesteps50k.com/_astro/BackToTop.BOdq066v.js                                     | https://stonesteps50k.com/                                                                 |
| 0.9   | https://stonesteps50k.com/_astro/jsx-runtime.B0drF9TZ.js                                   | https://stonesteps50k.com/_astro/MobileNav.BnS06Pjj.js                                     |
| 0.9   | https://stonesteps50k.com/_astro/clsx.DcKF72Ir.js                                          | https://stonesteps50k.com/_astro/MobileNav.BnS06Pjj.js                                     |
| 0.7   | https://stonesteps50k.com/_astro/BaseLayout.astro_astro_type_script_index_0_lang.6QGvAA_x. | HTML parser (https://stonesteps50k.com/)                                                   |
| 0.7   | https://stonesteps50k.com/_astro/ThemeToggle.6iry9knj.js                                   | https://stonesteps50k.com/                                                                 |

### reid: every script request with initiator (Playwright, Moto G Power profile, cache off, 4s after networkidle)

Requests 42, total 735 KB. DOM: 1 canvas (webgl), 1 iframe.

| Class        | Requests | KB  |
| ------------ | -------- | --- |
| Document     | 1        | 22  |
| Script       | 17       | 309 |
| Stylesheet   | 3        | 42  |
| Image        | 11       | 162 |
| Font         | 8        | 201 |
| _third-party | 9        | 290 |
| XHR          | 1        | 0   |
| Fetch        | 1        | 0   |

| KB    | Script                                                                                     | Initiated by                                                                               |
| ----- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| 174.4 | https://www.googletagmanager.com/gtag/js?id=G-YSVYFME1FT                                   | https://reiddesignllc.com/                                                                 |
| 56.9  | https://reiddesignllc.com/_astro/client.BYijdY2Q.js                                        | https://reiddesignllc.com/_astro/client.90pSApMv.js                                        |
| 26.3  | https://reiddesignllc.com/_astro/MobileNav.BU2dE-We.js                                     | https://reiddesignllc.com/                                                                 |
| 10.3  | https://reiddesignllc.com/_astro/dist.BQtPjA3L.js                                          | https://reiddesignllc.com/_astro/sonner.iXSgbIlE.js                                        |
| 10.1  | https://static.cloudflareinsights.com/beacon.min.js/v31edd6df95cf4e85bb4c19e7a9bdbcba17883 | HTML parser (https://reiddesignllc.com/)                                                   |
| 6.1   | https://reiddesignllc.com/_astro/ClientRouter.astro_astro_type_script_index_0_lang.BXnoM8s | HTML parser (https://reiddesignllc.com/)                                                   |
| 5.4   | https://reiddesignllc.com/_astro/RoomStage.astro_astro_type_script_index_0_lang.DZEgTlBa.j | HTML parser (https://reiddesignllc.com/)                                                   |
| 4.2   | https://reiddesignllc.com/_astro/react.DwDCs188.js                                         | https://reiddesignllc.com/_astro/client.90pSApMv.js                                        |
| 2.5   | https://reiddesignllc.com/_astro/tslib.es6.DqYt9XRJ.js                                     | https://reiddesignllc.com/_astro/MobileNav.BU2dE-We.js                                     |
| 2.1   | https://reiddesignllc.com/_astro/createLucideIcon.Pv20a0yz.js                              | https://reiddesignllc.com/_astro/BackToTop.DcQMXMvx.js                                     |
| 2.0   | https://reiddesignllc.com/_astro/sonner.iXSgbIlE.js                                        | https://reiddesignllc.com/                                                                 |
| 2.0   | https://reiddesignllc.com/_astro/react-dom.BU85RhzV.js                                     | https://reiddesignllc.com/_astro/MobileNav.BU2dE-We.js                                     |
| 1.6   | https://reiddesignllc.com/_astro/client.90pSApMv.js                                        | https://reiddesignllc.com/                                                                 |
| 1.4   | https://reiddesignllc.com/_astro/medium.DIqjyYsc.js                                        | https://reiddesignllc.com/_astro/MobileNav.BU2dE-We.js                                     |
| 1.3   | https://reiddesignllc.com/_astro/preload-helper.CdOlPual.js                                | https://reiddesignllc.com/_astro/RoomStage.astro_astro_type_script_index_0_lang.DZEgTlBa.j |
| 1.2   | https://reiddesignllc.com/_astro/BackToTop.DcQMXMvx.js                                     | https://reiddesignllc.com/                                                                 |
| 0.9   | https://reiddesignllc.com/_astro/jsx-runtime.BB82VmXI.js                                   | https://reiddesignllc.com/_astro/BackToTop.DcQMXMvx.js                                     |

## Method notes

- Lighthouse CLI 12 style defaults via `node_modules/.bin/lighthouse.cmd <url> --form-factor=mobile --output=json --quiet --chrome-flags="--headless=new --no-sandbox"` (simulated Slow 4G, 4x CPU), 5 valid runs per URL, driven by run-lh.mjs. Median = middle run when sorted by performance score. The "LCP median of 5" column is the median LCP across all five runs, shown because the median-score run need not have the median LCP.
- Weights come from Lighthouse `network-requests` in the median run. Lighthouse stops at load, so lazy and deferred assets (and the 245 KB hero WebGL chunk) are not in those numbers; the Playwright capture (net-capture.mjs, Moto G Power profile, cache off, 4s after networkidle, no scroll) shows the fuller picture and is where initiators come from.
- Production is not behind a coming-soon gate (HTTP 200, full content, Cloudflare Web Analytics beacon and bot-detection `jsd` script injected). CI preview https://ncs-ci.nathanjnixon86.workers.dev is reachable (HTTP 200) but has fewer case studies (4 vs 9). First case study listed on /work/: production first-baptist-muncie, CI presbyterian-academy (first-baptist-muncie 404s on CI).
- "Home third-party" on prod = Cloudflare beacon + jsd. Contact third-party (about 460 KB) is the Turnstile iframe/script load; no form was submitted.
- Stone Steps and Reid use gtag (about 174 KB) which counts as third party there.

## Discarded runs

10 Lighthouse runs were discarded and re-run (files in raw-discarded/): all failed with `NO_NAVSTART` (trace not recorded, performance score null): prod-home runs 1-5, prod-work runs 1, 2, 4, prod-case run 1, ci-home run 3. Cause not proven; the first batch ran with stray headless Chrome processes left over from the Windows EPERM temp cleanup, and after killing those the re-runs all succeeded first attempt. Every URL has 5 valid runs in raw/.

## What stands out

- Production home scores 84 (runs 83-86), LCP 3.96 s, FCP 2.48 s; the CI preview home scores 94 (88-96), LCP 2.88 s. Both are above 2.5 s on LCP; production is the worse of the two.
- Production home LCP element is the hero phone screenshot (`div.dev-screen > div.shot > picture > img.shot-img`, 545x4000). In prod-home run 3 the LCP split is TTFB 11%, load delay 38%, load time 14%, render delay 37%.
- Services, About and Contact score 96-98 on both targets (LCP 2.1-2.6 s); the case-study pages (85-89) and /work/ (90-92) hold the weak LCP (3.1-3.9 s), and their LCP elements are an image card (/work/) or a paragraph (case studies).
- Homepage ships a WebGL canvas: `HeroCanvasInner` is a 245 KB script (largest single JS file, initiated at client time, not in the Lighthouse load window) and the Playwright capture totals 2.6 MB on prod home (1.8 MB images) versus 585 KB in Lighthouse.
- Main app JS in Lighthouse is stable at 140 KB (prod) and 120 KB (CI) on every page; `client.*.js` (React runtime, 64 KB) is the largest.
- Production-only Cloudflare injections: `beacon.min.js` (10 KB) and the `jsd` bot-detection script (10 KB). The `jsd` script's `StorageType.persistent` deprecation is why prod best-practices is 82 on every route versus 100 on CI.
- Contact pulls 468 KB of third-party JS (Turnstile) on prod and 458 KB on CI, taking JS from 140 to 572 KB, yet it still scores 98.
- Nathan's own quality bar: Stone Steps 86 (LCP 3.81 s, 843 KB, 398 KB third-party gtag) and Reid 83 (LCP 4.14 s, 815 KB, 201 KB fonts). Neither beats the current studio home (84) by much; both are below the CI preview (94).
