---
description: Screenshot-verify UI changes on the key routes at desktop and phone width
argument-hint: '[route, e.g. / or /work]'
---

Run this after any visual change before pushing. If a specific route is passed as an argument, verify that route. Otherwise, cover all key routes. The site has one light theme, so there is no theme pass; the extra passes are a 320px reflow check and a reduced-motion check.

---

## Key routes

```
/
/work
/work/[slug]          (stone-steps-50k is the longest; first-presbyterian-orangeburg has the longest name)
/churches
/services
/about
/contact
/colophon
/privacy
/accessibility
/photography
/journal
/404                  (any address that does not exist)
```

---

## Steps

1. **Make sure the dev server is running.**

   ```sh
   npm run dev
   ```

   Default: [http://localhost:4321](http://localhost:4321). If it's already running, skip this. For a build you can serve, `npm run build` then `npm run serve:dist` (stop the dev server first).

2. **Using the Playwright MCP**, open each route and capture three states per route:
   - Desktop 1440px wide
   - Phone 390px wide
   - Phone 320px wide (the reflow floor)

3. **Scroll the whole page** at each width, because the deck, the closing, the quote bands and the study blocks only arrive as you reach them. Then check overflow at 320px with the cache off:

   ```js
   [...document.querySelectorAll('*')].filter(
     (e) => e.getBoundingClientRect().right > innerWidth + 1,
   ).length;
   document.documentElement.scrollWidth > innerWidth; // must be false
   ```

4. **Check reduced motion.** Emulate `prefers-reduced-motion: reduce` and reload. The H1 and dock show at once, the hero hand of clients is already dealt, the closing deck is already gathered, footage stays on its still, and `[data-weigh]` headings do not change weight.

5. **If the site is behind the coming-soon gate** (`PUBLIC_COMING_SOON=true` in `.env`), bypass it once per browser session:

   ```
   http://localhost:4321/?preview=<PUBLIC_PREVIEW_TOKEN>
   ```

   The gate script reads the token, saves it to `localStorage["ncs-preview"]`, and reloads without the query param. You only need to do this once per session.

6. **Actually look at every screenshot.** Use the Read tool on each PNG. Check:
   - The changed element at all three widths.
   - The sections immediately above and below it.
   - That a client's color stays inside their own window, band or sheet, and the page around it is neutral.
   - That a quote band never touches the blue closing.
   - Nothing overflowing or clipping at 320px, and a `.giant` line that fills its line without spilling.

7. **If anything is off**, fix it, re-screenshot the affected state, and verify again. Repeat until clean.

---

## What to look for

- **The dock:** the floating menu is on every page at every width, and at 320px all four links fit on one line. Tab through it; the highlight slides to the focused link.
- **The deck:** cards are lettered in two opposite corners with a pip, the far one upside down. A new card follows the same rule.
- **Work filter** on `/work`: a sector button hides and shows windows without a reload and rewrites `?sector=` in the URL; `/work/?sector=church` filters on load; `?view=list` shows the ruled rows.
- **Client sheet:** a window opens a sheet of its color, Back and Escape close it, and focus returns to the window.
- **Contact:** one question at a time, errors in plain words; with JavaScript off every field shows.
- **Photography page:** gated today, so it shows one portrait and an "Ask for samples" button.

---

## Accessibility check (for structural changes)

If the change touches layout, heading hierarchy, or interactive elements, also run `npm test` (the axe sweep, reflow and reduced-motion specs) after the screenshot pass, and a Lighthouse audit through the Chrome DevTools MCP if you need the full report. Accessibility must stay at 100; CI enforces it. Local `lhci` does not complete on this Windows machine (Gotcha 9 in `docs/claude/gotchas.md`), so read the CI run for the authoritative score. Common regressions:

- `color-contrast`: a new color literal used in a context that doesn't pass. Add the pair to `src/lib/kit-tokens.test.ts`.
- `image-alt`: a missing `alt` attribute on a new `<img>`.
- `link-name` / `button-name`: an icon-only element without `aria-label`.

A screenshot pass that looks fine visually is not a substitute for the axe and Lighthouse checks when the change is structural.
