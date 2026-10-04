import { test, expect } from '@playwright/test';
import { caseStudySlugs } from './routes';

// =============================================================================
// The case study template (2026 redesign): outcome first, the title printed
// once, a plain-label facts ledger, a call to action mid-page and at the close
// that both preselect the sector on the contact form, and honest status labels.
// Runs over the CI case studies (tests/routes.ts); nothing here is
// entry-specific, so it holds on production's nine as well.
// =============================================================================

for (const slug of caseStudySlugs) {
  test.describe(`/work/${slug}/`, () => {
    test('the title is printed once and the outcome follows it', async ({ page }) => {
      await page.goto(`/work/${slug}/`, { waitUntil: 'domcontentloaded' });
      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1);
      const title = (await h1.innerText()).trim();
      expect(title.length).toBeGreaterThan(0);
      // A.7: no second line repeating the name in the hero.
      const hero = page.locator('.cs-hero');
      const repeats = await hero
        .locator('p, dd, span')
        .filter({
          hasText: new RegExp(`^\\s*${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'),
        })
        .count();
      expect(repeats, 'the client name is not printed again under the title').toBe(0);
      await expect(page.locator('.cs-outcome')).not.toBeEmpty();
    });

    test('the facts ledger uses plain labels, and the stack is one quiet line', async ({
      page,
    }) => {
      await page.goto(`/work/${slug}/`, { waitUntil: 'domcontentloaded' });
      const labels = await page.locator('.cs-ledger dt').allInnerTexts();
      expect(labels.length).toBeGreaterThan(0);
      for (const l of labels) {
        // Sentence case words, never tracked capitals or "BUILT WITH" scaffolding.
        expect(l).not.toMatch(/^[A-Z\s:]+$/);
      }
      await expect(page.getByText(/^BUILT WITH/)).toHaveCount(0);
    });

    test('both calls to action preselect the sector on the contact form', async ({ page }) => {
      await page.goto(`/work/${slug}/`, { waitUntil: 'domcontentloaded' });
      const ctas = page.locator('a[href^="/contact/?org_type="]');
      // The mid-page one (when the study has results) and the closing banner.
      expect(await ctas.count()).toBeGreaterThanOrEqual(1);
      for (const href of await ctas.evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
        expect(href).toMatch(/^\/contact\/\?org_type=(church|school|nonprofit|small-business)$/);
      }
      // The retired lines (D-copy-positioning.md lines 4 and 5).
      await expect(page.getByText(/like this one all the time/)).toHaveCount(0);
      await expect(page.getByText(/small number of projects each quarter/)).toHaveCount(0);
    });

    test('a study that is not live is labelled and never linked as live', async ({ page }) => {
      await page.goto(`/work/${slug}/`, { waitUntil: 'domcontentloaded' });
      const status = page.locator('.cs-status');
      if ((await status.count()) > 0) {
        await expect(status).toHaveText(/Launching soon|In progress|Built, not launched/);
        await expect(page.getByText(/^Visit the live site/)).toHaveCount(0);
        await expect(page.locator('.cs-visit a', { hasText: /^Visit / })).toHaveCount(0);
      }
    });

    test('the closing band shows its heading and button without waiting on a reveal', async ({
      page,
    }) => {
      // Found blank at the foot of every case study on 2026-10-04: the band's copy sat
      // behind data-reveal. Jump straight to the end, as a visitor pressing End would.
      await page.goto(`/work/${slug}/`, { waitUntil: 'load' });
      await page.keyboard.press('End');
      const band = page.locator('.cta-band');
      await expect(band.locator('#cta-banner-title')).toBeVisible();
      await expect(band.locator('[data-reveal]')).toHaveCount(0);
      await expect(band.locator('a[href^="/contact/"]')).toBeVisible();
    });

    test('a showreel, when there is one, keeps its poster as a real eager image', async ({
      page,
    }) => {
      await page.goto(`/work/${slug}/`, { waitUntil: 'domcontentloaded' });
      const poster = page.locator('nx-reel img.nxr-poster');
      if ((await poster.count()) === 0) return;
      await expect(poster).toHaveAttribute('fetchpriority', 'high');
      await expect(poster).toHaveAttribute('width', /\d+/);
      await expect(poster).toHaveAttribute('height', /\d+/);
    });
  });
}

// The two CI studies that are not live (scripts/ci-dataset/rows.sql carries their
// launch_status, as cms/content does): the status shows, and neither the frame's
// address bar nor any link names the church's or the school's own domain.
const notLive: Record<string, { label: RegExp; domain: RegExp }> = {
  'second-presbyterian-chicago': { label: /Built, not launched/, domain: /secondpreschicago\.org/ },
  'presbyterian-academy': { label: /In progress/, domain: /presbyterianacademy\.org/ },
};
for (const [slug, want] of Object.entries(notLive)) {
  if (!caseStudySlugs.includes(slug)) continue;
  test(`/work/${slug}/ is labelled as not live and links no live address`, async ({ page }) => {
    await page.goto(`/work/${slug}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.cs-status')).toHaveText(want.label);
    if ((await page.locator('.cs-hero .frame').count()) > 0) {
      await expect(page.locator('.cs-hero .frame-tag')).toHaveText(want.label);
    }
    const chrome = await page.locator('.cs-hero .frame-url').allInnerTexts();
    for (const t of chrome) expect(t).not.toMatch(want.domain);
    const hrefs = await page
      .locator('main a[href^="http"]')
      .evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    for (const h of hrefs) expect(h).not.toMatch(want.domain);
  });
}
