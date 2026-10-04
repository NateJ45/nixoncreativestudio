# Page agent brief (redesign 2026)

Shared by every page agent. Your own assignment is in your prompt; this file holds everything common. Read it fully, then `DESIGN.md`, `docs/redesign-2026/BUILD-NOTES.md`, `CLAUDE.md`, `.claude/rules/*.md` for the files you touch, and `docs/redesign-2026/00-synthesis.md`.

## Setup

1. Make your own worktree and branch off `redesign-2026`:
   `cd C:\Users\natha\Documents\Claude\Projects\internal\nixoncreativestudio && git worktree add _worktrees/<your-branch> -b <your-branch> redesign-2026`
   then `npm ci --no-audit --no-fund` inside it (several minutes; run it in the background and read the research while it runs). Work ONLY in your worktree. Never the main checkout, never a copy of a folder.
2. Local run, screenshots, axe, Lighthouse: `docs/redesign-2026/BUILD-NOTES.md` (use your assigned port; stop every server you start).
3. Git Bash on this PC loses backslashes in inline heredocs and rewrites path-like arguments: write helper scripts with the Write tool and run them as files; set `MSYS_NO_PATHCONV=1` for git/path arguments.
4. Research and mock-ups on disk (read-only, not in git): `C:\Users\natha\Documents\Claude\Projects\internal\nixoncreativestudio\_worktrees\redesign-2026\docs\redesign-2026\` has `mockups\d7a-carousel-contact-sheet` (hero carousel, assets, CSS), `d8-showreel` (directed showreel player, `assets\reel.min.js`, clips, `RATIONALE.md`), `d9-background-study`, `d1`, `d4`, `d6-atlas`, `d3-local-studio` (about/photographs), and the real-client captures in `baseline\screens`. Copy only the assets you need into `src/assets/...` (optimise them; real client screenshots only).

## Decisions already made by Nathan (constraints)

- Headline tagline stays: "I make websites that pull their weight." Bebas Neue is the logo and display face; serif italic is the second voice; one art-directed light theme (no dark mode); real logo (`Logo.astro`).
- Hero idea: a fanned, user-driven carousel of his sites (centre frame large and readable, smaller staggered frames, arrows, swipe, keyboard, no auto-advance), logo, name, what he does. Showreel-style directed videos belong on case studies; the home hero uses stills.
- FBCM (new build at https://fbcm-site.nathanjnixon86.workers.dev, finished, no placeholder content, only needs the domain cutover) is real church proof, labelled "Launching soon". Capture it from the workers.dev URL, never from www.fbcmuncie.org (still the old Wix site).
- Second Pres Chicago, Reid Design and Presbyterian Academy case studies are REFRAMED with honest status labels (not pulled): use `launchStatusLabel(cs.launchStatus)`; never present unlaunched or placeholder work as live proof. Never use the Crestview "doubled" claim. No invented testimonials, numbers or clients. The (256) phone number is intended.
- No Lenis or any smooth-scroll library: scrolling is the browser's own (Nathan, 2026-10-04; already removed from BaseLayout, the init script and package.json). Do not reintroduce one, and do not add scroll-jacking.
- Copy voice: warm, plain, specific; first person singular; no em-dashes; none of: delve, leverage, robust, seamless, crafted, bespoke, navigate (verb), "not just X, it's Y", fragment-then-pronouncement closers, hollow aphorism closers, adjective stacks. Copy comes from the CMS readers and committed fallback JSON (`cms/content/*.json`), already corrected by the content pass; change the JSON, not hard-coded strings, where a CMS entry exists. Identity strings from `getSite()`. Every internal link carries its trailing slash.

## Hard rules (from CLAUDE.md; each cost real time)

Server-rendered and route-cached pages (no `prerender`); nothing in the first viewport may start at opacity 0; reveals only below the fold and `.js`-gated; never import `emdash/ui` PortableText; colours from tokens, never hex (and `var(--link)`, never `var(--color-link)`); WCAG AA, Lighthouse accessibility 100; `{/* */}` comments in templates; `astro:page-load` scripts with dataset re-bind guards; every `mailto:` keeps its fallback; never submit a real form from a test; do not edit `PORTABLE:` files; do not touch the CMS schema or run any production write (cms:production-load, cms:tidy, admin): production data is Nathan's, with the lead, dry-run first. No new npm dependencies (ask the lead). Do not edit files owned by another agent: `Header`, `Footer`, `BaseLayout`, `globals.css` tokens and grounds belong to the foundation. Put page-specific styles in scoped `<style>` blocks in your own components. If you need a foundation change, make the smallest possible edit, say so in your report, and keep it in its own commit.

## Performance budget

Mobile Lighthouse median 95 or higher, no run under 90; LCP 2.5 s or better on the simulated phone (target 2.0 s); CLS 0; TBT under 100 ms; home JS under 100 KB gzipped (the foundation got it to about 10 KB at load; keep islands to what earns its cost); no render-blocking stylesheet links; the LCP image is a real `<img>` with `fetchpriority="high"`, explicit width and height, correct `sizes` and a modern format; everything below the fold `loading="lazy"`. Measure with the local production build as in BUILD-NOTES (3 runs, kill stray headless Chrome between runs) and report real numbers, before and after.

## Quality gates (run and report real output)

`npx astro check` 0 errors; `npm run lint` 0 errors; `npx prettier --check .` clean (run `prettier --write` on every changed file including md); `npm run test:unit` pass; `npm run sync-check`; update or add Playwright specs under `tests/` for your page (do not run them against the local server as the final gate: they target the ncs-ci preview via the PR CI; make sure they are correct by reading and by running locally against your dev server where that works with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:<port>`); axe 0 violations at 1440 and 390; no horizontal overflow at 320, 390, 768, 1024, 1440; 44 px touch targets; keyboard-only pass; JavaScript-off pass (content and contact path still work); reduced-motion pass. Take screenshots at 1440 and 390 (scroll through before full-page shots so reveals fire), LOOK at every one with the Read tool, and iterate until it is genuinely good: Nathan's complaint is that the old site felt generic, boring and AI-made, so every band needs its own composition, real work shown large, and no template cadence. Use the `impeccable` skill (Skill tool) for critique and polish; fix material findings until none remain, and report the critique's last score and any findings you left, with reasons.

## Docs are part of done

Update in the same commits: `CLAUDE.md` or `.claude/rules/homepage-and-pages.md` (what your page is now), `DESIGN.md` if you add a pattern, `docs/EDITING-GUIDE.md` if what the admin offers changed, `tests/routes.ts` if a route changed, the Colophon/Privacy text if tied to code, `README`. Keep CLAUDE.md under about 200 lines (detail goes in `.claude/rules/` or `docs/`).

## Finishing

Commit to your branch with clear messages ending in `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Do NOT push, open a PR, merge or deploy; the lead merges. Your final report (under 350 words, no em-dashes): branch and commit hashes, files changed, what the page now is (one paragraph), before/after screenshot paths, the gate outputs and Lighthouse numbers, the impeccable result, open questions and anything for Nathan to supply or approve (photos, quotes, numbers). If a hard rule or a decision blocks you, choose the safest default, document it, and carry on.
