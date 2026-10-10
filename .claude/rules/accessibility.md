---
paths:
  - 'src/**'
  - 'tests/**'
---

# Accessibility

Moved out of CLAUDE.md. Loads when anything under `src/` or `tests/` is touched.

Target: WCAG 2.1 AA in both light and dark modes. Every page currently sits at 100 Lighthouse Accessibility; preserve that bar. Verified with axe-core (WCAG 2.0 A + AA, 2.1 AA) across every page in both themes: zero violations. The `.github/workflows/lighthouse.yml` gate keeps accessibility at 100 on every build.

## Conformance target is AA, deliberately (not AAA)

AA is the standard for this site, by choice, in line with W3C's own guidance that AAA is not recommended as a blanket requirement for whole sites. AAA is not targeted because a few of its criteria pull against a brand-led design, and the gap is small and intentional, not an oversight:

- **1.4.6 Enhanced contrast (7:1):** the accent-toned tokens clear AA but sit just under 7:1 by design, to keep the NCS-blue identity vivid: `--link` `#2A6FB0` on white (5.25:1), `--muted-foreground` `#5F6573` on white (5.84:1), white-on-`--accent` buttons (~4.7:1), footer sky-on-navy (~6.5:1). Body text and headings already exceed 7:1. Pushing these to 7:1 would mean darkening the brand blues; that trade was declined.
- **2.5.5 Target Size (44px):** on phones the interactive controls (hamburger, mobile-nav close + social + theme toggle, back-to-top, copy-email button, before/after handle, carousel arrows + dots, footer links) are sized to the 44px comfort target, so the AAA bar is effectively met on mobile. A few standalone text links (the wordmark, the hero "See the work" link, the footer email link, the decorative client marquee) still size to their text height (24-34px); they clear the AA 24px rule (2.5.8) and the inline-text exception covers links inside prose. A mouse-driven desktop deliberately keeps its tuned compact density: footer link tap-height and copy-email sizing are gated on `pointer: coarse`, so every touch device (phone and tablet, including iPads) gets the 44px targets while a desktop with a mouse stays compact. Gating on input type, not screen width, is what keeps tablets covered.
- **3.1.5 Reading Level / 2.4.9 Link Purpose (link-only):** confident marketing copy and repeated "Read the case study" links don't meet the AAA bars.

If a token's contrast is ever changed, re-check it against AA (4.5:1 body, 3:1 large/UI) in both themes; AA is the line that must not regress.

## Required patterns

**Landmarks and structure.** `BaseLayout` provides `<header>`, `<main id="main">`, `<footer>`, and a "Skip to main content" link as the first focusable element. Each top-level `<section>` needs an accessible name, via either `aria-labelledby` pointing at its heading (preferred when there's a visible heading) or `aria-label="..."` (for sections without one). When using `SectionHeading`, always pass `headingId="..."` so the parent's `aria-labelledby` actually resolves; without it, the reference points at nothing.

**Heading hierarchy.** One `<h1>` per page (usually inside the hero). Don't skip levels. Section headings are `<h2>`; subsections inside them are `<h3>`. Heading text describes the content, not its position ("How we work", not "Section 5").

**Forms.** Every input gets an associated `<label for="...">`. Use native input types (`email`, `tel`, `url`) and `autocomplete` hints so browsers and password managers help. Required fields get `required`. Error containers get `role="alert"`. The contact form is the working reference pattern.

**Images.**

- Content images: descriptive `alt`. "Hero image" / "Image of X" is filler; describe what the image shows.
- Image immediately adjacent to a heading that names the same thing (card thumbnails, case-study hero below an `h1`): `alt=""`. Empty alt explicitly marks the image decorative so screen readers skip it instead of announcing the title twice.
- Decorative gradients, shapes, or pseudo-elements: `aria-hidden="true"` on the wrapper.

**Interactive elements.**

- Icon-only buttons and links require `aria-label`. Lucide SVG icons carry no accessible name on their own; the label lives on the wrapper. See `MobileNav.tsx`, `ThemeToggle.tsx` for the pattern.
- Hover and focus states must not be color-only. Pair color changes with underline, motion, or icon swap.
- Stick to native interactive elements (`<button>`, `<a>`, `<details>`, `<summary>`) whenever possible. Custom controls take real work to make accessible.

**Color tokens by responsibility** (definitions and contrast math in `globals.css`):

- `--accent` (`#3478BD` light, `#40AAED` dark): buttons, focus rings, large CTAs. Paired with white text in light mode, navy in dark.
- `--link` (`#2A6FB0` light, `#40AAED` dark): accent-toned body text (card-link arrows, Process / Services step numbers, prose anchors). Darker than `--accent` in light so body-size text clears AA.
- `--secondary` (`#40AAED`): decorative gradients and Footer body links sitting on the navy footer.
- `--muted-foreground` (`#5F6573` light, `#9CA3AF` dark): meta and supporting text on bg-soft surfaces.

New tokens or hex literals must clear WCAG AA against every surface they appear on (4.5:1 body text, 3:1 large text and UI components). Run the math in both modes before introducing one.

**Motion.** `globals.css` disables animations (0.01ms, so `animationend` still fires) and transitions (`0s` duration AND delay, since 2026-09-30, starter PORTS.md card 61: a 0.01ms transition on `all` strands in WebKit; so `transitionend` does not fire under reduce) globally under `prefers-reduced-motion: reduce`, and the Lenis smooth scroll becomes a no-op. New animations inherit this; no per-component handling needed.

**Mobile and safe areas.** The viewport meta carries `viewport-fit=cover` so the navy hero and footer run edge-to-edge into the notch on modern phones. Because of that, content that touches a screen edge must add the matching `env(safe-area-inset-*)`: side insets are handled once in `.ncs-container` (so every page's content clears a landscape notch), and the sticky header, the mobile-nav panel (`.mnav-shell`), the fixed back-to-top button, and the lightbox close button each add their own top/bottom/side inset. `env()` resolves to 0 on non-notched devices, so these read as the flat base padding everywhere except the phones that need them. If you add a new `position: fixed` element at a screen edge, or remove `viewport-fit=cover`, revisit those insets. Touch targets are sized to 44px on touch devices (see Target Size above); reach for the `pointer-coarse:` variant (not a `max-*` width breakpoint) when a control should stay compact for a mouse but grow for touch, so phones and tablets are both covered. Form inputs stay at `text-base` (16px) so iOS doesn't zoom on focus.

**Language and metadata.** `<html lang="en">` and the document `title` / `description` come from `BaseLayout`. Pass `title` and `description` through every page that uses the layout.

## Before merging

Run Lighthouse against any page you changed. Accessibility should stay at 100. Common regressions and what they mean:

- `color-contrast`: a token or literal used in a new context that doesn't pass. Check both modes.
- `image-alt`: missing `alt` attribute (empty `alt=""` is fine; missing isn't).
- `label`: input without an associated label.
- `link-name` / `button-name`: icon-only element without `aria-label`.

Lighthouse can't catch everything. For structural changes, also do a manual keyboard pass: Tab from the address bar through every interactive element. Each should be reachable, the focus indicator visible, and the order logical. The "Skip to main content" link should be the first thing focused after the address bar.

## Don't

- `aria-hidden="true"` on a focusable element (Tab still lands on it; screen reader hides the context).
- `tabindex` greater than 0 (breaks natural focus order).
- Remove focus outlines (`outline: none`) without a clearly visible replacement. shadcn primitives provide `focus-visible` rings already; preserve them.
- Use color as the only state cue (error red, success green) without an icon or text companion.
- Add ARIA roles to native elements that already have the right role (`role="button"` on a `<button>` is redundant).
