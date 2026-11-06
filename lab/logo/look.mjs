// Screenshots the logo page, including an exact 8x enlargement of the 16 and 32 pixel renders, and checks overflow.
import { createRequire } from 'node:module';
const { chromium } = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json')('playwright');
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const BASE = process.argv[2] || 'http://127.0.0.1:4610';
const b = await chromium.launch({ channel: 'chrome' });
for (const [w, h, name, m] of [[1440, 900, 'd', false], [390, 844, 'm', true], [320, 568, 'n', true]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, reducedMotion: 'reduce' });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('response', (r) => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
  await p.goto(BASE + '/logo/', { waitUntil: 'load' }); await p.waitForTimeout(600);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(name, 'scrollWidth', sw, sw > w ? 'OVERFLOW' : 'ok', errs.join(' | '));
  if (name !== 'n') await p.screenshot({ path: `${HERE}_shot-${name}.jpg`, type: 'jpeg', quality: 72, fullPage: true });
  await c.close();
}
const c = await b.newContext({ viewport: { width: 400, height: 200 }, deviceScaleFactor: 1 });
const p = await c.newPage();
await p.goto(BASE + '/logo/', { waitUntil: 'load' });
await p.waitForTimeout(400);
const marks = await p.evaluate(() => [...document.querySelectorAll('.opt')].map((o) => o.dataset.k));
const shots = [];
for (const k of marks) for (const s of [16, 32]) {
  const el = p.locator(`.opt[data-k=${k}] .sizes span[style*="--s:${s}px"] svg`);
  shots.push([k, s, (await el.screenshot()).toString('base64')]);
}
await p.setViewportSize({ width: 1100, height: 760 });
await p.setContent(`<body style="margin:20px;background:#fff;font:14px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:20px">${shots.map(([k, s, d]) => `<div>${k} ${s}px<br><img style="image-rendering:pixelated;width:${s * 8}px" src="data:image/png;base64,${d}"></div>`).join('')}</body>`);
await p.waitForTimeout(200);
await p.screenshot({ path: `${HERE}_shot-small.png` });
await b.close();
