import { test, expect, type Page } from '@playwright/test';

// =============================================================================
// "Change the service time once" (src/components/home/FactDemo.astro)
// =============================================================================
// The homepage band where a visitor changes one fact (a made-up church's Sunday
// service time) and watches six places on its site keep up. What must hold:
//   - the made-up church is labelled as made up;
//   - JS on: a typed time reaches all six places, and the coffee time (worked out
//     15 minutes earlier) follows; a value that is not a time is refused with an
//     alert and nothing changes; "Edit page by page" changes the visit page only
//     and leaves the other places on the old time, marked stale;
//   - the band does not change height when the values change (no layout shift);
//   - JS off: the before state, the wiring and one sentence, and no controls.
// It targets the home page by URL like every spec, and never touches the contact
// form (this band's form is local and never submits anywhere).

const BAND = '#one-place';

async function openBand(page: Page) {
  await page.goto('/', { waitUntil: 'load' });
  const band = page.locator(BAND);
  await band.scrollIntoViewIfNeeded();
  // The script binds on astro:page-load.
  await expect(band.locator('[data-fact-demo]')).toHaveAttribute('data-fd-bound', 'true');
  return band;
}

const serviceValues = (page: Page) =>
  page.locator(`${BAND} [data-fd-v="service"]`).allTextContents();

test.describe('Change one fact demo', () => {
  test('the church is labelled as made up, and starts at 10:30 AM everywhere', async ({ page }) => {
    const band = await openBand(page);
    await expect(band).toContainText('Larkspur Street Church is made up for this demo.');
    await expect(band.locator('[data-fd-place]')).toHaveCount(6);
    for (const v of await serviceValues(page)) expect(v.trim()).toBe('10:30 AM');
  });

  test('a typed time reaches all six places, and the coffee time follows', async ({ page }) => {
    const band = await openBand(page);
    const before = await band.evaluate((el) => el.getBoundingClientRect().height);
    const input = band.locator('#fd-time');
    await input.fill('9:15');
    await input.press('Enter');
    await expect(input).toHaveValue('9:15 AM');
    const values = await serviceValues(page);
    expect(values.length).toBeGreaterThanOrEqual(6);
    for (const v of values) expect(v.trim()).toBe('9:15 AM');
    for (const v of await band.locator('[data-fd-v="coffee"]').allTextContents())
      expect(v.trim()).toBe('9:00 AM');
    await expect(band.locator('[data-fd-status]')).toContainText('All six places say 9:15 AM');
    // A quick pick works the same way.
    await band.locator('[data-fd-pick="6:00 PM"]').click();
    for (const v of await serviceValues(page)) expect(v.trim()).toBe('6:00 PM');
    const after = await band.evaluate((el) => el.getBoundingClientRect().height);
    expect(Math.abs(after - before)).toBeLessThan(1);
  });

  test('a half-typed time waits for the pause instead of flashing', async ({ page }) => {
    const band = await openBand(page);
    const input = band.locator('#fd-time');
    await input.fill('');
    await input.pressSequentially('10:45', { delay: 60 });
    // Never published "1" (1:00 PM) on the way.
    for (const v of await serviceValues(page)) expect(v.trim()).not.toBe('1:00 PM');
    await expect(band.locator('[data-fd-place="footer"] [data-fd-v]')).toHaveText('10:45 AM', {
      timeout: 3000,
    });
  });

  test('something that is not a time is refused, out loud, and nothing changes', async ({
    page,
  }) => {
    const band = await openBand(page);
    const input = band.locator('#fd-time');
    await input.fill('half ten');
    await input.press('Enter');
    const alert = band.locator('[role="alert"]');
    await expect(alert).toContainText('isn’t a time, so nothing changed');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    for (const v of await serviceValues(page)) expect(v.trim()).toBe('10:30 AM');
    // A good time clears the error.
    await input.fill('11');
    await input.press('Enter');
    await expect(alert).toHaveText('');
    await expect(input).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('page by page changes the visit page only, and the rest drift', async ({ page }) => {
    const band = await openBand(page);
    const before = await band.evaluate((el) => el.getBoundingClientRect().height);
    const toggle = band.getByRole('switch', { name: 'Edit the old way, page by page' });
    await toggle.check();
    // Switching makes one edit at once (10:30 to 11:00 AM) on the visit page.
    await expect(band.locator('[data-fd-place="visit"] [data-fd-v="service"]')).toHaveText(
      '11:00 AM',
    );
    for (const id of ['header', 'banner', 'contact', 'search', 'footer']) {
      const v = band.locator(`[data-fd-place="${id}"] [data-fd-v="service"]`);
      await expect(v).toHaveText('10:30 AM');
      await expect(v).toHaveClass(/is-stale/);
    }
    // The visit page's own coffee time was not worked out again either.
    await expect(band.locator('[data-fd-place="visit"] [data-fd-v="coffee"]')).toHaveClass(
      /is-stale/,
    );
    await expect(band.locator('[data-fd-status]')).toContainText(
      'Five other places still say 10:30 AM',
    );
    // Back to one source: everything agrees again.
    await toggle.uncheck();
    for (const v of await serviceValues(page)) expect(v.trim()).toBe('11:00 AM');
    await expect(band.locator('.is-stale')).toHaveCount(0);
    const after = await band.evaluate((el) => el.getBoundingClientRect().height);
    expect(Math.abs(after - before)).toBeLessThan(1);
  });
});

test.describe('Change one fact demo without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the before state, the wiring and one sentence, and no controls', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const band = page.locator(BAND);
    await expect(band.locator('.fd-static')).toBeVisible();
    await expect(band.locator('.fd-static')).toHaveText('10:30 AM');
    await expect(band.locator('.fd-nojs')).toBeVisible();
    await expect(band.locator('.fd-nojs')).toContainText('changes all six places');
    await expect(band.locator('[data-fd-place]')).toHaveCount(6);
    await expect(band.locator('#fd-time')).toBeHidden();
    await expect(band.locator('[data-fd-pick]').first()).toBeHidden();
    await expect(band.getByRole('switch')).toBeHidden();
    for (const v of await serviceValues(page)) expect(v.trim()).toBe('10:30 AM');
  });
});
