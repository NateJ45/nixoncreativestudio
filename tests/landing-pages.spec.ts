import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// =============================================================================
// The four search landing pages (src/components/landing/LandingPage.astro)
// =============================================================================
// /church-websites/, /nonprofit-websites/, /school-websites/ and
// /cincinnati-event-photography/. Their words are entries of the `pages`
// collection; production and the CI dataset carry none yet, so both serve the
// committed cms/content/pages.json, which is where the expected words below come
// from. Once Nathan loads (and edits) the entries in production, a run against
// production will notice the moved words: update the JSON in the same change.
//
// What is pinned:
//   1. With JavaScript OFF the page is whole: the h1 and intro are the CMS words,
//      every FAQ answer is in the HTML (native <details>), and the call to action
//      reaches the contact form with the organization type preset.
//   2. The JSON-LD parses: a Service, an FAQPage whose questions are the visible
//      ones, and a BreadcrumbList.
//   3. axe finds nothing (also swept by a11y.spec.ts through tests/routes.ts).
//   4. The page is in the sitemap and linked from the footer.

interface PtBlock {
  style?: string;
  listItem?: string;
  children?: { text: string }[];
}
interface Entry {
  slug: string;
  data: { title: string; heading: string; summary: string; intro: PtBlock[]; content: PtBlock[] };
}
const entries = JSON.parse(
  readFileSync(join(process.cwd(), 'cms/content/pages.json'), 'utf8'),
) as Entry[];
const text = (b: PtBlock) => (b.children ?? []).map((c) => c.text).join('');

const PAGES: { path: string; slug: string; preset: string }[] = [
  { path: '/church-websites/', slug: 'church-websites', preset: '/contact/?org_type=church' },
  {
    path: '/nonprofit-websites/',
    slug: 'nonprofit-websites',
    preset: '/contact/?org_type=nonprofit',
  },
  { path: '/school-websites/', slug: 'school-websites', preset: '/contact/?org_type=school' },
  // A photo day is booked by any kind of organization, so no preset.
  {
    path: '/cincinnati-event-photography/',
    slug: 'cincinnati-event-photography',
    preset: '/contact/',
  },
];

for (const { path, slug, preset } of PAGES) {
  const entry = entries.find((e) => e.slug === slug)!.data;
  const questions = entry.content.filter((b) => b.style === 'h3').map(text);

  test.describe(`${path}`, () => {
    test.describe('without JavaScript', () => {
      test.use({ javaScriptEnabled: false });

      test('the words, every answer and the way to the contact form are all there', async ({
        page,
      }) => {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveTitle(`${entry.title} | Nixon Creative Studio`);
        await expect(page.locator('main h1')).toHaveText(entry.heading);
        await expect(page.locator('main')).toContainText(text(entry.intro[0]));
        await expect(page.locator('meta[name="description"]')).toHaveAttribute(
          'content',
          entry.summary,
        );
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
          'href',
          `https://nixoncreativestudio.com${path}`,
        );

        // Every question, and its answer is in the HTML even while closed.
        const items = page.locator('main details');
        await expect(items.locator('summary')).toHaveText(questions);
        // Every paragraph and list item of the body (answers included, closed or
        // not) is server-rendered: toContainText reads textContent.
        const main = page.locator('main');
        for (const b of entry.content) {
          if (b.style !== 'h2' && b.style !== 'h3') await expect(main).toContainText(text(b));
        }

        // The first call to action, in the hero, is one click from the form.
        const hero = page.locator('main a[href^="/contact/"]').first();
        await expect(hero).toBeVisible();
        await expect(hero).toHaveAttribute('href', preset);
        // And it comes back at the close.
        await expect(page.locator(`main a[href="${preset}"]`).last()).toBeVisible();
      });
    });

    test('the JSON-LD parses: a Service, the visible FAQ and a breadcrumb', async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      const all = blocks.flatMap((b) => {
        const j = JSON.parse(b);
        return Array.isArray(j) ? j : j['@graph'] ? j['@graph'] : [j];
      }) as Record<string, unknown>[];
      const service = all.find((j) => j['@type'] === 'Service');
      expect(service, 'Service').toBeTruthy();
      expect(service!.url).toBe(`https://nixoncreativestudio.com${path}`);
      expect(service!.provider).toEqual({ '@id': 'https://nixoncreativestudio.com#organization' });
      const faq = all.find((j) => j['@type'] === 'FAQPage') as
        { mainEntity: { name: string }[] } | undefined;
      expect(faq?.mainEntity.map((q) => q.name)).toEqual(questions);
      expect(all.some((j) => j['@type'] === 'BreadcrumbList')).toBe(true);
    });

    test('passes axe', async ({ page }) => {
      await page.goto(path, { waitUntil: 'load' });
      const res = await new AxeBuilder({ page }).analyze();
      expect(res.violations.map((v) => v.id)).toEqual([]);
    });

    test('is linked from the footer', async ({ page }) => {
      await page.goto('/services/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator(`footer a[href="${path}"]`)).toHaveCount(1);
    });
  });
}

test('the four landing pages are in the sitemap', async ({ request }) => {
  const res = await request.get('/sitemap-0.xml');
  test.skip(!res.ok(), 'sitemap-0.xml is built at deploy time');
  const xml = await res.text();
  for (const { path } of PAGES) expect(xml).toContain(`https://nixoncreativestudio.com${path}`);
});
