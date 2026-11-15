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

test('the windows beside the text are real links, one in front at a time', async ({ page }) => {
  await page.goto('/colophon/');
  const slides = page.locator('[data-colo-slide]');
  expect(await slides.count()).toBeGreaterThan(1);
  // Every slide is a link to its case study; only the one in front can be reached.
  const hrefs = await page
    .locator('[data-colo-win] a.tile')
    .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  expect(hrefs.every((h) => /^\/work\/[a-z0-9-]+\/$/.test(h ?? ''))).toBe(true);
  await expect(page.locator('[data-colo-slide]:not([inert])')).toHaveCount(1);
});

test('the window deck moves on by itself and the Pause button stops it', async ({ page }) => {
  await page.clock.install();
  await page.goto('/colophon/');
  const front = page.locator('[data-colo-slide].is-on .cap b');
  const first = await front.textContent();
  await page.mouse.move(0, 0);
  await page.clock.runFor(5000);
  await expect(front).not.toHaveText(first ?? '');
  const hold = page.locator('[data-colo-hold]');
  await hold.click();
  await expect(hold).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.move(0, 0);
  const held = await front.textContent();
  await page.clock.runFor(10000);
  await expect(front).toHaveText(held ?? '');
});
