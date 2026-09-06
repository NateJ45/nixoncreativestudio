import type { Page } from '@playwright/test';

// =============================================================================
// settle(): put a page in a stable, fully-rendered state before we measure or
// audit it. Without this, tests are flaky for two real reasons:
//
//   1. Web fonts (Bebas Neue, Source Sans 3) load async; text measured before
//      they load uses fallback metrics and can be a couple px wider, which
//      reads as a false Reflow fail.
//   2. Scroll-reveal content fades in via an opacity transition; axe run
//      mid-fade sees semi-transparent text and reports false color-contrast
//      violations.
//
// So: wait for fonts, kill all transitions/animations, then force every
// [data-reveal] element to its visible end-state. The reveal observer in
// BaseLayout.astro adds `.is-visible` as elements scroll in; this adds it to
// all of them at once (see CLAUDE.md, "Motion and effects system").
// =============================================================================
export async function settle(page: Page): Promise<void> {
  // Race the font wait: WebKit can leave fonts.ready pending while heavy
  // resources (the WebGL hero, the photo grid) are still loading.
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
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible')),
  );
}
