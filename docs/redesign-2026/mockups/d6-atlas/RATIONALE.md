# D6: The Atlas

Static homepage mock-up, round 2, 2026-10-04. `index.html` is generated: edit `index.src.html` and run `node _scripts/gen.mjs`, which projects real coordinates into the two hand-built SVG maps and computes every distance and coordinate on the page. Assets: `assets/` (13 WebP, 1.1 MB on disk, most never loaded on a phone), `fonts/` (3 WOFF2), `shots/` (fold and full page at 1440 and 390, `transfer.json`, `lighthouse-mobile.json`). Scripts in `_scripts/` run from MAIN (`capture.mjs`, `assets.mjs`, `shoot.mjs`, `lh.mjs`); `patch*.mjs` are one-off edit records.

## The idea

The truthful fact that hurt round 1 ("around Cincinnati" is false: seven of nine projects are elsewhere) becomes the design. The page is a survey sheet. Cincinnati is home base, drawn at large scale in the hero (the Ohio River's bend, Mill Creek, Mt. Airy Forest with relief rings), and the Stone Steps plate sits on the sheet directly above its own pin. The work band is the atlas: a hand-drawn regional map (graticule, Ohio, Wabash, White, James, Savannah, Congaree and Edisto rivers, Lake Michigan and Lake Erie, the Atlantic and Chesapeake, Blue Ridge hachures, 100 to 500 mile rings) with route lines from Cincinnati to each site, and a gazetteer of plates keyed by pin number. Every place is verified: Mt. Airy Forest (vault), Richmond VA (FRT's legal home, vault), Greenwood SC (Theology Matters' mailing address, live contact page), St. Matthews SC (live MAS footer), Plainfield IN (live Reid hero), Cincinnati (Presbyterian Academy, vault), Orangeburg SC, Muncie IN and Chicago (vault). Distances are computed great-circle from downtown, not typed.

Why it wins these buyers: the map lets the page be honest and impressive in the same gesture. A church board sees reach (five states) and locality (a home base five miles from a real race) at once, and the cartographic legend does the honesty work: solid pins are live sites you can open today, dashed open pins are "built, not launched" (Muncie, Chicago), and the list says plainly that the Presbyterian Academy is live but not yet proof. A design-literate stranger shares it because nobody else's studio site is an atlas of its own clients, and it could not be reused by another studio unchanged.

The fold (both widths) carries: who it is for, the promise ("run by the people already there", "you own it outright"), the price floor, one CTA, and one proof (Stone Steps, records from 2,188 checked finishes).

## Type and palette

- **Archivo** (variable width 62 to 125, one 88 KB file): the map-label voice. Expanded and heavy for headlines (like a sheet title), expanded caps with wide tracking for place names, narrow tabular figures for coordinates, distances and prices.
- **Alegreya** roman and true italic (43 + 44 KB): the warm text face. The italic is also the cartographer's water lettering (river and lake names), so the second voice in each headline ("run by the people already there.") is literally the map's hand.
- Palette, not blue-on-white: woodland green sheet `#dfe5c9` (hero), survey paper `#f4efe2` (atlas, about), night `#1c2822` (prices), sand `#ecdcbf` (process), route vermilion `#b5341a` (pins, routes, CTA, and the whole closing band), contour brown `#8a4a1e` (coordinates, relief, rings), water `#2b6787` with tint `#c9dde0`, ochre `#d39b2a` (home zone). Every band changes ground.
- Compositions per band: hero = sheet with plate pinned over its pin; atlas = sticky map beside a scrolling gazetteer; prices = a map scale bar with the three floors marked to scale and leader lines down to the tiers; process = a survey traverse with four triangulation stations; about = a field photograph plate with field notes; close = vermilion ground with a compass rose.

## Theme position

Single art-directed light theme, like FBCM and Reid. A survey sheet is paper; a dark mode would be a different map. Dark appears only as a band ground (prices, footer). Nathan decides whether the current site's light/dark promise must survive.

## Motion (two moments, zero JS)

1. Routes trace out from Cincinnati as the map scrolls in (CSS `animation-timeline: view()`, `pathLength=1` overlays). Without support, or with reduced motion, the routes are simply drawn; the dashed base route is always visible, so nothing depends on the animation.
2. Hovering, focusing or targeting a plate lights its pin and thickens its route (CSS `:has()`); map pins are links to their plates. Nothing in the first viewport starts at opacity 0.

## Measured cost

Local static server, gzip text. Page JS: 0 bytes.

| Measure                           | Result                                                          | Budget                          |
| --------------------------------- | --------------------------------------------------------------- | ------------------------------- |
| First load at 390 px (Playwright) | 279 KB (doc 18, fonts 174, images 87); 315 KB after full scroll | under 815 KB                    |
| First load at 1440 px             | 305 KB; 327 KB full scroll                                      |                                 |
| Lighthouse mobile, 3 runs         | Perf 96 / 96 / 96, A11y 100, BP 100, SEO 100                    | 95+, no run under 90, a11y 100  |
| LCP / FCP / TBT / CLS             | 2.8 s (all 3) / 1.4 s / 0 ms / 0.008                            | LCP 2.5 s, TBT under 100, CLS 0 |
| Render-blocking links             | none (CSS inline, one font preload)                             | none                            |

LCP misses 2.5 s by 0.3 s. The LCP element is the hero lede text; breakdown is TTFB 0.45 s and render delay 2.25 s (text waits for fonts). Tried, measured, in order: preloading Alegreya (2.9 s, no change); `font-display: optional` (2.9 s, no change); dropping the Archivo preload (FCP worse, 1.4 to 2.0 s, Perf 93, reverted); smaller hero plate variant plus no `fetchpriority` (2.9 to 2.8 s, kept). The remaining cost is font bytes: Archivo's full variable file is 88 KB. Next step for the real build: subset Archivo to Latin basic and the two axes in use (estimate 30 to 40 KB), then re-measure. Round 1's D3 measured 2.0 s on the same machine with lighter faces.

## Critique (impeccable, two isolated sub-agents) and what changed

Design review scored about 23/32 on the applicable heuristics and called the direction strongly authored. Fixed: map label collisions (Cincinnati, Ohio River, Plainfield, Richmond clipping, Atlantic, state labels), the three near-parallel South Carolina routes (Orangeburg is now a spur from St. Matthews, Greenwood bows the other way), pin hierarchy (proof pins 1 to 4 large and red; other live pins ringed paper; unlaunched pins dashed), hero Cincinnati label clipping, tap targets (wordmark, text links), mobile nav (four section links now show on phones; header scrolls away there). Detector: italic-serif display and cream palette are deliberate; cramped padding on the tier columns is the hairline ledger layout, left as is. Not fixed: the "100 mi" ring label touches the Ohio River label on desktop.

## Frank risks

- The map is the most expensive thing to maintain: a new client means a new pin, a coordinate, a label position and a re-check for collisions. In the real build the gazetteer must come from the CMS and the label offsets need a small per-pin field.
- Projection is a simple equirectangular sketch; rivers and coasts are hand-placed approximations. A geographer will see that; the caption says "drawn by hand".
- The middle bands (prices, process) carry the metaphor more lightly than the hero and atlas. The reviewer called them the valley of the page.
- Showing Chicago and Muncie as open pins keeps unlaunched work visible. Honest, but Nathan may prefer to drop them.
- Theology Matters is placed at its mailing address (a P.O. box in Greenwood); the copy says "mailing address", not "based in".

## What it needs from Nathan

- Confirm he is comfortable naming all nine places, including the two unlaunched pins and the Academy's "not proof yet" line.
- Confirm "Live since September 2026" for Stone Steps (the vault's cutover date, 2026-09-18) and FRT's Lighthouse 100 line (vault, 2026-09-17).
- One or two client quotes would give the close a peak; none exist yet, so none are shown.
- Decide on the single light theme.

## Three strongest

1. The idea is true and specific: the page's main graphic is the honest geography of the portfolio, with the legend doing the honesty rules' work.
2. Hero composition: the proof plate sits over its own pin on a real Cincinnati sheet; promise, audience, price, CTA and proof all in the fold at 390 and 1440.
3. Zero JS, 279 KB first load on a phone, Lighthouse 96 and accessibility 100 on every run.

## Three weakest

1. LCP 2.8 s, over the 2.5 s target, until Archivo is subset.
2. Prices and process bands are competent but less memorable than the first two bands.
3. The map at 390 px relies on numbered pins and a key rather than labels; it reads, but it is a smaller pleasure than the desktop sheet.
