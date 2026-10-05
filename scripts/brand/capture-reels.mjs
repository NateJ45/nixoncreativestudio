// =============================================================================
// capture-reels.mjs: the home page's live clips (public/reel/home/).
// =============================================================================
// Safe to edit. Short directed clips of what really moves on each client site, for the
// centre frame of the hero reel and the proof sheet. One desktop clip (16:10) and one phone
// clip (4:5, the hero stills' own crop) per site, each a seamless 6 to 9 s loop of muted
// VP9 WebM, with a WebP poster that is the exact first frame, and public/reel/home/
// manifest.json describing them (the hero reads it at build time).
//
//   node scripts/brand/capture-reels.mjs               every site, both cuts
//   node scripts/brand/capture-reels.mjs ss-home       one site
//   node scripts/brand/capture-reels.mjs ss-home d     one cut
//   REUSE=1 node scripts/brand/capture-reels.mjs ...   re-encode the last capture only
//
// About 1 to 2 minutes per clip. Needs the Playwright Chromium the repo already uses; no
// ffmpeg and no extra package (encoding is WebCodecs in Chromium, reel-encoder.html).
// Work files go to node_modules/.cache/nx-reels/ (decoded review frames in review/: LOOK
// at them before committing new clips).
//
// Safety: read-only. Every non-GET request from the page is aborted (reel-director.mjs),
// so no form can be submitted, no analytics fire, and nothing is written anywhere. The
// clips type into fields and press real buttons and toggles, never Send or Submit. FBCM is
// captured from its workers.dev build, never from www.fbcmuncie.org (still the old site).
//
// Live sites change: re-run this when a client edits a page the clips show, then check the
// review frames and the byte caps (desktop 260 KB, phone 160 KB, enforced by
// src/lib/reelManifest.test.ts). Shot lists are below, one per site; the camera, cursor
// and clock are in reel-director.mjs. Notes: docs/redesign-2026/reels-notes.md.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { launch, open, FPS } from './reel-director.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'public', 'reel', 'home');
const WORK = path.join(ROOT, 'node_modules', '.cache', 'nx-reels');
const MANIFEST = path.join(OUT, 'manifest.json');
const ENCODER = path.join(ROOT, 'scripts', 'brand', 'reel-encoder.html');

/** Output size and byte cap per cut. Desktop 16:10, phone 390x488 (the 1170x1464 still's 4:5). */
const SPEC = {
  d: { W: 960, H: 600, cap: 260 * 1024, fps: 24 },
  m: { W: 390, H: 488, cap: 160 * 1024, fps: 24 },
};
const FBCM = 'https://fbcm-site.nathanjnixon86.workers.dev/';

// -----------------------------------------------------------------------------
// The shot lists. Each receives a director `d` (reel-director.mjs) and the cut ('d'|'m').
// Keys are the hero reel slide ids in src/lib/homeWork.ts (the clip sits over that
// slide's still, so every clip opens on the still's own framing: the top of the page).
// -----------------------------------------------------------------------------
export const SITES = {
  'ss-home': {
    site: 'Stone Steps 50K',
    title: 'The course map, the race clock and the records board',
    url: 'https://stonesteps50k.com/',
    status: 'live',
    moves:
      'The race clock ticks, then the course map runs its loop; the cursor picks the short loop and the map redraws, then the records board.',
    facts: [
      'The race clock counts down live on the home page.',
      'The course map runs both loops: the long loop is 5.3 miles, the short loop 3.2.',
      'The records board lists the course records, name, time and year.',
    ],
    async shoot(d, cut) {
      const desk = cut === 'd';
      await d.hold(0.7);
      // the clock: scroll to it and push in while it ticks
      const ck = await d.must('.clock');
      if (desk) {
        // a cut, not a scroll: a fast scroll over the hero video costs a third of the budget
        await d.setScroll(ck.top - 300);
        const c = await d.must('.clock');
        await d.setScroll(0);
        await d.cut(ck.top - 300, 0.35, { x: c.x - 30, y: c.y - 70, w: c.w + 90, h: c.h + 140 });
        await d.hold(1.3);
      } else {
        await d.cut(ck.top - 150, 0.45);
        const c = await d.must('.clock');
        await d.camTo({ x: c.x - 40, y: c.y - 60, w: c.w + 80, h: c.h + 120 }, 0.6);
        await d.hold(0.8);
      }
      // the course map: the dot is running the long loop; pick the short loop
      const plate = await d.must('.ctease__plate');
      if (desk) {
        const map = await d.must('.ctease');
        await d.cut(map.top + (map.h - 750) / 2, 0.45, { x: 0, y: 0, w: 1200, h: 750 });
        await d.hold(0.7);
        await d.moveToEl('.ctease__lap--short', 0.75, 0.4, 0.5);
        await d.click();
        d.mark('click');
        await d.hold(1.3);
        await d.cursorOut(0.25);
      } else {
        await d.cut(plate.top - 16, 0.45, { x: 0, y: 0, w: 390, h: 488 });
        await d.hold(0.6);
        const sh = await d.must('.ctease__lap--short');
        await d.camTo({ x: 0, y: sh.y + sh.h + 24 - 488, w: 390, h: 488 }, 0.7);
        await d.moveToEl('.ctease__lap--short', 0.25);
        await d.click();
        d.mark('click');
        await d.hold(0.35);
        await d.cursorOut(0.2);
        await d.camTo({ x: 0, y: 0, w: 390, h: 488 }, 0.7);
        await d.hold(0.7);
      }
      // the records board
      const board = await d.must('.board');
      await d.cut(board.top - (desk ? 200 : 60), 0.45, {
        x: 0,
        y: 0,
        w: d.spec.fw,
        h: d.spec.fh,
      });
      await d.hold(0.9);
      void plate;
    },
  },

  'rd-home': {
    site: 'Reid Design',
    title: 'The concept room fills in, then the walls repaint',
    url: 'https://reiddesignllc.com/',
    status: 'live',
    moves:
      'Scrolling fills the concept room piece by piece; the cursor picks Sage and the walls repaint.',
    facts: [
      'The concept room on the home page fills in as you scroll.',
      'Five wall colours to try: As it is, Sage, Clay, Lake and Espresso.',
    ],
    async shoot(d, cut) {
      const desk = cut === 'd';
      await d.hold(0.7);
      // the pinned track: scrolling through it is what fills the room
      const g = await d.page.evaluate(() => {
        const t = document.querySelector('[data-room-track]');
        const s = document.querySelector('[data-room-stage]');
        const n = parseFloat(getComputedStyle(s).top) || 0;
        const b = t.getBoundingClientRect();
        return { top: b.top + scrollY, h: b.height, sh: s.offsetHeight, n };
      });
      const S0 = Math.round(g.top - g.n);
      const S1 = Math.round(g.top - g.n + (g.h - g.sh));
      await d.cut(S0, 0.45);
      if (!desk) {
        const f = await d.must('[data-room-figure]');
        await d.camTo({ x: 0, y: f.y - 8, w: 390, h: 488 }, 0.01);
      }
      await d.hold(0.3);
      await d.scroll(S1, 3.4);
      await d.hold(0.3);
      const sw = await d.must('[data-swatch]:has-text("Sage")');
      if (!desk) {
        await d.camTo({ x: 0, y: sw.y + sw.h + 30 - 488, w: 390, h: 488 }, 0.7);
      }
      await d.moveToEl('[data-swatch]:has-text("Sage")', desk ? 0.8 : 0.25);
      await d.click();
      d.mark('click');
      await d.hold(desk ? 1.2 : 0.4);
      await d.cursorOut(0.25);
      if (!desk) {
        const f = await d.must('[data-room-figure]');
        await d.camTo({ x: 0, y: f.y - 8, w: 390, h: 488 }, 0.7);
        await d.hold(0.7);
      }
    },
  },

  'frt-home': {
    site: 'Foundation for Reformed Theology',
    title: 'Browsing and searching the library',
    url: 'https://foundationrt.org/',
    resultsUrl: 'https://foundationrt.org/?s=Calvin',
    status: 'live',
    moves:
      'The library menu opens; the cursor types Calvin into the library search, and the results page for Calvin follows.',
    facts: [
      'The library menu browses by resource, topic or author.',
      'A library search for Calvin finds 175 matches, with filters for type, topic, person and era.',
    ],
    async shoot(d, cut) {
      const desk = cut === 'd';
      await d.hold(0.7);
      if (desk) {
        // push in on the header's right half: the menu and the search box at a readable size
        await d.camTo({ x: 392, y: 0, w: 808, h: 505 }, 0.75);
        await d.moveToEl('button.frt-browse-trigger:has-text("Library")', 0.75);
        await d.click();
        d.mark('menu');
        await d.hold(0.8);
        await d.moveToEl('header input[type=search]', 0.7, 0.3, 0.5);
        await d.click();
      } else {
        await d.moveToEl('button.bricks-mobile-menu-toggle');
        await d.click();
        d.mark('menu');
        await d.hold(1.0);
        await d.moveToEl('input[type=search]', 0.25, 0.3, 0.5);
        await d.click();
      }
      await d.cursorOut(0.15);
      await d.type('Calvin', 0.12);
      d.mark('typed');
      await d.hold(0.45);
      // the results page for that search, loaded by its own address: the form itself is
      // never submitted (the clip dissolves from the typed query to what it finds)
      await d.goto(this.resultsUrl, desk ? 150 : 90);
      await d.hold(desk ? 1.3 : 1.2);
    },
  },

  'tm-article': {
    site: 'Theology Matters',
    title: 'An essay scrolls to its audio player, and it plays',
    url: 'https://theologymatters.com/articles/the-nicene-creed-in-historical-context/',
    status: 'live',
    realtime: true,
    // the site's reader-supported pop-up is dismissed with its own close button before
    // frame 0 (the hero still was taken without it), so it does not sit over the player
    async prepare(page) {
      const x = page.locator('.tm-donate-prompt__close').filter({ visible: true });
      if (await x.count()) await x.first().click();
      await page.waitForTimeout(700);
    },
    moves:
      'The essay scrolls down to “Listen to this essay”; the cursor presses play and the player starts counting (the clip is silent).',
    facts: [
      'Every article has a listen-along audio version.',
      'The player sits at the head of the essay, above the first paragraph.',
    ],
    async shoot(d, cut) {
      const desk = cut === 'd';
      await d.hold(0.7);
      const ifr = await d.must('iframe[src*="elevenlabs"]');
      await d.scroll(ifr.top - (desk ? 330 : 220), 0.9);
      const f = await d.must('iframe[src*="elevenlabs"]');
      if (desk) await d.camTo({ x: f.x - 40, y: f.y - 90, w: f.w + 80, h: f.h + 180 }, 0.7);
      // the play button sits at the left of the player
      await d.moveTo({ x: f.x + (desk ? 42 : 34), y: f.y + f.h * (desk ? 0.45 : 0.42) }, 0.8);
      await d.hold(0.15);
      await d.click();
      d.mark('play');
      await d.liveHold(3.0);
      await d.cursorOut(0.25);
      await d.hold(0.3);
    },
  },

  'mas-home': {
    site: 'MAS Monograms',
    title: 'The monogram maker stitches a choice',
    url: 'https://mas-monograms.com/',
    status: 'live',
    moves:
      'In the monogram maker the cursor picks the Script style and the preview stitches it again (on desktop, then Navy Canvas cloth).',
    facts: [
      'The monogram maker previews initials, style and fabric before a quote request.',
      'Five styles and eight fabrics to try.',
    ],
    async shoot(d, cut) {
      const desk = cut === 'd';
      await d.hold(0.7);
      if (desk) {
        const form = await d.must('form[action*="request-a-quote"]');
        await d.cut(form.top - 70, 0.45);
        await d.hold(0.4);
        await d.moveToEl('label:has(input[name=style]):has-text("Script")', 0.8);
        await d.click();
        d.mark('style');
        await d.hold(1.5);
        await d.moveToEl('label:has(input[name=fabric]):has-text("Navy Canvas")', 0.7);
        await d.click();
        d.mark('fabric');
        await d.hold(1.4);
        await d.cursorOut(0.25);
      } else {
        // on a phone the preview sits far above the controls: tap, then cut up to watch it stitch
        const st = await d.must('input[name=initials]');
        await d.cut(st.top - 110, 0.45);
        await d.hold(0.4);
        await d.moveToEl('label:has(input[name=style]):has-text("Script")');
        await d.click();
        d.mark('style');
        await d.hold(0.3);
        await d.cursorOut(0.15);
        const stage = await d.must('.atelier-stage__canvas, canvas.atelier-stage__canvas');
        await d.cut(stage.top - 70, 0.4);
        await d.hold(2.8);
      }
    },
  },

  'fbcm-home': {
    site: 'First Baptist Church, Muncie',
    title: 'The new church site: hero, menu, arches and the hymn board',
    url: FBCM,
    status: 'launching soon',
    moves:
      'The hero photographs cross-fade, the Our Church menu opens, then the What to Expect band: photos in the church’s arches beside the hymn board of Sunday times.',
    facts: [
      'Launching soon: a finished build waiting for the church to move its address over.',
      'Sunday School 9:30, Donut [Semi-] Hour 10:15, Worship 10:45.',
    ],
    async shoot(d, cut) {
      const desk = cut === 'd';
      // the hero photographs cross-fade every few seconds: hold long enough to see one
      await d.hold(desk ? 1.5 : 1.3);
      if (desk) {
        // the Our Church menu opens on hover (no click on desktop), and closes when the
        // pointer leaves it
        await d.moveToEl('summary:has-text("Our Church")', 0.8, 0.4, 0.55);
        d.mark('menu');
        await d.hold(1.1);
        await d.moveTo({ x: 640, y: 420 }, 0.5);
        await d.cursorOut(0.2);
      } else {
        await d.moveToEl('button:has-text("Menu")');
        await d.click();
        d.mark('menu');
        await d.hold(1.1);
        await d.moveToEl('button:has-text("Close")');
        await d.click();
        await d.hold(0.3);
        await d.cursorOut(0.15);
      }
      // What to Expect: photos framed in the church's arches, Sunday times as a hymn board
      const sec = await d.page.evaluate(() => {
        const e = [...document.querySelectorAll('h2')].find((x) =>
          /what to expect/i.test(x.textContent),
        );
        const s = e.closest('section') || e;
        return s.getBoundingClientRect().top + scrollY;
      });
      if (desk) {
        await d.cut(sec + 70, 0.5, { x: 0, y: 0, w: 1200, h: 750 });
      } else {
        const board = await d.must('text=Sunday School');
        await d.cut(board.top - 230, 0.5, { x: 0, y: 0, w: 390, h: 488 });
        void sec;
      }
      await d.hold(desk ? 1.9 : 1.8);
    },
  },
};

// -----------------------------------------------------------------------------
// capture, encode, manifest
// -----------------------------------------------------------------------------
const kb = (n) => (n / 1024).toFixed(1);

async function capture(browser, id, cut) {
  const s = SITES[id];
  const dir = path.join(WORK, `${id}-${cut}`);
  const d = await open(browser, {
    url: s.url,
    cut,
    dir,
    realtime: s.realtime,
    warm: s.warm,
    prepare: s.prepare,
  });
  await s.shoot.call(s, d, cut);
  await d.end(0.6);
  const rec = { frames: d.frames, markers: d.markers };
  fs.writeFileSync(path.join(dir, 'frames.json'), JSON.stringify(rec));
  await d.close();
  console.log(id, cut, d.frames.length, 'frames', (d.frames.length / FPS).toFixed(2), 's');
  return rec;
}

async function encode(browser, id, cut, rec) {
  const { W, H, cap } = SPEC[cut];
  const page = await browser.newPage();
  const base = 'https://nx-reel.local/';
  await page.route(base + '**', async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/encoder.html') return route.fulfill({ path: ENCODER });
    const file = decodeURIComponent(u.pathname.slice('/f/'.length));
    return route.fulfill({ path: file, contentType: 'image/jpeg' });
  });
  await page.goto(base + 'encoder.html');
  // captured at 30 fps; encoded at SPEC fps (24 by default: same motion, fewer bytes)
  const efps = Number(process.env.EFPS || SPEC[cut].fps);
  const sel = [];
  for (let j = 0; Math.round((j * FPS) / efps) < rec.frames.length; j++)
    sel.push(Math.round((j * FPS) / efps));
  const frames = sel.map((k) => ({ ...rec.frames[k], snap: false }));
  // a dissolve's held frame may fall between two kept frames: hold the nearest kept one
  rec.frames.forEach((f, k) => {
    if (!f.snap) return;
    let j = 0;
    while (j + 1 < sel.length && sel[j + 1] <= k) j++;
    frames[j].snap = true;
  });
  const n = frames.length;
  const reviewIdx = [];
  for (let t = 0; t < n / efps; t += 0.5) reviewIdx.push(Math.round(t * efps));
  reviewIdx.push(n - 1);
  const job = (rc) => ({
    W,
    H,
    fps: efps,
    touch: cut === 'm' ? 1 : 0,
    ...rc,
    review: reviewIdx,
    frames: frames.map((f) => ({
      url: base + 'f/' + encodeURIComponent(f.file),
      cam: f.cam,
      dpr: 2,
      cur: f.cur,
      ripples: f.ripples,
      snap: f.snap,
      snapMix: f.snapMix,
      mix: f.mix || 0,
    })),
  });
  // Rate control: Chromium's VP9 overshoots and undershoots its target, so aim, measure and
  // re-aim (as the d8 showreel did) until the file lands between 88% and 97% of the cap.
  const dur = n / efps;
  const hiT = cap * 0.97;
  const loT = cap * 0.88;
  let bitrate = Math.round((cap * 0.92 * 8) / dur);
  let best = null;
  for (let pass = 0; pass < 7; pass++) {
    const r = await page.evaluate((j) => encodeJob(j), job({ bitrate }));
    console.log(
      `  ${id}-${cut} ${Math.round(bitrate / 1000)} kbps -> ${kb(r.size)} KB, keyframes ${r.keys}`,
    );
    if (process.env.DEBUG) {
      const b = [];
      r.sizes.forEach(
        (v, i) => (b[Math.floor(i / (efps / 2))] = (b[Math.floor(i / (efps / 2))] || 0) + v),
      );
      console.log('  per 0.5 s (KB):', b.map((v) => (v / 1024).toFixed(0)).join(' '));
    }
    if (r.size <= hiT && (!best || best.over || r.size > best.size)) best = { ...r, bitrate };
    else if (r.size > hiT && (!best || (best.over && r.size < best.size)))
      best = { ...r, bitrate, over: true };
    if (r.size <= hiT && r.size >= loT) break;
    bitrate = Math.round(bitrate * ((cap * 0.92) / r.size));
  }
  if (best.over)
    console.log(`  OVER CAP: ${id}-${cut} smallest was ${kb(best.size)} KB (cap ${kb(cap)} KB)`);
  await page.close();
  const webm = path.join(OUT, `${id}-${cut}.webm`);
  const poster = path.join(OUT, `${id}-${cut}.webp`);
  fs.writeFileSync(webm, Buffer.from(best.b64, 'base64'));
  const png = Buffer.from(best.poster.split(',')[1], 'base64');
  await sharp(png).webp({ quality: 82, effort: 6 }).toFile(poster);
  // decoded review frames and a contact sheet, for looking at before committing
  const rdir = path.join(WORK, 'review');
  fs.mkdirSync(rdir, { recursive: true });
  const thumbs = [];
  for (let i = 0; i < reviewIdx.length; i++) {
    if (!best.review[i]) continue;
    const buf = Buffer.from(best.review[i].split(',')[1], 'base64');
    const name = `${id}-${cut}-${String(reviewIdx[i]).padStart(3, '0')}.png`;
    fs.writeFileSync(path.join(rdir, name), buf);
    thumbs.push(buf);
  }
  const tw = cut === 'd' ? 320 : 156;
  const th = Math.round((tw * H) / W);
  const cols = cut === 'd' ? 4 : 7;
  const rows = Math.ceil(thumbs.length / cols);
  const comps = await Promise.all(
    thumbs.map(async (b, i) => ({
      input: await sharp(b).resize(tw, th).png().toBuffer(),
      left: (i % cols) * (tw + 4),
      top: Math.floor(i / cols) * (th + 4),
    })),
  );
  await sharp({
    create: {
      width: cols * (tw + 4),
      height: rows * (th + 4),
      channels: 3,
      background: '#888',
    },
  })
    .composite(comps)
    .png()
    .toFile(path.join(rdir, `${id}-${cut}-sheet.png`));
  const out = {
    webm: `/reel/home/${id}-${cut}.webm`,
    poster: `/reel/home/${id}-${cut}.webp`,
    w: W,
    h: H,
    bytes: fs.statSync(webm).size,
    posterBytes: fs.statSync(poster).size,
    duration: +(n / efps).toFixed(2),
    fps: efps,
    bitrate: best.bitrate,
    markers: rec.markers,
  };
  console.log(
    `${id}-${cut}: ${W}x${H} ${out.duration}s ${kb(out.bytes)} KB (${Math.round(best.bitrate / 1000)} kbps), poster ${kb(out.posterBytes)} KB`,
  );
  return out;
}

function writeManifest(id, cut, entry, captured) {
  const m = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { clips: {} };
  const s = SITES[id];
  const prev = m.clips[id] || {};
  m.clips[id] = {
    ...prev,
    site: s.site,
    title: s.title,
    url: s.url,
    status: s.status,
    moves: s.moves,
    facts: s.facts,
    captured: captured || new Date().toISOString().slice(0, 10),
    [cut]: entry,
  };
  m.about =
    'Live clips for the home hero reel and proof sheet, made by scripts/brand/capture-reels.mjs. Keys are the reel slide ids in src/lib/homeWork.ts (rd-home is Reid Design, for its case study). d: desktop 16:10, m: phone 4:5. Bytes are exact file sizes.';
  const order = Object.keys(SITES);
  const clips = {};
  for (const k of order) if (m.clips[k]) clips[k] = m.clips[k];
  fs.writeFileSync(MANIFEST, JSON.stringify({ about: m.about, clips }, null, 2) + '\n');
}

const [onlyId, onlyCut] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
if (process.env.MANIFEST_ONLY) {
  // refresh the text fields (and file sizes) from the shot lists without re-shooting
  const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  for (const [id, clip] of Object.entries(m.clips))
    for (const cut of ['d', 'm'])
      if (clip[cut] && SITES[id]) {
        const e = clip[cut];
        e.bytes = fs.statSync(path.join(ROOT, 'public', e.webm)).size;
        e.posterBytes = fs.statSync(path.join(ROOT, 'public', e.poster)).size;
        writeManifest(id, cut, e, clip.captured);
      }
  process.exit(0);
}
const browser = await launch();
for (const id of Object.keys(SITES)) {
  if (onlyId && id !== onlyId) continue;
  for (const cut of ['d', 'm']) {
    if (onlyCut && cut !== onlyCut) continue;
    const recFile = path.join(WORK, `${id}-${cut}`, 'frames.json');
    const rec =
      process.env.REUSE && fs.existsSync(recFile)
        ? JSON.parse(fs.readFileSync(recFile, 'utf8'))
        : await capture(browser, id, cut);
    writeManifest(id, cut, await encode(browser, id, cut, rec));
  }
}
await browser.close();
