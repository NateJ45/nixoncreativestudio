// Films each live site at phone size, one exact frame at a time. Output: ../assets/<slug>-m.mp4 and -m.webp.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const { chromium, devices } = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json')('playwright');
const FF = 'C:/Users/natha/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg';
const SITES = {
  'stone-steps-50k': 'https://stonesteps50k.com',
  'mas-monograms': 'https://mas-monograms.com',
  'presbyterian-academy': 'https://www.presbyterianacademy.org',
  'theology-matters': 'https://theologymatters.com',
  'first-baptist-muncie': 'https://www.fbcmuncie.org',
  'reid-design': 'https://www.reiddesignllc.com',
  'foundation-for-reformed-theology': 'https://foundationrt.org',
  'first-presbyterian-orangeburg': 'https://www.1stpresbyterian.org',
};
const FPS = 24, SECONDS = 8;
const want = process.argv.slice(2);
const b = await chromium.launch();
for (const [slug, url] of Object.entries(SITES)) {
  if (want.length && !want.includes(slug)) continue;
  const dir = `${ROOT}assets/_f-m-${slug}/`;
  fs.mkdirSync(dir, { recursive: true });
  const c = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 760 }, deviceScaleFactor: 1.5, defaultBrowserType: undefined });
  const p = await c.newPage();
  try {
    await p.goto(url, { waitUntil: 'load', timeout: 60000 });
    await p.waitForTimeout(2500);
    const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const travel = Math.min(max, 2600);
    for (let y = 0; y <= travel; y += 300) { await p.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y); await p.waitForTimeout(200); }
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await p.waitForTimeout(900);
    await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
    const total = FPS * SECONDS;
    for (let f = 0; f < total; f++) {
      const e = 0.5 - 0.5 * Math.cos((f / total) * Math.PI * 2);
      await p.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), Math.round(e * travel));
      await p.screenshot({ path: `${dir}${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 88 });
    }
    execFileSync(FF, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${dir}%04d.jpg`, '-vf', 'scale=584:-2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'slow', '-movflags', '+faststart', '-an', `${ROOT}assets/${slug}-m.mp4`]);
    execFileSync(FF, ['-y', '-loglevel', 'error', '-i', `${dir}0000.jpg`, '-vf', 'scale=584:-2', '-q:v', '72', `${ROOT}assets/${slug}-m.webp`]);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(slug, 'travel', travel, Math.round(fs.statSync(`${ROOT}assets/${slug}-m.mp4`).size / 1024) + ' KB');
  } catch (e) { console.log(slug, 'FAILED', e.message.slice(0, 120)); }
  await c.close();
}
await b.close();
