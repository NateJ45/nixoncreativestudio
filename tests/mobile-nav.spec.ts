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

test('a tap on the scrim closes the drawer and focus returns to the menu button', async ({
  page,
}) => {
  await page.goto('/about/');
  await openMenu(page);
  // The drawer leaves a strip of scrim on its left at phone width (polled,
  // because the box is still sliding in straight after the open).
  await expect
    .poll(() => dialog(page).evaluate((d) => Math.round(d.getBoundingClientRect().left)))
    .toBe(390 - 334);
  await page.mouse.click(20, 400);
  await expect(dialog(page)).not.toHaveAttribute('open', '');
  await expect(trigger(page)).toBeFocused();
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
});

test('a tap inside the drawer, off any control, leaves it open', async ({ page }) => {
  await page.goto('/about/');
  await openMenu(page);
  await page.waitForTimeout(600);
  const box = (await dialog(page).boundingBox())!;
  // The empty space between the links and the bottom block.
  await page.mouse.click(box.x + box.width - 12, box.y + box.height / 2);
  await expect(dialog(page)).toHaveAttribute('open', '');
});

// -----------------------------------------------------------------------------
// The reveal (overhaul 4.10): the drawer slides in and out, the rows stagger,
// and nothing on the page behind is ever transformed. Under reduced motion and
// under Pause motion (html[data-motion-paused]) it is instant.
// -----------------------------------------------------------------------------

/** Transform and translate on the page around the dialog, which must stay put. */
const pageTransforms = (page: Page) =>
  page.evaluate(() =>
    ['html', 'body', 'header', 'main', 'footer'].map((sel) => {
      const el = document.querySelector(sel);
      if (!el) return `${sel}: missing`;
      const cs = getComputedStyle(el);
      return `${sel}: ${cs.transform} ${cs.translate}`;
    }),
  );

/** Running motion on the dialog or anything inside it: every CSS animation,
 *  and any transition that moves, fades or clips. A button's colour easing on
 *  focus is not motion, so it does not count. */
const drawerAnimations = (page: Page) =>
  page.evaluate(() => {
    const d = document.querySelector('dialog[data-mnav]');
    const moving = ['translate', 'transform', 'opacity', 'clip-path', 'display', 'overlay'];
    return document.getAnimations().filter((a) => {
      const t = (a.effect as KeyframeEffect | null)?.target;
      if (a.playState !== 'running' || !t || !(t === d || !!d?.contains(t))) return false;
      const prop = (a as CSSTransition).transitionProperty;
      return prop === undefined || moving.includes(prop);
    }).length;
  });

const RESTING = ['html', 'body', 'header', 'main', 'footer'].map((s) => `${s}: none none`);

test('the drawer slides in and back out, and the page behind never moves', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Record every transition the drawer starts, so a short one cannot finish
  // between two checks and slip past.
  await page.addInitScript(() => {
    const w = window as unknown as { __mnavRuns: string[] };
    w.__mnavRuns = [];
    document.addEventListener(
      'transitionrun',
      (e) => {
        const t = e.target as Element;
        if (t.matches?.('dialog[data-mnav]')) {
          w.__mnavRuns.push(`${t.hasAttribute('open') ? 'open' : 'closed'} ${e.propertyName}`);
        }
      },
      true,
    );
  });
  const runs = () =>
    page.evaluate(() => (window as unknown as { __mnavRuns: string[] }).__mnavRuns);
  await page.goto('/about/');
  await openMenu(page);
  await expect.poll(runs, 'the drawer slides in').toContain('open translate');
  // Mid-entrance, the page behind has not moved.
  expect(await pageTransforms(page)).toEqual(RESTING);
  await page.waitForTimeout(1200);
  expect(
    await dialog(page).evaluate((d) => getComputedStyle(d).translate),
    'the drawer rests in place',
  ).toMatch(/^(none|0px( 0px)?)$/);
  // Closing animates too: the drawer's translate transition runs after close().
  await page.keyboard.press('Escape');
  await expect(dialog(page)).not.toHaveAttribute('open', '');
  await expect.poll(runs, 'a slide-out transition runs on close').toContain('closed translate');
  expect(await pageTransforms(page)).toEqual(RESTING);
  await expect(trigger(page)).toBeFocused();
});

for (const mode of ['reduced motion', 'Pause motion'] as const) {
  test(`under ${mode} the drawer opens and closes at once, with no transform anywhere`, async ({
    page,
  }) => {
    if (mode === 'reduced motion') {
      await page.emulateMedia({ reducedMotion: 'reduce' });
    } else {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.addInitScript(() => window.localStorage.setItem('ncs-motion', 'paused'));
    }
    await page.goto('/about/');
    if (mode === 'Pause motion') {
      await expect(page.locator('html')).toHaveAttribute('data-motion-paused', /.*/);
    }
    await openMenu(page);
    // Straight after showModal(): already in place, nothing moving.
    expect(await drawerAnimations(page)).toBe(0);
    expect(await dialog(page).evaluate((d) => getComputedStyle(d).translate)).toBe('none');
    expect(
      await dialog(page)
        .locator('.mnav-item')
        .first()
        .evaluate((el) => `${getComputedStyle(el).opacity} ${getComputedStyle(el).translate}`),
    ).toBe('1 none');
    expect(await pageTransforms(page)).toEqual(RESTING);
    await page.keyboard.press('Escape');
    await expect(dialog(page)).not.toHaveAttribute('open', '');
    expect(await drawerAnimations(page)).toBe(0);
    expect(await dialog(page).isVisible()).toBe(false);
    await expect(trigger(page)).toBeFocused();
  });
}

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
