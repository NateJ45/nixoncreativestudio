// Splits the contour ground (src/assets/grounds/contours.svg, baked by build-grounds.mjs)
// into white-on-transparent MASKS for the home hero (DESIGN.md "Hero ground",
// src/lib/heroGround.ts). Each mask is filled with a token colour in CSS:
//
//   src/assets/home/contours-lines.svg       the contour lines (10 m and 50 m)
//   src/assets/home/contours-bed.svg         the river and creek beds
//   src/assets/home/contours-edge.svg        the Ohio's banks and its name
//   src/assets/home/contours-edge-phone.svg  the banks without the name (at phone width the
//                                            name would sit under the words)
//
// Masks rather than coloured images: a background image attached after load was counted as
// the LCP element; a mask is not an LCP candidate. The geometry is the foundation's; re-run
// after build-grounds.mjs:  node scripts/brand/build-hero-contours.mjs
// Contrast of every hero text colour over the lines: src/lib/heroContours.test.ts.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const src = readFileSync(`${root}src/assets/grounds/contours.svg`, 'utf8');
const MINOR_LINE = 0.73; // = MINOR_LINE in src/lib/heroGround.ts (0.11 / 0.15 as baked)

const open = src.slice(0, src.indexOf('<g'));
const group = src.match(/<g[^>]*>/)[0];
const els = src.match(/<(path|text)[^>]*?(\/>|>[^<]*<\/text>)/g);
if (!els || els.length < 8) throw new Error('contours.svg changed shape');

const white = (el, alpha) =>
  el
    .replace(/ stroke="#[0-9a-f]{6}"/, ' stroke="#fff"')
    .replace(/ fill="#[0-9a-f]{6}"/, ' fill="#fff"')
    .replace(/ (stroke|fill)-opacity="[\d.]+"/, alpha === 1 ? '' : ` $1-opacity="${alpha}"`);

const pick = (pred, alpha) => els.filter(pred).map((el) => white(el, alpha(el)));
const is = (hex) => (el) => el.includes(`"${hex}"`);
const LAYERS = {
  lines: pick(is('#7a5638'), (el) => (el.includes('opacity="0.11"') ? MINOR_LINE : 1)),
  bed: pick(is('#e1e0d5'), () => 1),
  edge: pick(is('#6c8592'), () => 1),
  'edge-phone': pick(
    (el) => is('#6c8592')(el) && el.startsWith('<path'),
    () => 1,
  ),
};

for (const [name, parts] of Object.entries(LAYERS)) {
  if (!parts.length) throw new Error(`no elements for ${name}`);
  const svg = `${open}${group}${parts.join('')}</g></svg>`;
  writeFileSync(`${root}src/assets/home/contours-${name}.svg`, svg);
  console.log(`src/assets/home/contours-${name}.svg  ${(svg.length / 1024).toFixed(1)} KB`);
}
