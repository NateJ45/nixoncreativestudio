// Safe to run any time: `npm run photo-colors`.
/* ============================================================================
   Each photo's colours, for the light table (/photography)
   ============================================================================
   The table washes toward the colour of the print in its middle, and an open
   print develops in from its own colour. Working that colour out in the
   browser would mean reading pixels off every image, so it is done here, once,
   and kept in src/data/photo-colors.json:

     slug -> { "wash": "#rrggbb", "swatches": ["#rrggbb" x 5] }

   "wash" is the one colour the table and the full view tint with. "swatches"
   are five colours that are really in the photo, darkest first, for the typed
   card in the full view.

   Run it after adding or replacing a photo in src/content/photos/. The unit
   test in src/lib/photo-table.test.ts fails if a photo has no colour, so a
   forgotten run is caught before it ships.
   ============================================================================ */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const dir = new URL('../src/content/photos/', import.meta.url);
const out = new URL('../src/data/photo-colors.json', import.meta.url);

const hex = (n) => Math.round(n).toString(16).padStart(2, '0');

/* The colour a photo "is" to the eye is its strongest hue, not its commonest
   pixel (which is usually a shadow). So: shrink the photo, weigh every pixel by
   how saturated it is and how far it sits from black and white, and take the
   weighted hue. The colour is then written at one middle lightness, so every
   photo tints the table by the same amount. A black-and-white photo has no hue
   to speak of and comes out a plain grey, which leaves the table as it was. */
async function colorOf(file) {
  const { data, info } = await sharp(file)
    .resize(48, 48, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let x = 0,
    y = 0,
    weight = 0,
    sat = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i] / 255,
      g = data[i + 1] / 255,
      b = data[i + 2] / 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      l = (max + min) / 2,
      d = max - min;
    if (d < 0.02) continue;
    const s = d / (1 - Math.abs(2 * l - 1) || 1);
    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= Math.PI / 3;
    const w = s * s * (1 - Math.abs(2 * l - 1));
    x += Math.cos(h) * w;
    y += Math.sin(h) * w;
    sat += s * w;
    weight += w;
  }
  const pixels = data.length / info.channels;
  // How much of the frame carries colour at all, and how much those hues agree.
  const cover = weight / pixels;
  const agree = weight ? Math.hypot(x, y) / weight : 0;
  const s = weight ? Math.min(0.62, (sat / weight) * agree) * Math.min(1, cover * 12) : 0;
  const h = (Math.atan2(y, x) / (Math.PI * 2) + 1) % 1;
  // HSL (h, s, 0.5) to RGB.
  const q = 0.5 + 0.5 * s,
    p = 1 - q;
  const ch = (t) => {
    t = (t + 1) % 1;
    return t < 1 / 6
      ? p + (q - p) * 6 * t
      : t < 1 / 2
        ? q
        : t < 2 / 3
          ? p + (q - p) * (2 / 3 - t) * 6
          : p;
  };
  return `#${hex(ch(h + 1 / 3) * 255)}${hex(ch(h) * 255)}${hex(ch(h - 1 / 3) * 255)}`;
}

/* Five colours that are really in the photo. Every pixel of a small copy goes into a coarse bin
   (16 steps a channel); the fullest bins are the photo's main colours. The fullest is taken, then
   the next fullest that is far enough from every colour already taken, so the five are different
   colours and not five shades of the same wall. If the photo has too few distinct colours the
   distance asked for halves until five are found. Each swatch is the true average of its bin,
   and the five are written darkest first. Nothing is random, so a rerun gives the same answer. */
async function swatchesOf(file) {
  const { data, info } = await sharp(file)
    .resize(64, 64, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bins = new Map();
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0, key };
    bin.n++;
    bin.r += r;
    bin.g += g;
    bin.b += b;
    bins.set(key, bin);
  }
  const ranked = [...bins.values()]
    .map((x) => ({ n: x.n, key: x.key, r: x.r / x.n, g: x.g / x.n, b: x.b / x.n }))
    .sort((a, b) => b.n - a.n || a.key - b.key);
  const picked = [];
  for (let apart = 72; picked.length < 5 && apart >= 1; apart /= 2) {
    for (const c of ranked) {
      if (picked.length === 5) break;
      if (picked.includes(c)) continue;
      if (picked.every((p) => Math.hypot(p.r - c.r, p.g - c.g, p.b - c.b) >= apart)) picked.push(c);
    }
  }
  // A flat frame (one colour edge to edge) cannot give five: repeat what there is.
  while (picked.length < 5) picked.push(picked[picked.length - 1]);
  const light = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return picked
    .sort((a, b) => light(a) - light(b))
    .map((c) => `#${hex(c.r)}${hex(c.g)}${hex(c.b)}`);
}

const colors = {};
for (const file of readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()) {
  const entry = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
  const image = fileURLToPath(new URL(entry.image, dir));
  colors[file.replace(/\.json$/, '')] = {
    wash: await colorOf(image),
    swatches: await swatchesOf(image),
  };
}

// Written the way prettier lays it out (each photo's five swatches on one line), so a rerun leaves
// the file prettier-clean and the diff shows only colours that changed.
writeFileSync(
  out,
  JSON.stringify(colors, null, 2).replace(
    /\[\s+([^\]]*?)\s+\]/g,
    (_, inner) => `[${inner.replace(/,\s+/g, ', ')}]`,
  ) + '\n',
);
console.log(
  `photo-colors: wrote the colours of ${Object.keys(colors).length} photos to src/data/photo-colors.json`,
);
