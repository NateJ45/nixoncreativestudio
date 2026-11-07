import { test, expect } from '@playwright/test';

// =============================================================================
// /work: the deal, the sector filter and the list view
// =============================================================================

test('?sector= deep link shows that sector', async ({ page }) => {
  await page.goto('/work/?sector=church');
  await expect(page.locator('button[data-f="church"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-grid] > li:visible')).toHaveCount(2);
  await expect(page.locator('[data-status]')).toHaveText('Showing 2 church sites.');
  await expect(page.locator('[data-more]')).toBeVisible();
});

test('an unknown sector falls back to all', async ({ page }) => {
  await page.goto('/work/?sector=castles');
  await expect(page.locator('button[data-f="all"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-status]')).toHaveText('Showing all 8 sites.');
});

test('a filter click updates the address, the status and the grid', async ({ page }) => {
  await page.goto('/work/');
  await page.locator('button[data-f="nonprofit"]').click();
  await expect(page).toHaveURL(/\?sector=nonprofit/);
  await expect(page.locator('[data-status]')).toHaveText('Showing 3 nonprofit sites.');
  await expect.poll(() => page.locator('[data-grid] > li:not([hidden])').count()).toBe(3);
  await page.locator('button[data-f="all"]').click();
  await expect(page).toHaveURL(/\/work\/$/);
});

test('?view=list shows the ruled rows', async ({ page }) => {
  await page.goto('/work/?view=list');
  await expect(page.locator('button[data-v="list"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-rows] > li:visible')).toHaveCount(8);
  await expect(page.locator('[data-rows] a').first()).toHaveAttribute(
    'href',
    '/work/stone-steps-50k/',
  );
});

test('counts come from the studies', async ({ page }) => {
  await page.goto('/work/');
  await expect(page.locator('h1')).toHaveAttribute('aria-label', /^8 sites/);
  await expect(page.locator('button[data-f="small-business"] .n')).toHaveText('2');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('every client is there, as a ruled row with a link', async ({ page }) => {
    await page.goto('/work/?sector=church');
    await expect(page.locator('[data-rows] > li')).toHaveCount(8);
    await expect(page.locator('[data-rows] a').first()).toBeVisible();
    await expect(page.locator('[data-bar]')).toBeHidden();
  });
});
