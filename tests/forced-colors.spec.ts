import { test, expect } from '@playwright/test';

// =============================================================================
// Forced colors (Windows High Contrast) keeps surface edges visible
// =============================================================================
// Forced-colors mode throws away box-shadows and background colours. On this
// site that would erase the rings around framed artifacts, the hairlines at a
// change of surface, and the edge of a navy band. globals.css answers with a
// `@media (forced-colors: active)` block that gives .frame, .surface-card,
// .band-ink, .band-themed and .hairline a real border or outline, which the
// browser keeps (in a system colour). This checks one route, as the overhaul
// plan asks: the footer is a .band-themed surface on every page, so its top
// border is the visible proof. Chromium only (the WebKit project matches a
// fixed list of specs).
// =============================================================================

test('forced colors: the footer band keeps a visible top border', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/about/');
  const border = await page.locator('footer.band-themed').evaluate((el) => {
    const s = getComputedStyle(el);
    return { style: s.borderTopStyle, width: s.borderTopWidth };
  });
  expect(border.style).toBe('solid');
  expect(border.width).toBe('1px');

  // And not outside forced colors: the rule must stay scoped to the media query.
  await page.emulateMedia({ forcedColors: 'none' });
  const normal = await page
    .locator('footer.band-themed')
    .evaluate((el) => getComputedStyle(el).borderTopStyle);
  expect(normal).not.toBe('solid');
});
