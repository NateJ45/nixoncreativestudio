import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settle } from './helpers';

// =============================================================================
// The live colophon (overhaul 3.4, Part B signature E)
// =============================================================================
// - The ledger measures the page in the browser: every "This page" cell fills
//   with a number, or with "not reported by this browser".
// - "These numbers stay in your browser" (Part A ruling 7) is checked two
//   ways: once the ledger has measured, using the slider, the chips and the
//   inspector makes no request at all; and no call to fetch, sendBeacon or
//   XMLHttpRequest during the visit carries a ledger value. (Google Analytics
//   only runs on the live hostname, so it never loads here; on the live site
//   its page view is allowed, which is why the wording never claims nothing
//   is sent anywhere.)
// - The grid inspector is a button only (Part A decision 18): aria-pressed,
//   a pointer-events: none overlay on <body>, no Alt+G or G shortcut, and the
//   overlay does not follow a navigation.
// - The weight slider is a native range input the arrow keys move.
// - The token chips follow the theme.
// - Without JavaScript the budgets still show and the controls are hidden.
// Chromium only.
// =============================================================================

const COLOPHON = '/colophon/';

async function measured(page: Page) {
  await page.goto(COLOPHON);
  await expect(page.locator('[data-live-colophon]')).toHaveAttribute('data-state', 'measured');
}

test('every ledger cell fills in', async ({ page }) => {
  await measured(page);
  const cells = page.locator('[data-live-colophon] [data-metric]');
  await expect(cells).toHaveCount(8);
  // The observers report a moment after the sizes, so wait for the last one.
  await expect(page.locator('[data-live-colophon] .live-pending')).toHaveCount(0);
  for (const text of await cells.allTextContents()) {
    expect(text).toMatch(/^(\d+(\.\d+)? (KB|ms|s)|\d+|\d\.\d{3}|not reported by this browser)$/);
  }
  // Chromium reports LCP and CLS, so they are real numbers here.
  await expect(page.locator('[data-metric="lcp"]')).toHaveText(/\d/);
  await expect(page.locator('[data-metric="cls"]')).toHaveText(/^\d\.\d{3}$/);
  await expect(page.locator('[data-live-colophon]')).toContainText(
    'These numbers stay in your browser',
  );
});

test('the numbers stay in the browser', async ({ page }) => {
  // Record every outbound call a script could make, with its payload.
  await page.addInitScript(() => {
    const calls: string[] = [];
    (window as unknown as { __calls: string[] }).__calls = calls;
    const origFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(`fetch ${String(input)} ${init?.body ?? ''}`);
      return origFetch(input, init);
    };
    const origBeacon = navigator.sendBeacon?.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      calls.push(`beacon ${String(url)} ${data ?? ''}`);
      return origBeacon ? origBeacon(url, data) : true;
    };
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
    ) {
      calls.push(`xhr ${method} ${String(url)}`);
      // eslint-disable-next-line prefer-rest-params
      return origOpen.apply(this, arguments as unknown as Parameters<typeof origOpen>);
    };
  });

  await measured(page);
  await page.waitForLoadState('networkidle');

  // From here on, nothing on the page may ask the network for anything.
  const later: string[] = [];
  page.on('request', (r) => later.push(r.url()));

  await page.locator('#weight-range').focus();
  await page.keyboard.press('ArrowLeft');
  await page.locator('[data-grid-toggle]').click();
  await page.locator('[data-grid-toggle]').click();
  await page.evaluate(() => document.documentElement.classList.toggle('dark'));
  await page.waitForTimeout(500);
  expect(later).toEqual([]);

  // Bare counts (a request count like 23) are too short to tell apart from
  // any other number in a URL, so check the sized and timed values.
  const values = (await page.locator('[data-metric]').allTextContents()).filter((v) =>
    /\d.* (KB|ms|s)$/.test(v),
  );
  expect(values.length).toBeGreaterThan(3);
  const calls = await page.evaluate(() => (window as unknown as { __calls: string[] }).__calls);
  for (const call of calls) {
    for (const v of values) expect(call).not.toContain(v);
  }
});

test('the grid inspector is a button, not a shortcut', async ({ page }) => {
  await measured(page);
  const button = page.locator('[data-grid-toggle]');
  const overlay = page.locator('#grid-inspector-overlay');

  // No keyboard shortcut turns it on.
  await page.locator('body').click({ position: { x: 5, y: 300 } });
  await page.keyboard.press('Alt+g');
  await page.keyboard.press('g');
  await page.keyboard.press('G');
  await expect(overlay).toHaveCount(0);
  await expect(button).toHaveAttribute('aria-pressed', 'false');

  // The button does, from the keyboard too.
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveAttribute('aria-hidden', 'true');
  await expect(overlay).toHaveCSS('pointer-events', 'none');
  await expect(overlay.locator('.grid-overlay-col')).toHaveCount(12);

  // Links under it still work, and it does not follow the navigation.
  await page.locator('.doc-prose a[href="/privacy/"]').first().click();
  await expect(page).toHaveURL(/\/privacy\/$/);
  await expect(page.locator('#grid-inspector-overlay')).toHaveCount(0);

  // Back on the colophon it starts off again.
  await page.goto(COLOPHON);
  await expect(page.locator('[data-grid-toggle]')).toHaveAttribute('aria-pressed', 'false');
});

test('axe passes with the grid shown, in both themes', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await page.addInitScript((t) => localStorage.setItem('ncs-theme', t), theme);
    await measured(page);
    await page.locator('[data-grid-toggle]').click();
    await settle(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `${theme}: ${JSON.stringify(results.violations)}`).toEqual([]);
  }
});

test('the weight slider moves with the arrow keys', async ({ page }) => {
  await measured(page);
  const range = page.locator('#weight-range');
  const sample = page.locator('[data-weight-sample]');
  await expect(sample).toHaveCSS('font-weight', '800');
  await range.focus();
  await page.keyboard.press('Home');
  await expect(sample).toHaveCSS('font-weight', '200');
  await expect(page.locator('[data-weight-output]')).toHaveText('200');
  await page.keyboard.press('ArrowRight');
  await expect(sample).toHaveCSS('font-weight', '210');
});

test('the token chips follow the theme', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ncs-theme', 'light'));
  await measured(page);
  const paper = page.locator('[data-token="--paper"]');
  await expect(paper).toHaveText('#F4F7FA');
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expect(paper).toHaveText('#0A1628');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the budgets show and the controls are hidden', async ({ page }) => {
    await page.goto(COLOPHON);
    await expect(page.locator('.live-note--nojs')).toBeVisible();
    await expect(page.locator('.live-budget').first()).toHaveText(/./);
    await expect(page.locator('[data-grid-toggle]')).toBeHidden();
    await expect(page.locator('#weight-range')).toBeHidden();
  });
});
