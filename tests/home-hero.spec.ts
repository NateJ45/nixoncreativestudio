import { test, expect } from '@playwright/test';

// =============================================================================
// Homepage hero reel (redesign 2026, src/components/home/HeroReel.astro)
// =============================================================================
// The fanned carousel of client sites. What must hold on any data (the reel is curated
// in src/lib/homeWork.ts and gated by the case studies' launch status):
//   - the start frame is the LCP image: a real <img>, eager, fetchpriority high, sized;
//     every other frame is lazy or deferred;
//   - only live work is linked as live; a launching-soon build carries its label and no
//     link, and the workers.dev preview address never shows;
//   - unlaunched studies (Second Pres, Reid, the Academy) never appear;
//   - it never moves on its own; the arrows and the keys move it one frame.

const RETIRED = /second pres|reid design|presbyterian academy/i;

test.describe('Hero reel', () => {
  test('the start frame is the eager, high-priority LCP image; the rest wait', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const slides = page.locator('[data-reel] .slide');
    expect(await slides.count()).toBeGreaterThanOrEqual(1);
    const start = page.locator('[data-reel] .slide.is-start');
    await expect(start).toHaveCount(1);
    const lcp = start.locator('picture:not(.defer) img').first();
    await expect(lcp).toHaveAttribute('fetchpriority', 'high');
    await expect(lcp).toHaveAttribute('loading', 'eager');
    await expect(lcp).toHaveAttribute('width', /\d+/);
    await expect(lcp).toHaveAttribute('height', /\d+/);
    expect(await page.locator('img[fetchpriority="high"]').count()).toBe(1);
    const others = page.locator('[data-reel] .slide:not(.is-start) img');
    for (const loading of await others.evaluateAll((els) =>
      els.map((e) => e.getAttribute('loading')),
    ))
      expect(loading).toBe('lazy');
    // AVIF first, WebP as the fallback the <img> carries.
    await expect(start.locator('source[type="image/avif"]').first()).toHaveCount(1);
  });

  test('only live work is linked; a launching-soon build is labelled and unlinked', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const text = (await page.locator('[data-reel]').textContent()) ?? '';
    expect(text).not.toMatch(RETIRED);
    expect(text).not.toContain('workers.dev');
    const soon = page.locator('[data-reel] .vp--soon');
    for (let i = 0; i < (await soon.count()); i++) {
      await expect(soon.nth(i).locator('.tag')).toHaveText('Launching soon');
      await expect(soon.nth(i).locator('figcaption a')).toHaveCount(0);
    }
    for (const href of await page
      .locator('[data-reel] figcaption a')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? '')))
      expect(href).toMatch(/^https:\/\/(?!.*workers\.dev)/);
  });

  test('it never moves on its own; the arrows and the keys move one frame', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const count = page.locator('[data-reel] .c-n');
    const next = page.getByRole('button', { name: 'Next site' });
    await expect(next).toBeVisible();
    const first = Number(await count.textContent());
    await page.waitForTimeout(3000);
    await expect(count).toHaveText(String(first));
    await next.click();
    await expect(count).toHaveText(String(first + 1));
    await page.getByRole('button', { name: 'Previous site' }).click();
    await expect(count).toHaveText(String(first));
    await page.locator('[data-reel] .reel').focus();
    await page.keyboard.press('ArrowRight');
    await expect(count).toHaveText(String(first + 1));
    // 44 px targets.
    const box = await next.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  });
});

test.describe('Hero reel without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every frame is still in the page and the arrows are hidden', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const slides = await page.locator('[data-reel] .slide').count();
    // Every slide has its picture in the server HTML (no script needed to load it).
    expect(await page.locator('[data-reel] .slide img').count()).toBeGreaterThanOrEqual(slides);
    await expect(page.getByRole('button', { name: 'Next site' })).toBeHidden();
    await expect(page.locator('.home-hero a[href="/contact/"]')).toBeVisible();
  });
});
