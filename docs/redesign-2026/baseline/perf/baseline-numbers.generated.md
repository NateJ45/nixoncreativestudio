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

## prod-home: script requests (median run)

| Transfer KB | Resource KB | URL                                                                   |
| ----------- | ----------- | --------------------------------------------------------------------- |
| 64          | 199         | /_astro/client.B6G_3ZpY.js                                            |
| 16          | 44          | /_astro/MobileNav.CF22-RY2.js                                         |
| 10          | 30          | /beacon.min.js                                                        |
| 10          | 22          | /cdn-cgi/challenge-platform/h/b/scripts/jsd/d76008a69eab/main.js?     |
| 9           | 27          | /_astro/bundle-mjs.BSGNpUx9.js                                        |
| 6           | 14          | /_astro/ClientRouter.astro_astro_type_script_index_0_lang.D-mgMtnq.js |
| 4           | 8           | /_astro/react.4Ml5mXYG.js                                             |
| 3           | 6           | /_astro/button.fIM4w4B8.js                                            |
| 2           | 4           | /_astro/scheduler.CkHYoDQb.js                                         |
| 2           | 3           | /_astro/createLucideIcon.5YcM64va.js                                  |
| 2           | 4           | /_astro/react-dom.ouJl1E6H.js                                         |
| 2           | 3           | /_astro/prefetch.BcwjOXjC.js                                          |
| 2           | 2           | /_astro/ThemeToggle.DbBBYXDO.js                                       |
| 2           | 2           | /_astro/client.Bqcbbect.js                                            |
| 1           | 1           | /_astro/preload-helper.CdOlPual.js                                    |
| 1           | 1           | /_astro/BackToTop.DXKJI-u9.js                                         |
| 1           | 1           | /_astro/BaseLayout.astro_astro_type_script_index_0_lang.CMdAl8Jb.js   |
| 1           | 0           | /_astro/jsx-runtime.CwfEasPC.js                                       |
| 1           | 0           | /_astro/ThemeToggle.BYnieQnD.js                                       |
| 1           | 0           | /_astro/page.COFkPLcF.js                                              |

WebGL/canvas-related requests (by URL pattern): none matched

## ci-home: script requests (median run)

| Transfer KB | Resource KB | URL                                                                   |
| ----------- | ----------- | --------------------------------------------------------------------- |
| 65          | 199         | /_astro/client.DKCfLovD.js                                            |
| 16          | 44          | /_astro/MobileNav.BSpc_Gin.js                                         |
| 9           | 27          | /_astro/bundle-mjs.BSGNpUx9.js                                        |
| 6           | 14          | /_astro/ClientRouter.astro_astro_type_script_index_0_lang.D-mgMtnq.js |
| 4           | 8           | /_astro/react.4Ml5mXYG.js                                             |
| 3           | 6           | /_astro/button.fIM4w4B8.js                                            |
| 2           | 4           | /_astro/scheduler.CkHYoDQb.js                                         |
| 2           | 3           | /_astro/createLucideIcon.5YcM64va.js                                  |
| 2           | 4           | /_astro/react-dom.ouJl1E6H.js                                         |
| 2           | 3           | /_astro/prefetch.BcwjOXjC.js                                          |
| 2           | 2           | /_astro/ThemeToggle.DbBBYXDO.js                                       |
| 2           | 2           | /_astro/client.BiWp8E80.js                                            |
| 1           | 1           | /_astro/preload-helper.CdOlPual.js                                    |
| 1           | 1           | /_astro/BackToTop.DXKJI-u9.js                                         |
| 1           | 1           | /_astro/BaseLayout.astro_astro_type_script_index_0_lang.CMdAl8Jb.js   |
| 1           | 0           | /_astro/jsx-runtime.CwfEasPC.js                                       |
| 1           | 0           | /_astro/ThemeToggle.BYnieQnD.js                                       |
| 1           | 0           | /_astro/page.COFkPLcF.js                                              |

WebGL/canvas-related requests (by URL pattern): none matched

## stonesteps: script requests (median run)

| Transfer KB | Resource KB | URL                                                                       |
| ----------- | ----------- | ------------------------------------------------------------------------- |
| 174         | 521         | /gtag/js?id=G-3K0QCR2ZD2                                                  |
| 57          | 175         | /_astro/client.DcPXfqwG.js                                                |
| 13          | 35          | /_astro/MobileNav.BnS06Pjj.js                                             |
| 13          | 37          | /_astro/utils.BG_vSxBb.js                                                 |
| 10          | 33          | /_astro/dist.DwG0iUaO.js                                                  |
| 10          | 30          | /beacon.min.js/v31edd6df95cf4e85bb4c19e7a9bdbcba1788362987495             |
| 6           | 16          | /_astro/ClientRouter.astro_astro_type_script_index_0_lang.BXnoM8sS.js     |
| 6           | 18          | /_astro/lenis.CBb5hlKm.js                                                 |
| 4           | 9           | /_astro/react.DoC3YXG9.js                                                 |
| 3           | 5           | /_astro/CoursePosterBand.astro_astro_type_script_index_0_lang.D3vV6yE7.js |
| 2           | 5           | /_astro/tslib.es6.DqYt9XRJ.js                                             |
| 2           | 3           | /_astro/ThemeToggle.DqJw1bgW.js                                           |
| 2           | 4           | /_astro/react-dom.Ddm_1IKw.js                                             |
| 2           | 3           | /_astro/sonner.DjSqtsBV.js                                                |
| 2           | 2           | /_astro/client.DbDZ2wHQ.js                                                |
| 1           | 1           | /_astro/createLucideIcon.Dqldm4KQ.js                                      |
| 1           | 2           | /_astro/medium._55tLXfl.js                                                |
| 1           | 1           | /_astro/preload-helper.CdOlPual.js                                        |
| 1           | 1           | /_astro/BackToTop.BOdq066v.js                                             |
| 1           | 1           | /_astro/BaseLayout.astro_astro_type_script_index_0_lang.6QGvAA_x.js       |
| 1           | 0           | /_astro/jsx-runtime.B0drF9TZ.js                                           |
| 1           | 0           | /_astro/clsx.DcKF72Ir.js                                                  |
| 1           | 0           | /_astro/ThemeToggle.6iry9knj.js                                           |

WebGL/canvas-related requests (by URL pattern): /gtag/js?id=G-3K0QCR2ZD2 174KB, /g/collect?v=2&tid=G-3K0QCR2ZD2&gtm=45je69u2h1v9263323652za200zd9263323652xf1&_p=1791086303450&gcd=13l3l3l3l1l1&npa=0&dma=0&cid=164538521.1791086304&frm=0&ngs=1&pscdl=noapi&rcb=11&sr=412x823&uaa=&uab=64&uafvl=Chromium%3B154.0.8037.93%7CGoogle%2520Chrome%3B154.0.8037.93%7CNot%2520A(Brand%3B99.0.0.0&uam=moto%20g%20power%20(2022)&uamb=1&uap=Android&uapv=11.0&uaw=0&ul=en-us&_s=1&tag_exp=115616985~115938465~115938469~118897920~118897930~120213116~120385423~120469145~120469153~121046263~121046271&sid=1791086304&sct=1&seg=0&dl=https%3A%2F%2Fstonesteps50k.com%2F&dt=Stone%20Steps%2050K%20and%2027K%20Trail%20Run%20%7C%20Mt.%20Airy%20Forest%2C%20Cincinnati&en=page_view&_fv=1&_nsi=1&_ss=1&_ee=1&tfd=1065 1KB

## reid: script requests (median run)

| Transfer KB | Resource KB | URL                                                                   |
| ----------- | ----------- | --------------------------------------------------------------------- |
| 174         | 522         | /gtag/js?id=G-YSVYFME1FT                                              |
| 57          | 175         | /_astro/client.BYijdY2Q.js                                            |
| 26          | 68          | /_astro/MobileNav.BU2dE-We.js                                         |
| 10          | 33          | /_astro/dist.BQtPjA3L.js                                              |
| 10          | 30          | /beacon.min.js/v31edd6df95cf4e85bb4c19e7a9bdbcba1788362987495         |
| 6           | 16          | /_astro/ClientRouter.astro_astro_type_script_index_0_lang.BXnoM8sS.js |
| 6           | 11          | /_astro/RoomStage.astro_astro_type_script_index_0_lang.DZEgTlBa.js    |
| 4           | 9           | /_astro/react.DwDCs188.js                                             |
| 2           | 5           | /_astro/tslib.es6.DqYt9XRJ.js                                         |
| 2           | 3           | /_astro/createLucideIcon.Pv20a0yz.js                                  |
| 2           | 3           | /_astro/sonner.iXSgbIlE.js                                            |
| 2           | 4           | /_astro/react-dom.BU85RhzV.js                                         |
| 2           | 2           | /_astro/client.90pSApMv.js                                            |
| 1           | 2           | /_astro/medium.DIqjyYsc.js                                            |
| 1           | 1           | /_astro/preload-helper.CdOlPual.js                                    |
| 1           | 1           | /_astro/BackToTop.DcQMXMvx.js                                         |
| 1           | 0           | /_astro/jsx-runtime.BB82VmXI.js                                       |

WebGL/canvas-related requests (by URL pattern): /gtag/js?id=G-YSVYFME1FT 174KB, /g/collect?v=2&tid=G-YSVYFME1FT&gtm=45je6a10h2v9255788648za200zd9255788648xf1&_p=1791086375431&gcd=13l3l3l3l1l1&npa=0&dma=0&cid=672596816.1791086376&frm=0&ngs=1&pscdl=noapi&rcb=7&sr=412x823&uaa=&uab=64&uafvl=Chromium%3B154.0.8037.93%7CGoogle%2520Chrome%3B154.0.8037.93%7CNot%2520A(Brand%3B99.0.0.0&uam=moto%20g%20power%20(2022)&uamb=1&uap=Android&uapv=11.0&uaw=0&ul=en-us&_s=1&tag_exp=115938466~115938468~118897920~118897930~120213116~120385422~120469145~120469153&sid=1791086376&sct=1&seg=0&dl=https%3A%2F%2Freiddesignllc.com%2F&dt=Interior%20Design%20in%20Plainfield%20%26%20Indianapolis%20%7C%20Reid%20Design&en=page_view&_fv=1&_nsi=1&_ss=1&_ee=1&tfd=880 1KB

## Run warnings

none
