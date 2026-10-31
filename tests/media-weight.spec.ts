import { test, expect, type Page } from '@playwright/test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';

// =============================================================================
// Interaction clips (Clip.astro in the "The idea" band, overhaul 3.5)
// =============================================================================
// Site-owned, chromium only. The promises from the plan's acceptance row:
//   - no more than 50 KB of video arrives before a clip is near the screen
//     (preload="none", the poster is a lazy <img>, play() waits for the
//     IntersectionObserver), and once it is in view it really plays;
//   - every file in public/media/ is at most 1.5 MB;
//   - under prefers-reduced-motion and under html[data-motion-paused] the
//     clip is its poster only: no video bytes, no play, no Pause button.
// Plus the clip's own Pause button, and axe on the band in both themes.
// The studies come from the MDX files, so a new signatureClip is tested on
// its own.
// =============================================================================

const MAX_FILE = 1.5 * 1024 * 1024;
const MAX_VIDEO_BEFORE_VIEW = 50 * 1024;

const mediaDir = join(process.cwd(), 'public/media');
const dir = join(process.cwd(), 'src/content/case-studies');
const studies = readdirSync(dir)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => {
    const frontmatter = readFileSync(join(dir, f), 'utf8').split(/^---$/m)[1] ?? '';
    const src = frontmatter.match(/^signatureClip:\s*\n\s+src:\s*(\S+)/m)?.[1];
    return { slug: f.replace(/\.mdx$/, ''), src };
  })
  .filter((s): s is { slug: string; src: string } => Boolean(s.src));

const isVideo = (url: string) => /\/media\/[^?]+\.(mp4|webm)(\?|$)/.test(url);

/** Count the video bytes the page receives from now on. */
function watchVideo(page: Page) {
  const seen = { bytes: 0, requests: 0 };
  page.on('requestfinished', async (request) => {
    if (!isVideo(request.url())) return;
    const sizes = await request.sizes().catch(() => null);
    seen.bytes += sizes?.responseBodySize ?? 0;
  });
  // Count every request as it starts, so one still streaming counts too.
  page.on('request', (request) => {
    if (isVideo(request.url())) seen.requests += 1;
  });
  return seen;
}

test('at least one study has an interaction clip', () => {
  expect(studies.length).toBeGreaterThan(0);
});

test('every clip file is at most 1.5 MB, and every clip has its three files', () => {
  const files = existsSync(mediaDir) ? readdirSync(mediaDir) : [];
  for (const f of files) {
    expect(statSync(join(mediaDir, f)).size, f).toBeLessThanOrEqual(MAX_FILE);
  }
  for (const { slug, src } of studies) {
    for (const ext of ['mp4', 'webm', 'webp']) {
      const file = join(process.cwd(), 'public', `${src}.${ext}`);
      expect(existsSync(file), `${slug}: ${src}.${ext}`).toBe(true);
    }
  }
});

for (const { slug } of studies) {
  test.describe(`/work/${slug}/ clip`, () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('loads no video until it is near the screen, then plays and pauses', async ({ page }) => {
      const seen = watchVideo(page);
      await page.goto(`/work/${slug}/`);
      await page.waitForLoadState('load');
      await page.waitForTimeout(1500);

      const clip = page.locator('[data-clip]');
      await expect(clip).toHaveCount(1);
      // The band must start well below the first screen, or this proves nothing.
      const top = await clip.evaluate((el) => el.getBoundingClientRect().top / innerHeight);
      expect(top, 'clip starts below the first viewport').toBeGreaterThan(1.3);
      expect(seen.bytes, 'video bytes before the clip is in view').toBeLessThanOrEqual(
        MAX_VIDEO_BEFORE_VIEW,
      );

      await clip.scrollIntoViewIfNeeded();
      await expect(clip).toHaveClass(/is-playing/, { timeout: 10_000 });
      const video = clip.locator('video');
      expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
      expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);

      // Its own Pause button stops it and says so.
      const toggle = clip.locator('[data-clip-toggle]');
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAccessibleName('Pause clip');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);

      // The site-wide Pause motion stops it too, back to the poster.
      await page.evaluate(() => {
        const button = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
        button?.click();
      });
      await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
      await expect(clip.locator('.clip-poster')).toBeVisible();
      await expect(toggle).toBeHidden();
    });

    for (const mode of ['reduced motion', 'Pause motion'] as const) {
      test(`is the poster only under ${mode}`, async ({ page }) => {
        if (mode === 'reduced motion') {
          await page.emulateMedia({ reducedMotion: 'reduce' });
        } else {
          await page.addInitScript(() => {
            try {
              localStorage.setItem('ncs-motion', 'paused');
            } catch {
              /* storage blocked: the test would fail on its own below */
            }
          });
        }
        const seen = watchVideo(page);
        await page.goto(`/work/${slug}/`);
        const clip = page.locator('[data-clip]');
        await clip.scrollIntoViewIfNeeded();
        await page.waitForTimeout(2000);

        await expect(clip.locator('.clip-poster')).toBeVisible();
        expect(
          await clip.locator('.clip-poster').evaluate((i: HTMLImageElement) => i.complete),
        ).toBe(true);
        await expect(clip).not.toHaveClass(/is-playing/);
        expect(await clip.locator('video').evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
        await expect(clip.locator('[data-clip-toggle]')).toBeHidden();
        expect(seen.requests, 'video requests').toBe(0);
        expect(seen.bytes, 'video bytes').toBe(0);
      });
    }
  });
}

// One study is enough for axe: every clip is the same component.
for (const theme of ['light', 'dark'] as const) {
  test(`the clip band is axe-clean in ${theme} mode`, async ({ page }) => {
    test.skip(!studies.length, 'no study has a clip');
    await page.addInitScript((t) => {
      try {
        localStorage.setItem('ncs-theme', t);
      } catch {
        /* ignore */
      }
    }, theme);
    await page.goto(`/work/${studies[0].slug}/`);
    const clip = page.locator('[data-clip]');
    await clip.scrollIntoViewIfNeeded();
    await expect(clip.locator('[data-clip-toggle]')).toBeVisible();
    await expect(clip.getByRole('img', { name: /\S/ })).toHaveCount(1);
    const results = await new AxeBuilder({ page }).include('[data-clip]').analyze();
    expect(results.violations).toEqual([]);
  });
}
