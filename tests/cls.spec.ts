import { test, expect } from '@playwright/test';
import { routes } from './routes';

// =============================================================================
// Cumulative Layout Shift under 0.05 on every route
// =============================================================================
// Lighthouse CI gates CLS at 0.1, but only on page load and only on the URLs
// in lighthouserc.json. This spec is tighter (0.05, the overhaul's target) and
// also catches shifts that happen while scrolling: lazy images without a
// reserved box, reveals that change layout, a late font swap.
//
// How: a buffered PerformanceObserver collects every layout-shift entry from
// before first paint, skipping shifts within 500ms of input (hadRecentInput,
// the same rule the browser's own CLS uses). The page is scrolled to the
// bottom in steps, then left to settle. The score is the largest session
// window (shifts less than 1s apart, at most 5s long), which is how
// web-vitals and Lighthouse compute CLS. The total is printed too, so a
// failure shows whether one burst or a slow drip is to blame.
//
// Chromium only: the Layout Instability API is Chromium-only, and
// playwright.config.ts keeps this file off the WebKit project. Runs at a
// 1440px desktop and a 390px phone width.
// =============================================================================

const LIMIT = 0.05;

declare global {
  interface Window {
    __shifts?: { value: number; startTime: number }[];
  }
}

const viewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

for (const viewport of viewports) {
  test.describe(`CLS at ${viewport.width}px`, () => {
    test.use({ viewport });

    for (const route of routes) {
      test(`${route}: CLS stays under ${LIMIT}`, async ({ page }) => {
        await page.addInitScript(() => {
          window.__shifts = [];
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as (PerformanceEntry & {
              value: number;
              hadRecentInput: boolean;
            })[]) {
              if (!entry.hadRecentInput) {
                window.__shifts!.push({ value: entry.value, startTime: entry.startTime });
              }
            }
          }).observe({ type: 'layout-shift', buffered: true });
        });

        await page.goto(route, { waitUntil: 'load' });

        // Scroll down a screen at a time so lazy images and reveals fire.
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < height; y += viewport.height * 0.8) {
          await page.evaluate((top) => window.scrollTo(0, top), y);
          await page.waitForTimeout(100);
        }
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(1000);

        const { worst, total } = await page.evaluate(() => {
          const shifts = window.__shifts ?? [];
          let worst = 0;
          let session = 0;
          let first = 0;
          let last = 0;
          for (const s of shifts) {
            if (session && s.startTime - last < 1000 && s.startTime - first < 5000) {
              session += s.value;
            } else {
              session = s.value;
              first = s.startTime;
            }
            last = s.startTime;
            worst = Math.max(worst, session);
          }
          return { worst, total: shifts.reduce((sum, s) => sum + s.value, 0) };
        });

        // Shown in the HTML report, so a passing run still records the number.
        test.info().annotations.push({ type: 'CLS', description: worst.toFixed(4) });
        expect(
          worst,
          `${route} at ${viewport.width}px: CLS ${worst.toFixed(4)} (all shifts ${total.toFixed(4)})`,
        ).toBeLessThan(LIMIT);
      });
    }
  });
}
