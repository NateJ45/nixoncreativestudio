import { test, expect, type Page } from '@playwright/test';

// =============================================================================
// /services (overhaul package 2.5)
// =============================================================================
// - The sticky "On this page" sub-nav: Tab to each link, press Enter, and the
//   target heading lands below both sticky bars (the header and the sub-nav),
//   with and without JavaScript, at 1440, 768 and 320. That is what
//   scroll-padding-top on <html> is for (WCAG 2.4.11, focus not obscured).
// - The page never repeats the home's three studies (the lowest `order`) in
//   "Recently shipped".
// - Every web tier links to /contact/?tier=..., and the add-ons sit in a
//   <details> whose summary shows their prices.
// - The FAQPage JSON-LD is the visible FAQ text, word for word.
//
// Chromium only (the WebKit project's testMatch leaves it out).
// =============================================================================

const anchors = ['web-design', 'photography', 'pricing', 'size-up', 'care', 'faq'];

/** Where the heading sits against the bottom of the two sticky bars. */
async function clearance(page: Page, id: string) {
  return page.evaluate((id) => {
    const heading = document.getElementById(id)!.getBoundingClientRect();
    const nav = document.querySelector('.svc-subnav')!.getBoundingClientRect();
    const header = document.querySelector('[data-header]')!.getBoundingClientRect();
    return {
      headingTop: heading.top,
      barsBottom: Math.max(nav.bottom, header.bottom),
      navUnderHeader: nav.top < header.bottom - 0.5,
    };
  }, id);
}

for (const javaScriptEnabled of [true, false]) {
  test.describe(`sub-nav, JavaScript ${javaScriptEnabled ? 'on' : 'off'}`, () => {
    test.use({ javaScriptEnabled, reducedMotion: 'reduce' });

    for (const width of [1440, 768, 320]) {
      test(`each anchored heading clears the sticky bars at ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto('/services/');
        for (const id of anchors) {
          await page.evaluate(() => window.scrollTo(0, 0));
          const link = page.locator(`.svc-subnav a[href="#${id}"]`);
          await link.focus();
          await page.keyboard.press('Enter');
          await expect(page).toHaveURL(new RegExp(`#${id}$`));
          await expect
            .poll(async () => (await clearance(page, id)).headingTop, { timeout: 3000 })
            .toBeLessThan(800);
          const { headingTop, barsBottom, navUnderHeader } = await clearance(page, id);
          expect(navUnderHeader, 'the sub-nav sits below the header').toBe(false);
          expect(headingTop, `#${id} is below both sticky bars`).toBeGreaterThanOrEqual(barsBottom);
        }
      });
    }
  });
}

test('every tier starts a project with its name, and the add-ons show their prices', async ({
  page,
}) => {
  await page.goto('/services/');
  const tierLinks = page.locator('a[href^="/contact/?tier="]');
  expect(await tierLinks.count()).toBeGreaterThanOrEqual(3);
  for (const href of await tierLinks.evaluateAll((els) => els.map((e) => e.getAttribute('href')))) {
    expect(href).toMatch(/^\/contact\/\?tier=[a-z]+$/);
  }
  const summary = page.locator('details.pt-addons > summary');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('$');
});

test('"Recently shipped" never repeats a study from the home', async ({ page }) => {
  await page.goto('/');
  const homeStudies = await page
    .locator('.sw-title a')
    .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  expect(homeStudies.length).toBeGreaterThan(0);
  await page.goto('/services/');
  const recent = await page
    .locator('.svc-recent-title a')
    .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  expect(recent.length).toBe(2);
  for (const href of recent) expect(homeStudies).not.toContain(href);
});

test('the FAQPage JSON-LD equals the visible FAQ', async ({ page }) => {
  await page.goto('/services/');
  const graph = await page.evaluate(() =>
    [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) =>
      JSON.parse(s.textContent ?? '{}'),
    ),
  );
  type Q = { name: string; acceptedAnswer: { text: string } };
  const faqNode = graph
    .flatMap((g) => g['@graph'] ?? [g])
    .find((n: { '@type'?: string }) => n['@type'] === 'FAQPage') as { mainEntity: Q[] } | undefined;
  expect(faqNode).toBeTruthy();
  const visible = await page.locator('.svc-faq-item').evaluateAll((items) =>
    items.map((d) => ({
      q: d.querySelector('summary')!.textContent!.trim(),
      a: d.querySelector('p')!.textContent!.trim(),
    })),
  );
  expect(faqNode!.mainEntity.map((q) => ({ q: q.name, a: q.acceptedAnswer.text }))).toEqual(
    visible,
  );
});
