import { test, expect, type Page } from '@playwright/test';

// =============================================================================
// "Walk the homepage" (SiteShowcase.astro, overhaul package 2.4b)
// =============================================================================
// Site-owned. The walk has two modes from one piece of markup:
//   - motion allowed, Pause motion off, scroll-driven CSS supported: the
//     capture is scrubbed by page scroll inside a sticky frame;
//   - reduced motion, Pause motion on, or no support: the frame's screen is a
//     native scroll box, a focusable region named "Scroll the {client}
//     homepage".
// The fallback must be reachable and usable with the keyboard alone, and the
// capture is capped at the first 4,000px (overhaul ruling 4).
// =============================================================================

const ROUTE = '/work/stone-steps-50k/';
const NAME = /Scroll the Stone Steps 50K homepage/;

/** Press Tab until the walk's region has focus (or give up after 80 presses). */
async function tabToWalk(page: Page): Promise<boolean> {
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab');
    const found = await page.evaluate(
      () => document.activeElement?.classList.contains('walk-screen') ?? false,
    );
    if (found) return true;
  }
  return false;
}

test.describe('Walk the homepage: the fallback scroll box', () => {
  test.use({ reducedMotion: 'reduce' });

  test('reduced motion: Tab reaches the scroll box and the keys scroll it', async ({ page }) => {
    await page.goto(ROUTE);
    const box = page.getByRole('region', { name: NAME });
    await expect(box).toHaveCount(1);
    await box.scrollIntoViewIfNeeded();

    // It is a real scroll box: taller content, overflow auto.
    const shape = await box.evaluate((el) => ({
      overflowY: getComputedStyle(el).overflowY,
      scrollable: el.scrollHeight > el.clientHeight + 10,
    }));
    expect(shape.overflowY).toBe('auto');
    expect(shape.scrollable).toBe(true);

    // Keyboard only: Tab to it from the top of the page, then scroll it.
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      window.scrollTo(0, 0);
    });
    expect(await tabToWalk(page), 'Tab reaches the walk').toBe(true);
    await expect(box).toBeFocused();
    await page.keyboard.press('PageDown');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => box.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

    // Nothing is animating the capture under reduced motion.
    const animations = await box.evaluate((el) => el.getAnimations({ subtree: true }).length);
    expect(animations).toBe(0);
  });
});

test.describe('Walk the homepage: Pause motion', () => {
  test('Pause motion turns the walk back into a scroll box', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('ncs-motion', 'paused');
      } catch {
        /* storage blocked: the test below would fail loudly */
      }
    });
    await page.goto(ROUTE);
    const box = page.getByRole('region', { name: NAME });
    await expect(box).toHaveCount(1);
    expect(await box.evaluate((el) => getComputedStyle(el).overflowY)).toBe('auto');
    expect(await box.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  });
});

test.describe('Walk the homepage: the scrubbed walk', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('motion allowed: the capture is scrubbed by page scroll', async ({ page }) => {
    await page.goto(ROUTE);
    const box = page.getByRole('region', { name: NAME });
    const supported = await page.evaluate(() => CSS.supports('animation-timeline: view()'));
    test.skip(!supported, 'no scroll-driven animations in this browser: the fallback applies');

    expect(await box.evaluate((el) => getComputedStyle(el).overflowY)).toBe('hidden');
    const capture = box.locator('.walk-capture');
    await expect(capture).toHaveCount(1);
    expect(await capture.evaluate((el) => el.getAnimations().length)).toBe(1);
  });
});

test.describe('Walk the homepage: weight', () => {
  test('the capture is cropped to at most 4,000px of the source', async ({ page }) => {
    await page.goto(ROUTE);
    const capture = page.locator('.walk-capture');
    // The box carries the crop's shape: width / height of the served file.
    const ratio = await capture.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.width / r.height;
    });
    // 1440 / 4000 = 0.36. A full 10,824px capture would be about 0.133.
    expect(ratio).toBeGreaterThan(0.35);
    // The served file is lazy.
    expect(await capture.locator('img').getAttribute('loading')).toBe('lazy');
  });
});
