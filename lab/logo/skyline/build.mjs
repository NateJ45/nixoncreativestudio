// Cincinnati N marks. Each has a full drawing and, where detail would die, a small-size drawing. Writes SVGs and the page.
import fs from 'node:fs';
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const INK = '#121211', BLUE = '#2F3FE6', LIT = 'var(--lit,#2F3FE6)';
const svg = (inner, vb = '0 0 120 120') => `<svg viewBox="${vb}" role="img" aria-label="N mark">${inner}</svg>`;
const f = (n) => +n.toFixed(2);

/* 1. The Roebling. Towers are the stems; half a span of main cable is the diagonal. */
const cableY = (x) => { const t = (x - 30) / (90 - 30); return 16 + (92 - 16) * Math.pow(t, 1.45); };
const cablePath = () => { let d = ''; for (let x = 30; x <= 90; x += 3) d += (d ? 'L' : 'M') + x + ' ' + f(cableY(x)); return d; };
const hangers = () => { let d = ''; for (let x = 36; x <= 78; x += 6) d += `M${x} ${f(cableY(x))}V96`; return d; };
const tower = (x) => `<path d="M${x - 15} 14h30v8h-3v74h3v12h-30v-12h3V22h-3Z"/><path fill="var(--g,#fff)" d="M${x - 8} 62V34a4 4 0 0 1 6.500 0V62Zm9.500 0V34a4 4 0 0 1 6.500 0V62Z"/>`;
const roebling = svg(`<g fill="currentColor">${tower(30)}${tower(90)}</g><path fill="none" stroke="currentColor" stroke-width="1.6" d="${hangers()}"/><path fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" d="${cablePath()}"/><path fill="currentColor" d="M30 94h60v4H30Z"/>`);
const roeblingS = svg(`<g fill="currentColor"><path d="M10 12h34v96H10Z"/><path d="M76 12h34v96H76Z"/></g><path fill="none" stroke="currentColor" stroke-width="20" d="M36 16C52 52 66 80 86 104"/>`);

/* 2. Two towers. Left steps back like the Carew Tower; right wears a crown hoop like the Great American Tower. */
const twoTowers = svg(`<g fill="currentColor"><path d="M10 110V40h5V28h5V18h14v10h5v12h3v70Z"/><path d="M78 110V44c0-8 16-8 32 0V110Z"/><path d="M38 34 88 110H60L18 46Z"/></g><path fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" d="M82 34C84 14 104 14 106 34"/><path fill="none" stroke="currentColor" stroke-width="2.500" d="M94 42V20"/>`);
const twoTowersS = svg(`<g fill="currentColor"><path d="M8 112V36h7V24h7V12h14v12h6v88Z"/><path d="M78 112V38c0-20 34-20 34 0v74Z"/><path d="M38 26 92 112H60L24 54Z"/></g>`);

/* 3. Lit windows. A tower at night, with the lit windows spelling N. Windows are pixels, so it is also the web. */
const NGRID = ['10001', '11001', '10101', '10011', '10001'];
const windows = (x0, y0, s, gap, r, litOnly) => { let o = ''; NGRID.forEach((row, j) => [...row].forEach((c, i) => { const on = c === '1'; if (litOnly && !on) return; o += `<rect x="${f(x0 + i * (s + gap))}" y="${f(y0 + j * (s + gap))}" width="${s}" height="${s}" rx="${r}" fill="${on ? LIT : 'var(--off,#fff)'}"${on ? '' : ' opacity=".2"'}/>`; })); return o; };
const lit = svg(`<path fill="var(--bld,currentColor)" d="M20 116V34h10V22h14V8h32v14h14v12h10v82Z"/>${windows(30, 40, 11, 4, 1.500)}<rect x="30" y="${40 + 5 * 15}" width="60" height="0" />`);
const litS = svg(`${windows(4, 4, 20, 4, 3, true).replace(/fill="[^"]*"/g, 'fill="currentColor"')}`, '0 0 120 120');

/* 4. The hidden N. A horizontal skyline where two towers and a slash of light spell the letter. */
const skyBars = [[0, 62, 12], [14, 48, 10], [26, 72, 12], [68, 66, 12], [82, 44, 12], [96, 60, 10], [108, 40, 12]];
const hidden = svg(`<g fill="currentColor">${skyBars.map(([x, h, w]) => `<rect x="${x}" y="${100 - h}" width="${w}" height="${h}"/>`).join('')}<path d="M40 100V10h26v90Z" opacity="0"/><rect x="40" y="10" width="11" height="90"/><rect x="55" y="10" width="11" height="90" opacity="0"/><rect x="72" y="10" width="11" height="90" opacity="0"/><rect x="88" y="0" width="0" height="0"/></g>`, '0 0 120 110');
const HIDDEN_W = 200;
const hiddenWide = svg(`<g fill="currentColor"><rect x="0" y="52" width="14" height="48"/><rect x="17" y="38" width="12" height="62"/><rect x="32" y="60" width="13" height="40"/><path d="M48 100V8h22v30l34-30h4v0L70 62v38Z" opacity="0"/><path d="M50 100V8h17v92Z"/><path d="M67 8h13l33 92H100Z"/><path d="M113 100V8h17v92Z"/><rect x="133" y="44" width="13" height="56"/><rect x="149" y="26" width="11" height="74"/><path d="M163 100V58l7-8 7 8v42Z"/><rect x="180" y="66" width="20" height="34"/></g><path fill="currentColor" d="M0 104h200v3H0Z"/><path fill="currentColor" opacity=".55" d="M18 111h40v2H18Zm64 0h60v2H82Zm-40 6h34v2H42Zm62 0h46v2h-46Z"/>`, `0 0 ${HIDDEN_W} 120`);
const hiddenS = svg(`<g fill="currentColor"><path d="M14 112V8h28v104Z"/><path d="M42 8h24l28 104H70Z"/><path d="M78 112V8h28v104Z"/></g>`);

/* 5. The Terminal. Union Terminal's great half dome with the fluted fan, and the N standing in its doorway. */
const fan = () => { let o = ''; for (let i = 0; i <= 12; i++) { const a = Math.PI * (i / 12), c = Math.cos(a), s = Math.sin(a); o += `M${f(60 + c * 34)} ${f(82 - s * 34)}L${f(60 + c * 52)} ${f(82 - s * 52)}`; } return o; };
const terminal = svg(`<path fill="currentColor" d="M4 82a56 56 0 0 1 112 0v6H4Z"/><path fill="none" stroke="var(--g,#fff)" stroke-width="2.500" d="${fan()}"/><path fill="var(--g,#fff)" d="M36 88V54h9l21 21V54h18v34h-9L54 67v21Z" transform="translate(-.5 0)"/><path fill="currentColor" d="M4 92h112v8H4Zm10 12h92v6H14Z"/>`);
const terminalS = svg(`<path fill="currentColor" d="M2 92a58 58 0 0 1 116 0v14H2Z"/><path fill="var(--g,#fff)" d="M30 106V46h17l27 34V46h16v60H74L47 72v34Z"/>`);

const MARKS = [
  ['roebling', 'The Roebling', 'The two stone towers of the Roebling Suspension Bridge are the stems, and half a span of cable falls between them as the diagonal. A bridge is a good picture of the job, too: connecting people to what they came for.', roebling, roeblingS, 'My pick. The only one where the N was already standing there.'],
  ['towers', 'Two Towers', 'The stems are skyline: a stepped Art Deco tower like Carew on the left, and a crowned tower like Great American on the right.', twoTowers, twoTowersS, 'The most literal skyline. Locals will spot it, but it gets busy.'],
  ['lit', 'Lit Windows', 'A downtown tower at night, with the lit windows spelling N. Windows are pixels, so it is the city and the web in one picture.', lit, litS, 'The cleverest idea. At 16 pixels it simplifies to a grid, which suits it.'],
  ['hidden', 'The Hidden N', 'A horizontal skyline over the river. Look again, and the tallest buildings are an N.', hiddenWide, hiddenS, 'Wide, so it works in a header or footer. Needs a separate small version.'],
  ['terminal', 'The Terminal', 'The half dome of Union Terminal, with its fan of ribs and the N standing in the doorway.', terminal, terminalS, 'The most loved building in town, and the most Art Deco of these.'],
];
fs.mkdirSync(HERE + 'svg', { recursive: true });
const flat = (s) => s.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" color="${INK}" `).split('currentColor').join(INK).replace(/var\(--[a-z]+,([^)]+)\)/g, (m, v) => v === 'currentColor' ? INK : v);
for (const [k, , , a, b] of MARKS) { fs.writeFileSync(`${HERE}svg/${k}.svg`, flat(a)); fs.writeFileSync(`${HERE}svg/${k}-small.svg`, flat(b)); }

const card = ([k, name, idea, big, small, note]) => `<article class="o" data-k="${k}">
  <h2>${name}</h2><p>${idea}</p><p class="n">${note}</p>
  <div class="big">${big}</div>
  <div class="row">
    <div class="g w">${big}</div>
    <div class="g i" style="--g:#121211;--off:#fff;--lit:#FFD34D">${big}</div>
    <div class="g b" style="--g:#2F3FE6;--off:#fff;--lit:#fff">${big}</div>
  </div>
  <div class="sm">${[48, 32].map((s) => `<span style="--s:${s}px">${big}<i>${s}</i></span>`).join('')}${[24, 16].map((s) => `<span style="--s:${s}px">${small}<i>${s}</i></span>`).join('')}<span class="tab"><b>${small}</b>Nixon Creative Studio</span></div>
</article>`;
fs.writeFileSync(HERE + 'index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Cincinnati N | Nixon Creative Studio</title><link rel="icon" href="data:,">
<link rel="stylesheet" href="/deal/kit.css"><link rel="stylesheet" href="skyline.css"></head><body><main class="sk">
<header class="sk-head"><h1>N, for <b>Cincinnati.</b></h1><p>Five ways your initial could come from the city. These are first drawings for judging the idea, not finished logos.</p></header>
<div class="grid">${MARKS.map(card).join('')}</div>
<!--GEMINI-->
</main></body></html>
`);
console.log('built', MARKS.map((m) => m[0]).join(' '));
