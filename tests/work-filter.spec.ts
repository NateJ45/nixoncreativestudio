import { test, expect } from '@playwright/test';

// =============================================================================
// /work: the large windows, the sector filter and the list view
// =============================================================================

test('?sector= deep link shows that sector', async ({ page }) => {
  await page.goto('/work/?sector=church');
  await expect(page.locator('button[data-f="church"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-grid] > li:visible')).toHaveCount(2);
  await expect(page.locator('[data-status]')).toHaveText('Showing 2 church case studies.');
  await expect(page.locator('[data-more]')).toBeVisible();
});

test('the grid shows large desktop captures with their words and links', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/work/');
  const cards = page.locator('[data-grid] > li');
  await expect(cards).toHaveCount(8);
  const first = cards.first();
  await expect(first.locator('a.tile.desk img')).toHaveAttribute('src', /-cover\.webp$/);
  await expect(first.locator('a.tile.desk video')).toHaveAttribute(
    'data-src',
    /stone-steps-50k\.mp4\?v=[0-9a-f]{8}$/,
  );
  await expect(first.locator('h2')).toHaveText('Stone Steps 50K');
  await expect(first.locator('.label')).toHaveText('Nonprofit');
  await expect(first.locator('.dw-out')).not.toBeEmpty();
  await expect(first.getByRole('link', { name: /^Read the case study/ })).toBeVisible();
  await expect(first.getByRole('link', { name: /^Visit the site/ })).toBeVisible();
  // Big enough to judge the page: two across at 1440, each well over 600px wide.
  const box = (await first.locator('a.tile').boundingBox())!;
  expect(box.width).toBeGreaterThan(600);
});

test('a window opens the client sheet', async ({ page }) => {
  await page.goto('/work/');
  await page.locator('[data-grid] a.tile').first().click();
  const sheet = page.locator('dialog[data-sheet]');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('h2')).toHaveText('Stone Steps 50K');
});

test('a lone study shares its row with its words, and links its sector page', async ({ page }) => {
  await page.goto('/work/?sector=school');
  await expect(page.locator('[data-grid] > li:visible')).toHaveCount(1);
  await expect(page.locator('[data-grid]')).toHaveClass(/\bone\b/);
  await expect(page.locator('[data-more]')).toHaveAttribute('href', '/schools/');
  await expect(page.locator('[data-more]')).toHaveText('How I build for schools');
});

test('an unknown sector falls back to all', async ({ page }) => {
  await page.goto('/work/?sector=castles');
  await expect(page.locator('button[data-f="all"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-status]')).toHaveText('Showing all 8 case studies.');
});

test('a filter click updates the address, the status and the grid', async ({ page }) => {
  await page.goto('/work/');
  await page.locator('button[data-f="nonprofit"]').click();
  await expect(page).toHaveURL(/\?sector=nonprofit/);
  await expect(page.locator('[data-status]')).toHaveText('Showing 3 nonprofit case studies.');
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
  await expect(page.locator('h1')).toHaveAttribute('aria-label', /^Eight selected/);
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
