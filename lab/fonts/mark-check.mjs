// Enlarges the favicon at real sizes and shoots the top of the page on light, client-color and phone views.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json')('playwright');
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const BASE = process.argv[2] || 'http://127.0.0.1:4610';
const b = await chromium.launch({ channel: 'chrome' });
const c = await b.newContext({ viewport: { width: 1000, height: 700 } });
const p = await c.newPage();
const fav = await p.request.get(BASE + '/assets/brand/favicon.svg');
console.log('favicon', fav.status(), fav.headers()['content-type']);
const word = await p.request.get(BASE + '/assets/brand/wordmark.svg');
console.log('wordmark', word.status(), word.headers()['content-type']);
const shots = [];
await p.setViewportSize({ width: 200, height: 200 });
for (const s of [16, 32, 64]) { await p.setContent(`<body style="margin:0;background:#DEE1E6"><img src="${BASE}/assets/brand/favicon.svg" width="${s}" height="${s}" style="display:block"></body>`, { waitUntil: 'networkidle' }); shots.push([s, (await p.screenshot({ clip: { x: 0, y: 0, width: s, height: s } })).toString('base64')]); }
await p.setViewportSize({ width: 1000, height: 700 });
await p.setContent(`<body style="margin:24px;background:#fff;font:14px sans-serif"><div style="display:flex;gap:24px;align-items:flex-start">${shots.map(([s, d]) => `<div>${s}px, 6x<br><img style="image-rendering:pixelated;width:${s * 6}px" src="data:image/png;base64,${d}"></div>`).join('')}</div><div style="margin-top:24px">Outlined wordmark<br><img src="${BASE}/assets/brand/wordmark.svg" style="height:56px;margin-top:8px;display:block"><img src="${BASE}/assets/brand/wordmark.svg" style="height:18px;margin-top:16px;display:block"></div><div style="margin-top:24px;background:${'#2F3FE6'};padding:18px;width:max-content"><img src="${BASE}/assets/brand/wordmark-white.svg" style="height:30px;display:block"></div></body>`, { waitUntil: 'networkidle' });
await p.screenshot({ path: HERE + '_mark-a.png' });
for (const [u, n, w, h, m] of [['/deal/', 'home', 1280, 240, false], ['/deal/study/stone-steps-50k/', 'study', 1280, 240, false], ['/deal/', 'phone', 320, 140, true]]) {
  const d = await b.newContext({ viewport: { width: w, height: 568 }, isMobile: m, hasTouch: m });
  const q = await d.newPage();
  const icon = [];
  q.on('response', (r) => { if (r.url().includes('favicon')) icon.push(r.status()); });
  await q.goto(BASE + u, { waitUntil: 'networkidle' }); await q.waitForTimeout(900);
  console.log(n, 'icon link', await q.evaluate(() => document.querySelector('link[rel=icon]').getAttribute('href')), 'mark', await q.evaluate(() => { const e = document.querySelector('.mark'); const r = e.getBoundingClientRect(); return [e.textContent, Math.round(r.right), getComputedStyle(e.querySelector('b')).fontWeight]; }));
  await q.screenshot({ path: `${HERE}_mark-${n}.png`, clip: { x: 0, y: 0, width: w, height: h } });
  await d.close();
}
await b.close();
