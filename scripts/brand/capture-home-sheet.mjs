// Capture the homepage proof sheet's detail frames: one section of a live client page each,
// a different crop from the hero reel's full-screen frames (the reel shows each site's
// first screen; the sheet shows a detail further in, with the fact it proves).
//
//   node scripts/brand/capture-home-sheet.mjs              # every frame
//   node scripts/brand/capture-home-sheet.mjs frt-browse   # one frame
//
// A 1200 px wide viewport at DPR 2; the frame is the bounding box of one element on the
// page (found by a heading's text or a selector), padded, saved as a WebP master (at most
// 1600 px wide) in src/assets/home/sheet/. Astro's image pipeline makes the AVIF and WebP
// sizes at build time. Read-only: it only loads public pages.
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = path.join(root, 'src', 'assets', 'home', 'sheet');
fs.mkdirSync(out, { recursive: true });

const frames = [
  // The library's two other ways in: 84 contributors, 55 subjects (counts printed on the page).
  {
    id: 'frt-browse',
    url: 'https://foundationrt.org/resources/',
    heading: 'Browse another way',
    height: 660,
    pad: { top: 28, x: 0 },
  },
  // The four-step quote path: browse, request a free quote, a price in a day, stitch.
  {
    id: 'mas-steps',
    url: 'https://mas-monograms.com/',
    heading: 'From first idea to finished piece',
    pad: { top: -40, bottom: -50 },
  },
  // The listen-along player at the head of every article.
  {
    id: 'tm-audio',
    url: 'https://theologymatters.com/articles/the-nicene-creed-in-historical-context/',
    selector: '.tm-article-audio',
    pad: { top: -20, bottom: -30, x: 40 },
    wait: 6000,
  },
];
const only = process.argv[2];

const browser = await chromium.launch();
for (const f of frames) {
  if (only && f.id !== only) continue;
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(f.url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  // Walk the page so lazy images and players load, then come back to the frame.
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < Math.min(h, 6000); y += 500) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(120);
  }
  const box = await page.evaluate(
    ([heading, selector, fixed]) => {
      let el;
      let top;
      if (selector) el = document.querySelector(selector);
      else {
        const hd = [...document.querySelectorAll('h1,h2,h3')].find((e) =>
          e.textContent.includes(heading),
        );
        el = fixed ? hd?.parentElement : hd && (hd.closest('section') || hd.parentElement);
        if (fixed && hd) top = hd;
      }
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      const t = top ? top.getBoundingClientRect().top : r.top;
      return { x: r.left, y: t + scrollY, width: r.width, height: r.height };
    },
    [f.heading, f.selector, !!f.height],
  );
  if (!box) {
    console.error(`${f.id}: element not found on ${f.url}`);
    await ctx.close();
    continue;
  }
  await page.waitForTimeout(f.wait ?? 1500);
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const pad = { top: 0, bottom: 0, x: 0, ...f.pad };
  const clip = {
    x: Math.max(0, box.x - pad.x),
    y: Math.max(0, box.y - pad.top),
    width: Math.min(1200, box.width + pad.x * 2),
    height: f.height ?? box.height + pad.top + pad.bottom,
  };
  const buf = await page.screenshot({ clip, fullPage: true });
  const file = path.join(out, `${f.id}.webp`);
  await sharp(buf)
    .resize({ width: Math.min(1600, Math.round(clip.width * 2)), withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(file);
  const m = await sharp(file).metadata();
  console.log(`${f.id}: ${m.width}x${m.height}, ${Math.round(fs.statSync(file).size / 1024)} KB`);
  await ctx.close();
}
await browser.close();
