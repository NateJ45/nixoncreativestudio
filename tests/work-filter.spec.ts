import { test, expect, type Page } from '@playwright/test';

// =============================================================================
// /work sector filter (overhaul package 2.3)
// =============================================================================
// Site-owned. WorkFilter.astro keeps the filter in the URL (?sector=church):
//   - a deep link filters on load, and the aria-live line says what shows;
//   - a tab click filters in place and rewrites the URL (replaceState);
//   - an unknown sector falls back to all, says so, and cleans the URL;
//   - without JavaScript every row shows and the tabs are plain links.
// It also checks the row's two links are siblings (never nested) and that the
// H1 count matches the rows, since the number is computed, never typed.
// The expected counts are read from the page's own tabs, so adding a study
// never breaks this spec.
// =============================================================================

const rows = (page: Page) => page.locator('[data-work-row]');
const visibleRows = (page: Page) => page.locator('[data-work-row]:not([data-hidden])');
const live = (page: Page) => page.locator('[data-work-count]');

/** The count a tab shows, e.g. 2 for "Churches 2". */
async function tabCount(page: Page, sector: string): Promise<number> {
  const text = await page.locator(`[data-sector-link="${sector}"] .work-tab-count`).innerText();
  return Number(text);
}

async function ready(page: Page) {
  await expect(page.locator('[data-work-filter]')).toHaveAttribute('data-bound', 'true');
}

test('the H1 counts every study and every row links to its case study', async ({ page }) => {
  await page.goto('/work/');
  const n = await rows(page).count();
  expect(n).toBeGreaterThan(1);
  // The accessible name, because Heft keeps an aria-hidden reserve copy of
  // each heavy word in the DOM (so the text content says every word twice).
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(
    new RegExp(`^${n} sites,\\s+all (live today|shipped)\\.$`),
  );
  // The case-study link and the host link are siblings, never nested.
  expect(await page.locator('[data-work-row] a a').count()).toBe(0);
  await expect(page.locator('[data-work-row] .work-link')).toHaveCount(n);
});

test('a deep link to ?sector=church filters on load', async ({ page }) => {
  await page.goto('/work/?sector=church');
  await ready(page);
  const churches = await tabCount(page, 'church');
  expect(churches).toBeGreaterThan(0);
  await expect(visibleRows(page)).toHaveCount(churches);
  for (const sector of await visibleRows(page).evaluateAll((els) =>
    els.map((e) => (e as HTMLElement).dataset.sector),
  )) {
    expect(sector).toBe('church');
  }
  await expect(live(page)).toHaveText(
    `Showing ${churches} church site${churches === 1 ? '' : 's'}.`,
  );
  await expect(page.locator('[data-sector-link="church"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[data-sector-link="all"]')).not.toHaveAttribute('aria-current');
});

test('a tab click filters in place and updates the URL', async ({ page }) => {
  await page.goto('/work/');
  await ready(page);
  const total = await rows(page).count();
  const nonprofits = await tabCount(page, 'nonprofit');

  await page.locator('[data-sector-link="nonprofit"]').click();
  await expect(page).toHaveURL(/\/work\/\?sector=nonprofit$/);
  await expect(visibleRows(page)).toHaveCount(nonprofits);
  await expect(live(page)).toHaveText(new RegExp(`^Showing ${nonprofits} nonprofit sites?\\.$`));

  await page.locator('[data-sector-link="all"]').click();
  await expect(page).toHaveURL(/\/work\/$/);
  await expect(visibleRows(page)).toHaveCount(total);
  await expect(live(page)).toHaveText(`Showing all ${total} sites.`);
});

test('an unknown sector falls back to all and says so', async ({ page }) => {
  await page.goto('/work/?sector=hospitals');
  await ready(page);
  const total = await rows(page).count();
  await expect(visibleRows(page)).toHaveCount(total);
  await expect(live(page)).toHaveText(`That sector has no sites yet, so here are all ${total}.`);
  await expect(page).toHaveURL(/\/work\/$/);
  await expect(page.locator('[data-sector-link="all"]')).toHaveAttribute('aria-current', 'true');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every row shows and the tabs are plain links', async ({ page }) => {
    await page.goto('/work/?sector=church');
    const total = await rows(page).count();
    await expect(visibleRows(page)).toHaveCount(total);
    await expect(page.locator('[data-sector-link="church"]')).toHaveAttribute(
      'href',
      '/work/?sector=church',
    );
    await expect(page.locator('[data-sector-link="church"]')).toBeVisible();
  });
});

test.describe('the preview frame', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('hovering a row swaps the pinned capture and host', async ({ page }) => {
    await page.goto('/work/');
    await ready(page);
    const preview = page.locator('[data-work-preview]');
    await expect(preview).toBeVisible();
    const second = rows(page).nth(1);
    const host = await second.getAttribute('data-host');
    await second.locator('.work-name').hover();
    await expect(preview.locator('.bf-host')).toHaveText(host ?? '');
    await expect(preview.locator('[data-preview-img]')).toHaveAttribute(
      'src',
      (await second.getAttribute('data-preview-src')) ?? '',
    );
  });
});
