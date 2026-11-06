// Lead's own look at each direction: scroll stops, a smooth real-wheel scroll, fps, video, errors.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const { chromium } = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json')('playwright');
const OUT = ROOT + '_review/'; fs.mkdirSync(OUT, { recursive: true });
const BASE = process.argv[2] || 'http://127.0.0.1:4610';
const names = (process.argv[3] || 'ribbon,flythrough,liquid,poster').split(',');
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
for (const n of names) for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 140)));
  p.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('favicon')) errs.push(r.status() + ' ' + r.url().slice(-50)); });
  await p.goto(`${BASE}/${n}/`, { waitUntil: 'load' });
  await p.waitForTimeout(3000);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  const stops = [0, 0.06, 0.14, 0.22, 0.32, 0.45, 0.6, 0.75, 0.88, 1];
  for (let i = 0; i < stops.length; i++) {
    await p.evaluate((y) => window.scrollTo(0, y), (H - h) * stops[i]);
    await p.waitForTimeout(1100);
    await p.screenshot({ path: `${OUT}${n}-${w}-${String(i).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 55 });
  }
  const m = await p.evaluate(async () => { let f = 0; const t0 = performance.now(); await new Promise((r) => { const s = () => { f++; performance.now() - t0 < 1500 ? requestAnimationFrame(s) : r(); }; requestAnimationFrame(s); }); return { fps: Math.round(f / 1.5), playing: [...document.querySelectorAll('video')].filter((v) => !v.paused && v.readyState > 1).length, sw: document.documentElement.scrollWidth, iw: innerWidth, h: document.documentElement.scrollHeight, kb: Math.round(performance.getEntriesByType('resource').reduce((a, e) => a + (e.transferSize || 0), 0) / 1024) }; });
  console.log(n, w, JSON.stringify(m), errs.length ? 'ERR ' + errs.slice(0, 2).join(' | ') : 'clean');
  await c.close();
}
await b.close();
// Contact sheets, so each direction can be judged at a glance.
const FF = 'C:/Users/natha/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg';
const { execFileSync } = await import('node:child_process');
for (const n of names) {
  execFileSync(FF, ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${OUT}${n}-1440-%02d.jpg`, '-vf', 'scale=480:-1,tile=4x3:padding=4', '-frames:v', '1', '-q:v', '4', `${OUT}sheet-${n}-d.jpg`]);
  execFileSync(FF, ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${OUT}${n}-390-%02d.jpg`, '-vf', 'scale=195:-1,tile=10x1:padding=3', '-frames:v', '1', '-q:v', '4', `${OUT}sheet-${n}-m.jpg`]);
}
