// Adds the Gemini sheet to the board on first run, then screenshots it and checks overflow and font loading.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json')('playwright');
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const SRC = 'C:/Users/natha/.claude/projects/C--Users-natha-Documents-Claude-Projects-nixoncreativestudio/1ff06fb7-cddb-4497-bcf1-34d8c9eb67a4/tool-results/mcp-claude-in-chrome-blob-1794009323995-cq4pm2.png';
if (fs.existsSync(SRC)) fs.copyFileSync(SRC, HERE + 'symbols.png');
let t = fs.readFileSync(HERE + 'index.html', 'utf8');
if (t.includes('<div data-gemini></div>')) {
  t = t.replace('<div data-gemini></div>', `<h2 class="grp">A symbol instead of a letter</h2>
<img class="gem" src="symbols.png" width="707" height="395" alt="Twelve black ink symbols: a window with light falling through, a sun in a frame, a folded page, a contact sheet pattern, an abstract grid, a door ajar, a hand holding a card, a bird carrying a page, a thistle, a mountain path in a circle, an eye, a tree, and a spiral.">
<p class="gem-note">Gemini sketches, for ideas only. Whichever you like would be redrawn from scratch. Top row, left to right: window, sun, folded page, contact sheet, grid. Middle: door, hand, bird, thistle. Bottom: mountain path, eye, tree, spiral.</p>`);
  fs.writeFileSync(HERE + 'index.html', t);
}
const BASE = process.argv[2] || 'http://127.0.0.1:4610';
const b = await chromium.launch({ channel: 'chrome' });
for (const [w, h, n, m] of [[1440, 900, 'd', false], [390, 844, 'm', true], [320, 568, 'n', true]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('response', (r) => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url().slice(-40)); });
  await p.goto(BASE + '/logo/round2/', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, over: [...document.querySelectorAll('.c>:first-child')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className) }));
  console.log(n, r.sw, r.sw > w ? 'OVERFLOW' : 'ok', 'clipped:', r.over.join(',') || 'none', errs.join(' | '));
  if (n !== 'n') await p.screenshot({ path: `${HERE}_shot-${n}.jpg`, type: 'jpeg', quality: 72, fullPage: true });
  await c.close();
}
await b.close();
