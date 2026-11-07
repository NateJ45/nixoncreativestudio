// Fresh browser each time, so each load is truly cold. Logs when the page's layout moves and where the windows settle.
import { createRequire } from 'node:module';
const { chromium } = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json')('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:4610';
const RUNS = +(process.argv[3] || 5);
let bad = 0;
for (let i = 0; i < RUNS; i++) {
  const b = await chromium.launch({ channel: 'chrome' });
  const c = await b.newContext({ viewport: { width: i % 2 ? 390 : 1280, height: i % 2 ? 844 : 800 }, isMobile: !!(i % 2), hasTouch: !!(i % 2) });
  const p = await c.newPage();
  await p.addInitScript(() => {
    window.__log = []; const t0 = performance.now(); let last = '';
    const tick = () => {
      const g = document.querySelector('[data-grid]'), s = document.querySelector('[data-space]');
      if (g && s) {
        const v = [Math.round(g.getBoundingClientRect().top + scrollY), Math.round(s.getBoundingClientRect().height), Math.round(document.querySelector('h1').getBoundingClientRect().height), Math.round(scrollY), Math.round(document.documentElement.scrollHeight)].join('/');
        if (v !== last) { window.__log.push(Math.round(performance.now() - t0) + 'ms grid/space/h1/scroll/doc=' + v); last = v; }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await p.goto(BASE + '/deal/', { waitUntil: 'load' });
  await p.waitForTimeout(3500);
  const r = await p.evaluate(() => { const t = [...document.querySelectorAll('.tile')].map((e) => e.getBoundingClientRect()); const sub = document.querySelector('.sub').getBoundingClientRect(); return { minTop: Math.round(Math.min(...t.map((x) => x.top))), maxBottom: Math.round(Math.max(...t.map((x) => x.bottom))), subBottom: Math.round(sub.bottom), h: innerHeight, log: window.__log }; });
  const ok = r.minTop >= r.subBottom - 40 && r.maxBottom > 0 && r.minTop < r.h;
  if (!ok) bad++;
  console.log(`run ${i} ${c ? (i % 2 ? 'phone' : 'desktop') : ''} ${ok ? 'ok' : 'STUCK'} top ${r.minTop} bottom ${r.maxBottom} sub ${r.subBottom}`);
  if (!ok) console.log('  ' + r.log.join('\n  '));
  await b.close();
}
console.log('stuck', bad, 'of', RUNS);
