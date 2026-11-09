import { test, expect } from '@playwright/test';
import { routes } from './routes';
import { settle } from './helpers';

// =============================================================================
// Mobile expandables: nothing inside an opened fold is crushed or overflows
// =============================================================================
// The reflow sweep measures each page as it loads, so anything inside a closed
// <details> or a phone fold (the /services sections prices.js folds under
// 52rem) is never laid out while it runs. That is where the caption bug of
// November 2026 hid: the five-year cost table and the fit table go
// display: block on a phone, their <caption> stayed display: table-caption, and
// the browser wrapped it in an anonymous shrink-to-fit table. The caption came
// out one or two words wide, with the rest of the row empty.
//
// So this opens EVERY <details> and every phone fold on every route at 320 and
// 375, then checks two things:
//   1. no horizontal overflow (the same measure as reflow.spec.ts);
//   2. no block of text is crushed: a caption, paragraph, list item, summary or
//      heading with 25 characters or more of its own text that wraps onto three
//      lines or more must be at least half as wide as its container. A crushed
//      block averages fewer than 14 characters a line, which is the signature
//      of the bug, so both have to be true before it fails (a short label in a
//      real grid column is never flagged).
// =============================================================================

for (const width of [320, 375]) {
  test.describe(`Expandables opened at ${width}px`, () => {
    test.use({ viewport: { width, height: 760 } });

    for (const route of routes) {
      test(`${route} has no crushed text or overflow with every fold open`, async ({ page }) => {
        await page.goto(route, { waitUntil: 'load' });
        await settle(page);
        // Open every <details>, then every phone fold that is shut (its button says aria-expanded="false").
        await page.evaluate(() => {
          document.querySelectorAll('details').forEach((d) => (d.open = true));
          document
            .querySelectorAll<HTMLButtonElement>('.mfold-btn[aria-expanded="false"]')
            .forEach((b) => b.click());
        });

        const { docWidth, viewportWidth } = await page.evaluate(() => ({
          docWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        }));
        expect(
          docWidth,
          `${route}: with every fold open, content is ${docWidth}px wide in a ${viewportWidth}px viewport`,
        ).toBeLessThanOrEqual(viewportWidth);

        const crushed = await page.evaluate(() => {
          const found: string[] = [];
          const blocks = document.querySelectorAll<HTMLElement>(
            'caption, figcaption, p, li, dt, dd, summary, h2, h3, h4, blockquote',
          );
          for (const el of blocks) {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') continue;
            // Only the element's own text counts, so a wrapper of short pieces is not judged on their total.
            const own = [...el.childNodes]
              .filter((n) => n.nodeType === Node.TEXT_NODE)
              .map((n) => n.textContent ?? '')
              .join('')
              .trim();
            if (own.length < 25) continue;
            const r = el.getBoundingClientRect();
            if (r.width === 0) continue;
            const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
            const innerHeight = r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
            const lines = Math.round(innerHeight / lineHeight);
            if (lines < 3) continue;
            const perLine = (el.textContent ?? '').trim().length / lines;
            // The container a caption answers to is the table's own container.
            const box =
              (el.tagName === 'CAPTION' ? el.closest('table')?.parentElement : null) ??
              el.parentElement!;
            const bcs = getComputedStyle(box);
            const boxWidth =
              box.getBoundingClientRect().width -
              parseFloat(bcs.paddingLeft) -
              parseFloat(bcs.paddingRight);
            if (perLine < 14 && r.width < boxWidth / 2) {
              found.push(
                `${el.tagName.toLowerCase()}.${el.className} is ${Math.round(r.width)}px of ${Math.round(boxWidth)}px, ${lines} lines: "${own.slice(0, 50)}"`,
              );
            }
          }
          return found;
        });
        expect(crushed, `${route}: crushed text with every fold open`).toEqual([]);
      });
    }
  });
}
