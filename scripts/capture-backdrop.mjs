// Safe to edit.
/* ============================================================================
   capture-backdrop.mjs: shoot a case study's hero backdrop at 2x
   ============================================================================
   Usage:  node scripts/capture-backdrop.mjs theology-matters
           node scripts/capture-backdrop.mjs theology-matters reid-design
           node scripts/capture-backdrop.mjs theology-matters --out=<folder>

   The hero backdrop (frontmatter `backdrop`) is stretched edge to edge, so on
   a 1440p or 4K screen it is drawn 2500px wide or more. The hand-cropped
   feature shots are only 1440 x 900, which read as blurry and blocky at that
   size. This script re-shoots the same view from the client's live site at
   deviceScaleFactor 2, giving a 2880 x 1800 source that Astro then serves
   at the widths the screen asks for.

   Each slug's view lives in VIEWS below: the page, a piece of text to find,
   and where that text's top should sit in the 900px-tall window. Change the
   `y` to nudge the framing. Saves src/assets/case-studies/backdrops/{slug}.webp
   (or into --out, to look before overwriting).

   A slug is required: one client at a time, as with capture-case-study.mjs.
   Look at every file before committing (cookie bars, chat bubbles, a
   half-loaded image), and never commit a capture of anything but the client's
   live, public site.
   ============================================================================ */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const VIEWS = {
  'first-baptist-muncie': {
    url: 'https://www.fbcmuncie.org/architecture/',
    text: 'Four things to look for',
    y: 190,
  },
  'first-presbyterian-orangeburg': {
    url: 'https://www.1stpresbyterian.org/what-to-expect',
    text: 'What to Expect on Sunday',
    y: 250,
    motion: true,
  },
  'foundation-for-reformed-theology': {
    url: 'https://foundationrt.org/seminars/',
    text: 'Our Seminars',
    y: 197,
  },
  'mas-monograms': {
    url: 'https://mas-monograms.com/style-gallery/',
    text: 'Matching set',
    y: 475,
  },
  'presbyterian-academy': {
    url: 'https://www.presbyterianacademy.org/courses/',
    text: 'New to the Academy',
    y: 156,
  },
  'reid-design': { url: 'https://reiddesignllc.com/', text: 'Concept room', y: 175 },
  'stone-steps-50k': {
    url: 'https://stonesteps50k.com/course/',
    text: 'Fly the course',
    y: 680,
    hideHeader: true,
  },
  'theology-matters': {
    url: 'https://theologymatters.com/print-edition/',
    text: 'Send me the journal',
    y: 108,
  },
  'west-chester-preschool': {
    url: 'https://www.westchesterpreschool.org/',
    text: 'What a year at WCP gives your child',
    y: 50,
    hideHeader: true,
  },
};

const root = fileURLToPath(new URL('..', import.meta.url));
const outArg = process.argv.find((a) => a.startsWith('--out='));
const outDir = outArg ? outArg.slice(6) : `${root}src/assets/case-studies/backdrops`;
const slugs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!slugs.length) {
  console.error(`Name at least one slug: ${Object.keys(VIEWS).join(', ')}`);
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
for (const slug of slugs) {
  const v = VIEWS[slug];
  if (!v) {
    console.error(`No view for ${slug}. Add one to VIEWS.`);
    continue;
  }
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: v.motion ? 'no-preference' : 'reduce',
  });
  await page.goto(v.url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

  // Load every lazy image, as capture-case-study.mjs does.
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll('img')) {
      img.loading = 'eager';
      if (img.dataset.src) img.src = img.dataset.src;
      if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    }
    const step = innerHeight / 2;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
  });
  await page
    .waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 30000 })
    .catch(() => {});

  // Hide small fixed widgets and fixed cards low in the window; keep a sticky header.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.top > innerHeight * 0.4 || (r.width < 200 && r.height < 200))
        el.style.visibility = 'hidden';
    }
  });

  // `hideHeader` drops a fixed or sticky bar at the top, for a view framed below it.
  if (v.hideHeader) {
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('body *')) {
        const p = getComputedStyle(el).position;
        if ((p === 'fixed' || p === 'sticky') && el.getBoundingClientRect().top < 10)
          el.style.visibility = 'hidden';
      }
    });
  }

  // The first visible element whose text matches, wherever inline tags split it.
  const target = page.getByText(v.text, { exact: false });
  const count = await target.count();
  let found = false;
  for (let i = 0; i < count && !found; i++) {
    const el = target.nth(i);
    if (!(await el.isVisible())) continue;
    await el.evaluate((node, y) => {
      scrollTo(0, scrollY + node.getBoundingClientRect().top - y);
    }, v.y);
    found = true;
  }
  if (!found) console.warn(`${slug}: "${v.text}" not found, shooting from the top`);
  await page.waitForTimeout(1500);

  const png = await page.screenshot({ type: 'png' });
  const file = `${outDir}/${slug}.webp`;
  await sharp(png).webp({ quality: 82 }).toFile(file);
  const m = await sharp(file).metadata();
  console.log(`${slug}: ${m.width}x${m.height} -> ${file}`);
  await page.close();
}
await browser.close();
