# Redesign 2026: synthesis (A to E, plus Phase 0 baseline)

Written by the lead session on 2026-10-04 from the five reports in this folder and the baseline in `baseline/`. Performance forensics (C) was still running when this was written; the budget below is provisional until `C-performance-forensics.md` lands.

## 1. Which of Nathan's complaints are true

| Complaint                      | Verdict                                                                                                   | Evidence                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generic                        | True, for a specific reason                                                                               | A: no idea drawn from Nathan's own world. One blue, one free display face (Bebas), a WebGL backdrop and browser mock-ups that could front any studio. Each client site is built on one idea from the client's world (FBCM: the building; Stone Steps: the race's objects; Reid: the paint-chip table).                                                                          |
| Boring                         | True                                                                                                      | A: every band uses the same grammar; homepage is 5,362 px against 9,700 to 11,200 px on the client homepages; the last 1,700 px of light mode is one pale-blue wash; four things move at once in the first screen.                                                                                                                                                              |
| AI-sloppy                      | Partly true                                                                                               | The detector finds 4 minor issues, none on the home page; the June tells are fixed. The sloppiness left is unfinished surfaces (/photography empty, /journal empty, two placeholder panels on /services), a duplicated case-study title, mono-uppercase label scaffolding, a developer terminal card, and repeated stock phrases ("front door" 21 times, "start to finish" 14). |
| Performance below his standard | Not supported, with one caveat                                                                            | Baseline: CI preview home 94 (LCP 2.9 s), production home 84 (LCP 4.0 s). His own client sites score 86 (Stone Steps, 843 KB) and 83 (Reid, 815 KB). The studio home is at or above both. Production is 10 points under the CI preview; that gap is the one real performance problem (see C).                                                                                   |
| Far short of the client sites  | True on art direction, photography and memorability; not true on type scale, accessibility or engineering | A: measured h2 sizes match; FBCM comparison in the first baseline used the old Wix site by mistake.                                                                                                                                                                                                                                                                             |

New finding that matters more than any of the above (D, verified by me with curl on 2026-10-04): the site's honesty is its biggest problem. secondpreschicago.org serves Squarespace (168 "squarespace" markers) yet leads the home hero as "Live". reiddesignllc.com `/calculator/` and `/quiz/` redirect to `/services/`, `/journal/` and `/shop/` redirect home, though the Reid case study describes them. The Presbyterian Academy case study describes placeholder content as real. "Every project here is a real, shipped site" is false today. The Crestview "doubled form submissions" figure has no source anywhere (vault, repo, archive). No testimonial exists for Nathan. A redesign that polishes these claims makes the risk worse, so fixing them is part of the redesign.

## 2. Ranked causes of "generic, boring"

1. No concept of its own and no DESIGN.md (A1).
2. A photographer's site without photographs where they matter: /photography, two /services panels, hero photo slot commented out (A2).
3. Client work shown too small to read, and faded behind the headline on phones; the lead screenshot is a site that is not live (A3, D).
4. Too much motion in the first screen, none of it meaningful (A4).
5. One section grammar repeated; empty right halves; one-hue light-mode tail (A5, A6).
6. Case studies read like developer write-ups; no large hero image, no ledger, no numbers (A7, E).
7. Developer props aimed at a church board (terminal card, Lighthouse dial) (A8).
8. Copy: stock-phrase repetition, "we" in a one-person pitch, overclaims (D).
9. Conversion plumbing: no mobile CTA outside the home page, home title and H1 have no "Cincinnati web design", no landing pages for church, nonprofit, school or event photography, no conversion events, CTA links missing trailing slashes (E).

## 3. What to keep

Stone Steps as lead case study and the asymmetric one-large-two-medium Selected Work; published price floors and the hairline tier layout; the four-step process content with real durations; the About story and its real photographs; the before and after slider; the engineering floor (AA token split, reduced motion, `.js`-gated reveals, server-rendered hero copy); `/contact` "what happens next"; the footer "Currently: Booking projects"; the lines D marked as kept ("the person you meet on day one is the same person who hands you the finished site", "Let's build a site you won't have to redo.").

## 4. Positioning (from D, adjusted)

Nixon Creative Studio builds websites for churches, nonprofits and small organizations that the people already there can run and keep accurate. Nathan plans, designs and builds each one himself, enters each fact once so it cannot drift, and hands over a site the client owns, with the backups and accessibility checks small organizations rarely get.

Best-supported buyers: small nonprofits and event organizers (Stone Steps shape), then scholarly and church-adjacent publications (FRT, Theology Matters), then churches. Headline candidates from D: "A website your next volunteer can run." (recommended), "Websites that keep their own facts straight.", "One person plans it, builds it, and still answers the phone next year." (hold until Nathan has two client quotes).

Honest limits (do not claim in any mock-up): "every site photographed by me", "sites that score 100" in general (only accessibility 100 is gated; the studio home is 84 on production, 94 on the CI preview), any conversion or lead outcome, "most projects land at $7k to $11k", "around Cincinnati" for the whole portfolio, Crestview "doubled", any testimonial.

## 5. Provisional performance budget (final numbers after C)

Targets from the brief: mobile Lighthouse 95+ on the CI preview, LCP 2.0 s or better throttled, CLS 0, TBT under 100 ms, home JS under 100 KB gzipped, first-load transfer no larger than the best client site (Stone Steps 843 KB, Reid 815 KB), accessibility 100.

Known costs today (baseline): `HeroCanvasInner.js` 245 KB (WebGL), hero device screenshots are the LCP element (load delay 38 percent, render delay 37 percent of LCP), production-only Cloudflare `jsd` and beacon scripts (best-practices 82 vs 100 on CI), home Playwright capture 2.6 MB with 1.8 MB of images. A design whose hero depends on WebGL or on a large screenshot LCP element cannot meet 2.0 s; that is the measured argument for dropping the WebGL hero, to be confirmed by C's block-one-class table.

## 6. Constraints every mock-up must respect

- Real client screenshots only (from `baseline/screens/` or `src/assets/case-studies/shots`), real copy, no invented numbers, quotes, clients or awards.
- Work that is not live (Second Pres Chicago, Reid's removed features, Presbyterian Academy placeholders) is not shown as live proof. Lead proof: Stone Steps, Foundation for Reformed Theology, Theology Matters, MAS Monograms (check each is live and presentable before using it), FBCM new build (not yet cut over; label honestly or leave out).
- Light and dark are both required by the current site; A recommends a single art-directed theme (FBCM and Reid dropped dark mode). Each direction states its position on this; Nathan decides.
- Nothing in the first viewport starts at opacity 0. Tokens, not hex, in the real build. WCAG AA.
- Voice: warm, plain, specific. No em-dashes. No banned words or patterns (delve, leverage, robust, seamless, crafted, bespoke, "not just X, it's Y", fragment-then-pronouncement).

## 7. Update from C (performance forensics, 2026-10-04)

Full report: `C-performance-forensics.md`. 214 valid Lighthouse runs, round-robin against a same-session control.

- **Correction to section 5.** The baseline's 2.6 MB capture, 245 KB WebGL chunk and 1.8 MB of images were a desktop load (the Playwright device preset did not exist and fell back to 1280x720). On a phone the WebGL canvas never loads (`client:media >= 1024px`), and blocking it changed nothing (within noise). WebGL is a desktop cost and a design-fit problem, not the cause of the mobile score.
- **What actually moves mobile LCP** (median delta against control): React island JS (about 110 KB) -896 ms and +8 points on production home; Cloudflare beacon plus jsd (production only) -467 ms and +4 points; inlining the three render-blocking stylesheets about -1 s on the CI home (n=5, bimodal). Lenis, the marquee and fonts are not costs. Observed LCP is about 0.3 s and TBT is 0 to 21 ms; the cost is bytes and render-blocking CSS and JS in front of the LCP paint.
- **A zero-JS floor reaches 95 and 2.7 s on production.** All three mock-ups are zero-JS static pages, so they sit near that floor by construction. The real build must keep islands to the few that earn their cost.
- **Not proven:** why production loses more from JS than the CI preview. LCP is bimodal on this machine (about 2.7 s or 3.6 s).
- **Budget to design toward** (details in C): median mobile score 95 or higher with no run under 90, LCP 2.5 s or better on the simulated profile, inline critical CSS, no render-blocking stylesheet links, island JS only where interactivity pays for itself. The 2.0 s LCP target is at the edge of what this machine can show; report honestly.
