// Lead's own look: every route at desktop and phone, contact sheets of each, overflow and errors.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const LAB = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const OUT = LAB + '_sweep/'; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const { chromium } = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json')('playwright');
const FF = 'C:/Users/natha/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg';
const BASE = process.argv[2] || 'http://127.0.0.1:4610';
const R = { home: '/deal/', work: '/deal/work/', churches: '/deal/churches/', prices: '/deal/prices/', about: '/deal/about/', start: '/deal/start/', privacy: '/deal/privacy/', access: '/deal/accessibility/', colophon: '/deal/colophon/', 'x404': '/deal/404.html', stone: '/deal/study/stone-steps-50k/', mas: '/deal/study/mas-monograms/', academy: '/deal/study/presbyterian-academy/', tm: '/deal/study/theology-matters/', fbcm: '/deal/study/first-baptist-muncie/', reid: '/deal/study/reid-design/', frt: '/deal/study/foundation-for-reformed-theology/', burg: '/deal/study/first-presbyterian-orangeburg/' };
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
for (const [w, h, mobile, tag] of [[1440, 900, false, 'd'], [390, 844, true, 'm'], [320, 568, true, 'n']]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  for (const [name, url] of Object.entries(R)) {
    const p = await c.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
    p.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('404.html')) errs.push(r.status() + ' ' + r.url().slice(-48)); });
    await p.goto(BASE + url, { waitUntil: 'load' }); await p.waitForTimeout(1300);
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    const dock = await p.evaluate(() => { const d = document.querySelector('.dock')?.getBoundingClientRect(); return d ? [Math.round(d.left), Math.round(d.right)] : null; });
    if (tag !== 'n') {
      const shots = Math.min(8, Math.max(2, Math.ceil(H / h)));
      for (let i = 0; i < shots; i++) { await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), (H - h) * (i / (shots - 1))); await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}${name}-${tag}-${i}.jpg`, type: 'jpeg', quality: 50 }); }
      execFileSync(FF, ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${OUT}${name}-${tag}-%d.jpg`, '-vf', `scale=${tag === 'd' ? 480 : 195}:-1,tile=${tag === 'd' ? '4x2' : '8x1'}:padding=4:color=gray`, '-frames:v', '1', '-q:v', '4', `${OUT}sheet-${name}-${tag}.jpg`]);
    }
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    console.log(tag, name, 'H', H, sw > w ? 'OVERFLOW ' + sw : 'ok', dock && (dock[0] < 0 || dock[1] > w) ? 'DOCK ' + dock : '', errs.length ? 'ERR ' + errs.slice(0, 2).join(' | ') : '');
    await p.close();
  }
  await c.close();
}
await b.close();
