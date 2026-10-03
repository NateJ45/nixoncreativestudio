import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// =============================================================================
// studio-help plugin (the admin tour, Help page, dashboard widget, editor panel)
// =============================================================================
// Two groups.
//
// 1. "Isolation" runs everywhere, including CI against the Worker preview. It
//    proves the plugin adds nothing to the public site and that its routes are not
//    readable without signing in. (CI has no admin user, so it cannot go further.)
//
// 2. "In a local dev admin" drives the REAL EmDash admin UI with the real plugin
//    bundled in. It only runs when STUDIO_HELP_ADMIN=1, against `astro dev`, because
//    it signs in through EmDash's dev-only bypass endpoint (`/_emdash/api/setup/
//    dev-bypass`, which exists only when import.meta.env.DEV is true and creates a
//    throwaway admin in the LOCAL emulated database). Never point it at a deployed
//    URL: the endpoint 404s there and nothing in this group would pass. Recipe:
//
//      CLOUDFLARE_ENV=ci npx astro dev --port 4399        (terminal 1)
//      STUDIO_HELP_ADMIN=1 PLAYWRIGHT_BASE_URL=http://localhost:4399 \
//        npx playwright test tests/studio-help.spec.ts --project=chromium   (terminal 2)
// =============================================================================

test.describe('studio-help: isolation (runs everywhere)', () => {
  test('its API routes answer nothing to a signed-out visitor', async ({ request }) => {
    for (const route of ['content', 'state']) {
      const res = await request.get(`/_emdash/api/plugins/studio-help/${route}`);
      expect([401, 403], `${route} status`).toContain(res.status());
      const body = await res.text();
      expect(body).not.toContain('How this site works');
    }
  });

  test('the public homepage carries no trace of the plugin', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(html).not.toContain('studio-help');
    expect(html).not.toContain('sh-card');
  });
});

const adminTests = process.env.STUDIO_HELP_ADMIN === '1';

test.describe('studio-help: in a local dev admin', () => {
  test.skip(
    !adminTests,
    'set STUDIO_HELP_ADMIN=1 and run against `astro dev` (see the file header)',
  );

  /** Sign in through the dev-only bypass, forget any earlier "seen" record, open the dashboard. */
  async function openDashboard(page: Page, theme: 'light' | 'dark' = 'dark') {
    await page.addInitScript((t) => {
      try {
        window.localStorage.setItem('emdash-theme', t);
      } catch {
        /* ignore */
      }
    }, theme);
    // page.request shares the browser context's cookies, so this signs the page in.
    const bypass = await page.request.get('/_emdash/api/setup/dev-bypass');
    expect(bypass.ok(), 'dev-bypass answered (only exists under `astro dev`)').toBe(true);
    // Forget the "seen" record that an earlier test run left in the local database.
    await page.request.post('/_emdash/api/plugins/studio-help/state', {
      headers: { 'X-EmDash-Request': '1' },
      data: { action: 'reset' },
    });
    await page.goto('/_emdash/admin');
    // EmDash shows its own welcome dialog to a brand-new account; the tour waits for it.
    const welcome = page.getByText('Get Started', { exact: true });
    if (await welcome.isVisible({ timeout: 8000 }).catch(() => false)) await welcome.click();
  }

  const tour = (page: Page) => page.locator('.sh-card');

  test('opens on its own on first visit, is a labelled modal dialog, and does not return after Skip', async ({
    page,
  }) => {
    await openDashboard(page);
    await expect(tour(page)).toBeVisible({ timeout: 15000 });
    await expect(tour(page)).toHaveAttribute('role', 'dialog');
    await expect(tour(page)).toHaveAttribute('aria-modal', 'true');
    await expect(tour(page)).toHaveAccessibleName(/How this site works/);
    await expect(page.getByText('Step 1 of 10')).toBeVisible();
    // Focus starts inside the card, on Next.
    await expect(page.getByRole('button', { name: 'Next' })).toBeFocused();

    await page.getByRole('button', { name: 'Skip tour' }).click();
    await expect(tour(page)).toHaveCount(0);

    // Once per user: a reload (a fresh dashboard visit) must not open it again.
    await page.reload();
    await page.waitForTimeout(2500);
    await expect(tour(page)).toHaveCount(0);

    // ...but it can be started again from the dashboard widget.
    await page.getByRole('button', { name: 'Take the tour' }).click();
    await expect(tour(page)).toBeVisible();
  });

  test('keyboard: arrows step, Tab stays inside the card, Escape skips, focus is returned', async ({
    page,
  }) => {
    await openDashboard(page);
    await expect(tour(page)).toBeVisible({ timeout: 15000 });
    await page.keyboard.press('Escape');
    await expect(tour(page)).toHaveCount(0);

    const launch = page.getByRole('button', { name: 'Take the tour' });
    await launch.focus();
    await page.keyboard.press('Enter');
    await expect(tour(page)).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('Step 2 of 10')).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByText('Step 1 of 10')).toBeVisible();

    // Tab many more times than there are controls: focus must never leave the card.
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => !!document.activeElement?.closest('.sh-card'));
      expect(inside, `Tab press ${i + 1}`).toBe(true);
    }
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Shift+Tab');
      const inside = await page.evaluate(() => !!document.activeElement?.closest('.sh-card'));
      expect(inside, `Shift+Tab press ${i + 1}`).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(tour(page)).toHaveCount(0);
    await expect(launch).toBeFocused();
  });

  test('walks all ten steps to Done; sidebar steps spotlight a visible sidebar element', async ({
    page,
  }) => {
    await openDashboard(page);
    await expect(tour(page)).toBeVisible({ timeout: 15000 });
    let spotlit = 0;
    for (let i = 1; i <= 10; i++) {
      await expect(page.getByText(`Step ${i} of 10`)).toBeVisible();
      if ((await page.locator('.sh-spot').count()) > 0) {
        spotlit++;
        // The ring must sit on something that is really in the sidebar (a link or a group heading).
        const box = await page.locator('.sh-spot').boundingBox();
        expect(box, `step ${i} spotlight box`).not.toBeNull();
        expect(box!.x, `step ${i}: spotlight starts in the sidebar column`).toBeLessThan(300);
      }
      // The card is always inside the viewport.
      const card = await tour(page).boundingBox();
      const vp = page.viewportSize()!;
      expect(card!.x).toBeGreaterThanOrEqual(0);
      expect(card!.y).toBeGreaterThanOrEqual(0);
      expect(card!.x + card!.width).toBeLessThanOrEqual(vp.width);
      expect(card!.y + card!.height).toBeLessThanOrEqual(vp.height + 1);
      await page.getByRole('button', { name: i === 10 ? 'Done' : 'Next' }).click();
    }
    await expect(tour(page)).toHaveCount(0);
    // Steps 3 to 8 name sidebar screens; every one should have found its target.
    expect(spotlit).toBeGreaterThanOrEqual(6);
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`the tour card passes axe in the ${theme} admin theme`, async ({ page }) => {
      await openDashboard(page, theme);
      await expect(tour(page)).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(400); // let the card settle (position transition)
      const results = await new AxeBuilder({ page }).include('.sh-card').analyze();
      expect(
        results.violations
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
          .join('\n'),
      ).toBe('');
    });
  }

  test('reduced motion: the card has no transition', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openDashboard(page);
    await expect(tour(page)).toBeVisible({ timeout: 15000 });
    const dur = await tour(page).evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(dur === '0s' || dur === '').toBe(true);
  });

  test('the Help page lists the tour, the goals table and the leave-alone list', async ({
    page,
  }) => {
    await openDashboard(page);
    await page.keyboard.press('Escape');
    await page.goto('/_emdash/admin/plugins/studio-help/help');
    await expect(
      page.getByRole('heading', { level: 1, name: 'How this site works' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The tour, written out' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'I want to change something' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Leave these alone' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Pricing & services, Pricing tiers' }),
    ).toHaveAttribute('href', '/_emdash/admin/content/pricing_tiers');
    await page.getByRole('button', { name: 'Take the tour again' }).click();
    await expect(tour(page)).toBeVisible();
  });

  test('the editor shows "About this screen" with the Journal Summary rule', async ({ page }) => {
    await openDashboard(page);
    await page.keyboard.press('Escape');
    // Make one throwaway entry in the LOCAL dev database, then open it.
    const id = await page.evaluate(async () => {
      const res = await fetch('/_emdash/api/content/posts', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-EmDash-Request': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: `help-test-${Date.now()}`,
          data: { title: 'Help test', excerpt: 'A test.' },
          status: 'draft',
        }),
      });
      return ((await res.json()) as { data: { item: { id: string } } }).data.item.id;
    });
    await page.goto(`/_emdash/admin/content/posts/${id}`);
    const panel = page.locator('.sh-panel');
    await expect(panel).toBeAttached({ timeout: 15000 });
    await expect(panel).toContainText('One Journal entry');
    await expect(panel).toContainText('Summary box is required');
  });
});
