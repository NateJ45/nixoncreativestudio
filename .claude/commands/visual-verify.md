---
description: Screenshot-verify UI changes in both themes and all key routes
argument-hint: "[route, e.g. / or /work]"
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
```

---

## Steps

1. **Make sure the dev server is running.**
   ```sh
   npm run dev
   ```
   Default: [http://localhost:4321](http://localhost:4321). If it's already running, skip this.

2. **Using the Playwright MCP**, open each route and capture four states per route:
   - Desktop 1280px wide, light mode
   - Desktop 1280px wide, dark mode
   - Mobile 375px wide, light mode
   - Mobile 375px wide, dark mode

3. **Switch themes** by setting the localStorage key and reloading:
   ```js
   localStorage.setItem('ncs-theme', 'light')  // or 'dark'
   location.reload()
   ```
   The key is `ncs-theme` (defined in `ThemeToggle.tsx` and the anti-FOUC script in `BaseLayout.astro`). After reload, the page reflects the chosen mode without flash.

4. **If the site is behind the coming-soon gate** (`PUBLIC_COMING_SOON=true` in `.env`), bypass it once per browser session:
   ```
   http://localhost:4321/?preview=<PUBLIC_PREVIEW_TOKEN>
   ```
   The gate script reads the token, saves it to `localStorage["ncs-preview"]`, and reloads without the query param. After that one visit, every route in that browser session loads the real site. You only need to do this once per session.

5. **Actually look at every screenshot.** Use the Read tool on each PNG. Check:
   - The changed element in all four states.
   - The sections immediately above and below it.
   - Text contrast in both themes.
   - Nothing overflowing or clipping at 375px.

6. **If anything is off**, fix it, re-screenshot the affected state, and verify again. Repeat until clean.

---

## What to look for

- **Contrast:** body text, heading text, button labels, link text all need to be readable in both light and dark. The brand tokens are calibrated for WCAG AA; a new hardcoded hex can break that.
- **Mobile nav:** at 375px, the desktop nav should be hidden and the mobile hamburger visible. Tap the hamburger and confirm the drawer opens cleanly.
- **Theme toggle:** clicking it in the header cycles light, dark, system. Confirm the page repaints without flash.
- **Photography page:** the justified grid should fill its container without overflow. The lightbox should open on photo click (click a photo, confirm the overlay appears).
- **Work filter chips** on `/work`: toggling a sector chip should hide/show cards without a page reload.

---

## Accessibility check (for structural changes)

If the change touches layout, heading hierarchy, or interactive elements, also run Lighthouse via the Playwright MCP after the screenshot pass. The targets are 100 Lighthouse Accessibility and 100 Best Practices. Common regressions:

- `color-contrast`: a new color literal used in a context that doesn't pass. Check both themes.
- `image-alt`: a missing `alt` attribute on a new `<img>`.
- `link-name` / `button-name`: an icon-only element without `aria-label`.

A screenshot pass that looks fine visually is not a substitute for the Lighthouse check when the change is structural.
