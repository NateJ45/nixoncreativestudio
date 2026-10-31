import { test, expect, type Page } from '@playwright/test';

// =============================================================================
// Pause motion: the visitor can stop anything that moves for more than 5s
// =============================================================================
// WCAG 2.2.2 (Pause, Stop, Hide). Today the only long-running motion is the
// homepage hero: the drifting reel of client sites (HeroReel.astro, CSS
// animations on .reel-col) and the "Now showing" ticker (Hero.astro, a
// setInterval that moves .is-active). The hero's Pause button sets
// data-paused on the section; the reel's CSS and the ticker script both read it.
//
// This spec pins that behaviour down. Overhaul package 1.7 adds a site-wide
// Pause-motion switch that sets html[data-motion-paused] (motion.ts), and the
// hero button will set the same state. When it lands, 1.7 turns the fixme case
// at the bottom into a real test and points reelState() at every
// data-motion="loop" element instead of just the reel.
//
// Chromium only (playwright.config.ts keeps it off the WebKit project), at
// 1440 so the ticker window is shown (it is hidden below lg).
// =============================================================================

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });

/** playState of every animation running inside the hero reel. */
const reelState = (page: Page) =>
  page.evaluate(() => {
    const stage = document.querySelector('.reel-stage');
    return document
      .getAnimations()
      .filter((a) => {
        const target = (a.effect as KeyframeEffect | null)?.target;
        return target instanceof Element && stage?.contains(target);
      })
      .map((a) => a.playState);
  });

/** Index of the ticker line that is showing. */
const activeTicker = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.ticker-item')].findIndex((el) =>
      el.classList.contains('is-active'),
    ),
  );

test.describe('Hero Pause button', () => {
  test('stops the reel and the ticker, and says so', async ({ page }) => {
    // A fake clock drives the ticker's setInterval, so the test does not wait
    // out real 3.8s ticks. CSS animations run on their own timeline either way.
    await page.clock.install();
    await page.goto('/', { waitUntil: 'load' });

    const pause = page.locator('[data-hero-pause]');
    await expect(pause).toBeVisible();
    await expect(pause).toHaveAttribute('aria-pressed', 'false');
    await expect(pause).toHaveAttribute('aria-label', /pause/i);

    // Before: the reel's columns are running and the ticker moves on.
    const before = await reelState(page);
    expect(before.length, 'the reel should have running animations').toBeGreaterThan(0);
    expect(before.every((s) => s === 'running')).toBe(true);
    expect(await activeTicker(page)).toBe(0);
    await page.clock.runFor(4000);
    expect(await activeTicker(page), 'the ticker should advance when not paused').toBe(1);

    // Pause: the state is in aria-pressed and the label flips to "Play".
    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await expect(pause).toHaveAttribute('aria-label', /play/i);
    await expect(page.locator('[data-hero-reel]')).toHaveAttribute('data-paused', '');
    await expect.poll(() => reelState(page)).not.toContain('running');
    const pausedAt = await activeTicker(page);
    await page.clock.runFor(12_000);
    expect(await activeTicker(page), 'the ticker should hold while paused').toBe(pausedAt);

    // Play again: everything resumes.
    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'false');
    await expect(pause).toHaveAttribute('aria-label', /pause/i);
    await expect.poll(async () => (await reelState(page)).every((s) => s === 'running')).toBe(true);
    await page.clock.runFor(4000);
    expect(await activeTicker(page)).not.toBe(pausedAt);
  });
});

test.describe('Site-wide Pause motion', () => {
  // Package 1.7 (motion system) adds the persisted switch in the footer and the
  // mobile sheet, which sets html[data-motion-paused]. Then: set it (or click
  // the switch) on every route in tests/routes.ts, assert no data-motion="loop"
  // animation is 'running', reload and assert the state persisted, and check
  // the hero button and the switch stay in sync. View Transition morphs must be
  // skipped while it is set (Part A, "missing" list).
  test.fixme('html[data-motion-paused] stops every loop on every route (lands in 1.7)', async () => {
    // Intentionally empty until package 1.7 ships the switch.
  });
});
