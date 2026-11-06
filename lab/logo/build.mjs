// Logo explorations. Outlines the letters from the real font, writes each option as SVG files and a page to judge them on.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const req = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json');
const opentype = req('opentype.js');
const load = (name) => { const b = fs.readFileSync(HERE + 'fonts/' + name); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const FACES = { 760: load('bricolage-760.ttf'), 480: load('bricolage-480.ttf') };
const INK = '#121211', BLUE = '#2F3FE6';

/* Set a line of real outlines with the font's own kerning. Returns SVG path data, width, and where each glyph starts. */
const setText = (text, { wght = 760, track = -0.03, size = 100 } = {}) => {
  const font = FACES[wght];
  // Glyph by glyph: the library's full shaper trips on this font's contextual substitutions.
  const k = size / font.unitsPerEm;
  const glyphs = [...text].map((ch) => font.charToGlyph(ch));
  let x = 0, d = '';
  const at = [];
  glyphs.forEach((g, i) => {
    at.push(x);
    // Written by hand: the library's own number formatting emits NaN for some values.
    const n = (v) => +v.toFixed(2);
    d += g.getPath(x, 0, size).commands.map((c) => c.type === 'Z' ? 'Z' : c.type === 'Q' ? `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}` : c.type === 'C' ? `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}` : `${c.type}${n(c.x)} ${n(c.y)}`).join('');
    const kern = glyphs[i + 1] ? (font.getKerningValue(g, glyphs[i + 1]) || 0) * k : 0;
    x += (g.advanceWidth || 0) * k + kern + track * size;
  });
  return { d, w: x - track * size, at, xh: font.tables.os2.sxHeight * k, cap: font.tables.os2.sCapHeight * k };
};

/* The marks, on a 64 grid, in currentColor so they can sit on any ground. */
const CUTS = 'M14 0H24L46 42V0H50A14 14 0 0 1 64 14V50A14 14 0 0 1 50 64H40L18 22V64H14A14 14 0 0 1 0 50V14A14 14 0 0 1 14 0Z';
const MARKS = {
  dealt: {
    name: 'The Hand',
    idea: 'Three phone windows, dealt into an N. It is the object your whole site is built around, so the logo and the homepage tell one story.',
    photo: 'Reads as cards or windows, not a camera. The photography stays in the work.',
    small: (id) => `<svg viewBox="0 0 64 64" role="img" aria-label="N mark"><defs><mask id="${id}"><rect width="64" height="64" fill="#000"/><rect x="1" y="4" width="17" height="56" rx="4" fill="#fff"/><rect x="46" y="4" width="17" height="56" rx="4" fill="#fff"/><rect x="18.5" y="-4" width="27" height="72" rx="7" transform="rotate(-27 32 32)" fill="#000"/><rect x="24" y="2" width="16" height="60" rx="4" transform="rotate(-27 32 32)" fill="#fff"/></mask></defs><rect width="64" height="64" fill="currentColor" mask="url(#${id})"/></svg>`,
    svg: (id) => `<svg viewBox="0 0 64 64" role="img" aria-label="N mark"><defs><mask id="${id}"><rect width="64" height="64" fill="#000"/><g class="p p1"><rect x="4" y="6" width="15" height="52" rx="4.5" fill="#fff"/></g><g class="p p3"><rect x="45" y="6" width="15" height="52" rx="4.5" fill="#fff"/></g><g class="p p2"><rect x="21" y="1" width="22" height="62" rx="7" transform="rotate(-27 32 32)" fill="#000"/><rect x="24.5" y="4" width="15" height="56" rx="4.5" transform="rotate(-27 32 32)" fill="#fff"/></g></mask></defs><rect width="64" height="64" fill="currentColor" mask="url(#${id})"/></svg>`,
  },
  cuts: {
    name: 'Two Cuts',
    idea: 'A phone-window tile with two clean cuts that leave an N, like shutter blades closing. The boldest of the set and the strongest at favicon size.',
    photo: 'The cuts nod to a shutter without drawing a camera.',
    svg: () => `<svg viewBox="0 0 64 64" role="img" aria-label="N mark"><path fill="currentColor" d="${CUTS}"/></svg>`,
  },
  crop: {
    name: 'Crop',
    idea: 'The stems are a photographer\u2019s crop corners, and the diagonal runs between them. Says "I frame things" as soon as you know to look.',
    photo: 'The most direct photography reference, and the lightest of the set when small.',
    svg: () => `<svg viewBox="0 0 64 64" role="img" aria-label="N mark" fill="currentColor"><path d="M6 11a4 4 0 0 1 8 0v39h13a4 4 0 0 1 0 8H10a4 4 0 0 1-4-4Z" transform="translate(0 -1)"/><path d="M58 53a4 4 0 0 1-8 0V14H37a4 4 0 0 1 0-8h17a4 4 0 0 1 4 4Z" transform="translate(0 1)"/><path d="M19.500 8.500a4.500 4.500 0 0 1 6.200 1.300l19 33.800a4.500 4.500 0 0 1-7.800 4.500l-19-33.800a4.500 4.500 0 0 1 1.600-6Z" transform="translate(0 3)"/></svg>`,
  },
  light: {
    name: 'The Light',
    idea: 'One line draws the N, and its last stem stops short under a dot. That makes it N and i together, the start of your name, and the dot keeps a thread from your current favicon.',
    photo: 'The dot works as a camera\u2019s record light and the site\u2019s "booking now" dot.',
    svg: () => `<svg viewBox="0 0 64 64" role="img" aria-label="N mark"><path fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" d="M11 54V12L51 53V30"/><circle class="dot" cx="51" cy="11" r="7.500" fill="var(--dot,${BLUE})"/></svg>`,
  },
};

const w1 = setText('n\u0131xon', { wght: 760, track: -0.035 });
const iX = w1.at[1];
const dotW = 15.5, iW = setText('\u0131', { wght: 760 }).w;
const windowDot = `<rect x="${(iX + (iW - dotW) / 2).toFixed(2)}" y="-${(w1.xh + 28).toFixed(2)}" width="${dotW}" height="22" rx="4.5" fill="var(--dot,${BLUE})"/>`;
const WORD_NIXON = (cls = '') => `<svg class="${cls}" viewBox="-2 -${(w1.xh + 30).toFixed(1)} ${(w1.w + 4).toFixed(1)} ${(w1.xh + 33).toFixed(1)}" role="img" aria-label="nixon"><path fill="currentColor" d="${w1.d}"/>${windowDot}</svg>`;
const full = (() => {
  const a = setText('Nixon', { wght: 760, track: -0.03 });
  const b = setText('Creative Studio', { wght: 480, track: -0.03 });
  const gap = 26;
  return { svg: (cls = '') => `<svg class="${cls}" viewBox="-2 -${(a.cap + 6).toFixed(1)} ${(a.w + gap + b.w + 4).toFixed(1)} ${(a.cap + 34).toFixed(1)}" role="img" aria-label="Nixon Creative Studio"><path fill="currentColor" d="${a.d}"/><g transform="translate(${(a.w + gap).toFixed(1)} 0)"><path fill="currentColor" d="${b.d}"/></g></svg>`, ratio: (a.w + gap + b.w + 4) / (a.cap + 34) };
})();

fs.mkdirSync(HERE + 'svg', { recursive: true });
for (const [k, m] of Object.entries(MARKS)) fs.writeFileSync(`${HERE}svg/mark-${k}.svg`, m.svg('m').replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" color="${INK}" `));
fs.writeFileSync(`${HERE}svg/mark-dealt-small.svg`, MARKS.dealt.small('m').replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" color="${INK}" `));
fs.writeFileSync(HERE + 'svg/word-nixon.svg', WORD_NIXON().replace('<svg class=""', `<svg xmlns="http://www.w3.org/2000/svg" color="${INK}"`));
fs.writeFileSync(HERE + 'svg/word-full.svg', full.svg().replace('<svg class=""', `<svg xmlns="http://www.w3.org/2000/svg" color="${INK}"`));

let uid = 0;
const mk = (k, s) => (s <= 24 && MARKS[k].small ? MARKS[k].small : MARKS[k].svg)('m' + uid++);
const card = (k, i) => {
  const m = MARKS[k];
  return `<article class="opt" data-k="${k}">
  <header><h2>${m.name}</h2><p>${m.idea}</p><p class="ph">${m.photo}</p></header>
  <button type="button" class="hero" data-replay aria-label="Replay the ${m.name} animation">${mk(k)}</button>
  <div class="grounds">
    <div class="g on-w">${mk(k)}</div>
    <div class="g on-i" style="--dot:#fff">${mk(k)}</div>
    <div class="g on-b" style="--dot:#fff">${mk(k)}</div>
  </div>
  <div class="sizes" aria-label="At small sizes">${[64, 32, 24, 16].map((s) => `<span style="--s:${s}px">${mk(k, s)}<i>${s}</i></span>`).join('')}</div>
  <div class="ctx">
    <div class="tab" aria-hidden="true"><span class="fav">${mk(k, 16)}</span><span>Nixon Creative Studio</span></div>
    <div class="bar"><span class="lock">${mk(k, 24)}${full.svg('fw')}</span><span class="st"><b></b>Booking projects</span></div>
    <div class="app" aria-hidden="true"><span class="ico i-b" style="--dot:#fff">${mk(k)}</span><span class="ico i-i" style="--dot:#fff">${mk(k)}</span><span class="ico i-w">${mk(k)}</span></div>
  </div>
</article>`;
};

fs.writeFileSync(HERE + 'index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Logo options | Nixon Creative Studio</title><link rel="icon" href="data:,">
<link rel="stylesheet" href="/deal/kit.css"><link rel="stylesheet" href="/logo/logo.css"></head><body>
<main class="lg">
<header class="lg-head"><h1>Four marks, <b>one name.</b></h1><p>Every option is a small mark for tight spots plus your full name beside it. Click any big mark to see how it moves. These are explorations, drawn to the same 64-unit grid, not finished artwork.</p></header>
<section class="words" aria-label="Wordmarks"><div><h2>Your name</h2><p>The name sets in Bricolage, the site's own typeface, heavy then light. Always the whole name, so it never reads as a watch brand.</p></div><div class="w-a">${full.svg('w-full')}</div><div class="w-b">${WORD_NIXON('w-short')}<p>A shorter option for later, once people know you: the dot of the i becomes a small phone window.</p></div></section>
<div class="opts">${Object.keys(MARKS).map(card).join('')}</div>
</main>
<script>
document.addEventListener('click',function(e){var b=e.target.closest('[data-replay]');if(!b)return;b.classList.remove('run');void b.offsetWidth;b.classList.add('run');});
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){var hs=document.querySelectorAll('[data-replay]'),io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('run');io.unobserve(x.target);}});},{threshold:.5});hs.forEach(function(h){io.observe(h);});}
</script></body></html>
`);
console.log('built', Object.keys(MARKS).join(' '), 'nixon width', Math.round(w1.w));
