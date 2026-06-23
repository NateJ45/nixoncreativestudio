// Foundation, edit with care. Standalone generator for the favicon / app-icon
// set. Run `npm run icons` after changing brand navy, the accent amber, the
// squircle radius, or the wordmark font, then commit the outputs (they ship to
// visitors). Not part of the main build chain: the icons only change when the
// brand does, exactly like scripts/generate-og-default.mjs.
/* ============================================================================
   Favicon / app-icon generator
   ============================================================================
   The mark: a single white Bebas Neue capital "N" on a navy squircle, with one
   small amber spark in the top-right (the studio's one warm accent). It reads as
   a compressed sibling of the NIXON CREATIVE STUDIO wordmark rather than an
   invented logo, because the N is the REAL Bebas glyph, pulled from the WOFF via
   opentype.js (the same technique as the OG generators), so it can't drift from
   the wordmark.

   Design decisions (from the mark study):
   - ONE self-contained look. The navy tile means the icon reads identically on
     light and dark browser chrome, so there is NO prefers-color-scheme flip
     (those are ignored by several browsers inside SVG favicons and never reach
     the flattened PNG/ICO set, which would split the identity).
   - The amber dot is the only size-gated element: it provably blurs at tab size,
     so the 16 and 32 px .ico entries drop it and show just the white N on navy.
   - Runs out-of-process (opentype.js + sharp) because the Cloudflare prerender
     isolate has no node built-ins; an Astro route couldn't do this.

   Outputs (all into public/):
     favicon.svg              canonical mark (squircle + N + dot)
     favicon.ico              16 + 32 (N only) + 48 (N + dot)
     apple-touch-icon.png     180, full navy square baked in (iOS ignores alpha)
     icon-192.png             PWA, squircle + N + dot
     icon-512.png             PWA "any"
     icon-512-maskable.png    PWA "maskable": full-bleed navy, content in the
                              center safe zone (the OS may crop to a circle)
   ============================================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pub = resolve(projectRoot, 'public');

// Brand palette. Keep in sync with the @theme tokens in globals.css.
const NAVY = '#0A1628';
const WHITE = '#FFFFFF';
const AMBER = '#FFA334';

// Geometry on a 64-unit grid (everything scales from here).
const GRID = 64;
const RADIUS = 14; // squircle corner radius (~22% of the side)
const CAP_MAIN = 40; // N cap-height for the standard mark (~62% of the tile)
const CAP_MASK = 34; // smaller N for the maskable icon so it clears the crop
const DOT = { cx: 51, cy: 14, r: 4.5 }; // amber spark, standard
const DOT_MASK = { cx: 47, cy: 18, r: 4.5 }; // pulled into the maskable safe zone

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
 * Build the "N" glyph as centered path data for a target cap-height. opentype
 * positions the glyph above the baseline; we measure the rendered bounding box
 * and translate so the letter is optically centered in the 64 grid.
 */
function letterN(capTarget) {
  const probe = 64;
  let path = font.getPath('N', 0, 0, probe);
  let bb = path.getBoundingBox();
  const size = (probe * capTarget) / (bb.y2 - bb.y1);
  path = font.getPath('N', 0, 0, size);
  bb = path.getBoundingBox();
  const w = bb.x2 - bb.x1;
  const h = bb.y2 - bb.y1;
  return {
    d: path.toPathData(2),
    tx: (GRID - w) / 2 - bb.x1,
    ty: (GRID - h) / 2 - bb.y1,
  };
}
const N_MAIN = letterN(CAP_MAIN);
const N_MASK = letterN(CAP_MASK);

/** Compose the mark as an SVG string. `px` sets the raster render size. */
function markSvg({ letter = N_MAIN, dot = true, squircle = true, dotPos = DOT, px = GRID } = {}) {
  const bg = squircle
    ? `<rect width="${GRID}" height="${GRID}" rx="${RADIUS}" fill="${NAVY}"/>`
    : `<rect width="${GRID}" height="${GRID}" fill="${NAVY}"/>`;
  const glyph = `<g transform="translate(${letter.tx} ${letter.ty})" fill="${WHITE}"><path d="${letter.d}"/></g>`;
  const spark = dot ? `<circle cx="${dotPos.cx}" cy="${dotPos.cy}" r="${dotPos.r}" fill="${AMBER}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${GRID} ${GRID}" role="img" aria-label="Nixon Creative Studio">${bg}${glyph}${spark}</svg>`;
}

/** Rasterize a mark to a PNG buffer at an exact size (SVG vector, no upscale). */
async function rasterize(opts, size) {
  const svg = markSvg({ ...opts, px: size });
  let img = sharp(Buffer.from(svg));
  // Full-square variants must have no transparency (iOS / maskable bake the bg).
  if (opts.squircle === false) img = img.flatten({ background: NAVY });
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

// 2) ICO: 16 + 32 with NO dot, 48 with dot.
const ico = buildIco([
  { size: 16, buffer: await rasterize({ dot: false }, 16) },
  { size: 32, buffer: await rasterize({ dot: false }, 32) },
  { size: 48, buffer: await rasterize({ dot: true }, 48) },
]);
write('favicon.ico', ico);

// 3) Apple touch: 180, full navy square (no alpha; iOS rounds it).
write('apple-touch-icon.png', await rasterize({ dot: true, squircle: false }, 180));

// 4) PWA "any": squircle + N + dot at 192 and 512.
write('icon-192.png', await rasterize({ dot: true }, 192));
write('icon-512.png', await rasterize({ dot: true }, 512));

// 5) PWA "maskable": full-bleed navy square, smaller N + dot in the safe zone.
write(
  'icon-512-maskable.png',
  await rasterize({ letter: N_MASK, dot: true, squircle: false, dotPos: DOT_MASK }, 512),
);
