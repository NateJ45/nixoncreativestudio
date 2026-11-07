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
