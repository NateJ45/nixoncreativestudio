// Working wordmark and favicon, outlined from Hanken Grotesk, then wired into every page of the Deal site.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const LAB = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const D = LAB + 'deal/', OUT = LAB + 'assets/brand/', TTF = LAB + 'assets/brand/_ttf/';
const req = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json');
const opentype = req('opentype.js');
const INK = '#121211', BLUE = '#2F3FE6';
fs.mkdirSync(TTF, { recursive: true });
const face = async (w) => {
  const f = `${TTF}hanken-${w}.ttf`;
  if (!fs.existsSync(f)) {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@${w}`)).text();
    const url = css.match(/https:[^)]+\.ttf/)[0];
    fs.writeFileSync(f, Buffer.from(await (await fetch(url)).arrayBuffer()));
  }
  const b = fs.readFileSync(f);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};
const n = (v) => +v.toFixed(2);
const line = (font, text, x0, size, track) => {
  const k = size / font.unitsPerEm, gl = [...text].map((c) => font.charToGlyph(c));
  let x = x0, d = '';
  gl.forEach((g, i) => {
    d += g.getPath(x, 0, size).commands.map((c) => c.type === 'Z' ? 'Z' : c.type === 'Q' ? `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}` : c.type === 'C' ? `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}` : `${c.type}${n(c.x)} ${n(c.y)}`).join('');
    x += (g.advanceWidth || 0) * k + (gl[i + 1] ? (font.getKerningValue(g, gl[i + 1]) || 0) * k : 0) + track * size;
  });
  return { d, end: x - track * size, cap: font.tables.os2.sCapHeight * k, desc: Math.abs(font.descender) * k };
};
const [bold, med] = [await face(700), await face(500)];
const SIZE = 100, TRACK = -0.03;
const a = line(bold, 'Nixon', 0, SIZE, TRACK);
const b = line(med, 'Creative Studio', a.end + 26, SIZE, TRACK);
const word = (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${-Math.ceil(a.cap + 6)} ${Math.ceil(b.end + 4)} ${Math.ceil(a.cap + 12 + b.desc)}" role="img" aria-label="Nixon Creative Studio"><path fill="${color}" d="${a.d}${b.d}"/></svg>\n`;
fs.writeFileSync(OUT + 'wordmark.svg', word(INK));
fs.writeFileSync(OUT + 'wordmark-white.svg', word('#FFFFFF'));
fs.writeFileSync(OUT + 'wordmark-blue.svg', word(BLUE));
// The N sits optically centered on a blue tile, drawn large so it holds at 16 pixels.
const glyph = bold.charToGlyph('N'), box = glyph.getPath(0, 0, 100).getBoundingBox();
const S = 64, target = 38, size = 100 * target / (box.y2 - box.y1), bb = glyph.getPath(0, 0, size).getBoundingBox();
const ox = (S - (bb.x2 - bb.x1)) / 2 - bb.x1, oy = (S - (bb.y2 - bb.y1)) / 2 - bb.y1;
const N = glyph.getPath(ox, oy, size).commands.map((c) => c.type === 'Z' ? 'Z' : c.type === 'Q' ? `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}` : `${c.type}${n(c.x)} ${n(c.y)}`).join('');
fs.writeFileSync(OUT + 'favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="Nixon Creative Studio"><rect width="64" height="64" rx="14" fill="${BLUE}"/><path fill="#FFFFFF" d="${N}"/></svg>\n`);
fs.rmSync(TTF, { recursive: true, force: true });

// Wire it in once.
const OLD = '<link rel="icon" href="data:,">', NEW = '<link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml">';
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => { if (/^_(test|qa|design)$/.test(e.name)) return []; const p = path.join(d, e.name); return e.isDirectory() ? walk(p) : [p]; });
let c = 0;
for (const f of walk(D).filter((p) => /\.(html|mjs)$/.test(p))) { const t = fs.readFileSync(f, 'utf8'); if (t.includes(OLD)) { fs.writeFileSync(f, t.split(OLD).join(NEW)); c++; } }
let js = fs.readFileSync(D + 'kit.js', 'utf8');
const A = '<a class="mark" href="/deal/">Nixon Creative Studio</a>';
if (js.includes(A)) { fs.writeFileSync(D + 'kit.js', js.replace(A, '<a class="mark" href="/deal/"><b>Nixon</b> Creative Studio</a>')); console.log('mark updated'); }
const css = fs.readFileSync(D + 'kit.css', 'utf8');
if (!css.includes('The working wordmark')) fs.appendFileSync(D + 'kit.css', `
/* The working wordmark: the whole name, heavy then medium, always together. */
.mark{column-gap:.26em;font-weight:500;letter-spacing:-.03em}
.mark b{font-weight:700}
`);
console.log('favicon links', c, 'word width', Math.round(b.end));
