import { test, expect } from '@playwright/test';

// =============================================================================
// Sector pages: /churches/ (overhaul package 4.2)
// =============================================================================
// Site-owned. src/pages/[sector].astro builds one page per entry in
// src/data/sector-pages.ts. This checks the one that exists:
//   - it shows exactly the church studies /work shows (the count is read from
//     the /work tab, never typed), each linking to its study and live site;
//   - the rail's count matches, the quote is a real <blockquote>, and the
//     closer pill carries ?from=churches&org_type=church to /contact;
//   - /work/?sector=church links to the page while that tab is on, and the
//     church studies' breadcrumb points at it;
//   - the JSON-LD names a CollectionPage with a Home > Churches trail.
// axe (both themes), reflow at 320, first viewport and page weight cover it
// through tests/routes.ts.
// =============================================================================

async function churchCount(page: import('@playwright/test').Page): Promise<number> {
  await page.goto('/work/');
  return Number(await page.locator('[data-sector-link="church"] .work-tab-count').innerText());
}

test('/churches/ shows every church study and nothing else', async ({ page }) => {
  const n = await churchCount(page);
  expect(n).toBeGreaterThan(0);
  await page.goto('/churches/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  const studies = page.locator('.sector-study');
  await expect(studies).toHaveCount(n);
  // Every name links to a study, and the study is a church study on /work.
  await page.goto('/work/');
  const churchSlugs = await page
    .locator('[data-work-row][data-sector="church"]')
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.slug));
  await page.goto('/churches/');
  const linked = await page
    .locator('.sector-study-name a')
    .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  expect(linked.sort()).toEqual(churchSlugs.map((s) => `/work/${s}/`).sort());
});

test('/churches/ carries a real quote and a church closer', async ({ page }) => {
  await page.goto('/churches/');
  await expect(page.locator('main blockquote')).toHaveCount(1);
  await expect(
    page.locator('footer a[href="/contact/?from=churches&org_type=church"]'),
  ).toHaveCount(1);
});

test('/work/?sector=church and the church studies link to /churches/', async ({ page }) => {
  await page.goto('/work/?sector=church');
  const link = page.locator('[data-sector-page="church"] a');
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', '/churches/');
  // Another sector hides it again.
  await page.locator('[data-sector-link="all"]').click();
  await expect(link).toBeHidden();

  await page.goto('/work/first-presbyterian-orangeburg/');
  await expect(page.locator('nav[aria-label="Breadcrumb"] a[href="/churches/"]')).toHaveCount(1);
});

test('/churches/ JSON-LD is a CollectionPage with a Home > Churches trail', async ({ page }) => {
  await page.goto('/churches/');
  const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
  const graph = (JSON.parse(raw ?? '{}')['@graph'] ?? []) as Array<Record<string, unknown>>;
  const webpage = graph.find((n) => String(n['@id']).endsWith('/churches/#webpage'));
  expect(webpage?.['@type']).toBe('CollectionPage');
  const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList');
  const names = (crumbs?.itemListElement as Array<{ name: string }>).map((c) => c.name);
  expect(names).toEqual(['Home', 'Churches']);
});
