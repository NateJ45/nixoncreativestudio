import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// =============================================================================
// Pricing: the static (no-JS) number IS the CMS number (CMS-DESIGN PR 5 gate)
// =============================================================================
// The homepage "What it costs" band counts its prices up on scroll. The count-up script starts from 0, so the number a
// visitor with no JavaScript (or a crawler, or a reduced-motion user before the
// observer fires) sees is the server-rendered text. That text must equal the
// price in the CMS, and the count-up target (`data-countup-to`) must equal it
// too, or the page would show one number and animate to another.
//
// The expected prices come from cms/content/pricing_tiers.json. The CI dataset
// (`ncs-ci`) is generated from that same file (scripts/ci-dataset/cms-fixtures.mjs),
// so on CI the CMS path and the committed fallback hold identical numbers; and
// production, until its data is loaded, serves the same JSON as its fallback.
// Run against production after an admin edit and this test will (correctly)
// notice the number moved: update the JSON in the same change.

interface Entry {
  slug: string;
  data: { name: string; price_from: number; price_suffix?: string; sort_order: number };
}
const tiers = (
  JSON.parse(readFileSync(join(process.cwd(), 'cms/content/pricing_tiers.json'), 'utf8')) as Entry[]
).sort((a, b) => a.data.sort_order - b.data.sort_order);
const addOns = JSON.parse(
  readFileSync(join(process.cwd(), 'cms/content/pricing_addons.json'), 'utf8'),
) as { data: { name: string; price: string } }[];

// A fresh context with scripts off: the page the no-JS visitor gets.
test.describe('Pricing without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const route of ['/']) {
    test(`${route}: every count-up shows its real CMS number as static text`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const counters = page.locator('[data-countup]');
      // Three tiers, each with one count-up price. (The /services page has no
      // other count-up in the pricing section; the About page's are not here.)
      const targets = await counters.evaluateAll((els) =>
        els.map((el) => ({
          text: (el.textContent ?? '').trim(),
          to: el.getAttribute('data-countup-to'),
        })),
      );
      const expected = tiers.map((t) => t.data.price_from);
      const pricing = targets.filter((t) => expected.includes(Number(t.to)));
      expect(pricing.map((t) => Number(t.to))).toEqual(expected);
      for (const t of pricing) {
        expect(Number(t.text.replace(/,/g, '')), `static text "${t.text}" vs target ${t.to}`).toBe(
          Number(t.to),
        );
        expect(t.text).not.toBe('0');
      }
    });
  }

  // /services sets the tier prices as plain printed figures on the price sheet
  // (no count-up: price as a document, redesign 2026), and lists every published
  // price, add-ons included, on the price list slip in the hero.
  test('/services/: the price sheet and the price list show the CMS prices', async ({ page }) => {
    await page.goto('/services/', { waitUntil: 'domcontentloaded' });
    const figures = page.locator('#prices .tier-figure');
    await expect(figures).toHaveCount(tiers.length);
    for (const [i, t] of tiers.entries()) {
      const expected = `$${t.data.price_from.toLocaleString('en-US')}${t.data.price_suffix ?? ''}`;
      await expect(figures.nth(i)).toHaveText(expected);
    }
    const slip = page.locator('#price-list');
    for (const t of tiers) {
      await expect(slip).toContainText(`from $${t.data.price_from.toLocaleString('en-US')}`);
    }
    for (const a of addOns) {
      await expect(slip.getByText(a.data.price, { exact: true })).toBeVisible();
    }
    const ld = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((els) => els.map((el) => JSON.parse(el.textContent ?? 'null')));
    const web = ld.flat().find((s) => s?.['@type'] === 'Service' && s.name === 'Web design');
    expect(web?.offers?.priceSpecification?.minPrice).toBe(tiers[0].data.price_from);
  });
});
