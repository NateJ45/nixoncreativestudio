import { test, expect } from '@playwright/test';
import { routes } from './routes';

// =============================================================================
// The chrome: top line, dock, client sheet and closing are in the markup
// =============================================================================
// The design's one hard build rule: chrome and content come from the server and
// scripts only enhance. So most of this runs with JavaScript off.

const chromeRoutes = routes.filter((r) => r !== '/coming-soon');
const closingRoutes = chromeRoutes.filter((r) => r !== '/contact');

test.describe('Without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const route of chromeRoutes) {
    test(`${route}: the top line and dock are real links`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('.top .mark')).toHaveAttribute('href', '/');
      const dock = page.locator('nav.dock');
      await expect(dock.locator('a[href="/work/"]')).toHaveText('Work');
      await expect(dock.locator('a[href="/services/"]')).toHaveText('Prices');
      await expect(dock.locator('a[href="/about/"]')).toHaveText('About');
      await expect(dock.locator('a[href="/contact/"]')).toHaveText('Start a project');
      await expect(page.locator('a.skip')).toHaveAttribute('href', '#main');
      await expect(page.locator('dialog[data-sheet]')).toHaveCount(1);
    });
  }

  for (const route of closingRoutes) {
    test(`${route}: the closing is in the markup`, async ({ page }) => {
      await page.goto(route);
      const end = page.locator('[data-end]');
      await expect(end.locator('h2')).toHaveCount(1);
      await expect(end.locator('a[href^="mailto:"]')).toHaveCount(1);
      await expect(end.locator('a[href^="tel:"]')).toHaveCount(1);
      await expect(end.locator('.gc img')).toHaveCount(8);
      await expect(end.locator('a[data-nine]')).toHaveAttribute('href', '/contact/');
      await expect(end.locator('.end-index a[href="/privacy/"]')).toHaveCount(1);
      await expect(end.locator('.end-work a[data-pull]')).toHaveCount(8);
    });
  }

  test('/: the phones, ledger, quote and prices are in the markup', async ({ page }) => {
    await page.goto('/');
    const tiles = page.locator('[data-grid] a.tile');
    await expect(tiles).toHaveCount(8);
    await expect(tiles.first()).toHaveAttribute('href', '/work/stone-steps-50k/');
    await expect(page.locator('[data-ledger] li').first()).toHaveText('Since 2020');
    await expect(page.locator('.band blockquote')).toHaveCount(1);
    await expect(page.locator('[data-prices] li')).toHaveCount(3);
    await expect(page.locator('[data-prices] strong').first()).toHaveText('$3,500');
    await expect(page.locator('h1')).toHaveAttribute(
      'aria-label',
      'I build websites that pull their weight.',
    );
  });
});

test.describe('With JavaScript', () => {
  test('the dock fits five 44px targets at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/work/');
    const fit = await page.evaluate(() => {
      const dock = document.querySelector('nav.dock')!.getBoundingClientRect();
      const targets = [...document.querySelectorAll('nav.dock > a, nav.dock > :is(button, span)')]
        .filter((el) => !el.matches('.slide') && getComputedStyle(el).display !== 'none')
        .map((el) => el.getBoundingClientRect().height);
      return { left: dock.left, right: innerWidth - dock.right, targets };
    });
    expect(fit.left).toBeGreaterThanOrEqual(4);
    expect(fit.right).toBeGreaterThanOrEqual(4);
    expect(fit.targets).toHaveLength(5);
    for (const h of fit.targets) expect(h).toBeGreaterThanOrEqual(44);
    // The action reads Start here, and is still named in full.
    await expect(page.locator('nav.dock a[href="/contact/"]')).toHaveText('Start a project');
  });

  test('a hand is out of the way until asked for, and Escape folds it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/work/');
    const hands = page.locator('nav.dock [data-fan]:not([hidden])');
    await expect(hands).toHaveCount(0);
    const prices = page.locator('nav.dock > a[href="/services/"]');
    await prices.focus();
    await prices.press('ArrowUp');
    await expect(hands).toHaveCount(1);
    await expect(prices).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('nav.dock .fc-price').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(prices).toBeFocused();
    await expect(prices).toHaveAttribute('aria-expanded', 'false');
    await expect(hands).toHaveCount(0);
  });

  test('the link for the page you are on goes back to the top', async ({ page }) => {
    await page.goto('/work/');
    await page.evaluate(() => scrollTo({ top: 800, behavior: 'instant' }));
    await page.locator('nav.dock > a[href="/work/"]').click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  });

  test('the current page is marked in the dock', async ({ page }) => {
    await page.goto('/work/');
    await expect(page.locator('nav.dock a[href="/work/"]')).toHaveAttribute('aria-current', 'page');
    // Inside a section, the link is current but not this exact page.
    await page.goto('/work/stone-steps-50k/');
    await expect(page.locator('nav.dock a[href="/work/"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('nav.dock a[href="/about/"]')).not.toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('a window opens the client sheet, and Back returns focus to it', async ({ page }) => {
    await page.goto('/work/');
    const tile = page.locator('[data-grid] a.tile').first();
    await tile.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    await tile.click();
    const sheet = page.locator('dialog[data-sheet]');
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('[data-st]')).toHaveAttribute('href', '/work/stone-steps-50k/');
    await expect(sheet.locator('[data-vi]')).toHaveAttribute('href', /stonesteps50k\.com/);
    await expect(sheet.locator('h2')).toHaveText('Stone Steps 50K');
    await sheet.locator('[data-back]').click();
    await expect(sheet).toBeHidden();
    await expect(tile).toBeFocused();
  });

  test('draw a card opens a client', async ({ page }) => {
    await page.goto('/');
    const draw = page.locator('[data-draw]');
    await draw.scrollIntoViewIfNeeded();
    await draw.click();
    await expect(page.locator('dialog[data-sheet] h2')).not.toHaveText('');
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[data-sheet]')).toBeHidden();
  });

  test('cross-document view transitions, and no client router', async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('meta[name="astro-view-transitions-enabled"]').count()).toBe(0);
    const hasRule = await page.evaluate(() =>
      [...document.styleSheets].some((s) =>
        [...s.cssRules].some((r) => r.cssText.includes('@view-transition')),
      ),
    );
    expect(hasRule).toBe(true);
  });
});

test('old short names are redirected in public/_redirects', async () => {
  const { readFileSync } = await import('node:fs');
  const text = readFileSync('public/_redirects', 'utf8');
  expect(text).toMatch(/^\/prices\/ \/services\/ 301$/m);
  expect(text).toMatch(/^\/prices \/services\/ 301$/m);
  expect(text).toMatch(/^\/start\/ \/contact\/ 301$/m);
  expect(text).toMatch(/^\/start \/contact\/ 301$/m);
});

// The top line's status opens a card with no script at all: it is a native popover.
test.describe('The top line', () => {
  test('the status deals the contact card, and Escape puts it back', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('[data-reach]');
    await expect(card).toBeHidden();
    await page.locator('.top .status').click();
    await expect(card).toBeVisible();
    await expect(card.locator('a[href^="tel:"]')).toHaveCount(1);
    await expect(card.locator('a[href^="mailto:"]')).toHaveCount(1);
    await expect(card.locator('a[href="/contact/"]')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
  });

  test('scrolling up brings the corners back as pills, and the top puts them away', async ({
    page,
  }) => {
    await page.goto('/about/');
    const top = page.locator('[data-top]');
    await page.evaluate(() => scrollTo({ top: 1200, behavior: 'instant' }));
    await expect(top).not.toHaveClass(/float/);
    await page.evaluate(() => scrollTo({ top: 1100, behavior: 'instant' }));
    await expect(top).toHaveClass(/float/);
    await expect(top.locator('.mark')).toBeInViewport();
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await expect(top).not.toHaveClass(/float/);
  });

  test('the pills leave a stuck bar its spot', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/work/');
    await page.evaluate(() => scrollTo({ top: 1600, behavior: 'instant' }));
    await page.evaluate(() => scrollTo({ top: 1400, behavior: 'instant' }));
    await expect(page.locator('[data-top]')).not.toHaveClass(/float/);
  });
});
