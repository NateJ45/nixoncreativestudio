import { test, expect } from '@playwright/test';
import { settle } from './helpers';

// =============================================================================
// The two sides: the theme is chosen before paint, the flip turns it over, the
// choice sticks, and with no choice the page follows the device.
// =============================================================================

const theme = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.dataset.theme);

test.describe('The theme', () => {
  test('follows the device until a choice is made', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    expect(await theme(page)).toBe('dark');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#14162f');

    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await expect.poll(() => theme(page)).toBe('light');
  });

  test('the flip turns it over, and the choice outlives the page and the device', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    await settle(page);
    // The switch says in words what it will do, and says the other thing once it has.
    const dock = page.locator('nav.dock');
    await dock.getByRole('button', { name: 'Dark mode' }).click();
    expect(await theme(page)).toBe('dark');
    await expect(dock.getByRole('button', { name: 'Light mode' })).toBeVisible();
    await expect(dock.getByRole('button', { name: 'Dark mode' })).toHaveCount(0);

    await page.goto('/work/', { waitUntil: 'domcontentloaded' });
    expect(await theme(page)).toBe('dark');

    await page.emulateMedia({ colorScheme: 'dark' });
    await page.emulateMedia({ colorScheme: 'light' });
    expect(await theme(page)).toBe('dark');
  });

  test('a phone finds the switch, in words, in the closing band', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('nav.dock [data-theme-flip]')).toBeHidden();
    const flip = page.locator('[data-end]').getByRole('button', { name: 'Dark mode' });
    await flip.scrollIntoViewIfNeeded();
    await flip.click();
    expect(await theme(page)).toBe('dark');
  });

  test('the ground is dark from the first paint', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ncs-theme', 'dark'));
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForSelector('body', { state: 'attached' });
    const ground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(ground).toBe('rgb(20, 22, 47)');
  });

  test('print takes the light side', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', media: 'print' });
    await page.goto('/one-page/', { waitUntil: 'domcontentloaded' });
    const ink = await page.evaluate(() => getComputedStyle(document.body).color);
    expect(ink).toBe('rgb(18, 18, 17)');
  });

  test('with no script the flip is gone and the page is light', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'dark' });
    const page = await context.newPage();
    await page.goto('/about/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-theme-flip]')).toHaveCount(2);
    for (const flip of await page.locator('[data-theme-flip]').all())
      await expect(flip).toBeHidden();
    await context.close();
  });
});
