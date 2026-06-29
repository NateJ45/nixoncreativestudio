/* ============================================================================
   scripts/generate-og-default.mjs
   ============================================================================
   One-off generator for public/og-default.png.

   Produces a 1200x630 Open Graph image using:
     - Brand navy background (#0A1628)
     - "NIXON CREATIVE STUDIO" in Bebas Neue (rendered as SVG paths from
       the @fontsource WOFF file, so the result is the real brand
       typeface regardless of what fonts the build server has installed)
     - Tagline + locale stamp in Bebas at smaller sizes
     - A small NCS-blue accent rule above the wordmark

   Run with:
     node scripts/generate-og-default.mjs

   The output overwrites public/og-default.png. The file is intentionally
   committed (it's a real asset shipped to visitors), so re-run this any
   time the brand wordmark, tagline, or colors change.
   ============================================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import opentype from 'opentype.js';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// --- Inputs ----------------------------------------------------------------
// Keep these in sync with src/data/site.ts and src/styles/globals.css.
// Hard-coded here (rather than imported from site.ts) because Node can't
// import .ts modules without extra tooling, and an OG image regenerated
// rarely is fine to update by hand.
const WORDMARK   = 'NIXON CREATIVE STUDIO';
const TAGLINE    = 'PHOTOGRAPHY, WEB DESIGN, STRATEGY';
const LOCALE     = 'CINCINNATI REGION';

const COLORS = {
  bg:       '#0A1628',  // brand navy
  fg:       '#F4F7FA',  // off-white, matches dark-mode heading color
  muted:    '#9CA3AF',  // dark-mode --muted-foreground
  accent:   '#40AAED',  // bright accent for the rule (passes AA on navy)
  amber:    '#FFA334',  // brand amber for the tagline
};

// OG image canonical dimensions. 1200x630 is the spec all major social
// platforms (Open Graph, Twitter Cards, LinkedIn) crop against.
const WIDTH  = 1200;
const HEIGHT = 630;

// Output file.
const outPath = resolve(projectRoot, 'public/og-default.png');

// Font file. WOFF works directly with opentype.js; WOFF2 would need a
// separate decompressor.
const fontPath = resolve(
  projectRoot,
  'node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff',
);

// --- Helpers ---------------------------------------------------------------

/** Load the Bebas Neue WOFF file as an opentype.js Font instance. */
function loadFont(path) {
  const buf = readFileSync(path);
  // opentype.parse expects an ArrayBuffer; Buffer.slice gives a view we
  // can pass directly.
  const arrayBuffer = buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  );
  return opentype.parse(arrayBuffer);
}

/**
 * Convert a text string into an SVG <path d="..."> using glyph outlines.
 * Returns the path data and the rendered width so callers can center.
 */
function textToPathData(font, text, fontSizePx) {
  const path = font.getPath(text, 0, 0, fontSizePx);
  const width = font.getAdvanceWidth(text, fontSizePx);
  return { d: path.toPathData(2), width };
}

// --- Build the SVG ----------------------------------------------------------

const font = loadFont(fontPath);

// Largest size at or below `start` whose rendered width fits within `target`.
// Lets the wordmark fill nearly the full card without overflowing.
function fitSize(text, target, start, min) {
  let s = start;
  while (s > min && font.getAdvanceWidth(text, s) > target) s -= 2;
  return s;
}

// The wordmark is the hero: fit it to nearly the full width. The tagline sits
// under it in amber, with the locale as a quiet stamp below. This matches the
// brand-forward per-page navy cards (generate-og.mjs).
const WORDMARK_SIZE = fitSize(WORDMARK, WIDTH - 128, 150, 90);
const TAGLINE_SIZE  = fitSize(TAGLINE, WIDTH - 360, 56, 30);
const LOCALE_SIZE   = 26;

// Generate path data + measured widths for each line. y-offsets are
// applied via translate() in the SVG so we don't have to recompute
// glyph positions per line.
const wordmark = textToPathData(font, WORDMARK, WORDMARK_SIZE);
const tagline  = textToPathData(font, TAGLINE,  TAGLINE_SIZE);
const locale   = textToPathData(font, LOCALE,   LOCALE_SIZE);

// Vertically balance the lockup: accent rule, wordmark, tagline, locale. Walk
// down the centered group computing each baseline from cap-height estimates
// (opentype.js positions glyphs above the baseline by default).
const cap = 0.8;
const barH = 6;
const gapBar = 36;  // accent rule -> wordmark
const gapWord = 28; // wordmark -> tagline
const gapTag = 46;  // tagline -> locale

const wH = WORDMARK_SIZE * cap;
const tH = TAGLINE_SIZE * cap;
const lH = LOCALE_SIZE * cap;
const total = barH + gapBar + wH + gapWord + tH + gapTag + lH;

let top = (HEIGHT - total) / 2;
const accentY = top;
top += barH + gapBar;
const wordmarkY = top + wH;
top = wordmarkY + gapWord;
const taglineY = top + tH;
top = taglineY + gapTag;
const localeY = top + lH;

// Center horizontally by translating each path by (WIDTH - lineWidth) / 2.
const wordmarkX = (WIDTH - wordmark.width) / 2;
const taglineX  = (WIDTH - tagline.width)  / 2;
const localeX   = (WIDTH - locale.width)   / 2;

const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${WIDTH}"
  height="${HEIGHT}"
  viewBox="0 0 ${WIDTH} ${HEIGHT}"
>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.bg}" />

  <!-- Accent rule. Small bright bar centered horizontally to anchor
       the eye above the wordmark. -->
  <rect
    x="${(WIDTH - 84) / 2}"
    y="${accentY}"
    width="84"
    height="6"
    fill="${COLORS.accent}"
    rx="3"
  />

  <!-- Wordmark. The dominant brand element, fit to nearly full width. Bebas
       Neue glyph outlines rendered as path data so the result is independent
       of what fonts the build host has. -->
  <g transform="translate(${wordmarkX}, ${wordmarkY})" fill="${COLORS.fg}">
    <path d="${wordmark.d}" />
  </g>

  <!-- Tagline in brand amber, one clear notch down from the wordmark. -->
  <g transform="translate(${taglineX}, ${taglineY})" fill="${COLORS.amber}">
    <path d="${tagline.d}" />
  </g>

  <!-- Locale stamp. Quieter still; sits as a place tag at the bottom. -->
  <g transform="translate(${localeX}, ${localeY})" fill="${COLORS.muted}">
    <path d="${locale.d}" />
  </g>
</svg>
`.trim();

// --- Render -----------------------------------------------------------------

const pngBuffer = await sharp(Buffer.from(svg))
  .png()
  .toBuffer();

writeFileSync(outPath, pngBuffer);

console.log(`Wrote ${outPath} (${pngBuffer.length.toLocaleString()} bytes)`);
