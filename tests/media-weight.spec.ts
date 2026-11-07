import { test, expect } from '@playwright/test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';

// =============================================================================
// Footage: fetched only when asked for
// =============================================================================
// Every window's footage is preload=none with its address in data-src, so a page
// costs nothing in video until a window plays. A study's interaction clip plays
// once when it reaches you, with a button to see it again, and under reduced
// motion it is the poster only.

const dir = 'src/content/case-studies/';
const studies = readdirSync(dir)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => {
    const text = readFileSync(dir + f, 'utf8');
    const m = /signatureClip:\s*\n\s*src:\s*['"]?([^'"\n]+)/.exec(text);
    return { slug: f.replace(/\.mdx$/, ''), clip: m?.[1] };
  })
  .filter((s) => s.clip);

const isVideo = (url: string) => /\.(mp4|webm)(\?|$)/.test(url);

test('at least one study has an interaction clip', () => {
  expect(studies.length).toBeGreaterThan(0);
});

test('every clip file is at most 1.5 MB, and every clip has its three files', () => {
  for (const f of readdirSync('public/media')) {
    expect(statSync(`public/media/${f}`).size, f).toBeLessThanOrEqual(1.5 * 1024 * 1024);
  }
  for (const { clip } of studies) {
    for (const ext of ['mp4', 'webm', 'webp']) {
      expect(existsSync(`public${clip}.${ext}`), `${clip}.${ext}`).toBe(true);
    }
  }
});

for (const route of ['/', '/work/', '/about/']) {
  test(`${route} fetches no video on load`, async ({ page }) => {
    const videos: string[] = [];
    page.on('request', (r) => {
      if (isVideo(r.url())) videos.push(r.url());
    });
    await page.goto(route, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    expect(videos).toEqual([]);
    const preload = await page
      .locator('video')
      .evaluateAll((all) => all.map((v) => v.getAttribute('preload')));
    expect(preload.every((p) => p === 'none')).toBe(true);
  });
}

test('a window plays its footage under the pointer', async ({ page }) => {
  await page.goto('/about/');
  const band = page.locator('.band a.tile').first();
  await band.scrollIntoViewIfNeeded();
  await band.hover();
  await expect
    .poll(() =>
      band.locator('video').evaluate((v: HTMLVideoElement) => v.getAttribute('src') ?? ''),
    )
    .toMatch(/-m\.mp4$/);
});

for (const { slug } of studies) {
  test.describe(`/work/${slug}/`, () => {
    test('the clip has a button once scripts run', async ({ page }) => {
      await page.goto(`/work/${slug}/`);
      const clip = page.locator('[data-clip]');
      await expect(clip.locator('video')).toHaveAttribute('poster', /\.webp$/);
      await expect(clip.locator('[data-clip-btn]')).toBeVisible();
      await expect(clip.locator('video')).toHaveAttribute('aria-label', /\S/);
    });

    test('under reduced motion it stays on its poster', async ({ browser }) => {
      const ctx = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.goto(`/work/${slug}/`);
      const clip = page.locator('[data-clip]');
      await clip.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      expect(await clip.locator('video').evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
      await ctx.close();
    });
  });
}
