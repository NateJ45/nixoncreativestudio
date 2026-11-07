// Foundation, edit with care. Standalone generator for the favicon / app-icon set.
// Run `npm run icons` after changing public/favicon.svg, then commit the outputs
// (they ship to visitors). Not part of the main build chain: the icons only change
// when the brand does, exactly like scripts/generate-og-default.mjs.
/* ============================================================================
   Favicon / app-icon generator
   ============================================================================
   public/favicon.svg is the source: the white N on the studio blue, outlined from
   the working wordmark. This rasterizes it with sharp.

   Outputs (all into public/):
     favicon.ico              16 + 32 + 48
     apple-touch-icon.png     180, the square blue baked in (iOS ignores alpha)
     icon-192.png             PWA
     icon-512.png             PWA "any"
     icon-512-maskable.png    PWA "maskable": full-bleed blue with the N in the
                              center safe zone (the OS may crop to a circle)
   ============================================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pub = resolve(projectRoot, 'public');
const svg = readFileSync(resolve(pub, 'favicon.svg'), 'utf8');

/** The mark at a size. `square` drops the rounded corners, `inset` shrinks the N. */
function mark(size, { square = false, inset = 1 } = {}) {
  let s = svg.replace(/width="64" height="64"/, `width="${size}" height="${size}"`);
  if (square) s = s.replace(/ rx="14"/, '');
  if (inset !== 1) {
    const t = (64 * (1 - inset)) / 2;
    s = s.replace(/<path /, `<path transform="translate(${t} ${t}) scale(${inset})" `);
  }
  return sharp(Buffer.from(s)).png({ compressionLevel: 9 }).toBuffer();
}

/** A PNG-in-ICO container: a 6-byte header, a 16-byte entry per size, then the PNGs. */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length;
  const dir = entries.map(({ size, buffer }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size === 256 ? 0 : size, 0);
    e.writeUInt8(size === 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buffer.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buffer.length;
    return e;
  });
  return Buffer.concat([header, ...dir, ...entries.map((e) => e.buffer)]);
}

const write = (name, data) => {
  writeFileSync(resolve(pub, name), data);
  console.log('wrote', name, data.length);
};

write(
  'favicon.ico',
  buildIco(
    await Promise.all([16, 32, 48].map(async (size) => ({ size, buffer: await mark(size) }))),
  ),
);
write('apple-touch-icon.png', await mark(180, { square: true }));
write('icon-192.png', await mark(192));
write('icon-512.png', await mark(512));
write('icon-512-maskable.png', await mark(512, { square: true, inset: 0.72 }));
