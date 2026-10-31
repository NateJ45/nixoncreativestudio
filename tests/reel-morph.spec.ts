import { test, expect, type Page } from '@playwright/test';

// =============================================================================
// Step into the reel (overhaul package 3.1)
// =============================================================================
// Site-owned. Clicking a card in the homepage hero reel morphs that exact
// frame into the case study's stage (src/scripts/reel-morph.ts):
//   - at the moment the View Transition starts, the ONE clicked .reel-frame
//     carries `cover-{slug}` and the reel stage carries `hero-reel`, and no
//     name is held twice (a duplicate would abort the whole transition, and
//     SelectedWork holds `cover-{slug}` statically further down the page);
//   - the click lands on /work/{slug}/, whose stage carries the same name;
//   - under reduced motion and under Pause motion no reel name is set, so
//     nothing morphs and nothing moves.
// The reel drifts, so the click is dispatched in the page (Playwright would
// wait forever for a moving card to settle). An init script wraps
// document.startViewTransition to record every named element at the moment
// the router calls it; window survives the ClientRouter's soft navigation.
// Chromium only (WebKit's project runs a fixed list of specs).
// =============================================================================

test.use({ viewport: { width: 1440, height: 900 } });

type Named = { name: string; reelFrame: boolean };

declare global {
  interface Window {
    __vtNames?: Named[] | null;
  }
}

async function recordTransitions(page: Page) {
  await page.addInitScript(() => {
    window.__vtNames = null;
    const original = document.startViewTransition?.bind(document);
    if (!original) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).startViewTransition = (arg: any) => {
      if (window.__vtNames === null) {
        window.__vtNames = [...document.querySelectorAll<HTMLElement>('*')]
          .map((el) => ({
            name: getComputedStyle(el).viewTransitionName,
            reelFrame: el.classList.contains('reel-frame'),
          }))
          .filter((n) => n.name && n.name !== 'none');
      }
      return original(arg);
    };
  });
}

/** Click the first visible card in the reel; returns its slug. */
async function stepIntoReel(page: Page): Promise<string> {
  await page.goto('/', { waitUntil: 'load' });
  const slug = await page.evaluate(() => {
    const card = [...document.querySelectorAll<HTMLAnchorElement>('.reel-card')].find((c) => {
      const r = c.getBoundingClientRect();
      return r.width > 0 && r.top > 0 && r.bottom < window.innerHeight;
    });
    card?.click();
    return card?.dataset.slug ?? '';
  });
  expect(slug, 'a reel card should be on screen').not.toBe('');
  await page.waitForURL(`**/work/${slug}/`);
  await expect(page.locator('.cs-stage')).toBeVisible();
  return slug;
}

test.describe('reel morph', () => {
  test('names the clicked frame and the stage once each, then lands on the study', async ({
    page,
  }) => {
    test.skip(
      !(await page.evaluate(() => 'startViewTransition' in document)),
      'View Transitions unsupported',
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await recordTransitions(page);
    const slug = await stepIntoReel(page);

    const names = await page.evaluate(() => window.__vtNames);
    expect(names, 'the router should start a View Transition').not.toBeNull();
    const list = names!;
    const cover = list.filter((n) => n.name === `cover-${slug}`);
    expect(cover, 'exactly one element holds the cover name').toHaveLength(1);
    expect(cover[0].reelFrame, 'and it is the clicked reel frame').toBe(true);
    expect(list.filter((n) => n.name === 'hero-reel')).toHaveLength(1);
    const all = list.map((n) => n.name);
    expect(new Set(all).size, `no duplicate names: ${all.join(', ')}`).toBe(all.length);

    // The study's stage carries the matching name.
    const stageName = await page
      .locator('.cs-stage')
      .evaluate((el) => getComputedStyle(el).viewTransitionName);
    expect(stageName).toBe(`cover-${slug}`);
  });

  test('sets no reel names under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await recordTransitions(page);
    await stepIntoReel(page);
    const names = (await page.evaluate(() => window.__vtNames)) ?? [];
    expect(names.some((n) => n.reelFrame || n.name === 'hero-reel')).toBe(false);
  });

  test('sets no reel names while motion is paused', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(() => localStorage.setItem('ncs-motion', 'paused'));
    await recordTransitions(page);
    await stepIntoReel(page);
    const names = (await page.evaluate(() => window.__vtNames)) ?? [];
    expect(names.some((n) => n.reelFrame || n.name === 'hero-reel')).toBe(false);
  });
});
