import { test, expect } from '@playwright/test';

// =============================================================================
// /services: the Prices page
// =============================================================================

test.describe('Prices', () => {
  test('every tier links the form with its name', async ({ page }) => {
    await page.goto('/services/');
    for (const tier of ['launch', 'signature', 'flagship']) {
      await expect(page.locator(`#websites a[href="/contact/?tier=${tier}"]`)).toHaveCount(1);
    }
  });

  test('the on-this-page links land on a section, and open a closed one', async ({ page }) => {
    await page.goto('/services/');
    for (const a of await page.locator('.jump a').all()) {
      const id = ((await a.getAttribute('href')) ?? '').slice(1);
      await expect(page.locator(`[id="${id}"]`), id).toHaveCount(1);
    }
    await page.locator('.jump a[href="#why"]').click();
    await expect(page.locator('details#why')).toHaveJSProperty('open', true);
  });

  test('three questions deal a card, and it links the form', async ({ page }) => {
    await page.goto('/services/');
    const pick = page.locator('[data-pick]');
    await pick.scrollIntoViewIfNeeded();
    await pick.getByRole('radio', { name: 'The essential pages' }).check();
    await pick.getByRole('radio', { name: 'A few pages' }).check();
    await expect(page.locator('[data-pick-go]')).toBeHidden();
    await pick.getByRole('radio', { name: 'Connect to other services' }).check();
    await expect(page.locator('[data-pick-name]')).toHaveText('Signature');
    await expect(page.locator('[data-pick-price]')).toHaveText('$9,000');
    const go = page.locator('[data-pick-go]');
    await expect(go).toBeVisible();
    await expect(go).toHaveAttribute('href', '/contact/?tier=signature');
  });

  test('the care table reads from the plans', async ({ page }) => {
    await page.goto('/services/');
    const heads = page.locator('table.care thead th');
    await expect(heads).toHaveCount(4);
    await expect(heads.first()).toContainText('$180');
    await expect(page.locator('table.care')).toContainText('Same business day replies');
    // Software updates start at Light Care: not included in Hosting, included after.
    const row = page.locator('table.care tr', { hasText: 'Software and security updates' });
    await expect(row.locator('td.n')).toHaveCount(1);
    await expect(row.locator('td.y')).toHaveCount(3);
  });

  test('the FAQPage JSON-LD equals the visible FAQ', async ({ page }) => {
    await page.goto('/services/');
    const graph = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .evaluate((s) => JSON.parse(s.textContent ?? '{}'));
    const faq = (graph['@graph'] as { '@type': string; mainEntity: { name: string }[] }[]).find(
      (n) => n['@type'] === 'FAQPage',
    );
    const asked = await page.locator('.faq summary').allTextContents();
    expect(faq?.mainEntity.map((q) => q.name)).toEqual(asked.map((t) => t.trim()));
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('the tiers, care plans and FAQ are all in the markup', async ({ page }) => {
      await page.goto('/services/');
      await expect(page.locator('.tier')).toHaveCount(3);
      await expect(page.locator('.t-price').first()).toHaveText('$5,000+');
      await expect(page.locator('.faq details')).toHaveCount(8);
      await expect(page.locator('[data-sites] a.tile')).toHaveCount(4);
    });
  });
});
