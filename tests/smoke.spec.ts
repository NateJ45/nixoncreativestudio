import { test, expect } from '@playwright/test';
import { routes } from './routes';

// =============================================================================
// Smoke: every route builds and renders (not a 404 / error page)
// =============================================================================

test.describe('Smoke: every route renders', () => {
  for (const route of routes) {
    test(`${route} returns 200 and renders`, async ({ page }) => {
      const resp = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(resp?.status(), `${route} HTTP status`).toBe(200);
      // A real rendered page (every title carries the studio name), not a
      // blank or error body.
      await expect(page).toHaveTitle(/Nixon Creative Studio/);
    });
  }
});

// =============================================================================
// Site chrome: the header links and the footer email are on every page
// =============================================================================
// The header nav, the "Start a project" button and the footer contact details
// come from the CMS (the `primary` menu and Site settings, CMS-DESIGN PR 4), with
// the committed JSON as the fallback. Whichever path served the page, the chrome
// has to be complete, so this checks the rendered DOM on every route (the
// standalone /coming-soon page has no header or footer and is skipped). It reads
// attributes rather than visibility so the mobile profile, where the desktop nav
// is hidden below md, checks the same markup.
//
// "Four header links": Work, Services and About from the menu, plus the
// "Start a project" button. The fourth menu item, Journal, is hidden by design
// until a journal entry is published (the dataset has none).
test.describe('Smoke: header links and footer email on every route', () => {
  for (const route of routes.filter((r) => r !== '/coming-soon')) {
    test(`${route} has the four header links and the footer email`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      const nav = await page
        .locator('header nav[aria-label="Primary"] a')
        .evaluateAll((links) =>
          links.map((a) => [a.textContent?.trim(), a.getAttribute('href')] as const),
        );
      expect(nav, `${route} header menu links`).toEqual([
        ['Work', '/work/'],
        ['Services', '/services'],
        ['About', '/about'],
      ]);

      const cta = page.locator('header a[href="/contact"]').first();
      await expect(cta, `${route} header CTA`).toHaveText('Start a project');

      await expect(
        page.locator('footer a[href="mailto:nathan@nixoncreativestudio.com"]').first(),
        `${route} footer email link`,
      ).toHaveText('nathan@nixoncreativestudio.com');
    });
  }
});

// =============================================================================
// Unknown case study: a real 404, not a 200 with an error body
// =============================================================================
// /work/[slug] is server-rendered from EmDash, so a slug the CMS does not have
// has to answer 404 itself (the route returns an empty-body 404 and Astro
// serves the site's not-found page). A soft 404 here would be indexed by search
// engines as a page.
test.describe('Smoke: unknown case study', () => {
  test('/work/<unknown-slug>/ returns 404 with the not-found page', async ({ page }) => {
    const resp = await page.goto('/work/this-case-study-does-not-exist/', {
      waitUntil: 'domcontentloaded',
    });
    expect(resp?.status(), 'unknown slug HTTP status').toBe(404);
    await expect(page).toHaveTitle(/Page not found \| Nixon Creative Studio/);
  });
});
