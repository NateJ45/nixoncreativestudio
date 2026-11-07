import { test, expect } from '@playwright/test';

// =============================================================================
// Forced colors: a card still has an edge
// =============================================================================
// Windows High Contrast drops shadows and backgrounds, and a card here is drawn
// with both. kit.css answers with a real border under forced-colors.

test('forced colors: a tier card, a price card and a window keep a visible edge', async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/');
  for (const sel of ['.pc-face', 'a.tile']) {
    const width = await page
      .locator(sel)
      .first()
      .evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(parseFloat(width), sel).toBeGreaterThanOrEqual(1);
  }
});
