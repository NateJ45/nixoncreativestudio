# D1: the contact sheet

Static homepage mock-up, 2026-10-04. `index.html` (no JavaScript), `assets/` (25 WebP files cropped from live captures and Nathan's own photos), `fonts/` (3 self-hosted WOFF2), `shots/` (screenshots). Capture and measurement scripts are in `_capture/` (run from MAIN so `playwright` and `sharp` resolve).

## The idea

A photographer judges his own work on a contact sheet: every frame from a job laid out as black film strips on paper, the edge of the film printed with what the roll was, and the keeper circled in red china marker. That is Nathan's working table, and it is also an honest way to show a web studio's proof: real frames of real, live client sites, printed big enough to read, with the facts printed on the film edge and nothing else. The system is four parts, used everywhere and never as decoration: **the strip** (a run of frames from one job, black rebate with sprocket rows), **the edge print** (client, place, year, address; only facts, so it doubles as the case-study ledger), **the caption** (what the frame shows: "Home page, phone", "The records board, built from the results") and **the pick** (one china-marker loop per strip, around the frame Nathan would choose from that roll; only the hero loop is drawn on, once, as the page opens). The page itself is the sheet: a warm fibre-paper ground, black strips laid on it, and two "darkroom" bands (prices, and the man himself) in film black. It fits these buyers because a church board member or nonprofit director never has to imagine the work from adjectives: the first screen is Stone Steps itself, the second band is four live sites with one plain fact each, and the prices and timeline are set as information, the way a lab price list or a darkroom timing sheet would be.

## Type

- **Bricolage Grotesque** (variable, 200 to 800, one 41 KB latin file): display, headings, UI, the edge print. Set heavy (700 to 750) and tight (-0.035em), max 6rem. It has a slightly ink-trapped, hand-cut character that reads as printed rather than corporate, and it replaces Bebas Neue entirely.
- **Newsreader** (roman 22 KB + italic 24 KB): body copy and the second voice. The italic carries the turn in each headline ("can run.", "won't have to redo.", "Four sites, all live today.") and the day-one quote, in china-marker red on paper.
- No monospace and no eyebrow labels. Uppercase appears only on the film (edge print and frame captions), where it imitates real edge print and carries facts.

## One theme or two

**One art-directed theme.** The idea depends on a paper ground with black strips laid on it and on deliberate darkroom bands; a dark-mode token swap would turn the sheet into black strips on black and destroy it. This follows the FBCM (2026-09-24) and Reid (2026-09-29) decisions. The ground still changes deliberately every band (paper, deeper paper, film black, paper, film black, paper, footer black) so it never becomes one wash.

## Performance cost estimate

Measured with Playwright against a local static server with Brotli on HTML (script `_capture/shoot.mjs`, 2026-10-04, cache disabled):

|                       | 390 px, DPR 2, first load (no scroll) | 390 px, after full scroll | 1440 px, after full scroll |
| --------------------- | ------------------------------------- | ------------------------- | -------------------------- |
| HTML (CSS inlined)    | 9.7 KB                                | 9.7 KB                    | 9.7 KB                     |
| CSS (inside the HTML) | about 4.5 KB of the 9.7               |                           |                            |
| JS                    | 0                                     | 0                         | 0                          |
| Fonts                 | 86.6 KB (3 files)                     | 86.6 KB                   | 86.6 KB                    |
| Images                | 210 KB (7 files)                      | 566.5 KB                  | 761.4 KB                   |
| **Total**             | **306.5 KB, 11 requests**             | **662.7 KB, 19 requests** | **857.6 KB, 19 requests**  |

Against the baseline: production home 585 KB with 140 KB of JS; Stone Steps 843 KB; Reid 815 KB. This mock-up moves about half as much on first load as any of them, with zero JS (the WebGL hero is gone). Scrolled to the bottom at 1440 it reaches 858 KB, about Stone Steps' first-load weight, because the sheet is mostly 2x screenshots; AVIF in the real build would take roughly a third off that.

- **LCP element:** the Stone Steps home-page frame in the hero (`ss-hero-800.webp`, 51 KB at 390; `ss-hero.webp`, 150 KB at 1440), marked `fetchpriority="high"`. Local, unthrottled LCP was 100 to 140 ms. Under Lighthouse's simulated Slow 4G the estimate is: HTML 9 KB plus the preloaded display font plus the 51 KB hero image, roughly 1.6 to 2.0 s. If it lands over 2.0 s, the fix is cheap and known: serve AVIF (about 35 percent smaller), drop the 1440 hero to a 1280-wide source, or let the headline become the LCP element by moving the strip a few pixels lower on phones.
- **Can it meet LCP 2.0 s and 95+ mobile Lighthouse?** Yes, likely, in an Astro build with `astro:assets` (AVIF + WebP, real `srcset`), no client JS on the homepage, the two fonts preloaded, and Cloudflare's production `jsd`/beacon scripts removed or deferred (they cost the current production home 10 points). CLS should be 0: every image has width and height. Not yet measured with Lighthouse; this is an estimate until the real build runs `lhci`.
- **Risks to the estimate:** the lazy images below the fold all use `loading="lazy"`, but Chrome fetched three of them on first load at 390 because they sit inside its lazy threshold; that is already counted in the 306.5 KB.

## Risks

1. **It leans on one client.** Stone Steps is the hero and the first job on the sheet. If Nathan has a better lead in a year, the hero changes, which the system handles (it is just a different strip), but today the page is a Stone Steps page for its first two screens.
2. **Screenshots age.** Every frame is a capture of a live site; when a client changes their site the frame goes stale. The real build needs a capture script on a schedule (the one in `_capture/` is the start of it) and a rule that a frame is re-shot before each deploy.
3. **The film motif could tip into costume** if it spreads to buttons, borders and icons. The rule must stay: strips hold only real frames, edge print holds only facts, and each strip has at most one marker loop.
4. **Long page.** 9,970 px at 1440 (10,640 px at 390), close to the client homepages (9,700 to 11,200) but twice the current home. Each band has one job, so it reads quickly, but the work band is long on a phone (four jobs, about 4,500 px).
5. **Claims to verify before launch:** "Live since Sept 2026" for Stone Steps (vault: live on the Worker since 2026-09-18), Richmond VA for FRT (vault says legal home), "Twelve marks ... came off the records board" (vault), "The old site said 10,726 feet" (from the live case study), FRT 100/100/100/100 "measured September 2026" (vault, 2026-09-17), Theology Matters 149 of 154 (vault).

## Which of Nathan's complaints it answers

- **Generic:** the whole page is built from one idea from his own world (the photographer's contact sheet), the same way FBCM is "the building" and Reid is "the work table". Nothing here is a blue wash, a device mockup or a WebGL field.
- **Boring:** seven bands, six grounds, and six different compositions (strip under a headline, a sheet of strips with notes, a price list, a timing sheet with a bracket, a portrait in the darkroom, a closing statement). Motion is spent once: the marker loop wiped round the pick in the hero (a clip-path wipe, so the content under it is never hidden; off under reduced motion).
- **Too little photography:** the first screen is three frames of a real client site; the about band is a large black-and-white portrait of Nathan with two personal frames.
- **Short of the client sites:** client work is shown at a size where its own type, ticket and records board are legible, and the case facts are specific and checkable.
- **AI-sloppy / honesty:** only live work is shown (Stone Steps, FRT, Theology Matters, MAS); no Second Pres, no Reid features, no Academy; no testimonials, no conversion claims, no "most projects land" badge; the Signature badge from the CMS is dropped.

## What it needs from Nathan

1. **Real photographs he took of client places and people** (a Stone Steps race morning, an FRT seminar, Mary Ann at her machine). The strips are built to hold photographs next to the screenshots; a strip that mixes "the site" and "the place" is the strongest version of this idea, and today only screenshots exist.
2. **Two or three written client quotes** with permission (Dave Corfman, Dr. Burnett, Mary Ann). There is a natural slot: a handwritten-style note beside each job. None is shown because none exists.
3. **The split of the six to ten weeks** between strategy and build. `cms/content/page_home.json` has no step durations; the only real numbers are "an hour" (step 1), "six to ten weeks, kickoff to launch" (`page_services.json` FAQ) and "the first month" (step 4). The mock shows a bracket over steps 2 and 3 instead of inventing a split.
4. **Confirm the portrait.** The black-and-white studio portrait is from the About page; if it is old, a current one in the same light would be better.
5. **A Care plan price**, if he wants it beside the three tiers (market research B, implication 6).

## Three strongest

1. The first screen is proof, not a promise: Stone Steps at a legible size, circled, with its facts on the film edge.
2. The system is cheap and strict: four parts (strip, edge print, caption, pick), zero JavaScript, 306.5 KB first load on a phone.
3. Facts as graphics: the price list, the timing sheet with its 6-to-10-week bracket, and the edge print that works as a case-study ledger.

## Three weakest

1. Screenshots of other people's sites are still the main imagery; without Nathan's own photographs of client places, the "photographer" half of the idea is carried only by the motif and one portrait.
2. The work band is long on a phone, and the 1440 crops (FRT, Theology Matters, MAS) show their small body text at about 0.55 scale, so only their display type is truly legible.
3. Prices, How it works and About carry the world only through grounds and type; they use no frames or edge print. That keeps them calm, but the idea is strongest in the top half of the page. A stricter build could print the tier names as edge print on a rebate rule, or set the portrait in a strip.

## Impeccable critique (dual-agent, 2026-10-04)

Method: dual-agent. Assessment A (design review) and Assessment B (detector, `impeccable detect --json`) ran as two isolated sub-agents. Browser overlay was skipped (static file, no dev server); the CLI scan ran. Persistence to `.impeccable/critique/` was skipped on purpose so nothing was written outside the mock-up folder.

Assessment A scored 20/28 (heuristics 7, 9 and 10 n/a): "Good". Verdict: the hero and proof sheet are authored for this studio; below them it read as "a well-typeset theme rather than a world", and the one-frame strips for FRT, Theology Matters and MAS were "a black mat, not a contact sheet".

Fixed after the critique:

- **P1** Strips lost their top padding under 1080 px, so the image covered the edge print on phones. Now only the notes lose it.
- **P1** One-frame strips. FRT now has two frames (home page plus the resource library), Theology Matters two (home plus an article page, moved into the strip), MAS three (phone, desktop, and Mary Ann on her own site). Each strip has its own pick.
- **P2** The pick loop was painted over by the sprocket row. Frames now sit above it (`.frames{z-index:1}`). The dash-based draw animation also failed with `vector-effect: non-scaling-stroke` (the loop rendered unfinished in captures); replaced with a clip-path wipe, hero only.
- **P2** No navigation under 1080 px. The four links now sit in a row under the header.
- **P2** "Read the case study", "How it was built", "Start a project", "See full pricing" and "More about me" pointed back into the page. They now go to the live URLs.
- Jargon for board members: "headless build" became "a build made for a large, deep site", Lighthouse is explained as "Google's Lighthouse checks on a phone", LiDAR became "USGS elevation data". Note: "headless" is in the published tier copy (`pricing_tiers.json`); Nathan decides.
- "$4,000" no longer carries both "from" and "+". The red big-number treatment of "100" and "149" (drifting toward the hero-metric pattern) is back to text size. The "Every build includes" chips became a plain list. The About h2 uses a proper visually-hidden class. Edge print fades at the strip edge instead of clipping mid-word. The timeline bracket now reaches the launch node.

Detector: 31 findings before, 23 after. Removed: tiny-text (4) and undersized-ui-text (3), caused by em-relative sizes inside clamp(); now explicit. Remaining, judged false positive or deliberate: cramped-padding (13, film strips and full-bleed bands), all-caps-body (5, edge print and frame captions, label length), italic-serif-display (3, the deliberate second voice), cream-palette (1, the paper token), repeating-stripes-gradient (1, the sprocket rows).

Not changed: "Let's build a site you won't have to redo." (A called it agency-generic; D's audit marked it as a kept line, so Nathan decides).
