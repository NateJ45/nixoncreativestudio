import { test, expect } from '@playwright/test';

// =============================================================================
// /story/: the CV
// =============================================================================
// The paper is presentation; the record is the headings, lists and text. So:
// with no script every chapter, every client and the kit still read top to
// bottom; the paper objects are hidden from screen readers (their words are in
// the text beside them); About links here; and it prints on one US Letter page
// with none of the paper.

const CHAPTERS = [
  'Mechanical engineering in Edinburgh',
  'Scotland to the U.S., 2017',
  'Years behind a camera',
  'Websites, since 2020',
  'Cincinnati, and citizenship, 2022',
  'Sundays on the media team',
];

test.describe('/story/', () => {
  test('reads top to bottom as headings and lists', async ({ page }) => {
    await page.goto('/story/');
    await expect(page.locator('h1')).toHaveAccessibleName('The whole story, on paper.');
    const chapters = page.locator('.sy-deck > li h3');
    await expect(chapters).toHaveText(CHAPTERS);
    // One playing card per client, each a heading with a link to its study.
    const cards = page.locator('.sy-hand > li');
    expect(await cards.count()).toBeGreaterThan(5);
    for (const card of await cards.all()) {
      await expect(card.locator('h3')).toHaveCount(1);
      await expect(card.locator('a[href^="/work/"]')).toHaveCount(1);
    }
    for (const name of ['Skills', 'Web', 'Camera bag']) {
      await expect(page.getByRole('heading', { level: 3, name, exact: true })).toBeVisible();
    }
    // The paper repeats the words beside it, so it is decoration to a screen reader. The stamp is
    // the one thing on it you can press.
    const objects = page.locator('.sy-obj');
    await expect(objects).toHaveCount(6);
    await expect(page.locator('.sy-obj:not([aria-hidden="true"]) .stamp')).toHaveCount(1);
  });

  test('works with no script', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/story/');
    for (const h of CHAPTERS) await expect(page.getByText(h, { exact: true })).toBeVisible();
    // The print button needs the script, so it is gone without one.
    await expect(page.locator('[data-print]')).toBeHidden();
    await context.close();
  });

  test('About links to it', async ({ page }) => {
    await page.goto('/about/');
    await expect(page.locator('[data-story] a[href="/story/"]')).toHaveText('The whole story');
  });

  test('prints on exactly one US Letter page', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'page.pdf() is Chromium only');
    await page.goto('/story/');
    await page.evaluate(() => document.fonts.ready.then(() => true));
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    const text = pdf.toString('latin1');
    const pages = text.match(/\/Type\s*\/Page(?!s)/g) ?? [];
    expect(pages.length, 'pages in the printed PDF').toBe(1);
  });

  test('in print, only the record shows', async ({ page }) => {
    await page.setViewportSize({ width: 710, height: 979 });
    await page.goto('/story/');
    await page.emulateMedia({ media: 'print' });
    for (const hidden of ['.top', 'nav.dock', '[data-end]', '.sy-bar', '.sy-obj']) {
      await expect(page.locator(hidden).first(), hidden).toBeHidden();
    }
    await expect(page.locator('.sy-reach')).toBeVisible();
    await expect(page.locator('.sy-deck > li h3').first()).toBeVisible();
  });
});
