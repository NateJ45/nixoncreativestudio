import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// =============================================================================
// /colophon stays true of the code (never-break rule 11)
// =============================================================================

test('the colophon names the font and hosting this build really uses', async ({ page }) => {
  await page.goto('/colophon/');
  await expect(page.locator('.prose')).toContainText('Hanken Grotesk');
  await expect(page.locator('.prose')).toContainText('Astro');
  await expect(page.locator('.prose')).toContainText('Cloudflare');
  const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(font).toContain('Hanken Grotesk');
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  expect(pkg.dependencies.astro).toMatch(/^\^7\./);
});

test('every font this site loads is its own', async ({ page }) => {
  const fonts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'font') fonts.push(new URL(r.url()).host);
  });
  await page.goto('/colophon/', { waitUntil: 'load' });
  const here = new URL(page.url()).host;
  expect(fonts.length).toBeGreaterThan(0);
  expect(fonts.every((h) => h === here)).toBe(true);
});

test('the window beside the text is a real link', async ({ page }) => {
  await page.goto('/colophon/');
  await expect(page.locator('[data-colo-win] a.tile')).toHaveAttribute(
    'href',
    '/work/mas-monograms/',
  );
});
