---
name: Nixon Creative Studio
description: A calm neutral page, one studio blue, and a deck of client phones. Every other color belongs to a client and stays inside their own window. One typeface, two sides of the same card, light and dark, and motion that moves with weight.
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
- **Two sides.** Light is the face of the card and dark is its back, each designed in its own right (section 2a). The small card in the dock turns the page over. There is no Pause motion button (the one pause button on the site belongs to the client sheet's looping clip). Reduced motion is answered everywhere.
- **Plain CSS.** Shared styles are in `src/styles/kit.css`; each page imports its own file from `src/styles/pages/`. There are no utility classes and no framework.
- **Real markup first.** The top line, the dock, the closing and every window are in the HTML. Scripts only move them, so a page reads and links correctly with JavaScript off.
- **WCAG 2.2 AA, both sides.** Every design choice answers WCAG 2.2 AA in light and dark (`.claude/rules/accessibility.md`). The ones that touch the look: a focused control is never fully covered by the dock, the pills or a stacked card (`scroll-padding-block` on `html`, and a focused card comes to the top of its pile); nothing needs a drag (the before/after slider and the course line move to a tap); every target is at least 24 by 24px; a text field has a 3:1 edge (`--field-edge`); a client's color on a dark surface is their night mark, never the deep accent.

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

- **The page is neutral.** Anything that is not a client's work is `--ground`, `--card`, `--ink`, `--soft` or the studio blue. No second brand color, no gradients, and no glow apart from the dark side's cast light (section 2a).
- **One studio blue.** It carries `h1 b` emphasis (skipped when `<body>` carries `data-ink`; nothing sets it today), primary actions (`.chip.go`, the dock's Start a project), prose link underlines, the text selection and the closing panel. White on the blue and the blue on the page both clear AA; the pairs are asserted in `src/lib/kit-tokens.test.ts`.
- **A client's color lives only in their work.** It arrives through `--c` (their accent) and `--p` (their paper, and the text color on their accent), set on a `.tile`, a `.band`, the client sheet or the case-study `<body>`. Nothing else on the site picks one up. On a case study it carries down the neutral page in small things: a numbered mark opening each chapter, the corner number and a rule on "What I did" in a decision, the figures' rules, the rule over What I built, the text selection and the quote on its own color. The page itself stays `--ground`. The pairs are checked in `src/lib/case-palettes.test.ts`.
- **A quote band and the blue closing never touch.** A `.band` is the one other full-width color, so keep a neutral section between a band and `Closing`. The home page puts the price section there.
- **Never thin a color with opacity to get a grey.** Use `--soft`. The one deliberate exception is `.pip` and the `.keyed` inner rule, which are decoration at low opacity.

## 2a. The dark side

Dark is the back of the card, not light with the values inverted. The tokens are set again in `:root[data-theme='dark']`, inside `@media screen` so that print always takes the light ones.

| Token      | Dark value | Used for                                        |
| ---------- | ---------- | ----------------------------------------------- |
| `--ground` | `#14162f`  | The page: the deck's printed ink, a deep cobalt |
| `--card`   | `#1d2042`  | Cards                                           |
| `--ink`    | `#f3f2ec`  | Text, and the bone card in the price hand       |
| `--soft`   | `#b2b4cc`  | Supporting text                                 |
| `--accent` | `#aab3ff`  | The blue as text, lifted so it reads            |
| `--fill`   | `#3345f0`  | The blue as a surface: buttons and the closing  |

`--fill` equals the studio blue on the light side. Use `--accent` for blue text and `--fill` for a blue surface, and every new pair goes in `src/lib/kit-tokens.test.ts`, which checks both sides.

What only the dark side does:

- **Lit edges.** A shadow can't be seen on a dark page, so cards carry `--rim`, a lit top edge and a faint ring. `--rim` draws nothing on the light side. A new card puts it first in its `box-shadow`.
- **The work lights the table.** A window's screen rests a little dim. Hover, focus or playing footage brings it to full brightness and casts that client's color on the page under it. This is the one exception to "no glow" and to a client's color staying in its window: it belongs to a real object, and only on the dark side.
- **The hand turns over too.** `--ink` is bone, so the ink card in the price hand becomes the bright one, with its text in `--on-ink`.
- **Client marks use the client's own second color.** A deep accent would vanish, so a study's chapter marks, figures and rules use `--cm`, set from `nightMark()` (`src/lib/night-mark.ts`): `palette.markDark` where the client has one, most often a gold, otherwise the accent lifted as little as it takes to clear AA. Write `var(--cm, var(--c))` for a client's color on the neutral page, and plain `--c` on the client's own paper. The phone in a study's opening fan has a `--screen` frame, dark on the dark side, so its address bar takes `--cm` there too.
- **The lights come up.** A `[data-weigh]` line brightens as it gains weight, through `--lit` from `kit.js`.
- **The closing is the back of the deck,** and it is the one full-strength color on the page.

Surfaces that keep their color on either side get the light tokens back: `.end`, `.band`, `.sheet` and anything set on a client's paper. A new one joins that `:is()` list in `kit.css`.

**The flip.** `ThemeBoot.astro` sets `data-theme` before first paint: a saved choice (`localStorage` key `ncs-theme`), otherwise the device. Until a choice is made the page keeps following the device. `ThemeFlip.astro` is the switch, and it says in words what it will do: "Dark mode" with a moon on the light side, "Light mode" with a sun on the dark side (both labels are in the markup; CSS shows the right one from `data-theme`, so the name is right from the first paint). It sits at the right end of the dock wider than 40rem, and in the closing's fine print at every width, which is the only place a phone has it: the dock has no room for the words there, and a bare symbol read as "N, a notification?". `src/scripts/theme.js` turns the page over on its vertical axis with a same-document view transition, showing the studio blue behind it for the moment it is edge-on. Reduced motion, or a browser with no view transitions, swaps with no animation. Without script the page is light and both switches are hidden.

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

- **A portrait or near-portrait card is lettered or numbered in two opposite corners with `.pip`**, the far one `.pip.flip`, upside down. Both are `aria-hidden`. A wide landscape box (a case study decision, a Churches point, an add-on, the contact form when wide) keeps one corner mark only: upside down on a wide box it reads as a typo. The home price hand uses `L`, `S` and `F` (the first letter of the tier). The About "I do" and "I don't" cards have no corner marks: a lone + and minus read as expand and collapse buttons, so each title carries a tick or a cross beside its words instead, and those cards do not lift under the pointer. The closing's last card has no mark either (see below). The contact form has no mark: "Question 1 of 7" already says it, and a bare numeral above a field read as its label. No suits, no spades or hearts.
- **Where a buyer is reading prices, cards carry no corner marks** (clarity pass, November 2026). On /services the tier cards, the quiz card, the add-ons and the care cards have no letters, the "How it works" cards keep one number top left (never the upside-down copy), and the two tracker cards say "Basic" and "What I add" in words instead of a minus and a plus. A non-technical reader took the letters for stray type and the symbols for buttons. Nothing on a price card looks like a control unless it is one: every "What's included" list is always open, with no toggle.
- **`.keyed`** (and `.pc-face`) draws a faint inner rule inside the card, like the border on a face card.
- **A client's window** is `.tile`: a phone browser window with the client's host in the address bar (the drawn toolbar at its foot loses its back and forward arrows and fades right back under 40rem, so on a phone it never looks like something to tap), their footage on the screen, and their color around it. It is a real link to the case study; with JavaScript a click opens the client sheet instead, unless `data-direct` keeps it a link. `Caption` sits under it with the name and sector, numbered like `01 Nonprofit` when it has a place in the deck.
- **A desktop window** is `.tile.desk` (`Tile` with `desk`): the same object as a wide browser window on the real desktop page, `client.deskStill` at 16:10 with `client.desk` footage. /work and the lean sector pages use it, so a buyer can judge the page design. The Home deck stays phones. Name, sector, the one-line outcome and two links sit under it as plain text, not a card.
- **The price hand** (`PriceHand.astro`, `ui.priceHand`) is three cards, paper, blue and ink. On a wide screen they are dealt out of one stack into a fan; on a phone CSS stacks them.
- **The closing deck**: the case studies gather into one deck as the closing arrives, and a last card says what it is in words: "Your site could be next", "Start a project" and an arrow. It used to read "Next in the deck / Yours.", a punchline whose setup no reader had seen. The deck is also an index: a name in the selected work beside it pulls that client's card back out. The studio name sits at poster size below, dealt up a letter at a time.
- **The deck order** is `DECK` in `src/lib/clients.ts`, not the study loop's `order` field. Home, /work and the closing all read it.

## 5. Surfaces that are not cards

Anything that is not a card is ruled with hairlines (`--line`), not boxed: tables, FAQs, contents lists, the home ledger, the colophon's facts. A box around a list makes it a card, and a card should be lettered.

Shapes: cards 1.25rem, bands and the closing 1.75rem, buttons and the dock fully round. A card's shadow is a soft two-layer one (`.card`); under forced colors it becomes a real 1px border (`@media (forced-colors: active)` in `kit.css`, checked by `tests/forced-colors.spec.ts`).

## 6. Components

- **The page edge.** Everything starts on one left edge, the 90rem page. A full-bleed block (the top line, the closing, a case study hero, the home quote band) keeps its color edge to edge and pads its contents with `--edge` so they meet it.
- **Top line** (`TopLine.astro`): two working corners, positioned over the hero and on a client's color flipped with `onColor`. It is not a menu; the dock is the one nav.
  - **The name** is the way home. It takes on weight under the pointer, one letter at a time, each letter locked to its resting width so the name never shifts. One wave runs through it the first time a visit opens at the top of a page, and when it takes keyboard focus. Under reduced motion it stays still.
  - **The status** ("Taking new projects · Call or email" when `site.bookingOpen`, with only "Call or email" under 52rem and in the floating pill; "Call or email" when not) is a button that deals `.reach`, a card with the phone, the email, `site.firstConversation` and Start a project. It is a native `popover`, so it opens, light-dismisses and takes Escape with no script. It closes after 60px of scrolling. Its title is not a heading, because it sits ahead of the H1 in the markup.
  - **Scrolling up** past 240px brings both corners back as `.top.float`: the same places, each its own frosted pill. The name stays whole ("Nixon" alone read as a name cut off), and `.mark` never shrinks: the status gives way instead, and under 23.5rem it drops its dot and the name steps down a size so the two pills keep a gap at 320px. Scrolling down sends them away, and at the very top they melt into the plain line. The space between stays clickable. A page with its own bar stuck to the top keeps that spot, so while `.dw-bar` or `.toc` is sticky there are no pills. With no script it is a plain line that scrolls away.
  - `html` keeps 72px of `scroll-padding-top` so a focused element or a jump target stops clear of the pills.
- **Dock** (`Dock.astro`): the one nav at every width. A floating pill at the bottom of the screen with plain links (Work, Prices, About, Start a project), no drawer and no menu button. Wider than 40rem it also has Home at its left end (the word, not a bare N), because the top line has scrolled away by then, and the light and dark switch at its right end. Under 375px the action reads Start, with "a project" kept for a screen reader, so the four targets fit at 320px and 44px tall. It works with no script. It rises in when you arrive from elsewhere and is simply there on a page reached from this site, keeping `view-transition-name: dock` so it stays put between pages. Its colors are `--dock`, `--wash`, `--ink`, `--fill` and `--rim`, so it turns over with everything else. Script adds:
  - **The puck** (`.slide`): rests on the page you are on and goes to the link you are near, on two springs, one per edge, so it stretches on the way and gathers on landing.
  - **The rail** (`.dk-rail`): a hairline in the blue running round the pill's edge, showing how far down the page you are. It answers scrolling and nothing else, and sits out on a page with no real length.
  - **Back to top**: the link for the page you are on scrolls to the top rather than reloading.
  - **The hands** (`.dk-hand`, `.fc`): each link deals real shortcuts up out of the pill while the page steps back behind `.dock-scrim`: the client phones from Work, the three starting prices from Prices, me from About, a "Call or email" card with email and phone from Start a project. Only a mouse on a screen at least 56rem wide and 36rem tall gets them on hover; a keyboard opens one with the up arrow, moves with the side arrows, and Escape folds it and hands focus back. A hand is `hidden` until then, so it is out of the tab order and its images are not fetched. A phone taps the link and gets the page, which has everything a hand has. A client's color appears here only in their own phone.
- **Closing** (`Closing.astro`): the studio blue, edge to edge, down to the bottom of every page. The page's line, the first-conversation and reply-time sentences from `site.ts`, the way to reach me, the selected work beside the deck (`.end-work`, in `DECK` order, each name a link to its study, read as "selected" and never counted), the site index (`.end-index`, ruled, four short groups: the sector pages, the studio with the lowest price from `pricing.ts`, LinkedIn and Instagram, the fine print; Journal and Photography join the studio group when they open, `getGatedNav()`), the name, and a base line with the copyright and Back to top. White on the blue is deliberate. The closing keeps its light tokens on either side, so the bar and the white chip read `--fill` on white in both themes.
- **Quote band** (`QuoteBand.astro`): a client's own words on their own color, with their phone breaking out of the band. Real quotes only, read from the study's frontmatter.
- **Client sheet** (`ClientSheet.astro`): a native `<dialog>`. A window grows into its color and the screens fan out; its button, Escape and the browser's Back close it, because opening it adds a history entry. It has its own address, the page plus `?client=<slug>`, so it can be shared and survives a reload; with no script that address is just the page. Coming back from a case study reopens it. Its looping clip has a pause button (WCAG 2.2.2).
- **The tier glance** (`.glance` on /services): the three tiers as a ruled row, situation then price at `--type-h3`, on the first screen ahead of the giant `.from-num`. The buyer meets the tiers before the big number.
- **Ruled tables** (`.fit-table`, `.cost-table` and `table.care` on /services, `.op-table` on /one-page): hairlines, never boxed. Under their breakpoint each row stacks and each cell prints its own column name, so a phone never scrolls them sideways. A table that stacks sets its `<caption>` to `display: block` in the same rule, or the caption is crushed to a word or two a line (`tests/mobile-expandables.spec.ts`). The GOV.UK and USWDS rules apply to every one: a visible `<caption>` (`.tcap`) that says what the table is and, for prices, the date they hold ("Prices as of November 2026", `pricesAsOf` in `pricing.ts`); plain headers ("First year, build and hosting", "Total after 3 years", "Total after 5 years"); a unit in words on every recurring price ("per year", "per month") and "one-time" on a build; money right-aligned in tabular figures; and "Included" or "Not included" in words in a cell, with a small mark beside the word, never a bare tick or dash.
- **The cost bars** (`.cost-bars` on /services, under the five-year table): one bar per tier with its usual care plan, split into build, Hosting (years 2 to 5) and care (5 years), all on one shared scale so lengths compare honestly. The key and a sentence under each bar say every part and the total in words; the bar itself is `aria-hidden`. Colors are tokens only: `--ink` build, `--soft` Hosting, `--fill` care. The parts come from `costRows()` in `src/lib/tier-costs.ts` and must add up to the printed total (unit tested).
- **The live receipt** (`LiveReceipt.astro`, under the cost bars): "Work out your own". Real radios for the tier and for what comes after launch (Hosting only or a care plan, each with its unit in words), and a native range input for 1 to 5 years, drawn as a scrubber with five tick marks and a visible "N years". Flagship strikes out Hosting only and Light Care and says why in a sentence, the same rule as its cost rows. The receipt is a white card with no corner marks: the build (one-time), Hosting ("Year one included, then $200 per year for N years"), the care plan per month for so many months, and the total under a solid rule, money right-aligned in tabular figures. The sums are `src/lib/receipt.ts`, unit tested against every row of the cost table. With no script the form and card are hidden and a sentence points at the table.
- **Life in weeks** (`ClientWeeks.astro`, in the care section): one ruled row per client, the name and "9 of 10 weeks" on the left, one dot per week since the build began on the right, ink where the week had changes and a ring where it had none. The key says so in words, each row has a sentence for a screen reader, the dots are `aria-hidden`, and the as-of date is printed under the strip. Ink and a ring only: the strip sits on the neutral page, so no client color comes out of its window. The data is `src/data/client-weeks.json` from `npm run weeks` (week numbers and counts, never a message or an author).
- **Step icons** (How it works on /services): one plain line drawing per step, top right of its card (two speech bubbles, a written page, a browser window with a layout, a flag), `aria-hidden`, on a patch of card so the hairline that joins the four steps on a wide screen stops at each number and icon.
- **The one-page sheet** (`one-page.css`): one white sheet on the page, and in print only that sheet, on one US Letter page with the dock, top line and closing gone (`@page` margins 0.4in by 0.55in). In order: the date the prices hold, what I do, the three tiers as ruled columns topped in the price hand's colors (who it fits, "Usually $X to $Y", what I take on), the cost table (Hosting only first, then with care; Flagship only with Care or Care+), a "What Hosting and care cover" box on `--ground` with every price, then every build, leaving and how to reach me in three columns. The cost footnote is one sentence (tested). `tests/one-page.spec.ts` prints it and counts the pages; anything added means something else comes out.
- **The contact form's last step is "Check your answers"** (`.q-check`, built by `contact.js`): each answer beside its question, "Not provided" for a skipped one, and a Change button that goes back to that question and then straight back to the list. Without JavaScript it is hidden, because every question already shows. The phone beside the form is titled "Your answers so far" and its waiting lines are plain soft text with no blank under them, so it never reads as a second form.
- **Chips**: `.chip` is the white pill, `.chip.go` the blue one, `.chip.ghost` the translucent one for use on a color. 48px tall.

## 7. Motion

House motion is **springs, in JavaScript**. `ui.spring(k, c, v)` in `src/scripts/kit.js` returns a stepper (stiffness, damping, start); the closing deck, the price hand, the dock highlight, the client sheet, the 404's knock and the About and Churches stages all run on it, so everything settles with a small overshoot instead of an ease-out. CSS uses `--ease` (`cubic-bezier(0.2, 0.8, 0.2, 1)`) for entrances and a springy `cubic-bezier(0.3, 1.5, 0.5, 1)` on hover.

- **The dock deals too.** A hand's cards spring out from the middle of the hand and fold together, quicker, when the pointer leaves (`kit.js`). A pointer passing through for under 90ms deals nothing.
- **Scroll deals the cards.** The hero hand of clients is dealt as you scroll (`home.js`), the closing deck gathers as you reach it, the poster name's letters rise out of their line in reading order, and a quote band opens out as it arrives. The large /work windows do not fly: each rises and straightens as it arrives, opacity stays at 1, and a filter carries the ones that stay to their new places (`work.js`).
- **Page changes** are cross-document view transitions (`@view-transition` in `kit.css`), not a router. Scripts simply run on load.
- **Footage is fetched only when asked for.** A window's video has `preload="none"` and its address in `data-src`. It plays on hover, or on a touch screen while the window is centred, two at most; nothing is downloaded at load, and with Data Saver on nothing is fetched at all.
- **A name pulls its card.** Hovering or keyboard-focusing a name in the closing's selected work slides one white bar to that row and springs the client's card out of the deck, while the last card leans aside. A tap on a touch screen goes straight to the study. The letters of the poster name lift a little by the pointer, by transform only, so its width never changes.
- **Hover holds still.** A card that lifts can lift off the pointer, so `ui.stillHover` remembers where it rested and only lets go when the pointer is 40px outside that, or on another card. Home tiles, the price hand, the ninth card and footage all use it.
- **The receipt feeds.** A receipt line whose words change is reprinted and springs down into its row from just above, clipped to the row, like a till slip (`prices.js`). The numbers are swapped as text, never counted.
- **The weeks fill and the steps draw as they arrive.** The filled dots fill left to right when the strip comes into view, and How it works draws each step's stretch of hairline and then its icon in order, the one drawing in the blue. Both run only when they start below the screen.
- **A page that loads already scrolled replays nothing.** After a reload or Back, the home deal and the /work windows are simply laid (`ui.restored()`).

**Reduced motion stands everything down.** Under `prefers-reduced-motion: reduce`: the view transition is switched off, smooth scrolling is off, springs start at their rest value, the H1 words and the dock arrive in place, the hero hand is already dealt, the closing deck is already gathered and the poster name already dealt, a picked name jumps its bar and card with no spring, `[data-weigh]` headings stay put, footage never plays and the window stays on its poster still, the sheet and chip transitions are off, the dock's puck and hands go straight to their places, the receipt swaps its lines with no feed, and the weeks strip and the step icons are already filled and drawn. `tests/reduced-motion.spec.ts` checks that nothing is still running a couple of seconds after load.

## 8. Do's and Don'ts

**Do**

- Let a client's color fill their own window, band or sheet, and keep the page around it neutral.
- Size a big line from the words in it (`--fit`, `--fitm`) and check it at 320px.
- Letter a portrait card in two corners with `.pip` and `.pip.flip`, and a wide box in one.
- Rule non-cards with hairlines.
- Use springs for anything that should move with weight, and give every moving thing a reduced-motion answer.
- Give anything that moves under a drag a single tap or click that does the same (WCAG 2.5.7), and bring a focused card above anything stacked on it (2.4.11).
- Keep chrome and content in the markup, and let scripts only enhance.

**Don't**

- Don't add a second typeface or a Pause motion button. Don't make a dark variant by inverting: a new surface gets its dark answer designed with it.
- Don't use the studio blue for a client's work, or a client's color for the studio's chrome.
- Don't put a quote band next to the closing.
- Don't use suits, emoji icons, sparkles, glow blobs, shimmer or a centred SaaS hero.
- Don't box a table, a FAQ or a list. Don't use capitals or colour alone for emphasis.
- Don't start anything in the first viewport at opacity 0 (the H1 words at .02 are the one exception).
- Don't hardcode a hex in a component. Add a token to `:root` and a pair to `src/lib/kit-tokens.test.ts`.
- Don't fabricate a quote, a result or a screenshot. Only real, live, attributed proof goes on the site.
