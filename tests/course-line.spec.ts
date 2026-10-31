import { test, expect, type Page } from '@playwright/test';

// =============================================================================
// The Stone Steps course line (CourseLine.astro, overhaul package 3.2)
// =============================================================================
// Site-owned. The route plan and the elevation profile of the real course,
// drawn on a scroll-driven timeline where motion is allowed, and scrubbed by a
// native range input in 0.1 mi steps. This spec pins down:
//   - the range input is reachable with Tab and moves a tenth of a mile per
//     arrow key, with Home and End at the ends of the trace, and the readout
//     and aria-valuetext follow it;
//   - under reduced motion and under Pause motion the lines are drawn in full
//     with no animation at all (instant, nothing waits on a scroll);
//   - with motion allowed and support present, the draw is on a timeline;
//   - without JavaScript the control stays hidden and the drawings render.
// =============================================================================

const ROUTE = '/work/stone-steps-50k/';

/** Press Tab until the course range input has focus (or give up). */
async function tabToRange(page: Page): Promise<boolean> {
  for (let i = 0; i < 120; i++) {
    await page.keyboard.press('Tab');
    const found = await page.evaluate(
      () => document.activeElement?.classList.contains('course-range') ?? false,
    );
    if (found) return true;
  }
  return false;
}

/** Every animation on the course figure's drawn lines. */
const drawAnimations = (page: Page) =>
  page
    .locator('[data-course]')
    .evaluate((el) => el.getAnimations({ subtree: true }).map((a) => a.playState));

/** The computed dash offset of each drawn line (0 means drawn in full). */
const dashOffsets = (page: Page) =>
  page
    .locator('[data-course] .course-draw')
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).strokeDashoffset));

test.describe('Course line: keyboard scrub', () => {
  test.use({ reducedMotion: 'reduce' });

  test('Tab reaches the range input and the arrow keys step 0.1 mi', async ({ page }) => {
    await page.goto(ROUTE);
    const range = page.getByRole('slider', { name: /Walk the course/ });
    await expect(range).toBeVisible();
    await expect(range).toHaveAttribute('step', '0.1');

    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      window.scrollTo(0, 0);
    });
    expect(await tabToRange(page), 'Tab reaches the range input').toBe(true);
    await expect(range).toBeFocused();

    const readout = page.locator('[data-readout]');
    await expect(readout).toContainText('Mile 0.0');
    await expect(range).toHaveAttribute('aria-valuetext', /^Mile 0\.0, loop 1 of \d+, [\d,]+ feet/);

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(range).toHaveValue('0.3');
    await expect(readout).toContainText('Mile 0.3');
    await expect(range).toHaveAttribute('aria-valuetext', /^Mile 0\.3, loop 1 of/);

    await page.keyboard.press('ArrowLeft');
    await expect(range).toHaveValue('0.2');

    // End jumps to the last tenth on the trace: the last loop.
    await page.keyboard.press('End');
    const max = await range.getAttribute('max');
    await expect(range).toHaveValue(max ?? '');
    await expect(range).toHaveAttribute('aria-valuetext', /loop (\d+) of \1,/);

    // The marker on the plan moved off the start.
    await page.keyboard.press('Home');
    const startCx = await page.locator('[data-plan-dot]').getAttribute('cx');
    await page.keyboard.press('PageUp');
    await page.keyboard.press('PageUp');
    await expect.poll(() => page.locator('[data-plan-dot]').getAttribute('cx')).not.toBe(startCx);
  });
});

test.describe('Course line: instant under reduced motion and Pause motion', () => {
  test('reduced motion: drawn in full, no animation', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(ROUTE);
    await page.locator('[data-course]').scrollIntoViewIfNeeded();
    expect(await drawAnimations(page)).toEqual([]);
    for (const offset of await dashOffsets(page)) expect(parseFloat(offset)).toBe(0);
    await context.close();
  });

  test('Pause motion: drawn in full, no animation', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'no-preference' });
    const page = await context.newPage();
    await page.addInitScript(() => {
      try {
        localStorage.setItem('ncs-motion', 'paused');
      } catch {
        /* storage blocked: the assertions below would fail loudly */
      }
    });
    await page.goto(ROUTE);
    // Before it scrolls into view: with the draw on, the lines would be hidden here.
    expect(await drawAnimations(page)).toEqual([]);
    for (const offset of await dashOffsets(page)) expect(parseFloat(offset)).toBe(0);
    await context.close();
  });
});

test.describe('Course line: the scroll-driven draw', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('motion allowed: both lines draw on the figure timeline', async ({ page }) => {
    await page.goto(ROUTE);
    const supported = await page.evaluate(() => CSS.supports('animation-timeline: view()'));
    test.skip(!supported, 'no scroll-driven animations in this browser: drawn in full instead');
    expect((await drawAnimations(page)).length).toBe(2);
  });
});

test.describe('Course line: without JavaScript', () => {
  test.use({ javaScriptEnabled: false, reducedMotion: 'reduce' });

  test('the control stays hidden and the drawings render', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(page.locator('[data-scrub]')).toBeHidden();
    await expect(
      page.getByRole('img', { name: /The Stone Steps course from above/ }),
    ).toBeVisible();
    await expect(page.getByRole('img', { name: /Elevation along the course/ })).toBeVisible();
  });
});
