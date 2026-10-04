import { test, expect, type Page } from '@playwright/test';

// =============================================================================
// Layout stability: nothing moves after the first paint (CLS)
// =============================================================================
// Lighthouse CI failed on 2026-10-04 with CLS 0.30 on /contact/ and 0.11 on
// /photography/ while the live site measured 0. Three causes, all fixed:
//
//   1. The CI runner is Linux, which has neither Georgia nor Impact, so the
//      metric-matched fallbacks did not apply and the swap to Newsreader / Bebas
//      reflowed the hero. globals.css now carries a second fallback set matched to
//      Times New Roman / Liberation Serif and Arial Narrow / Liberation Sans Narrow.
//   2. The window-light sun layer was placed with `top: -6%` of its band, so
//      every change in the band's height moved a viewport-sized layer and the
//      whole hero counted as shifted. It now uses fixed lengths.
//   3. The photo gallery rendered an EMPTY container on the server and grew on
//      hydration (client:visible), a shift as it scrolled in. It now ships its
//      rows in the server HTML (react-photo-album's SSR breakpoints).
//
// These tests hold all three. Web fonts are deliberately DELAYED so they always
// arrive after the first paint (the race the CI runner lost two runs in three),
// and the page's own layout-shift entries are summed. Chromium only: WebKit has
// no layout-shift entries. They target PLAYWRIGHT_BASE_URL like every spec and
// never submit the form.
// =============================================================================

const FONT_DELAY_MS = 1000;
/** Well under Lighthouse's 0.1 gate, with room for sub-pixel noise. */
const MAX_CLS = 0.05;

async function clsWithLateFonts(page: Page, path: string): Promise<{ cls: number; log: string }> {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: { v: number; src: string }[] };
    w.__cls = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as {
        value: number;
        hadRecentInput: boolean;
        sources: { node?: Node | null }[];
      }[]) {
        if (e.hadRecentInput) continue;
        w.__cls.push({
          v: e.value,
          src: e.sources
            .map((s) =>
              s.node instanceof Element ? `${s.node.tagName}.${s.node.className}` : '#text',
            )
            .join(' | '),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.route(/\.woff2(\?|$)/, async (route) => {
    await new Promise((r) => setTimeout(r, FONT_DELAY_MS));
    await route.continue();
  });
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // Past the font swap and the grounds' idle-time texture attach.
  await page.waitForTimeout(2000);
  const entries = await page.evaluate(
    () => (window as unknown as { __cls: { v: number; src: string }[] }).__cls,
  );
  return {
    cls: entries.reduce((sum, e) => sum + e.v, 0),
    log: entries.map((e) => `${e.v.toFixed(4)} ${e.src}`).join('\n'),
  };
}

test.describe('Layout stability while web fonts load', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'layout-shift entries are Chromium only',
  );

  for (const width of [412, 1280]) {
    for (const path of ['/contact/', '/photography/']) {
      test(`${path} at ${width}px does not move when the fonts arrive late`, async ({ page }) => {
        await page.setViewportSize({ width, height: 823 });
        const { cls, log } = await clsWithLateFonts(page, path);
        expect(cls, `layout shifts on ${path}:\n${log}`).toBeLessThan(MAX_CLS);
      });
    }
  }
});

test.describe('The photo gallery is in the server HTML', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'one engine is enough for a geometry check',
  );

  test('its rows are server-rendered, and hydration does not change its height', async ({
    browser,
    request,
  }) => {
    const html = await (await request.get('/photography/')).text();
    // Production has no photos yet (the page shows its "in progress" note and no
    // gallery); the CI dataset carries one, which is what this measures.
    test.skip(!html.includes('data-photo-gallery'), 'no photos published, so no gallery');
    // Not an empty album container: the photo is in the HTML before any script runs.
    expect(html).toMatch(/data-photo-gallery[\s\S]*react-photo-album--photo/);

    const measure = async (javaScriptEnabled: boolean): Promise<number> => {
      const ctx = await browser.newContext({
        viewport: { width: 412, height: 823 },
        javaScriptEnabled,
      });
      const page = await ctx.newPage();
      await page.goto('/photography/', { waitUntil: 'load' });
      const gallery = page.locator('#events [data-photo-gallery]');
      await gallery.scrollIntoViewIfNeeded();
      if (javaScriptEnabled) {
        // client:visible hydrates now; Astro drops the island's `ssr` attribute when done.
        await expect(page.locator('astro-island:has([data-photo-gallery])')).not.toHaveAttribute(
          'ssr',
          { timeout: 15000 },
        );
        await expect(gallery.locator('img')).toHaveCount(1);
        await page.waitForTimeout(300);
      }
      const box = await gallery.boundingBox();
      await ctx.close();
      return box?.height ?? 0;
    };

    const serverHeight = await measure(false);
    const hydratedHeight = await measure(true);
    expect(serverHeight, 'the server copy has real height').toBeGreaterThan(100);
    expect(
      Math.abs(hydratedHeight - serverHeight),
      `server ${serverHeight}px, hydrated ${hydratedHeight}px`,
    ).toBeLessThanOrEqual(1);
  });
});

test.describe('/contact/ form state is in the server HTML', () => {
  test('the form, and either a live access key or the preview notice, ship without JavaScript', async ({
    request,
  }) => {
    const html = await (await request.get('/contact/')).text();
    expect(html).toContain('data-contact-form');
    // A build with the Web3Forms key renders it into the hidden input; one without
    // (a branch or CI preview) renders the plain notice instead. Either way it is
    // decided on the server, so nothing is inserted after load.
    const hasKey = /name="access_key" value="[^"]+"/.test(html);
    const hasNotice = html.includes('its form does not send');
    expect(hasKey || hasNotice, 'access key or preview notice in the server HTML').toBe(true);
  });
});
