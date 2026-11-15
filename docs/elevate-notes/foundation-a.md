# Elevate notes: foundation-a

The shared pieces every page agent builds on. Each is a small module in `src/scripts/`, imported once from `BaseLayout.astro` after `kit.js`, with its styles in `src/styles/elevate.css` (imported straight after `kit.css`). Page agents use them by attribute and should not rebuild them.

Read the part you need. The last two sections are text for the lead to fold into `DESIGN.md` and `.claude/rules/`.

## Quick reference

| You want                                   | Write                                                         | Module        |
| ------------------------------------------ | ------------------------------------------------------------- | ------------- |
| A figure that rolls once as it arrives     | `data-roll` on the element that holds only the text           | `roll.js`     |
| A figure that rolls when script changes it | `ui.roll(el, 'new text')`                                     | `roll.js`     |
| A heading whose lines rise                 | nothing for an `h2` in `<main>`; `data-rise` on an `h3`       | `rise.js`     |
| A heading that must not rise               | `data-rise="off"`                                             | `rise.js`     |
| A word beside the mouse                    | `data-cursor="Open"`                                          | `cursor.js`   |
| Grain on a surface that is not a `.card`   | class `paper`                                                 | `elevate.css` |
| A highlight that follows the mouse         | `data-sheen` (or `ui.sheen(el)` for late markup)              | `light.js`    |
| The hour's light in a shadow               | `var(--lean)`, `var(--sun-x)`, `var(--sun-y)`                 | `light.js`    |
| The time in Cincinnati                     | `<span data-cincy hidden>... <span data-cincy-time /></span>` | `light.js`    |
| A sound or haptic as something lands       | `ui.cue('tick')` (a no-op until foundation-b lands)           | `kit.js`      |

`ui` is the object exported by `src/scripts/kit.js`. `ui.roll` and `ui.sheen` are added by their modules. In the built page the order is component scripts, then the layout's script (`kit.js` and the shared modules), then the page's own script, so a page script can call them directly. A component script can run before them: `kit.js` carries plain stand-ins for that case (`ui.roll` sets the text, `ui.sheen` does nothing), so calling either is always safe, and anything called from an event handler gets the real one.

## data-roll and ui.roll (`src/scripts/roll.js`)

Each digit is its own column, clipped to one em, and a change slides the old digit out and the new one in. Commas, dollar signs and letters stay still. A figure is never counted through the values in between.

- **`data-roll`**: put it on the innermost element whose only content is the figure's text (`<strong data-roll>$4,500</strong>`, `<td data-roll>`). The text in the HTML is the real, final value. It rolls once, in place, the first time it comes on screen, and only if its top was below the fold when the page loaded. On the first screen, on a page that loaded already scrolled, and under reduced motion it is left alone.
- **`ui.roll(el, text, opts)`**: sets `el`'s text to `text` with a roll. `el` must hold text only: its children are replaced.
  - `opts.from`: the text to roll away from, when the old figure lived in a different element (the cost bars swap whole elements).
  - `opts.delay`: milliseconds to wait before the digits move.
  - `opts.still: true`: set the text with no roll, and stop a roll that is running. Use it for the non-animated path so a running roll cannot write an old value back.
  - `ui.roll(el)` with no text rolls the current value in place.
- **Mixed text works**: "26 to 41", "$4,208 over 1 year", "About 60%". The numbers in the old and new text are paired off in order and each pair is lined up from the right. Text with no digit is simply swapped.
- **Direction**: up when the first number grew or stayed the same, down when it shrank.
- **Screen readers and tests**: `el.textContent` is the plain new value at every moment, never doubled. While the digits move the value sits in a visually hidden span (`.roll-sr`) and the moving cells are `aria-hidden` and hold no text (CSS draws their glyphs from `data-n` and `data-o`). When the roll ends the element is one plain text node again. A roll lasts about 0.6s.
- **Width**: every `[data-roll]` is set in tabular figures. An element you only ever pass to `ui.roll` should set `font-variant-numeric: tabular-nums` itself, or carry `data-roll`.
- **Reduced motion, or no Web Animations**: the text is swapped.

Where it is used now: the live receipt's amounts (`prices.js`), the cost bars' totals when the years change, every cell of the five-year cost table, the pressed filter chip's count on /work and /journal (`seg-bar.js`, inside `bloom`), the home `.proof` figures, the What changed figures (`WorkFigures.astro`), and the journal `PostReceipt` amounts.

## data-rise (`src/scripts/rise.js`)

The lines of a heading rise out of a mask as it arrives, one line a beat (80ms) after the last, each rise 0.8s on `--ease`.

- **Automatic** for every `<h2>` inside `<main>`. Add `data-rise` to an `h3` to give it the same. `data-rise="off"` opts a heading out.
- **Only below the fold**: a heading is touched only if its top is below the fold when the page loads. Never a page-head H1, a `.giant`, a `[data-build]` line, or anything on the first screen.
- **Left alone**: a heading inside a `dialog`, a `[popover]`, a `form`, a `summary` or `button` (the label of a control), a live region or `[hidden]`; one inside a `.rv` block (study.js already reveals those); one that already holds `.w`, `.bw` or `[data-roll]`; and one that is not laid out at load (folded away on a phone).
- **Nothing shifts**: before wrapping, the module records which line every word is on as plain text, and the wrapped heading has to match it exactly (a hyphenated word is split at its hyphen so it can still break there). A heading that would not match is left alone and simply does not rise. Measured on 20 routes at 1440, 820 and 390: every wrapped heading matched.
- **Lines are real lines**: words are grouped by where they actually fall, measured as the heading arrives and again if the window is resized part way up.
- **If your script rewrites a heading** that is still waiting, the module lets go of it at once and it shows as plain text. Nothing to do on your side.
- **Clean afterwards**: while it waits the heading carries its plain sentence as `aria-label`; once risen the word wrappers and that label are removed, so it ends as the markup it started as.
- **Off**: no script, reduced motion, a page that loaded scrolled (`ui.restored()`), and print (wrappers are taken out on `beforeprint`).
- `ui.words(el, cls)` in `kit.js` is the shared splitter (`data-build` uses it with `bw`, this with `rw`).

## Light and paper

- **Grain** (`--grain`, `--grain-ink` in `elevate.css`): a 180px tile of SVG noise from a data URI, very faint, dark specks on the light side and light specks on the dark side. `.card` and `.pc-face` have it already (`kit.css`), and so does a `.tile`'s chrome. For any other surface add class **`paper`**: it only sets `background-image`, so the surface keeps its colour. A rule that sets the `background` shorthand after it wipes the grain; set `background-color` instead. Surfaces that keep light tokens on the dark side (`.end`, `.band`, `.sheet`, `.study`) take the dark-speck grain there. Off in forced colors and print.
- **`data-sheen`**: a soft pool of white light follows the mouse across the element (a `::after`, so the element needs `position: relative` or `absolute`, round corners need `overflow: hidden` or `clip`, and its own `::after` must be free). Every `Tile` has it. It runs through `ui.stillHover`, so a card that lifts cannot shake it off. Mouse only, never loops, decoration only, off under reduced motion and forced colors. Markup added after load: call `ui.sheen(el)`.
- **Progressive blur** (`.pblur`): the page softens over the bottom 5rem of the screen, under the dock, and over the top 5rem while the top line's pills float. Three stacked `backdrop-filter` layers (1px, 2.5px, 4px), each masked to the part nearer the edge. The markup is in `Dock.astro` and `TopLine.astro`, as siblings of the nav and the header, never children: the dock holds `view-transition-name: dock`, and a backdrop-filter inside a named element blurs nothing. Nothing above a `.pblur` may take `opacity`, `filter` or `mask`, which is why the top one slides in instead of fading. It never takes a click (`pointer-events: none`). **A fixed element you add near the bottom or top edge should sit above `z-index: 38` (bottom) or `29` (top), or it will be blurred.**

## Cincinnati light (`src/scripts/light.js`)

- **`--sun-x`, `--sun-y`** on `<html>`, unitless, from the hour in `America/New_York`. `--sun-x` runs -1 (light from the left, 6 AM) through 0 (noon and midnight) to 1 (6 PM). `--sun-y` is 1 at noon and falls to 0.35 at night. Defaults with no script: 0 and 0.5.
- **`--lean`**: `calc(var(--sun-x) * -6px)`, the sideways offset of a shadow, never more than 6px. `.card`'s shadow uses it, and its drop runs from 18px at noon to about 23px at night (22px with no script, as before). On the dark side the lit top edge in `--rim` leans one pixel toward the light.
- For a big new surface, write the shadow as `var(--lean, 0px) 22px 40px -28px rgba(...)`. Never required.
- **The time**: any element with `data-cincy` that contains a `data-cincy-time` gets the time written in ("3:42 PM") and its `hidden` removed, then kept right each minute (one timer a minute, set again when the tab comes back). Author it `hidden`, so with no script the place name stands alone. It is in the closing's top row ("Cincinnati, OH · 3:42 PM") and in the status card ("3:42 PM in Cincinnati").

## data-cursor (`src/scripts/cursor.js`)

A small pill in the label voice (`--ink` on `--card`, `aria-hidden`, never takes a click) follows the mouse over anything that carries `data-cursor="Word"`. The system cursor stays.

- Keep the word to one or two short words: Open, Play, Drag, Read, New tab, Turn.
- Over a `button`, a `.chip`, `[role="button"]` or a submit input that carries it, the pill leaves the pointer and sits centred on the control's top edge (under it when there is no room above).
- `data-cursor=""` switches it off for that element and everything inside it.
- Given automatically, so do not add these by hand: `a[target="_blank"]` (New tab), `[data-clip]` (Play), `[data-ba] .ba-f` and `[data-table] [data-stage]` (Drag), `[data-otc-turn]`, `[data-otc-back]`, `[data-lab-turn]` (Turn). `Tile.astro` writes Open on every window. A new selector that is the same on every page goes in the `AUTO` list at the top of `cursor.js`.
- Only on `(hover: hover) and (pointer: fine)`. It hides on scroll, on a key press, when the window loses focus and when the pointer leaves the page. Under reduced motion it is placed with no spring.
- Known limit: it is not in the top layer, so it does not show over an open `<dialog>` (the client sheet) or a popover.

## Blueprint first load (`src/scripts/blueprint.js`)

Once per browser session, on the first page only, the page shows for 850ms as a print in the studio's cobalt with a hairline box and four square anchor points round each main block on the first screen and a few long guides, then resolves on `--ease`.

- The content is never hidden. Two full-screen layers (`html.bp body::before` and `::after`) only blend with the page under them (`mix-blend-mode: color`, then `screen`; the dark side uses the first alone, in `--card`'s hue). They are CSS only, so they are in the first paint and finish by themselves. The line work is added by the module from real element positions.
- `pointer-events: none` throughout. A wheel, touch move or key press removes the lines at once.
- The decision is an inline script in the `<head>` of `BaseLayout.astro` (sessionStorage key `ncs-bp`). It stands down for reduced motion, a reload, Back or forward, a prerendered page, a tab opened in the background, and every later page of the visit.
- **Page agents**: `body::before` and `body::after` are taken for this. In a Playwright test that looks at pixels in the first second of a fresh context, set `sessionStorage['ncs-bp'] = '1'` in an init script, or use reduced motion.

## A price card grows into its tier (`src/scripts/price-morph.js`)

Following a card in the price hand (`a.pc-face` to `/services/#launch` and so on) carries that card into its tier with the view-transition name `tier-card`. The card takes the name in `pageswap`; on Prices an inline `<head>` script reads the sessionStorage note `ncs-tier-morph`, holds the first paint until the tier is parsed (`<link rel="expect" blocking="render">`), names `#<tier> .t-card` in `pagereveal`, and takes the name off when the transition ends. `html.tier-morph` tells `prices.js` to lay the tiers out at once on that arrival instead of dealing them. The dock's price hand does not morph (it sits inside the named dock).

## Smaller things

- **`ui.cue(name)`** is a no-op in `kit.js` so callers are safe. foundation-b replaces it. The receipt calls `ui.cue('tick')` when its digits roll.
- **Email pill**: a `mailto:` link whose visible words are the address copies it on click and says "Copied" for two seconds (a tick ahead of the word on a `.chip`), holding its width and keeping the address as its accessible name; a polite live region says "Copied my email address". The mailto still fires and the no-mail-app toast still shows, without copying twice. No attribute needed: it is every mailto link that shows its address, so the closing, the status card and /contact all have it. A link that says "Email me" is unchanged.
- **Window placeholder**: a `.tile`'s screen shows the client's paper under a bar of their colour until its picture paints.
- **Scrollbars**: thin, `--field-edge` on `--ground`, both sides. A class that hides a scrollbar still wins.
- **Giant lines**: `text-box: trim-start cap alphabetic` where supported, so the box starts at the capitals' top (about a tenth of the type size less space above). The foot is not trimmed.
- **Tabular figures** on prices and figures everywhere except the giant `.from-num`.
- **`.vh`** (visually hidden) is now defined globally in `elevate.css`.
- **Dock**: the Work hand's caption spells the real study count with `countWord()`.

## Shared files touched

`src/styles/kit.css` (`.card` background split into colour and grain, its shadow leaning; `.pc-face` grain; dark `--rim` lean), `src/scripts/kit.js` (`ui.cue`, `ui.words`), `src/layouts/BaseLayout.astro` (the stylesheet, the head script, six module imports), `Dock.astro`, `Closing.astro`, `TopLine.astro`, `Tile.astro`. Outside my list, a few additive lines each: `src/scripts/prices.js` (receipt and bars roll, the reprint rule, `morphIn`), `src/scripts/seg-bar.js` (chip count roll), `src/pages/services.astro` (`data-roll` on cost cells), `src/pages/index.astro` (`data-roll` on `.proof strong`), `WorkFigures.astro`, `PostReceipt.astro`, `src/scripts/mailto-fallback.ts`.

## For DESIGN.md section 7 (one bullet a moving thing, with its reduced-motion answer)

- **Figures roll.** A figure that changes, or that arrives from below the fold, rolls digit by digit: each digit is a one-em column and the new digit slides in as the old one leaves, about half a second with a small overshoot, left to right. Commas and words stay still, and a figure is never counted through the values between. The receipt's amounts, the cost bars' totals, the cost table, the pressed filter chip's count, the home proof row, What changed and the journal receipt all use it (`ui.roll`, `data-roll`, `roll.js`). Reduced motion: the text is swapped.
- **The receipt prints, and its numbers roll.** Replaces the sentence "The numbers are swapped as text, never counted": the receipt still prints whole the first time it comes on screen, and reprints from the first changed line when the tier or the plan changes, with each amount rolling as its line comes out. Moving only the years leaves the paper out and rolls the amounts in place. Still never counted. Reduced motion: unchanged (a brief tint, no feed, plain text).
- **Section headings rise.** A section `h2` that starts below the fold rises out of a mask line by line as it arrives, 0.8s on the house ease, a line 80ms after the one above (`rise.js`; `data-rise` adds an `h3`, `data-rise="off"` opts out). Page-head H1s, giant lines and the first screen never do. Reduced motion, a page that loaded scrolled, no script and print: the heading is simply set.
- **The page sits under one light.** Cards carry a faint grain, and their shadow leans a few pixels (never more than 6) away from where the sun is this hour in Cincinnati; on the dark side the lit edge leans a pixel toward it (`--sun-x`, `--sun-y`, `--lean`, `light.js`). The closing and the status card show the local time, kept right each minute. This is a slow change of state, not an animation, so reduced motion keeps it. No script: the light is overhead and the place name stands alone.
- **A sheen follows the mouse** across a client window (`data-sheen`): a soft pool of light, through `ui.stillHover`, never looping. Mouse only. Reduced motion and forced colors: none.
- **The page softens under the chrome.** Content blurs progressively as it passes under the dock and under the floating top line (`.pblur`, three masked backdrop-filter layers outside the dock). Static, so reduced motion keeps it; the top one arrives with no slide. Forced colors and print: none.
- **The cursor has a caption.** On a mouse, a small label pill follows the pointer on a spring over anything with `data-cursor` and sits on the top edge of a button that carries it; the system cursor stays (`cursor.js`). Touch never sees it. Reduced motion: it is placed with no spring.
- **The first load is a drawing.** Once per browser session, the first page reads for 850ms as a cobalt print with construction lines and square anchor points on its main blocks, then resolves on the house ease. The content is painted at full opacity underneath throughout and nothing blocks a click or a key (`blueprint.js`, `html.bp`). Reduced motion, a reload, Back, a prerender, a background tab and every later page: none.
- **A price card grows into its tier.** Following a card in the price hand to /services/, the card grows into the tier it names on a short spring, and the tiers are laid out without their deal for that arrival (`price-morph.js`, the name `tier-card`). Reduced motion: no view transition at all, so the page simply changes.
- **The email pill answers.** A click copies the address and the pill says "Copied" with a tick for two seconds, at the same width. No motion, so nothing to stand down.

Also for section 3 (Big lines): "`.giant` trims the top of its box to the capitals where the browser has `text-box`, so space above a giant line is the space you set." For section 2 or 5: "Cards carry `--grain`; a new card surface that is not `.card` takes class `paper`."

## For `.claude/rules/`

- **styling.md, The files**: add `src/styles/elevate.css` as a fourth shared file beside `kit.css` (rolling digits, rising headings, grain, sheen, progressive blur, cursor label, first load, tier morph), imported by `BaseLayout.astro` after `kit.css`.
- **styling.md, Tokens**: add `--sun-x`, `--sun-y`, `--lean`, `--grain`, `--grain-ink`, `--bp-dur`.
- **styling.md, Patterns to reuse**: "A figure: `data-roll` for one that arrives, `ui.roll(el, text)` for one that changes. Section `h2`s rise on their own; `data-rise` on an `h3`, `data-rise="off"` to opt out. `data-cursor="Word"` for the pointer caption, `data-sheen` for the pointer highlight, `.paper` for grain."
- **styling.md, Motion**: "`study-hero` is no longer the only borrowed name: `tier-card` goes from a price card to its tier (`price-morph.js`), by the same lend-and-return rule." And: "`body::before` and `body::after` belong to the first-load drawing (`html.bp`)."
- **styling.md, Fixed elements**: "`.pblur` layers sit at `z-index` 38 (bottom) and 29 (top) with `pointer-events: none`; a new fixed element at an edge goes above them. Never put a `backdrop-filter` inside the dock or give a `.pblur` ancestor an opacity, filter or mask."
- **styling.md, Forced colors and print**: "Forced colors keep background images, so `elevate.css` switches the grain, the blur, the sheen and the drawing off by hand; a new decorative background image joins that block."
- **components.md, The chrome**: `Tile` now carries `data-sheen` and `data-cursor="Open"`; `Closing` and `TopLine` carry a `[data-cincy]` time; `Dock` and `TopLine` each render a `.pblur` sibling.
- **homepage-and-pages.md, How a page is built**: "Scripts run in this order: `kit.js`, the shared modules (`blueprint`, `roll`, `rise`, `light`, `cursor`, `price-morph`), then the page's own script, so `ui.roll` and `ui.sheen` are always there."
- **CLAUDE.md never-break rule 7** ends "Numbers and prices are plain static text." Suggested: "Numbers and prices are plain static text in the HTML; `ui.roll` only moves digits and leaves the same text behind."
- **accessibility.md, Motion**: add the rolling digits, rising headings, sheen, cursor label and first-load drawing to the list of things that stand down under reduced motion.
- **content.md, mailto**: "A mailto link that shows its address also copies on click and says Copied; the fallback toast is unchanged."
