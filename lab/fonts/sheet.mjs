// Shoots the homepage in each pairing, top and lower, labels them, and tiles a comparison. Also checks overflow and font loading.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const { chromium } = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json')('playwright');
const FF = 'C:/Users/natha/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg';
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const OUT = HERE + '_shots/'; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT);
const BASE = process.argv[2] || 'http://127.0.0.1:4610';
const src = fs.readFileSync(HERE + 'options.js', 'utf8');
const KEYS = [...src.matchAll(/key: '([a-z]+)', name: '([^']+)'/g)].map((m) => [m[1], m[2]]);
const b = await chromium.launch({ channel: 'chrome' });
const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
let n = 0;
for (const [k, name] of KEYS) {
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('response', (r) => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url().slice(-40)); });
  await p.goto(`${BASE}/deal/?type=${k}`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1800);
  const info = await p.evaluate(() => ({ h1: getComputedStyle(document.querySelector('h1')).fontFamily.split(',')[0], loaded: document.fonts.check('500 40px ' + getComputedStyle(document.querySelector('h1')).fontFamily.split(',')[0]), sw: document.documentElement.scrollWidth, h: document.querySelector('h1').getBoundingClientRect().height }));
  console.log(k, info.h1, 'loaded', info.loaded, 'h1 height', Math.round(info.h), info.sw > 1280 ? 'OVERFLOW' : 'ok', errs.join(' | '));
  await p.addStyleTag({ content: `.lbl{position:fixed;left:0;top:0;z-index:99;padding:.5rem .9rem;background:#121211;color:#fff;font:600 20px/1.2 Arial,sans-serif}` });
  await p.evaluate((t) => { const d = document.createElement('div'); d.className = 'lbl'; d.textContent = t; document.body.appendChild(d); }, name);
  await p.screenshot({ path: `${OUT}${String(n++).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 82 });
  await p.evaluate(() => { const q = document.querySelector('.quote'); window.scrollTo({ top: q.getBoundingClientRect().top + scrollY - 340, behavior: 'instant' }); });
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}${String(n++).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 82 });
  await p.close();
}
await b.close();
execFileSync(FF, ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${OUT}%02d.jpg`, '-vf', 'scale=640:-1,tile=4x4:padding=6:color=white', '-frames:v', '1', '-q:v', '3', `${HERE}_compare.jpg`]);
console.log(HERE + '_compare.jpg');
