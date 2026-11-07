---
name: Nixon Creative Studio
description: A calm neutral page, one studio blue, and a deck of client phones. Every other color belongs to a client and stays inside their own window. One typeface, one light theme, and motion that moves with weight.
colors:
  ground: '#f5f5f3'
  ink: '#121211'
  soft: '#5c5c57'
  card: '#ffffff'
  line: 'rgba(18, 18, 17, 0.1)'
  accent: '#2f3fe6'
  accent-soft: '#dde1ff'
typography:
  display:
    fontFamily: "'Hanken Grotesk', system-ui, sans-serif"
    fontWeight: 500
    letterSpacing: '-0.04em'
    lineHeight: 1
  emphasis:
    fontWeight: 700
  body:
    fontFamily: "'Hanken Grotesk', system-ui, sans-serif"
    fontSize: '1.0625rem'
    lineHeight: 1.45
  label:
    fontSize: '0.8125rem'
    fontWeight: 500
    letterSpacing: '0.07em'
    textTransform: uppercase
  giant:
    fontWeight: 700
    letterSpacing: '-0.055em'
    lineHeight: 0.92
rounded:
  card: '1.25rem'
  band: '1.75rem'
  pill: '99rem'
spacing:
  gut: 'clamp(1.25rem, 4vw, 4rem)'
components:
  chip:
    backgroundColor: '#ffffff'
    textColor: '#111111'
    rounded: '{rounded.pill}'
    height: '48px'
  chip-go:
    backgroundColor: '{colors.accent}'
    textColor: '#ffffff'
  closing:
    backgroundColor: '{colors.accent}'
    textColor: '#ffffff'
    rounded: '{rounded.band}'
---

# Design System: Nixon Creative Studio

The tokens live in `:root` at the top of `src/styles/kit.css`, and the CSS wins if this file and the code disagree. Strategy, audience and voice are in `PRODUCT.md`. The mock this design came from is the "Deal" section of the motion lab's README (`ncs-wall/lab/README.md`).

## 1. Overview

**The idea: a calm page, and a deck of real client sites.** The page is a quiet neutral so that the work can be loud. Each client brings one rich color inside a phone window, and everything that moves, moves with a little weight, like a card being dealt. The studio itself owns exactly one color, a blue, and uses it sparingly.

- **One typeface.** Hanken Grotesk, self-hosted as one variable file (`public/assets/fonts/hanken.woff2`) and preloaded in `BaseLayout.astro`.
- **One light theme.** There is no dark mode, no theme toggle and no Pause motion button (the one pause button on the site belongs to the client sheet's looping clip). Reduced motion is the one preference the site answers, and it answers it everywhere.
- **Plain CSS.** Shared styles are in `src/styles/kit.css`; each page imports its own file from `src/styles/pages/`. There are no utility classes and no framework.
- **Real markup first.** The top line, the dock, the closing and every window are in the HTML. Scripts only move them, so a page reads and links correctly with JavaScript off.

## 2. Color

| Token           | Value                   | Used for                                                     |
| --------------- | ----------------------- | ------------------------------------------------------------ |
| `--ground`      | `#f5f5f3`               | The page                                                     |
| `--ink`         | `#121211`               | Text, the ink price card                                     |
| `--soft`        | `#5c5c57`               | Supporting text and `.label`                                 |
| `--card`        | `#fff`                  | Cards, tiles' neighbours, the white chip                     |
| `--line`        | `rgba(18,18,17,.1)`     | Hairlines (decorative; never the only edge that matters)     |
| `--accent`      | `#2f3fe6` (studio blue) | Headline emphasis, primary actions, links, the closing panel |
| `--accent-soft` | `#dde1ff`               | Secondary text on the blue price card; a quiet wash          |

Rules:

- **The page is neutral.** Anything that is not a client's work is `--ground`, `--card`, `--ink`, `--soft` or the studio blue. No second brand color, no gradients, no glow.
- **One studio blue.** It carries `h1 b` emphasis (skipped when `<body>` carries `data-ink`; nothing sets it today), primary actions (`.chip.go`, the dock's Start a project), prose link underlines, the text selection and the closing panel. White on the blue and the blue on the page both clear AA; the pairs are asserted in `src/lib/kit-tokens.test.ts`.
- **A client's color lives only in their work.** It arrives through `--c` (their accent) and `--p` (their paper, and the text color on their accent), set on a `.tile`, a `.band`, the client sheet or the case-study `<body>`. Nothing else on the site picks one up. On a case study it carries down the neutral page in small things: a numbered mark opening each chapter, the corner number and a rule on "What I did" in a decision, the figures' rules, the rule over What I built, the text selection and the quote on its own color. The page itself stays `--ground`. The pairs are checked in `src/lib/case-palettes.test.ts`.
- **A quote band and the blue closing never touch.** A `.band` is the one other full-width color, so keep a neutral section between a band and `Closing`. The home page puts the price section there.
- **Never thin a color with opacity to get a grey.** Use `--soft`. The one deliberate exception is `.pip` and the `.keyed` inner rule, which are decoration at low opacity.

## 3. Typography

One family, set in weight and spacing rather than in different faces.

- **Headings** (h1 to h3, `.end h2`, `blockquote`, `.mark`): weight 500, `letter-spacing: -0.04em`, line-height about 1, `text-wrap: balance`. Emphasis is a `<b>` at weight 700, never a colour alone and never capitals.
- **The display scale** is three tokens in `:root`: `--type-h1` for a page's H1 and the closing's line, `--type-h2` for a section, `--type-h3` for a card. Peer headings use the same token. A case study H1 is `--type-h1` unless the client's name is long enough to need less room. The homepage headline, the `.giant` lines and the long-form `.prose` headings sit outside it on purpose.
- **Body**: 400 at 1.0625rem and 1.45 line-height.
- **`.label`**: the small label voice for figures, counts and facts. 0.8125rem, weight 500, uppercase, `0.07em` tracking, tabular numbers, `--soft`. Still Hanken, set small and even so numbers line up.
- **The wordmark** is the whole name in Hanken, with "Nixon" at 700 and the rest at 500 (`.mark`). The OG cards and the favicon draw the same name from the two static weights in `brand/fonts/`.

### Big lines

- **`.giant`** is the one big line on a page. Put it in a `.big` container (a size container) and it is sized in `cqw` so it fills the line and never overflows. Set `--fit` (wide screens) and `--fitm` (phones, under 52rem) on the element to the number of container-widths the words need: `style="--fit: 20; --fitm: 20"`. On a phone each child span or `<b>` becomes its own nowrap line. Add `.stack` to keep those separate lines on wide screens too, for a phrase too long to stand on one row. Check at 320px.
- **`[data-weigh]`** on a `.giant` makes it gain weight, thin to heavy, as you scroll to it. A value sets where: `data-weigh="0.38 0.06"` on the home line runs the gain while its top goes from 38 to 6 percent of the screen, because the dealt phones cover it until then. `kit.js` drives it; with reduced motion it simply stays at its CSS weight.
- **The H1 reveal.** Each word is wrapped in `<span class="w">` in the markup by `wordSpans()` in `src/lib/words.ts` (`PageHead.astro` does it for a page head), and the H1 carries the plain sentence as its `aria-label`. Words fade in from opacity .02 with a blur on `.js` only. That near-zero start is deliberate: it paints, so it does not cost LCP, and it is the one exception to "nothing in the first viewport starts hidden". The small `.me` portrait in the home headline is exempt in `tests/first-viewport.spec.ts` for the same reason.

## 4. The deck

Cards are the site's one repeated object, and they are written like playing cards without the suits.

- **A portrait or near-portrait card is lettered or numbered in two opposite corners with `.pip`**, the far one `.pip.flip`, upside down. Both are `aria-hidden`. A wide landscape box (a case study decision, a Churches point, an add-on, the contact form when wide) keeps one corner mark only: upside down on a wide box it reads as a typo. The price cards use `L`, `S` and `F` (the first letter of the tier), the About card uses `+` and the minus sign. The contact form has no mark: "Question 1 of 7" already says it, and a bare numeral above a field read as its label. No suits, no spades or hearts.
- **`.keyed`** (and `.pc-face`) draws a faint inner rule inside the card, like the border on a face card.
- **A client's window** is `.tile`: a phone browser window with the client's host in the address bar, their footage on the screen, and their color around it. It is a real link to the case study; with JavaScript a click opens the client sheet instead, unless `data-direct` keeps it a link. `Caption` sits under it with the name and sector, numbered like `01 Nonprofit` when it has a place in the deck.
- **A desktop window** is `.tile.desk` (`Tile` with `desk`): the same object as a wide browser window on the real desktop page, `client.deskStill` at 16:10 with `client.desk` footage. /work and the lean sector pages use it, so a buyer can judge the page design. The Home deck stays phones. Name, sector, the one-line outcome and two links sit under it as plain text, not a card.
- **The price hand** (`PriceHand.astro`, `ui.priceHand`) is three cards, paper, blue and ink. On a wide screen they are dealt out of one stack into a fan; on a phone CSS stacks them.
- **The closing deck**: the case studies gather into one deck as the closing arrives, a last card reads Yours, with a Y in its corner and never a number, and the studio name sits at poster size.
- **The deck order** is `DECK` in `src/lib/clients.ts`, not the study loop's `order` field. Home, /work and the closing all read it.

## 5. Surfaces that are not cards

Anything that is not a card is ruled with hairlines (`--line`), not boxed: tables, FAQs, contents lists, the home ledger, the colophon's facts. A box around a list makes it a card, and a card should be lettered.

Shapes: cards 1.25rem, bands and the closing 1.75rem, buttons and the dock fully round. A card's shadow is a soft two-layer one (`.card`); under forced colors it becomes a real 1px border (`@media (forced-colors: active)` in `kit.css`, checked by `tests/forced-colors.spec.ts`).

## 6. Components

- **The page edge.** Everything starts on one left edge, the 90rem page. A full-bleed block (the top line, the closing, a case study hero, the home quote band) keeps its color edge to edge and pads its contents with `--edge` so they meet it.
- **Top line** (`TopLine.astro`): two working corners, positioned over the hero and on a client's color flipped with `onColor`. It is not a menu; the dock is the one nav.
  - **The name** is the way home. It takes on weight under the pointer, one letter at a time, each letter locked to its resting width so the name never shifts. One wave runs through it the first time a visit opens at the top of a page, and when it takes keyboard focus. Under reduced motion it stays still.
  - **The status** ("Booking projects" when `site.bookingOpen`, "Get in touch" when not; "Booking" alone under 52rem) is a button that deals `.reach`, a card with the phone, the email, `site.firstConversation` and Start a project. It is a native `popover`, so it opens, light-dismisses and takes Escape with no script. It closes after 60px of scrolling. Its title is not a heading, because it sits ahead of the H1 in the markup.
  - **Scrolling up** past 240px brings both corners back as `.top.float`: the same places, each its own frosted pill, the name folded down to Nixon (it unfolds on hover and keyboard focus). Scrolling down sends them away, and at the very top they melt into the plain line. The space between stays clickable. A page with its own bar stuck to the top keeps that spot, so while `.dw-bar` or `.toc` is sticky there are no pills. With no script it is a plain line that scrolls away.
  - `html` keeps 72px of `scroll-padding-top` so a focused element or a jump target stops clear of the pills.
- **Dock** (`Dock.astro`): the one nav at every width. A floating pill at the bottom of the screen with plain links (Work, Prices, About, Start a project), no drawer and no menu button. It works with no script; `kit.js` only slides a highlight to the link you are near. It keeps `view-transition-name: dock` so it stays put between pages.
- **Closing** (`Closing.astro`): the studio blue, edge to edge, down to the bottom of every page. The page's line, the first-conversation and reply-time sentences from `site.ts`, the way to reach me, the deck, the name, and a legal line that gains Journal and Photography when those open (`getGatedNav()`).
- **Quote band** (`QuoteBand.astro`): a client's own words on their own color, with their phone breaking out of the band. Real quotes only, read from the study's frontmatter.
- **Client sheet** (`ClientSheet.astro`): a native `<dialog>`. A window grows into its color and the screens fan out; its button, Escape and the browser's Back close it, because opening it adds a history entry. It has its own address, the page plus `?client=<slug>`, so it can be shared and survives a reload; with no script that address is just the page. Coming back from a case study reopens it. Its looping clip has a pause button (WCAG 2.2.2).
- **The tier glance** (`.glance` on /services): the three tiers as a ruled row, situation then price at `--type-h3`, on the first screen ahead of the giant `.from-num`. The buyer meets the tiers before the big number.
- **Ruled tables** (`.fit-table`, `.cost-table` on /services, `.op-table` on /one-page): hairlines, never boxed. Under their breakpoint each row stacks and each cell prints its own column name, so a phone never scrolls them sideways.
- **The one-page sheet** (`one-page.css`): one white sheet on the page, and in print only that sheet, on one US Letter page with the dock, top line and closing gone. `tests/one-page.spec.ts` prints it and counts the pages.
- **Chips**: `.chip` is the white pill, `.chip.go` the blue one, `.chip.ghost` the translucent one for use on a color. 48px tall.

## 7. Motion

House motion is **springs, in JavaScript**. `ui.spring(k, c, v)` in `src/scripts/kit.js` returns a stepper (stiffness, damping, start); the closing deck, the price hand, the dock highlight, the client sheet, the 404's knock and the About and Churches stages all run on it, so everything settles with a small overshoot instead of an ease-out. CSS uses `--ease` (`cubic-bezier(0.2, 0.8, 0.2, 1)`) for entrances and a springy `cubic-bezier(0.3, 1.5, 0.5, 1)` on hover.

- **Scroll deals the cards.** The hero hand of clients is dealt as you scroll (`home.js`), the closing deck gathers as you reach it, and a quote band opens out as it arrives. The large /work windows do not fly: each rises and straightens as it arrives, opacity stays at 1, and a filter carries the ones that stay to their new places (`work.js`).
- **Page changes** are cross-document view transitions (`@view-transition` in `kit.css`), not a router. Scripts simply run on load.
- **Footage is fetched only when asked for.** A window's video has `preload="none"` and its address in `data-src`. It plays on hover, or on a touch screen while the window is centred, two at most; nothing is downloaded at load, and with Data Saver on nothing is fetched at all.
- **Hover holds still.** A card that lifts can lift off the pointer, so `ui.stillHover` remembers where it rested and only lets go when the pointer is 40px outside that, or on another card. Home tiles, the price hand, the ninth card and footage all use it.
- **A page that loads already scrolled replays nothing.** After a reload or Back, the home deal and the /work windows are simply laid (`ui.restored()`).

**Reduced motion stands everything down.** Under `prefers-reduced-motion: reduce`: the view transition is switched off, smooth scrolling is off, springs start at their rest value, the H1 words and the dock arrive in place, the hero hand is already dealt, the closing deck is already gathered, `[data-weigh]` headings stay put, footage never plays and the window stays on its poster still, and the sheet and chip transitions are off. `tests/reduced-motion.spec.ts` checks that nothing is still running a couple of seconds after load.

## 8. Do's and Don'ts

**Do**

- Let a client's color fill their own window, band or sheet, and keep the page around it neutral.
- Size a big line from the words in it (`--fit`, `--fitm`) and check it at 320px.
- Letter a portrait card in two corners with `.pip` and `.pip.flip`, and a wide box in one.
- Rule non-cards with hairlines.
- Use springs for anything that should move with weight, and give every moving thing a reduced-motion answer.
- Keep chrome and content in the markup, and let scripts only enhance.

**Don't**

- Don't add a second typeface, a dark theme, a theme toggle or a Pause motion button.
- Don't use the studio blue for a client's work, or a client's color for the studio's chrome.
- Don't put a quote band next to the closing.
- Don't use suits, emoji icons, sparkles, glow blobs, shimmer or a centred SaaS hero.
- Don't box a table, a FAQ or a list. Don't use capitals or colour alone for emphasis.
- Don't start anything in the first viewport at opacity 0 (the H1 words at .02 are the one exception).
- Don't hardcode a hex in a component. Add a token to `:root` and a pair to `src/lib/kit-tokens.test.ts`.
- Don't fabricate a quote, a result or a screenshot. Only real, live, attributed proof goes on the site.
