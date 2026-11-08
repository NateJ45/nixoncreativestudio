---
paths:
  - 'src/**'
  - 'tests/**'
---

# Accessibility

Loads when anything under `src/` or `tests/` is touched.

Target: WCAG 2.1 AA in both the light and dark themes. Every page currently sits at 100 Lighthouse Accessibility; preserve that bar. Verified with axe-core (the default rule set, which includes best-practice and `target-size` checks) on every route by `tests/a11y.spec.ts`, on Chromium and a WebKit iPhone. The `.github/workflows/lighthouse.yml` gate keeps accessibility at 100 on every build.

## Conformance target is AA, deliberately (not AAA)

AA is the standard for this site, by choice, in line with W3C's own guidance that AAA is not recommended as a blanket requirement for whole sites. The gap is small and intentional:

- **1.4.6 Enhanced contrast (7:1):** body text and headings are far above it. The soft grey (`--soft`, 6.2:1 on the page) and the studio blue on the page (6.5:1) clear AA and sit under 7:1; white on the blue is 7.1:1. Pushing the grey to 7:1 would change the calm of the page, and that trade was declined.
- **2.5.5 Target size (44px):** the dock links are 44px tall, chips are 48px. A few standalone text links still size to their text height, clearing the AA 24px rule (2.5.8); the inline-text exception covers links inside prose. `scripts/measure-tap-targets.mjs` is the manual 44px check.
- **3.1.5 Reading level / 2.4.9 Link purpose (link-only):** confident marketing copy and repeated "Read the case study" links do not meet the AAA bars.

If a token's contrast is ever changed, re-check it against AA (4.5:1 body, 3:1 large text and UI) and update `src/lib/kit-tokens.test.ts`; AA is the line that must not regress.

## Required patterns

**Landmarks and structure.** `BaseLayout` provides `<header>` (the top line), `<main id="main">`, the dock `<nav aria-label="Primary">` and a "Skip to content" link as the first focusable element. Each top-level `<section>` needs an accessible name, via `aria-labelledby` pointing at its heading (preferred) or `aria-label`. When `aria-labelledby` names a heading id, make sure the heading actually carries that id.

**Heading hierarchy.** One `<h1>` per page. Don't skip levels. Section headings are `<h2>`, subsections `<h3>`. A page's H1 is word-wrapped for the reveal, so it carries an `aria-label` with the plain sentence; keep the label in step with the visible text. Heading text describes the content, not its position.

**Cards and decoration.** `.pip` corner letters are `aria-hidden`. A `Tile`'s screen (image or video) is `aria-hidden` because the link carries a full label (name, host and hook). Decorative shapes and pseudo-elements are hidden from assistive tech.

**Forms.** Every input gets an associated `<label>`. Use native input types and `autocomplete` hints. Required fields get `required`. Errors are plain words in an element tied to the field with `aria-describedby`. The contact form is the reference: it works with no JavaScript (the browser validates; the script then sets `noValidate` and validates itself), groups choices in a `<fieldset>` with real radios, announces the question count through a polite live region, its "Your answers so far" phone is a plain summary that never talks over the field being typed in, and a "Check your answers" step (Change buttons named for their answer, "Not provided" for a skipped one) comes before Send. After a script submit, focus moves to the success heading. Field focus is an `outline`, not a `box-shadow` (Gotcha 11).

**Images.** Content images get a descriptive `alt`; filler like "Hero image" is not alt text. An image beside a heading that names the same thing gets `alt=""`. Give every image its real `width` and `height`.

**Interactive elements.**

- A modal is a native `<dialog>` opened with `showModal()` (the client sheet). Focus goes to Back on open and returns to the window that opened it on close.
- Hover and focus states must not be color-only. Pair color changes with movement, underline or a shape change.
- Prefer native elements: `<button>`, `<a>`, `<details>`, `<summary>`, `<input type="range">` (the before/after slider and the course line are real range inputs, so arrows, Home and End work).

**Color and emphasis.** Every pair is a token in `:root` of `kit.css` and is asserted in `src/lib/kit-tokens.test.ts`. A client's pair (`--c` with `--p`) is asserted in `src/lib/case-palettes.test.ts`, and this site's own text color on each client paper is checked too. Emphasis in a heading is weight (a `<b>` at 700 against a 500 lead). Colour alone never marks emphasis. Never thin a colour with opacity to make a grey; use `--soft`.

**Forced colors.** Windows High Contrast drops shadows and backgrounds, and a card is drawn with both. `kit.css` gives `.tile`, `.card`, `.pc-face`, `.chip` and `.dock` a real border under `@media (forced-colors: active)`; `tests/forced-colors.spec.ts` checks it. A new surface whose edge is only a shadow joins that list.

**Motion.** There is no Pause motion button; the client sheet's looping clip has its own pause. Motion stands down under `prefers-reduced-motion: reduce`: the view transition and smooth scroll are off, springs start at rest, footage stays on its poster, the word reveal and the dealt cards show their finished state (`DESIGN.md`, "Motion"). `tests/reduced-motion.spec.ts` checks that nothing is still running 2.5s after load. Footage and clips start only on hover, touch-centre or when scrolled into view, and a clip has its own "Play it" button, so nothing loops on its own for more than five seconds (WCAG 2.2.2).

**Mobile and safe areas.** The viewport meta carries `viewport-fit=cover`. The dock and the mailto toast add `env(safe-area-inset-bottom)`; a new `position: fixed` element at a screen edge adds the matching inset. Form inputs stay at 16px so iOS doesn't zoom on focus. There is one nav at every width (the dock), so there is no separate mobile menu to test.

**Language and metadata.** `<html lang="en">` and the document `title` and `description` come from `BaseLayout`. Pass `title` and `description` through every page.

## Before merging

Run Lighthouse (the CI run is authoritative; Gotcha 9) against any page you changed. Accessibility should stay at 100. Common regressions: `color-contrast` (a new color in a new context), `image-alt`, `label`, `link-name` and `button-name`.

Lighthouse can't catch everything. For structural changes, also do a keyboard pass: Tab from the address bar through every control. Each should be reachable, the focus indicator visible, the order logical, and the skip link first. Check the page at 320px, and with reduced motion on.

## Don't

- `aria-hidden="true"` on a focusable element (Tab still lands on it).
- `tabindex` greater than 0.
- Remove focus outlines without a clearly visible replacement.
- Use color as the only state cue.
- Add ARIA roles to native elements that already have the right role.
