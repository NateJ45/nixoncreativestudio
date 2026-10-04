import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// =============================================================================
// Pricing: the static (no-JS) number IS the CMS number (CMS-DESIGN PR 5 gate)
// =============================================================================
// Every price a visitor sees, with or without JavaScript, must be the CMS number:
// the homepage price list and the /services price sheet print them as static text
// (no count-up since the 2026 redesign).
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

  // The homepage price list (2026 rebuild, HomePrices.astro) prints the floors as
  // static Bebas figures: no count-up, so the number is the server-rendered text.
  test('/: the price list prints every CMS tier price as static text', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const figures = page.locator('#prices .tier-figure');
    await expect(figures).toHaveCount(tiers.length);
    for (const [i, t] of tiers.entries()) {
      const expected = `$${t.data.price_from.toLocaleString('en-US')}${t.data.price_suffix ?? ''}`;
      await expect(figures.nth(i)).toHaveText(expected);
    }
    await expect(page.locator('[data-countup]')).toHaveCount(0);
  });

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
