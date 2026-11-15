# Elevate notes: page-prices

What the `feat/elevate-prices` branch added to /services/ (nav label Prices) and the dock, written
for the lead to fold into `DESIGN.md` and `.claude/rules/*`. No price, range, claim or sentence of
copy changed; every number still comes from `src/data/pricing.ts`.

## Where things live

| File                              | What it is                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/lib/tier-pick.ts` (+ test)   | The three questions, `suggestTier()`, `whyLine()`, `pickTiers()`. Moved out of `prices.js` |
| `src/scripts/prices-plan.js`      | Your plan, everywhere: `setPlan()`, `onPlan()`, `planFromUrl()`, the `yours` marking       |
| `src/scripts/prices-turn.js`      | The tier cards turn over (a small copy of the Off the clock turn)                          |
| `src/scripts/prices-chapters.js`  | The sticky chapter bar: pill, progress line, current link kept in view                     |
| `src/scripts/prices-steps.js`     | How it works as a pinned drawing from 62rem                                                |
| `src/components/TierPicker.astro` | `part="card"`: the opener in the dock's Prices hand; `part="panel"`: the corner card       |
| `src/scripts/tier-picker.js`      | The corner card's questions, one at a time                                                 |
| `src/styles/tier-picker.css`      | Its styles (imported by the component, so on every page)                                   |

## Shared files touched (every added line)

- `src/scripts/kit.js`: `.jump` joins the `topBar` selector (`'.dw-bar, .toc, .jump'`), so the
  floating top-line pill stands down on /services while the chapter bar holds the top.
- `src/scripts/seg-bar.js`: `setPill()` also finds `a[aria-current]`, not only a pressed button.
- `src/components/Dock.astro`: `import TierPicker from './TierPicker.astro';` and
  `<TierPicker part="card" />` as the last card in the Prices hand.
- `src/layouts/BaseLayout.astro`: `import TierPicker from '../components/TierPicker.astro';` and
  `<TierPicker />` right after `<Dock />`, outside `<main>` (see the view-transition gotcha).
- `tests/chrome.spec.ts`: "opened from the floating pill far down a page" now scrolls /about, not
  /services, because /services has its own sticky bar and the pill stays off it by design.
- `tests/page-weight.config.json`: `/services` gets `maxHtmlKb: 168` with its `_why` (153.2 KB).

## For DESIGN.md section 7 (motion), one bullet each, with the reduced-motion answer

- **Chapters on a second ground.** Every other section on /services sits on a quiet full-bleed
  band (class `alt`). Static. Reduced motion: nothing to answer.
- **The chapter bar.** The row of chapter links under the first screen sticks under the top once
  passed (not on a screen under 30rem tall). The blue pill from the /work filter slides to the
  chapter you are in (`aria-current="location"`) and a hairline along the foot fills with how far
  through the page you are. Under 80rem the row scrolls sideways and the current link is kept in
  view. Only moves when the page scrolls. Reduced motion: the pill jumps and the row scrolls without
  easing. No script: a plain sticky row of links.
- **Tier cards turn.** "Turn over" turns a card on About's Off the clock turn: front is name, who
  it fits, price and range, the buttons; back is what I take responsibility for, If you ever move
  on, what's included, and "Turn back". The face turned away is inert; focus goes to the back and
  returns to the button; `ui.cue('turn')`. Three across, both faces share one height so nothing
  jumps; one to a row, the card is as tall as the face showing and the height eases. Reduced motion:
  the faces swap with no turn. No script and print: one open card, exactly as before.
- **Your plan, everywhere.** A tier or plan picked in the receipt, a cost row's "Show on the
  receipt", the three questions, "How soon you hear back", a plan name at the head of the care table
  (a real button once script runs), or `?tier=`/`?plan=` in the address marks the tier card, its
  cost row and the plan's care column (its card on a phone) with a "Your pick" tag plus the blue,
  never colour alone. Kept in the address with `replaceState`. Nothing is marked until the visitor
  chooses. No motion to answer.
- **Care table.** Header row sticks under the chapter bar from 64rem; the column under the pointer
  or holding focus lifts to `--card`; the picked column keeps it between two blue rules. Reduced
  motion: no background transition.
- **How it works, pinned.** From 62rem with script and motion allowed, the four steps are a ruled
  list on the left and one drawing (the four step icons at four times their size, joined by a
  hairline) stays beside them; as each step is read its stretch of line runs to its icon and the
  icon draws, on a spring, undrawing on the way back up. Reduced motion, under 62rem, and no script:
  the four cards, as before.
- **The tier picker from anywhere.** The dock's Prices hand has a fourth card, "Which tier fits?",
  that raises a corner card above the dock on any page: the three questions from /services one at
  a time (a pointer's pick moves on by itself; a keyboard chooses with the arrows and moves on with
  Next or Enter), then the suggested tier in its price-card face with "Why:" and "See it on
  Prices" (`/services/?tier=<name>#<name>`). The card rises on the house spring; questions slide in
  from the side they come from; the answer is dealt with `ui.cue('deal')`. Escape, the close button
  or a press outside puts it away and focus returns to the dock's Prices link. Reduced motion: it
  simply appears and the questions swap in place. No script: neither part shows; /services has the
  same questions in the page. A phone never opens the hands, so it gets the questions on /services.

## Page-rule lines (`.claude/rules/homepage-and-pages.md`, the /services part)

- The tier picker's rule lives in `src/lib/tier-pick.ts`; /services and the dock's corner card
  both read it. Change it there, never in a page script.
- Which tier and plan the visitor picked lives only in `prices-plan.js`; anything that lets them
  pick calls `setPlan()`, anything that shows it listens with `onPlan()`. Markers are
  `data-yours-tier`, `data-yours-plan`, `data-row-tier`/`data-row-plan` and a hidden
  `[data-yours-tag]` in the markup.
- `.jump .jump-row` is written with the parent on purpose: `seg-bar.css` loads after `prices.css`
  and its `.dw-seg { flex-wrap: wrap }` would otherwise win and stack the bar five rows deep on a
  phone.
- Tier card faces: `.t-turn` and `.t-face` are `display: contents` with no script and in print;
  keep anything new on a card inside a face.
