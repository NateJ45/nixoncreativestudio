import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';

// =============================================================================
// Client quotes: only real ones, as blockquotes with a name
// =============================================================================
// src/lib/case-testimonials.test.ts guards the data; this guards the page.

const dir = 'src/content/case-studies/';
const studies = readdirSync(dir)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => {
    const text = readFileSync(dir + f, 'utf8');
    return { slug: f.replace(/\.mdx$/, ''), count: (text.match(/^\s*- quote:/gm) ?? []).length };
  });

for (const { slug, count } of studies) {
  test(`/work/${slug}/ shows ${count} quote(s) with a name`, async ({ page }) => {
    await page.goto(`/work/${slug}/`);
    await expect(page.locator('figure.q blockquote')).toHaveCount(count);
    await expect(page.locator('figure.q figcaption b')).toHaveCount(count);
    if (count === 0) await expect(page.locator('#in-their-words')).toHaveCount(0);
  });
}

test('the homepage shows one quote band, with its window linking the study', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main blockquote')).toHaveCount(1);
  await expect(page.locator('.band a.tile')).toHaveAttribute('href', '/work/theology-matters/');
});

test('/about/ shows two quote bands', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.locator('.band blockquote')).toHaveCount(2);
});

test('a quote band never touches the closing', async ({ page }) => {
  for (const route of ['/', '/about/', '/churches/']) {
    await page.goto(route);
    const touching = await page.evaluate(
      () =>
        document.querySelector('[data-end]')?.previousElementSibling?.classList.contains('band') ??
        false,
    );
    expect(touching, route).toBe(false);
  }
});
