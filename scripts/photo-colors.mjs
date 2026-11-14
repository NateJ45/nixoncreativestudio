// Safe to run any time: `npm run photo-colors`.
/* ============================================================================
   One colour per photo, for the light table (/photography)
   ============================================================================
   The table washes toward the colour of the print in its middle, and an open
   print develops in from its own colour. Working that colour out in the
   browser would mean reading pixels off every image, so it is done here, once,
   and kept in src/data/photo-colors.json (slug -> "#rrggbb").

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

const colors = {};
for (const file of readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()) {
  const entry = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
  colors[file.replace(/\.json$/, '')] = await colorOf(fileURLToPath(new URL(entry.image, dir)));
}

writeFileSync(out, JSON.stringify(colors, null, 2) + '\n');
console.log(
  `photo-colors: wrote ${Object.keys(colors).length} colours to src/data/photo-colors.json`,
);
