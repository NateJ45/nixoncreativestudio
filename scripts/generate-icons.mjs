// Foundation, edit with care. Standalone generator for the favicon / app-icon
// set. Run `npm run icons` after changing brand ink, the marker colour, the
// squircle radius, or the wordmark font, then commit the outputs (they ship to
// visitors). Not part of the main build chain: the icons only change when the
// brand does, exactly like scripts/generate-og-default.mjs.
/* ============================================================================
   Favicon / app-icon generator
   ============================================================================
   The mark (redesign 2026): a single paper-coloured Bebas Neue capital "N" on the
   logo's deep ink, with one short china-marker stroke under it (the same red stroke
   that underlines the italic voice on the social cards). The logo has no separate
   mark, so this is a DERIVED mark built from the studio's initial: the N is the REAL
   Bebas glyph, pulled from the WOFF via opentype.js (the same technique as the OG
   generators), so it cannot drift from the logo's letterforms.

   Design decisions:
   - ONE self-contained look. The ink tile means the icon reads identically on light
     and dark browser chrome, so there is NO prefers-color-scheme flip (several
     browsers ignore it inside SVG favicons and it never reaches the PNG/ICO set).
   - The marker stroke is the only size-gated element: it blurs at tab size, so the 16
     and 32 px .ico entries drop it and show the paper N on ink, centred; 48 and up keep it.
   - Tokens are literal copies of DESIGN.md: ink #0A1628, paper #F3EEE4, vermilion
     marker #F2835F (the marker as it reads on ink; contrast 7.07).
   - Runs out-of-process (opentype.js + sharp) because the Cloudflare prerender
     isolate has no node built-ins; an Astro route couldn't do this.

   Outputs (all into public/):
     favicon.svg              canonical mark (squircle + N + stroke), small vector
     favicon.ico              16 + 32 (N only) + 48 (N + stroke)
     apple-touch-icon.png     180, full ink square baked in (iOS ignores alpha)
     icon-192.png             PWA, squircle + N + stroke
     icon-512.png             PWA "any"
     icon-512-maskable.png    PWA "maskable": full-bleed ink, content inside the
                              centre safe zone (the OS may crop to a circle)
   ============================================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pub = resolve(projectRoot, 'public');

// Brand palette: the DESIGN.md tokens (a Node script cannot read globals.css).
const INK = '#0A1628';
const PAPER = '#F3EEE4';
const MARKER = '#F2835F';

// Geometry on a 64-unit grid (everything scales from here).
const GRID = 64;
const RADIUS = 14; // squircle corner radius (~22% of the side)
const CAP_MAIN = 38; // N cap-height for the standard mark (~59% of the tile)
const CAP_TAB = 46; // N for the 16 and 32 px entries (no stroke, so it can be tall)
const CAP_MASK = 32; // smaller N for the maskable icon so it clears the crop
const BAR_H = 3.6; // marker stroke thickness
const BAR_GAP = 4.2; // N baseline -> stroke
const LIFT = (BAR_GAP + BAR_H) / 2; // raise the N when the stroke is shown, so the pair is centred

// WOFF works directly with opentype.js; WOFF2 would need a decompressor.
const fontPath = resolve(
  projectRoot,
  'node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff',
);

function loadFont(path) {
  const buf = readFileSync(path);
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return opentype.parse(arrayBuffer);
}
const font = loadFont(fontPath);

/**
 * Build the "N" glyph as path data for a target cap-height. opentype positions the
 * glyph above the baseline; we measure the rendered bounding box and translate so the
 * letter is centred in the 64 grid, then `bar` (the stroke) sits under it.
 */
function letterN(capTarget) {
  // Scale the raw unit outline ourselves: opentype.js `getPath` returns NaN
  // coordinates for some fractional sizes, which silently breaks the SVG path.
  const glyph = font.charToGlyph('N');
  const gb = glyph.getBoundingBox();
  const scale = capTarget / (gb.y2 - gb.y1);
  const f = (v) => Math.round(v * 100) / 100;
  let d = '';
  for (const c of glyph.path.commands) {
    if (c.type === 'M' || c.type === 'L') d += `${c.type}${f(c.x * scale)} ${f(-c.y * scale)}`;
    else if (c.type === 'Q')
      d += `Q${f(c.x1 * scale)} ${f(-c.y1 * scale)} ${f(c.x * scale)} ${f(-c.y * scale)}`;
    else if (c.type === 'C')
      d += `C${f(c.x1 * scale)} ${f(-c.y1 * scale)} ${f(c.x2 * scale)} ${f(-c.y2 * scale)} ${f(c.x * scale)} ${f(-c.y * scale)}`;
    else if (c.type === 'Z') d += 'Z';
  }
  const w = (gb.x2 - gb.x1) * scale;
  const h = capTarget;
  const left = gb.x1 * scale;
  const top = -gb.y2 * scale;
  return {
    d,
    tx: (GRID - w) / 2 - left,
    ty: (GRID - h) / 2 - top,
    x: (GRID - w) / 2,
    w,
    bottom: (GRID + h) / 2,
  };
}
const N_MAIN = letterN(CAP_MAIN);
const N_MASK = letterN(CAP_MASK);
const N_TAB = letterN(CAP_TAB); // tab sizes: bigger and slightly emboldened

/** Compose the mark as an SVG string. `px` sets the raster render size. */
function markSvg({ letter = N_MAIN, bar = true, squircle = true, heavy = false, px = GRID } = {}) {
  const bg = squircle
    ? `<rect width="${GRID}" height="${GRID}" rx="${RADIUS}" fill="${INK}"/>`
    : `<rect width="${GRID}" height="${GRID}" fill="${INK}"/>`;
  const lift = bar ? LIFT : 0;
  const glyph = `<g transform="translate(${r(letter.tx)} ${r(letter.ty - lift)})" fill="${PAPER}"${heavy ? ` stroke="${PAPER}" stroke-width="2.2" stroke-linejoin="round"` : ''}><path d="${letter.d}"/></g>`;
  const stroke = bar
    ? `<rect x="${r(letter.x)}" y="${r(letter.bottom - lift + BAR_GAP)}" width="${r(letter.w)}" height="${BAR_H}" rx="${BAR_H / 2}" fill="${MARKER}"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${GRID} ${GRID}" role="img" aria-label="Nixon Creative Studio">${bg}${glyph}${stroke}</svg>`;
}
const r = (v) => Math.round(v * 100) / 100;

/** Rasterize a mark to a PNG buffer at an exact size (SVG vector, no upscale). */
async function rasterize(opts, size) {
  const svg = markSvg({ ...opts, px: size });
  let img = sharp(Buffer.from(svg));
  // Full-square variants must have no transparency (iOS / maskable bake the bg).
  if (opts.squircle === false) img = img.flatten({ background: INK });
  return img.png().toBuffer();
}

/** Pack PNG buffers into a PNG-in-ICO container (supported everywhere modern). */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);
  const dir = [];
  const blobs = [];
  let offset = 6 + entries.length * 16;
  for (const { size, buffer } of entries) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // palette count
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(buffer.length, 8);
    e.writeUInt32LE(offset, 12);
    dir.push(e);
    blobs.push(buffer);
    offset += buffer.length;
  }
  return Buffer.concat([header, ...dir, ...blobs]);
}

// --- Generate --------------------------------------------------------------
const write = (name, data) => {
  writeFileSync(resolve(pub, name), data);
  console.log(`Wrote public/${name} (${data.length.toLocaleString()} bytes)`);
};

// 1) Canonical SVG favicon (64-grid, scales infinitely).
write('favicon.svg', markSvg({ px: GRID }));

// 2) ICO: 16 + 32 with NO stroke, 48 with it.
const ico = buildIco([
  { size: 16, buffer: await rasterize({ letter: N_TAB, bar: false, heavy: true }, 16) },
  { size: 32, buffer: await rasterize({ letter: N_TAB, bar: false, heavy: true }, 32) },
  { size: 48, buffer: await rasterize({ bar: true }, 48) },
]);
write('favicon.ico', ico);

// 3) Apple touch: 180, full ink square (no alpha; iOS rounds it).
write('apple-touch-icon.png', await rasterize({ bar: true, squircle: false }, 180));

// 4) PWA "any": squircle + N + stroke at 192 and 512.
write('icon-192.png', await rasterize({ bar: true }, 192));
write('icon-512.png', await rasterize({ bar: true }, 512));

// 5) PWA "maskable": full-bleed ink square, smaller N + stroke in the safe zone.
write(
  'icon-512-maskable.png',
  await rasterize({ letter: N_MASK, bar: true, squircle: false }, 512),
);
