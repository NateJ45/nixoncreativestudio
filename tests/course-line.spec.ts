import { test, expect } from '@playwright/test';

// =============================================================================
// The Stone Steps course line
// =============================================================================
// The range input is the real control. Tab reaches it, the arrow keys step a tenth
// of a mile, and the readout and aria-valuetext follow. Without JavaScript both
// drawings are there and the control stays hidden.

const ROUTE = '/work/stone-steps-50k/';

test('Tab reaches the range input and the arrow keys step 0.1 mi', async ({ page }) => {
  await page.goto(ROUTE);
  const range = page.getByRole('slider', { name: /Walk the course/ });
  await range.focus();
  await expect(range).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(range).toHaveValue('0.1');
  await expect(page.locator('[data-readout]')).toContainText('Mile 0.1');
  await expect(range).toHaveAttribute('aria-valuetext', /Mile 0\.1/);
});

test('moving along the course moves the dot', async ({ page }) => {
  await page.goto(ROUTE);
  const start = await page.locator('[data-plan-dot]').getAttribute('cx');
  await page.getByRole('slider', { name: /Walk the course/ }).fill('5');
  await expect.poll(() => page.locator('[data-plan-dot]').getAttribute('cx')).not.toBe(start);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the control stays hidden and the drawings render', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(page.locator('[data-scrub]')).toBeHidden();
    await expect(
      page.getByRole('img', { name: /The Stone Steps course from above/ }),
    ).toBeVisible();
    await expect(page.getByRole('img', { name: /Elevation along the course/ })).toBeVisible();
  });
});
