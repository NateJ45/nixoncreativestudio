// Close-up comparison of the clean group: headline, then prices and quote. Also checks phones and overflow for each.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const { chromium } = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json')('playwright');
const FF = 'C:/Users/natha/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg';
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const OUT = HERE + '_shots/'; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT);
const BASE = process.argv[2] || 'http://127.0.0.1:4610';
const opts = fs.readFileSync(HERE + 'options.js', 'utf8');
const KEYS = [...opts.matchAll(/\{ key: '([a-z]+)', name: '([^']+)'[^\n]*group: 'clean'/g)].map((m) => [m[1], m[2]]);
console.log('options', KEYS.length);
const b = await chromium.launch({ channel: 'chrome' });
const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
const LBL = '.lbl{position:fixed;right:80px;top:50px;z-index:99;padding:.45rem .8rem;background:#121211;color:#fff;font:600 19px/1.2 Arial,sans-serif}.top{visibility:hidden}';
let n = 0, m = 0;
for (const [k, name] of KEYS) {
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('response', (r) => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url().slice(-40)); });
  await p.goto(`${BASE}/deal/?type=${k}`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1200);
  const fam = await p.evaluate(() => { const f = getComputedStyle(document.querySelector('h1')).fontFamily.split(',')[0]; return { f, ok: document.fonts.check('500 40px ' + f), body: getComputedStyle(document.body).fontFamily.split(',')[0] }; });
  console.log(k, fam.f, 'loaded', fam.ok, 'body', fam.body, errs.join(' | '));
  await p.addStyleTag({ content: LBL });
  await p.evaluate((t) => { const d = document.createElement('div'); d.className = 'lbl'; d.textContent = t; document.body.appendChild(d); }, name);
  await p.screenshot({ path: `${OUT}a${String(n++).padStart(2, '0')}.png`, clip: { x: 80, y: 50, width: 1120, height: 310 } });
  await p.evaluate(() => { const q = document.querySelector('.quote'); window.scrollTo({ top: q.getBoundingClientRect().top + scrollY - 300, behavior: 'instant' }); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}b${String(m++).padStart(2, '0')}.png`, clip: { x: 0, y: 40, width: 1280, height: 660 } });
  await p.close();
}
for (const [w, h] of [[390, 844], [320, 568]]) {
  const d = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  for (const [k] of KEYS) {
    const p = await d.newPage();
    await p.goto(`${BASE}/deal/?type=${k}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, over: [...document.querySelectorAll('h1 .w,.end h2,.cap b,.price strong,.dock a')].filter((e) => { const x = e.getBoundingClientRect(); return x.right > innerWidth + 1 || x.left < -1; }).length }));
    if (r.sw > w || r.over) console.log('PHONE PROBLEM', w, k, JSON.stringify(r));
    await p.close();
  }
  const p = await d.newPage();
  await p.goto(BASE + '/fonts/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  console.log('switcher', w, await p.evaluate(() => document.documentElement.scrollWidth));
  if (w === 390) await p.screenshot({ path: HERE + '_switch-m.jpg', type: 'jpeg', quality: 70 });
  await d.close();
}
const s = await b.newContext({ viewport: { width: 1440, height: 900 } });
const q = await s.newPage();
await q.goto(BASE + '/fonts/', { waitUntil: 'networkidle' }); await q.waitForTimeout(1500);
await q.screenshot({ path: HERE + '_switch-d.jpg', type: 'jpeg', quality: 72 });
await b.close();
execFileSync(FF, ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${OUT}a%02d.png`, '-vf', 'scale=840:-1,tile=2x5:padding=8:color=white', '-frames:v', '1', '-q:v', '2', `${HERE}_close-head.jpg`]);
execFileSync(FF, ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${OUT}b%02d.png`, '-vf', 'scale=640:-1,tile=3x3:padding=6:color=white', '-frames:v', '1', '-q:v', '3', `${HERE}_close-body.jpg`]);
console.log('done');
