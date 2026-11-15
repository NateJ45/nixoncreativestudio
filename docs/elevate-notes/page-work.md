# Elevate notes: page-work (/work/ and /work/{slug}/)

For the lead to fold into DESIGN.md section 7 and the page rules. Nothing here is in those files yet.

## DESIGN.md section 7: moving things, each with its reduced-motion answer

- **Job index window (/work/, "What the site has to do").** Pointing at, focusing or tapping a client name raises that client's desktop window (the cover the grid already shows, fetched only on first raise) beside the row, with the house bounce. Mouse: stays while the pointer is on the row or the window, leaves 220 ms after (WCAG 1.4.13). Keyboard: focus raises, blur or Escape puts it away. Touch: first tap shows it (inline under the row on a phone), second tap follows the link. Reduced motion: it appears with no bounce. No JS: the stage is hidden and the names are plain links.
- **Study hero settle (/work/{slug}/).** A CSS scroll-driven animation (`--settle`, a registered property that starts at 1) eases the laptop and phone from slightly large and tilted to level across the first screen of scroll; on a wide screen of ordinary height the hero holds still while they do (`.s-pin`). Uses `scale`, `rotate`, `translate`, so it adds to the throw-in's `transform`. Nothing is hidden at load. Reduced motion, or no `animation-timeline` support: the hero is simply settled, as before.
- **Halftone behind the title.** Static. A dot mask built at build time (`scripts/halftones.mjs`, `npm run halftones`, outputs in `public/assets/halftone/` and `src/data/halftones.json`) paints the client's paper over their accent, faded out under the words and the top line, with a soft scrim under the title. Replaces the old drifting backdrop, so the hero no longer has a 40 s looping animation. Forced colors: hidden. No `mask-composite`: flat colour.
- **Decision cards.** "The easy version" lies back on the well, soft-coloured, turned a hair; "What I did" is a card on top. With motion allowed, "What I did" waits lifted and turned and lands with the house bounce plus `ui.cue('deal')` when the card's top passes the middle of the screen (class `.landed`; note `.dealt` is taken by kit.css). Reduced motion or no IntersectionObserver: laid out landed, no sound. Both halves always readable.
- **"What I built" filmstrip.** The feature shots inside the fold are also laid out above it as a sideways row of prints (read from the fold's own markup, so nothing is listed twice). Scroll, trackpad, touch, mouse drag, arrow buttons (shown only when it overflows), Left/Right between prints; each print is the existing Enlarge button. `data-cursor="Drag"`. Reduced motion: buttons jump instead of gliding, prints do not lift. Print: wraps.
- **Up next hand-off.** A full-width band in the NEXT client's colour with their desktop window, name and one-line outcome. As it scrolls in, a clip opens it from an inset rounded band to the full screen and their window comes up (scroll-driven CSS). The name's link is stretched over the band; click or Enter goes to the study through the `study-hero` morph. Never navigates on scroll. Reduced motion, print, no support: an inset rounded band, still.

## Page-rule lines (homepage-and-pages / components)

- /work/ job index names carry `data-peek="off"` because they raise their own window.
- A colour band never touches the closing: on a study, `.next-more` (See all the work, the sector page link) sits between the Up next band and the closing.
- "Photographs by me. See more" shows on a study only when its frontmatter `services` lists Photography (today: west-chester-preschool). Never inferred.
- After adding or replacing a study's `backdrop`, run `npm run halftones`, look at the hero, and commit the outputs. A study with no backdrop keeps the flat colour.
- Class name `.dealt` belongs to kit.css (the dealt price layout); page scripts must not reuse it.
