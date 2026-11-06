// Plays a window's footage in real Chrome and counts the frames actually presented per second.
import { createRequire } from 'node:module';
const { chromium } = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json')('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:4610';
const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
await p.goto(BASE + '/deal/work/', { waitUntil: 'load' });
await p.waitForTimeout(1500);
for (const slug of ['first-presbyterian-orangeburg', 'first-baptist-muncie', 'stone-steps-50k']) {
  const r = await p.evaluate(async (s) => {
    const t = document.querySelector('.tile[data-slug="' + s + '"]');
    t.scrollIntoView({ block: 'center', behavior: 'instant' }); await new Promise((ok) => setTimeout(ok, 700)); window.NCS.ui.play(t, true);
    const v = t.querySelector('video');
    await new Promise((ok) => { if (v.readyState >= 3) ok(); else v.addEventListener('canplay', ok, { once: true }); });
    v.currentTime = 2;
    await new Promise((ok) => v.addEventListener('seeked', ok, { once: true }));
    const start = v.getVideoPlaybackQuality().totalVideoFrames, dropped = v.getVideoPlaybackQuality().droppedVideoFrames;
    let n = 0, stop = false, seen = new Set();
    const tick = (_, m) => { n++; seen.add(m.mediaTime.toFixed(3)); if (!stop) v.requestVideoFrameCallback(tick); };
    v.requestVideoFrameCallback(tick);
    await new Promise((ok) => setTimeout(ok, 3000));
    stop = true;
    const q = v.getVideoPlaybackQuality();
    window.NCS.ui.play(t, false);
    return { slug: s, presentedPerSec: Math.round(n / 3), distinctPerSec: Math.round(seen.size / 3), decoded: q.totalVideoFrames - start, dropped: q.droppedVideoFrames - dropped, src: v.currentSrc.slice(-30) };
  }, slug);
  console.log(JSON.stringify(r));
}
await b.close();
