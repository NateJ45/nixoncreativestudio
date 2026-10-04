# D4: The type poster

Round 2, direction 4. Static mock-up, zero JavaScript, one HTML file with inline CSS. Built 2026-10-04.

Files: `index.html`, `assets/` (9 WebP crops and one photo, 133 KB), `fonts/` (two variable WOFF2 files, 141 KB), `shots/` (folds, full pages, scroll-moment frames, `transfer-390.json`, `lighthouse-mobile.json`).

## The idea

The page is a printed poster that happens to scroll. The headline is the main image: "A website your next VOLUNTEER can run." "VOLUNTEER" is set at 23.4vw (about 337 px tall at 1440 wide) in Archivo at its narrowest width, edge to edge. It works because the biggest word on the page is the buyer, not the studio. Everything after the hero keeps that scale. Each client name is a full-width red headline. The three prices are 17vw numerals. The four process steps are led by their durations ("1 hour", "1 page", "1st month").

The work never appears as a browser mock-up. Every proof is a detail cropped from the live sites with Playwright on 2026-10-04 and blown up to type scale:

- Stone Steps: the course-record board row (David Riddle, 3:40:56), the 50K race ticket, the entry-price rows and the 5,200 FT tag.
- Foundation for Reformed Theology: its hero headline.
- Theology Matters: its subscribe headline and the current-issue card.
- MAS Monograms: its headline.

Each crop is a real fact on a real site, shown big enough to read.

## Deliberately different from round 1

All three round-1 mock-ups used cream paper, dark ink, one accent, a split hero and a calm serif or grotesk. D4 differs on every one of those:

- The ground is the colour, a full vermilion field, not paper.
- The hero is one typographic object, with no photo and no card.
- Ink and bone are bands, not backgrounds.
- The scale jumps are 10 to 1 rather than 3 to 1.

## Why it can still win a church board or preschool director

The first screen does the four jobs the brief asks for, at both 1440 and 390 (see `shots/fold__1440.png` and `shots/fold__390.png`):

- **Who it is for:** a bold first sentence, "For churches, nonprofits, schools and small businesses."
- **The promise:** the headline, plus "You own it outright."
- **One CTA:** "Start a project". The price line "Prices published, from $4,000" also links down to the prices.
- **One proof:** the live Stone Steps record board, with the 2,188-finishes fact. The line under it names the three church-adjacent clients as also live.

The type is loud, but the words are plain and checkable. The case studies use facts, not adjectives, and every case ends in a link to the live site ("Four live sites. Click through and look around."). The prices are the calmest, most legible section on the page. A volunteer-run organisation fears a site it can't maintain more than one that looks bold, and the headline speaks to exactly that fear.

## Type system

- **Archivo variable** (wdth 62 to 125, wght 100 to 900, one 88 KB file) is the whole sans voice:
  - 62% width, weight 900, uppercase for the poster words.
  - 85% for the client names.
  - 96 to 112% for UI and labels.
  - 125% weight 300 for the 01 to 04 indexes.
  - Tabular lining figures (`font-variant-numeric: tabular-nums`) on the prices, facts and indexes, so the columns of numbers line up.
- **Bodoni Moda italic, opsz 6 to 96** (one 53 KB file) is the second voice, a true italic with optical sizing on (`font-optical-sizing: auto`). At 200 px the hairlines go razor thin. At 20 px (the case-study standfirsts) the same file draws sturdier strokes.
- **The lockup** of condensed caps against a Didone italic is kept for three moments only: the hero, "What it costs", and the close. It was used five times before the critique; see below.
- **Metric fallback.** An `Archivo Fallback` face (Arial Narrow, then Roboto Condensed, then Arial) is set with `size-adjust`, so the hero keeps its shape while the font loads. Every display line is `nowrap` with a fixed line-height. Measured CLS is 0.

## Colour and theme position

There are three colours as tokens on `:root`, and no others:

| Token                  | Hex     | Role                               |
| ---------------------- | ------- | ---------------------------------- |
| `--signal` (vermilion) | #EE4B2B | The ground                         |
| `--ink`                | #17110D | Type and bands                     |
| `--bone`               | #F3EBDD | Type on ink, and the prices ground |

Measured pairs:

- Ink on signal: 5.1:1.
- Signal on ink: 5.1:1.
- Bone on ink: about 16:1.
- Bone on signal: 3.1:1. This pair is never used for text.

The client crops bring their own colours (Stone Steps green, Foundation for Reformed Theology navy, MAS blue), which keeps them reading as other people's work.

**Theme position: a single art-directed theme with no dark mode.** The page already alternates light and dark bands. A dark-mode inversion of a vermilion poster would be a different design, not a theme. This follows A's recommendation (FBCM and Reid also dropped dark mode). Nathan decides. If dark mode is required, the honest version swaps only the bone section to ink.

## Scroll moments (three, CSS only)

All three sit behind `@supports (animation-timeline: view())` and `prefers-reduced-motion: no-preference`. Nothing in the first viewport animates or starts at opacity 0. Without support, the page shows the end states, and the full-page shots are taken in that state.

1. **Client names widen.** Each name opens from 62% to 85% width as it enters the viewport. The width axis is the material. Frames: `frame__name-widen__1-3.png`.
2. **Prices put on weight.** Each price goes from weight 200 to 900 as it lands. Frames: `frame__price-weight__1-3.png` (the mid-weight $4,000 is visible in frame 2).
3. **The timeline bar draws.** A bar for "6 to 10 weeks from kickoff to launch" draws across under the steps. Frames: `frame__bar-draw__1-3.png`.

## Measured cost against the budget (section 7 of 00-synthesis.md)

**Server.** Local static server with the HTML gzipped. Lighthouse 12 from MAIN `node_modules`, default mobile (simulated Slow 4G, 4x CPU), 3 runs. Stray headless Chrome was killed between runs.

| Run | Perf | A11y | BP  | SEO | LCP   | FCP   | CLS | TBT  |
| --- | ---- | ---- | --- | --- | ----- | ----- | --- | ---- |
| 1   | 99   | 100  | 100 | 100 | 2.0 s | 0.7 s | 0   | 0 ms |
| 2   | 99   | 100  | 100 | 100 | 2.0 s | 0.7 s | 0   | 0 ms |
| 3   | 99   | 100  | 100 | 100 | 2.1 s | 0.7 s | 0   | 0 ms |

**LCP element.** The hero lede paragraph. It is text, so LCP waits on fonts, not on images.

**Transfer.** Playwright, 390x844 at DPR 3, CDP encoded bytes:

| Load                           | Transfer | Requests |
| ------------------------------ | -------- | -------- |
| First load                     | 227 KB   | 10       |
| After scrolling the whole page | 275 KB   | 12       |

**First-load breakdown:**

| Item                        | Size            |
| --------------------------- | --------------- |
| HTML (gzipped; 44.7 KB raw) | 9.9 KB          |
| Archivo                     | 88 KB           |
| Bodoni italic               | 53 KB           |
| Crops                       | 5 to 23 KB each |
| Headshot                    | 26 KB           |

**Against the budget:**

- **Median 95 or higher, no run under 90:** met (99, 99, 99).
- **LCP of 2.5 s or better:** met, at 2.0 to 2.1 s. That is at the 2.0 s stretch target, not under it.
- **CLS 0, TBT under 100 ms:** met.
- **JavaScript:** 0 bytes.
- **CSS:** all inline, with no render-blocking stylesheet links. The two fonts are preloaded.
- **Weight:** about a quarter of Stone Steps (843 KB) and Reid (815 KB).
- **Where the cost is:** 62% of first-load bytes are the two fonts. Subsetting Archivo to Latin basic would cut about 30 to 40 KB. I did not do that here.

**Caveat on the comparison.** Earlier mock-up numbers were measured on the same machine on the same day, so they compare. This is still a static mock-up, not the Astro build, and production adds the Cloudflare scripts that C measured.

## Critique gate (impeccable)

Assessments A (design review) and B (detector plus browser overlay) ran as two isolated sub-agents. A scored the design 22/32 (heuristics 7 and 10 n/a, about 69%, top of "Acceptable", near "Good").

**Material findings fixed:**

- **Theology Matters left an empty void at 1440.** The issue card now overlaps under the headline crop.
- **Type collisions.** "PREVIEW links" ran into its step text, and the italic "you" hit "REDO" in the close. Both fixed.
- **Step numbers appeared twice.** The index is now a small "Step N" label above each step title.
- **Too many italic lockups.** Cut from five to three.
- **Tech-speak removed:**
  - "282 KB to 186 KB" became plain Lighthouse wording.
  - "headless build" became "A build made for a large site with a lot of content".
  - The AI audio note on Theology Matters was given plainer wording.
- **The price line was a dead span.** It is now a link to the prices.
- **Mobile nav.** Mobile had no nav apart from the CTA. It now has a second header row with Work, Prices, How it works and About, all 44 px tall.
- **No contact fallback.** Email and phone are now in the close and the footer.
- **Hero.** A metric-matched fallback font was added. The lede's gap from "VOLUNTEER" was widened.
- **Photo.** The orange multiply duotone made Nathan look sunburnt. It is now greyscale on ink with an offset signal block.
- **Text measure.** Capped at 66ch (the detector's line-length finding).
- **Lighthouse.** Fixed an aria-label that did not match the link's visible text, and added a favicon so best-practices went from 96 to 100.

**Detector findings judged false positives (23 static, 17 in-page):**

- **Cramped padding:** these are full-bleed bands and rule-divided rows, which the poster language intends.
- **Tight leading:** these are display headings at 100 px and above.
- **"1.0:1 contrast" in the header:** the overlay read the wrong background. Ink on signal is 5.1:1.
- **body overflow clip:** deliberate.
- **italic-serif-display:** this is the direction itself, kept for three moments.

**Not addressed:** A's suggestion to swap the hero proof from Stone Steps to the Foundation for Reformed Theology. I kept Stone Steps as the hero proof, because the synthesis keeps it as the lead case study and the record board is the strongest type-scale detail. The line under it now names the three church-adjacent sites. Nathan may want to test the other order.

I did not write the critique snapshot into the repo's `.impeccable/` folder (rule: do not touch repo source).

## Risks (frank)

- **It can read as loud, and as a style.** Condensed caps, a Didone italic and vermilion is a recognisable 2024 to 2026 editorial look. Critique A called the palette the least specific part. A design-literate stranger will screenshot it. A cautious school board may feel shouted at, and some will read "agency" and assume agency prices. The published prices are what counter that.
- **The headline is a bet.** It leads with "volunteer". That fits churches and small nonprofits, but it may land oddly for a paid-staff business or a publication like the Foundation for Reformed Theology.
- **Stone Steps is a trail race.** It is the first proof a church administrator sees. The work section still leads with it.
- **Fonts carry the design.** On a failed font load the fallback is Arial Narrow or Arial. It holds its shape but loses the voice.
- **vw display sizes do not respond to text zoom.** Body text does. The real build should pair the vw values with rem in `clamp()`.
- **Animating font axes re-lays out text on every frame.** That is fine on a phone for three short moments. It would not be fine everywhere.
- **The client crops carry their own drop shadows and dashed borders**, which slightly fight the flat poster language.

## What it needs from Nathan

- Decide the theme position (single theme or both).
- Confirm the hero promise holds: "backups that get checked", "accessibility checks on every change", and "reply within one or two business days".
- Confirm the Theology Matters audio line is fine to publish, and the Foundation for Reformed Theology "September 2026, 100 in all four" wording.
- Give permission to show each client's crops at this size: Stone Steps, the Foundation for Reformed Theology, Theology Matters and MAS. Large crops of someone's headline are more conspicuous than a thumbnail.
- If he keeps this direction: one real photograph of Nathan working, which the poster could carry as a second image beside "the same person". Also two client quotes. A quote set in the Bodoni italic at poster size would be the strongest possible section.

## Three strongest points

1. **The first screen is memorable and still does the job:** who it is for, the promise, the CTA, the price floor and a live proof, at 390 and 1440, with nothing hidden or faded in.
2. **The work shown as huge real details** (ticket, record board, headlines) proves the work is live and specific in a way browser mock-ups never do.
3. **Cost.** Perf 99/99/99, accessibility 100, LCP 2.0 s, CLS 0, zero JS, 227 KB on first load.

## Three weakest points

1. **The palette and lockup** sit close to a current trend, so they are the least ownable part.
2. **Below the hero, the case studies use one repeated grammar:** red name, italic standfirst, crop on the right. The Theology Matters and MAS rows are thinner than Stone Steps.
3. **Mobile hero.** "VOLUNTEER" sits close to the right edge, and the 27vw prices take a lot of scrolling on a phone.
