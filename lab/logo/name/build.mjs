// The business name itself, stylized from real Hanken Grotesk outlines with Cincinnati ideas built into the letters.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const req = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json');
const opentype = req('opentype.js');
const TTF = HERE + '_ttf/'; fs.mkdirSync(TTF, { recursive: true });
const face = async (w) => {
  const f = `${TTF}hanken-${w}.ttf`;
  if (!fs.existsSync(f)) {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@${w}`)).text();
    fs.writeFileSync(f, Buffer.from(await (await fetch(css.match(/https:[^)]+\.ttf/)[0])).arrayBuffer()));
  }
  const b = fs.readFileSync(f);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};
const [BOLD, MED] = [await face(700), await face(500)];
const n = (v) => +v.toFixed(2);
const pathOf = (cmds) => cmds.map((c) => c.type === 'Z' ? 'Z' : c.type === 'Q' ? `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}` : c.type === 'C' ? `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}` : `${c.type}${n(c.x)} ${n(c.y)}`).join('');
const set = (font, text, x0, y0, size, track) => {
  const k = size / font.unitsPerEm, gl = [...text].map((c) => font.charToGlyph(c));
  let x = x0, d = ''; const boxes = [], cmds = [];
  gl.forEach((g, i) => {
    const p = g.getPath(x, y0, size); d += pathOf(p.commands); boxes.push(p.getBoundingBox()); cmds.push(p.commands);
    x += (g.advanceWidth || 0) * k + (gl[i + 1] ? (font.getKerningValue(g, gl[i + 1]) || 0) * k : 0) + track * size;
  });
  return { d, end: x - track * size, boxes, cmds, cap: font.tables.os2.sCapHeight * k, xh: font.tables.os2.sxHeight * k };
};
const word = set(BOLD, 'Nixon', 0, 0, 100, -0.02);
const [bN, bi, bx, bo, bn] = word.boxes;
const CAP = word.cap, XH = word.xh;
const verts = (cmds) => { const xs = new Set(); let px = null; for (const c of cmds) { if (c.type === 'L' && px !== null && Math.abs(c.x - px) < .01) xs.add(n(c.x)); if (c.x !== undefined) px = c.x; } return [...xs].sort((a, b) => a - b); };
const vN = verts(word.cmds[0]), vn = verts(word.cmds[4]);
const NL = [vN[0], vN[1]], NR = [vN[vN.length - 2], vN[vN.length - 1]], nR = [vn[vn.length - 2], vn[vn.length - 1]];
const X0 = NL[0], X1 = nR[1], STEM = NL[1] - NL[0], STEM2 = nR[1] - nR[0];
console.log('stems', NL, NR, nR);
const sub = (x, y, size = 25.5, track = -0.012) => set(MED, 'Creative Studio', x, y, size, track);
const center = (w, size, track) => { const t = sub(0, 0, size, track); return (w - t.end) / 2; };
const lockSub = (y, size = 24.6) => { const w = X1 - X0; return sub(X0 + center(w, size), y, size); };

/* 1. The Bridge: first and last letters are the towers, and the cable spans the name. */
const bridge = (() => {
  const H = 36, top = -(CAP + H), dropTo = -(CAP + 3);
  const lx = X0 + STEM / 2, rx = X1 - STEM2 / 2, mx = (lx + rx) / 2;
  const cy = dropTo * 2 - top; // quadratic control so the curve's low point lands on dropTo
  const yAt = (x) => { const t = (x - lx) / (rx - lx); return (1 - t) * (1 - t) * top + 2 * (1 - t) * t * cy + t * t * top; };
  let hang = '';
  for (let x = lx + 13; x < rx - 6; x += 13) {
    const inGlyph = word.boxes.find((b) => x > b.x1 + 1 && x < b.x2 - 1);
    const stop = !inGlyph ? -3 : inGlyph === bN ? -(CAP + 1) : inGlyph === bi ? (Math.abs(x - (bi.x1 + bi.x2) / 2) < 8 ? bi.y1 - 1 : -3) : -(XH + 2);
    if (yAt(x) < stop - 1) hang += `M${n(x)} ${n(yAt(x))}V${n(stop)}`;
  }
  const towers = `M${n(X0)} ${n(top - 3)}h${n(STEM)}V0h-${n(STEM)}Z` + `M${n(X1 - STEM2)} ${n(top - 3)}h${n(STEM2)}V0h-${n(STEM2)}Z`;
  const deck = 7, s = lockSub(deck + 31);
  const back = `M${n(lx)} ${n(top)}L${n(X0 - 30)} 4M${n(rx)} ${n(top)}L${n(X1 + 30)} 4`;
  return {
    vb: `${n(X0 - 34)} ${n(top - 7)} ${n(X1 - X0 + 68)} ${n(-top + 7 + deck + 39)}`,
    art: (c) => `<path fill="${c}" d="${word.d}${towers}"/><path fill="none" stroke="${c}" stroke-width="1.5" d="${hang}"/><path fill="none" stroke="${c}" stroke-width="3.6" stroke-linecap="round" d="M${n(lx)} ${n(top)}Q${n(mx)} ${n(cy)} ${n(rx)} ${n(top)}${back}"/><path fill="${c}" d="M${n(X0 - 34)} 4h${n(X1 - X0 + 68)}v3.500h-${n(X1 - X0 + 68)}Z"/><path fill="${c}" d="${s.d}"/>`,
    small: (c) => `<path fill="${c}" d="${word.d}${towers}"/><path fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" d="M${n(lx)} ${n(top)}Q${n(mx)} ${n(cy)} ${n(rx)} ${n(top)}"/>`,
    smallVb: `${n(X0 - 3)} ${n(top - 7)} ${n(X1 - X0 + 6)} ${n(-top + 10)}`,
  };
})();

/* 2. The Skyline: stems of the letters keep climbing, each to its own height, with stepped Art Deco tops. */
const towers = (() => {
  const tower = (x, h, w, steps = 2) => { let d = `M${n(x)} 0V${n(-h)}h${w}V0Z`; let y = -h, ix = x, iw = w; for (let i = 0; i < steps; i++) { ix += w * .18; iw -= w * .36; const sh = 9 - i * 2; d += `M${n(ix)} ${n(y + 1)}V${n(y - sh)}h${n(iw)}V${n(y + 1)}Z`; y -= sh; } return d; };
  const iCx = (bi.x1 + bi.x2) / 2;
  const add = tower(X0, CAP + 44, STEM) + tower(NR[0], CAP + 16, NR[1] - NR[0], 1) + tower(nR[0], CAP + 30, STEM2);
  // The i climbs too, with its dot as the beacon on top.
  const iStem = '';
  const dotR = 8.5, top = CAP + 12 + dotR * 2;
  const s = lockSub(33);
  const tallest = CAP + 44 + 9 + 7 + 6;
  return {
    vb: `${n(X0 - 3)} ${n(-Math.max(tallest, top) - 3)} ${n(X1 - X0 + 6)} ${n(Math.max(tallest, top) + 3 + 42)}`,
    art: (c, a) => `<path fill="${c}" d="${word.d}${add}${iStem}"/><circle cx="${n(iCx)}" cy="${n(-(CAP + 12) - dotR)}" r="${dotR}" fill="${a}"/><path fill="${c}" d="M${n(X0)} 4h${n(X1 - X0)}v3.500h-${n(X1 - X0)}Z"/><path fill="${c}" d="${s.d}"/>`,
  };
})();

/* 3. The Backdrop: the plain name, fully legible, standing in front of a skyline in your blue. */
const backdrop = (() => {
  const W = X1 - X0, b = [[-8, 24, 40], [17, 16, 66], [34, 21, 96], [56, 15, 58], [72, 25, 118], [98, 18, 76], [117, 22, 104], [140, 17, 62], [158, 26, 132], [185, 18, 84], [204, 22, 110], [227, 17, 70]];
  const f = W / 244;
  const bars = b.map(([x, w, h]) => `<rect x="${n(X0 + x * f + 4)}" y="${n(-h)}" width="${n(w * f)}" height="${h}"/>`).join('');
  const s = lockSub(36);
  return {
    vb: `${n(X0 - 6)} -138 ${n(W + 12)} ${138 + 48}`,
    art: (c, a) => `<g fill="${a}" opacity=".9">${bars}<path d="M${n(X0 + 158 * f + 4 + 13 * f)} -132V-146" stroke="${a}" stroke-width="2.500"/></g><path fill="${c}" stroke="var(--bk,#fff)" stroke-width="5" paint-order="stroke" stroke-linejoin="round" d="${word.d}"/><path fill="${c}" d="${s.d}"/>`,
  };
})();

/* 4. The Sign: a solid block of skyline with the name cut out of it, like a rooftop sign at dusk. */
const sign = (() => {
  const W = X1 - X0, B = 24, PAD = 14;
  const sky = `M${n(X0 - PAD)} ${B}V-96h24V-112h20V-82h30V-124h14v-12h22V-96h28V-146h6v-10h4v10h6V-102h26V-122h22V-90h26V-130h24V-76h${n(W + PAD * 2 - 252)}V${B}Z`;
  const s = set(MED, 'Creative Studio', X0 + center(W, 24.6), 40 + 16, 24.6, -0.012);
  return {
    vb: `${n(X0 - PAD - 3)} -162 ${n(W + PAD * 2 + 6)} ${162 + 66}`,
    art: (c, a, g) => `<path fill="${c}" fill-rule="evenodd" d="${sky}${word.d.replace(/Z/g, 'Z')}"/><path fill="${c}" d="${s.d}"/>`,
  };
})();

const plainFull = (() => { const a = set(BOLD, 'Nixon', 0, 0, 100, -0.03), b = set(MED, 'Creative Studio', a.end + 26, 0, 100, -0.03); return { d: a.d + b.d, w: b.end }; })();
const OPTS = [
  ['bridge', 'The Bridge', 'Your name starts and ends with an n, so those letters become the towers of the Roebling Suspension Bridge, and the cable spans the whole word. Only your name can do this.', bridge, 'My pick. It keeps the name fully readable, it is unmistakably Cincinnati, and a bridge is a good picture of connecting people to what they came for.'],
  ['towers', 'The Skyline', 'The stems of the letters keep climbing to different heights, with stepped Art Deco tops, and a beacon floats over the i. The word is the skyline.', towers, 'The most literal answer to your question, and the most striking big. It gets dense when small.'],
  ['backdrop', 'The Backdrop', 'The plain name stands in front of a skyline in your blue. Nothing about the letters changes.', backdrop, 'The easiest to read and the most flexible, but the least ownable, since any city could use it.'],
  ['sign', 'The Rooftop Sign', 'One solid block of skyline with your name cut out of it, like a sign on a roof at dusk.', sign, 'Bold and very different, and works as a stamp. Reads poorly at header size, so it would need the plain name beside it.'],
];
const svg = (o, c, a = '#2F3FE6', cls = '') => `<svg class="${cls}" viewBox="${o.vb}" role="img" aria-label="Nixon Creative Studio">${o.art(c, a)}</svg>`;
const smallSvg = (o, c, a = '#2F3FE6') => o.small ? `<svg viewBox="${o.smallVb}" role="img" aria-label="Nixon">${o.small(c)}</svg>` : svg(o, c, a);
const plainSvg = (c) => `<svg class="pw" viewBox="-2 -72 ${n(plainFull.w + 4)} 96" aria-hidden="true"><path fill="${c}" d="${plainFull.d}"/></svg>`;
fs.mkdirSync(HERE + 'svg', { recursive: true });
for (const [k, , , o] of OPTS) fs.writeFileSync(`${HERE}svg/${k}.svg`, svg(o, '#121211').replace('<svg class=""', '<svg xmlns="http://www.w3.org/2000/svg"').replace(/var\(--bk,#fff\)/g, '#fff'));
fs.writeFileSync(`${HERE}svg/bridge-small.svg`, smallSvg(bridge, '#121211').replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
const card = ([k, name, idea, o, note]) => `<article class="nm" data-k="${k}">
  <div class="tx"><h2>${name}</h2><p>${idea}</p><p class="nt">${note}</p></div>
  <div class="hero">${svg(o, '#121211')}</div>
  <div class="row"><div class="gd on-i" style="--bk:#121211">${svg(o, '#fff', k === 'backdrop' ? '#2F3FE6' : '#fff')}</div><div class="gd on-b" style="--bk:#2F3FE6">${svg(o, '#fff', k === 'backdrop' ? '#1B27A8' : '#fff')}</div></div>
  <div class="site"><span class="sz">In your site header</span><div class="hd">${o.small ? `<span class="smv">${smallSvg(o, '#121211')}</span>` : `<span class="full">${svg(o, '#121211')}</span>`}<span class="st"><b></b>Booking projects, Cincinnati</span></div></div>
</article>`;
fs.writeFileSync(HERE + 'index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Your name, stylized | Nixon Creative Studio</title><link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/deal/kit.css"><link rel="stylesheet" href="name.css"></head><body><main class="nmw">
<header class="nmh"><h1>Your name, <b>built like the city.</b></h1><p>Four ways to make the name itself the logo, all drawn on the real Hanken Grotesk letters. These are first drawings, for judging the idea.</p></header>
<div class="nmg">${OPTS.map(card).join('')}</div>
</main></body></html>
`);
fs.rmSync(TTF, { recursive: true, force: true });
console.log('built', { CAP: n(CAP), XH: n(XH), X1: n(X1), bN: [n(bN.x1), n(bN.x2)], bn: [n(bn.x1), n(bn.x2)], bi: [n(bi.x1), n(bi.x2), n(bi.y1)] });
