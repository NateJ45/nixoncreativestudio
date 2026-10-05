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
// GA4 fires only on the production hostname (starter PORTS.md card 58)
// =============================================================================
// GoogleAnalytics.astro compares location.hostname with the site's own URL and
// does nothing anywhere else. CI builds without PUBLIC_GA_ID, so on the CI
// static server this passes trivially; it bites on a build made with the id baked in
// (a developer's .env). The 2026-09 report showed 22 localhost and 3 ncs-ci
// sessions in the live property before the guard. Skipped on the real domain,
// where the tag is supposed to fire.
test('GA4 sends nothing off the production hostname, even when the id is built in', async ({
  page,
  baseURL,
}) => {
  const host = new URL(baseURL ?? 'http://localhost').hostname;
  test.skip(
    host === 'nixoncreativestudio.com' || host === 'www.nixoncreativestudio.com',
    'the tag is meant to fire on the production hostname',
  );
  const gaRequests: string[] = [];
  page.on('request', (req) => {
    if (/googletagmanager\.com|google-analytics\.com/.test(req.url())) gaRequests.push(req.url());
  });
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  expect(gaRequests, `requests to Google Analytics from ${host}`).toEqual([]);
  expect(await page.evaluate(() => typeof (window as { dataLayer?: unknown }).dataLayer)).toBe(
    'undefined',
  );
});
