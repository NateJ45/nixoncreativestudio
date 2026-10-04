# D2: The ledger and the one-page brief

Mock-up: `index.html` (static HTML and inline CSS, no JavaScript). Shots: `shots/home__1440__fold.png`, `home__1440__full.png`, `home__390__fold.png`, `home__390__full.png`. Built 2026-10-04.

## The idea, and why it fits these buyers

Nathan's world is a working session at a table that ends with one page both people sign, then a site where each fact is entered once. So the page is set like an account book: warm ruled paper with a red margin line, every total on a red or black double rule (the bookkeeper's mark for "this figure is final"), prices as one ledger sheet on a green-ruled columnar pad, the process as a drawn week scale, the brief as an actual sheet with two signature lines, and a deep green "binding" band where the measurements sit with their dates, including the one that is not good yet (84 live). The client work is shown the way a board member would audit it: legible crops of the real thing (Stone Steps' record board, its LiDAR climb, its records table; Theology Matters; FRT's library; MAS) beside two ledger columns, "what it does" and "what their team does alone". Church treasurers, nonprofit directors and board members already trust ledgers, estimates and signed briefs; this direction speaks their paperwork, and it makes the honesty rules from the synthesis into the look itself rather than a constraint on it. A red-pen italic is the human voice in the margin.

Headline: direction A, "Websites that keep their own facts straight.", with B's promise ("your next volunteer can run it") in the first sentence under it, plus the audience named in the fold. A is the only headline where the words and the graphic say the same thing: the record board beside it is a fact that keeps itself straight. B as the lede keeps the buyer's real fear in the first viewport.

## Type system

- **Instrument Sans** (variable, width 75 to 100 and weight 400 to 700, one 57 KB file) is the main voice. Headings at 76 to 84 percent width, tight tracking, so prices and figures read like a ledger total. Tabular lining figures are on site-wide so every column of numbers aligns.
- **Newsreader Italic** (one 65 KB file) is the second voice: the red pen. It never sets a heading; it writes margin notes ("Nothing gets designed until this is signed."), place lines under client names and the step durations.
- Small uppercase labels exist only as column headers in tables and ledgers (data labels), never as eyebrows above headings.
- Signature detail: the double rule. Under "straight." in the H1, under every price, under the last row of each ledger, under "redo." in the closing line.

## One theme or two

**Recommend a single light theme.** The idea is paper, rules and ink; a dark version turns the ledger into a generic dark UI and doubles the art-direction work (the FBCM and Reid precedent). The page already varies its grounds deliberately (paper, green pad, paper, deep green binding, darker paper, ledger green, ink footer), which is what dark mode was being used for. If Nathan wants dark kept, the green binding colours are the starting point, but I would not.

## Performance cost estimate (measured with Playwright, local static server, brotli on HTML)

| Item                   | Size                            | Notes                                                       |
| ---------------------- | ------------------------------- | ----------------------------------------------------------- |
| HTML with inline CSS   | 60.5 KB raw, **10.8 KB brotli** | No external CSS file                                        |
| CSS (separate)         | 0 KB                            | All inline; a real Astro build would split about 8 to 10 KB |
| JS                     | **0 KB**                        | No script at all; the real site adds only the mobile menu   |
| Fonts                  | **122 KB** (57 + 65)            | Two variable woff2 files, preloaded main face, swap         |
| Images, whole page     | **259 KB** (7 webp crops)       | All but the hero board are `loading="lazy"`                 |
| Images, first viewport | 8.5 KB                          | The 50K record board crop only                              |
| Full page after scroll | **392 KB** total                | Against 585 KB prod home today, Stone Steps 843, Reid 815   |

- First-load transfer (before scrolling): about 141 KB (HTML + fonts + board).
- **LCP element:** the H1 text at 1440 (measured 132 to 156 ms unthrottled locally) and the lede paragraph at 390 (100 to 120 ms). No image is a candidate for LCP; the hero image is 8.5 KB.
- **Can it hit LCP 2.0 s and 95+ mobile Lighthouse?** Yes, on the evidence: it removes both measured causes of today's LCP (the 245 KB WebGL bundle and the screenshot LCP element), ships no JS, and the LCP is server-rendered text waiting only on the font (swap). Expect mid to high 90s on the CI preview. Not measured with throttled Lighthouse yet, so treat that as an estimate; the remaining risk is the production-only Cloudflare scripts that already cost about 10 points (synthesis section 5), which no design fixes.
- CLS: fixed width and height on every image; fallback-font metric overrides should be added in the real build to keep swap shift at 0.

## Risks

1. **No church site is live proof.** The Work band is a race, a journal, a library and an embroidery shop. A church board looks for "people like us". FBCM's new build should join the ledger once it cuts over; until then the church buyer only gets the method (the service-time line) and Nathan's volunteer media work.
2. **Leans hard on Stone Steps.** Three of the page's images and the hero proof are one client. If Dave ever objects, the hero needs a second proof.
3. **Reads technical or dry** to a buyer shopping for looks; the photograph and the warm about band carry most of the warmth. A real photograph of Nathan at a table with a brief (see "Needs") would fix this better than any styling.
4. **Claims to confirm** (each written from the vault, worded narrowly): FRT "publish a change and it shows straight away" (purge-on-publish), Theology Matters "the audio follows" automatically, MAS "sees the change before she publishes" (live preview), "accessibility checks on every change" for client builds (true for the starter family; not checked for the WordPress builds), "Discounts, no".
5. **Process durations.** page_home.json gives only "an hour" and "the first month"; the six-to-ten-week total comes from the services FAQ. Strategy and build are drawn as one bar with no split because no real split exists. If Nathan has real per-step weeks, the timeline gets better.
6. The 84 row is honest but negative; it must be updated the day the gap closes, or it ages badly. The page promises that it will.
7. Detector advisories left on purpose: cream ground, ruled "stripes" and Instrument Sans popularity are the chosen world; 1px hairline plus soft shadow now appears only on the brief sheet.

## Nathan's complaints this answers

- **Generic:** the system comes from his own working objects (ledger, estimate, brief, red pen), not from a colour and an effect. No device mock-ups, no gradient, no WebGL.
- **Boring:** seven distinct bands, each a different composition and ground; the page is about 9,100 px at 1440, near the client-site lengths.
- **AI-sloppy:** no eyebrows, no stat-card triplet, no unproven claims; every number has a source or a date; no em-dashes; the italic-serif-accent-word hero tell was removed in critique.
- **Performance:** 0 KB JS, text LCP, 392 KB full page.
- **Short of the client sites:** it now has an idea from his world in the same way Stone Steps has the race's objects, and a second type voice.

## What it needs from Nathan

- A photograph of the real brief: his hand, a pen, a printed one-page brief on a table (the strongest possible hero or process image for this direction).
- Confirmation of the five narrow claims in Risk 4, and real week ranges per step if he has them.
- Permission from Dave (Stone Steps) to lead with the record board and records table.
- A decision on single theme.
- The FBCM launch date, to add the first church to the ledger.
- Later: two client quotes, which could sit as signed "receipts" in the ledger style.

## Three strongest

1. The price sheet: three published floors on double rules, one sheet on desktop, three slips on a phone; it looks like a document a treasurer would file.
2. The brief as a visible, signable page, plus the dated audit band that shows the 84 next to the 100s.
3. Work told as "what it does / what their team does alone", with legible crops of real data instead of browser frames.

## Three weakest

1. No church in the work, and the fold's proof is a trail race.
2. Warmth depends on one headshot; there is no photograph of Nathan working.
3. The week timeline is honest but thin (one bar, one launch window) because the real per-step durations do not exist in the content yet.

## Critique run (Impeccable)

Assessment A (design review, separate Sonnet sub-agent) and Assessment B (detector plus Playwright checks, separate Haiku sub-agent), then synthesis here. Fixed from the findings: audience named in the fold; hero pen note now speaks to churches; closing CTA no longer `href="#"`; ARIA table roles on article rows removed; brief rotation removed and its pen note no longer `aria-hidden`; invented preview-dot positions removed from the timeline and the bar labelled directly; timeline hidden under 760 px in favour of a vertical drawn timeline (it scaled to unreadable text); wide soft shadows removed from every object except the brief (detector "hairline plus wide blur"); red pen text on the ruled pad given a solid ground (3.6:1 contrast hit); close-band text moved from grey-green to the on-green ink; label sizes moved from em to rem (detector "6 px functional text"); nav tap targets enlarged; italic serif accent word in the H1 replaced by the red double rule. Left: "cramped" hairline section tops, uppercase table headers, heading line-heights under 1.3 (display type), cream ground and ruled lines (the chosen world).
