import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// =============================================================================
// /services copy and structured data: the words ARE the CMS words (PR 7 gate,
// rebuilt for the 2026 redesign of the page)
// =============================================================================
// The headline, section headings, the four reasons, the FAQ and the three service
// chapters come from the `page_services` and `service_offerings` entries; the
// process steps from the Home page entry; and the Service and FAQPage JSON-LD is
// built from the same rows. Two things matter beyond the words being right: it is
// all server-rendered (in the HTML a visitor with no JavaScript, or Google, gets),
// and the structured data matches the visible page.
//
// Headlines turn into the italic second voice for their last phrase (a <span
// class="voice"> inside the heading), so a heading's text is still exactly the
// CMS words; toHaveText normalises the whitespace between the two parts.
//
// The expected text comes from cms/content/*.json. The CI dataset (`ncs-ci`) has
// to carry the same words (scripts/ci-dataset/rows.sql); production serves the
// JSON as its fallback until its data is loaded. Run against production after an
// admin edit and this test will (correctly) notice the words moved: update the
// JSON in the same change.

interface Services {
  heading: string;
  intro: string;
  pricing_heading: string;
  why_heading: string;
  why_items: { title: string; body: string }[];
  faq_heading: string;
  faq: { question: string; answer: string }[];
}
interface Offering {
  slug: string;
  data: {
    title: string;
    body: string;
    price_from?: number;
    image_alt?: string;
    points: { text: string }[];
  };
}
interface Home {
  process_heading: string;
  process_steps: { title: string; body: string }[];
}
const readJson = <T>(name: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), 'cms/content', `${name}.json`), 'utf8')) as T;
const services = readJson<{ data: Services }>('page_services').data;
const offerings = readJson<Offering[]>('service_offerings');
const home = readJson<{ data: Home }>('page_home').data;

// A fresh context with scripts off: the page the no-JS visitor (or a crawler) gets.
test.describe('Services copy without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('/services/: headline, section headings and the FAQ are the CMS words', async ({ page }) => {
    await page.goto('/services/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1#services-hero-heading')).toHaveText(services.heading);
    await expect(page.getByText(services.intro, { exact: true })).toBeVisible();
    await expect(page.locator('#services-pricing-heading')).toHaveText(services.pricing_heading);
    await expect(page.locator('#services-why-heading')).toHaveText(services.why_heading);
    await expect(page.locator('#services-faq-heading')).toHaveText(services.faq_heading);

    // Native <details>: closed by default, and the answer is in the HTML.
    const faq = page.locator('details.faq-item');
    await expect(faq).toHaveCount(services.faq.length);
    for (const [i, item] of services.faq.entries()) {
      await expect(faq.nth(i).locator('summary')).toHaveText(item.question);
      await expect(faq.nth(i).locator('p')).toHaveText(item.answer);
    }

    // The last reason sits in the band's left column, the rest in the list.
    const why = page.locator('.why-item');
    const titles = services.why_items.map((w) => w.title);
    await expect(why.locator('h3')).toHaveText([...titles.slice(-1), ...titles.slice(0, -1)]);
  });

  test('/services/: each offering has its own band with its words and included lines', async ({
    page,
  }) => {
    await page.goto('/services/', { waitUntil: 'domcontentloaded' });
    for (const o of offerings) {
      const band = page.locator(`section#${o.slug}`);
      await expect(band.locator('h2').first()).toHaveText(o.data.title);
      await expect(band.getByText(o.data.body, { exact: true })).toBeVisible();
      for (const point of o.data.points) {
        await expect(band.getByText(point.text, { exact: true })).toBeVisible();
      }
    }
    // No placeholder panels (redesign 2026): Web design shows a real client
    // site, described by the CMS alt text; Strategy draws the one-page brief;
    // Photography draws the call sheet.
    const web = offerings.find((o) => o.slug === 'web-design');
    await expect(page.locator('section#web-design img')).toHaveAttribute(
      'alt',
      web?.data.image_alt ?? '',
    );
    await expect(page.locator('section#strategy figure.brief')).toHaveCount(1);
    await expect(page.locator('section#photography figure.call')).toHaveCount(1);
    await expect(page.locator('.services-shot-placeholder')).toHaveCount(0);
  });

  test('/services/: the process shows the CMS steps with their durations', async ({ page }) => {
    await page.goto('/services/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#process-heading')).toHaveText(home.process_heading);
    const steps = page.locator('.process-steps > li');
    await expect(steps).toHaveCount(home.process_steps.length);
    for (const [i, step] of home.process_steps.entries()) {
      await expect(steps.nth(i).locator('h3')).toHaveText(step.title);
      await expect(steps.nth(i).locator('.step-body')).toHaveText(step.body);
      await expect(steps.nth(i).locator('.step-dur')).not.toBeEmpty();
    }
  });

  test('/services/: a call to action in the hero, mid-page and at the close', async ({ page }) => {
    await page.goto('/services/', { waitUntil: 'domcontentloaded' });
    for (const where of [
      '#services-hero-heading',
      '#services-pricing-heading',
      '#services-close-heading',
    ]) {
      const band = page.locator(where).locator('xpath=ancestor::section[1]');
      await expect(band.locator('a[href="/contact/"]').first()).toBeVisible();
    }
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
