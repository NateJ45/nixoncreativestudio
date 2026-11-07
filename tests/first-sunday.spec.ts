import { expect, test } from '@playwright/test';

test('a question moves the real page and shows its answer', async ({ page }) => {
  await page.goto('/churches/');
  const sun = page.locator('[data-sun]');
  await sun.scrollIntoViewIfNeeded();
  const img = sun.locator('.scr img');
  await expect(sun.locator('[data-sun-a]:visible')).toHaveCount(1);
  const before = await img.evaluate((el) => el.getBoundingClientRect().top);
  await sun.getByRole('button', { name: 'What about my kids?' }).click();
  await expect(sun.getByRole('button', { name: 'What about my kids?' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(sun.locator('[data-sun-a]:visible')).toHaveText(/before you have to ask/);
  await expect
    .poll(() => img.evaluate((el) => el.getBoundingClientRect().top))
    .toBeLessThan(before - 200);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('every question and answer is readable', async ({ page }) => {
    await page.goto('/churches/');
    await expect(page.locator('[data-sun] [data-sun-a]:visible')).toHaveCount(4);
  });
});
