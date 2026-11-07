import { test, expect } from '@playwright/test';

// =============================================================================
// /one-page/: the summary a staff member forwards to a board
// =============================================================================
// Its promise is one US Letter page, so this prints it for real and counts the
// pages in the PDF. Chromium is the only engine that can print to PDF here.

// The printable area at 96dpi: 8.5in by 11in less the page margins. Narrow enough that a
// phone rule without `screen` would wrongly apply in print, as one did.
const LETTER = { width: 701, height: 960 };

test.describe('/one-page/', () => {
  test('prints on exactly one US Letter page', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'page.pdf() is Chromium only');
    await page.goto('/one-page/');
    await page.evaluate(() => document.fonts.ready.then(() => true));
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    const text = pdf.toString('latin1');
    const pages = text.match(/\/Type\s*\/Page(?!s)/g) ?? [];
    expect(pages.length, 'pages in the printed PDF').toBe(1);
    const box = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(text);
    expect(box, 'the PDF states its page size').not.toBeNull();
    expect(Math.round(Number(box?.[1]))).toBe(612);
    expect(Math.round(Number(box?.[2]))).toBe(792);
  });

  test('in print, only the sheet shows', async ({ page }) => {
    await page.setViewportSize(LETTER);
    await page.goto('/one-page/');
    await page.emulateMedia({ media: 'print' });
    for (const hidden of ['.top', 'nav.dock', '[data-end]', '.op-bar']) {
      await expect(page.locator(hidden).first(), hidden).toBeHidden();
    }
    await expect(page.locator('.op-sheet')).toBeVisible();
    // The table stays a table in print, whatever the screen width.
    await expect(page.locator('.op-table thead')).toBeVisible();
    await expect(page.locator('.op-table tbody tr')).toHaveCount(3);
    await expect(page.locator('.op-table tbody td').first()).toHaveCSS('display', 'table-cell');
    const fit = await page.locator('.op-sheet').evaluate((el) => el.getBoundingClientRect().height);
    expect(fit).toBeLessThanOrEqual(LETTER.height);
  });

  test('has the control, the tiers, the sums, ownership and a way to reach me', async ({
    page,
  }) => {
    await page.goto('/one-page/');
    await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeVisible();
    const rows = page.locator('.op-table tbody tr');
    await expect(rows.first()).toContainText('Launch');
    await expect(rows.first()).toContainText('Light Care');
    await expect(rows.first()).toContainText('$3,500');
    await expect(rows.first()).toContainText('$4,916');
    await expect(rows.first()).toContainText('$6,332');
    await expect(rows.nth(2)).toContainText('$24,932');
    await expect(page.locator('.op-sheet')).toContainText('year one hosting included');
    await expect(page.locator('.op-sheet')).toContainText('If you ever move on');
    await expect(page.locator('.op-sheet a[href^="mailto:"]')).toHaveCount(1);
    await expect(page.locator('.op-sheet a[href^="tel:"]')).toHaveCount(1);
  });

  test('clicking the control asks the browser to print', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __printed: number }).__printed = 0;
      window.print = () => {
        (window as unknown as { __printed: number }).__printed += 1;
      };
    });
    await page.goto('/one-page/');
    await page.getByRole('button', { name: 'Print or save as PDF' }).click();
    expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(
      1,
    );
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('the sheet is all there, and the button that cannot work is not', async ({ page }) => {
      await page.goto('/one-page/');
      await expect(page.locator('.op-table tbody tr')).toHaveCount(3);
      await expect(page.locator('[data-print]')).toBeHidden();
    });
  });
});

test('/services/ links the summary', async ({ page }) => {
  await page.goto('/services/');
  await expect(page.locator('#costs a[href="/one-page/"]')).toBeVisible();
});
