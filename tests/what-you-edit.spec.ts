import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';

// =============================================================================
// What the staff edit: the site's own editor, only where there is a capture
// =============================================================================

const dir = 'src/content/case-studies/';
const studies = readdirSync(dir)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => {
    const text = readFileSync(dir + f, 'utf8').replace(/\r\n/g, '\n');
    const frontmatter = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
    return { slug: f.replace(/\.mdx$/, ''), hasShot: /^cmsShot:\s*\S/m.test(frontmatter) };
  });

test('every case study is accounted for', () => {
  expect(studies.length).toBeGreaterThan(0);
});

for (const { slug } of studies.filter((s) => !s.hasShot)) {
  test(`/work/${slug}/ without a cmsShot shows no editor chapter`, async ({ page }) => {
    await page.goto(`/work/${slug}/`);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.chap.edit')).toHaveCount(0);
  });
}

for (const { slug } of studies.filter((s) => s.hasShot)) {
  test(`/work/${slug}/ shows its editor screen, with real size and alt`, async ({ page }) => {
    await page.goto(`/work/${slug}/`);
    const img = page.locator('.chap.edit figure.cms img');
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute('alt', /\S/);
    await expect(img).toHaveAttribute('loading', 'lazy');
    await expect(img).toHaveAttribute('width', '1440');
    await expect(img).toHaveAttribute('height', '900');
  });
}
