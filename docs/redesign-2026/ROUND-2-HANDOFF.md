# Redesign 2026: where we stopped (handoff for the next session)

Written 2026-10-05, at the end of the first working stretch. Read this first, then `DESIGN.md`, then `docs/redesign-2026/00-synthesis.md`. The business record is in the vault note `_vault/clients/nixon-creative-studio.md` (decisions, `#nathan` tasks).

## The one-paragraph state

The redesign is LIVE on https://nixoncreativestudio.com. Round 1 (PRs #95, #96, #97, merged 2026-10-04) replaced the whole site. Round 2 (PR #98, merged 2026-10-05 01:12 UTC by Nathan's GitHub login) turned it up: a poster hero on deep ink, a live clip in the carousel's centre frame, a "change one fact" demo band, huge price numeral, full-bleed portrait, and no drawn red loops over images. Nathan's verdict on round 2: **"I like some things but it's not there yet."** He did not say which things. Round 1's verdict was that it still felt boring and generic. The next session starts by asking him exactly what he likes and what still feels flat, with the live site open (see "First question" below).

## What Nathan has decided (constraints, do not re-ask)

- Tagline stays: "I make websites that pull their weight." Bebas Neue is the logo and display face, with a serif italic voice. His real logo (`docs/redesign-2026/brand/`, SVG rebuilds in `src/assets/brand/`).
- One light theme (no dark mode, no toggle). No Lenis or any smooth-scroll library. No WebGL.
- A fanned, user-driven carousel hero of his sites (his own sketch), no auto-advance.
- Grounds are never plain cream: river contours, window light, the lamp-lit ink band.
- No drawn red china-marker loops over images (removed everywhere; the circled price on /services is over text and stayed, ask if it should go too).
- Showreel-style directed video belongs on case studies and now the home hero's centre frame; live motion of what really moves on his client sites (Stone Steps map, Reid room filling).
- FBCM's new build (fbcm-site.nathanjnixon86.workers.dev, finished, no placeholder content) is real church proof, labelled "Launching soon" until the domain cutover.
- Second Pres Chicago, Reid Design and Presbyterian Academy are reframed with honest status labels, not pulled. Never use the Crestview "doubled form submissions" claim, never invent testimonials or numbers. The (256) phone number is intended.
- "Keep the system, turn it up" (round 2 steer): bolder scale, colour, contrast and motion, with live motion/video and the interactive demo.

## What round 2 added (all live)

- `src/components/home/HomeHero.astro`, `HeroReel.astro`: poster tagline on `HERO_GROUND = ink` (switch to `paper` in `src/lib/homeWork.ts`; colours in `src/lib/heroGround.ts`); the carousel's centred frame plays a muted loop from `public/reel/home/manifest.json` (12 clips, about 240 KB desktop and 150 KB phone each), pause button, stills under reduced motion, data saver or no JS.
- `src/components/home/FactDemo.astro`, `src/scripts/factDemo.ts`, `src/lib/factDemo.ts`: a made-up church keeps its service time in one field and six places update; a "try to break it" slip; a page-by-page drift switch. 1.8 KB of script. Its words live in code, not the admin.
- `HomePrices.astro` (huge "$4,000" numeral), `HomeProcess.astro` (full-width timing line), `HomeAbout.astro` (full-bleed portrait), `HomeClose.astro` (poster close), `ProofSheet.astro` (plays the live Stone Steps clip).
- `Frame.astro`, `WorkPrint.astro`, `/work/` lead: the `pick` marker loop removed.
- `Header.astro` has an on-ink face (`headerOnInk` prop in `BaseLayout.astro`).
- Capture scripts for the clips: `scripts/brand/reel-director.mjs`, `reel-encoder.html` and friends; how to regenerate them: `docs/redesign-2026/reels-notes.md`.

## Numbers (round 1 live, 2026-10-04; round 2 measured locally 97 to 99)

Mobile Lighthouse, live: home 97 (was 84), /work/ 97, a case study 97, /services/ 98, /about/ 97, /contact/ 97; CLS 0; accessibility 100; best-practices 82 (Cloudflare jsd bot script, Nathan's toggle: `docs/redesign-2026/performance-handoff.md`). LCP 2.1 to 2.5 s live, short of the 2.0 s target. Table: `docs/redesign-2026/live-numbers.md`. Re-measure after round 2 (clips and ink hero were measured only locally: 97, 99, 99 and LCP about 1.9 s).

## First question for Nathan (do this before building anything)

Open the live home page with him and ask, one at a time: which parts he likes (the ink poster hero? the live clip? the demo band? the huge price? the full-bleed portrait?); which part feels most boring or generic; whether the bold ground and type are bold enough or too loud for a church board; whether any clip looks amateur. Ask for one reference site he wishes his looked like. The earlier research said the gap to his client sites is a single idea from the client's world (the FBCM building, the Stone Steps objects, the Reid paint chips): NCS still has contours and a contact-sheet table, but he may want something more personal.

## Ideas on the table that have NOT been tried on the live site

All six round-1 mock-ups are on disk (see "Archive" below), with measured numbers in `docs/redesign-2026/mockups/*/RATIONALE.md`:

- d4 type poster in full (vermilion, ink and bone palette, huge type everywhere, scroll-driven moments): the loudest option; Lighthouse 99.
- d6 atlas (the work as places on a hand-built SVG map; truth: most clients are outside Cincinnati; LCP 2.8 s, the slowest).
- d3 local studio (built around Nathan: his photographs, palette taken from his own photos). Needs a wider Cincinnati portrait and permissions.
- d5 one-fact demo (now live as the home band).
- d9 background study: ranked grounds. T8 window light and T5 river contours are live; T1 ink-green board and T6 letterpress are possible; T3 darkroom and T7 water were judged AI tells.
- More photography and people on the home page (the site is still thin on real photography: /photography has none, only the headshot and five personal photos).
- Showreel clips on more pages (case studies already have Stone Steps and Reid hybrids).
- Hero ground switch to `paper` is one line; the two dark bands (hero and demo) form one long dark opening: reorder or change the demo band's ground if it feels heavy.

## Known gaps and open items

- Process steps two and three have no real durations (only "6 to 10 weeks"); do not invent them.
- No client quotes exist; the proof is the work itself. Nathan owes quotes (Dave Corfman, Dr. Burnett, Mary Ann Stone), a wider Cincinnati portrait, photo permissions and event photos. Full list: the vault note's `#nathan` items.
- Production data: the copy, schema and case-study status load ran on 2026-10-04 (`docs/redesign-2026/content-production-plan.md`, restore bookmark recorded there). Remaining admin-only edits: FBCM media-library cover and Wix stack terms, Reid body beyond the designer note, a read of the Academy and Second Pres bodies, the older redirects and `cms:tidy` steps.
- Cloudflare decisions for Nathan: Bot Fight Mode and Web Analytics (about 18 best-practices points), `PUBLIC_WEB3FORMS_KEY` in the Build variables, the dead GA4 tag (the Privacy text says GA4 sets cookies).
- MP4 versions of the clips for older iPhones need an encoder Nathan would have to approve (those iPhones show the still).
- The shared CI Worker and database `ncs-ci` can be overwritten by any session; verify its state before trusting a CI preview (see `scripts/ci-dataset/README.md`: the from-scratch rebuild now builds first, drops and deploys back to back, and drops again once the new Worker is live).

## Safety rules learned the hard way

- Write scripts against production need `--yes` AND `NCS_PRODUCTION_WRITE=yes` (`scripts/cms/args.mjs`). Never put backticks, `$()` or markdown inside a shell string (write files with the Write tool): on 2026-10-04 an agent's backticked text ran a production load. Never test a guard against production (use `https://example.invalid`). The classifier refuses an agent authorising a CLI device login: Nathan does that himself. See `.claude/rules/live-writes.md` and the vault gotcha `backticks-in-a-shell-string-run-as-commands`.
- Do not merge a PR Nathan has not seen when the change is a design change: PR #98 was merged by his GitHub login before the preview review the session had planned; it is live.

## How to work on it

- Run and measure locally: `docs/redesign-2026/BUILD-NOTES.md` (dev server, production build under wrangler dev, screenshots, axe, Lighthouse, Windows traps).
- Shared agent brief and gates: `docs/redesign-2026/PAGE-AGENT-BRIEF.md`.
- Design system: `DESIGN.md` (tokens, type, grounds, bans). Rules by area: `.claude/rules/`.
- Page-by-page decisions: `.claude/rules/homepage-and-pages.md`.
- Research and audits: `docs/redesign-2026/A` to `E` reports and `00-synthesis.md`.

## Archive (not in git)

Screenshots, six rounds of mock-ups with their assets, the showreel prototype, the background study, baselines and the raw live measurements: `C:\Users\natha\Documents\Claude\Projects\internal\nixoncreativestudio-design-archive-2026\` (README inside). The text reports are also in this folder in git.

## Loose ends on this PC

- `_worktrees\page-about` and `_worktrees\page-services` hold about 122 MB each of locked files (restart, then `rd /s /q` both).
- Local worktrees and branches from round 2 that can be deleted (all merged in PR #98): `_worktrees\v2-nopick` (branch `v2-release`), `v2-hero`, `v2-reels`, `v2-demo`, and this handoff's `docs-handoff`.
