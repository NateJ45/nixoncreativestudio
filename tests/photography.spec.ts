import { test, expect } from '@playwright/test';

// =============================================================================
// /photography: the light table
// =============================================================================
// The table is a script's view of a plain grid of links. These check the
// keyboard path through it (WCAG 2.1.1 and 2.5.7: nothing needs a drag), the
// full view, the filter and the Grid switch, and that the grid alone is a
// working gallery with JavaScript off. Then the depth and light added on top
// (2026-11-13): zoom has buttons and keys, the table takes a colour, the frame
// cannot be scrolled out from under it, and reduced motion still gets a table.
// =============================================================================

test.describe('with JavaScript', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/photography/');
  });

  test('the table is laid with prints and the grid steps aside', async ({ page }) => {
    await expect(page.locator('[data-stage]')).toBeVisible();
    await expect(page.locator('[data-grid]')).toBeHidden();
    expect(await page.locator('.pt-p').count()).toBeGreaterThan(8);
  });

  test('the arrow keys move the table and Enter opens the print in the middle', async ({
    page,
  }) => {
    const world = page.locator('[data-world]');
    const coords = page.locator('[data-coords]');
    await world.focus();
    const before = await coords.textContent();
    await page.keyboard.press('ArrowRight');
    await expect(coords).not.toHaveText(before ?? '');
    await expect(page.locator('[data-now]')).toContainText('In the middle:');
    await page.keyboard.press('Enter');
    const dlg = page.locator('dialog[data-open]');
    await expect(dlg).toBeVisible();
    await expect(dlg.locator('[data-title]')).not.toBeEmpty();
    await expect(dlg.locator('[data-media] img, [data-media] video')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
    await expect(world).toBeFocused();
  });

  test('the move buttons move the table without a drag', async ({ page }) => {
    const coords = page.locator('[data-coords]');
    const before = await coords.textContent();
    await page.getByRole('button', { name: 'Move down' }).click();
    await expect(coords).not.toHaveText(before ?? '');
  });

  test('Next walks the prints and counts them', async ({ page }) => {
    await page.locator('[data-world]').focus();
    await page.keyboard.press('Enter');
    const dlg = page.locator('dialog[data-open]');
    const title = await dlg.locator('[data-title]').textContent();
    await dlg.getByRole('button', { name: 'Next' }).click();
    await expect(dlg.locator('[data-title]')).not.toHaveText(title ?? '');
    await expect(dlg.locator('[data-count]')).toHaveText(/^\d+ of \d+$/);
  });

  test('a filter lays only that kind, and Grid shows the plain grid', async ({ page }) => {
    const btn = page.locator('button[data-f="people"]');
    const n = Number(await btn.locator('.n').textContent());
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-status]')).toHaveText(`Showing ${n} people and places.`);
    await page.locator('button[data-v="grid"]').click();
    await expect(page.locator('[data-grid]')).toBeVisible();
    await expect(page.locator('[data-grid] > li:visible')).toHaveCount(n);
    // A link in the grid opens the same full view.
    await page.locator('[data-grid] > li:visible a').first().click();
    await expect(page.locator('dialog[data-open]')).toBeVisible();
  });

  test('the zoom buttons zoom the table without a pinch, and stop at the ends', async ({
    page,
  }) => {
    const zoomed = page.locator('[data-zoomed]');
    const out = page.getByRole('button', { name: 'Zoom out' });
    const zin = page.getByRole('button', { name: 'Zoom in' });
    await expect(zoomed).toHaveText('100%');
    const before = await page.locator('.pt-p').count();
    await out.click();
    await out.click();
    await expect(zoomed).toHaveText('60%');
    await expect(out).toBeDisabled();
    // Zoomed out, more of the table is laid.
    expect(await page.locator('.pt-p').count()).toBeGreaterThan(before);
    await zin.click();
    await expect(out).toBeEnabled();
    await expect(zoomed).not.toHaveText('60%');
    // The keyboard path still works at any zoom.
    await page.locator('[data-world]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('dialog[data-open]')).toBeVisible();
  });

  test('the + and - keys zoom while the table has focus', async ({ page }) => {
    await page.locator('[data-world]').focus();
    await page.keyboard.press('-');
    await expect(page.locator('[data-zoomed]')).not.toHaveText('100%');
    await page.keyboard.press('+');
    await expect(page.locator('[data-zoomed]')).toHaveText('100%');
  });

  test('the table takes a colour from its prints, and the full view takes its own', async ({
    page,
  }) => {
    const stage = page.locator('[data-stage]');
    await expect
      .poll(() => stage.evaluate((el) => (el as HTMLElement).style.getPropertyValue('--wash')))
      .toMatch(/^rgb\(/);
    await page.locator('[data-world]').focus();
    await page.keyboard.press('Enter');
    const tint = await page
      .locator('dialog[data-open]')
      .evaluate((el) => (el as HTMLElement).style.getPropertyValue('--tint'));
    expect(tint).toMatch(/^#[0-9a-f]{6}$/);
  });

  test('the stage cannot be scrolled out from under its frame', async ({ page }) => {
    const stage = page.locator('[data-stage]');
    await stage.evaluate((el) => el.scrollTo(120, 90));
    await expect.poll(() => stage.evaluate((el) => el.scrollLeft + el.scrollTop)).toBe(0);
  });
});

test.describe('around the table', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('the page opens on everything, and there is no Selects filter', async ({ page }) => {
    await page.goto('/photography/');
    await expect(page.locator('button[data-f="all"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-status]')).toContainText('Showing all');
    await expect(page.locator('button[data-f="selects"]')).toHaveCount(0);
  });

  test('Films shows only the films', async ({ page }) => {
    await page.goto('/photography/');
    const films = page.locator('button[data-f="films"]');
    const n = Number(await films.locator('.n').textContent());
    await films.click();
    await page.locator('button[data-v="grid"]').click();
    await expect(page.locator('[data-grid] > li:visible')).toHaveCount(n);
    await expect(page.locator('[data-grid] > li:visible .pt-film')).toHaveCount(n);
  });

  test('a print has its own address: it opens there, and closing clears it', async ({ page }) => {
    await page.goto('/photography/?print=tm-podium');
    const dlg = page.locator('dialog[data-open]');
    await expect(dlg).toBeVisible();
    await expect(dlg.locator('[data-title]')).not.toBeEmpty();
    expect(new URL(page.url()).searchParams.get('print')).toBe('tm-podium');
    // It was shot for a client with a case study here, and it is one frame of a set.
    await expect(dlg.locator('[data-study]')).toHaveAttribute('href', '/work/theology-matters/');
    await expect(dlg.locator('[data-set-name]')).toContainText('Theology Matters');
    expect(await dlg.locator('[data-set-strip] button').count()).toBeGreaterThan(2);
    // The strip steps to another frame of the set, and the address follows.
    await dlg.locator('[data-set-strip] button:not([aria-current])').first().click();
    await expect.poll(() => new URL(page.url()).searchParams.get('print')).not.toBe('tm-podium');
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
    // The dialog's close event lands a moment after it hides.
    await expect.poll(() => new URL(page.url()).searchParams.get('print')).toBeNull();
  });

  test('a booking card comes up after a few steps, and Next passes it', async ({ page }) => {
    await page.goto('/photography/');
    await page.locator('[data-world]').focus();
    await page.keyboard.press('Enter');
    const dlg = page.locator('dialog[data-open]');
    const every = Number(await page.locator('template[data-booking]').getAttribute('data-every'));
    const next = dlg.getByRole('button', { name: 'Next' });
    for (let i = 0; i < every; i++) await next.click();
    await expect(dlg.locator('.pt-book a')).toHaveAttribute('href', /contact/);
    await next.click();
    await expect(dlg.locator('.pt-book')).toHaveCount(0);
    await expect(dlg.locator('[data-media] img, [data-media] video')).toHaveCount(1);
  });

  test('a "What I shoot" row sets its filter and brings the table up', async ({ page }) => {
    await page.goto('/photography/');
    await page.locator('a[data-go="people"]').click();
    await expect(page.locator('button[data-f="people"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-stage]')).toBeInViewport();
  });

  test('the tour starts, names its stop, and stops at a touch', async ({ page }) => {
    await page.goto('/photography/');
    const tour = page.locator('[data-tour]');
    await tour.click();
    await expect(tour).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-now]')).toContainText('On the tour:');
    await page.locator('[data-world]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(tour).toHaveAttribute('aria-pressed', 'false');
  });

  test('Colour lays the table again in colour order, and back', async ({ page }) => {
    await page.goto('/photography/');
    const colour = page.locator('[data-colour]');
    await colour.click();
    await expect(colour).toHaveAttribute('aria-pressed', 'true');
    expect(await page.locator('.pt-p').count()).toBeGreaterThan(8);
    await colour.click();
    await expect(colour).toHaveAttribute('aria-pressed', 'false');
  });

  test('the hero frame and a film in the strip open the full view', async ({ page }) => {
    await page.goto('/photography/');
    const dlg = page.locator('dialog[data-open]');
    await page.locator('a.pt-hero').click();
    await expect(dlg).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('a.pt-hero')).toBeFocused();
    await page.locator('a.pt-reel').first().click();
    await expect(dlg.locator('video')).toHaveCount(1);
  });
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the table is still laid and still opens, with the lamp and the tilt off', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/photography/');
    expect(await page.locator('.pt-p').count()).toBeGreaterThan(8);
    await expect(page.locator('[data-lamp]')).toBeHidden();
    await page.mouse.move(640, 500);
    expect(
      await page.locator('[data-world]').evaluate((el) => (el as HTMLElement).style.transform),
    ).toBe('');
    await page.locator('[data-world]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('dialog[data-open]')).toBeVisible();
    await expect(page.locator('dialog[data-open] .pt-dev')).toHaveCount(0);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the grid is the gallery: every print is a named link to its full-size image', async ({
    page,
  }) => {
    await page.goto('/photography/');
    await expect(page.locator('[data-stage]')).toBeHidden();
    const links = page.locator('[data-grid] a.print');
    expect(await links.count()).toBeGreaterThan(20);
    await expect(links.first()).toHaveAttribute('href', /\.webp$/);
    await expect(links.first()).toHaveAttribute('aria-label', /\w+\. \w+/);
  });
});
