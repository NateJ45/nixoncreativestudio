import { test, expect, type Page } from './fixtures';
import { routes } from './routes';
import { settle } from './helpers';

// =============================================================================
// Visual baselines (overhaul 4.3). Every route in tests/routes.ts, at 1440 and
// 390, in light and dark: routes x 2 x 2 full-page screenshots.
//
// NOT in `npm test` (playwright.config.ts ignores this file) and NOT in ci.yml.
// Run through playwright.visual.config.ts, in practice only by
// .github/workflows/visual.yml, because the committed baselines are Linux PNGs.
// See docs/TESTING.md ("Visual baselines") for how to regenerate them.
//
// What makes a screenshot repeatable:
//   - motion frozen: reducedMotion 'reduce' (config), localStorage
//     ncs-motion=paused (sets html[data-motion-paused] before first paint),
//     transitions and animations killed by settle(), and Playwright's
//     animations: 'disabled'. Clips and the hero reel therefore show posters.
//   - theme seeded through localStorage["ncs-theme"] before the anti-FOUC
//     bootstrap runs, the same trick a11y-dark.spec.ts uses.
//   - lazy images and scroll reveals forced in (scroll the page once, wait for
//     every image to decode, then settle()).
//   - dynamic content masked: the contact clock, the live colophon numbers,
//     "Last updated" lines (build date) and any <time>. A mask paints a flat
//     box over the element, so its size is still compared and its text is not.
// =============================================================================

const viewports = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
] as const;
const themes = ['light', 'dark'] as const;

// Elements whose text changes between runs. Missing ones are simply not masked.
const MASKED = [
  '[data-contact-clock]', // contact: Cincinnati time, ticks every minute
  '[data-live-colophon]', // colophon: numbers measured in the visitor's browser
  '.doc-updated', // DocumentLayout "Last updated {build date}"
  '.now-stamp', // about: "Last updated {date}"
  'time', // journal dates and any other <time>
];

async function loadAllImages(page: Page): Promise<void> {
  // Lazy images below the fold only load once scrolled near. Walk the page.
  await page.evaluate(async () => {
    const step = Math.max(400, window.innerHeight - 100);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  // Make every image eager, wait for it to load AND decode (a lazy, async-decoded
  // image can report complete before its pixels paint, so two consecutive shots
  // differ: seen on /churches at 1440 dark, 2026-10-31), then two frames to paint.
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    imgs.forEach((img) => {
      img.loading = 'eager';
    });
    await Promise.all(
      imgs.map((img) =>
        Promise.race([
          img.decode().catch(() => undefined),
          new Promise<void>((resolve) => setTimeout(resolve, 8000)),
        ]),
      ),
    );
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

for (const vp of viewports) {
  for (const theme of themes) {
    test.describe(`${vp.name} ${theme}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height }, colorScheme: theme });

      for (const route of routes) {
        test(route, async ({ page }) => {
          await page.addInitScript((t) => {
            try {
              localStorage.setItem('ncs-theme', t);
              localStorage.setItem('ncs-motion', 'paused');
            } catch {
              /* storage blocked: the emulated colour scheme still applies */
            }
          }, theme);

          await page.goto(route);
          await page.waitForLoadState('load');
          await settle(page);
          await loadAllImages(page);
          await settle(page);

          // Warm-up capture, thrown away. On the Linux runner the first full-page raster
          // of a large photographic image differed speckle-wise from the next one
          // (/work/first-presbyterian-orangeburg, 2026-10-31, 9% of pixels), so
          // "two consecutive stable screenshots" never happened inside 5s.
          await page.screenshot({ fullPage: true });
          await page.waitForTimeout(500);

          const slug = route === '/' ? 'home' : route.slice(1).replace(/\//g, '-');
          await expect(page).toHaveScreenshot(`${slug}-${vp.name}-${theme}.png`, {
            fullPage: true,
            mask: MASKED.map((s) => page.locator(s)),
          });
        });
      }
    });
  }
}
