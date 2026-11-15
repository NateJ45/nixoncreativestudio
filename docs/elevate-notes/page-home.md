# Elevate notes: page-home

What `feat/elevate-home` added to the homepage, written so the lead can fold it into `DESIGN.md`,
`.claude/rules/homepage-and-pages.md` and `CLAUDE.md`.

## Where things live

| File                                                     | What it is                                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/components/home/WhatChanged.astro`                  | "What changed": the `proof` figures as wide cards on each client's colour   |
| `src/components/home/EditDemo.astro`                     | "Your team edits it. Try it.": the demo editor and the made-up phone page   |
| `src/scripts/edit-demo.js`                               | The editor: live preview, photo swap, events switch, Publish stamp, Reset   |
| `src/components/home/PhotoStrip.astro`                   | One row of ten prints from `photos`, shown only while /photography/ is open |
| `src/components/home/ProcessBeats.astro`                 | The four "How it works" steps, cut from services.astro `#how`               |
| `src/scripts/home-more.js`                               | The deal for What changed, the strip's drift and bow, the beats drawing     |
| `src/styles/pages/home.css`                              | Every rule for the four new sections (imported by index.astro)              |
| `src/components/PriceHand.astro`                         | Each price card now has a "Turn over" button and a back                     |
| `src/scripts/price-turn.js`, `src/styles/price-turn.css` | The turn (same rules as Off the clock), imported by PriceHand               |

Order on the page: hero, work grid, What changed, quote band, Edit it, photography strip, prices,
process, closing. The quote band never touches the closing.

## Shared files touched

- None of `kit.css`, `kit.js`, `BaseLayout.astro`, `Dock.astro`, `Closing.astro`, `TopLine.astro`.
- `PriceHand.astro` is shared with `/churches/` (through `DealtPrices.astro`), so the turn shows
  there too. It was edited instead of `DealtPrices.astro` because the cards live in PriceHand.
- The old `.proof` rules in `kit.css` (around line 1955) are now unused: the list moved into
  What changed. Safe for the lead to delete.

## For DESIGN.md section 7 (Motion), one bullet each

- **What changed deal** (`home-more.js`, `.chg-card.held`). Each wide card comes up from a little
  low and turned as it arrives, one after another, with `ui.cue('deal')`; the figure rolls by
  `data-roll`. Only cards that start below the fold are held. Reduced motion: the cards are simply
  there and the figure is its final text.
- **The edit demo** (`edit-demo.js`). The preview's headline and hours follow each keystroke with a
  small spring (`ui.spring(260, 15, 1)`, a dip and settle); the chosen photo comes forward with a
  slight scale; the events band folds away on grid rows; Publish presses the "Published" rubber
  stamp (`stamp.css`, the /contact press) with `ui.cue('stamp')` as it lands; any later change
  lifts it. Reduced motion: words, photo, band and stamp are set with no spring or press.
- **Photography strip** (`home-more.js`, `--bow` on `.strip-row`). Prints bow up to 7 degrees with
  scroll speed and settle flat on a spring; with a fine pointer the row also drifts sideways across
  the section's scroll (transform only). Runs only while the strip is near the screen. Touch keeps
  a hand-scrolled row with the bow only. Reduced motion: a still row that scrolls by hand.
- **Price cards turn** (`price-turn.js`, `price-turn.css`). "Turn over" rotates the card on Y with
  the Off the clock curve and `ui.cue('turn')`; the back lists the tier's `features`. Reduced
  motion: the faces swap with no turn.
- **Process beats** (`home-more.js`, `.bt-wait`, `.drawn`, `.at`). Each step's hairline runs and
  its icon draws in order (520ms apart), the one drawing now in the blue, as on /services `#how`.
  Reduced motion, no script or a restored page: all drawn.

## For `.claude/rules/homepage-and-pages.md`

- The home order is hero, grid, What changed, quote band, Edit it, photography strip, prices,
  process, closing. Keep a neutral section between the quote band and the closing.
- What changed shows only the figures in index.astro's `proof` list; never add or reword one
  there until the client has seen it in their case study.
- The edit demo's organization (Maple Street Community Center) is made up and labelled "Demo"
  twice; it wears no client's colour and its events have weekdays, never dates. Its sentence says
  only what pricing.ts and services.astro say (an editor on WordPress or Sanity, with a written
  guide). Nothing is saved or sent.
- The photography strip shows no dates or years and only renders while the photography gate is
  open (`photography-gate.ts`), so its links always lead somewhere.
- The process beats are cut, never reworded, from services.astro `#how`: change both together.
- The price card's front stays the `a.pc-face` link so `price-morph.js` still grows it into its
  tier.

## No JavaScript

The editor ships with its fieldset `disabled` and Publish and Reset hidden, so it reads as a still
picture of an editor and the page it edits, with the sentence under it. The price cards are the
plain links they were (no button, no back). Every other section is simply there.
