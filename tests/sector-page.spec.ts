import { test, expect } from '@playwright/test';

test('/churches/ lines its section up with the hero, and its window keeps to real content', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/churches/');
  const left = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => el.getBoundingClientRect().left);
  const hero = await left('.ch-head h1');
  expect(Math.abs((await left('.ch-job')) - hero)).toBeLessThan(1);
  expect(Math.abs((await left('.pt h3')) - hero)).toBeLessThan(1);
  // Scrolled through every stop, Orangeburg's window never reaches its empty events band, which
  // starts at 1947 of the 3400 pixels in its 560-wide capture.
  const stand = page.locator('[data-stand="first-presbyterian-orangeburg"]');
  const bottom = page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < (await bottom); y += 500) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(60);
    const shown = await stand.locator('.scr').evaluate((scr) => {
      const img = scr.querySelector('img') as HTMLImageElement;
      const scale = scr.getBoundingClientRect().width / 560;
      return (scr.getBoundingClientRect().bottom - img.getBoundingClientRect().top) / scale;
    });
    expect(shown).toBeLessThan(1947);
  }
});

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
