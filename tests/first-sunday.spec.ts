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
  // The answer says in words where it was found, so nobody has to read the picture.
  await expect(sun.locator('[data-sun-a]:visible')).toHaveText(
    /Found it about 2 scrolls down, in the note on nursery care/,
  );
  await expect
    .poll(() => img.evaluate((el) => el.getBoundingClientRect().top))
    .toBeLessThan(before - 200);
});

test('the questions say they can be tapped, and point at their answers', async ({ page }) => {
  await page.goto('/churches/');
  const sun = page.locator('[data-sun]');
  await expect(sun.getByText('Tap a question', { exact: true })).toBeVisible();
  await expect(sun.locator('.sun-qs button svg')).toHaveCount(4);
});

test('on a phone the picture comes before the questions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/churches/');
  const sun = page.locator('[data-sun]');
  const phone = await sun.locator('[data-sun-w]').evaluate((el) => el.getBoundingClientRect().top);
  const first = await sun
    .getByRole('button', { name: 'When is it, and where?' })
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(phone).toBeLessThan(first);
});

test('with reduced motion a question still jumps the page to its answer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/churches/');
  const sun = page.locator('[data-sun]');
  await sun.scrollIntoViewIfNeeded();
  const img = sun.locator('.scr img');
  const before = await img.evaluate((el) => el.getBoundingClientRect().top);
  await sun.getByRole('button', { name: 'What about my kids?' }).click();
  await expect(sun.locator('[data-sun-a]:visible')).toHaveCount(1);
  await expect
    .poll(() => img.evaluate((el) => el.getBoundingClientRect().top))
    .toBeLessThan(before - 200);
});

test('the church page says which tier usually fits, with starting prices', async ({ page }) => {
  await page.goto('/churches/');
  const tiers = page.locator('.sl-tiers > li');
  await expect(tiers).toHaveCount(3);
  await expect(tiers.first().locator('.sl-from')).toHaveText('From $3,500');
  await expect(tiers.locator('a[href^="/work/"]')).toHaveCount(0);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('every question and answer is readable', async ({ page }) => {
    await page.goto('/churches/');
    await expect(page.locator('[data-sun] [data-sun-a]:visible')).toHaveCount(4);
  });
});
