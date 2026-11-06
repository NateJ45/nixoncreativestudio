// Shoots each big mark partway through its animation and at rest, tiled for review.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const { chromium } = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json')('playwright');
const FF = 'C:/Users/natha/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg';
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const b = await chromium.launch({ channel: 'chrome' });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto((process.argv[2] || 'http://127.0.0.1:4610') + '/logo/', { waitUntil: 'load' });
await p.waitForTimeout(500);
let n = 0;
for (const k of ['dealt', 'cuts', 'crop', 'light']) {
  const hero = p.locator(`.opt[data-k=${k}] .hero`);
  await hero.scrollIntoViewIfNeeded();
  await p.waitForTimeout(1500);
  // Freeze the animations at exact times so the frames do not depend on screenshot speed.
  await hero.evaluate((h) => { h.classList.remove('run'); void h.offsetWidth; h.classList.add('run'); });
  for (const t of [120, 300, 520, 2000]) {
    await hero.evaluate((h, ms) => h.getAnimations({ subtree: true }).forEach((a) => { a.pause(); a.currentTime = ms; }), t);
    await hero.screenshot({ path: `${HERE}_shot-m${n++}.png` });
  }
}
await b.close();
execFileSync(FF, ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${HERE}_shot-m%d.png`, '-vf', 'scale=170:-1,tile=4x4:padding=6:color=gray', '-frames:v', '1', `${HERE}_shot-motion.png`]);
