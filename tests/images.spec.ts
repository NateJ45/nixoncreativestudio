import { test, expect } from '@playwright/test';
import { routes } from './routes';

// =============================================================================
// Image pipeline (overhaul package 4.4)
// =============================================================================
// Two checks on every route:
//
// 1. Formats. Every build-optimized raster (/_astro/*.webp) sits in a <picture>
//    with an AVIF <source> ahead of it, so a browser that reads AVIF gets the
//    smaller file and everything else falls back to the WebP on the <img>.
//    Media.astro does this for every image that goes through it; the few
//    components that call astro:assets directly use <Picture> the same way.
//    Two exceptions stay plain WebP <img>s. The /work hover preview, whose
//    script swaps its src per row (data-preview-img). And the hero reel
//    (.reel-shot): its sources are small JPEGs already encoded once, and at
//    the reel's own quality AVIF came out larger than the WebP, so it only
//    shrinks at a quality that softens the captures (measured 2026-10-31:
//    552 KB of WebP against 727 KB of AVIF at 68, 572 KB at 60).
//
// 2. `sizes` tells the truth. The browser picks a srcset candidate from the
//    `sizes` value BEFORE layout, so a `sizes` that over-promises downloads a
//    bigger file than the slot needs, and one that under-promises paints a
//    soft, upscaled image. At four widths the test resolves each image's
//    `sizes` (an <img> with a 1w candidate reports the resolved slot as its
//    naturalWidth) and compares it with the box the image really fills
//    (offsetWidth, so hover scales and the reel's tilt do not count). It may
//    run up to 25% wide (the layout breakpoints between the four widths) and
//    never more than 5% narrow.
// =============================================================================

const WIDTHS = [390, 768, 1024, 1440];
const OVER = 1.25;
const UNDER = 0.95;

test.describe('Image pipeline', () => {
  for (const route of routes) {
    test(`${route}: AVIF sources and honest sizes`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route, { waitUntil: 'load' });

      const formatMisses = await page.evaluate(() =>
        [...document.images]
          .filter((img) => /\/_astro\/[^?]+\.webp/.test(img.getAttribute('src') ?? ''))
          .filter((img) => !img.hasAttribute('data-preview-img') && !img.matches('.reel-shot'))
          .filter((img) => {
            const picture = img.parentElement;
            if (picture?.tagName !== 'PICTURE') return true;
            return !picture.querySelector('source[type="image/avif"]');
          })
          .map((img) => img.getAttribute('src')),
      );
      expect(formatMisses, `${route}: WebP images without an AVIF source`).toEqual([]);

      const misses: string[] = [];
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        const rows = await page.evaluate(async () => {
          const gif =
            'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
          const out: { src: string; sizes: string; slot: number; box: number }[] = [];
          for (const img of document.images) {
            if (!img.sizes || !/\s\d+w/.test(img.srcset)) continue;
            const box = img.offsetWidth;
            if (!box) continue; // hidden at this width
            const probe = new Image();
            probe.sizes = img.sizes;
            probe.srcset = `${gif} 1w`;
            document.body.append(probe);
            await probe.decode().catch(() => {});
            out.push({
              src: (img.getAttribute('src') ?? '').split('/').pop() ?? '',
              sizes: img.sizes,
              slot: probe.naturalWidth,
              box,
            });
            probe.remove();
          }
          return out;
        });
        for (const r of rows) {
          const ratio = r.slot / r.box;
          if (ratio > OVER || ratio < UNDER) {
            misses.push(
              `${width}px ${r.src}: sizes gives ${r.slot}px, the image is ${r.box}px (${r.sizes})`,
            );
          }
        }
      }
      expect(misses, `${route}: sizes that do not match the layout`).toEqual([]);
    });
  }
});
