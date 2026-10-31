import { test, expect } from '@playwright/test';
import { routes } from './routes';

// =============================================================================
// Site chrome: header, ink footer and closer (overhaul package 2.1)
// =============================================================================
// - Every BaseLayout page ends on the ink footer, whose closer is an H2 (never
//   a Heft: no data-heft inside it).
// - The footer's Work column lists every case study, computed from the
//   collection, so it must match the cards on /work.
// - The compact "Start a project" pill shows next to the menu button on a
//   phone, and is left out on /contact (it would link to the page itself).
// - The case-study closer deep-links to the form with the study and sector.
// - The header never changes height when the page scrolls.
//
// Chromium only (the WebKit project's testMatch leaves it out).
// =============================================================================

// /coming-soon is a standalone document with no site chrome.
const chromeRoutes = routes.filter((r) => r !== '/coming-soon');

for (const route of chromeRoutes) {
  test(`${route}: ends on the ink footer with a static closer H2`, async ({ page }) => {
    await page.goto(route);
    const footer = page.locator('footer.band-ink');
    await expect(footer).toHaveCount(1);
    await expect(footer.locator('h2#closer-title')).toHaveCount(1);
    await expect(footer.locator('#closer-title [data-heft], #closer-title .heft')).toHaveCount(0);
    // The menu button's no-JS target (CLAUDE.md never-break rule 8).
    await expect(footer.locator('nav#site-nav')).toHaveCount(1);
  });
}

test('the footer Work column lists every case study on /work', async ({ page }) => {
  await page.goto('/work/');
  const footerLinks = await page
    .locator('footer nav[aria-label="Case studies"] a')
    .evaluateAll((as) => as.map((a) => a.getAttribute('href')).sort());
  const cardLinks = await page
    .locator('main a[href^="/work/"]')
    .evaluateAll((as) => [
      ...new Set(
        as.map((a) => a.getAttribute('href') ?? '').filter((h) => /^\/work\/[^/]+\/$/.test(h)),
      ),
    ]);
  expect(footerLinks.length).toBeGreaterThan(0);
  expect(footerLinks).toEqual(cardLinks.sort());
});

test('a case-study closer links to the form with the study and its sector', async ({ page }) => {
  await page.goto('/work/first-presbyterian-orangeburg/');
  await expect(page.locator('#closer-title')).toHaveText(/Building for a\s+church\?/);
  await expect(page.locator('footer .closer a', { hasText: 'Start a project' })).toHaveAttribute(
    'href',
    '/contact/?from=first-presbyterian-orangeburg&org_type=church',
  );
});

test('/contact has a quiet closer with no pill', async ({ page }) => {
  await page.goto('/contact/');
  await expect(page.locator('footer .closer a', { hasText: 'Start a project' })).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the compact CTA is a 44px pill beside the menu button, but not on /contact', async ({
    page,
  }) => {
    await page.goto('/about/');
    const cta = page.locator('header .header-compact-cta');
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await page.goto('/contact/');
    await expect(page.locator('header .header-compact-cta')).toHaveCount(0);
  });
});

for (const width of [1440, 390]) {
  test(`the header keeps its height when the page scrolls (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/work/stone-steps-50k/');
    const header = page.locator('header[data-header]');
    const before = (await header.boundingBox())!.height;
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect(header).toHaveAttribute('data-scrolled', /.*/);
    const after = (await header.boundingBox())!.height;
    expect(after).toBe(before);
  });
}
