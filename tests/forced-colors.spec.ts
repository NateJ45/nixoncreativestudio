import { test, expect } from '@playwright/test';

// =============================================================================
// Forced colors (Windows High Contrast) keeps surface edges visible
// =============================================================================
// Forced-colors mode throws away box-shadows and background colours. On this
// site that would erase the rings around framed artifacts, the hairlines at a
// change of surface, and the edge of a navy band. globals.css answers with a
// `@media (forced-colors: active)` block that gives .frame, .surface-card,
// .band-ink, .band-themed and .hairline a real border or outline, which the
// browser keeps (in a system colour). This checks one route, as the overhaul
// plan asks. No page renders .band-ink or .frame yet (Phase 2 and package 1.8
// add them), so the test drops one of each into /about and reads what the
// site's own stylesheet gives them. Chromium only (the WebKit project
// matches a fixed list of specs).
// =============================================================================

const edgeOf = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const band = document.createElement('section');
    band.className = 'band-ink';
    band.textContent = 'Ink band';
    const frame = document.createElement('div');
    frame.className = 'frame';
    frame.textContent = 'Frame';
    document.querySelector('main')!.append(band, frame);
    const b = getComputedStyle(band);
    const f = getComputedStyle(frame);
    const out = {
      // Preflight already sets border-style: solid, so the width is the tell.
      band: b.borderTopWidth,
      frame: f.outlineStyle,
    };
    band.remove();
    frame.remove();
    return out;
  });

test('forced colors: the ink band and the frame keep a visible edge', async ({ page }) => {
  await page.goto('/about/');
  expect(await edgeOf(page)).toEqual({ band: '0px', frame: 'none' });

  await page.emulateMedia({ forcedColors: 'active' });
  expect(await edgeOf(page)).toEqual({ band: '1px', frame: 'solid' });
});
