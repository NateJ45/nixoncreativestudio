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
   Add --wix for a Wix site (Orangeburg): its hero video only shows with
   motion allowed, and its map only paints in a real tall viewport:
           node scripts/capture-case-study.mjs first-presbyterian-orangeburg --wix
   The mobile shape sends a phone user agent, so Wix serves its phone layout.
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
// --wix is for Wix sites (Orangeburg). It does two things a normal site must
// not get: it shoots with motion allowed (Wix hides its hero video under
// reduced motion, leaving a flat grey box), and it shoots the phone shape
// with a viewport as tall as the capture instead of fullPage (a phone-mode
// full-page shot leaves Wix's embedded map blank). A normal site keeps
// fullPage, because a tall viewport would stretch a 100vh hero to 4000px.
const wix = process.argv.includes('--wix');
const slugs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
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
    // A phone user agent, so hosts that pick a layout by device (Wix) serve
    // their phone layout instead of the 980px desktop page.
    phone: true,
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
      // The phone shape renders at 2x and is resized back to its viewport
      // width below, so a host that lays out at 320 (Wix) still comes out
      // sharp at 560 wide.
      deviceScaleFactor: shape.phone ? 2 : 1,
      reducedMotion: wix ? 'no-preference' : 'reduce',
      ...(shape.phone && {
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      }),
    });
    const page = await context.newPage();
    try {
      // Wait for the load event, then give the network up to 15s to go quiet.
      // Some hosts (Wix) keep a connection open forever, so a hard
      // 'networkidle' wait would time out on them every time.
      await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      // Force every lazy image to load now, then walk the page slowly so
      // IntersectionObserver reveals fire, then wait for every image.
      await page.evaluate(async () => {
        for (const frame of document.querySelectorAll('iframe')) frame.loading = 'eager';
        for (const img of document.querySelectorAll('img')) {
          img.loading = 'eager';
          if (img.dataset.src) img.src = img.dataset.src;
          if (img.dataset.srcset) img.srcset = img.dataset.srcset;
        }
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 150));
        }
        // Embedded maps start drawing only once they are on screen, so stop
        // at each iframe long enough for it to paint.
        for (const frame of document.querySelectorAll('iframe')) {
          frame.scrollIntoView({ block: 'center' });
          await new Promise((r) => setTimeout(r, 2500));
        }
        window.scrollTo(0, 0);
        const deadline = Date.now() + 15_000;
        while (Date.now() < deadline && [...document.images].some((i) => !i.complete)) {
          await new Promise((r) => setTimeout(r, 200));
        }
      });
      // Embedded maps and videos are lazy iframes; give them time to load.
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
      // Hide small floating widgets (chat bubbles, back-to-top buttons):
      // they are not the client's page, and on a full-page capture they
      // land in the middle of the content.
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('body *')) {
          const pos = getComputedStyle(el).position;
          if (pos !== 'fixed') continue;
          const r = el.getBoundingClientRect();
          if (r.width && r.width < 120 && r.height < 120) el.style.visibility = 'hidden';
        }
      });
      await page.waitForTimeout(1500);
      // --wix: grow the real phone viewport to the capture height instead of
      // using fullPage, so the embedded map paints (see the note at the top).
      const tall = wix && shape.phone;
      if (tall) {
        const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({
          width: shape.viewport.width,
          height: Math.min(pageHeight, shape.maxHeight),
        });
        await page.waitForTimeout(3000);
      }
      let shot = await page.screenshot({ fullPage: shape.fullPage && !tall });
      if (shape.phone) {
        shot = await sharp(shot).resize({ width: shape.viewport.width }).toBuffer();
      }
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
