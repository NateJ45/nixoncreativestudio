import { test, expect } from '@playwright/test';

// =============================================================================
// Walk the homepage, and the phones that scroll with the story
// =============================================================================
// Scroll drives the capture inside its window. Under reduced motion, or without
// JavaScript, the window is a plain, Tab-reachable, key-scrollable box.

const ROUTE = '/work/stone-steps-50k/';

test('scrolling the page moves the capture inside the rail phone', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(ROUTE);
  const img = page.locator('.rail img.long');
  await page.evaluate(() => {
    const story = document.querySelector('[data-story]')!;
    window.scrollTo(0, story.getBoundingClientRect().top + scrollY + 1200);
  });
  await expect.poll(() => img.evaluate((el) => getComputedStyle(el).transform)).toMatch(/matrix/);
});

test('reduced motion: the walk is a focusable scroll box', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(ROUTE);
  const walk = page.locator('[data-walk]');
  await expect(walk).toHaveAttribute('tabindex', '0');
  await expect(walk).toHaveAttribute('aria-label', /\S/);
  await ctx.close();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the capture has its real size and is reachable', async ({ page }) => {
    await page.goto(ROUTE);
    const img = page.locator('[data-walk] img');
    await expect(img).toHaveAttribute('width', /\d+/);
    await expect(img).toHaveAttribute('height', /\d+/);
    await expect(page.locator('[data-walk]')).toHaveAttribute('tabindex', '0');
  });
});
