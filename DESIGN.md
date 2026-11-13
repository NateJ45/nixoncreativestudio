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
- **`[data-build]`** on a `.giant` below the fold makes it build as you scroll to it: `kit.js` wraps its words in `.bw` spans and each rises into place in reading order, from a little low and faint (opacity .15, never 0), all home by the time the line's top reaches 40 percent of the screen (`data-build="1 0.4"` is the default; two numbers move it). The heading keeps the plain sentence as its `aria-label`. A line already on the first screen, a page that loaded scrolled, and reduced motion leave it simply set. It sits beside `data-weigh` on the same line. Page-head H1s never take it.
- **The H1 reveal.** Each word is wrapped in `<span class="w">` in the markup by `wordSpans()` in `src/lib/words.ts` (`PageHead.astro` does it for a page head), and the H1 carries the plain sentence as its `aria-label`. Words fade in from opacity .02 with a blur on `.js` only. That near-zero start is deliberate: it paints, so it does not cost LCP, and it is the one exception to "nothing in the first viewport starts hidden". The small `.me` portrait in the home headline is exempt in `tests/first-viewport.spec.ts` for the same reason.

## 4. The deck

Cards are the site's one repeated object, and they are written like playing cards without the suits.

- **A portrait or near-portrait card is lettered or numbered in two opposite corners with `.pip`**, the far one `.pip.flip`, upside down. Both are `aria-hidden`. A wide landscape box (a case study decision, a Churches point, an add-on, the contact form when wide) keeps one corner mark only: upside down on a wide box it reads as a typo. The home price hand uses `L`, `S` and `F` (the first letter of the tier). The About "I do" and "I don't" cards have no corner marks: a lone + and minus read as expand and collapse buttons, so each title carries a tick or a cross beside its words instead, and those cards do not lift under the pointer. The closing's last card has no mark either (see below). The contact form has no mark: "Question 1 of 7" already says it, and a bare numeral above a field read as its label. No suits, no spades or hearts.
- **Where a buyer is reading prices, cards carry no corner marks** (clarity pass, November 2026). On /services the tier cards, the quiz card, the add-ons and the care cards have no letters, the "How it works" cards keep one number top left (never the upside-down copy), and the two tracker cards say "Basic" and "What I add" in words instead of a minus and a plus. A non-technical reader took the letters for stray type and the symbols for buttons. Nothing on a price card looks like a control unless it is one: every "What's included" list is always open, with no toggle.
- **`.keyed`** (and `.pc-face`) draws a faint inner rule inside the card, like the border on a face card.
- **A client's window** is `.tile`: a phone browser window with the client's host in the address bar (the drawn toolbar at its foot loses its back and forward arrows and fades right back under 40rem, so on a phone it never looks like something to tap), their footage on the screen, and their color around it. It is a real link to the case study; with JavaScript a click opens the client sheet instead, unless `data-direct` keeps it a link. `Caption` sits under it with the name and sector, numbered like `01 Nonprofit` when it has a place in the deck.
- **A desktop window** is `.tile.desk` (`Tile` with `desk`): the same object as a wide browser window on the real desktop page, `client.deskStill` at 16:10 with `client.desk` footage. /work and the lean sector pages use it, so a buyer can judge the page design. The Home deck stays phones. Name, sector, the one-line outcome and two links sit under it as plain text, not a card. On /work each one carries a quiet technical mark above it (`.dw-mark`, `aria-hidden`, `--soft`, label voice): its place like `01 / 08`, a hairline tick ruler, and the real pixel size of the still and the footage, from `src/data/capture-sizes.json`, which a unit test holds to the files.
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
- **The cost bars** (`.cost-bars` on /services, under the five-year table): one bar per tier with its usual care plan, split into build, Hosting (years 2 to 5) and care (5 years), all on one shared scale so lengths compare honestly. The key and a sentence under each bar say every part and the total in words; the bar itself is `aria-hidden`. Colors are tokens only: `--ink` build, `--soft` Hosting, `--fill` care. The parts come from `costRows()` in `src/lib/tier-costs.ts` and must add up to the printed total (unit tested). Three real radios, "Show the cost after 1 year, 3 years, 5 years", switch the view: every view keeps the five-year scale, so a bar keeps its place and grows. Each view's total, key and sentence are printed in the page and swapped whole (`src/lib/cost-views.ts`, held to the cost table's columns by its unit test); in year one the Hosting part is gone and the words say "Hosting included in year one". With no script the radios are hidden and the five-year view stays.
- **The live receipt** (`LiveReceipt.astro`, under the cost bars): "Work out your own". Real radios for the tier and for what comes after launch (Hosting only or a care plan, each with its unit in words), and a native range input for 1 to 5 years, drawn as a scrubber with five tick marks and a visible "N years". Flagship strikes out Hosting only and Light Care and says why in a sentence, the same rule as its cost rows. The receipt is a white card with no corner marks: the build (one-time), Hosting ("Year one included, then $200 per year for N years"), the care plan per month for so many months, and the total under a solid rule, money right-aligned in tabular figures. The sums are `src/lib/receipt.ts`, unit tested against every row of the cost table. With no script the form and card are hidden and a sentence points at the table. The card hangs from a drawn printer slot (`.rcpt-slot`, an `--ink` bar, `aria-hidden`), a little narrower than it.
- **Show on the receipt** (`.row-send`, one in every cost table row): a real toggle button, a hairline pill that turns blue with a tick (`aria-pressed`) when its row is the one on the receipt. It sets the receipt to that row's tier and plan over five years, moves focus to the receipt and brings it on screen. The row never leaves the table.
- **How soon you hear back** (`ReplyOrder.astro`, in the care section, after the care table): one ruled row per plan, soonest reply first, each with the plan's own sentence from its `support` line in `pricing.ts` (`src/lib/reply-order.ts` reads the time out of it; Hosting promises none, and its row says so). Real radios pick a plan and a small paper slip, "Your message", sits in that plan's row. It shows reply times only: it claims no order between clients and no time to finish the work. With no script it is the plain list.
- **The quiz card's stub** (`.pick-stub`): once the three questions have an answer, the card has a strip under a dashed perforation, in the card's own color, with "Starting tier" and the tier's name. It repeats the card, so it is `aria-hidden`, and it is not a control: "Start with X" under the card is.
- **An FAQ answer is a reply** (`.faq-reply`): native `details` and `summary`, hairline rows, and the answer signed "Nathan" in the label voice with one `--fill` rule down its left. From 48rem it sits to the right of its question, like a reply in a thread. No bubble, no fill: a FAQ is never boxed.
- **Life in weeks** (`ClientWeeks.astro`, in the care section): one ruled row per client, the name and "9 of 10 weeks" on the left, one dot per week since the build began on the right, ink where the week had changes and a ring where it had none. The key says so in words, each row has a sentence for a screen reader, the dots are `aria-hidden`, and the as-of date is printed under the strip. Ink and a ring only: the strip sits on the neutral page, so no client color comes out of its window. The data is `src/data/client-weeks.json` from `npm run weeks` (week numbers and counts, never a message or an author).
- **Step icons** (How it works on /services): one plain line drawing per step, top right of its card (two speech bubbles, a written page, a browser window with a layout, a flag), `aria-hidden`, on a patch of card so the hairline that joins the four steps on a wide screen stops at each number and icon.
- **The one-page sheet** (`one-page.css`): one white sheet on the page, and in print only that sheet, on one US Letter page with the dock, top line and closing gone (`@page` margins 0.4in by 0.55in). In order: the date the prices hold, what I do, the three tiers as ruled columns topped in the price hand's colors (who it fits, "Usually $X to $Y", what I take on), the cost table (Hosting only first, then with care; Flagship only with Care or Care+), a "What Hosting and care cover" box on `--ground` with every price, then every build, leaving and how to reach me in three columns. The cost footnote is one sentence (tested). `tests/one-page.spec.ts` prints it and counts the pages; anything added means something else comes out.
- **The contact form's last step is "Check your answers"** (`.q-check`, built by `contact.js`): each answer beside its question, "Not provided" for a skipped one, and a Change button that goes back to that question and then straight back to the list. Without JavaScript it is hidden, because every question already shows. The phone beside the form is titled "Your answers so far" and its waiting lines are plain soft text with no blank under them, so it never reads as a second form.
- **Chips**: `.chip` is the white pill, `.chip.go` the blue one, `.chip.ghost` the translucent one for use on a color. 48px tall.
- **What changed on /work** (`WorkFigures.astro`): every sourced figure from the studies' `ResultsBlock`s, read from the MDX (`src/lib/work-figures.ts`), never typed. One card per figure in the client's color with their paper as the text, the figure at display size as static text, its line, "Source: ..." and a link to the study. Beside it is the thing the number counts: a capture of the real page (`shot`, `shotAlt`, `shotNote` on the figure in the MDX, a file in `public/assets/study/`) with a line under it saying what it is; a capture much wider than tall runs under the words. A figure that is part of a stated whole (`of`, `ofLabel`) also gets a bar filled to the part, `aria-hidden`, with the sentence "195 of 216 ..." as real text beside it. Cards stick and stack only on screens at least 52rem wide and 46rem tall; elsewhere they read as a list. (Until 2026-11-10 the picture was a grid of dots, one per round unit, which told a reader only that the number was big.)
- **The Lab on /work** (`LabStrip.astro`, `lab.css`, `lab.js`): after the client work, a short head ("The lab", the label `Lab · Built for my own people`) and three cards the same shape as a desktop window but on the back of the card, `--back` (the dark side's cobalt) on either theme, with the `--back-*` tokens for text and marks. Each front holds a small demo on made-up data with its own button (Fill the gaps, Run a check, Refresh the console) and Turn it over; the back has the problem, what I built, the stack as pills and "Read how I built it" when the journal post is out. The client grid's mark and words sit over and under each card. Motion: the demos move only when pressed (a slot lands, an alert drops, the meter fills on a spring); the turn is the theme switch's page-out and page-in on the card, and the two sides share one grid cell so the page never moves. Reduced motion: each demo starts at its end state with Replay, and the card shows its other side with no turn.
- **The list's stage** (/work, list view, 75rem and wider): beside the ruled rows, one window (`.dw-peek`, a `.tile.desk` with the same mark as the grid) and the one-line outcome of the row you are on. A mouse picks by hovering, a keyboard by focus, a touch screen by the row nearest the middle, and an ink tick on the row says which one is showing. Narrower than that every row prints its outcome instead. The stage is `aria-hidden`; the outcome is in the row for a screen reader. A hidden figure's still is never fetched.
- **The sizing frame** (case study hero): a dashed frame with corner handles round one of the two hero windows, in the client's paper on their color, with the pixel size of the still inside it on a pill. Desktop and Phone buttons under the fan move it. The sizes are real (`capture-sizes.json` and `PHONE_STILL`, both held to the files by unit tests) and both windows are real captures: nothing is reflowed to fake a width in between.
- **The two switches on Decisions** (`.insp`, in `Chapter.astro`): Show the grid lays this page's own columns over the story (margin, story, gap, phone), each labelled with the width the browser measures. Show the measurements draws on every decision card its heading size and weight, its padding, and the label's colour on the card with the contrast ratio (`src/lib/study-spec.ts`, the palette gate's maths). Lines are `--accent`, labels `--ink` on `--ground`. A value that cannot be read is left out, and nothing is said about the client's own grid, type or spacing, because none of that is on record.
- **The light table** (/photography, `photo-table.js`, `photography.css`): every photo and film as a print on an endless table, on `--well` inside a rounded stage. A print is a photo on its own paper (`--card`, a small `--mat`, a print shadow with `--rim` first), laid in masonry columns that each repeat down forever, with the block of columns repeating across, so there is no edge. Each print sits a degree or two off square, fixed per place. Move it by dragging, a sideways trackpad swipe, the wheel once you have pressed on it (so the page still scrolls past), the arrow keys while it has focus, or the four round buttons top right (WCAG 2.5.7). Enter opens the print in the middle, which is ringed in the blue while the keyboard is on the table and named in a live region. A film carries a `Film` chip in the white chip colours and plays while it is among the three nearest the middle. A print opens into a native `<dialog>`: the large image beside its kind and client in the label voice (no year: the page shows no dates), its title, what is in it and where, and Previous, Next, Close. The /work filter bar picks a kind, and Table / Grid swaps to the plain grid of links, which is the no-JS gallery and the way through for a screen reader. On a touch screen the stage never passes 68% of the screen, so a thumb can always scroll the page. **Depth and light** (2026-11-13), all script-driven and all off under reduced motion except the colour and the zoom: neighbouring columns slide at slightly different speeds and every print trails the table a little, so it reads as loose paper with depth; the whole table tips a couple of degrees toward a throw; prints ease smaller toward the corners and the stage's edge falls into shade, so the middle print is the subject (a print's own opacity is never changed); with a mouse, a pool of white light follows the pointer and the prints near it lift, turn to face it and catch a sheen. **The wash**: the well is tinted toward the strongest hue of the print in the middle (`src/data/photo-colors.json`, one middle-lightness colour per photo so each tints by the same amount; a black-and-white photo is grey and leaves the well alone). It is the one place a photo's colour leaves its print, and no text ever sits on it: the readouts and buttons keep their `--card` chips. **Zoom** runs from 60% (a contact sheet) to 160% by pinch, the + and - keys, or two round buttons bottom right beside "Fill the screen"; Ctrl + wheel stays the browser's. A filter scatters the prints that are down before the new kind is dealt. The full view develops in from a sheet of the print's own colour, its backdrop takes that colour, a sideways swipe steps on touch, and the table underneath follows to the print you stepped to.

## 7. Motion

House motion is **springs, in JavaScript**. `ui.spring(k, c, v)` in `src/scripts/kit.js` returns a stepper (stiffness, damping, start); the closing deck, the price hand, the dock highlight, the client sheet, the 404's knock and the About and Churches stages all run on it, so everything settles with a small overshoot instead of an ease-out. CSS uses `--ease` (`cubic-bezier(0.2, 0.8, 0.2, 1)`) for entrances and a springy `cubic-bezier(0.3, 1.5, 0.5, 1)` on hover.

- **The dock deals too.** A hand's cards spring out from the middle of the hand and fold together, quicker, when the pointer leaves (`kit.js`). A pointer passing through for under 90ms deals nothing.
- **Scroll deals the cards.** The hero hand of clients is dealt as you scroll (`home.js`), the closing deck gathers as you reach it, the poster name's letters rise out of their line in reading order, and a quote band opens out as it arrives. The large /work windows do not fly: each rises and straightens as it arrives, opacity stays at 1, and a filter carries the ones that stay to their new places (`work.js`).
- **A sector deals its own windows.** On the home ledger, reaching for a "Websites for:" word with a mouse or the keyboard deals up to three of that sector's client windows above it (`.lf` in `kit.css`, `home.js`), fetched on first use. It is a preview of the page the link opens, `aria-hidden`, off under 48rem and on touch, and Escape puts it away. Reduced motion: the cards fade in already fanned.
- **A marker on the key phrase.** A quote can name its key phrase (`highlight` in the study frontmatter, copied exactly out of the quote). In a quote band the client's paper sweeps in behind those words in five hard steps as the band arrives, and the words take the client's color and go bold: the band's own pair turned over (`.hl` in `kit.css`). No phrase set, no marker. Reduced motion, print and forced colors get the marked phrase with no sweep.
- **The dock knows the chapter.** On a case study the progress rail carries one tick a chapter (hollow, filled once passed, larger for the one you are in) and the chapter's name shows above the pill for about two seconds as you scroll into it (`.dk-spy`, the dock block in `kit.js`). Both are `aria-hidden` and never take a click; the name stays away while the keyboard is on something in the page.
- **The 404 is a drawing mid-edit.** "404" is an inline SVG outline with a square on every anchor point and handles on the zero (`src/lib/not-found-art.ts`). Ink outline, card fill, studio blue points. The points shake once on arrival, lean away from a mouse, and shake again on a press or when the window beside it stands up, then stop (`not-found.js`). Reduced motion: the still drawing.
- **Page changes** are cross-document view transitions (`@view-transition` in `kit.css`), not a router. Scripts simply run on load.
- **A window grows into its study.** Leaving for `/work/<slug>/`, the window you picked (the sheet's desktop pane if it is open, the Up next phone, or that client's window on screen) takes `view-transition-name: study-hero` in `pageswap`, and the study's desktop pane wears the same name, so one grows into the other on a spring (`hero-morph.js`, `study.css`). The pane is then simply in place and only the phone is thrown in. Back to /work it shrinks into its window again.
- **Grid and list trade places.** The /work view switch is one same-document view transition: window and row share a name for the moment, so each window folds into its row and back. Without `startViewTransition` the old rise and deal run instead.
- **Ink on the filter.** A pressed sector button blooms the pill's blue from the pointer (the centre from a keyboard), with a white copy of the label inside the circle, so every letter stays AA, and the bloom goes once the sliding pill is under it.
- **The capture settles as a card arrives.** On a What changed card the capture waits a little low and tilted (never hidden) and springs level, and a part-of-a-whole bar draws to its length.
- **Footage is fetched only when asked for.** A window's video has `preload="none"` and its address in `data-src`. It plays on hover, or on a touch screen while the window is centred, two at most; nothing is downloaded at load, and with Data Saver on nothing is fetched at all.
- **A name pulls its card.** Hovering or keyboard-focusing a name in the closing's selected work slides one white bar to that row and springs the client's card out of the deck, while the last card leans aside. A tap on a touch screen goes straight to the study. The letters of the poster name lift a little by the pointer, by transform only, so its width never changes.
- **Hover holds still.** A card that lifts can lift off the pointer, so `ui.stillHover` remembers where it rested and only lets go when the pointer is 40px outside that, or on another card. Home tiles, the price hand, the ninth card and footage all use it.
- **The receipt prints.** The receipt is clipped along its bottom edge while it feeds out of its slot a piece at a time (heading, four lines, footnote), the edge chasing each stop on a spring, and each line springs down into its row as its turn comes (`prices.js`). It prints whole the first time it comes on screen, when it started below it, and from the first changed line whenever the choice changes. The numbers are swapped as text, never counted, and at rest nothing is clipped.
- **A row drops out.** "Show on the receipt" sends a slip with the row's name and five-year total from the row down to the slot on a spring, shrinking as it goes in, while the page follows it; then the receipt prints.
- **The bars morph.** Switching the cost bars between 1, 3 and 5 years springs each part to its new length. A part that is nothing in a view leaves once it has shrunk.
- **The slip changes rows.** Picking a plan in "How soon you hear back" springs the slip from the row it was in to the new one.
- **The stub tears off.** Following "Start with X" under the quiz card swings the stub away from its perforation on a loose spring, lets it hang, then drops it, and the form opens with the tier chosen, all inside half a second. A new tab or a modified click goes straight there.
- **A reply arrives.** An opened FAQ answer grows out of its top corner with a small overshoot while the rows below make room.
- **The weeks fill and the steps draw as they arrive.** The filled dots fill left to right when the strip comes into view, and How it works draws each step's stretch of hairline and then its icon in order, the one drawing in the blue. Both run only when they start below the screen.
- **A page that loads already scrolled replays nothing.** After a reload or Back, the home deal and the /work windows are simply laid (`ui.restored()`).
- **The sent stamp.** After a send on /contact, a "Received" rubber stamp with the day's date, written plainly ("Nov 9, 2026"), presses onto the sent card on a spring: down from 1.6 times its size and a little more turned, landing with a small overshoot while a faint ring of ink spreads once. It is `--accent`, which clears AA on the card on both sides, and `aria-hidden`, because the heading already says the message arrived. A reload of `#sent` finds it already stamped.
- **About's cards turn over.** The four "Off the clock" cards turn on their vertical axis to a plain blue back when you press "Turn over" (a CSS 3D turn with the springy curve, about 750ms); focus moves to the back, and "Turn back" returns it. The bio's photo words raise a small fan of prints, each a few degrees apart, with a short rise. Under reduced motion the card simply shows its other face and the photos sit in a tidy pile with no fan.
- **The favicon turns over.** Come back to the tab after at least three seconds away and the N card in it flips once like a playing card, to its plain blue back and round to the N again, in about 600ms (`src/scripts/favicon.js`, frames drawn from `/favicon.svg` itself). The `.ico` is never touched.
- **The work shows its measurements.** On /work's list the window for a row lands on the house bounce. On a study, the sizing frame springs from one hero window to the other while the measured phone steps forward, the grid's bands grow down from the top one after another, a decision's lines and labels draw in under the pointer (a tap pins them, the switch shows them all), and the Walk the homepage window grows from 86% to full size as it reaches the middle of the screen, tied to the scroll.

- **The table drifts and the prints lean.** The light table deals its prints out from the middle on arrival (translate and scale on the house bounce, opacity never moves), drifts slowly on its own after a few seconds untouched, glides after a throw and settles, and while it moves each print leans a few degrees with the speed and the table eases back a touch, like paper slid across a desk. A print opens out of where it lay on a spring. Off screen or in a hidden tab the loop stops and films pause.

**Reduced motion stands everything down.** Under `prefers-reduced-motion: reduce`: the view transition is switched off, smooth scrolling is off, springs start at their rest value, the H1 words and the dock arrive in place, the hero hand is already dealt, the closing deck is already gathered and the poster name already dealt, a picked name jumps its bar and card with no spring, `[data-weigh]` headings stay put, `[data-build]` lines are simply set, the sent stamp is already stamped, the favicon never flips, footage never plays and the window stays on its poster still, the sheet and chip transitions are off, the dock's puck and hands go straight to their places, no window grows into a study and the grid and list simply swap, the filter's ink never blooms, the What changed captures are level and its bars drawn from the start, the receipt is whole from the start and swaps its lines with a brief tint and no feed, no slip leaves a cost row, the cost bars jump, the reply slip is simply in its new row, the stub never tears and the link is a plain link, an FAQ answer simply opens, and the weeks strip and the step icons are already filled and drawn. About's "Off the clock" cards swap faces with no turn, and its photo stacks are a static pile. `tests/reduced-motion.spec.ts` checks that nothing is still running a couple of seconds after load. The sizing frame jumps, the grid and the measurements simply appear, the list's window is swapped, and the walk window is full size from the start. The light table does not deal, drift, glide or lean (the arrow keys and buttons jump), its films stay on their posters, and a print simply opens.

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
