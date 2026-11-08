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

test('the homepage band carries every quote, one at a time, starting with Theology Matters', async ({
  page,
}) => {
  await page.goto('/');
  const band = page.locator('.home-band');
  await expect(band.locator('blockquote')).toHaveCount(studies.reduce((n, s) => n + s.count, 0));
  await expect(band.locator('[data-q]:not([inert])')).toHaveCount(1);
  await expect(band.locator('[data-tw]:not([inert]) a.tile').first()).toHaveAttribute(
    'href',
    '/work/theology-matters/',
  );
});

test('Next and Previous step the home band through each client, color and window', async ({
  page,
}) => {
  await page.goto('/');
  const band = page.locator('.home-band');
  const n = studies.reduce((n, s) => n + s.count, 0);
  const count = band.locator('[data-q-count]');
  await expect(count).toHaveText(`1 / ${n}`);
  const accent = () => band.evaluate((el) => el.style.getPropertyValue('--c'));
  const first = await accent();
  const seen = new Set<string>();
  for (let i = 2; i <= n; i++) {
    await band.locator('[data-q-next]').click();
    await expect(count).toHaveText(`${i} / ${n}`);
    const live = band.locator('[data-q]:not([inert])');
    await expect(live).toHaveCount(1);
    const slug = await live.getAttribute('data-slug');
    await expect(band.locator('[data-tw]:not([inert]) a.tile').first()).toHaveAttribute(
      'href',
      `/work/${slug}/`,
    );
    expect(await accent()).toBe(await live.getAttribute('data-c'));
    seen.add(slug!);
  }
  expect(seen.size).toBeGreaterThan(1);
  await band.locator('[data-q-next]').click();
  await expect(count).toHaveText(`1 / ${n}`);
  expect(await accent()).toBe(first);
  await band.locator('[data-q-prev]').click();
  await expect(count).toHaveText(`${n} / ${n}`);
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

test('the home band shows a desktop window on a phone and the phone on a wide screen', async ({
  page,
}) => {
  const visible = () => page.locator('.home-band [data-tw]:not([inert]) a.tile:visible');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(visible()).toHaveCount(1);
  await expect(visible()).toHaveClass(/\bdesk\b/);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(visible()).toHaveCount(1);
  await expect(visible()).not.toHaveClass(/\bdesk\b/);
});
