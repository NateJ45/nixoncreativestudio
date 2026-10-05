import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// =============================================================================
// /services copy and structured data: the words ARE the CMS words (PR 7 gate)
// =============================================================================
// The headline, section headings, the four reasons, the FAQ and the three service
// chapters now come from the `page_services` and `service_offerings` entries, and
// the Service and FAQPage JSON-LD is built from the same rows. Two things matter
// beyond the words being right: it is all server-rendered (it is in the HTML a
// visitor with no JavaScript, or Google, gets), and the structured data matches the
// visible page, so an FAQ edit can never leave Google reading an old answer.
//
// The expected text comes from cms/content/*.json. The CI dataset (`ncs-ci`) is
// generated from the same files (scripts/ci-dataset/cms-fixtures.mjs) and
// production serves them as its fallback until its data is loaded. Run against
// production after an admin edit and this test will (correctly) notice the words
// moved: update the JSON in the same change.

interface Services {
  heading: string;
  intro: string;
  pricing_heading: string;
  addons_heading: string;
  why_heading: string;
  why_items: { title: string; body: string }[];
  faq_heading: string;
  faq: { question: string; answer: string }[];
}
interface Offering {
  slug: string;
  data: { title: string; body: string; price_from?: number; points: { text: string }[] };
}
const readJson = <T>(name: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), 'cms/content', `${name}.json`), 'utf8')) as T;
const services = readJson<{ data: Services }>('page_services').data;
const offerings = readJson<Offering[]>('service_offerings');

// A fresh context with scripts off: the page the no-JS visitor (or a crawler) gets.
test.describe('Services copy without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('/services/: headline, section headings and the FAQ are the CMS words', async ({ page }) => {
    await page.goto('/services/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1#services-hero-heading')).toHaveText(services.heading);
    await expect(page.locator('#services-pricing-heading')).toHaveText(services.pricing_heading);
    await expect(page.locator('#services-why-heading')).toHaveText(services.why_heading);
    await expect(page.locator('#services-faq-heading')).toHaveText(services.faq_heading);
    await expect(page.getByRole('heading', { name: services.addons_heading })).toBeVisible();

    const faq = page.locator('details.faq-item');
    await expect(faq).toHaveCount(services.faq.length);
    for (const [i, item] of services.faq.entries()) {
      await expect(faq.nth(i).locator('summary')).toHaveText(item.question);
      await expect(faq.nth(i).locator('p')).toHaveText(item.answer);
    }

    const why = page.locator('#services-why-heading').locator('xpath=ancestor::section[1]//li');
    await expect(why.locator('h3')).toHaveText(services.why_items.map((w) => w.title));
  });

  test('/services/: each chapter shows its title, paragraph and included lines', async ({
    page,
  }) => {
    await page.goto('/services/', { waitUntil: 'domcontentloaded' });
    const chapters = page.locator('section[aria-label="Service details"] > div > ul > li');
    await expect(chapters).toHaveCount(offerings.length);
    for (const [i, o] of offerings.entries()) {
      await expect(chapters.nth(i).locator('h2')).toHaveText(o.data.title);
      await expect(chapters.nth(i).getByText(o.data.body, { exact: true })).toBeVisible();
      for (const point of o.data.points) {
        await expect(chapters.nth(i).getByText(point.text, { exact: true })).toBeVisible();
      }
    }
    // The Web design chapter keeps its real screenshot; the other two keep the placeholder panel.
    await expect(chapters.nth(1).locator('img')).toHaveCount(1);
    await expect(chapters.nth(0).locator('.services-shot-placeholder')).toHaveCount(1);
    await expect(chapters.nth(2).locator('.services-shot-placeholder')).toHaveCount(1);
  });

  test('/services/: the Service and FAQPage JSON-LD is built from the same data', async ({
    page,
  }) => {
    await page.goto('/services/', { waitUntil: 'domcontentloaded' });
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((els) => els.map((e) => e.textContent ?? ''));
    const graph = blocks.flatMap((b) => JSON.parse(b) as Record<string, unknown>[]);
    const faq = graph.find((g) => g['@type'] === 'FAQPage') as {
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(
      services.faq.map((f) => [f.question, f.answer]),
    );
    const svc = graph.filter((g) => g['@type'] === 'Service') as {
      name: string;
      description: string;
      offers?: { priceSpecification: { minPrice: number } };
    }[];
    expect(svc.map((s) => [s.name, s.description])).toEqual(
      offerings.map((o) => [o.data.title, o.data.body]),
    );
    // Strategy and Photography carry their own floors; Web design's follows the first tier.
    expect(svc[0].offers?.priceSpecification.minPrice).toBe(offerings[0].data.price_from);
    expect(svc[2].offers?.priceSpecification.minPrice).toBe(offerings[2].data.price_from);
    expect(svc[1].offers?.priceSpecification.minPrice).toBeGreaterThan(0);
  });
});

test('/services/: the title and meta description come from the services entry', async ({
  page,
}) => {
  await page.goto('/services/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/^Services \| Nixon Creative Studio$/);
  const description = await page.locator('meta[name="description"]').getAttribute('content');
  expect((description ?? '').length).toBeGreaterThanOrEqual(50);
});
