// Screenshots the Cincinnati board at three sizes and checks overflow.
import { createRequire } from 'node:module';
const { chromium } = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json')('playwright');
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const BASE = process.argv[2] || 'http://127.0.0.1:4610';
const b = await chromium.launch({ channel: 'chrome' });
for (const [w, h, n, m] of [[1440, 900, 'd', false], [390, 844, 'm', true], [320, 568, 'n', true]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('response', (r) => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url().slice(-40)); });
  await p.goto(BASE + '/logo/skyline/', { waitUntil: 'load' }); await p.waitForTimeout(500);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(n, sw, sw > w ? 'OVERFLOW' : 'ok', errs.join(' | '));
  if (n === 'd') await p.screenshot({ path: `${HERE}_shot-d.jpg`, type: 'jpeg', quality: 78, fullPage: true });
  await c.close();
}
await b.close();
