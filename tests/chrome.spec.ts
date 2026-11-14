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
      await expect(end.locator('a[href^="sms:"]')).toHaveCount(1);
      await expect(end.locator('.gc img')).toHaveCount(9);
      await expect(end.locator('a[data-nine]')).toHaveAttribute('href', '/contact/');
      await expect(end.locator('.end-index a[href="/privacy/"]')).toHaveCount(1);
      await expect(end.locator('.end-work a[data-pull]')).toHaveCount(9);
    });
  }

  test('/: the phones, ledger, quote and prices are in the markup', async ({ page }) => {
    await page.goto('/');
    const tiles = page.locator('[data-grid] a.tile');
    await expect(tiles).toHaveCount(9);
    await expect(tiles.first()).toHaveAttribute('href', '/work/stone-steps-50k/');
    await expect(page.locator('[data-ledger] li').first()).toHaveText('Since 2020');
    // Every sector word on the home ledger is a link to its page, so none looks like the main one.
    const sectors = page.locator('.ledger-for a');
    await expect(sectors).toHaveCount(4);
    for (const href of ['/churches/', '/schools/', '/nonprofits/', '/small-business/'])
      await expect(page.locator(`.ledger-for a[href="${href}"]`)).toHaveCount(1);
    await expect(page.locator('[data-draw]')).toHaveText('Show me a random one');
    // One quote band, showing one quote at a time (the rest wait behind Next).
    await expect(page.locator('.band')).toHaveCount(1);
    await expect(page.locator('.band [data-q]:not([inert]) blockquote')).toHaveCount(1);
    await expect(page.locator('[data-prices] li')).toHaveCount(3);
    await expect(page.locator('[data-prices] strong').first()).toHaveText('$3,500');
    await expect(page.locator('h1')).toHaveAttribute(
      'aria-label',
      'I build websites that pull their weight.',
    );
  });
});

test.describe('With JavaScript', () => {
  test('the dock fits four 44px targets at 320px', async ({ page }) => {
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
    // Work, Prices, About and Start. The light and dark switch needs its words, so on a phone
    // it lives in the closing band (theme.spec.ts).
    expect(fit.targets).toHaveLength(4);
    for (const h of fit.targets) expect(h).toBeGreaterThanOrEqual(44);
    // The action reads Start here, and is still named in full.
    await expect(page.locator('nav.dock a[href="/contact/"]')).toHaveText('Start a project');
  });

  test('the two dock buttons that were a bare N now say what they are', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/work/');
    await expect(page.locator('nav.dock a.home')).toHaveText('Home');
    await expect(page.locator('nav.dock').getByRole('button', { name: 'Dark mode' })).toBeVisible();
  });

  test('a phone gets the whole name and a plain "Text or email"', async ({ page }) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 720 });
      await page.goto('/work/stone-steps-50k/');
      const fit = await page.evaluate(() => {
        const mark = document.querySelector('.mark')!;
        const status = document.querySelector('.status')!;
        return {
          clipped: [...mark.querySelectorAll('span')].some(
            (s) => s.scrollWidth > s.clientWidth + 1,
          ),
          apart: mark.getBoundingClientRect().right <= status.getBoundingClientRect().left,
        };
      });
      expect(fit.clipped, `${width}px: the name is clipped`).toBe(false);
      expect(fit.apart, `${width}px: the name runs into the status`).toBe(true);
      await expect(page.locator('.status')).toContainText('Text or email');
    }
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
    await expect(card.locator('a[href^="sms:"]')).toHaveCount(1);
    await expect(card.locator('a[href^="mailto:"]')).toHaveCount(1);
    await expect(card.locator('a[href="/contact/"]')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
  });

  test('opened from the floating pill far down a page, the card is on the screen', async ({
    page,
  }) => {
    await page.goto('/services/');
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(100);
    }
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, -250);
      await page.waitForTimeout(120);
    }
    await expect(page.locator('[data-top]')).toHaveClass(/float/);
    await page.locator('.top .status').click({ force: true });
    const card = page.locator('[data-reach]');
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    const height = page.viewportSize()!.height;
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(height);
  });

  test('the closing line stays inside its column on a wide screen', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1000 });
    await page.goto('/work/');
    const over = await page.locator('.end-say h2').evaluate((h) => {
      const range = document.createRange();
      range.selectNodeContents(h);
      const right = Math.max(...[...range.getClientRects()].map((r) => r.right));
      return right - h.parentElement!.getBoundingClientRect().right;
    });
    expect(over).toBeLessThanOrEqual(1);
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
