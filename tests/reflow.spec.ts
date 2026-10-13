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

// settle() above force-reveals every [data-reveal] element, which hides one
// real bug class: a reveal that starts offset sideways (data-reveal="left|right")
// widens the document until it scrolls into view. /services at 320px was 328px
// wide in that state (2026-10-13 audit) while this suite stayed green. So this
// block measures the page as a visitor first sees it: right after load, no
// settle(), reveals still pending, and again after a slow scroll to the bottom.
test.describe('Reflow: no horizontal overflow at 320px before reveals run', () => {
  test.use({ viewport: { width: 320, height: 720 } });

  for (const route of routes) {
    test(`${route} does not overflow at 320px unscrolled or while scrolling`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'load' });
      const initial = await overflowOf(page);
      expect(
        initial.docWidth,
        `${route}: unscrolled, content is ${initial.docWidth}px wide in a ${initial.viewportWidth}px viewport`,
      ).toBeLessThanOrEqual(initial.viewportWidth);

      // Step down the page so reveals fire one by one, checking each step.
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 400) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        const { docWidth, viewportWidth } = await overflowOf(page);
        expect(
          docWidth,
          `${route}: at scrollY ${y}, content is ${docWidth}px wide in a ${viewportWidth}px viewport`,
        ).toBeLessThanOrEqual(viewportWidth);
      }
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
