import { test, expect } from '@playwright/test';

// =============================================================================
// /photography: the light table
// =============================================================================
// The table is a script's view of a plain grid of links. These check the
// keyboard path through it (WCAG 2.1.1 and 2.5.7: nothing needs a drag), the
// full view, the filter and the Grid switch, and that the grid alone is a
// working gallery with JavaScript off.
// =============================================================================

test.describe('with JavaScript', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/photography/');
  });

  test('the table is laid with prints and the grid steps aside', async ({ page }) => {
    await expect(page.locator('[data-stage]')).toBeVisible();
    await expect(page.locator('[data-grid]')).toBeHidden();
    expect(await page.locator('.pt-p').count()).toBeGreaterThan(8);
  });

  test('the arrow keys move the table and Enter opens the print in the middle', async ({
    page,
  }) => {
    const world = page.locator('[data-world]');
    const coords = page.locator('[data-coords]');
    await world.focus();
    const before = await coords.textContent();
    await page.keyboard.press('ArrowRight');
    await expect(coords).not.toHaveText(before ?? '');
    await expect(page.locator('[data-now]')).toContainText('In the middle:');
    await page.keyboard.press('Enter');
    const dlg = page.locator('dialog[data-open]');
    await expect(dlg).toBeVisible();
    await expect(dlg.locator('[data-title]')).not.toBeEmpty();
    await expect(dlg.locator('img, video')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
    await expect(world).toBeFocused();
  });

  test('the move buttons move the table without a drag', async ({ page }) => {
    const coords = page.locator('[data-coords]');
    const before = await coords.textContent();
    await page.getByRole('button', { name: 'Move down' }).click();
    await expect(coords).not.toHaveText(before ?? '');
  });

  test('Next walks the prints and counts them', async ({ page }) => {
    await page.locator('[data-world]').focus();
    await page.keyboard.press('Enter');
    const dlg = page.locator('dialog[data-open]');
    const title = await dlg.locator('[data-title]').textContent();
    await dlg.getByRole('button', { name: 'Next' }).click();
    await expect(dlg.locator('[data-title]')).not.toHaveText(title ?? '');
    await expect(dlg.locator('[data-count]')).toHaveText(/^\d+ of \d+$/);
  });

  test('a filter lays only that kind, and Grid shows the plain grid', async ({ page }) => {
    const btn = page.locator('button[data-f="weddings"]');
    const n = Number(await btn.locator('.n').textContent());
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-status]')).toHaveText(`Showing ${n} weddings.`);
    await page.locator('button[data-v="grid"]').click();
    await expect(page.locator('[data-grid]')).toBeVisible();
    await expect(page.locator('[data-grid] > li:visible')).toHaveCount(n);
    // A link in the grid opens the same full view.
    await page.locator('[data-grid] > li:visible a').first().click();
    await expect(page.locator('dialog[data-open]')).toBeVisible();
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the grid is the gallery: every print is a named link to its full-size image', async ({
    page,
  }) => {
    await page.goto('/photography/');
    await expect(page.locator('[data-stage]')).toBeHidden();
    const links = page.locator('[data-grid] a.print');
    expect(await links.count()).toBeGreaterThan(20);
    await expect(links.first()).toHaveAttribute('href', /\.webp$/);
    await expect(links.first()).toHaveAttribute('aria-label', /\w+\. \w+/);
  });
});
