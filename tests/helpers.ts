import type { Page } from '@playwright/test';

// =============================================================================
// settle(): put a page in a stable, fully-rendered state before we measure or
// audit it. Without this, tests are flaky for two real reasons:
//
//   1. The web font loads async; text measured before it loads uses fallback
//      metrics and can be a couple px wider, which reads as a false Reflow fail.
//   2. Headlines and study blocks come in on an animation; axe run mid-fade sees
//      semi-transparent text and reports false color-contrast violations.
//
// So: wait for fonts, kill all transitions/animations, and mark every study block
// (.rv) as arrived, the end state study.js would give it as it scrolls in.
// =============================================================================
export async function settle(page: Page): Promise<void> {
  // Race the font wait: WebKit can leave fonts.ready pending while heavy
  // resources are still loading.
  await page.evaluate(() =>
    Promise.race([
      document.fonts.ready.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(true), 5000)),
    ]),
  );
  await page.addStyleTag({
    content: '*,*::before,*::after{transition:none!important;animation:none!important}',
  });
  await page.evaluate(() =>
    document.querySelectorAll('.rv').forEach((el) => el.classList.add('in')),
  );
}

// =============================================================================
// springsAtRest(): wait until nothing on the page is still moving under script.
// The home hand, the About fan and the price cards are placed by spring code that
// writes inline transforms each frame. settle() stops CSS motion but not these, and
// a measure taken mid-spring sees cards overlapping more than they ever rest. So:
// wait for every inline transform to hold still for ten frames (at most 4s).
// =============================================================================
export async function springsAtRest(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        const read = () =>
          [...document.querySelectorAll<HTMLElement>('[style*="transform"]')]
            .map((e) => e.style.transform)
            .join('|');
        let last = read();
        let still = 0;
        const t0 = performance.now();
        const tick = () => {
          const now = read();
          still = now === last ? still + 1 : 0;
          last = now;
          if (still >= 10 || performance.now() - t0 > 4000) done();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
}
