import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// =============================================================================
// Homepage copy: the words on the page ARE the CMS words (CMS-DESIGN PR 6 gate)
// =============================================================================
// The hero headline, the section headings, the pricing "every build includes"
// list and the four process steps now come from the `page_home` entry. The hero
// is the LCP element's neighbour, so two things matter beyond the words being
// right: it is rendered by the server (it is in the HTML a visitor with no
// JavaScript gets) and none of it starts at opacity 0 (CLAUDE.md Gotchas 10 and
// 14), so moving the text to the CMS cannot have moved the LCP.
//
// The expected text comes from cms/content/page_home.json. The CI dataset
// (`ncs-ci`) is generated from that same file (scripts/ci-dataset/cms-fixtures.mjs),
// so on CI the CMS path and the committed fallback hold identical words; and
// production, until its data is loaded, serves the same JSON as its fallback.
// Run against production after an admin edit and this test will (correctly)
// notice the words moved: update the JSON in the same change.

interface Home {
  hero_heading: string;
  hero_heading_accent: string;
  hero_positioning: string;
  hero_proof_before: string;
  hero_proof_link_text: string;
  hero_proof_after: string;
  hero_primary_label: string;
  hero_secondary_label: string;
  work_heading: string;
  pricing_heading: string;
  pricing_includes: { text: string }[];
  process_heading: string;
  process_steps: { title: string; body: string }[];
  process_cta_title: string;
  process_cta_label: string;
}
const home = (
  JSON.parse(readFileSync(join(process.cwd(), 'cms/content/page_home.json'), 'utf8')) as {
    data: Home;
  }
).data;

// A fresh context with scripts off: the page the no-JS visitor (or a crawler) gets.
test.describe('Homepage copy without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('/: the hero is server-rendered with the CMS words and a separate accent span', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const h1 = page.locator('h1#hero-statement');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(`${home.hero_heading} ${home.hero_heading_accent}`);
    // The coloured phrase is its own span (two fields, so an edit cannot break the headline).
    await expect(h1.locator('span')).toHaveText(home.hero_heading_accent);
    await expect(page.locator('.hero-sub')).toHaveText(home.hero_positioning);
    const proof = page.locator('.hero-proof');
    await expect(proof).toContainText(home.hero_proof_before);
    await expect(proof.locator('a')).toHaveText(home.hero_proof_link_text);
    await expect(proof.locator('a')).toHaveAttribute('href', '/about');
    await expect(proof).toContainText(home.hero_proof_after);
    // The space before the link is part of the sentence (it was missing: "byone person").
    expect(await proof.innerText()).toContain(
      `${home.hero_proof_before} ${home.hero_proof_link_text}`,
    );
    await expect(
      page.locator('.hero').getByRole('link', { name: home.hero_primary_label }),
    ).toHaveAttribute('href', '/contact');
    await expect(
      page.locator('.hero').getByRole('link', { name: home.hero_secondary_label }),
    ).toHaveAttribute('href', '/work/');
  });

  test('/: the section headings, includes list and the four process steps are the CMS words', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#selected-work-heading')).toHaveText(home.work_heading);
    await expect(page.locator('#home-pricing-heading')).toHaveText(home.pricing_heading);
    const includes = page.locator('.pricing-teaser ul').first().locator('li');
    await expect(includes).toHaveText(home.pricing_includes.map((i) => i.text));
    await expect(page.locator('#process-band-heading')).toHaveText(home.process_heading);
    const steps = page.locator('.process-steps > li');
    await expect(steps).toHaveCount(4);
    for (const [i, step] of home.process_steps.entries()) {
      await expect(steps.nth(i)).toContainText(String(i + 1).padStart(2, '0'));
      await expect(steps.nth(i).locator('h3')).toHaveText(step.title);
      await expect(steps.nth(i).locator('p')).toHaveText(step.body);
    }
    await expect(page.getByText(home.process_cta_title, { exact: true })).toBeVisible();
    await expect(
      page.locator('.process-band').getByRole('link', { name: home.process_cta_label }),
    ).toHaveAttribute('href', '/contact');
  });

  test('/services/: the process recap shows the same CMS steps', async ({ page }) => {
    await page.goto('/services/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#process-heading')).toHaveText(home.process_heading);
    const steps = page.locator('.process-steps > li');
    await expect(steps).toHaveCount(4);
    for (const [i, step] of home.process_steps.entries()) {
      await expect(steps.nth(i).locator('h3')).toHaveText(step.title);
    }
  });
});

// The first block of the page must not sit behind the JS-gated reveal system
// (CLAUDE.md Gotcha 10). The hero copy has its own CSS-only entrance (a first-frame
// animation, never a JS reveal), and none of its elements may carry data-reveal.
test('/: the hero copy is not behind the JS reveal gate', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const gated = await page.evaluate(() =>
    ['#hero-statement', '.hero-sub', '.hero-proof', '.hero-copy'].filter((sel) => {
      const el = document.querySelector(sel);
      return !el || !!el.closest('[data-reveal]');
    }),
  );
  expect(gated, 'hero elements that are missing or inside a [data-reveal] ancestor').toEqual([]);
});

test('/: the page title and meta description come from the home entry', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/Nixon Creative Studio/);
  const description = await page.locator('meta[name="description"]').getAttribute('content');
  expect((description ?? '').length).toBeGreaterThanOrEqual(50);
});
