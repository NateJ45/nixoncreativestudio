import { test, expect } from '@playwright/test';

// =============================================================================
// The lean sector pages and the /work/ index by job
// =============================================================================
// /schools/, /nonprofits/ and /small-business/ share src/components/SectorLean.astro.
// Each shows the studies that exist for its sector, says how thin the proof is, keeps
// tiers and clients apart, and ends on the same call to action.

const LEAN = [
  { path: '/schools/', sector: 'school', studies: 1, closing: 'none does' },
  { path: '/nonprofits/', sector: 'nonprofit', studies: 3, closing: 'none does' },
  { path: '/small-business/', sector: 'small-business', studies: 2, closing: 'none does' },
];

for (const { path, sector, studies, closing } of LEAN) {
  test.describe(path, () => {
    test('shows exactly its studies, as large windows with both links', async ({ page }) => {
      await page.goto(path);
      const list = page.locator('[data-sl-studies] > li');
      await expect(list).toHaveCount(studies);
      await expect(list.locator('a.tile.desk')).toHaveCount(studies);
      await expect(list.getByRole('link', { name: /^Read the case study/ })).toHaveCount(studies);
      await expect(list.getByRole('link', { name: /^Visit the site/ })).toHaveCount(studies);
    });

    test('names three tiers with their starting prices, and no client among them', async ({
      page,
    }) => {
      await page.goto(path);
      const tiers = page.locator('.sl-tiers > li');
      await expect(tiers).toHaveCount(3);
      await expect(tiers.first().locator('.sl-from')).toHaveText('From $5,000');
      await expect(tiers.locator('a[href^="/work/"]')).toHaveCount(0);
    });

    test('ends on the call to action, and links the summary', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('[data-end] h2')).toContainText(closing);
      await expect(
        page.locator('main a[href="/one-page/"], a[href="/one-page/"]').first(),
      ).toBeVisible();
      await expect(page.locator(`a[href="/contact/?org_type=${sector}"]`)).toBeVisible();
    });

    test('is a CollectionPage with a Home > sector trail', async ({ page }) => {
      await page.goto(path);
      const graph = await page
        .locator('script[type="application/ld+json"]')
        .first()
        .evaluate((s) => JSON.parse(s.textContent ?? '{}'));
      const nodes = graph['@graph'] as {
        '@type': string | string[];
        itemListElement?: unknown[];
      }[];
      expect(nodes.some((n) => n['@type'] === 'CollectionPage')).toBe(true);
      expect(nodes.find((n) => n['@type'] === 'ItemList')?.itemListElement).toHaveLength(studies);
      expect(nodes.find((n) => n['@type'] === 'BreadcrumbList')?.itemListElement).toHaveLength(2);
    });
  });
}

test('/schools/ says the proof is thin: one school, and new', async ({ page }) => {
  await page.goto('/schools/');
  const note = page.locator('.sl-note').first();
  await expect(note).toContainText('the one school in my case studies');
  await expect(note).toContainText('it is new');
  await expect(note).toContainText('no enrollment figures');
});

test('/nonprofits/ offers a board or grant summary', async ({ page }) => {
  await page.goto('/nonprofits/');
  await expect(page.locator('.sl-after')).toContainText('board or a grant');
});

test('the closing links every sector page, and a study links back to its own', async ({ page }) => {
  await page.goto('/work/');
  for (const href of ['/churches/', '/schools/', '/nonprofits/', '/small-business/']) {
    await expect(page.locator(`[data-end] .legal a[href="${href}"]`)).toHaveCount(1);
  }
  await page.goto('/work/presbyterian-academy/');
  await expect(page.locator('a.tlink[href="/schools/"]')).toHaveText('How I build for schools');
});

test.describe('/work/ by job', () => {
  test('every job has studies, and every study link lands', async ({ page, request }) => {
    await page.goto('/work/');
    const jobs = page.locator('#jobs .job');
    expect(await jobs.count()).toBeGreaterThanOrEqual(3);
    for (const job of await jobs.all()) {
      await expect(job.locator('h3')).not.toHaveText('');
      const links = job.locator('.job-studies a');
      expect(await links.count()).toBeGreaterThan(0);
      for (const a of await links.all()) {
        const href = (await a.getAttribute('href')) ?? '';
        expect(href).toMatch(/^\/work\/[a-z0-9-]+\/$/);
        expect((await request.get(href)).status(), href).toBe(200);
      }
    }
  });

  test('the section shows in the list view too', async ({ page }) => {
    await page.goto('/work/?view=list');
    await expect(page.locator('#jobs h2')).toHaveText('What the site has to do');
    await expect(page.locator('#jobs')).toBeVisible();
  });
});
