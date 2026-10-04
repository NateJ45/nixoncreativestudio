# D5: One fact (the site is the demo)

Round 2 mock-up, 2026-10-04. Files:

- `index.html`: one file with inline CSS and about 2 KB of inline vanilla JS.
- `assets/`: 13 WebP files, fresh live crops plus Nathan's headshot.
- `fonts/`: 2 WOFF2 files.
- `shots/`: screenshots, demo frames and one Lighthouse JSON.
- `_scripts/`: capture, crops, shots and checks, Lighthouse, axe. Run them from MAIN.

## The idea

Nathan's real advantage (D-copy-positioning) is that his sites keep their own facts straight. Most studio homepages say something like that. This page lets the visitor see it happen in the first screen.

The hero is a small working machine:

- **The fictional church.** Larkspur Street Church is made up for the demo. It is labelled that way in the first sentence and uses a reserved `.example` domain.
- **The one field.** "Sunday worship starts at" is the only place the time is stored. A wire runs from the field to six cards: header, home banner, visit page, contact page, footer and search listing.
- **The update.** Type 9:15 (or tap a quick pick) and the wire lights, and each card's time flashes in highlighter yellow down the line.
- **A derived fact.** The visit page's "Coffee from 9:00 AM" is worked out from the service time. That mirrors Stone Steps, whose records are calculated from finishes rather than typed.
- **"Now try to break it."**
  - Type "half ten": the site refuses it, and the error says exactly what did not happen.
  - Flip "Edit page by page", the way most church sites are run. The site makes one edit for you straight away. The visit page changes, the other five places go red and struck through, and the status line says so: "You fixed the visit page. The other 5 places still say 9:15 AM, and its own coffee time still says 9:00 AM."
  - Switch it back and every place agrees again.

## Why it wins these buyers

A church administrator, nonprofit director or preschool office manager has lived through that red state: the footer says 10:30, Google says 10:00, the banner still shows Easter. The demo turns their own frustration into the pitch in about five seconds, with no technical words.

It also does the job that adjectives cannot. A board member who has never heard "CMS" or "structured content" watches the thing work, and the next screen shows it already working on real sites:

- **Stone Steps.** The live records board, plus a small "entered once, shows up on" diagram (each finish time, 2,188 of them, feeding course records, age-group records and the fastest finishes).
- **Theology Matters.** An article goes in once, and its audio version and print-edition link come from it.
- **FRT.** The staff add to their own library.
- **MAS.** Mary Ann edits her own site with no monthly platform fee.

For a design-literate stranger, the hero is the shareable bit. A studio homepage you can break, that explains its own value proposition by letting you try to break it, is rare.

## Fold contents

The fold covers every requirement at both widths (see `shots/fold__1440.png` and `fold__390.png`):

| Requirement   | How the fold meets it                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Who it is for | "Websites for churches, nonprofits and small organizations."                                                                          |
| Promise       | "Change it once. It's right everywhere."                                                                                              |
| One CTA       | "Start a project" in the header; also beside the price on desktop.                                                                    |
| One proof     | "2,188 checked finishes behind every record on the Stone Steps 50K site. Nobody types a record by hand."                              |
| Demo          | Fully visible on desktop. On a phone the field and first card are in the first screen, and "Prices start at $4,000" sits in the lede. |

## Visual system

**Palette.** It is deliberately unlike round 1, which used three warm cream-paper grounds.

| Colour               | Hex     | Use                                                  |
| -------------------- | ------- | ---------------------------------------------------- |
| Ink violet           | #17122b | Hero, process, close and footer.                     |
| Highlighter yellow   | #ffd43b | The colour of "this fact just changed", and the CTA. |
| Lavender chalk paper | #ecebf2 | Work and about.                                      |
| Vermilion            | #ff6a52 | Only for drift and errors.                           |

The yellow is used for meaning, not decoration: the highlighted "everywhere.", every updated value in the demo, the wire, the step durations, and the prices band, which is the one full-yellow ground. Prices are the other fact the site keeps straight.

**Type.**

- **Archivo, the main voice.** One variable file with weight and width axes. Headlines are set wide (112 percent) and heavy; body text is at normal width.
- **Gloock, the second voice.** A high-contrast serif used for the turn in a headline ("everywhere.", "live today.", "before you ask."), the big prices, the "2,188" numeral, the day-one line and the closing sentence.

**Signature device.** The fan-out tree: one dark source box, a wire, several places. It appears in the hero demo and again in the Stone Steps case study, so the idea carries below the fold.

The fictional church cards use Georgia and a green of their own, so the church never borrows the studio's brand.

**What the page avoids.** No eyebrows, section numbers, browser mock-up frames, gradient text, offset shadows, monospace costume or WebGL. Client work is shown as legible crops.

## Theme position

One art-directed theme with no dark-mode toggle. The page is already dark-led, and it alternates grounds on purpose: ink, then paper, then yellow, then ink, then paper, then ink. A token-swapped light or dark variant would flatten that sequence and break the highlighter logic. This matches the FBCM and Reid decisions and the A report's recommendation.

The demo cards are always light, because they stand in for someone else's website.

## Measured cost against the budget

The page was served locally with Brotli on HTML, and the fonts and images were uncompressed.

|                                                          | Measured                                                                 | Budget (synthesis section 7, C)                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Mobile Lighthouse, 3 runs (`_scripts/lh.sh`)             | Performance 99 / 99 / 99, Accessibility 100, Best Practices 100, SEO 100 | median 95 or higher, no run under 90, accessibility 100                         |
| LCP (simulated mobile)                                   | 2.2 s on all three runs; the LCP element is the lede paragraph (text)    | 2.5 s or better (2.0 s target)                                                  |
| FCP / TBT / CLS / Speed Index                            | 0.9 s / 0 ms / 0 / 0.9 s                                                 | TBT under 100 ms, CLS 0                                                         |
| JS                                                       | 1.98 KB gzipped, inline, no framework                                    | target under 6 KB, hard max 15 KB                                               |
| HTML with inline CSS                                     | 10.7 KB Brotli (CSS 5.2 KB gzipped)                                      | inline critical CSS, no render-blocking links: met (no stylesheet links at all) |
| Transfer at 390px, first load                            | 317 KB in 8 requests (fonts 114, images 192, document 11)                | no larger than Stone Steps 843 KB / Reid 815 KB                                 |
| Transfer at 390px, after full scroll                     | 343 KB in 9 requests                                                     |                                                                                 |
| axe-core (1440 and 390; default, drift and error states) | 0 violations in all six runs                                             |                                                                                 |
| Horizontal overflow, opacity 0 in first viewport         | 0 px at both widths; none                                                | none                                                                            |

**Not reached.** LCP is 2.2 s, not the 2.0 s target. The largest single cost is the Archivo variable font at 88 KB. Two ways to cut it:

- Subset it to Latin basic and pin the width axis to two instances. That would likely save about 40 KB.
- Drop the preload and let the lede paint in the fallback first.

Neither change was tried here.

## Demo behaviour, verified

These checks were run with Playwright (`_scripts/shoot.mjs checks`, `frames`) and axe (`_scripts/axe.mjs`).

- **JS on.** A typed time publishes 650 ms after typing pauses, or at once on Enter, Update, a quick pick or blur. Typing "10:45" never flashes 1:00 PM on the way. Anything that is not a time is refused and the old time stays everywhere. Accepted forms include "9", "9:15", "915", "6 pm" and "noon"; a bare 1 to 6 reads as PM. Page-by-page mode makes one edit at once, so the drift is visible the moment the switch is flipped, and the hint text changes to say only the visit page is being edited.
- **JS off.** The input, quick picks and break-it block are hidden. A static "10:30 AM" field and the full wired diagram remain. A note reads: "Change this one field and all six places on the right change with it. Turn on JavaScript to try it." See `shots/nojs__1440__fold.png` and `nojs__390__demo.png`.
- **Keyboard.** Tab order runs: skip link, nav, CTA, proof link, field, Update, the three picks, then the switch. Enter commits a time, Space toggles the switch, and Enter on a pick applies it. Focus rings are a 3px yellow outline (ink on the yellow band).
- **Screen reader.** The field has a real label. The quick picks are a labelled group, and the switch is a checkbox with `role=switch`. Results are announced through a polite live status line ("All six places say 9:15 AM."). Refusals go through `role=alert`.
- **Reduced motion.** There is no wire sweep and no fade. Changed values hold a static yellow highlight; the colour change still carries the meaning. See `shots/reduced-motion__drift.png`.
- **Phones.** After a pick or Update, the six cards scroll into view so the change is seen, not just announced. Picks are 44px tall.

The frame sequence is in `shots/`:

1. `demo-d-1-before`
2. `demo-d-2-typed-mid-update` (the yellow sweep)
3. `demo-d-3-updated-everywhere`
4. `demo-d-4-refused-not-a-time`
5. `demo-d-5-page-by-page-drift`
6. `demo-d-6-back-to-one-field`

Phone versions are `demo-m-2` and `demo-m-5`.

## Critique and what changed

The impeccable critique ran as two isolated sub-agents: a design review on Opus, and the detector plus browser overlay plus axe on Sonnet. These material findings were fixed:

- **Partial input published every keystroke.** It is now debounced and committed as described above.
- **The yellow flash left white text on yellow** in the dark cards, and its 3px spread covered neighbouring letters. The flash now sets ink text and uses padding instead of a spread.
- **On a phone the update happened off-screen.** The cards now scroll into view on commit, and the price moved into the mobile lede.
- **Flipping page-by-page did nothing visible.** It now makes an edit at once, and the hint changes.
- **Refusals were not announced.** They now use `role=alert`.
- **The day-one line was set in quotation marks**, so it read like a client testimonial. It is now a plain statement in Nathan's voice.
- **Every h2 used the "sans phrase, serif tail" formula.** Two of them are now all-sans.
- **"2,188" sat alone with no unit.** The proof now starts "checked finishes".
- **The fictional church used the studio's serif.** It now uses Georgia.
- **Small items:** picks went from 36 to 44px, caption text from 11 to 12px, and three overlong measures were shortened. A favicon was added, which fixed the Best Practices 96, caused by a console 404.

Detector items judged false positives:

- 1.0:1 "contrast" on the yellow highlight. The detector cannot read a gradient background; axe passes it.
- The `.src` overflow, which is the wire pseudo-element.
- Flush section padding and display-size heading leading.
- "10:30 AM" repeated six times, which is the point of the demo.

## Frank risks

- **Gimmick risk: real, and the main one.** A buyer could enjoy the toy and miss that it is the product, or read the page as "the developer one". Three things reduce it:
  - The demo uses a church and a service time, not code.
  - The very next screen says "the same idea, live today" and shows real sites doing it.
  - The copy never says "CMS", "schema" or "structured content".

  The risk remains for a buyer who wants beauty first. This page sells reliability first, and shows the work second.

- **Five-second comprehension.** On desktop the reading path is: headline, then the yellow word, then the boxed field labelled "Try it", then six cards with the same time. That should land in five seconds, but it has not been tested with a real person.
  - The weak spot is a visitor who reads the cards as decoration and never touches the field. No animation runs on load, by design, so nothing moves in the fold.
  - A cheap test: show `fold__1440.png` to three church or nonprofit people for five seconds and ask what Nathan does.
  - On a phone, the payoff needs a tap and a short scroll.
- **The demo is a simplification.** Real church sites have more than six places a time appears. The page-by-page mode also flatters the comparison slightly, because a careful volunteer would fix the coffee time too. The fiction is labelled, but a sceptical developer could still call it a toy.
- **Search listing card.** It shows a search result updating instantly. In reality Google picks up the change on its next visit. The card's caption says "Search listing" and avoids the Google name and logo, but the build should add "on Google's next visit" or similar.
- **The fold proof is a trail race, not a church.** It is the strongest true proof, but a church treasurer has to make a small leap. FRT is the alternative if Nathan wants a church-adjacent lead.
- **Dark-led page.** It is less "warm cream" than the PRODUCT.md personality ("warm, confident, grounded"). The warmth has to come from the copy, the yellow and Nathan's photo.
- **Process durations.** Only "one hour", "six to ten weeks" and "the first month after launch" exist in the CMS. "Set in the brief" for strategy is honest but vague.
- **Flaky local runs.** During the build, other sessions on this PC were killing headless Chrome, which crashed some Playwright runs. Every number above comes from a clean, complete run. Retries were needed, not result-picking.

## What it needs from Nathan

1. **Confirm the facts used**, as of today:
   - Stone Steps: 2,188 checked finishes, results 2003 to 2025, imported overnight after each race.
   - Theology Matters: 149 of 154 posts link to their print edition, plus the AI-narrated audio wording.
   - FRT: 100 on all four Lighthouse checks in September 2026.
   - MAS: "Mary Ann edits it herself, no monthly platform fee".
2. **Decide the theme position.** One dark-led theme, no toggle, against the current PRODUCT.md "light and dark" requirement.
3. **Choose the demo organization.** A church, as here, or a school or nonprofit (office hours, a race date). The JS takes any single fact plus one derived fact.
4. **Approve "Typical for a church or school site"** as the Signature label. It replaces "Where most projects land", which D flagged as never transacted.
5. **Optionally, three five-second tests** with real buyers before committing to the direction.
6. **Optionally, real durations for Strategy**, if there is a typical number.

## Three strongest points

1. **The pitch is something the visitor does.** The one true differentiator is demonstrated, not claimed, in the first screen. The drift state is the emotional peak, and it is the buyer's own problem.
2. **Bold and honest at the same time.** It has a distinctive palette and type pair, nothing in it is invented, the fiction is labelled, and every proof line is a checkable fact on a live site.
3. **It costs almost nothing.** 2 KB of JS, 99/100/100/100 on mobile, 317 KB first load, axe clean in every demo state. It also works with JS off, by keyboard, with a screen reader and with reduced motion.

## Three weakest points

1. **Gimmick and comprehension risk is untested.** If people do not touch the field, the hero is a busy diagram.
2. **The work below the fold is more conventional** than the hero: a three-up projects row, three tiers, a four-step timeline. Only the fan-out tree carries the idea down the page. A fuller version could let a visitor change a "start date" that moves the process timeline.
3. **The fold proof is a race and the theme is dark-led.** Both are a step away from the warm, church-board register in PRODUCT.md. The direction asks Nathan to accept that trade.
