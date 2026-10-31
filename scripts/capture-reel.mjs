// Safe to edit.
/* ============================================================================
   capture-reel.mjs: re-shoot the homepage hero reel from the live sites
   ============================================================================
   Usage:  node scripts/capture-reel.mjs            (every site)
           node scripts/capture-reel.mjs mas-monograms reid-design

   For each site in src/data/reel.ts it opens the live homepage twice (1440
   wide and 390 wide), walks down the page so lazy images and scroll reveals
   load, then saves the top of the page, cropped to the reel's card shape:

     src/assets/reel/{slug}-desktop.jpg   600 x 1240
     src/assets/reel/{slug}-phone.jpg     300 x 840

   Reduced motion is on while shooting, so entrance animations are already
   finished. Astro turns these JPGs into small WebP files at build time; the
   JPGs are just high-quality sources. Look at each one before committing:
   a cookie banner or a half-loaded hero is easy to miss.
   ============================================================================ */

import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = `${root}src/assets/reel`;
mkdirSync(outDir, { recursive: true });

// Read the site list straight out of the TypeScript data file (slug + url
// pairs), so there is one list to edit, not two.
const source = readFileSync(`${root}src/data/reel.ts`, 'utf8');
const sites = [...source.matchAll(/slug: '([^']+)',[^}]*?url: '([^']+)'/gs)].map((m) => ({
  slug: m[1],
  url: m[2],
}));
const only = process.argv.slice(2);
const todo = only.length ? sites.filter((s) => only.includes(s.slug)) : sites;

// The two shapes. `scale` is the device pixel ratio the page renders at, so
// the phone capture stays sharp after it is cut down to 300 wide.
const shapes = [
  { kind: 'desktop', viewport: { width: 1440, height: 900 }, scale: 1, out: [600, 1240] },
  { kind: 'phone', viewport: { width: 390, height: 844 }, scale: 2, out: [300, 840] },
];

const browser = await chromium.launch();
for (const site of todo) {
  for (const shape of shapes) {
    const context = await browser.newContext({
      viewport: shape.viewport,
      deviceScaleFactor: shape.scale,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    try {
      await page.goto(site.url, { waitUntil: 'networkidle', timeout: 60_000 });
      // Walk the page so lazy images and reveal-on-scroll sections load.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 500) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1500);
      const shot = await page.screenshot({ fullPage: true });
      const [w, h] = shape.out;
      const file = `${outDir}/${site.slug}-${shape.kind}.jpg`;
      // Resize to the card width, then keep the top of the page at card height.
      await sharp(shot)
        .resize({ width: w })
        .toBuffer()
        .then((b) =>
          sharp(b)
            .extract({ left: 0, top: 0, width: w, height: h })
            .jpeg({ quality: 88, mozjpeg: true })
            .toFile(file),
        );
      console.log(`saved ${file}`);
    } catch (err) {
      console.log(`FAILED ${site.slug} ${shape.kind}: ${String(err).split('\n')[0]}`);
    }
    await context.close();
  }
}
await browser.close();
