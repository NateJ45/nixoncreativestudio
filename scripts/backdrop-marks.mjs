// Safe to run any time: `npm run backdrop-marks`, then `npm run halftones`.
/* ============================================================================
   backdrop-marks.mjs: one bold mark per case study, for the hero's halftone
   ============================================================================
   The hero of /work/<slug>/ carries a halftone of the study's `backdrop`
   (scripts/halftones.mjs, .s-bg in study.css). Until 2026-11-15 every backdrop
   was a capture of a section of the client's site, and a capture of a web page
   came out as ragged fog: the dots only show round the edge of the laptop and
   phone (the windows cover the middle, the words fade the left), at a fifth
   of full strength, so cards and lines of text could never be read as anything.

   So the backdrop is now one flat shape the client's own people know, white on
   black, drawn big and to the right so it spills out round the windows:

     west-chester-preschool             the logo's sun and its rays
     reid-design                        the RD emblem in its ring, with the sprig
     first-baptist-muncie               the bell tower from the logo
     first-presbyterian-orangeburg      the cross that is the T of "First"
     foundation-for-reformed-theology   the serif R of "Reformed"
     mas-monograms                      an embroidery hoop (their hero), drawn here
     theology-matters                   the italic T of the wordmark
     presbyterian-academy               the italic A of "Academy"

   Stone Steps 50K is not here: its backdrop is the race site's elevation chart,
   shot by capture-backdrop.mjs (its words hidden), because the course line is
   its mark.

   Each mark is the logo's own ink (its transparency), so colours in the logo do
   not matter: the halftone paints the client's paper on their accent. A crop is
   in the logo file's own pixels (an SVG's at 300 dpi); `h` is the mark's height
   and `at` its middle, both on a 1440 x 900 frame, which is written at 2x.
   Anything outside the frame is cut off on purpose.

   Writes src/assets/case-studies/backdrops/<slug>.webp. Run halftones after it,
   look at every hero at 1440 and 390, and commit both outputs.
   ============================================================================ */

import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const logos = `${root}src/assets/clients/`;
const outDir = `${root}src/assets/case-studies/backdrops/`;
const W = 1440;
const H = 900;
const X = 2;

// The hoop from MAS's own hero, as a ring with its clasp on top.
const hoop = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1080">' +
    '<circle cx="500" cy="580" r="420" fill="none" stroke="#fff" stroke-width="110"/>' +
    '<rect x="455" y="40" width="90" height="110" rx="14" fill="#fff"/></svg>',
);

const MARKS = {
  'west-chester-preschool': {
    file: 'west-chester-preschool.webp',
    crop: [250, 0, 850, 560],
    h: 820,
    at: [1080, 430],
  },
  'reid-design': { file: 'reid-design.png', crop: [120, 0, 800, 740], h: 1050, at: [1100, 470] },
  'first-baptist-muncie': {
    file: 'first-baptist-muncie.svg',
    crop: [285, 0, 280, 404],
    h: 1100,
    at: [1250, 590],
  },
  'first-presbyterian-orangeburg': {
    file: 'first-presbyterian-orangeburg.png',
    crop: [245, 0, 69, 112],
    h: 1000,
    at: [1230, 560],
  },
  'foundation-for-reformed-theology': {
    file: 'foundation-for-reformed-theology.png',
    crop: [0, 0, 70, 86],
    h: 1100,
    at: [1150, 470],
  },
  'mas-monograms': { svg: hoop, crop: [0, 0, 1000, 1080], h: 760, at: [1150, 440] },
  'theology-matters': {
    file: 'theology-matters.svg',
    crop: [0, 0, 1262, 1375],
    h: 1100,
    at: [1150, 470],
  },
  'presbyterian-academy': {
    file: 'presbyterian-academy.png',
    crop: [1240, 0, 108, 160],
    h: 1050,
    at: [1150, 470],
  },
};

async function mark({ file, svg, crop, h, at }) {
  // An SVG logo is drawn at 600 dpi so the mark stays crisp at its size; its crop is given at 300.
  const vector = !svg && file.endsWith('.svg');
  const src = svg ?? `${logos}${file}`;
  const k = vector ? 2 : 1;
  const [l, t, w, ch] = crop.map((v) => Math.round(v * k));
  const ink = await sharp(src, vector ? { density: 600 } : {})
    .extract({ left: l, top: t, width: w, height: ch })
    .ensureAlpha()
    .extractChannel(3)
    .toBuffer();
  const mh = h * X;
  const mw = Math.round((crop[2] / crop[3]) * mh);
  const sized = await sharp(ink).resize(mw, mh).png().toBuffer();

  // Place it, cutting off whatever falls outside the frame.
  const left = Math.round(at[0] * X - mw / 2);
  const top = Math.round(at[1] * X - mh / 2);
  const cl = Math.max(0, -left);
  const ct = Math.max(0, -top);
  const part = await sharp(sized)
    .extract({
      left: cl,
      top: ct,
      width: Math.min(mw - cl, W * X - Math.max(0, left)),
      height: Math.min(mh - ct, H * X - Math.max(0, top)),
    })
    .toBuffer();
  return sharp({ create: { width: W * X, height: H * X, channels: 3, background: '#000' } })
    .composite([{ input: part, left: Math.max(0, left), top: Math.max(0, top) }])
    .png()
    .toBuffer();
}

for (const [slug, m] of Object.entries(MARKS)) {
  const buf = await mark(m);
  await sharp(buf).toFile(`${outDir}${slug}.webp`);
  console.log(`${slug}: ${(buf.length / 1024).toFixed(1)} KB`);
}
