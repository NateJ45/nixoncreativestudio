import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { journalOpen } from '../src/data/journal-gate';

// =============================================================================
// The /journal gate
// =============================================================================
// With no published entry, /journal/ still builds but is noindex, out of the
// sitemap and has no link in the closing. Its first entry flips all three.
// =============================================================================

const dir = new URL('../src/content/journal/', import.meta.url);
const published = existsSync(dir)
  ? readdirSync(dir, { recursive: true })
      .map(String)
      .filter((name) => /\.mdx?$/.test(name))
      .filter(
        (name) =>
          !/^draft:\s*true/m.test(readFileSync(new URL(name.replaceAll('\\', '/'), dir), 'utf8')),
      ).length
  : 0;
const open = journalOpen(published);

test(`/journal/ is ${open ? 'open' : 'gated'} (${published} published)`, async ({
  page,
  request,
}) => {
  await page.goto('/journal/');
  const robots = page.locator('meta[name="robots"]');
  if (open) await expect(robots).toHaveCount(0);
  else await expect(robots).toHaveAttribute('content', /noindex/);

  const index = await (await request.get('/sitemap-index.xml')).text();
  const maps = [...index.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]+)<\/loc>/g)].map((m) => m[1]);
  const urls = (await Promise.all(maps.map(async (m) => (await request.get(m)).text()))).join('');
  expect(urls).toContain('/work/');
  expect(urls.includes('/journal/')).toBe(open);

  await page.goto('/');
  const links = page.locator('[data-end] a[href="/journal/"]');
  if (open) await expect(links.first()).toBeAttached();
  else await expect(links).toHaveCount(0);
});
