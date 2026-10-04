// Capture the homepage hero reel frames: real browser viewports of the live client sites.
//
//   node scripts/brand/capture-home-reel.mjs            # every frame
//   node scripts/brand/capture-home-reel.mjs ss-home    # one frame
//
// Desktop: a 1200x750 viewport at DPR 2, saved 2000 px wide. Phone: a 390x844 viewport at
// DPR 3, the top 390x488 kept, saved 1170 px wide. Both are WebP masters in
// src/assets/home/reel/; Astro's image pipeline makes the AVIF and WebP sizes at build time.
//
// Screenshots age as clients edit their sites, so re-run this before a release that
// features the reel (about two minutes). FBCM is captured from its workers.dev preview,
// never from www.fbcmuncie.org (still the old Wix site). Read-only: it only loads pages.
// From the d7a mock-up's _capture/capture.mjs (docs/redesign-2026/mockups/).
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = path.join(root, 'src', 'assets', 'home', 'reel');
fs.mkdirSync(out, { recursive: true });

const FBCM = 'https://fbcm-site.nathanjnixon86.workers.dev/';
const frames = [
  { id: 'frt-home', url: 'https://foundationrt.org/' },
  { id: 'frt-res', url: 'https://foundationrt.org/resources/' },
  { id: 'tm-home', url: 'https://theologymatters.com/' },
  {
    id: 'tm-article',
    url: 'https://theologymatters.com/articles/the-nicene-creed-in-historical-context/',
  },
  { id: 'ss-home', url: 'https://stonesteps50k.com/' },
  { id: 'ss-records', url: 'https://stonesteps50k.com/records' },
  { id: 'mas-home', url: 'https://mas-monograms.com/' },
  { id: 'mas-about', url: 'https://mas-monograms.com/about' },
  { id: 'fbcm-home', url: FBCM },
  // the hymn-board band: Sunday times, photos in the church's own arches
  { id: 'fbcm-expect', url: FBCM, heading: 'What to Expect', lead: { d: 70, m: 330 } },
];
const only = process.argv[2];

const browser = await chromium.launch();
async function shot(f, desk) {
  const ctx = await browser.newContext({
    viewport: desk ? { width: 1200, height: 750 } : { width: 390, height: 844 },
    deviceScaleFactor: desk ? 2 : 3,
    reducedMotion: 'reduce',
    isMobile: !desk,
    hasTouch: !desk,
    userAgent: desk
      ? undefined
      : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();
  await page.goto(f.url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  // let lazy images in the first screen settle, then go to the frame's spot
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(600);
  await page.evaluate(
    ([t, lead]) => {
      if (!t) return window.scrollTo(0, 0);
      const h = [...document.querySelectorAll('h2')].find((e) => e.textContent.includes(t));
      const sec = h.closest('section') || h;
      window.scrollTo(0, sec.getBoundingClientRect().top + scrollY + lead);
    },
    [f.heading, f.lead ? f.lead[desk ? 'd' : 'm'] : 0],
  );
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(1800);
  const buf = await page.screenshot({
    clip: desk ? { x: 0, y: 0, width: 1200, height: 750 } : { x: 0, y: 0, width: 390, height: 488 },
  });
  await ctx.close();
  return buf;
}

for (const f of frames) {
  if (only && f.id !== only) continue;
  const d = await shot(f, true);
  const m = await shot(f, false);
  const dOut = await sharp(d).resize({ width: 2000 }).webp({ quality: 82, effort: 6 }).toBuffer();
  const mOut = await sharp(m).webp({ quality: 80, effort: 6 }).toBuffer();
  fs.writeFileSync(path.join(out, `${f.id}-d.webp`), dOut);
  fs.writeFileSync(path.join(out, `${f.id}-m.webp`), mOut);
  console.log(
    f.id,
    (dOut.length / 1024).toFixed(0),
    'KB desktop,',
    (mOut.length / 1024).toFixed(0),
    'KB phone',
  );
}
await browser.close();
