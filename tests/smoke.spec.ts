import { test, expect } from '@playwright/test';
import { journalDraftSlug, journalEmpty, routes } from './routes';

// =============================================================================
// Smoke: every route builds and renders (not a 404 / error page)
// =============================================================================

test.describe('Smoke: every route renders', () => {
  for (const route of routes) {
    test(`${route} returns 200 and renders`, async ({ page }) => {
      const resp = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(resp?.status(), `${route} HTTP status`).toBe(200);
      // A real rendered page (every title carries the studio name), not a
      // blank or error body.
      await expect(page).toHaveTitle(/Nixon Creative Studio/);
    });
  }
});

// =============================================================================
// Site chrome: the header links and the footer email are on every page
// =============================================================================
// The header nav, the "Start a project" button and the footer contact details
// come from the CMS (the `primary` menu and Site settings, CMS-DESIGN PR 4), with
// the committed JSON as the fallback. Whichever path served the page, the chrome
// has to be complete, so this checks the rendered DOM on every route (the
// standalone /coming-soon page has no header or footer and is skipped). It reads
// attributes rather than visibility so the mobile profile, where the desktop nav
// is hidden below md, checks the same markup.
//
// The fourth menu item, Journal, is hidden by design until a journal entry is
// published. The CI dataset carries one published test entry (and a draft that
// must not count), so Journal shows here; with JOURNAL_EMPTY=1 (the CI journal
// rebuilt with no test content, tests/routes.ts) it must be absent.
test.describe('Smoke: header links and footer email on every route', () => {
  for (const route of routes.filter((r) => r !== '/coming-soon')) {
    test(`${route} has the header links and the footer email`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      const nav = await page
        .locator('header nav[aria-label="Primary"] a')
        .evaluateAll((links) =>
          links.map((a) => [a.textContent?.trim(), a.getAttribute('href')] as const),
        );
      expect(nav, `${route} header menu links`).toEqual([
        ['Work', '/work/'],
        ['Services', '/services/'],
        ['About', '/about/'],
        ...(journalEmpty ? [] : [['Journal', '/journal/']]),
      ]);

      const cta = page.locator('header a[href="/contact/"]').first();
      await expect(cta, `${route} header CTA`).toHaveText('Start a project');

      await expect(
        page.locator('footer a[href="mailto:nathan@nixoncreativestudio.com"]').first(),
        `${route} footer email link`,
      ).toHaveText('nathan@nixoncreativestudio.com');
    });
  }
});

// =============================================================================
// Unknown case study: a real 404, not a 200 with an error body
// =============================================================================
// /work/[slug] is server-rendered from EmDash, so a slug the CMS does not have
// has to answer 404 itself (the route returns an empty-body 404 and Astro
// serves the site's not-found page). A soft 404 here would be indexed by search
// engines as a page.
test.describe('Smoke: unknown case study', () => {
  test('/work/<unknown-slug>/ returns 404 with the not-found page', async ({ page }) => {
    const resp = await page.goto('/work/this-case-study-does-not-exist/', {
      waitUntil: 'domcontentloaded',
    });
    expect(resp?.status(), 'unknown slug HTTP status').toBe(404);
    await expect(page).toHaveTitle(/Page not found \| Nixon Creative Studio/);
  });
});

// =============================================================================
// Unknown journal entry and a draft: a real 404, never the entry
// =============================================================================
// /journal/[slug] is server-rendered from the CMS. A slug that does not exist and a
// DRAFT slug must both answer 404 with the not-found page. The draft exists in the CI
// database (scripts/ci-dataset/ci-content/posts.json), so this is the live proof that
// a draft is not visible; the draft text must not appear in the list either (that
// check is in journal.spec.ts).
test.describe('Smoke: unknown and draft journal entries', () => {
  for (const slug of ['this-entry-does-not-exist', journalDraftSlug]) {
    test(`/journal/${slug}/ returns 404 with the not-found page`, async ({ page }) => {
      const resp = await page.goto(`/journal/${slug}/`, { waitUntil: 'domcontentloaded' });
      expect(resp?.status(), `${slug} HTTP status`).toBe(404);
      await expect(page).toHaveTitle(/Page not found \| Nixon Creative Studio/);
    });
  }
});

// The pre-launch gate page is a holding page: not indexable and not in the sitemap.
test('/coming-soon/ is noindex and absent from the sitemap', async ({ page, request }) => {
  await page.goto('/coming-soon/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('h1')).toContainText('Launching');
  const res = await request.get('/sitemap-0.xml');
  if (res.ok()) expect(await res.text()).not.toContain('/coming-soon');
});

// The phone menu (src/components/MobileMenu.astro). With JavaScript it is a
// modal <dialog>: aria-expanded on the trigger, Tab and Shift+Tab stay inside,
// Escape closes it and focus returns to the trigger. Without JavaScript the
// same dialog is a popover the buttons open and close.
test.describe('Smoke: phone menu', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens, traps focus, and closes on Escape back to the trigger', async ({
    page,
    browserName,
  }) => {
    // WebKit does not move focus to links with Tab by default.
    test.skip(browserName === 'webkit', 'Tab skips links in WebKit');
    await page.goto('/services/', { waitUntil: 'load' });
    const trigger = page.locator('header [data-menu-open]');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    const menu = page.locator('#site-menu');
    await expect(menu.locator('nav a').first()).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    for (const key of ['Tab', 'Shift+Tab']) {
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press(key);
        const inside = await page.evaluate(() => !!document.activeElement?.closest('#site-menu'));
        expect(inside, `${key} ${i + 1} stays in the menu`).toBe(true);
      }
    }
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('the menu button still opens and closes the menu', async ({ page }) => {
      await page.goto('/services/', { waitUntil: 'domcontentloaded' });
      await page.locator('header [data-menu-open]').click();
      const menu = page.locator('#site-menu');
      await expect(menu.locator('nav a').first()).toBeVisible();
      await menu.locator('[data-menu-close]').click();
      await expect(menu).toBeHidden();
    });
  });
});

// =============================================================================
// GA4 fires only on the production hostname (starter PORTS.md card 58)
// =============================================================================
// GoogleAnalytics.astro compares location.hostname with the site's own URL and
// does nothing anywhere else. CI builds without PUBLIC_GA_ID, so on the ncs-ci
// preview this passes trivially; it bites on a build made with the id baked in
// (a developer's .env). The 2026-09 report showed 22 localhost and 3 ncs-ci
// sessions in the live property before the guard. Skipped on the real domain,
// where the tag is supposed to fire.
test('GA4 sends nothing off the production hostname, even when the id is built in', async ({
  page,
  baseURL,
}) => {
  const host = new URL(baseURL ?? 'http://localhost').hostname;
  test.skip(
    host === 'nixoncreativestudio.com' || host === 'www.nixoncreativestudio.com',
    'the tag is meant to fire on the production hostname',
  );
  const gaRequests: string[] = [];
  page.on('request', (req) => {
    if (/googletagmanager\.com|google-analytics\.com/.test(req.url())) gaRequests.push(req.url());
  });
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  expect(gaRequests, `requests to Google Analytics from ${host}`).toEqual([]);
  expect(await page.evaluate(() => typeof (window as { dataLayer?: unknown }).dataLayer)).toBe(
    'undefined',
  );
});
