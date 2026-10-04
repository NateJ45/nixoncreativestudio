# Direction 3: Warm local studio, built around Nathan

Mock-up: `index.html` (static HTML, inline CSS, no JavaScript). Screenshots: `shots/`. Build scripts: `_scripts/` (client captures, asset builder, screenshots and transfer, Lighthouse). Raw captures used for crops: `_raw/` (review only, not shipped).

## The idea

**Introduced in person.** The page behaves like the first meeting: you see Nathan's face before anything else, he tells you in one sentence what working with him is like (the line the audit kept, "the person you meet on day one is the same person who hands you the finished site"), and then he shows you four sites you can visit today, the life outside the studio, the prices and the steps. Every annotation is a real fact typed in a typewriter voice: a URL, a race bib, a duration. The buyers (a church administrator, a nonprofit director, a race organizer) mostly arrive by referral or after meeting him (B: 59 percent of small-business owners would pick someone they know). For that buyer the site's job is to confirm the person, so the person carries it: a large real portrait first, a real biography in the middle, and Cincinnati as the setting. Cincinnati shows up through Mt. Airy Forest and Stone Steps, Crestview, the 2017 move and the race-day bib. The palette comes from his own photos rather than from a web-studio colour: the teal T-shirt he wears in two of them, the orange of his sunglass lenses, the race-day sky and picnic blanket, the caboose ochre, all on a warm print-paper ground.

## Type system

- **Besley** (variable, roman and italic) does the display work. It is a Clarendon revival: sturdy, warm and a little Victorian. Cincinnati's own 19th-century print shops would have set it, and it holds together in the way the engineering story promises. Its italic is the **second voice**: Nathan speaking (the hero's payoff phrase, the ledger line, the tier notes, the pull line in the story). After the detector flagged italic display as a tell, it appears in one headline only.
- **Schibsted Grotesk** (variable) handles body and controls. It is a newspaper-born grotesque, plain and local, with a normal zero. Atkinson Hyperlegible Next was tried first and dropped: its slashed zero made "$4,000" look like code.
- **Courier Prime**, 400 only, is used only for real annotations: site URLs, photo captions with real details, step durations and the "Currently" label. It is never used for headings, eyebrows or buttons.
- There are no eyebrows or kickers above headings, and no section numbers.

## One theme or two

**Recommend a single light theme.** The idea is paper, prints and daylight photographs; a dark variant would be a token swap of a world that was not designed to be dark. That is the same reasoning by which FBCM (2026-09-24) and Reid dropped dark mode. The page already has its own dark moments: the ink "who" band, the teal Signature tier and the teal footer. Do not ship a theme toggle. The current site's dark mode and its three-state toggle would be retired. That is Nathan's call, since PRODUCT.md currently requires both themes.

## Performance cost (measured on the mock-up)

Measured with Playwright over a local gzip server (`_scripts/shoot.mjs`, `shots/transfer.json`), and with Lighthouse mobile (default simulated Slow 4G, 4x CPU, 3 runs, `_scripts/lh.mjs`, `shots/lighthouse-mobile.json`).

|                                    | HTML (incl. inline CSS) | CSS               | JS  | Fonts  | Images | Total      |
| ---------------------------------- | ----------------------- | ----------------- | --- | ------ | ------ | ---------- |
| 390, first load (before scrolling) | 9.9 KB gz (44.6 raw)    | inline, 4.2 KB gz | 0   | 138 KB | 163 KB | **311 KB** |
| 1440, first load                   | 9.9 KB                  | inline            | 0   | 138 KB | 204 KB | **352 KB** |
| 390, scrolled to the end           | 9.9 KB                  |                   | 0   | 138 KB | 437 KB | 585 KB     |
| 1440, scrolled to the end          | 9.9 KB                  |                   | 0   | 138 KB | 546 KB | 694 KB     |

The first load is lighter than today's production home (585 KB, 140 KB of it JS), and lighter than Stone Steps (843 KB) and Reid (815 KB).

**Lighthouse mobile, all 3 runs identical:**

- Performance 99, Accessibility 100, Best practices 100, SEO 100.
- LCP 2.0 s, FCP 1.4 s, CLS 0, TBT 0 ms. 345 KB transferred.
- It meets the brief's 95+ and LCP 2.0 s targets, but only just on LCP.

**Getting there took four measured fixes:**

| Step                                                                                    | Perf | LCP   | CLS   |
| --------------------------------------------------------------------------------------- | ---- | ----- | ----- |
| First run                                                                               | 96   | 2.3 s | 0.103 |
| After `font-display: optional`                                                          | 99   | 2.3 s | 0     |
| After smaller responsive variants, removing the body-font preload, and adding a favicon | 99   | 2.2 s | 0     |
| After an art-directed 720 x 576 mobile crop of the portrait                             | 99   | 2.1 s | 0     |
| After `fetchpriority=low` on every non-hero image                                       | 99   | 2.0 s | 0     |

- **LCP element:** the hero portrait.
  - Phones: `nathan-wide-720.webp`, 18 KB.
  - Desktop: `nathan-720.webp` or `nathan-960.webp` from the srcset, 29 to 41 KB.
  - It is preloaded per media query, and there is no render-blocking CSS file and no JS.
- **Trade-off:** with `font-display: optional`, a first visit on a very slow connection can show Georgia and Segoe UI until the next page view. A size-adjusted fallback with `swap` is the alternative if Nathan prefers the brand face always.
- **Remaining wins:**
  - Subset Besley and Schibsted to the glyphs used: 138 KB could drop to about 90 KB.
  - Use AVIF for the work crops (the Stone Steps feature is 155 KB at 1760w).
- **Risk:** the real Astro build adds the header script, analytics and Cloudflare's injected beacon (the source of the 10-point production gap in the baseline). With LCP at 2.0 s, there is no slack left for anything on the critical path.

## Risks

- **It depends on one good photo of Nathan.** Only the headshot is hero-grade (1200 px square). At 1440 it is cropped tight, almost passport-close. A wider, newer portrait taken in a Cincinnati place, ideally at work with a client, would make the direction.
- **Photos too weak to carry a hero:**
  - family (720 x 1080: too small, and an identifiable child)
  - wedding (1079 x 720, soft, not taken by Nathan)
  - running (phone snapshot in a parking lot)
  - exploring (a selfie in sunglasses)

  They work as small captioned prints in the "who" band and nowhere larger. The black-and-white portrait (1600 x 1280) is strong but moody; it is a second-band image, not an opener.

- **Personal photos of his children and wife on a sales page** are a privacy decision for Nathan and his wife.
- **A personality-led page can read as "freelancer" to a board** that wants continuity (the WCP objection). The prices, the "whatever the price" list and the handover guide are there to answer that. A Care plan line would help.
- **The structure** (hero, work, about, prices, steps, CTA) is conventional. What makes it his is content, not layout. Critique A scored it about 70 percent specific.
- **Claims to confirm before launch:**
  - that "Accessibility checked before launch and on every change I make" and "Backups that run on their own, and get checked" hold for the WordPress sites (FRT, Theology Matters) as well as the custom builds
  - "five to seven pages" for Launch (D's proposed wording)
  - that the race-day caption details (Queen City Running, Parkinson's Steady Strides 2024, read from the bib and shirt) are right
- **Photo credits:** none of the personal photos is credited. The wedding and portrait photos were taken by someone else, so they need credits.

## Nathan's complaints, addressed

- **Generic:** the identity comes from his own photographs and life (palette, captions, story), not from a studio colour or an effect.
- **Boring:** the page has seven grounds in sequence (paper, soft paper, ink, sky, paper, persimmon, teal), one composition per band, and a page of about 7,900 px at 1440 against 5,362 today.
- **Too little photography:** six real photographs of him, with the largest first.
- **No idea of its own:** "introduced in person", carried by the kept line.
- **Short of the client sites:**
  - The work shows at legible size, as real crops at near 1:1 rather than device mock-ups.
  - There are four live clients with plain titles and checkable links.
  - No WebGL, no motion, no developer props.

## What it needs from Nathan

1. A new environmental portrait in Cincinnati (wider framing, 2400 px or more), plus one or two photos of him working with a client: at a table, on a shoot, at the Crestview booth.
2. Any real Cincinnati frames he has shot (Mt. Airy at Stone Steps, a church interior) for a "the place" moment. There is currently no city image.
3. Permission to show the family photos, and credits for the wedding and portrait.
4. Two or three written client quotes with permission: Dave Corfman, Dr. Burnett, Mary Ann Stone. The page uses none, because none exist. With them, a "what they say" strip slots in under the work.
5. Confirmation of the claims listed under Risks, and of the first hour being free and without obligation (taken from the current "first conversation is free").
6. A scan of his real signature, if he wants a sign-off. A handwriting font was deliberately not used.

## Strongest three

1. The first screen is a real person, large, with the best line on the current site as the headline and one clear free first step.
2. The work is legible and verifiable. Stone Steps is shown at near real size with a fact ledger and the live records board, and three more live sites have plain titles and links.
3. The "who" band: the real story (camera, 2020, Edinburgh, Crestview, 2017, 2022) and real photographs, captioned with real details.

## Weakest three

1. The headshot is cropped very tight at desktop width. The direction is only as good as its portrait, and no wide environmental portrait exists yet.
2. Cincinnati is mostly in words. There is no photograph of the city or of Nathan at work in it.
3. The page skeleton is conventional. The idea lives in content and art direction, not in a structural invention like Stone Steps' tickets or Reid's paint chips. The process track, with step widths sized to their real durations, is the one structural idea.

## Impeccable critique: findings fixed

Critique A (design review) and B (detector plus browser) ran as two isolated sub-agents.

**Fixed:**

- An unattributed quote in quote marks became a plain sentence in Nathan's voice.
- The three CTA labels were unified to "Book a free first hour" / "Book a free hour", the CTA goes to /contact/, and a line under it states the cost (free) and the outcome (a brief and a ballpark).
- The ambiguous short headline was restored to the full kept line.
- The hero was tightened so the CTA sits in the first screen at 1440 x 900.
- The duplicate Stone Steps image in the hero proof was replaced by its phone view.
- The records board crop was made legible at 390.
- Courier was removed from the ledger labels and the email line.
- The tier notes were reworded (no upsell tone, no repeat).
- Italic display was cut from three headings to one (the detector's italic-serif-display finding).
- Link and nav tap targets were raised.
- The header overflow at 390 was fixed.
- The process track columns were rebalanced.

**Kept on purpose:**

- the cream ground (the brief asks for warm paper)
- cramped-padding on full-bleed sections (a false positive)
- inline text links under 44 px (exempt)
