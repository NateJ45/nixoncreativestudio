// Safe to edit.
/* ============================================================================
   capture-clips.mjs: record the short interaction clips for the "The idea"
   band (overhaul package 3.5)
   ============================================================================
   Local only, never in CI: it drives the clients' LIVE sites, and it needs
   ffmpeg on this machine (a dev-time tool, approved 2026-10-31; nothing of it
   ships to the browser). Set FFMPEG to its full path if it is not on PATH.

   Usage:  npm run capture:clips -- mas-monograms
           npm run capture:clips -- --all
           npm run capture:clips -- theology-matters --frames C:/some/folder

   A slug (or --all) is required. Each clip below is one scripted moment on a
   client's live, public site, 6 to 10 seconds long: typing initials into the
   MAS Monogram Studio, a search in the FRT library or the TM archive, a topic
   filter in the PA catalog. The rules every clip keeps:

     - no sign-in, no form that sends anything (a site search is fine: it is
       a GET to the client's own search page), no personal data on screen;
     - cookie bars, donation prompts, chat bubbles and back-to-top buttons are
       hidden with injected CSS before recording starts;
     - the page loads, settles and scrolls into place BEFORE the clip starts,
       so the clip is only the moment itself.

   For each clip it writes, into public/media/ (served as /media/...):

     {slug}-{name}.{hash}.mp4    H.264, for Safari and anything without VP9
     {slug}-{name}.{hash}.webm   VP9, smaller, listed first in <source>
     {slug}-{name}.{hash}.webp   the poster: the clip's last moment (the
                                 finished state reads best as a still)

   {hash} is the first 8 hex characters of the MP4's SHA-256, shared by all
   three files, so the study's `signatureClip.src` is one base path such as
   /media/mas-monograms-studio.1a2b3c4d and Clip.astro adds the extensions.
   Older files for the same {slug}-{name} are deleted, so update the study's
   frontmatter to the printed base afterwards.

   It also saves three check frames per clip (at a quarter, a half and near
   the end) to test-results/clip-frames/ (gitignored; --frames picks another
   folder). LOOK AT EVERY FRAME before committing: a cookie bar, a pop-up or
   anyone's personal details on screen means the clip does not ship.

   Every file must stay under 1.5 MB (tests/media-weight.spec.ts checks it).
   ============================================================================ */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const mediaDir = join(root, 'public', 'media');
const ffmpeg = process.env.FFMPEG || 'ffmpeg';

// The recording size. 16:10 matches the Signature band's media box, so the
// clip fills its frame with no crop.
const size = { width: 1280, height: 800 };

const args = process.argv.slice(2);
const framesAt = args.indexOf('--frames');
const framesDir = framesAt >= 0 ? args[framesAt + 1] : join(root, 'test-results', 'clip-frames');
const wanted = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--frames');

// CSS hidden on every site before recording: consent and cookie bars,
// donation prompts, chat widgets, back-to-top buttons. Per-clip `hide` adds
// more. Each line is a guess that costs nothing when it matches nothing.
const hideEverywhere = [
  '[id*="cookie" i]',
  '[class*="cookie" i]',
  '[id*="consent" i]',
  '[class*="consent" i]',
  '[aria-label="Back to top" i]',
  '[class*="back-to-top" i]',
  '[class*="backtotop" i]',
  '[id*="donatePrompt" i]',
  '[class*="donate-prompt" i]',
  'iframe[src*="chat" i]',
];

/** Small helpers the clip steps use. */
const pause = (page, ms) => page.waitForTimeout(ms);
async function scrollTo(page, selector, offset = 0) {
  await page
    .locator(selector)
    .first()
    .evaluate((el, off) => {
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off);
    }, offset);
}

/* ---- The clips -------------------------------------------------------------
   slug   the case study (src/content/case-studies/{slug}.mdx)
   name   a short word for the moment, part of the file name
   url    the live page
   hide   extra selectors to hide on this site
   setup  runs before the clip starts (scroll into place, clear a field)
   run    the clip itself; keep it 6 to 10 seconds
   alt    what the clip shows, for the study's signatureClip.alt
   ------------------------------------------------------------------------- */
const clips = [
  {
    slug: 'mas-monograms',
    name: 'studio',
    url: 'https://mas-monograms.com/',
    alt: 'Typing the initials JRN into "Try your own initials" on mas-monograms.com, and the hoop in the hero stitching them in thread, letter by letter',
    async setup(page) {
      await page.evaluate(() => window.scrollTo(0, 150));
      await page.locator('#hero-try-input').fill('');
      await pause(page, 1500);
    },
    async run(page) {
      await pause(page, 600);
      await page.locator('#hero-try-input').pressSequentially('JRN', { delay: 450 });
      await pause(page, 6000);
    },
  },
  {
    slug: 'foundation-for-reformed-theology',
    name: 'library',
    // The library's own search page, not the home page: the home hero sits
    // above a seminar photo and a named quote, which a clip should not show.
    url: 'https://foundationrt.org/?s=',
    alt: 'Searching the library on foundationrt.org for "lord\'s supper": the results open with counts per collection and the matching words highlighted in each result',
    async setup(page) {
      await page.locator('#sr-q').click();
      await pause(page, 800);
    },
    async run(page) {
      await pause(page, 500);
      await page.locator('#sr-q').first().pressSequentially("lord's supper", { delay: 110 });
      await pause(page, 700);
      await Promise.all([
        page.waitForLoadState('load'),
        page.locator('#sr-q').first().press('Enter'),
      ]);
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      await pause(page, 2200);
      await page.mouse.wheel(0, 420);
      await pause(page, 2200);
    },
  },
  {
    slug: 'theology-matters',
    name: 'archive',
    url: 'https://theologymatters.com/',
    alt: 'Searching the Theology Matters archive for "Barmen": the results list the articles and issues since 1995 that mention it',
    async setup(page) {
      await scrollTo(page, '#tm-home-find-field', 400);
      await pause(page, 1200);
    },
    async run(page) {
      await pause(page, 500);
      await page.locator('#tm-home-find-field').click();
      await page.locator('#tm-home-find-field').pressSequentially('Barmen', { delay: 140 });
      await pause(page, 700);
      await Promise.all([
        page.waitForLoadState('load'),
        page.locator('#tm-home-find-field').press('Enter'),
      ]);
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      await pause(page, 2400);
      await page.mouse.wheel(0, 380);
      await pause(page, 2400);
    },
  },
  {
    slug: 'presbyterian-academy',
    name: 'catalog',
    url: 'https://www.presbyterianacademy.org/courses/',
    alt: 'Filtering the course catalog on presbyterianacademy.org by topic: ticking Reformed Theology and then Church History narrows the ten course covers to the four that match',
    async setup(page) {
      // Pin the visible Scripture label 300px down the window on every
      // frame: filtering changes the page height, and the page scrolls with
      // it, which made the clip jump. (The first checkbox in the page is in
      // the phone filter drawer, hence :visible.) The mouse is parked off the
      // covers, because hovering a cover flips it to its syllabus.
      await page
        .locator('label:visible', { hasText: 'Scripture' })
        .first()
        .evaluate((el) => {
          const pin = () => {
            window.scrollBy({ top: el.getBoundingClientRect().top - 300, behavior: 'instant' });
            requestAnimationFrame(pin);
          };
          pin();
        });
      await page.mouse.move(150, 780);
      await pause(page, 1200);
    },
    async run(page) {
      const tick = async (text) => {
        await page.locator('label:visible', { hasText: text }).first().click();
        await page.mouse.move(150, 780);
      };
      await pause(page, 1200);
      await tick('Reformed Theology');
      await pause(page, 2600);
      await tick('Church History');
      await pause(page, 3200);
    },
  },
];

const chosen = args.includes('--all') ? clips : clips.filter((c) => wanted.includes(c.slug));
if (!chosen.length) {
  console.error(
    `Name a case study slug (or --all). Clips exist for: ${clips.map((c) => c.slug).join(', ')}`,
  );
  process.exit(1);
}

// Fail early with a clear line if ffmpeg is missing.
try {
  execFileSync(ffmpeg, ['-version'], { stdio: 'ignore' });
} catch {
  console.error(`ffmpeg not found (${ffmpeg}). Install it or set FFMPEG to its full path.`);
  process.exit(1);
}

mkdirSync(mediaDir, { recursive: true });
mkdirSync(framesDir, { recursive: true });
const run = (...a) => execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...a]);
const kb = (file) => `${Math.round(statSync(file).size / 1024)} KB`;

const browser = await chromium.launch();
let failed = false;

for (const clip of chosen) {
  const work = mkdtempSync(join(tmpdir(), 'ncs-clip-'));
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    recordVideo: { dir: work, size },
  });
  const page = await context.newPage();
  // The recording starts with the page; remember when, to trim the clip.
  const t0 = Date.now();
  const css = [...hideEverywhere, ...(clip.hide ?? [])].join(',\n');
  const hideCss = `${css} { visibility: hidden !important; }`;
  try {
    await page.goto(clip.url, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.addStyleTag({ content: hideCss });
    // A search lands on a new page: hide the same things there too.
    page.on('load', () => void page.addStyleTag({ content: hideCss }).catch(() => {}));
    await pause(page, 1500);
    await clip.setup(page);
    const start = (Date.now() - t0) / 1000;
    await clip.run(page);
    const length = (Date.now() - t0) / 1000 - start;
    const video = page.video();
    await context.close();
    const raw = await video.path();

    // Trim and encode. No audio track at all (-an): the clips are silent.
    const base = `${clip.slug}-${clip.name}`;
    const tmpMp4 = join(work, `${base}.mp4`);
    const tmpWebm = join(work, `${base}.webm`);
    const tmpPoster = join(work, `${base}.webp`);
    const trim = ['-ss', start.toFixed(2), '-t', length.toFixed(2), '-i', raw];
    run(
      ...trim,
      ...['-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p'],
      ...['-r', '25', '-movflags', '+faststart', tmpMp4],
    );
    run(
      ...trim,
      ...['-an', '-c:v', 'libvpx-vp9', '-crf', '42', '-b:v', '0', '-row-mt', '1'],
      ...['-deadline', 'good', '-cpu-used', '2', '-r', '25', tmpWebm],
    );
    // Poster: the clip's last half second, where the moment has finished.
    run(
      '-ss',
      Math.max(0, length - 0.5).toFixed(2),
      '-i',
      tmpMp4,
      '-frames:v',
      '1',
      '-c:v',
      'libwebp',
      '-quality',
      '78',
      tmpPoster,
    );

    const hash = createHash('sha256').update(readFileSync(tmpMp4)).digest('hex').slice(0, 8);
    // Drop older versions of this clip, then write the new set.
    for (const f of readdirSync(mediaDir)) {
      if (f.startsWith(`${base}.`)) rmSync(join(mediaDir, f));
    }
    const out = (ext) => join(mediaDir, `${base}.${hash}.${ext}`);
    for (const [from, ext] of [
      [tmpMp4, 'mp4'],
      [tmpWebm, 'webm'],
      [tmpPoster, 'webp'],
    ]) {
      writeFileSync(out(ext), readFileSync(from));
    }

    // Three check frames to look at by eye.
    const frames = [0.25, 0.5, 0.92].map((at, i) => {
      const file = join(framesDir, `${base}-${i + 1}.png`);
      run('-ss', (length * at).toFixed(2), '-i', out('mp4'), '-frames:v', '1', file);
      return file;
    });

    console.log(`\n${clip.slug} (${length.toFixed(1)} s)`);
    console.log(`  mp4  ${kb(out('mp4'))}, webm ${kb(out('webm'))}, poster ${kb(out('webp'))}`);
    console.log(`  frontmatter:`);
    console.log(`    signatureClip:`);
    console.log(`      src: /media/${base}.${hash}`);
    console.log(`      alt: ${JSON.stringify(clip.alt)}`);
    console.log(`  check frames:\n    ${frames.join('\n    ')}`);
  } catch (err) {
    failed = true;
    console.log(`FAILED ${clip.slug}: ${String(err).split('\n')[0]}`);
    await context.close().catch(() => {});
  }
  rmSync(work, { recursive: true, force: true });
}

await browser.close();
if (failed) process.exit(1);
