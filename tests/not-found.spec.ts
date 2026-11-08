import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settle } from './helpers';

// =============================================================================
// The 404
// =============================================================================

test('a missing address is a 404 that says which one, with two ways on', async ({ page }) => {
  const resp = await page.goto('/work/stonesteps/');
  expect(resp?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveAttribute('aria-label', "This page isn't here.");
  await expect(page.locator('[data-path]')).toHaveText('/work/stonesteps/');
  await expect(page.locator('.nf-links a[href="/work/"]')).toBeVisible();
  await expect(page.locator('.nf-links a[href="/"]')).toBeVisible();
  await expect(page.locator('[data-knock] a.tile')).toHaveCount(1);
  await expect(page.locator('nav.dock')).toBeVisible();
});

test('the 404 passes axe and reflows at 320', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/nope/');
  await settle(page);
  // The same WCAG 2.2 AA tags as a11y.spec.ts.
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(results.violations).toEqual([]);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the links are there and the path line stays hidden', async ({ page }) => {
    await page.goto('/nope/');
    await expect(page.locator('.lost')).toBeHidden();
    await expect(page.locator('.nf-links a')).toHaveCount(2);
  });
});
