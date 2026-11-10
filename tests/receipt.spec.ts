import { test, expect } from '@playwright/test';

// =============================================================================
// /services: the live receipt, the weeks strip and the step icons
// =============================================================================
// The sums are unit tested (src/lib/receipt.test.ts); this checks the page: the
// receipt prints what the cost table prints for the same choice, Flagship comes
// only with Care or Care+, the no-script page points at the table instead, the
// weeks strip says each row in words, and reduced motion gets everything in its
// finished state.
// =============================================================================

const line = (key: string) => `.rcpt [data-line="${key}"] dd`;

test('the receipt agrees with the cost table, and Flagship comes only with Care or Care+', async ({
  page,
}) => {
  await page.goto('/services/');
  // Opens on Signature with Care over 5 years: the table's "Total after 5 years" for that row.
  const row = page.locator('.cost-table tbody tr', { hasText: 'Plus Care,' }).filter({
    has: page.locator('b', { hasText: 'Signature' }),
  });
  await expect(page.locator(line('total'))).toHaveText(
    (await row.locator('td[data-label="After 5 years"]').textContent()) ?? '',
  );
  // Three years on Launch with Hosting only: the table's 3-year total for its first row.
  await page.locator('.rcpt input[value="Launch"]').check({ force: true });
  await page.locator('.rcpt input[name="r-plan"][value="Hosting"]').check({ force: true });
  await page.locator('#rcpt-years').fill('3');
  await expect(page.locator('[data-rcpt-years]')).toHaveText('3 years');
  const launch = page
    .locator('.cost-table tbody')
    .filter({ has: page.locator('b', { hasText: 'Launch' }) })
    .locator('tr')
    .first();
  await expect(page.locator(line('total'))).toHaveText(
    (await launch.locator('td[data-label="After 3 years"]').textContent()) ?? '',
  );
  await expect(page.locator(line('build'))).toHaveText('$3,500');
  await expect(page.locator('.rcpt [data-line="build"] dt')).toContainText('One-time');
  await expect(page.locator('.rcpt [data-line="hosting"] dt')).toContainText('per year');
  // Flagship: Hosting only and Light Care are off, and the receipt moves to Care.
  await page.locator('.rcpt input[value="Flagship"]').check({ force: true });
  await expect(page.locator('.rcpt input[name="r-plan"][value="Hosting"]')).toBeDisabled();
  await expect(page.locator('.rcpt input[name="r-plan"][value="Light Care"]')).toBeDisabled();
  await expect(page.locator('.rcpt input[name="r-plan"][value="Care"]')).toBeChecked();
  await expect(page.locator('[data-rcpt-need]')).toBeVisible();
  await expect(page.locator('.rcpt [data-line="care"] dt')).toContainText('per month');
});

test('the weeks strip says every row in words, with the as-of date', async ({ page }) => {
  await page.goto('/services/');
  const strip = page.locator('#care [data-weeks]');
  await expect(strip).toContainText(
    'Each dot is a week since the build began. Filled weeks had changes.',
  );
  await expect(strip.locator('.weeks-asof')).toContainText(/As of \w+ \d+, \d{4}/);
  const rows = strip.locator('.weeks-rows li');
  expect(await rows.count()).toBeGreaterThan(0);
  for (const li of await rows.all()) {
    await expect(li.locator('.vh')).toHaveText(/^.+: \d+ weeks?, \d+ with changes$/);
    await expect(li.locator('.wk-dots')).toHaveAttribute('aria-hidden', 'true');
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the dots are filled and the icons drawn, with nothing waiting', async ({ page }) => {
    await page.goto('/services/');
    await expect(page.locator('.weeks.wk-wait')).toHaveCount(0);
    await expect(page.locator('.steps.st-wait')).toHaveCount(0);
    expect(await page.locator('.st-ic').count()).toBe(4);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the receipt is hidden and a note points at the table', async ({ page }) => {
    await page.goto('/services/');
    await expect(page.locator('.rcpt')).toBeHidden();
    await expect(page.locator('.rcpt-nojs')).toBeVisible();
  });
});
