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
