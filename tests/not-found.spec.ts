import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settle } from './helpers';

// =============================================================================
// The 404 page (overhaul 2.9)
// =============================================================================
// - A mistyped study address suggests the study: /work/stonesteps/ offers
//   Stone Steps 50K first (the scorer itself is unit-tested in
//   src/lib/did-you-mean.test.ts).
// - The empty BrowserFrame's address bar shows the path that failed.
// - When nothing scores close, and without JavaScript, the list is every case
//   study: the same set as the footer's Work column, so the count is never
//   typed in.
// - axe in both themes and no sideways scroll at 320 (the 404 is not in
//   tests/routes.ts, because it has no URL of its own).
//
// The Heft end states (reverse to 200, also under reduced motion) live in
// tests/motion-pause.spec.ts. Chromium only.
// =============================================================================

const TYPO = '/work/stonesteps/';
const NOWHERE = '/a-page-that-was-never-here/';

const studyLinksInFooter = (page: Page) =>
  page
    .locator('footer nav[aria-label="Case studies"] a')
    .evaluateAll((as) => as.map((a) => a.getAttribute('href')).sort());

const suggestionLinks = (page: Page) =>
  page.locator('[data-suggest-list] a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));

test('a mistyped study address is a 404 that suggests Stone Steps', async ({ page }) => {
  const response = await page.goto(TYPO);
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1#notfound-heading')).toHaveCount(1);
  await expect(page.locator('[data-suggest-list]')).toHaveAttribute('data-suggested', /[1-3]/);
  const links = await suggestionLinks(page);
  expect(links.length).toBeLessThanOrEqual(3);
  expect(links[0]).toBe('/work/stone-steps-50k/');
  await expect(page.locator('[data-suggest-heading]')).toHaveText('Did you mean');
});

test('the address bar shows the requested path', async ({ page }) => {
  await page.goto(TYPO);
  await expect(page.locator('[data-notfound-frame] .bf-host')).toContainText(TYPO);
});

test('with nothing close, every case study is listed', async ({ page }) => {
  await page.goto(NOWHERE);
  const links = await suggestionLinks(page);
  expect(links.sort()).toEqual(await studyLinksInFooter(page));
  expect(links.length).toBeGreaterThan(1);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the list is every case study', async ({ page }) => {
    await page.goto(TYPO);
    const links = await suggestionLinks(page);
    expect(links.sort()).toEqual(await studyLinksInFooter(page));
  });
});

for (const theme of ['light', 'dark'] as const) {
  test(`the 404 passes axe in ${theme} mode`, async ({ page }) => {
    await page.addInitScript((t) => window.localStorage.setItem('ncs-theme', t), theme);
    await page.goto(TYPO, { waitUntil: 'domcontentloaded' });
    if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);
    await settle(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}

test.describe('Reflow', () => {
  test.use({ viewport: { width: 320, height: 720 } });
  test('the 404 does not overflow at 320px', async ({ page }) => {
    await page.goto(TYPO, { waitUntil: 'load' });
    await settle(page);
    const { doc, vw } = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      vw: window.innerWidth,
    }));
    expect(doc).toBeLessThanOrEqual(vw);
  });
});
