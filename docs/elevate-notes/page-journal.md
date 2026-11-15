# Elevate notes: page-journal

The journal, a journal post, the photography full view and the colophon. Text below is for the lead to fold into `DESIGN.md` and `.claude/rules/`.

## What is where

- **Drawn faces**: `src/lib/journal-art.ts` (one drawing per cluster, `faceSvg()`), styles `.jf` in `journal.css`, list-row placement in `sub.css`. Deck cards, list rows and the post's byline row all wear it.
- **Date rail by day**: `railDays()` in `src/lib/journal.ts`; `journal.js` keeps the day's count (rolled with `ui.roll`) and one dot a post in step with the chips and the deck.
- **Margin notes**: `src/components/Aside.astro` (`.mnote`, a `div role="note"`), passed to `<Content components>` in `[slug].astro`. Every "Source:" / "Sources:" line under a table is wrapped, words unchanged.
- **Chart that draws**: `src/components/BarChart.astro` reads the table it wraps at build through `src/lib/table-chart.ts`, so the bars and the table share one source. Only `how-much-does-a-church-website-cost` (the five-year totals) is charted.
- **Marker**: optional `highlight` in the journal schema (`content.config.ts`); `splitHighlight()` in `journal.ts`; the build stops if the phrase is not word for word in `shortAnswer`, and `journal.test.ts` checks every post. New contrast pair (ink on the cobalt, dark side) is in `kit-tokens.test.ts`.
- **Typed card and zoom** (/photography full view): `photo-table.js` (`typeCard`, `zoomOn`), markup in `photography.astro`, styles in `photography.css` (`.pt-type`, `.pt-sw`, `.pt-zf`, `.pt-zoomer`). `npm run photo-colors` now writes `{ wash, swatches[5] }` per photo (an OKLab palette: dominant tones plus the most salient chromatic colour, no near-duplicates, largest area first), laid out the way prettier does so a rerun is clean; `photo-table.test.ts` checks five swatches per photo.
- **Live facts** (/colophon): `src/scripts/colophon.js`, the "This page, right now" section in `colophon.astro`, styles in `colophon.css`.

## For DESIGN.md section 7 (one bullet a moving thing, with its reduced-motion answer)

- **A post's face draws itself.** Each journal cluster has one small line drawing in the 404's language (ink outline on paper, thin ink detail, square cobalt anchor points). When a card comes to the front of the deck its lines draw in with stroke-dashoffset, outline first, then the inside, then the points. At load, in the list, on the post page and under reduced motion it is simply drawn.
- **The rail counts a day once.** Posts published on one day share one rail row with "N posts" and one dot a post; the dot of the card on top is filled. Changing the chip rolls the count (`ui.roll`). Reduced motion: the count is swapped.
- **The marker draws across the short answer.** The one key phrase in a post's short answer (`highlight`) gets the `.hl` marker drawn left to right shortly after load. The words are readable throughout; only the ink waits. Reduced motion and no script: the marker is there.
- **A cost chart draws its bars.** A chart that starts below the fold waits with its bars at no length and draws them out to their real lengths as it arrives, one a beat after the last; the amounts roll (`data-roll`). The lengths are in the markup, so no script, the first screen, a page that loaded scrolled and reduced motion all show it drawn.
- **A print's card types itself.** In the /photography full view, the card beside the print types its rows a line at a time (lens and settings only for the photos the kit names, then the frame's shape), then the five colour swatches land one after another. A screen reader is given each line whole. Reduced motion: the card is simply there.
- **The print zooms.** Pinch, wheel (or trackpad pinch), double tap or double click zoom the open photo up to 4x around that point, a drag pans when zoomed, and + and - buttons under it (and the + and - keys) do the same without a gesture. Clicks and wheel notches ease on a small overshoot; fingers and drags follow exactly. Stepping to another print resets it. Reduced motion: every change is instant.
- **The colophon measures the page.** "This page, right now" reads the transferred weight and request count (Resource Timing, updated as lazy files arrive), the fonts in use, the theme and the motion setting in the visitor's browser; the numbers roll (`data-roll`) and the build date is printed at build. Reduced motion: the numbers are set. No script: only the build date shows, with a line saying why.

## For `.claude/rules/` (page rules)

- Journal: a post's "Source:" lines under a table go in `<Aside>` (blank lines inside so the Markdown links survive). A comparison table with one column of plain amounts may be wrapped in `<BarChart column="..." mine="(me)">`; chart nothing else. The chart is read from the table, never typed twice.
- Journal: `highlight` is optional, at most one phrase, copied exactly from `shortAnswer`. Phrases chosen for the current eight posts are listed in the agent report for Nathan to confirm.
- Journal: a new cluster needs a drawing in `src/lib/journal-art.ts` (or it falls back to the sheet of notes), drawn in the same line language, no stock or per-post art.
- Photography: the typed card never shows a date or a year. Lens and settings appear only for a photo named as a lens `sample` in `src/data/photo-kit.ts` (its EXIF). Run `npm run photo-colors` after adding a photo; it writes the wash and the five swatches.
- Photography: zoom has visible + and - buttons (WCAG 2.5.7); a double click or tap picks a spot, so panning never needs a drag.
- Colophon: the live rows are measured, never typed; label them as measured in the visitor's browser.

## Decisions worth knowing

- Margin notes move to the margin from **85rem**, not 64rem as the task said: below about 85rem the contents rail plus the 44rem reading column leave no room for a third column, so between 64rem and 85rem the note stays the small line under its table.
- Focus now lands on **Next** when the photography full view opens (`autofocus`), so it does not land on the zoom buttons that come first in the markup.
- A known site-wide quirk, not from this work: `ProseLink.astro` renders its link text with surrounding whitespace, so a link followed by a comma shows a space before the comma ("Wix plans , Squarespace"). It shows in every post; it is more visible in the narrow margin notes. A one-line fix in `ProseLink.astro` (no whitespace inside `<a>`) is outside this agent's files.
