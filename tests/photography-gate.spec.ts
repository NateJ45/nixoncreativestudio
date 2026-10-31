import { readdirSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { photographyOpen } from '../src/data/photography-gate';

// =============================================================================
// The /photography gate (overhaul 2.8)
// =============================================================================
// While the photos collection holds fewer than MIN_PHOTOS real photographs,
// /photography/ still builds but is noindex, missing from the sitemap and
// missing from the header, mobile menu and footer. Once it opens, all three
// flip together. The count comes from the same JSON files the collection's
// glob loader and the sitemap filter in astro.config.mjs read.
// =============================================================================

const photoFiles = readdirSync(new URL('../src/content/photos/', import.meta.url), {
  recursive: true,
}).filter((name) => String(name).endsWith('.json')).length;
const open = photographyOpen(photoFiles);

test(`/photography/ is ${open ? 'open' : 'gated'} (${photoFiles} photos)`, async ({
  page,
  request,
}) => {
  await page.goto('/photography/');
  const robots = page.locator('meta[name="robots"]');
  if (open) {
    await expect(robots).toHaveCount(0);
  } else {
    await expect(robots).toHaveAttribute('content', /noindex/);
  }

  // The sitemap index points at sitemap-0.xml (one file at this size); read
  // every sitemap it names so a split into sitemap-1.xml is still covered.
  const index = await (await request.get('/sitemap-index.xml')).text();
  const maps = [...index.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(maps.length).toBeGreaterThan(0);
  const urls = (await Promise.all(maps.map(async (m) => (await request.get(m)).text()))).join('');
  expect(urls).toContain('/work/');
  expect(urls.includes('/photography/')).toBe(open);

  // Nav: the header and the footer's Studio column (#site-nav) read getNav().
  await page.goto('/');
  const navLinks = page.locator(
    'header a[href="/photography/"], #site-nav a[href="/photography/"]',
  );
  if (open) {
    await expect(navLinks.first()).toBeAttached();
  } else {
    await expect(navLinks).toHaveCount(0);
  }
});
