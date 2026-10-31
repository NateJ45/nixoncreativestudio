import { test, expect, type Page } from '@playwright/test';

// =============================================================================
// Overlap page transition (overhaul package 4.11)
// =============================================================================
// Site-owned. Every ClientRouter navigation runs one View Transition whose
// main content (the `root` snapshot: the header and footer carry their own
// names, so root holds <main> and nothing else) overlaps:
//   - forward, the new page slides up (ncs-vt-rise) over the old one, which
//     recedes (ncs-vt-recede);
//   - back, the old page slides down (ncs-vt-sink) off the new one, which
//     comes forward (ncs-vt-return);
//   - the header is its own static group ("site-header") and never animates;
//   - under reduced motion and under Pause motion nothing animates at all;
//   - the theme toggle keeps its own circular reveal (html.theme-reveal), with
//     none of the overlap's animations.
// The CSS is in src/components/PageTransition.astro. An init script wraps
// document.startViewTransition to record, for every transition, the router's
// direction and every ::view-transition animation once the pseudo-elements
// exist; window survives the ClientRouter's soft navigation.
// Chromium only (WebKit's project runs a fixed list of specs).
// =============================================================================

type Seen = { pseudo: string; name: string };
type Call = { direction: string | null; theme: boolean; animations: Seen[] };

declare global {
  interface Window {
    __pageVt?: Call[];
  }
}

async function recordTransitions(page: Page) {
  await page.addInitScript(() => {
    window.__pageVt = [];
    const original = document.startViewTransition?.bind(document);
    if (!original) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).startViewTransition = (arg: any) => {
      const root = document.documentElement;
      const call: Call = {
        direction: root.getAttribute('data-astro-transition'),
        theme: root.classList.contains('theme-reveal'),
        animations: [],
      };
      window.__pageVt!.push(call);
      const transition = original(arg);
      transition.ready
        .then(() => {
          document.getAnimations().forEach((a) => {
            const pseudo = (a.effect as KeyframeEffect | null)?.pseudoElement ?? '';
            if (!pseudo.startsWith('::view-transition')) return;
            call.animations.push({ pseudo, name: (a as CSSAnimation).animationName ?? '' });
          });
        })
        .catch(() => {
          /* Skipped transitions record no animations. */
        });
      return transition;
    };
  });
}

/** Load the homepage, then follow the header's Work link as a soft navigation. */
async function goToWork(page: Page) {
  await page.goto('/', { waitUntil: 'load' });
  await page.evaluate(() => {
    [...document.querySelectorAll<HTMLAnchorElement>('header a[href="/work/"]')]
      .find((a) => a.getClientRects().length > 0)!
      .click();
  });
  await page.waitForURL('**/work/');
  await expect(page.locator('h1')).toBeVisible();
}

/** Wait until the recorder has seen `n` transitions and the last one is ready. */
async function calls(page: Page, n: number): Promise<Call[]> {
  await expect.poll(() => page.evaluate(() => window.__pageVt?.length ?? 0)).toBe(n);
  // Give the last transition's ready promise a few frames to resolve.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await page.waitForTimeout(100);
  return page.evaluate(() => window.__pageVt!);
}

const named = (call: Call, pseudo: string) =>
  call.animations.filter((a) => a.pseudo === pseudo).map((a) => a.name);

test.use({ viewport: { width: 1440, height: 900 } });

test.describe('overlap page transition', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !(await page.evaluate(() => 'startViewTransition' in document)),
      'View Transitions unsupported',
    );
  });

  test('forward slides the new page up over the old, back reverses it', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await recordTransitions(page);
    await goToWork(page);

    // The header holds its own name; <main> travels in root, unnamed.
    expect(
      await page
        .locator('header[data-header]')
        .evaluate((el) => getComputedStyle(el).viewTransitionName),
    ).toBe('site-header');
    expect(
      await page.locator('main').evaluate((el) => getComputedStyle(el).viewTransitionName),
    ).toBe('none');

    const [forward] = await calls(page, 1);
    expect(forward.direction).toBe('forward');
    expect(forward.theme).toBe(false);
    expect(named(forward, '::view-transition-new(root)')).toContain('ncs-vt-rise');
    expect(named(forward, '::view-transition-old(root)')).toContain('ncs-vt-recede');
    // The header stays put: no animation on its group or its snapshots.
    expect(forward.animations.filter((a) => a.pseudo.includes('(site-header)'))).toEqual([]);

    await page.goBack();
    await page.waitForURL((url) => url.pathname === '/');
    const [, back] = await calls(page, 2);
    expect(back.direction).toBe('back');
    expect(named(back, '::view-transition-old(root)')).toContain('ncs-vt-sink');
    expect(named(back, '::view-transition-new(root)')).toContain('ncs-vt-return');
    expect(back.animations.filter((a) => a.pseudo.includes('(site-header)'))).toEqual([]);
  });

  test('nothing animates under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await recordTransitions(page);
    await goToWork(page);
    const list = await page.evaluate(() => window.__pageVt ?? []);
    expect(list.flatMap((c) => c.animations)).toEqual([]);
  });

  test('nothing animates while motion is paused', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(() => localStorage.setItem('ncs-motion', 'paused'));
    await recordTransitions(page);
    await goToWork(page);
    await expect(page.locator('html')).toHaveAttribute('data-motion-paused', '');
    const list = await page.evaluate(() => window.__pageVt ?? []);
    expect(list.flatMap((c) => c.animations)).toEqual([]);
  });

  test('the theme toggle keeps its own reveal, not the overlap', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'light' });
    // Start on an explicit light choice, so the next click (dark) changes
    // the visible theme and the reveal runs.
    await page.addInitScript(() => localStorage.setItem('ncs-theme', 'light'));
    await recordTransitions(page);
    await page.goto('/', { waitUntil: 'load' });
    const toggle = page.locator('header [data-theme-toggle][data-bound]').filter({ visible: true });
    await expect(toggle).toHaveCount(1);
    await toggle.click();
    const [reveal] = await calls(page, 1);
    expect(reveal.theme).toBe(true);
    expect(reveal.direction).toBeNull();
    expect(named(reveal, '::view-transition-new(root)')).toContain('theme-reveal');
    expect(reveal.animations.filter((a) => a.name.startsWith('ncs-vt-'))).toEqual([]);
  });
});
