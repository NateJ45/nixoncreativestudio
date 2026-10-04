---
description: Screenshot-verify UI changes on all key routes (one theme)
argument-hint: '[route, e.g. / or /work]'
---

Run this after any visual change before pushing. If a specific route is passed as an argument, verify that route. Otherwise, cover all key routes.

---

## Key routes

```
/
/about
/services
/work
/work/[slug]          (pick the most visually complex case study)
/photography
/journal
/contact
/colophon
/privacy
/accessibility
```

---

## Steps

1. **Make sure the dev server is running.**

   ```sh
   npm run dev
   ```

   Default: [http://localhost:4321](http://localhost:4321). If it's already running, skip this.

2. **Using the Playwright MCP**, open each route and capture two states per route: desktop 1440px wide and mobile 390px wide. The site has one art-directed theme (dark mode and the theme toggle were retired in the 2026 redesign), so there is no theme to switch.

3. (Retired step: theme switching.)

4. **If the site is behind the coming-soon gate** (`PUBLIC_COMING_SOON=true` in `.env`), bypass it once per browser session:

   ```
   http://localhost:4321/?preview=<PUBLIC_PREVIEW_TOKEN>
   ```

   The gate script reads the token, saves it to `localStorage["ncs-preview"]`, and reloads without the query param. After that one visit, every route in that browser session loads the real site. You only need to do this once per session.

5. **Scroll through the page before every full-page capture.** A Playwright `fullPage` shot renders the document without scrolling it, so the IntersectionObserver behind `[data-reveal]` never fires below the first viewport and every revealed band lands in the PNG at opacity 0 (a blank band that looks like a design decision). Before each full-page shutter: scroll to the bottom in viewport-sized steps (for example `for (let y = 0; y < document.body.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); }`), wait a beat, scroll back to the top, and confirm every `<img>` is `complete && naturalWidth > 0`. Any screenshot with a large uniform band is re-taken, never accepted.

6. **Actually look at every screenshot.** Use the Read tool on each PNG. Check:
   - The changed element in both states.
   - The sections immediately above and below it.
   - Text contrast, including over the moving grounds (`DESIGN.md`).
   - Nothing overflowing or clipping at 375px.

7. **If anything is off**, fix it, re-screenshot the affected state, and verify again. Repeat until clean.

---

## What to look for

- **Contrast:** body text, heading text, button labels, link text all need to be readable on every ground they sit on. The brand tokens are calibrated for WCAG AA; a new hardcoded hex can break that.
- **Mobile nav:** at 375px, the desktop nav should be hidden and the mobile hamburger visible. Tap the hamburger and confirm the drawer opens cleanly.
- **Photography page:** the justified grid should fill its container without overflow. The lightbox should open on photo click (click a photo, confirm the overlay appears).
- **Work** on `/work` and a case study: the lead print and the Stone Steps showreel poster show at once; the reel starts after load, pauses with its button, and shows a still under reduced motion.

---

## Accessibility check (for structural changes)

If the change touches layout, heading hierarchy, or interactive elements, also run `npm test` (the axe sweep) after the screenshot pass, and a Lighthouse audit through the Chrome DevTools MCP if you need the full report. Accessibility must stay at 100; CI enforces it. Local `lhci` does not complete on this Windows machine (CLAUDE.md Gotcha 9), so read the CI run for the authoritative score. Common regressions:

- `color-contrast`: a new color literal used in a context that doesn't pass.
- `image-alt`: a missing `alt` attribute on a new `<img>`.
- `link-name` / `button-name`: an icon-only element without `aria-label`.

A screenshot pass that looks fine visually is not a substitute for the axe and Lighthouse checks when the change is structural.
