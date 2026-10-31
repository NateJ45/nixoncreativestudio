import { test, expect } from '@playwright/test';
import { routes } from './routes';

// =============================================================================
// No React on any page (overhaul 1.4, widened in 2.8)
// =============================================================================
// The site chrome (theme toggle, mobile nav, back-to-top, copy email, reading
// progress, the /work filter) is plain .astro markup plus small scripts. Since
// overhaul 2.8 /photography is a gated page with no gallery, so no route uses
// React at all: every one must render no <astro-island> and fetch no React
// chunk, so a stray client:* directive shows up here before it shows up in the
// budget. When package 4.6 brings PhotoGallery back on /photography, add that
// route to GALLERY_ROUTES.
//
// Chromium only (the WebKit project's testMatch leaves it out).
// =============================================================================

const GALLERY_ROUTES = new Set<string>([]);

for (const route of routes.filter((r) => !GALLERY_ROUTES.has(r))) {
  test(`${route} ships no React`, async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', (req) => {
      if (req.resourceType() === 'script') scripts.push(new URL(req.url()).pathname);
    });
    await page.goto(route, { waitUntil: 'load' });
    // Give idle and visible hydration a chance to fire, as a visitor would.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    await expect(page.locator('astro-island')).toHaveCount(0);
    const react = scripts.filter((p) => /react|jsx-runtime|\/client\.[\w-]+\.js$/i.test(p));
    expect(react, `React chunks requested on ${route}`).toEqual([]);
  });
}
