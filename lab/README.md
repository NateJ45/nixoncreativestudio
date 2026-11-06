# Motion lab

Prototypes, never for main as is. Footage is not committed; re-make it with `node lab/tools/film.mjs` and `node lab/tools/film-phone.mjs`.
Live at https://ncs-motion-lab.nathanjnixon86.workers.dev/deal/ (a separate noindex worker).

## Deal

`deal/` is a mock of the whole site in the current direction: a calm page, one studio blue (`--accent` in `kit.css`) for headline emphasis, primary actions and the closing panel, and every other color inside a client's phone browser window. Every route is here: home, work, churches, prices, about, start, the eight case studies, privacy, accessibility, colophon and the 404.

- `deal/kit.js` and `deal/kit.css` hold the shared parts: top line, floating menu, closing block, client sheet, windows and footage.
- `deal/study/_build.mjs` generates each case study from the repo's mdx. Edit it and rerun it rather than editing the output.
- The mock is plain HTML, CSS and vanilla JS. The shared chrome is built by script, the form has no inbox behind it, and Privacy, Accessibility and Colophon describe the site as it would be after a port to Astro. A real build needs the chrome in the markup and the live analytics and form wiring.

## Tools

- `tools/serve.mjs` serves `lab/` with byte ranges. Video needs them.
- `tools/sweep.mjs [url]` shoots every route at 1440, 390 and 320, and reports overflow and errors.
- `tools/verify.mjs [url]` runs axe on every route and client sheet.
- `tools/fps-check.mjs [url]` plays footage in Chrome and counts the frames presented. Footage is filmed at 60 fps.
- `tools/package.mjs` writes the deploy package. Test scratch and internal files stay out of it.

## Logo

`logo/` holds logo explorations: four N marks and two wordmarks. `logo/build.mjs` outlines the letters from `logo/fonts` and writes `logo/svg` and the page at `/logo/`. `logo/look.mjs` checks small sizes and `logo/motion.mjs` checks the animations. Nothing here is on the live site.
