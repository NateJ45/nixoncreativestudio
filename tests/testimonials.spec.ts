import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settle } from './helpers';

// =============================================================================
// Testimonials (Testimonial.astro, testimonials package)
// =============================================================================
// Site-owned, chromium only. Every study with a client quote shows it as a
// <blockquote> with a <cite>, passes axe in both themes and reflows at 320px;
// a study without one shows none; the homepage shows exactly one quote,
// linked to its study. The words themselves are checked by hand against the
// vault note (it lives outside the repo); src/lib/case-testimonials.test.ts
// checks the frontmatter shape and which studies carry quotes.
// =============================================================================

const WITH = [
  { route: '/work/theology-matters/', count: 1 },
  { route: '/work/foundation-for-reformed-theology/', count: 1 },
  { route: '/work/stone-steps-50k/', count: 1 },
  { route: '/work/first-baptist-muncie/', count: 2 },
  { route: '/work/first-presbyterian-orangeburg/', count: 1 },
];
const WITHOUT = ['/work/presbyterian-academy/', '/work/mas-monograms/', '/work/reid-design/'];

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).include('.ncs-quotes').analyze();
  return results.violations.map((v) => `[${v.impact ?? 'unknown'}] ${v.id}: ${v.help}`).join('\n');
}

for (const { route, count } of WITH) {
  test.describe(route, () => {
    test(`shows ${count} quote(s) with a cite, axe-clean in light`, async ({ page }) => {
      await page.goto(route);
      await settle(page);
      const quotes = page.locator('.ncs-quotes figure');
      await expect(quotes).toHaveCount(count);
      await expect(page.locator('.ncs-quotes blockquote')).toHaveCount(count);
      await expect(page.locator('.ncs-quotes figcaption cite')).toHaveCount(count);
      await page.locator('.ncs-quotes').scrollIntoViewIfNeeded();
      expect(await axe(page)).toBe('');
    });

    test('axe-clean in dark', async ({ page }) => {
      await page.addInitScript(() => window.localStorage.setItem('ncs-theme', 'dark'));
      await page.goto(route);
      await expect(page.locator('html')).toHaveClass(/dark/);
      await settle(page);
      await page.locator('.ncs-quotes').scrollIntoViewIfNeeded();
      expect(await axe(page)).toBe('');
    });

    test('reflows at 320px', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(route);
      await settle(page);
      const block = page.locator('.ncs-quotes');
      await block.scrollIntoViewIfNeeded();
      const over = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth - window.innerWidth,
        right: document.querySelector('.ncs-quotes')!.getBoundingClientRect().right,
      }));
      expect(over.page).toBeLessThanOrEqual(0);
      expect(over.right).toBeLessThanOrEqual(320);
    });
  });
}

for (const route of WITHOUT) {
  test(`${route} shows no quote`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('.ncs-quotes')).toHaveCount(0);
  });
}

test('the homepage shows one quote, linked to its study', async ({ page }) => {
  await page.goto('/');
  await settle(page);
  await expect(page.locator('main blockquote')).toHaveCount(1);
  const link = page.locator('.ncs-quotes-more a');
  await expect(link).toHaveAttribute('href', /^\/work\/[a-z0-9-]+\/$/);
  await page.locator('.ncs-quotes').scrollIntoViewIfNeeded();
  expect(await axe(page)).toBe('');
});
