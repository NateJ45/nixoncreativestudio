// Safe to edit.
/* ============================================================================
   capture-case-study.mjs: re-shoot a case study's captures from the live site
   ============================================================================
   Usage:  node scripts/capture-case-study.mjs presbyterian-academy
           node scripts/capture-case-study.mjs first-baptist-muncie theology-matters

   A slug is required: re-capturing a client's site is a courtesy call made one
   client at a time, so there is no "do them all" default.

   For each slug it reads `liveUrl` from src/content/case-studies/{slug}.mdx,
   opens that homepage, walks down the page so lazy images and scroll reveals
   load, and saves three files:

     src/assets/case-studies/{slug}.png               1440 x 1080   cover (first viewport)
     src/assets/case-studies/shots/{slug}-home.png    1440 wide     full page (SiteShowcase, SelectedWork)
     src/assets/case-studies/shots/{slug}-mobile.png  560 wide      top 4000px of the page

   Reduced motion is on while shooting, so entrance animations are finished.
   Lazy images are forced to eager (data-src and data-srcset swapped in too)
   and the script waits until every image reports complete, which is what
   kept the June 2026 re-capture from coming out half blank.

   Feature shots ({slug}-feature-*.png) and before shots are NOT touched: each
   one frames a specific part of a page and is cropped by hand.

   Look at every file before committing: a cookie banner, a chat bubble or a
   half-loaded hero is easy to miss. Never commit a capture of a page that is
   not the client's live, public site (CLAUDE.md never-break rule 9).
   ============================================================================ */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.error('Name at least one case study slug, e.g. presbyterian-academy');
  process.exit(1);
}

// The three shapes. `fullPage: false` keeps only the first viewport; `maxHeight`
// trims a full-page capture to its top N pixels (the mobile showcase never
// scrolls further than that).
const shapes = [
  {
    kind: 'cover',
    viewport: { width: 1440, height: 1080 },
    fullPage: false,
    file: (slug) => `${root}src/assets/case-studies/${slug}.png`,
  },
  {
    kind: 'home',
    viewport: { width: 1440, height: 900 },
    fullPage: true,
    file: (slug) => `${root}src/assets/case-studies/shots/${slug}-home.png`,
  },
  {
    kind: 'mobile',
    viewport: { width: 560, height: 900 },
    fullPage: true,
    maxHeight: 4000,
    file: (slug) => `${root}src/assets/case-studies/shots/${slug}-mobile.png`,
  },
];

/** Pull `liveUrl:` out of the study's frontmatter. */
function liveUrlFor(slug) {
  const mdx = readFileSync(`${root}src/content/case-studies/${slug}.mdx`, 'utf8');
  const match = mdx.match(/^liveUrl:\s*(\S+)\s*$/m);
  if (!match) throw new Error(`${slug}.mdx has no liveUrl`);
  return match[1];
}

const browser = await chromium.launch();
let failed = false;
for (const slug of slugs) {
  const url = liveUrlFor(slug);
  for (const shape of shapes) {
    const context = await browser.newContext({
      viewport: shape.viewport,
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
      // Force every lazy image to load now, then walk the page slowly so
      // IntersectionObserver reveals fire, then wait for every image.
      await page.evaluate(async () => {
        for (const img of document.querySelectorAll('img')) {
          img.loading = 'eager';
          if (img.dataset.src) img.src = img.dataset.src;
          if (img.dataset.srcset) img.srcset = img.dataset.srcset;
        }
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 150));
        }
        window.scrollTo(0, 0);
        const deadline = Date.now() + 15_000;
        while (Date.now() < deadline && [...document.images].some((i) => !i.complete)) {
          await new Promise((r) => setTimeout(r, 200));
        }
      });
      await page.waitForTimeout(1500);
      let shot = await page.screenshot({ fullPage: shape.fullPage });
      if (shape.maxHeight) {
        const { width, height } = await sharp(shot).metadata();
        if (height > shape.maxHeight) {
          shot = await sharp(shot)
            .extract({ left: 0, top: 0, width, height: shape.maxHeight })
            .toBuffer();
        }
      }
      const file = shape.file(slug);
      await sharp(shot).png({ compressionLevel: 9 }).toFile(file);
      const { width, height } = await sharp(file).metadata();
      console.log(`saved ${file} (${width} x ${height})`);
    } catch (err) {
      failed = true;
      console.log(`FAILED ${slug} ${shape.kind}: ${String(err).split('\n')[0]}`);
    }
    await context.close();
  }
}
await browser.close();
if (failed) process.exit(1);
