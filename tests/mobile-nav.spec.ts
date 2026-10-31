import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// =============================================================================
// Mobile nav: a link that becomes a native <dialog> (overhaul 1.4, ruling 5)
// =============================================================================
// MobileNav.astro renders the menu button as <a href="#site-nav">, a real link
// to the footer's "Site pages" nav, so the menu works with no JavaScript. Its
// script (src/scripts/mobile-nav.ts) upgrades the link to open a modal
// <dialog>: Escape closes it, Tab stays inside, focus goes back to the button
// on close, and astro:before-swap closes it so a View Transitions navigation
// never carries an open modal onto the next page.
//
// Chromium only (the WebKit project's testMatch leaves it out), at a phone
// width where the menu button shows (below md, 768px).
// =============================================================================

test.use({ viewport: { width: 390, height: 844 } });

const trigger = (page: Page) => page.locator('a[data-mnav-open]');
const dialog = (page: Page) => page.locator('dialog[data-mnav]');

/** True when the focused element sits inside the mobile nav dialog. */
const focusInDialog = (page: Page) =>
  page.evaluate(() => !!document.activeElement?.closest('dialog[data-mnav]'));

async function openMenu(page: Page) {
  // The script binds on astro:page-load; wait until it has.
  await expect(trigger(page)).toHaveAttribute('data-bound', 'true');
  await trigger(page).click();
  await expect(dialog(page)).toHaveAttribute('open', '');
}

test('opens on click, with focus inside and the button marked expanded', async ({ page }) => {
  await page.goto('/');
  await openMenu(page);
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-mnav-close]')).toBeFocused();
  await expect(dialog(page).getByRole('navigation', { name: 'Mobile primary' })).toBeVisible();
  // The page behind is locked while the panel is open.
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
    'hidden',
  );
});

test('Escape closes it and focus returns to the menu button', async ({ page }) => {
  await page.goto('/about/');
  await openMenu(page);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).not.toHaveAttribute('open', '');
  await expect(trigger(page)).toBeFocused();
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
});

test('the close button closes it and focus returns to the menu button', async ({ page }) => {
  await page.goto('/about/');
  await openMenu(page);
  await page.locator('[data-mnav-close]').click();
  await expect(dialog(page)).not.toHaveAttribute('open', '');
  await expect(trigger(page)).toBeFocused();
});

test('Tab and Shift+Tab stay inside the open dialog', async ({ page }) => {
  await page.goto('/');
  await openMenu(page);
  const count = await dialog(page).locator('a[href], button').count();
  // Go round the whole panel more than once in each direction.
  for (let i = 0; i < count + 3; i++) {
    await page.keyboard.press('Tab');
    expect(await focusInDialog(page), `focus left the dialog after Tab ${i + 1}`).toBe(true);
  }
  for (let i = 0; i < count + 3; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await focusInDialog(page), `focus left the dialog after Shift+Tab ${i + 1}`).toBe(true);
  }
});

test('a link in the panel navigates and the next page has no open modal', async ({ page }) => {
  await page.goto('/');
  await openMenu(page);
  await dialog(page).getByRole('link', { name: /^Work/ }).click();
  await expect(page).toHaveURL(/\/work\/$/);
  await expect(dialog(page)).not.toHaveAttribute('open', '');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe(
    'hidden',
  );
  // The fresh header's button is wired again after the swap.
  await openMenu(page);
});

test('any View Transitions navigation closes it on astro:before-swap', async ({ page }) => {
  await page.goto('/about/');
  await openMenu(page);
  // Record the old dialog's close event, then start a navigation from outside
  // the panel: a scripted click on a footer link, which the ClientRouter turns
  // into a swap (the modal makes the footer inert to the pointer, not to code).
  await page.evaluate(() => {
    document.querySelector('dialog[data-mnav]')?.addEventListener('close', () => {
      (window as unknown as { __mnavClosed: boolean }).__mnavClosed = true;
    });
    document.querySelector<HTMLAnchorElement>('#site-nav a[href="/work/"]')?.click();
  });
  await expect(page).toHaveURL(/\/work\/$/);
  // The URL can change before the swap runs, so poll for the close.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __mnavClosed?: boolean }).__mnavClosed))
    .toBe(true);
  await expect(page.locator('dialog[data-mnav][open]')).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe(
    'hidden',
  );
  // The swapped-in button opens a fresh panel.
  await openMenu(page);
});

for (const theme of ['light', 'dark'] as const) {
  test(`the open panel passes axe in ${theme} mode`, async ({ page }) => {
    await page.addInitScript((t) => window.localStorage.setItem('ncs-theme', t), theme);
    await page.goto('/work/');
    await openMenu(page);
    // Let the entrance cascade finish so axe sees the resting colours.
    await page.waitForTimeout(1200);
    const results = await new AxeBuilder({ page }).include('dialog[data-mnav]').analyze();
    expect(
      results.violations,
      results.violations
        .map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)
        .join('\n'),
    ).toEqual([]);
  });
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the menu button is a link that jumps to the footer nav', async ({ page }) => {
    await page.goto('/services/');
    await expect(trigger(page)).toBeVisible();
    await trigger(page).click();
    await expect(page).toHaveURL(/#site-nav$/);
    const footerNav = page.locator('#site-nav');
    await expect(footerNav).toBeInViewport();
    await expect(footerNav.getByRole('link', { name: 'Work' })).toBeVisible();
    await expect(dialog(page)).not.toHaveAttribute('open', '');
  });
});
