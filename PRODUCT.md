# Product

## Register

brand

## Users

Decision-makers at small businesses, churches, schools, and nonprofits in the Cincinnati region, plus web clients further afield who find the studio online. They're often on a board, a staff team, or running the business themselves, evaluating Nathan as a potential vendor with a real budget and a real timeline. Their context when landing on the site is "I heard about Nathan / saw his work / met him in person, is this the right fit?" They want to understand the services on offer, see proof, and decide whether to start a conversation.

A secondary audience is other designers and creative peers who read the site as portfolio, not as sales material. They're useful for referrals and credibility but they're not the primary buyer.

The job to be done is quick, confident evaluation: see real work, understand services, sense the personality behind the studio, and either book a call or send an inquiry.

## Product Purpose

This is Nixon Creative Studio's home on the web. Nathan Nixon is the sole owner and operator: web designer, photographer, and brand strategist based in Cincinnati. Web design, strategy, and brand work serve clients anywhere; photography stays across the Cincinnati region.

The site is doing three jobs in equal measure:

1. **Drive qualified inquiries**: a steady flow of well-fit project requests from small businesses, churches, schools, and nonprofits.
2. **Build local credibility**: the trustworthy anchor people land on after meeting Nathan in person, at the chamber of commerce, or through a referral.
3. **Surface in regional search**: discoverable for queries like "Cincinnati web design," "Cincinnati church website," and "Cincinnati event photographer."

Success looks like steady inbound flow from the region, a portfolio that grows visibly over time, and a site that consistently reads as the same studio across the homepage, the case studies, and the photography gallery.

## Brand Personality

Warm, confident, grounded. The site should feel like someone steady and skilled who'd happily share a coffee, not a corporate agency, not a hobbyist, not a personality brand. Three-word personality: warm, confident, grounded.

Voice is conversational without being casual, professional without being stiff. Step-by-step explanations for non-technical readers (church volunteers, nonprofit staff, board members). No AI-tell phrases (delve, leverage, robust, seamless, "bespoke digital experiences"), no em-dashes, no filler openings or closings. Real specificity beats adjective stacks every time.

Emotional goal: visitors should leave feeling they've found a real person doing real craft for real local clients, and that working with him would be calm, clear, and on time.

## Anti-references

What this should explicitly NOT look like:

- **Generic agency vibe**: floating gradient hero blobs, abstract stock photography, "we craft bespoke digital experiences," buzzword copy, no actual client work visible above the fold.
- **Templated platform look**: Squarespace and Webflow-template defaults that signal "someone bought a theme" rather than "someone designed this." The site needs to read as bespoke without being self-consciously artisanal.
- **Over-minimal portfolio**: brutalist or stark-minimal portfolio sites that hide the services, omit clear next steps, and force the visitor to guess what the studio actually does.

Reference sites pulled in early research (kept as positive anchors, not slavish copies): Brittany Chiang v4, Gianluca Gradogna, Elliott Mangham, Olia Gozha. Each contributes a different thing: Chiang's clarity of hierarchy, Gradogna's restraint with color, Mangham's confident typography, Gozha's warmth, but the studio's own voice has to win, not the references.

## Design Principles

1. **Show, don't tell.** Portfolio work is the proof. Adjective-heavy copy ("thoughtful," "bespoke," "creative") loses to a real screenshot of a real church website for a real congregation. Every page should put the work in front of the talk.
2. **A calm page, a loud deck.** Professional without cold, confident without flash. The page is a quiet neutral with one studio blue and one typeface (Hanken Grotesk, a medium lead with a heavy phrase). Every other color belongs to a client and stays inside that client's own phone window. The motion is where the personality lives: client sites are dealt like cards as you scroll, headlines pick up weight, and everything settles with a little spring. It is purposeful and on-brand, never decorative noise, and it all stands down under reduced motion. Warmth is carried by real client work, real photography and plain-spoken copy, not by gimmicks. The rules are in `DESIGN.md`.
3. **Practice what you preach.** The site itself is evidence of the craft Nathan sells. If it's slow, off-brand, broken on mobile, or inaccessible, the pitch collapses. Every shipped change has to clear the bar Nathan would set for a paying client.

## Accessibility & Inclusion

Target: WCAG 2.2 AA for this site, in both the light and dark themes (audited 2026-11-08; detail in `.claude/rules/accessibility.md`). Every page currently sits at 100 Lighthouse Accessibility and that bar holds for every future change. Client builds are promised to "WCAG AA" in the site copy, a separate line.

Specific commitments:

- All interactive elements reachable by keyboard with visible focus indicators.
- Color contrast cleared for every token pair (the studio blue, the soft grey and each client's own pair), asserted in `src/lib/kit-tokens.test.ts` and `src/lib/case-palettes.test.ts`.
- Light and dark themes that follow the device until the visitor chooses one with the "Dark mode" or "Light mode" switch (in the dock on wide screens, in the closing band on every screen); the choice is remembered. Print always takes the light theme.
- Reduced motion respected: with `prefers-reduced-motion: reduce`, the page transition, the word reveal, the dealt cards, footage and weight changes all stand down and the page shows its finished state.
- Audience includes church volunteers, nonprofit staff, and board members; copy defaults to non-technical readers unless context makes peer-readability obvious.
- Skip link as the first focusable element, semantic landmarks (`<header>`, `<main>`, `<footer>`), proper heading hierarchy (one h1, no level skips).
- The floating dock is plain links, so the one nav works with no script and at every width.
