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
   are five colours that are really in the photo, largest area first and
   always including the colour you notice, for the typed card in the full view.

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

/* Five colours that are really in the photo, picked the way an eye picks them.

   Everything happens in OKLab, a colour space where equal distances look like equal differences,
   so "close" and "far" mean what a viewer would say they mean.

   1. Dominant tones. The pixels of a small copy are grouped (k-means, eight groups, started from
      the fullest cells of a coarse OKLab grid, so there is no randomness and a rerun gives the
      same answer). Each group's average is a candidate, with the share of the frame it covers.
   2. The colour you notice. Among clearly coloured pixels (chroma at least 0.08), the hues are
      put in 18 slices; the slice that scores highest on chroma times area wins, provided it
      covers at least 1.5% of the frame, so a red shirt counts and a few red specks do not. Its
      swatch is the average of those pixels. A black and white photo has no such slice, and its
      five stay neutral.
   3. That colour goes in first (when there is one), then the dominant tones from the largest
      down, each only if it is at least 0.09 from every swatch already taken, so no two are near
      duplicates. If the frame has too few distinct colours the distance halves until five are
      found; a flat frame repeats what it has.
   4. The five are written largest area first. */
const toLinear = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const toByte = (c) => {
  // Linear light back to sRGB, clamped: a group's average can sit just outside the gamut.
  c = Math.max(0, c);
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, v * 255));
};
function oklab(r, g, b) {
  const R = toLinear(r),
    G = toLinear(g),
    B = toLinear(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function toHex([L, A, B]) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return '#' + rgb.map((c) => hex(toByte(c))).join('');
}
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const mean = (sum, n) => [sum[0] / n, sum[1] / n, sum[2] / n];

async function swatchesOf(file) {
  const { data, info } = await sharp(file)
    .resize(96, 96, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = [];
  for (let i = 0; i < data.length; i += info.channels)
    px.push(oklab(data[i], data[i + 1], data[i + 2]));
  const total = px.length;

  // 1. Dominant tones: k-means seeded from the fullest cells of a coarse grid.
  const cells = new Map();
  px.forEach((p, i) => {
    const key = `${Math.floor(p[0] / 0.1)},${Math.floor(p[1] / 0.05)},${Math.floor(p[2] / 0.05)}`;
    const c = cells.get(key) ?? { n: 0, sum: [0, 0, 0], first: i };
    c.n++;
    c.sum[0] += p[0];
    c.sum[1] += p[1];
    c.sum[2] += p[2];
    cells.set(key, c);
  });
  let centres = [...cells.values()]
    .sort((a, b) => b.n - a.n || a.first - b.first)
    .slice(0, 8)
    .map((c) => mean(c.sum, c.n));
  let groups = [];
  for (let round = 0; round < 10; round++) {
    groups = centres.map(() => ({ n: 0, sum: [0, 0, 0] }));
    for (const p of px) {
      let best = 0;
      for (let k = 1; k < centres.length; k++)
        if (dist(p, centres[k]) < dist(p, centres[best])) best = k;
      const g = groups[best];
      g.n++;
      g.sum[0] += p[0];
      g.sum[1] += p[1];
      g.sum[2] += p[2];
    }
    centres = groups.map((g, k) => (g.n ? mean(g.sum, g.n) : centres[k]));
  }
  const tones = groups
    .map((g, k) => ({ lab: centres[k], area: g.n / total }))
    .filter((t) => t.area > 0)
    .sort((a, b) => b.area - a.area);

  // 2. The colour you notice: the hue slice with the most chroma times area.
  const slices = Array.from({ length: 18 }, () => ({ n: 0, score: 0, sum: [0, 0, 0] }));
  for (const p of px) {
    const C = Math.hypot(p[1], p[2]);
    if (C < 0.08) continue;
    const h = (Math.atan2(p[2], p[1]) / (Math.PI * 2) + 1) % 1;
    const s = slices[Math.floor(h * 18) % 18];
    s.n++;
    s.score += C;
    s.sum[0] += p[0];
    s.sum[1] += p[1];
    s.sum[2] += p[2];
  }
  const loud = slices.filter((s) => s.n / total >= 0.015).sort((a, b) => b.score - a.score)[0];

  // 3. That colour first, then the tones, never two close together.
  const start = loud ? [{ lab: mean(loud.sum, loud.n), area: loud.n / total }] : [];
  let picked = start;
  for (let apart = 0.09; apart > 0.005; apart /= 2) {
    picked = [...start];
    for (const t of tones) {
      if (picked.length === 5) break;
      if (picked.every((q) => dist(q.lab, t.lab) >= apart)) picked.push(t);
    }
    if (picked.length === 5) break;
  }
  // A flat frame cannot give five: repeat what there is.
  while (picked.length < 5) picked.push(picked[picked.length - 1]);

  // 4. Largest area first.
  return picked
    .map((q, i) => ({ ...q, i }))
    .sort((a, b) => b.area - a.area || a.i - b.i)
    .map((q) => toHex(q.lab));
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
