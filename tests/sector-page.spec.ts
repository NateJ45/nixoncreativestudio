import { test, expect } from '@playwright/test';

// =============================================================================
// /churches: the sector page
// =============================================================================

test('/churches/ shows exactly the church studies, with their quotes', async ({ page }) => {
  await page.goto('/churches/');
  const studies = page.locator('.ch-studies .study');
  await expect(studies).toHaveCount(2);
  await expect(studies.locator('h3').first()).toHaveText('First Baptist Church Muncie');
  await expect(studies.locator('blockquote')).toHaveCount(2);
  await expect(studies.locator('a[href^="/work/"]')).toHaveCount(4);
  await expect(page.locator('[data-end] h2')).toContainText('church?');
});

test('a church study and the filter link back to the page', async ({ page }) => {
  await page.goto('/work/?sector=church');
  await expect(page.locator('[data-more]')).toHaveAttribute('href', '/churches/');
});

test('/churches/ is a CollectionPage with a Home > Churches trail', async ({ page }) => {
  await page.goto('/churches/');
  const graph = await page
    .locator('script[type="application/ld+json"]')
    .first()
    .evaluate((s) => JSON.parse(s.textContent ?? '{}'));
  const nodes = graph['@graph'] as { '@type': string | string[]; itemListElement?: unknown[] }[];
  expect(nodes.some((n) => n['@type'] === 'CollectionPage')).toBe(true);
  expect(nodes.find((n) => n['@type'] === 'ItemList')?.itemListElement).toHaveLength(2);
  expect(nodes.find((n) => n['@type'] === 'BreadcrumbList')?.itemListElement).toHaveLength(2);
});
