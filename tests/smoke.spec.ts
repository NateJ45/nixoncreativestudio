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
