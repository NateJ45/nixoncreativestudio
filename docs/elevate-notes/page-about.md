# Elevate notes: page-about

About, contact and the three lean sector pages. What moved, where it lives, and what the lead
should fold into `DESIGN.md` and `.claude/rules/`.

## What was built

- **Portrait tilt with depth** (`src/scripts/about.js`, `src/styles/pages/about.css`). The card leans
  a few degrees with the mouse (4.5 across, 3.5 up and down), through `ui.stillHover`, measured
  against where the card rested so it never chases the pointer. The photo and its caption sit on
  two planes (`--depth`), so the caption slides a little over the photo as it leans. On a touch
  screen it leans up to 2.5 degrees with the scroll instead.
- **Off the clock, two toys** (`src/components/OffTheClock.astro`, `src/scripts/off-the-clock.js`,
  `about.css`).
  - Photography's back is a camera roll of six prints from the photos collection (by id, in
    `REEL`). Buttons, left and right arrows, or a swipe; CSS scroll snap, so with no script it is a
    row that scrolls sideways. A polite live count says "2 of 6: Still morning". Places only, no
    dates or years.
  - Running's back draws the Stone Steps 50K course from `src/data/stone-steps-course.ts` (same
    projection as `CourseLine.astro`) as the card turns over, with "Draw it again". The words say
    only that I built the race's website; nothing claims I ran it. The race-bib photo is no longer
    used on this card (the asset is still in the repo).
- **Stamps that peel** (`src/styles/stamp.css`, a few lines in `about.js` and `contact.js`). A
  `.stamp.peel` has a face and a line under it; the face swings up from its top edge on hover,
  keyboard focus, or a tap (`aria-pressed`). On About, a row of four under "One person." made from
  facts the page already states (One person / On every project, Since 2020 / Building websites,
  Cincinnati / Web work anywhere, From Scotland / Here since 2017). On contact, the "Received"
  stamp peels to "Thank you"; it lands held down (`.down`) and only peels once the mouse has
  really moved, so it does not flip open under the pointer that just pressed Send.
- **Contact paperclip** (`src/pages/contact.astro`, `src/styles/pages/start.css`). Slides onto
  the card's corner while "Check your answers" is the open step. CSS only.
- **Contact letter fold** (`foldAway` in `src/scripts/contact.js`, `.letter` in `start.css`). On a
  successful send, an inert stand-in copy of the card (no ids, names or Turnstile) folds in
  thirds, bottom up then top down, and slips away in about 600 ms, then the existing sent card and
  stamp arrive unchanged. The real form is only made invisible while it plays. On a phone, where
  the card is taller than the screen, the letter is cut from the part on screen.
- **Time in Cincinnati on contact** (`contact.astro`, `start.css`): "Right now it is 3:42 PM in
  Cincinnati, where I work." under the reply promise, filled by foundation-a's `light.js`
  (`data-cincy`). The reply promise text in `site.ts` is unchanged.
- **Ask what a visitor asks on the lean pages** (`src/scripts/ask.js`, new;
  `src/components/SectorLean.astro`, `src/data/sector-pages.ts`, `src/styles/pages/sector.css`).
  The engine moved out of `churches.js` into `ask.js` (`wireAsk(section)`), and its styles moved
  from `churches.css` into `sector.css` (which /churches/ already loads). Four questions each:
  The Presbyterian Academy (schools), Theology Matters (nonprofits), Reid Design (small
  business). Every question, "found it" line and stop was checked against the long phone capture
  in `public/assets/study/<slug>-mobile.webp`; re-check them when a capture is re-shot.

## Shared files touched

- `src/styles/stamp.css`: the `.stamp.peel` block and `.down`, appended. The plain `.stamp` rules
  are unchanged, so the journal's "Updated" stamp is untouched.
- `src/styles/pages/churches.css`: the Try it rules removed (moved to `sector.css`, unchanged).
- `src/scripts/churches.js`: Try it now calls `wireAsk` from `ask.js`.

## For DESIGN.md section 7 (one bullet a moving thing, with its reduced-motion answer)

- **Portrait tilt** (About): leans a few degrees with the mouse, caption on a plane above the
  photo; leans with the scroll on touch. Reduced motion: still.
- **Camera roll** (About, Photography card back): steps one print at a time, smooth scroll.
  Reduced motion: the step is a jump.
- **Course line** (About, Running card back): the course draws itself as the card turns.
  Reduced motion: the line is simply there, and "Draw it again" is hidden.
- **Peeling stamps** (About facts row, contact "Received"): the face swings up on hover, focus or
  a tap to show a second line, with a small spring. Reduced motion: up or down, no swing.
- **Paperclip** (contact): slides onto the card as "Check your answers" opens. Reduced motion: it
  is simply there.
- **Letter fold** (contact): on a send the card folds in thirds and slips away, about 600 ms,
  before the sent card. Reduced motion, and a page opened at `#sent`: no fold, straight to the
  sent card.
- **Ask what a visitor asks** (/churches/, /schools/, /nonprofits/, /small-business/): a question
  scrolls a real phone page to its answer on a critically damped ease. Reduced motion: it jumps.

## For `.claude/rules/`

- **homepage-and-pages.md, About**: the Off the clock cards may carry a toy on the back (`toy:
'reel' | 'course'`). The reel takes prints by id and never shows a date or year. The course card
  says only what the data supports: I built the race site.
- **homepage-and-pages.md, About**: each peel stamp repeats a fact the page already states; add
  one only with its source on the page.
- **homepage-and-pages.md, lean sector pages**: every lean page has "Try it" (`page.ask` in
  `sector-pages.ts`). Questions and stops must be true of that client's long phone capture, and a
  stop past about 2,900 cannot be reached. Leave out a question the capture cannot honestly answer.
- **components.md**: `src/scripts/ask.js` is the one Try it engine (`wireAsk(section)`); do not
  copy it into a page script.
- **homepage-and-pages.md, contact**: the letter fold works on an inert copy of the form, never
  the form itself; field names, values, validation and the post are untouched.
