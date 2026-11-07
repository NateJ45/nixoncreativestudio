# Motion lab

Prototypes, never for main as is. Footage is not committed. Bring it back from the deployed lab with `node lab/tools/pull-assets.mjs`, or re-make it with `node lab/tools/film.mjs` and `node lab/tools/film-phone.mjs`. Always have it on disk before packaging: a deploy without it deletes it from the worker.
Live at https://ncs-motion-lab.nathanjnixon86.workers.dev/deal/ (a separate noindex worker).

## Deal

`deal/` is a mock of the whole site in the current direction: a calm page, one studio blue (`--accent` in `kit.css`) for headline emphasis, primary actions and the closing panel, and every other color inside a client's phone browser window. Every route is here: home, work, churches, prices, about, start, the eight case studies, privacy, accessibility, colophon and the 404.

- `deal/kit.js` and `deal/kit.css` hold the shared parts: top line, floating menu, closing block, client sheet, windows and footage.
- The deck, in `kit.css` and across every page: a card is lettered or numbered in two opposite corners with `.pip`, the far one upside down, with no suits (`L`, `S`, `F` for the tiers, `+` and the minus sign on About, question numbers on Start). `.label` is the small label voice for figures and facts, still Hanken with tabular numbers. `.giant` is the one big line on a page, sized in `cqw` from `--fit` and `--fitm` on the element; `[data-weigh]` makes it gain weight on scroll. `ui.priceHand(el)` deals the three price cards. Anything that is not a card, like tables, FAQs and contents lists, is ruled with hairlines rather than boxed.
- `deal/study/_build.mjs` generates each case study from the repo's mdx. Edit it and rerun it rather than editing the output.
- The mock is plain HTML, CSS and vanilla JS. The shared chrome is built by script, the form has no inbox behind it, and Privacy, Accessibility and Colophon describe the site as it would be after a port to Astro. A real build needs the chrome in the markup and the live analytics and form wiring.

## Tools

- `tools/serve.mjs` serves `lab/` with byte ranges. Video needs them.
- `tools/sweep.mjs [url]` shoots every route at 1440, 390 and 320, and reports overflow and errors.
- `tools/verify.mjs [url]` runs axe on every route and client sheet.
- `tools/fps-check.mjs [url]` plays footage in Chrome and counts the frames presented. Footage is filmed at 60 fps.
- `tools/pull-assets.mjs [url]` copies footage and captures back from the deployed lab. Files already on disk are skipped.
- `tools/package.mjs` writes the deploy package. Test scratch and internal files stay out of it.

## Logo

`logo/` holds logo explorations: four N marks and two wordmarks. `logo/build.mjs` outlines the letters from `logo/fonts` and writes `logo/svg` and the page at `/logo/`. `logo/look.mjs` checks small sizes and `logo/motion.mjs` checks the animations. Nothing here is on the live site.

## Fonts

`fonts/` is a switcher that shows the homepage in eight font pairings through `/deal/?type=<option>`. `fonts/cold.mjs` loads the homepage in a fresh browser each run, which is how the stuck-windows bug showed up.

## Working wordmark

The name in Hanken Grotesk, with Nixon bold, is the working wordmark. `tools/wordmark.mjs` writes the outlined SVGs and favicon in `assets/brand/`. `logo/name/` and `logo/skyline/` are shelved explorations and are not deployed.
