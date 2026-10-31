import { test, expect, type Page } from '@playwright/test';
import { routes } from './routes';

// =============================================================================
// Pause motion: the visitor can stop anything that moves for more than 5s
// =============================================================================
// WCAG 2.2.2 (Pause, Stop, Hide). Since overhaul package 1.7 every looping
// animation opts in with data-motion="loop" (the hero reel and ticker, the
// footer status dot, the About status dot, ...), and one
// site-wide Pause motion state stops them all: html[data-motion-paused], set by
// any [data-motion-toggle] button (the footer switch, the hero's Pause button),
// remembered in localStorage["ncs-motion"] and applied before first paint by
// the BaseLayout bootstrap. src/scripts/motion.ts is the controller.
//
// This spec pins down:
//   - the hero button stops the reel and the ticker and reflects the state,
//   - the footer switch and the hero button stay in step,
//   - with the state set, no data-motion="loop" animation runs on any route,
//   - the state survives a reload and a ClientRouter navigation,
//   - Heft (the H1 weight animation) and page transitions stand down too.
//
// Chromium only (playwright.config.ts keeps it off the WebKit project), at
// 1440 so the ticker window and the header nav are shown.
// =============================================================================

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });

/** playState of every animation running inside a data-motion="loop" element
    (or on one), optionally limited to a container. */
const loopStates = (page: Page, within = 'body') =>
  page.evaluate((scope) => {
    const root = document.querySelector(scope);
    return document
      .getAnimations()
      .filter((a) => {
        const target = (a.effect as KeyframeEffect | null)?.target;
        return (
          target instanceof Element &&
          !!target.closest('[data-motion="loop"]') &&
          root?.contains(target)
        );
      })
      .map((a) => a.playState);
  }, within);

/** Index of the ticker line that is showing. */
const activeTicker = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.ticker-item')].findIndex((el) =>
      el.classList.contains('is-active'),
    ),
  );

const isPaused = (page: Page) =>
  page.evaluate(() => document.documentElement.hasAttribute('data-motion-paused'));

test.describe('Hero Pause button', () => {
  test('stops the reel and the ticker, and says so', async ({ page }) => {
    // A fake clock drives the ticker's setInterval, so the test does not wait
    // out real 3.8s ticks. CSS animations run on their own timeline either way.
    await page.clock.install();
    await page.goto('/', { waitUntil: 'load' });

    const pause = page.locator('[data-hero-pause]');
    const footerSwitch = page.locator('footer [data-motion-toggle]');
    await expect(pause).toBeVisible();
    await expect(pause).toHaveAttribute('aria-pressed', 'false');
    await expect(pause).toHaveAccessibleName(/pause motion/i);

    // Before: the reel's columns are running and the ticker moves on.
    const before = await loopStates(page, '.reel-stage');
    expect(before.length, 'the reel should have running animations').toBeGreaterThan(0);
    expect(before.every((s) => s === 'running')).toBe(true);
    expect(await activeTicker(page)).toBe(0);
    await page.clock.runFor(4000);
    expect(await activeTicker(page), 'the ticker should advance when not paused').toBe(1);

    // Pause: the state is in aria-pressed (the name stays put, as a toggle
    // button's should), on <html>, and on the footer switch too.
    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await expect(pause).toHaveAccessibleName(/pause motion/i);
    await expect(footerSwitch).toHaveAttribute('aria-pressed', 'true');
    expect(await isPaused(page)).toBe(true);
    await expect.poll(() => loopStates(page, '.reel-stage')).not.toContain('running');
    const pausedAt = await activeTicker(page);
    await page.clock.runFor(12_000);
    expect(await activeTicker(page), 'the ticker should hold while paused').toBe(pausedAt);

    // Play again from the footer switch: everything resumes, both controls agree.
    // Clicking it scrolls the footer into view, which takes the reel off
    // screen (and so paused, rightly); scroll back up before checking.
    await footerSwitch.click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(pause).toHaveAttribute('aria-pressed', 'false');
    await expect(footerSwitch).toHaveAttribute('aria-pressed', 'false');
    await expect
      .poll(async () => (await loopStates(page, '.reel-stage')).every((s) => s === 'running'))
      .toBe(true);
    await page.clock.runFor(4000);
    expect(await activeTicker(page)).not.toBe(pausedAt);
  });
});

test.describe('Site-wide Pause motion', () => {
  test('the footer switch is a 44px toggle button that persists across reload and navigation', async ({
    page,
  }) => {
    await page.goto('/about/', { waitUntil: 'load' });
    const toggle = page.locator('footer [data-motion-toggle]');
    await expect(toggle).toHaveAccessibleName(/pause motion/i);
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    const box = await toggle.boundingBox();
    expect(box?.height, 'the switch should be a 44px target').toBeGreaterThanOrEqual(44);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => localStorage.getItem('ncs-motion'))).toBe('paused');

    // Reload: the bootstrap applies it before paint, the switch reflects it.
    await page.reload({ waitUntil: 'load' });
    expect(await isPaused(page)).toBe(true);
    await expect(page.locator('footer [data-motion-toggle]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // A ClientRouter navigation copies the new page's <html> attributes over
    // the old ones; the state must survive that, with no page transition run.
    await page.locator('header a[href="/work/"]').first().click();
    await page.waitForURL('**/work/');
    await expect(page.locator('#work-index-heading')).toBeVisible();
    expect(await isPaused(page)).toBe(true);
    await expect(page.locator('footer [data-motion-toggle]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // And back on the homepage the hero button agrees, and the reel is still.
    await page.locator('header a[href="/"]').first().click();
    await page.waitForURL((url) => url.pathname === '/');
    await expect(page.locator('[data-hero-pause]')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => loopStates(page, '.reel-stage')).not.toContain('running');
  });

  for (const route of routes) {
    test(`${route}: html[data-motion-paused] stops every loop`, async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('ncs-motion', 'paused'));
      await page.goto(route, { waitUntil: 'load' });
      expect(await isPaused(page)).toBe(true);
      // Scroll through, so loops further down come on screen too.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += innerHeight) {
          scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
      });
      const states = await loopStates(page);
      expect(states, `${route}: loop animations still running`).not.toContain('running');
      // Heft stands down too: the H1 renders its end state with nothing moving.
      const heft = await page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((a) =>
              (a as unknown as { animationName?: string }).animationName?.startsWith('heft'),
            ).length,
      );
      expect(heft, `${route}: Heft should not animate while paused`).toBe(0);
    });
  }
});

test.describe('Heft', () => {
  test('the homepage H1 fills once, inside 2.5s, without moving anything', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const timing = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) =>
          (a as unknown as { animationName?: string }).animationName?.startsWith('heft'),
        )
        .map((a) => {
          const t = a.effect!.getComputedTiming();
          return { end: Number(t.endTime), iterations: t.iterations };
        }),
    );
    expect(timing.length, 'the hero H1 should run Heft').toBeGreaterThan(0);
    for (const t of timing) {
      expect(t.iterations).toBe(1);
      expect(t.end).toBeLessThan(2500);
    }
  });

  test('the 404 runs in reverse and ends light', async ({ page }) => {
    await page.goto('/this-page-does-not-exist/', { waitUntil: 'load' });
    const ink = page.locator('#notfound-heading .heft-ink').first();
    await expect
      .poll(() => ink.evaluate((el) => getComputedStyle(el).fontWeight), { timeout: 5000 })
      .toBe('200');
  });
});

test.describe('Reduced motion end states', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the hero H1 is heavy and the 404 is light from the first frame', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(
      await page
        .locator('#hero-statement .heft-ink')
        .first()
        .evaluate((el) => getComputedStyle(el).fontWeight),
    ).toBe('800');
    await page.goto('/this-page-does-not-exist/', { waitUntil: 'domcontentloaded' });
    expect(
      await page
        .locator('#notfound-heading .heft-ink')
        .first()
        .evaluate((el) => getComputedStyle(el).fontWeight),
    ).toBe('200');
  });
});
