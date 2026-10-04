# D7b: Nathan's carousel hero, in the type-poster system

Round 3, built 2026-10-04 from Nathan's own sketch, then revised the same day for two decisions of his: his tagline as the headline, and Bebas Neue (his logo face) as the display type. Static mock-up: `index.html` (inline CSS, one 1.2 KB gz script), `assets/` (real browser-viewport captures of live client sites plus d4's detail crops), `fonts/` (Bebas Neue latin 14 KB, d4's Archivo and Bodoni italic), `shots/` (screenshots, `checks.json`, `lighthouse-mobile.json`). Page source: `_src/page.src.html` and `_src/skin-7b.mjs`. The carousel component, capture, build, screenshot and Lighthouse scripts live in `../d7a-carousel-contact-sheet/_capture/` (run from MAIN); `build.mjs` builds both variants from the one component, so 7a and 7b carry the same carousel, only skinned differently. Read 7a's RATIONALE for the component's mechanics; this file covers what is different here.

## How the sketch was honoured

Top to bottom, as drawn: a logo top centre, the big words, a line of prose, the fanned carousel (one large centre frame, smaller staggered frames to each side), a left and a right arrow underneath.

- **Logo top centre:** the studio's own N mark (the favicon's path and dot, as a square ink block with a vermilion dot) beside "NIXON CREATIVE STUDIO" in Bebas Neue and "Nathan Nixon, Cincinnati" in Bodoni italic. Nav left, "Start a project" right, the d4 ink rule under the header. No new logo was drawn.
- **The big words:** Nathan's tagline, verbatim, in place of the sketch's WEBSITE DESIGN (his decision): "I MAKE WEBSITES THAT" in Bebas, then "pull their weight." in Bodoni italic at poster size. One line of caps, one line of italic: the poster's two voices in one headline.
- **Prose:** "For churches, nonprofits, schools and small businesses: a website your next volunteer can run." in bold, then how (plan, design, build, hand over with an editor, a written guide and checked backups) and "You own it outright." On a phone it shortens to "...then hand it over with a written guide."
- **CTA and price floor:** an ink "Start a project" block and "Prices published, from $4,000" beside it.
- **The fan, and the arrows underneath:** ten real frames (Foundation for Reformed Theology, Theology Matters, Stone Steps, First Baptist Muncie, MAS Monograms, two pages each), opening on Stone Steps with FBCM's home page and hymn-board band immediately to its right. Ink square arrow buttons (64x56) with the d4 hover offset, and a Bebas counter ("6" big, "of 10" in Bodoni italic, site name in caps).

## What I changed, and why

1. **Headline (Nathan's call).** "I make websites that pull their weight." is his current tagline. It is warmer and more particular than "Website design" but does not say who it is for, so the bold lead of the prose line does that, directly beneath. The fold therefore states audience, promise ("a website your next volunteer can run"), one CTA, the price floor and the proof (the live frames). The page title still carries "Cincinnati web design" for search.
2. **Bebas Neue as the display face (Nathan's call).** It replaces d4's Archivo at 62% width and weight 900 everywhere that was display: the headline, section titles, the four client names, the three price figures, the step durations, the close, the "same person" emphasis in the About quote, the counter and the wordmark. Archivo stays for body copy, buttons and labels; Bodoni italic stays as the second voice. To make Bebas considered rather than default: it never sets body or long labels; it gets slight positive tracking (0.005 to 0.03em) instead of the negative tracking Archivo used; the headline is one caps line paired with an italic line, so there is no stacked block of caps; price figures were taken down from 17vw to 12vw because Bebas runs wider than Archivo 62% and was colliding with the tier text; client names got a looser 0.86 leading.
3. **Two scroll moments re-cut.** d4 animated Archivo's width axis on the client names and its weight axis on the prices. Bebas has one weight and no width axis, so both moments now close up the tracking as the word lands (0.08em to normal on names, 0.06em on prices). The timeline bar is unchanged. All three still sit behind `@supports (animation-timeline: view())` and `prefers-reduced-motion: no-preference`.
4. **Frames are big:** 666 px wide at 1440x900 (0.56 of a 1200 px viewport), a phone capture at 284 px on a phone (0.73 scale). Nothing is faded except frames four or more places from the centre.
5. **FBCM, honestly labelled.** Chrome reads "New site, not yet on its domain", with a "Launching soon" tag; the caption ends "Launching soon on fbcmuncie.org" and is not linked. The workers.dev preview address is not shown.
6. **From the critiques (details below):** stray `</main>` removed (Work to Close were outside the main landmark), the undefined `.sr` class on the tier headings replaced (they were showing "LAUNCH FROM $4,000" twice), the fan's far frames fade at the edges and the upper stacks were lowered, the counter shows the site only, hover offsets only on hover-capable devices, the logo's mismatched `aria-label` removed, case-study lead leading raised to 1.24.

## Measured (2026-10-04, this machine; other agents were also running)

**Mobile Lighthouse 12**, default mobile (simulated Slow 4G, 4x CPU), local static server with gzip, stray Lighthouse Chrome killed between runs:

| Version                                                    | Run | Perf | A11y | BP  | SEO | LCP    | FCP    | CLS | TBT   |
| ---------------------------------------------------------- | --- | ---- | ---- | --- | --- | ------ | ------ | --- | ----- |
| Before the type change (Archivo display, "Website design") | 1   | 97   | 100  | 100 | 100 | 2.63 s | 0.95 s | 0   | 3 ms  |
|                                                            | 2   | 97   | 100  | 100 | 100 | 2.63 s | 0.96 s | 0   | 0 ms  |
|                                                            | 3   | 98   | 100  | 100 | 100 | 2.48 s | 0.96 s | 0   | 0 ms  |
| Bebas and tagline, first build                             | 1   | 97   | 100  | 100 | 100 | 2.56 s | 0.95 s | 0   | 14 ms |
|                                                            | 2   | 96   | 100  | 100 | 100 | 2.78 s | 0.98 s | 0   | 15 ms |
|                                                            | 3   | 96   | 100  | 100 | 100 | 2.56 s | 0.95 s | 0   | 21 ms |
| After round-2 fixes, before the image preload              | 1   | 96   | 100  | 100 | 100 | 2.71 s | 0.94 s | 0   | 16 ms |
|                                                            | 2   | 96   | 100  | 100 | 100 | 2.86 s | 0.99 s | 0   | 15 ms |
|                                                            | 3   | 96   | 100  | 100 | 100 | 2.70 s | 0.93 s | 0   | 0 ms  |
| **Final (with the centre-frame image preload)**            | 1   | 96   | 100  | 100 | 100 | 2.71 s | 0.96 s | 0   | 10 ms |
|                                                            | 2   | 97   | 100  | 100 | 100 | 2.63 s | 0.93 s | 0   | 2 ms  |
|                                                            | 3   | 96   | 100  | 100 | 100 | 2.71 s | 0.94 s | 0   | 10 ms |

LCP element in every run: the centre Stone Steps frame (`ss-home-m-600.webp`, 23 KB). Two experiments: dropping the Bodoni preload made LCP worse (2.71 s, score 96) and let the italic line shift, so it was reverted; preloading the centre frame image ahead of the fonts (`<link rel="preload" as="image" media=...>`) moved LCP from 2.70 to 2.86 s to 2.63 to 2.71 s, within run-to-run noise, and was kept because it costs nothing. The run-to-run spread on this machine is about 0.15 s (C saw LCP bimodal here), so read the bands, not single runs.

**Transfer at 390 px** (DPR 3, cache off, CDP encoded bytes):

| Load                                  | Total  | Requests | HTML    | Fonts    | Images   |
| ------------------------------------- | ------ | -------- | ------- | -------- | -------- |
| Before the type change                | 312 KB | 12       | 15.7 KB | 140.9 KB | 155.6 KB |
| **Final, first load**                 | 327 KB | 13       | 16.4 KB | 154.5 KB | 155.6 KB |
| Final, after scrolling the whole page | 375 KB | 15       |         |          |          |

Carousel images at first load: 85 KB (the centre frame and its two neighbours). The rest are d4's small detail crops.

**What the type change cost:** one more request and 14 KB (the Bebas file is preloaded because it sets the headline), about 0.1 to 0.2 s of simulated LCP (final band 2.63 to 2.71 s against 2.48 to 2.63 s before) and one to two points of score (96 to 97 against 97 to 98). Archivo cannot be dropped, because it still sets all body copy, buttons and nav; subsetting it to Latin basic and to the 96 to 112% widths now used would take back far more than Bebas added (it is 88 KB of the 155 KB of fonts).

**Against the budget (00-synthesis section 7, C):** median 95 or higher with none under 90: met (96). LCP 2.5 s: NOT met, median 2.71 s (under C's 3.0 s worst-run line); the 2.0 s stretch is not met. CLS 0 and TBT under 50 ms: met. JS 1.2 KB gz (target 4 KB, max 15 KB). No render-blocking stylesheet; all CSS inline. Fonts 155 KB: three times C's 45 KB line, and the main reason this variant's LCP trails 7a's. Images at load 156 KB and total at load 327 KB: slightly over C's 120 KB and 300 KB lines.

## Behaviour checks (`shots/checks.json`)

Arrows (click and touch tap), mouse drag, touch swipe, Left/Right/Home/End on the focused reel, Enter on the arrows: all moved exactly one frame and the counter followed (6 to 7 to 8, back to 6; keyboard 6 to 7, two Lefts to 5, Enter on prev to 4). The reel is the 10th tab stop; focus shows as an ink ring around the centre frame. No JS: headline, prose and CTA present, reel opens on Stone Steps (Chrome's `scroll-initial-target`) and still scrolls sideways, arrows hidden. Reduced motion: moves jump instead of gliding. Targets at 390: nav 44 px tall, CTA 234x56, arrows 64x56. No horizontal overflow at 390 or 1440 (Bebas price figures caused one at 390 before the 19vw cap). No console errors.

## Impeccable critique

Round 1 (before the type change; Assessment A and B as isolated sub-agents; overlay skipped for a static file; nothing written to `.impeccable/`): A scored 23/32, "specific". Fixes listed above.

Round 2 (after the tagline and Bebas), A: 28/40, "mostly specific"; Bebas "handled with more intent" here (neutral or positive tracking, the price rows and the "1 hour / 1 page / 1st month" column called out as strong set pieces). Fixed after it:

- **P1** the hero CTA sat on the top edge of the centre frame at 1440: the CTA row now has bottom margin, and the frame starts below it (CTA bottom 430 px, frame top 456 px, frame bottom 896 px at 1440x900).
- **P2** the 01 to 04 case numbers and the "Step N" kickers (banned devices in the craft floor) are gone.
- **P2** stacked caps blocks: the four client names dropped from 8 to 10vw to 6.2vw (11vw on phones), a clear step below the section titles; Bodoni italic leads each client block.
- Not changed: the centred bold promise at 390 (kept centred to hold the poster's centre axis; it is four short lines); the "stray marks" A saw by the counter are the next arrow's d4 hover offset, captured with the mouse still over it after the click (shots/carousel__1440__3).
  A would show Nathan 7a first: "7b is bolder but leans on stacked caps"; after the fixes above, the caps are confined to the headline, section titles, names and numbers.

Detector, round 2: 42 findings, the same families as round 1. Accepted as deliberate or false positive: cramped-padding (browser chrome, rule-divided rows, full-bleed bands), broken-image (the deferred carousel frames, which have real `data-` sources and a `<noscript>` copy), all-caps-body (short labels), italic-serif-display (the poster's second voice), clipped-overflow (the hero clips the fan by design; body `overflow-x: clip` is inherited from d4), dark-glow (d4's hard offset on hover), tight-leading on display lines. Real and fixed: `.case-copy .big` leading 1.12 to 1.24.

## Frank risks

1. **The loudest option.** Vermilion, Bebas caps and a Didone italic at poster scale, plus a fan of ten screenshots, is a lot in one first screen. It is memorable; a cautious board may find it shouty. 7a is the calmer reading of the same structure.
2. **Bebas is common.** It was everywhere on posters in the 2010s, and it is the face the current site already uses. Paired with Bodoni italic and set with care it reads as his, but on its own it is the least ownable part of this page.
3. **Fonts are the cost.** 155 KB of fonts is why this variant sits at 2.5 to 2.8 s simulated LCP and 7a at about 2.1 s.
4. **The fan needs `animation-timeline`** (Chrome, Edge, Safari 26). Firefox gets a plain snap row.
5. **Screenshots age** and **FBCM is shown before it is live** (see 7a).
6. **Touch was tested by emulation** (CDP touch events); worth five minutes on a real phone.

## What it needs from Nathan

1. Decide 7a or 7b.
2. Confirm the Bebas use (headlines, numbers, wordmark only) is what he meant by not leaving it behind.
3. Permission to show each client's pages at this size, including FBCM before cutover.
4. When FBCM cuts over: link its frames and drop the tag (`slides.mjs`), re-run `capture.mjs`.
5. Confirm the caption facts (FRT since 1982, Theology Matters 149 of 154, Stone Steps 2,188 finishes, Mary Ann edits it herself) and the promise items (checked backups, accessibility checks on every change).
6. If this variant wins: subset Archivo before launch.
