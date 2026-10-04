# D7a: Nathan's carousel hero, in the contact-sheet system

Round 3, built 2026-10-04 from Nathan's own sketch, then revised the same day for two decisions of his: his tagline as the headline, and Bebas Neue (his logo face) as the display type. Static mock-up: `index.html` (inline CSS, one 1.2 KB gz script), `assets/` (real browser-viewport captures of live client sites plus the d1 work-section crops), `fonts/` (Bebas Neue latin 14 KB plus d1's Bricolage and two Newsreader files), `shots/` (screenshots, `checks.json`, `lighthouse-mobile.json`). Sister variant: `../d7b-carousel-poster/`, same carousel component.

Everything is built by `_capture/` (run from MAIN): `capture.mjs` (Playwright captures of the live sites, sharp WebP sizes into both variants), `carousel/` (the shared component: `slides.mjs` data and markup, `carousel.css`, `carousel.js`), `build.mjs` (inlines the component into `page.src.html` here and `../d7b-carousel-poster/_src/page.src.html`), `shoot.mjs` (screenshots and behaviour checks), `lh.mjs` (Lighthouse), `serve.mjs`, `quick.mjs`, `overflow.mjs`.

## How the sketch was honoured

The sketch, top to bottom: a logo top centre, big centred words, a line of prose, then a fanned carousel (one large centre frame, smaller frames stacked to each side at different heights), a left arrow and a right arrow underneath. All of it is here, in that order.

- **Logo top centre.** A masthead lockup in the middle of the header: the studio's own N mark from `public/favicon.svg` (same path, same dot) in film black with a china-marker red dot, beside "NIXON CREATIVE STUDIO" in Bebas Neue and "Nathan Nixon, Cincinnati" in Newsreader italic. Nav left, "Start a project" right. No new logo was drawn; the existing mark plus his logo face made the lockup.
- **The big words.** Nathan's tagline, verbatim, in place of the sketch's WEBSITE DESIGN (his decision): "I MAKE WEBSITES THAT" in Bebas, then "pull their weight." in Newsreader italic, china-marker red. One line of caps, one line of italic.
- **Prose.** "For churches, nonprofits, schools and small businesses: a website your next volunteer can run." then how (plan, design, build, hand over with an editor, a written guide and checked backups) and "You own it outright." On a phone the middle shortens to "then hand it over with a written guide". Under it, one CTA and "Prices published, from $4,000".
- **The fan.** Ten frames from five sites, two pages each. The centre frame is a real 1200x750 viewport of the live site; neighbours step down in scale (0.62, 0.48, 0.36) and up in height, three per side, the left and right stacks at different heights as drawn. Frames four or more places away fade at the fan's edge.
- **Arrows underneath,** on a film strip with sprocket rows, with a live counter between them ("6 of 10", site name).
- **What the contact sheet adds.** d1's china-marker loop is drawn once round the centre position as the page opens. Frames travel under it; it fades while they move and settles round whichever frame lands. The caption under the centre frame uses d1's edge print: SITE / PAGE, one checkable fact, the live address.

## What changed from the sketch and the brief, and why

1. **Headline (Nathan's call).** "I make websites that pull their weight." is his current tagline. It does not say who it is for, so the prose line opens with the audience and the volunteer promise, directly beneath. The fold at 1440x900 and 390x844 states audience, promise, one CTA, the price floor and the proof (the live frames). The page title still carries "Cincinnati web design" for search; the H1 no longer does.
2. **Bebas Neue as the display face (Nathan's call).** It replaces d1's Bricolage 750 for the headline, the section titles ("THE PROOF SHEET.", "WHAT IT COSTS", "HOW IT WORKS,", the close), the client names, the tier names, the price figures, the step durations and the wordmark. Newsreader italic stays as the second voice and now does more work: every Bebas headline turns into italic for its last phrase ("pull their weight.", "Four sites, all live today.", "and how long it takes", "won't have to redo."), so no headline is a block of caps. Bricolage stays only for small furniture (nav, buttons, edge print, captions). Considered, not default: Bebas never sets body copy or long labels; it gets slight positive tracking (0.006 to 0.03em, the hero's d1 -0.04em override was removed after the second critique); sizes went up about 20% against Bricolage because Bebas is condensed with a smaller cap height; the hero runs one caps line at 6.4rem, not a stacked block.
3. **Frames are big, not decorative.** Audit A found the current hero shows sites at about 40% scale and faded. Here the centre frame is 666 px wide at 1440x900 (0.56 of a 1200 px viewport) and grows to 56% of the screen on taller windows; display type on every client site is legible and Stone Steps' date line is readable. On a phone the centre frame is a phone capture (390 px viewport, 284 px on screen, 0.73 scale), not a shrunken desktop.
4. **Ten frames, only real work.** Foundation for Reformed Theology (home, library), Theology Matters (home, an article), Stone Steps (records, home), First Baptist Muncie (home, the What to Expect hymn-board band with arch-framed photos), MAS Monograms (home, about). No Second Pres, no Reid, no Academy.
5. **Stone Steps in the centre, FBCM right beside it.** The reel opens on Stone Steps (the synthesis's lead case study, and the lightest LCP image). FBCM's two frames are the first two to its right, so the one church site sits in the first viewport at 62% scale. I did not centre FBCM because the page should not lead its proof with a site that is not on its own domain yet. Swap `START` in `slides.mjs` once it cuts over. (Critique round 2 also noted that Stone Steps' own condensed-caps logo echoes Bebas right under the headline; opening on FBCM after cutover would fix that too.)
6. **FBCM labelling.** Chrome bar: "New site, not yet on its domain" with a red "Launching soon" tag. Caption: "A finished church site, every page filled in. It goes live when the church moves its address over." and, unlinked, "Launching soon on fbcmuncie.org". The workers.dev preview address is not shown or linked (critique round 1: it reads as a staging leak and exposes a personal handle).

## The carousel component (shared with 7b)

- **Fan in pure CSS.** A horizontal scroll-snap reel (`scroll-snap-type: x mandatory`, `scroll-snap-stop: always`). Each slide owns a `view-timeline`; its frame reads its own position from it (`animation-timeline`) and takes its place in the fan through `translate`, `scale`, `z-index` and, at the edges, `opacity` keyframes. Slots are 14% of the reel, so one step is a fixed 14/114 of the timeline at any width. The track is `width: max-content` so its end padding counts and the last frames can reach the centre (an early bug: they could not).
- **JS only for controls** (2.4 KB raw, 1.2 KB gz; budget 4 KB): arrows (disabled at the ends), Left/Right/Home/End on the focused reel, repeated presses counted from the frame still being travelled to, mouse drag, click a side frame to centre it, the live counter, the loop fade while moving, and loading far frames late. No auto-advance.
- **Opens on Stone Steps** with `scroll-initial-target` (no script needed in Chrome), plus a script fallback.
- **Images.** The centre frame is a real `<img>` in a `<picture>` (phone capture under 700 px, desktop capture above) with `fetchpriority="high"`, width and height. All others are `loading="lazy"`; frames two or more places from the start keep their `srcset` in `data-` attributes until the reel comes near them (all at once on desktop, where they are on screen; one step ahead on a phone), with a `<noscript>` copy so the no-JS list keeps every frame.
- **No JS.** Headline, prose and CTA are all there; the reel is still the fan in Chrome and a plain sideways list elsewhere; captions sit under frames; the arrows are hidden because they need the script (`shots/nojs__*.png`).
- **Reduced motion.** Moves jump instead of gliding; the marker loop does not draw (`animationName: none`). The fan is position, not animation, so it stays.
- **Browsers without `animation-timeline`** (Firefox today) get a plain snap row with big frames and peeking neighbours.

## Measured (2026-10-04, this machine; other agents were also running)

**Mobile Lighthouse 12** (`lh.mjs`: local static server with gzip, default mobile, simulated Slow 4G and 4x CPU, stray Lighthouse Chrome killed between runs):

| Version                                                      | Run | Perf | A11y | BP  | SEO | LCP    | FCP    | CLS | TBT   |
| ------------------------------------------------------------ | --- | ---- | ---- | --- | --- | ------ | ------ | --- | ----- |
| Before the type change (Bricolage display, "Website design") | 1   | 99   | 100  | 100 | 100 | 1.96 s | 0.90 s | 0   | 0 ms  |
|                                                              | 2   | 99   | 100  | 100 | 100 | 2.03 s | 0.89 s | 0   | 0 ms  |
|                                                              | 3   | 99   | 100  | 100 | 100 | 1.96 s | 0.92 s | 0   | 0 ms  |
| **Final (Bebas display, tagline)**                           | 1   | 99   | 100  | 100 | 100 | 2.11 s | 0.95 s | 0   | 14 ms |
|                                                              | 2   | 99   | 100  | 100 | 100 | 2.10 s | 0.93 s | 0   | 3 ms  |
|                                                              | 3   | 99   | 100  | 100 | 100 | 2.10 s | 0.92 s | 0   | 3 ms  |

LCP element in every run: the centre Stone Steps frame (`ss-home-m-600.webp`, 23 KB). Earlier, without the Newsreader regular preload, CLS was 0.005 (the prose reflowing on font swap) and LCP 2.03 to 2.26 s; preloading it fixed both.

**Transfer at 390 px** (`shoot.mjs`, DPR 3, cache off, CDP encoded bytes):

| Load                                  | Total  | Requests | HTML    | Fonts    | Images |
| ------------------------------------- | ------ | -------- | ------- | -------- | ------ |
| Before the type change                | 463 KB | 13       | 17.8 KB | 86.7 KB  | 359 KB |
| **Final, first load**                 | 477 KB | 14       | 18.5 KB | 100.3 KB | 359 KB |
| Final, after scrolling the whole page | 830 KB | 20       |         |          |        |

**What the type change cost:** one more preloaded request and 14 KB (Bebas sets the headline, so it must arrive before first paint), about 0.1 s of simulated LCP (1.96 to 2.03 s became 2.10 to 2.11 s), no change in score. Bricolage stays for the small furniture; replacing it with Bebas would save 41 KB but would put caps on every button and label, which Nathan's brief rules out.

Of the first-load images, the carousel is 85 KB (centre frame and its two neighbours). The other 273 KB are d1's work-section strips further down, which Chrome fetches early because they sit inside its lazy-load distance. That cost is inherited from d1 (which measured 210 KB of images on first load) and is the obvious place to cut: AVIF, smaller strip sources, or a script-gated load like the carousel's.

**Against the budget (00-synthesis section 7, C):** median 95 or higher with none under 90: met (99). LCP 2.5 s: met (2.10 s); the 2.0 s stretch is just missed after the type change (it was met before it). CLS 0, TBT under 50 ms: met. JS 1.2 KB gz (target 4 KB, max 15 KB). CSS all inline, no render-blocking stylesheet (HTML 18.5 KB gz). Fonts 100 KB: over C's 45 KB line. Images at load 359 KB and total at load 477 KB: over C's 120 KB and 300 KB lines, because of the inherited work strips, not the hero.

## Behaviour checks (`shots/checks.json`)

- Arrows: next moved 6 to 7 at 1440 (click) and at 390 (touch tap); prev twice returned to 6.
- Mouse drag at 1440 and touch swipe at 390: each moved exactly one frame (7 to 8).
- Keyboard: the reel is the 10th tab stop; Right moved 6 to 7; two quick Lefts moved to 5; Tab then reaches the centre caption link, then the arrows; Enter on prev moved to 4. Focus shows as a red ring round the centre frame and round each arrow (`keyboard__*.png`).
- Targets at 390: nav 44 px tall, CTA 181x48, arrows 52x48. No horizontal overflow at 390 or 1440. No console errors.
- Motion frames: `carousel__1440__1..5` (start, arrow moving, settled, mouse drag mid, settled), `carousel__390__1..5` (start, tap moving, settled, finger down mid-swipe, settled).

## Impeccable critique (dual sub-agent, two rounds)

Assessment A (design review) and B (detector, `impeccable detect --json`) ran as isolated sub-agents each round. Browser overlay skipped (static file, no dev server; Playwright shots used). Nothing written to `.impeccable/`.

**Round 1** (before the type change), A: 23/32, "Good". Fixed: the side stacks read as a jumble (far frames now fade at the edges, upper stacks lowered); the proof had no label in the 1440 fold (height-aware frame size, caption name now above the fold); workers.dev in the FBCM chrome and "domain cutover pending" jargon (replaced); the loop circled nothing mid-move (fades while moving); site name repeated in counter and caption; lowercased labels; nav targets to 44 px; the phone promise keeps "with a written guide"; focus ring moved from the whole reel to the centre frame; the logo's mismatched `aria-label` removed.

**Round 2** (after the tagline and Bebas), A: 31/40, "specific: the film strips, red loop and proof-sheet framing could only belong to a studio whose founder came from photography". It found the two voices work together ("one sentence spoken in two registers") and the fold passes at both sizes. Fixed: the hero kept d1's -0.04em tracking and crowded the Bebas letters (now 0.01em). Checked and already right: the price figures' tracking (the Bebas layer sets 0.01em). Not changed: opening on a serif site to avoid Stone Steps' condensed-caps echo (a content decision, see 5 above); a sticky mobile CTA (the hero CTA is above the fold).

**Detector**, round 2: 39 findings, none material. cramped-padding 21 (browser chrome bars, film strips, rule-divided rows), broken-image 7 (the deferred `data-src` frames: false positive), all-caps-body 7 (edge print and labels), italic-serif-display 1 (the deliberate second voice), clipped-overflow 1 (the hero clips the fan by design), cream-palette and repeating-stripes-gradient (the paper and sprocket rows).

Not changed: "The proof sheet." headline and the footer's placeholder legal links (inherited from d1), "Let's build a site you won't have to redo." (D's kept line).

## Frank risks

1. **Busy at 1440.** Seven frames are visible at once. That is the sketch, and it reads as a fan, but the eye still has to find the centre; the loop and the size jump do that work. For a calmer fan, fade the d±3 keyframes too (one line in `carousel.css`).
2. **Bebas is common**, and it is the face the current site already uses. Paired with Newsreader italic and the contact-sheet world it reads as his; alone it would not.
3. **The fan depends on `animation-timeline`**: Chrome, Edge and Safari 26 have it, Firefox does not yet (plain snap row).
4. **Screenshots age.** Ten frames from five live sites go stale as clients edit. `capture.mjs` re-shoots them all in about two minutes; the real build should run it before each deploy.
5. **FBCM is shown before it is live,** labelled plainly.
6. **Other people's sites at a readable size.** Each client should be comfortable with that.
7. **Inherited weight below the fold** (the d1 work strips) puts first-load transfer over C's line, not the hero.
8. **Touch was tested by emulation** (CDP touch events; mixing Playwright's own tap with CDP touches was flaky, so the final run uses CDP for both). Five minutes on a real phone is still worth it.

## What it needs from Nathan

1. Decide which frame the reel opens on: Stone Steps (as built) or FBCM once it is live.
2. Permission to show each client's pages at this size, including FBCM before cutover and Mary Ann's about page.
3. When FBCM cuts over: link its frames, drop "Launching soon" (`slides.mjs`), re-run `capture.mjs`.
4. Confirm the caption facts: FRT "since 1982", Theology Matters 149 of 154, Stone Steps 2,188 finishes 2003 to 2025, "results arrive the morning after each race", "Mary Ann edits it herself".
5. Confirm the lockup (favicon N and dot plus the Bebas wordmark) and that Bebas for headlines, numbers and the wordmark only is what he meant.
6. Pick 7a or 7b; the carousel works the same in both. Round-2 critique would show him 7a first.
