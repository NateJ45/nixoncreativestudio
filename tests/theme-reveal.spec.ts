import { test, expect, type Page } from '@playwright/test';

// =============================================================================
// Theme toggle circular reveal (overhaul package 4.5)
// =============================================================================
// Site-owned. A click on the theme toggle (src/scripts/theme-toggle.ts) runs a
// same-document View Transition while html.theme-reveal is set, and the new
// theme grows out of the button in a circle (styles in ThemeToggle.astro).
// These checks hold that:
//   - the theme still switches and persists across a reload;
//   - the reveal starts a View Transition, puts html.theme-reveal on for its
//     length only, and leaves the header's site-header name in place for the
//     next page navigation (3.1's morph lives in tests/reel-morph.spec.ts);
//   - under reduced motion and under Pause motion no View Transition starts
//     and no ::view-transition animation runs: the theme simply swaps.
// An init script wraps document.startViewTransition to count calls and to note
// whether html.theme-reveal was on at that moment. Chromium only.
// =============================================================================

test.use({ viewport: { width: 1440, height: 900 } });

declare global {
  interface Window {
    __vtCalls?: { revealClass: boolean }[];
  }
}

/** Start in light mode (fresh context) and count View Transitions as they start. */
async function prepare(page: Page) {
  await page.addInitScript(() => {
    // Only on the first load, so the reload below reads the stored choice.
    if (!localStorage.getItem('ncs-theme')) localStorage.setItem('ncs-theme', 'light');
    window.__vtCalls = [];
    const original = document.startViewTransition?.bind(document);
    if (!original) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).startViewTransition = (arg: any) => {
      window.__vtCalls!.push({
        revealClass: document.documentElement.classList.contains('theme-reveal'),
      });
      return original(arg);
    };
  });
  await page.goto('/', { waitUntil: 'load' });
  // The header holds two toggles (desktop and the closed mobile sheet); at
  // 1440 the desktop one is the visible one.
  await expect(
    page.locator('header [data-theme-toggle][data-bound]').filter({ visible: true }),
  ).toHaveCount(1);
}

/** Click the visible header toggle and report any ::view-transition animation seen in the next frames. */
async function clickAndWatch(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const seen = new Set<string>();
    const sample = () =>
      document.getAnimations().forEach((a) => {
        const pseudo = (a.effect as KeyframeEffect | null)?.pseudoElement;
        if (pseudo?.startsWith('::view-transition')) seen.add(pseudo);
      });
    [...document.querySelectorAll<HTMLButtonElement>('header [data-theme-toggle]')]
      .find((b) => b.getClientRects().length > 0)!
      .click();
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      sample();
    }
    return [...seen];
  });
}

test.describe('theme reveal', () => {
  test('switches the theme, persists it, and reveals it in a circle', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await prepare(page);
    test.skip(
      !(await page.evaluate(() => 'startViewTransition' in document)),
      'View Transitions unsupported',
    );

    const animated = await clickAndWatch(page);
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    expect(await page.evaluate(() => localStorage.getItem('ncs-theme'))).toBe('dark');

    const calls = await page.evaluate(() => window.__vtCalls);
    expect(calls, 'one View Transition, with the reveal class on').toEqual([{ revealClass: true }]);
    expect(animated).toContain('::view-transition-new(root)');

    // The class comes off once the transition finishes, and the header keeps
    // its static navigation name.
    await expect(page.locator('html')).not.toHaveClass(/\btheme-reveal\b/);
    const headerName = await page
      .locator('header[data-header]')
      .evaluate((el) => getComputedStyle(el).viewTransitionName);
    expect(headerName).toBe('site-header');

    // The choice survives a reload (the bootstrap reads the same key).
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });

  test('swaps instantly under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await prepare(page);
    const animated = await clickAndWatch(page);
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    expect(await page.evaluate(() => window.__vtCalls)).toEqual([]);
    expect(animated).toEqual([]);
    await expect(page.locator('html')).not.toHaveClass(/\btheme-reveal\b/);
  });

  test('swaps instantly while motion is paused', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(() => localStorage.setItem('ncs-motion', 'paused'));
    await prepare(page);
    const animated = await clickAndWatch(page);
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    expect(await page.evaluate(() => window.__vtCalls)).toEqual([]);
    expect(animated).toEqual([]);
  });
});
