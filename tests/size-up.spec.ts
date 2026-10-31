import { test, expect, type Page } from '@playwright/test';

// =============================================================================
// "Size up your project" on /services (overhaul package 3.3)
// =============================================================================
// - With JavaScript OFF: the answers show the right tier through CSS :has()
//   alone, and "Send this to Nathan" is a plain GET to /contact/ carrying
//   tier, org_type, service and from=services (the names /contact reads).
// - With JavaScript ON: the same send lands on /contact with the org type
//   selected and the budget chip for that tier picked (2.7's prefill), and
//   the footer closer's pill carries the answers too.
// - The tier is the larger of the size and features answers.
// - The sites shown are matched by sector, and the tier panel never names a
//   client (public-safe rule).
// Chromium only (the WebKit project's testMatch leaves it out).
// =============================================================================

async function answer(
  page: Page,
  { org, size, features, photos }: { org: string; size: string; features: string; photos: string },
) {
  const form = page.locator('form[data-size-up]');
  await form.locator(`#su-org-${org}`).check();
  await form.locator(`#su-size-${size}`).check();
  await form.locator(`#su-feat-${features}`).check();
  await form.locator(`#su-photo-${photos}`).check();
}

const visibleTiers = (page: Page) =>
  page
    .locator('form[data-size-up] [data-tier]')
    .evaluateAll((els) =>
      els
        .filter((el) => getComputedStyle(el).display !== 'none')
        .map((el) => (el as HTMLElement).dataset.tier),
    );

for (const javaScriptEnabled of [false, true]) {
  test.describe(`JavaScript ${javaScriptEnabled ? 'on' : 'off'}`, () => {
    test.use({ javaScriptEnabled });

    test('nothing is picked until size and features are answered', async ({ page }) => {
      await page.goto('/services/');
      await expect(page.locator('.su-wait')).toBeVisible();
      expect(await visibleTiers(page)).toEqual([]);
      await page.locator('#su-size-deep').check();
      expect(await visibleTiers(page)).toEqual([]);
    });

    const cases = [
      { size: 'focused', features: 'none', tier: 'launch' },
      { size: 'focused', features: 'integrations', tier: 'signature' },
      { size: 'larger', features: 'none', tier: 'signature' },
      { size: 'larger', features: 'custom', tier: 'flagship' },
      { size: 'deep', features: 'none', tier: 'flagship' },
    ];
    for (const c of cases) {
      test(`${c.size} + ${c.features} lands on ${c.tier}`, async ({ page }) => {
        await page.goto('/services/');
        await answer(page, {
          org: 'church',
          size: c.size,
          features: c.features,
          photos: 'web-design',
        });
        expect(await visibleTiers(page)).toEqual([c.tier]);
        await expect(page.locator('.su-wait')).toBeHidden();
      });
    }

    test('sites match the sector, and the tier panel names no client', async ({ page }) => {
      await page.goto('/services/');
      await answer(page, { org: 'church', size: 'larger', features: 'none', photos: 'web-design' });
      const set = page.locator('.su-set[data-set="church"]');
      await expect(set).toBeVisible();
      await expect(page.locator('.su-set[data-set="any"]')).toBeHidden();
      await expect(set.locator('li')).not.toHaveCount(0);
      const hrefs = await set
        .locator('li > a:first-child')
        .evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      for (const href of hrefs) expect(href).toMatch(/^\/work\/[a-z0-9-]+\/$/);
      // No client link or host inside any tier panel.
      await expect(page.locator('[data-tier] a')).toHaveCount(0);
    });

    test('the photo line shows only when photos are needed', async ({ page }) => {
      await page.goto('/services/');
      await answer(page, {
        org: 'school',
        size: 'focused',
        features: 'none',
        photos: 'web-design',
      });
      await expect(page.locator('[data-tier="launch"] .su-photo-add')).toBeHidden();
      await page.locator('#su-photo-web-design-and-photography').check();
      await expect(page.locator('[data-tier="launch"] .su-photo-add')).toBeVisible();
    });

    test('Send this to Nathan hands the answers to /contact', async ({ page }) => {
      await page.goto('/services/');
      await answer(page, {
        org: 'nonprofit',
        size: 'larger',
        features: 'integrations',
        photos: 'web-design-and-photography',
      });
      await Promise.all([
        page.waitForURL(/\/contact\/\?/),
        page.locator('[data-tier="signature"] button[type="submit"]').click(),
      ]);
      const url = new URL(page.url());
      expect(url.searchParams.get('tier')).toBe('signature');
      expect(url.searchParams.get('org_type')).toBe('nonprofit');
      expect(url.searchParams.get('service')).toBe('web-design-and-photography');
      expect(url.searchParams.get('from')).toBe('services');

      if (javaScriptEnabled) {
        // 2.7's prefill picked it all up.
        await expect(page.locator('select#org_type')).toHaveValue('nonprofit');
        await expect(page.locator('input[name="budget"][value="7k-12k"]')).toBeChecked();
        await expect(page.locator('input[name="tier"]')).toHaveValue('signature');
        await expect(page.locator('input[name="service"]')).toHaveValue(
          'web-design-and-photography',
        );
        await expect(page.locator('input[name="from"]')).toHaveValue('services');
      }
    });
  });
}

test.describe('with JavaScript', () => {
  test('the closer pill carries the answers', async ({ page }) => {
    await page.goto('/services/');
    const pill = page.locator('.closer a[href^="/contact/"]');
    await expect(pill).toHaveAttribute('href', '/contact/?from=services');
    await answer(page, { org: 'church', size: 'deep', features: 'none', photos: 'web-design' });
    const href = (await pill.getAttribute('href')) ?? '';
    const params = new URL(href, 'https://example.com').searchParams;
    expect(params.get('tier')).toBe('flagship');
    expect(params.get('org_type')).toBe('church');
    expect(params.get('from')).toBe('services');
    await expect(page.getByRole('status').filter({ hasText: 'Where it lands' })).toHaveText(
      /Flagship/,
    );
  });
});
