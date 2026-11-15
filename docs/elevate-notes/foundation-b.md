# Elevate notes: foundation-b

What this branch (`feat/elevate-b`) added, written so the lead can fold it into `DESIGN.md`,
`.claude/rules/*` and `CLAUDE.md`. Five global features, all in new files, all loaded by one tag
in `BaseLayout.astro` (`<SiteTools />`).

## Where things live

| File                               | What it is                                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/components/SiteTools.astro`   | The one tag for the layout: the palette dialog, the Speculation Rules, the stylesheet, the four scripts   |
| `src/styles/elevate-b.css`         | Styles for the previews, the sound switch, the palette and its buttons, the sheet's grip                  |
| `src/pages/peek.json.ts`           | `/peek.json`, written at build: clients, the three prices, journal posts, pages, sector pages             |
| `src/scripts/peek-data.js`         | The one fetch of `/peek.json`, on first use, shared by the previews and the palette                       |
| `src/scripts/peek.js`              | Previews on links                                                                                         |
| `src/scripts/sound.js`             | `cue(name)`, installed as `ui.cue`; `setSound()`, `soundOn()`; the switches                               |
| `src/components/SoundSwitch.astro` | The switch: `where="end"` (closing fine print) or `where="dock"` (a card in the dock's theme hand)        |
| `src/components/Palette.astro`     | The command palette's `<dialog>`                                                                          |
| `src/components/PaletteOpen.astro` | The "Search" button with its key hint: `where="end"` (closing index) or `where="reach"` (top line's card) |
| `src/scripts/palette.js`           | The palette: rows, the match, the keys                                                                    |
| `src/scripts/sheet-drag.js`        | Drag to dismiss on the client sheet, touch only                                                           |

## Shared files touched (every added line)

- `src/layouts/BaseLayout.astro`: `import SiteTools from '../components/SiteTools.astro';` and
  `<SiteTools />` after `<ClientSheet />`.
- `src/components/Closing.astro`: `import SoundSwitch from './SoundSwitch.astro';`,
  `import PaletteOpen from './PaletteOpen.astro';`, `<PaletteOpen where="end" />` at the end of the
  "The studio" column, `<SoundSwitch where="end" />` after `<ThemeFlip where="end" />`.
- `src/components/TopLine.astro`: `import PaletteOpen from './PaletteOpen.astro';` and
  `<PaletteOpen where="reach" />` after the card's "Start a project" chip.
- `src/components/Dock.astro`: `import SoundSwitch from './SoundSwitch.astro';` and
  `<SoundSwitch where="dock" />` as the last child of the theme hand.
- `src/scripts/kit.js`, four one-line cues, each guarded with `if (ui.cue)`: in `puckGo`
  (`tick`, 0.12s later, when the puck is sent to a new link), `handShow` (`deal`), `ui.openSheet`
  (`open`), `shutSheet` (`close`).
- `kit.css`: not touched.

Cue lines in page scripts (not on the shared list, one or two lines each): `theme.js` (`turn`, with
an import), `seg-bar.js` (`tick` on any `.dw-seg button`, with an import and one listener),
`prices.js` (`print` in `print()`, `deal` when the stub tears), `contact.js` (`stamp` as the stamp
lands), `off-the-clock.js` (`turn`, with an import), `journal.js` (`deal` in `move()`),
`photo-table.js` (`open` as a print opens).

## For DESIGN.md section 6 (Components)

- **Previews on names** (`peek.js`, `.peek` in `elevate-b.css`). A link to a case study, to
  `/services/` or to a journal post raises a small card beside it for a mouse (after about 150ms) or
  keyboard focus: the client's phone page in their colour with name, sector, the one-line `outcome`
  and host; the three starting prices as ruled rows with the date they hold; or a post's cluster,
  title and reading time. It is automatic by href. `data-peek="off"` on a link or anything round it
  opts out, and these are skipped already: a `.tile`, anything in the dock, the client sheet, the
  palette, a price card (`.pc-face`, `.post-endcard`), Up next (`.next`), the closing's selected
  work (`[data-pull]`), About's map (`.cm`), the /work list (`.dw-rows`), the journal index
  (`[data-jx]`), a link in the same `li`, `article` or `figure` as that client's own window, and a
  link to the page you are on. One element for the whole page, `aria-hidden`, a manual `popover`,
  placed with CSS anchor positioning (`position-try-fallbacks` keeps it on screen: over the link,
  then to one side, then under it) with a JS position fallback. Never under the pointer; the pointer
  can cross onto it (WCAG 1.4.13) and a click on it follows the link. Escape, leaving, blur, a
  press, or the link scrolling off screen puts it away. Off on touch and under 48rem. Data is
  `/peek.json`, fetched on first use; the picture is the 320px still, fetched only when shown. A
  client's colour appears only round their own page in the card.
- **Sound, off until asked** (`sound.js`, `SoundSwitch.astro`). Synthesised cues through one quiet
  gain: `deal`, `tick`, `turn`, `print`, `stamp`, `toggle`, `open`, `close`. OFF by default. The
  switch says "Sound off" or "Sound on" (`aria-pressed`), in the closing's fine print under the
  light and dark switch and as a third card in the dock's theme hand; the choice is kept in
  `localStorage` (`ncs-sound`). The AudioContext is made on the click that turns it on, or on a
  later page's first press or key, never at load. On Android, `tick`, `turn` and `stamp` also give
  a few milliseconds of `navigator.vibrate`, only with sound on or straight after a touch.
  `ui.cue(name, delaySeconds?)` is safe to call anywhere.
- **Command palette** (`Palette.astro`, `palette.js`). Ctrl+K, Cmd+K or `/` opens a native
  `<dialog>`: a card lettered K in two corners with hairline rows. Type to filter pages, the case
  studies, sector pages, the three prices, journal posts and actions (Start a project, Copy email,
  Text me, Turn the page over, Sound on or off, Show me a random one). Arrows, Enter, Escape; every
  row is a real link or button. The keyboard stays in the text field (combobox with
  `aria-activedescendant`), results are grouped under label-voice headings, and a live region says
  how many. Also opened by a "Search" button with a key hint in the closing's site index and in the
  top line's card (`PaletteOpen.astro`). The `/` key has a switch at the foot of the card
  (`ncs-slash` in `localStorage`), because a one-key shortcut must be able to be turned off (WCAG
  2.1.4). Rows come from `/peek.json`.
- **Client sheet, drag to dismiss** (`sheet-drag.js`). Touch only: from the top of the open sheet,
  a downward pull past a third of its height, or a flick, closes it; short of that it springs back.
  A small grip at the top says so. It presses the sheet's own Back button, so history and focus
  behave exactly as before, and nothing requires the drag (WCAG 2.5.7).
- **Speculation Rules** (`SiteTools.astro`). One inline `<script type="speculationrules">`:
  prefetch (never prerender) same-site document links at `moderate` eagerness, leaving out `/api/`,
  any address with a query string, files, and new-tab or nofollow links.

## For DESIGN.md section 7 (Motion), one bullet per moving thing

- **A name deals its window.** A link preview comes up on the house bounce from a little low,
  small and turned three degrees, like a card dealt up beside the link, and goes more quickly than
  it came. The client's phone in it leans three degrees. _Reduced motion:_ it simply appears and
  goes, no transform, no transition.
- **The palette drops in.** The card arrives from a little above, small and turned two degrees, on
  the house bounce (`@starting-style`), while the page dims behind it (plain shade, no blur); it
  leaves in under 200ms. _Reduced motion:_ it appears and goes with no transition.
- **The sound card's bars stand up.** In the dock's theme hand, five bars spring from flat to
  their heights when sound is switched on. They never loop. _Reduced motion:_ they are simply
  standing or flat.
- **The sheet follows a finger.** On touch the open sheet moves with a downward pull and its top
  corners round off; let go and the offset springs back to nothing (`ui.spring`), while the sheet
  either stays or shrinks home into its window as it always has. _Reduced motion:_ the sheet still
  follows the finger (the visitor's own movement), then closes or returns at once with no spring.
- **Sound** is not motion, but it follows the same care: nothing plays unless the visitor switched
  it on, so it needs no reduced-motion rule of its own. Haptics can fire with sound off (after a
  touch on Android), so they are off under reduced motion.

Add to the "Reduced motion stands everything down" paragraph: a link preview and the command
palette simply appear, the sound card's bars do not spring, the client sheet returns or closes with
no spring after a drag, and no haptic fires.

## For `.claude/rules/styling.md`

- `src/styles/elevate-b.css` is imported once by `SiteTools.astro` and holds the previews (`.peek`),
  the palette (`.pal`, `.pal-open`), the sound switch (`.snd`, `.fc-snd`) and the sheet's grip. It
  adds no token and no hex beyond `#fff` on `--fill` (the same pair as `.chip.go`).
- New top-layer surfaces: `.peek` (popover) and `dialog.pal.card`. Both start their shadow with
  `var(--rim)` and both have a `forced-colors` border in `elevate-b.css` (they are not in the
  `kit.css` list, so that file stayed untouched; the lead may move them there).
- `dialog.pal.card` is written with that specificity on purpose: `.keyed` sets
  `position: relative` later in `kit.css`, which would pull a dialog out of place.
- The client sheet takes an inline `transform` while a finger drags it, and the class `dragging`.

## For `.claude/rules/components.md` and `homepage-and-pages.md`

- The chrome gains `SiteTools` (after `ClientSheet` in `BaseLayout`). `Closing` renders
  `PaletteOpen` and `SoundSwitch`; `TopLine` renders `PaletteOpen`; `Dock` renders `SoundSwitch`.
- Page scripts play a cue with `ui.cue('name')` at the moment a thing lands. It is a no-op with
  sound off. Do not build a link preview on a page: `peek.js` does it by href.
- A new page that should be findable in the palette goes in the `pages` list in
  `src/pages/peek.json.ts` (case studies, sector pages, prices and posts are read from their
  sources and need nothing).
- A link that already shows its own preview, or sits beside the thing it links to, takes
  `data-peek="off"`.

## For `.claude/rules/accessibility.md`

- 1.4.13 Content on Hover or Focus: the link preview is dismissable (Escape), hoverable (the
  pointer can move onto it) and persistent (it stays until the pointer or focus leaves). It is
  `aria-hidden` because it repeats what the link opens.
- 2.1.4 Character Key Shortcuts: `/` opens the palette only when focus is not in a field, and the
  palette's foot has a switch that turns it off. Ctrl+K and Cmd+K use a modifier and are exempt.
- 2.5.7 Dragging Movements: the sheet's drag has the Back button, Escape and the browser's Back as
  single-press ways to do the same.
- 1.4.2 Audio Control does not apply (nothing plays for more than three seconds and nothing plays
  unasked), and the switch is there anyway.

## For `CLAUDE.md` / docs the lead owns

- Colophon and Privacy: sound and the palette store two small choices on the device
  (`ncs-sound`, `ncs-slash`), next to the existing `ncs-theme`. If the Privacy page lists what is
  kept in `localStorage`, these two join it. I did not edit those pages.
- `astro.config.mjs` already has `prefetch: { prefetchAll: true, defaultStrategy: 'hover' }`. In
  Chrome and Edge the Speculation Rules now do the same job at the browser level, so a hovered link
  can be asked for twice (Astro's `<link rel="prefetch">` and the browser's own prefetch). Astro's
  stays useful for Safari and Firefox. The lead may want to leave both, or switch Astro's off where
  `HTMLScriptElement.supports('speculationrules')` is true. I did not touch the config.
- The CSP in `public/_headers` is report-only and hashes inline scripts at build
  (`scripts/write-csp.mjs`); the speculation rules script is hashed like any other inline script.
  If the policy is ever enforced, Chrome also accepts `'inline-speculation-rules'` in `script-src`.

## Weight, measured on the build

- Script: every page gains about 16 KB (13 KB for the four modules in one chunk, 3 KB for
  `sound.js`, which page scripts share). No budget in `tests/page-weight.config.json` had to rise.
- CSS: `elevate-b.css` ships as its own 8.6 KB stylesheet beside `kit.css` on every page, so one
  more small render-blocking request. Folding the file into `kit.css` after the merge removes it.
- `/peek.json` is 5.7 KB and is fetched only when a preview is first reached for or the palette is
  first opened. A preview's picture is one 320px webp, fetched when that preview shows.
- Nothing was added to any page's images at load.
