import { test, expect } from '@playwright/test';
import { routes } from './routes';
import { settle } from './helpers';

// =============================================================================
// WCAG 2.1 SC 1.4.10 Reflow: no horizontal scrolling at 320px CSS width
// =============================================================================
// A page fails Reflow if content forces a horizontal scrollbar at a 320px
// viewport (equivalent to 400% zoom on a 1280px screen). Lighthouse does not
// test reflow at all, and WCAG 1.4.10 starts at 320, not 375. Runs on every
// route.
//
// A second block sweeps the tablet/laptop widths (768/1024/1440) the same way:
// 320px passing does not prove the in-between breakpoints hold (multi-column
// grids and the desktop header only exist there). One test per route,
// resizing down without reload; the layouts are CSS-driven, so a resize
// exercises the same media queries a fresh load would, at a fraction of the
// runtime.
// =============================================================================

const overflowOf = (page: Parameters<typeof settle>[0]) =>
  page.evaluate(() => ({
    docWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

test.describe('Reflow: no horizontal overflow at 320px', () => {
  test.use({ viewport: { width: 320, height: 720 } });

  for (const route of routes) {
    test(`${route} does not overflow at 320px`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'load' });
      // Wait for fonts + reveal all content so we measure the settled layout.
      await settle(page);
      const { docWidth, viewportWidth } = await overflowOf(page);
      expect(
        docWidth,
        `${route}: content is ${docWidth}px wide in a ${viewportWidth}px viewport`,
      ).toBeLessThanOrEqual(viewportWidth);
    });
  }
});

test.describe('Reflow: no horizontal overflow at tablet/laptop widths', () => {
  const widths = [1440, 1024, 768];

  for (const route of routes) {
    test(`${route} does not overflow at ${widths.join('/')}px`, async ({ page }) => {
      await page.setViewportSize({ width: widths[0], height: 900 });
      await page.goto(route, { waitUntil: 'load' });
      await settle(page);
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        const { docWidth, viewportWidth } = await overflowOf(page);
        expect(
          docWidth,
          `${route} at ${width}px: content is ${docWidth}px wide in a ${viewportWidth}px viewport`,
        ).toBeLessThanOrEqual(viewportWidth);
      }
    });
  }
});
