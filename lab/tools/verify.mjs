// Axe on every route, every client sheet, dock text size, and Start's Next button against the menu.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const req = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json');
const { chromium } = req('playwright');
const axe = fs.readFileSync(req.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.argv[2] || 'http://127.0.0.1:4610';
const R = ['/deal/', '/deal/work/', '/deal/churches/', '/deal/prices/', '/deal/about/', '/deal/start/', '/deal/privacy/', '/deal/accessibility/', '/deal/colophon/', '/deal/404.html', ...['stone-steps-50k', 'mas-monograms', 'presbyterian-academy', 'theology-matters', 'first-baptist-muncie', 'reid-design', 'foundation-for-reformed-theology', 'first-presbyterian-orangeburg'].map((s) => '/deal/study/' + s + '/')];
const run = (p) => p.evaluate(async (src) => { if (!window.axe) (0, eval)(src); const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'], rules: { 'label-content-name-mismatch': { enabled: true }, 'aria-hidden-focus': { enabled: true } } }); return r.violations.map((v) => v.id + ' x' + v.nodes.length + ' ' + v.nodes[0].target.join(' ') + ' ' + (v.nodes[0].any[0]?.data?.contrastRatio || '')); }, axe);
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
let bad = 0;
for (const [w, h, m] of [[1440, 900, false], [320, 568, true]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, reducedMotion: 'reduce' });
  for (const u of R) {
    const p = await c.newPage(); await p.goto(BASE + u, { waitUntil: 'load' }); await p.waitForTimeout(500);
    const v = await run(p); if (v.length) { bad++; console.log(w, u, v.join(' | ')); }
    await p.close();
  }
  const p = await c.newPage(); await p.goto(BASE + '/deal/work/', { waitUntil: 'load' }); await p.waitForTimeout(500);
  const slugs = await p.evaluate(() => [...new Set([...document.querySelectorAll('.tile[data-slug]')].map((t) => t.dataset.slug))]);
  for (const s of slugs) {
    await p.evaluate((x) => { const N = window.NCS; N.ui.openSheet(N.ui.bySlug(x), document.querySelector('.tile[data-slug="' + x + '"]')); }, s);
    await p.waitForTimeout(900);
    const v = await run(p); const f = await p.evaluate(() => document.activeElement.textContent);
    if (v.length || f !== 'Back to the work') { bad++; console.log(w, 'sheet', s, 'focus=' + f, v.join(' | ')); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  }
  await p.goto(BASE + '/deal/start/', { waitUntil: 'load' }); await p.waitForTimeout(500);
  console.log(w, await p.evaluate(() => { const d = document.querySelector('.dock').getBoundingClientRect(), n = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Next' && x.offsetParent).getBoundingClientRect(); return { dockTop: Math.round(d.top), dockWidth: Math.round(d.width), nextBottom: Math.round(n.bottom), dockFont: getComputedStyle(document.querySelector('.dock a')).fontSize, endOver: 0 }; }));
  await p.goto(BASE + '/deal/', { waitUntil: 'load' });
  console.log(w, 'chip over', await p.evaluate(() => { const e = document.querySelector('.end').getBoundingClientRect(); return [...document.querySelectorAll('.end .chip')].map((x) => { const r = x.getBoundingClientRect(); return Math.round(Math.max(e.left - r.left, r.right - e.right)); }).join(','); }));
  await c.close();
}
await b.close(); console.log('problems', bad);
