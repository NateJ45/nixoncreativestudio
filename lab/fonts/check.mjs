// Three checks: does a cold first load of the homepage settle, does every pairing fit on phones, does the switcher work.
import { createRequire } from 'node:module';
const { chromium } = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json')('playwright');
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const BASE = process.argv[2] || 'http://127.0.0.1:4610';
const KEYS = ['current', 'editorial', 'fraunces', 'gloock', 'bodoni', 'syne', 'unbounded', 'geist'];
const state = (p) => p.evaluate(() => { const t = [...document.querySelectorAll('.tile')], r = t.map((e) => e.getBoundingClientRect()); const sub = document.querySelector('.sub').getBoundingClientRect(); return { n: t.length, minTop: Math.round(Math.min(...r.map((x) => x.top))), xSpan: Math.round(Math.max(...r.map((x) => x.right)) - Math.min(...r.map((x) => x.left))), subBottom: Math.round(sub.bottom), vis: document.visibilityState }; });
const b = await chromium.launch({ channel: 'chrome' });
for (let run = 0; run < 2; run++) {
  const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await c.newPage();
  const t0 = Date.now();
  await p.goto(BASE + '/deal/', { waitUntil: run ? 'load' : 'networkidle' });
  for (const w of [0, 800, 2000, 4000]) { await p.waitForTimeout(w ? w - (Date.now() - t0 > w ? 0 : 0) : 0); console.log('cold', run, Date.now() - t0 + 'ms', JSON.stringify(await state(p))); }
  await c.close();
}
for (const [w, h] of [[390, 844], [320, 568]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  for (const k of KEYS) {
    const p = await c.newPage();
    await p.goto(`${BASE}/deal/?type=${k}`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const over = [...document.querySelectorAll('h1 .w, .end h2, .end h2 span, .cap b, .price strong')].filter((e) => { const x = e.getBoundingClientRect(); return x.right > innerWidth + 1 || x.left < -1; }).length; return { sw: document.documentElement.scrollWidth, over, h1: Math.round(document.querySelector('h1').getBoundingClientRect().height) }; });
    if (r.sw > w || r.over) console.log('PHONE PROBLEM', w, k, JSON.stringify(r)); else if (w === 320) console.log('ok 320', k, 'h1', r.h1);
    await p.close();
  }
  const p = await c.newPage();
  await p.goto(BASE + '/fonts/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  console.log('switcher', w, 'scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth));
  if (w === 390) { await p.locator('[data-k=fraunces]').tap(); await p.waitForTimeout(1800); await p.screenshot({ path: HERE + '_switch-m.jpg', type: 'jpeg', quality: 70 }); }
  await c.close();
}
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
await p.goto(BASE + '/fonts/', { waitUntil: 'networkidle' });
for (const k of ['editorial', 'unbounded']) {
  await p.locator(`[data-k=${k}]`).click(); await p.waitForTimeout(2200);
  const fr = p.frames().find((f) => f !== p.mainFrame());
  console.log('switch to', k, fr.url().slice(-22), await fr.evaluate(() => getComputedStyle(document.querySelector('h1')).fontFamily), 'pressed', await p.locator(`[data-k=${k}]`).getAttribute('aria-pressed'));
}
await p.screenshot({ path: HERE + '_switch-d.jpg', type: 'jpeg', quality: 72 });
const q = await c.newPage();
await q.goto(BASE + '/deal/?type=bodoni', { waitUntil: 'networkidle' }); await q.waitForTimeout(1500);
await q.evaluate(() => { const e = document.querySelector('.quote'); window.scrollTo({ top: e.getBoundingClientRect().top + scrollY - 340, behavior: 'instant' }); }); await q.waitForTimeout(500);
await q.screenshot({ path: HERE + '_bodoni.jpg', type: 'jpeg', quality: 80 });
await b.close();
