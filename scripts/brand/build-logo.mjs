// Foundation, edit with care.
// =============================================================================
// Logo assets: copies the official lockup into src/assets/brand/ for
// src/components/Logo.astro.
//
//   node scripts/brand/build-logo.mjs
//
// Sources (docs/redesign-2026/brand/):
//   logo-navy.png, logo-white.png  the raster masters, 1423 x 361. Source of
//                                  truth for the artwork.
//   logo.svg, logo-white.svg,      the vector rebuild (Bebas outlines fitted to
//   logo-mark-top.svg              the PNG; see LOGO-NOTES.md). Optional: copied
//                                  when present.
//
// Outputs (src/assets/brand/):
//   logo-{navy,white}.svg, logo-top-{navy,white}.svg   from the vector set
//   logo-{navy,white}-640.webp                         full lockup, 2x of the
//                                                      largest header width
//   logo-top-{navy,white}-440.webp                     the top line only
//
// The WebPs follow the d9 study's method: the artwork is one flat colour over
// soft anti-aliased alpha, so RGB under the alpha is set to that exact colour
// and alpha is stepped to 32 levels (invisible, far fewer bytes), lossless.
// No recolouring and no redraw. Logo.astro picks SVG or WebP with one constant.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, sharp } from './lib.mjs';

const BRAND = path.join(ROOT, 'docs', 'redesign-2026', 'brand');
const OUT = path.join(ROOT, 'src', 'assets', 'brand');
fs.mkdirSync(OUT, { recursive: true });

const COLOURS = { navy: [10, 22, 40], white: [255, 255, 255] };
const step = (a) => Math.min(255, Math.round(Math.round(a / 8.226) * 8.226));

for (const [name, col] of Object.entries(COLOURS)) {
  const src = path.join(BRAND, `logo-${name}.png`);
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // The top line (NIXON CREATIVE STUDIO) ends at the first empty row after the caps.
  let topEnd = 0;
  for (let y = 40; y < info.height && !topEnd; y++) {
    let n = 0;
    for (let x = 0; x < info.width; x++) if (data[4 * (y * info.width + x) + 3] > 0) n++;
    if (n === 0) topEnd = y;
  }
  const enc = async (img, width, file) => {
    const { data: d, info: i2 } = await img
      .resize({ width })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 0; i < d.length; i += 4) {
      d[i] = col[0];
      d[i + 1] = col[1];
      d[i + 2] = col[2];
      d[i + 3] = step(d[i + 3]);
    }
    const out = path.join(OUT, file);
    await sharp(d, { raw: { width: i2.width, height: i2.height, channels: 4 } })
      .webp({ lossless: true, effort: 6 })
      .toFile(out);
    console.log(file, `${i2.width}x${i2.height}`, (fs.statSync(out).size / 1024).toFixed(1), 'KB');
  };
  await enc(sharp(src), 640, `logo-${name}-640.webp`);
  const top = await sharp(src)
    .extract({ left: 0, top: 0, width: info.width, height: topEnd })
    .png()
    .toBuffer();
  await enc(sharp(top), 440, `logo-top-${name}-440.webp`);
}

// The vector set, when the rebuild exists. logo.svg renders navy as an <img>.
const vectors = [
  ['logo.svg', 'logo-navy.svg'],
  ['logo-white.svg', 'logo-white.svg'],
  ['logo-mark-top.svg', 'logo-top-navy.svg'],
];
for (const [from, to] of vectors) {
  const src = path.join(BRAND, from);
  if (!fs.existsSync(src)) {
    console.log(`(no ${from} yet; Logo.astro stays on the WebP)`);
    continue;
  }
  fs.copyFileSync(src, path.join(OUT, to));
  console.log(to, (fs.statSync(src).size / 1024).toFixed(1), 'KB');
}
// White top line: the mark-top file is navy by default; derive a white copy by
// swapping its default colour (it paints with currentColor from --logo-color).
const topSrc = path.join(BRAND, 'logo-mark-top.svg');
if (fs.existsSync(topSrc)) {
  const svg = fs.readFileSync(topSrc, 'utf8').replace('var(--logo-color,#0a1628)', '#ffffff');
  fs.writeFileSync(path.join(OUT, 'logo-top-white.svg'), svg);
  console.log('logo-top-white.svg (derived)');
}
