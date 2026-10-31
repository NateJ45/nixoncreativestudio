import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { settle } from './helpers';

// =============================================================================
// "What you edit" (WhatYouEdit.astro, overhaul 3.6)
// =============================================================================
// Site-owned, chromium only. A study shows the band only when its frontmatter
// sets `cmsShot`; a study without one renders no band, no heading and no
// image for it. The list is read from the MDX files, so when Nathan adds a
// capture (npm run capture:cms) the study moves into the second group on its
// own. Today no study has one, so only the first group runs.
// =============================================================================

const dir = join(process.cwd(), 'src/content/case-studies');
const studies = readdirSync(dir)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => {
    const frontmatter = readFileSync(join(dir, f), 'utf8').split(/^---$/m)[1] ?? '';
    return { slug: f.replace(/\.mdx$/, ''), hasShot: /^cmsShot:\s*\S/m.test(frontmatter) };
  });

test('every case study is accounted for', () => {
  expect(studies.length).toBeGreaterThan(0);
});

for (const { slug } of studies.filter((s) => !s.hasShot)) {
  test(`/work/${slug}/ without a cmsShot renders no "What you edit" band`, async ({ page }) => {
    await page.goto(`/work/${slug}/`);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-what-you-edit]')).toHaveCount(0);
    await expect(page.locator('#what-you-edit-heading')).toHaveCount(0);
    await expect(page.getByText('What you edit', { exact: true })).toHaveCount(0);
  });
}

for (const { slug } of studies.filter((s) => s.hasShot)) {
  test(`/work/${slug}/ shows its editor screen, axe-clean, inside 320px`, async ({ page }) => {
    await page.goto(`/work/${slug}/`);
    await settle(page);
    const band = page.locator('section:has([data-what-you-edit])');
    await expect(band).toHaveCount(1);
    await expect(band.locator('h2#what-you-edit-heading')).toBeVisible();
    const img = band.locator('img');
    await expect(img).toHaveCount(1);
    expect((await img.getAttribute('alt'))?.trim()).toBeTruthy();
    await expect(img).toHaveAttribute('loading', 'lazy');
    await band.scrollIntoViewIfNeeded();
    const results = await new AxeBuilder({ page })
      .include('section:has([data-what-you-edit])')
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);

    await page.setViewportSize({ width: 320, height: 800 });
    await band.scrollIntoViewIfNeeded();
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(over).toBeLessThanOrEqual(0);
  });
}
