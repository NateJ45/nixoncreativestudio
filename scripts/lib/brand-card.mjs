/* ============================================================================
   scripts/lib/brand-card.mjs
   ============================================================================
   Shared renderer for every 1200x630 social card (generate-og.mjs per-page
   cards, generate-og-default.mjs fallback card). Redesign 2026: warm survey
   paper with the contour ground, the official logo lockup, a Bebas Neue
   headline that turns into the Newsreader italic voice in china-marker red.

   Everything is local and offline: Bebas Neue from @fontsource (woff), Newsreader
   italic from scripts/fonts/ (a woff copy of src/assets/fonts/newsreader-latin-
   400-italic.woff2, because opentype.js cannot read woff2), the logo SVG from
   src/assets/brand/, the contour sheet from src/assets/grounds/. Glyphs are
   drawn as SVG paths (opentype.js) and rasterised with sharp, so the result is
   the real typefaces on any build host with no system fonts.

   Palette: literal copies of the DESIGN.md tokens (a Node script cannot read
   globals.css). If a token changes there, change it here.
   ============================================================================ */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import opentype from 'opentype.js';
import sharp from 'sharp';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const WIDTH = 1200;
export const HEIGHT = 630;
const PAD = 72;

// DESIGN.md tokens.
export const C = {
  ink: '#0A1628',
  inkMuted: '#56585C',
  paper: '#F3EEE4',
  paperRaised: '#FBF8F2',
  survey: '#E8E6D9',
  marker: '#AE2F1B',
  markerHot: '#F2835F',
  onInkMuted: '#B8B6B0',
};

function loadFont(p) {
  const buf = readFileSync(p);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}
const bebas = loadFont(
  resolve(
    projectRoot,
    'node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff',
  ),
);
const serifItalic = loadFont(
  resolve(projectRoot, 'scripts/fonts/newsreader-latin-400-italic.woff'),
);

const upper = (s) => s.toUpperCase();

// Per-glyph layout. opentype.js 1.x `glyph.getPath(x, y, size)` and the pair kerning
// both returned NaN coordinates for some glyph/size combinations (a truncated SVG path
// then silently drops the rest of the line), so this scales the raw unit outlines
// itself and guards the kerning value.
const num = (v) => String(Math.round(v * 100) / 100);
function glyphD(glyph, x, scale) {
  let d = '';
  for (const c of glyph.path.commands) {
    const X = (v) => num(x + v * scale);
    const Y = (v) => num(-v * scale);
    if (c.type === 'M' || c.type === 'L') d += `${c.type}${X(c.x)} ${Y(c.y)}`;
    else if (c.type === 'Q') d += `Q${X(c.x1)} ${Y(c.y1)} ${X(c.x)} ${Y(c.y)}`;
    else if (c.type === 'C')
      d += `C${X(c.x1)} ${Y(c.y1)} ${X(c.x2)} ${Y(c.y2)} ${X(c.x)} ${Y(c.y)}`;
    else if (c.type === 'Z') d += 'Z';
  }
  return d;
}
function layout(font, text, size) {
  const glyphs = font.stringToGlyphs(text);
  const scale = size / font.unitsPerEm;
  let x = 0;
  const paths = [];
  glyphs.forEach((g, i) => {
    if (i > 0) {
      const k = font.getKerningValue(glyphs[i - 1], g);
      if (Number.isFinite(k)) x += k * scale;
    }
    paths.push(glyphD(g, x, scale));
    x += (g.advanceWidth || 0) * scale;
  });
  const d = paths.join('');
  if (d.includes('NaN')) throw new Error(`NaN in glyph path for ${JSON.stringify(text)}`);
  return { d, w: x };
}
const bAdv = (t, size) => layout(bebas, upper(t), size).w;
const iAdv = (t, size) => layout(serifItalic, t, size).w;
const bPath = (t, size) => layout(bebas, upper(t), size).d;
const iPath = (t, size) => layout(serifItalic, t, size).d;

function wrap(text, adv, size, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (cur && adv(trial, size) > maxWidth) {
      lines.push(cur);
      cur = w;
    } else cur = trial;
  }
  if (cur) lines.push(cur);
  return lines;
}

const CAP = 0.7; // Bebas cap height as a fraction of the em (measured from the font)
const VOICE_SCALE = 0.86; // DESIGN.md: the voice is 0.86em of the headline

/**
 * Lay out the headline: `head` in Bebas, then `voice` in the italic. Shrinks the
 * size until it fits `maxWidth` in at most `maxLines` lines and `maxHeight`.
 * Returns { size, items: [{ kind, text, baseline(relative), x }], height }.
 */
function layoutHeadline({ head, voice, maxWidth, maxLines, maxHeight, start, min }) {
  for (let size = start; size >= min; size -= 2) {
    const vSize = size * VOICE_SCALE;
    const headLines = head ? wrap(head, bAdv, size, maxWidth) : [];
    const voiceLines = voice ? wrap(voice, iAdv, vSize, maxWidth) : [];
    if (headLines.length + voiceLines.length > maxLines) continue;
    const lh = size * 0.98;
    const vlh = vSize * 1.12;
    const height =
      headLines.length * lh + voiceLines.length * vlh + (head && voice ? size * 0.04 : 0);
    if (height > maxHeight) continue;
    const items = [];
    let y = 0;
    for (const line of headLines) {
      y += lh;
      items.push({ kind: 'head', text: line, size, y, w: bAdv(line, size) });
    }
    for (const line of voiceLines) {
      y += vlh;
      items.push({ kind: 'voice', text: line, size: vSize, y, w: iAdv(line, vSize) });
    }
    return { size, items, height: y };
  }
  throw new Error(`headline does not fit: ${head} / ${voice}`);
}

// A short hand-drawn china-marker stroke under the voice's last line.
function markerStroke(x, y, w, seed) {
  const j = (n) => (((seed * 9301 + n * 49297) % 233280) / 233280 - 0.5) * 3;
  const x2 = x + w;
  return `<path d="M${x} ${y + j(1)} C${x + w * 0.3} ${y - 3 + j(2)} ${x + w * 0.62} ${y + 2 + j(3)} ${x2} ${y - 1 + j(4)}" fill="none" stroke="${C.marker}" stroke-width="3.5" stroke-linecap="round" stroke-opacity="0.9"/>`;
}

let logoCache;
async function logoPng(width) {
  if (!logoCache) {
    const svg = readFileSync(resolve(projectRoot, 'src/assets/brand/logo-navy.svg'), 'utf8')
      .replace(/currentColor/g, C.ink)
      .replace(/style="[^"]*"/, '');
    logoCache = svg;
  }
  return sharp(Buffer.from(logoCache), { density: 300 }).resize({ width }).png().toBuffer();
}

let contourCache;
async function contourPng() {
  if (!contourCache) {
    // The site's ground, with the relief lines a little stronger (a card is seen small)
    // and the river label dropped (it is Georgia text: system-font dependent).
    const svg = Buffer.from(
      readFileSync(resolve(projectRoot, 'src/assets/grounds/contours.svg'), 'utf8')
        .replace(/<text[\s\S]*?<\/text>/g, '')
        .replace('stroke-opacity="0.15"', 'stroke-opacity="0.34"')
        .replace('stroke-opacity="0.11"', 'stroke-opacity="0.26"')
        .replace(/stroke-opacity="0.22"/g, 'stroke-opacity="0.42"'),
    );
    contourCache = await sharp(svg, { density: 96 })
      .resize(WIDTH, HEIGHT, { fit: 'cover' })
      .png()
      .toBuffer();
  }
  return contourCache;
}

function textGroup(items, x, top, fill, voiceFill) {
  return items
    .map((it) => {
      const d = it.kind === 'head' ? bPath(it.text, it.size) : iPath(it.text, it.size);
      return `<g transform="translate(${x}, ${top + it.y})" fill="${it.kind === 'voice' ? voiceFill : fill}"><path d="${d}"/></g>`;
    })
    .join('');
}

/**
 * Build one card. opts:
 *   head, voice      the headline (voice is optional)
 *   kicker           small italic line above the headline (optional)
 *   sub              small Bebas line under the headline (optional)
 *   print            Buffer of a client screenshot to show as a framed print (optional)
 *   seed             number, varies the marker stroke
 */
export async function renderCard({ head, voice, kicker, sub, print, seed = 1 }) {
  const hasPrint = Boolean(print);
  const maxWidth = hasPrint ? 500 : 880;
  const logoW = 300;
  const logoH = Math.round((logoW * 361) / 1423);

  // Vertical budget: logo block above, footer line below.
  const topLimit = PAD + logoH + 36;
  const footerBaseline = HEIGHT - PAD + 6;
  const kickerSize = 36;
  const subSize = 30;
  const reserveBelow = sub ? subSize * CAP + 26 : 0;
  const reserveAbove = kicker ? kickerSize + 20 : 0;
  const bottomLimit = footerBaseline - 70;
  const maxHeight = bottomLimit - topLimit - reserveBelow - reserveAbove;

  const hl = layoutHeadline({
    head,
    voice,
    maxWidth,
    maxLines: hasPrint ? 5 : 4,
    maxHeight,
    start: hasPrint ? 112 : 168,
    min: 56,
  });

  // Bottom-anchor the block (kicker + headline + sub) above the footer line.
  const blockH = reserveAbove + hl.height + reserveBelow;
  const blockTop = bottomLimit - blockH;
  const headTop = blockTop + reserveAbove;
  // y values in items are baselines relative to the top of the headline block, and
  // already include the line's own height, so the first baseline sits one line down.

  const parts = [];
  if (kicker) {
    parts.push(
      `<g transform="translate(${PAD}, ${blockTop + kickerSize * 0.78})" fill="${C.marker}"><path d="${iPath(kicker, kickerSize)}"/></g>`,
    );
  }
  parts.push(textGroup(hl.items, PAD, headTop, C.ink, C.marker));
  const lastVoice = [...hl.items].reverse().find((i) => i.kind === 'voice');
  if (lastVoice) {
    parts.push(
      markerStroke(PAD, headTop + lastVoice.y + 14, Math.min(lastVoice.w, maxWidth), seed),
    );
  }
  if (sub) {
    const subY = headTop + hl.height + 26 + subSize * CAP;
    parts.push(
      `<g transform="translate(${PAD}, ${subY})" fill="${C.inkMuted}"><path d="${bPath(sub, subSize)}"/></g>`,
    );
  }
  // Footer: the domain, quiet, in the left column.
  parts.push(
    `<g transform="translate(${PAD}, ${footerBaseline})" fill="${C.inkMuted}"><path d="${bPath('nixoncreativestudio.com', 28)}"/></g>`,
  );

  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${parts.join('')}</svg>`;
  // A paper wash behind the text column so the contours never fight the type.
  const wash = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}"><defs><linearGradient id="w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.survey}" stop-opacity="0.82"/><stop offset="${hasPrint ? 0.5 : 0.78}" stop-color="${C.survey}" stop-opacity="0.35"/><stop offset="1" stop-color="${C.survey}" stop-opacity="0"/></linearGradient></defs><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#w)"/></svg>`;

  const layers = [
    { input: await contourPng(), left: 0, top: 0 },
    { input: Buffer.from(wash), left: 0, top: 0 },
    { input: await logoPng(logoW), left: PAD, top: PAD },
  ];

  if (hasPrint) layers.push(...(await printLayers(print)));
  layers.push({ input: Buffer.from(overlay), left: 0, top: 0 });

  return sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 3, background: C.survey },
  })
    .composite(layers)
    .png({
      palette: true,
      colours: hasPrint ? 80 : 64,
      quality: hasPrint ? 45 : 60,
      effort: 10,
      dither: 0.2,
    })
    .toBuffer();
}

// A client screenshot as a framed print: raised-paper mat, hairline, soft shadow,
// a slight tilt (the site shows its work as prints on a table).
async function printLayers(cover) {
  const imgW = 520;
  const imgH = 340;
  const mat = 12;
  const shot = await sharp(cover)
    .resize(imgW, imgH, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();
  const fw = imgW + mat * 2;
  const fh = imgH + mat * 2;
  const frame = await sharp({
    create: { width: fw, height: fh, channels: 4, background: C.paperRaised },
  })
    .composite([
      { input: shot, left: mat, top: mat },
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${fw}" height="${fh}"><rect x="0.5" y="0.5" width="${fw - 1}" height="${fh - 1}" fill="none" stroke="${C.ink}" stroke-opacity="0.22"/></svg>`,
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
  const angle = -2.2;
  const rotated = await sharp(frame)
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const meta = await sharp(rotated).metadata();
  const shadowPad = 40;
  const shadow = await sharp({
    create: {
      width: meta.width + shadowPad * 2,
      height: meta.height + shadowPad * 2,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp(rotated)
          .ensureAlpha()
          .tint(C.ink)
          .modulate({ brightness: 0 })
          .png()
          .toBuffer(),
        left: shadowPad,
        top: shadowPad,
      },
    ])
    .blur(16)
    .linear([1, 1, 1, 0.24], [0, 0, 0, 0])
    .png()
    .toBuffer();
  const left = Math.round(WIDTH - 72 - meta.width + 8);
  const top = Math.round((HEIGHT - meta.height) / 2 + 6);
  return [
    { input: shadow, left: left - shadowPad, top: top - shadowPad + 10 },
    { input: rotated, left, top },
  ];
}
