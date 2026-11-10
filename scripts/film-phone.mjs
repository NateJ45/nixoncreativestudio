#!/usr/bin/env node
/* Film a client site's phone footage: public/assets/{slug}-m.mp4, the clip a phone window plays.

     node scripts/film-phone.mjs <slug> <url> --to "Text near the lowest point"
     node scripts/film-phone.mjs <slug> <url> --depth 2400

   Eight seconds at 60 frames a second, 584 by 1138: the page glides from the top down to a chosen
   point and back, so the clip loops. It is filmed one frame at a time (set the scroll position, let
   the page settle, take a picture), so no frame is ever dropped and the result is the same on any
   machine. The pictures go straight into ffmpeg (a dev-time tool, like capture-clips.mjs).

   --to     the scroll stops with this text about a quarter of the way down the screen
   --depth  or give the lowest scroll position in CSS pixels
   --out    write somewhere other than public/assets (for a look before replacing a clip)
   --hide   a CSS selector to hide while filming (a chat bubble, a cookie bar)
   --click  a CSS selector to click once before filming (the close button of a bar a visitor would
            dismiss, so the page lays itself out as it does after that)

   Each frame waits for the page to finish reacting to the scroll before the picture. The first
   Theology Matters clip was filmed without that wait and caught its back-to-top button half way
   through fading on nearly every frame, so the button blinked in the footage (found 2026-11-10).
   After filming, play the clip and watch anything fixed to the screen. */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? undefined : args.splice(i, 2)[1];
};
const to = flag('to');
const depthArg = flag('depth');
const outDir = flag('out');
const hide = flag('hide');
const click = flag('click');
const [slug, url] = args;
if (!slug || !url || (!to && !depthArg)) {
  console.error('usage: node scripts/film-phone.mjs <slug> <url> (--to "text" | --depth px)');
  process.exit(1);
}

const FPS = 60;
const SECONDS = 8;
const FRAMES = FPS * SECONDS;
const VIEW = { width: 390, height: 760 };
const SIZE = { width: 584, height: 1138 };
/* Long enough for a 0.3s fade to finish, so a fixed button is either there or not in a frame. */
const SETTLE_MS = 380;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(outDir ?? join(root, 'public', 'assets'), `${slug}-m.mp4`);
mkdirSync(dirname(out), { recursive: true });
const ffmpeg = process.env.FFMPEG || 'ffmpeg';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle' });
if (hide) await page.addStyleTag({ content: `${hide}{display:none!important}` });

/* Walk the page once so lazy images have loaded before any frame is taken. */
await page.evaluate(async () => {
  for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
    window.scrollTo({ top: y, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
});
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1200);
/* After the walk, because a bar that slides in on scroll is not there to close before it. */
if (click) {
  await page.locator(click).first().click();
  /* Off to a corner, or whatever now sits under the pointer films in its hover colour. */
  await page.mouse.move(1, 1);
  await page.waitForTimeout(600);
}

let depth = Number(depthArg);
if (to) {
  const top = await page
    .getByText(to, { exact: false })
    .first()
    .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  depth = Math.round(top - VIEW.height / 4);
}
const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
depth = Math.max(0, Math.min(depth, max));
console.log(`[film-phone] ${slug}: gliding down ${depth}px and back, ${FRAMES} frames`);

const enc = spawn(
  ffmpeg,
  [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'image2pipe',
    '-framerate',
    String(FPS),
    '-c:v',
    'mjpeg',
    '-i',
    '-',
    '-vf',
    `scale=${SIZE.width}:${SIZE.height}:flags=lanczos`,
    '-c:v',
    'libx264',
    '-profile:v',
    'high',
    '-preset',
    'slow',
    '-crf',
    '30',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-an',
    out,
  ],
  { stdio: ['pipe', 'inherit', 'inherit'] },
);

let at = -1;
for (let i = 0; i < FRAMES; i++) {
  /* Down and back on one cosine, so the turn at the bottom and the loop at the top are both soft. */
  const y = Math.round((depth * (1 - Math.cos((2 * Math.PI * i) / FRAMES))) / 2);
  if (y !== at) {
    at = y;
    await page.evaluate(async (top) => {
      window.scrollTo({ top, behavior: 'instant' });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, y);
    /* A frame near a turn moves a pixel or two: the page still gets its time to settle, so a
       button that has just been told to show has finished showing. */
    await page.waitForTimeout(SETTLE_MS);
  }
  const shot = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!enc.stdin.write(shot)) await once(enc.stdin, 'drain');
  if (i % 60 === 59) console.log(`[film-phone] ${i + 1}/${FRAMES}`);
}
enc.stdin.end();
const [code] = await once(enc, 'close');
await browser.close();
if (code !== 0) {
  console.error(`[film-phone] ffmpeg failed (${code})`);
  process.exit(1);
}
console.log(`[film-phone] wrote ${out} (${Math.round(statSync(out).size / 1024)} KB)`);
