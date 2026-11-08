import { test, expect } from '@playwright/test';

// =============================================================================
// /one-page/: the summary a staff member forwards to a board
// =============================================================================
// Its promise is one US Letter page, so this prints it for real and counts the
// pages in the PDF. Chromium is the only engine that can print to PDF here.

// The printable area at 96dpi: 8.5in by 11in less the @page margins in one-page.css
// (0.4in top and bottom, 0.55in each side). Narrow enough that a phone rule without
// `screen` would wrongly apply in print, as one did.
const LETTER = { width: 710, height: 979 };

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
    await expect(page.locator('.op-table tbody tr')).toHaveCount(6);
    await expect(page.locator('.op-table tbody td').first()).toHaveCSS('display', 'table-cell');
    const fit = await page.locator('.op-sheet').evaluate((el) => el.getBoundingClientRect().height);
    expect(fit).toBeLessThanOrEqual(LETTER.height);
  });

  test('has the control, the tiers, the sums, ownership and a way to reach me', async ({
    page,
  }) => {
    await page.goto('/one-page/');
    await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeVisible();
    const sheet = page.locator('.op-sheet');
    // The three tiers, each with who it fits, its usual price and what I take on.
    const tiers = page.locator('.op-tier');
    await expect(tiers).toHaveCount(3);
    await expect(tiers.first()).toContainText('Usually $3,500 to $6,000');
    await expect(tiers.nth(1)).toContainText('Usually $6,500 to $11,000');
    for (const t of await tiers.all()) {
      await expect(t).toContainText('Who it fits');
      await expect(t).toContainText('What I take responsibility for');
    }
    await expect(tiers.nth(2)).toContainText('Custom tools need Care or Care+');
    // The cost table: Hosting only first, then with care, and Flagship only with care.
    // Hand-worked: build + $200 a year from year two + 12 x the care price each year.
    const rows = page.locator('.op-table tbody tr');
    await expect(rows).toHaveCount(6);
    const cells = (i: number) => rows.nth(i).locator('td').allInnerTexts();
    expect(await cells(0)).toEqual(['$3,500', '$3,900', '$4,300']);
    expect(await cells(1)).toEqual(['$4,208', '$6,024', '$7,840']);
    expect(await cells(2)).toEqual(['$6,500', '$6,900', '$7,300']);
    expect(await cells(3)).toEqual(['$8,048', '$11,544', '$15,040']);
    expect(await cells(4)).toEqual(['$14,048', '$17,544', '$21,040']);
    expect(await cells(5)).toEqual(['$15,608', '$22,224', '$28,840']);
    await expect(rows.first()).toContainText('Hosting only, $200 per year');
    await expect(rows.nth(1)).toContainText('Light Care, $59 per month');
    const flagship = page.locator('.op-table tbody').nth(2);
    await expect(flagship).not.toContainText('Hosting only');
    await expect(page.locator('.op-table caption')).toBeVisible();
    // What Hosting and care cover, with every price.
    const cover = page.locator('.op-cover');
    for (const price of ['$200 per year', '$59 per month', '$129 per month', '$259 per month']) {
      await expect(cover).toContainText(price);
    }
    await expect(cover).toContainText('free in year one');
    await expect(sheet).toContainText('Prices as of November 2026');
    await expect(sheet).toContainText('If you ever move on');
    await expect(page.locator('.op-sheet a[href^="mailto:"]')).toHaveCount(1);
    await expect(page.locator('.op-sheet a[href^="tel:"]')).toHaveCount(1);
  });

  test('the footnote is one plain sentence', async ({ page }) => {
    await page.goto('/one-page/');
    const note = (await page.locator('section:has(#op-cost) > .op-note').innerText()).trim();
    expect(note.match(/[.!?](\s|$)/g) ?? []).toHaveLength(1);
    expect(note).toContain('from year two');
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
      await expect(page.locator('.op-table tbody tr')).toHaveCount(6);
      await expect(page.locator('[data-print]')).toBeHidden();
    });
  });
});

test('/services/ links the summary', async ({ page }) => {
  await page.goto('/services/');
  await expect(page.locator('#costs a[href="/one-page/"]')).toBeVisible();
});
