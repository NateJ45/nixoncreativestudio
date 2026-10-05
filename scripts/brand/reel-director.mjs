// =============================================================================
// reel-director.mjs: the camera, cursor and frame clock behind the home reel clips.
// =============================================================================
// Safe to edit. Used by scripts/brand/capture-reels.mjs (the shot lists live there).
//
// How a clip is made (the d8 showreel's directed-camera approach, docs/redesign-2026/
// reels-notes.md has the long version):
//   1. A real Chromium page loads the live client site. Time is frozen: Playwright's fake
//      clock drives timers and requestAnimationFrame, the CDP animation timeline runs at
//      rate 0, and every CSS animation, transition and <video> is advanced by hand one
//      frame (1/30 s) at a time. Each captured frame is therefore exact, whatever the
//      speed of this PC. (`realtime: true` skips the freeze for a page whose motion comes
//      from a cross-origin iframe, the Theology Matters audio player: there the frames are
//      taken against the wall clock and resampled to 30 fps.)
//   2. The shot list moves a virtual camera (a crop rectangle over the viewport, zoomed in
//      log space), scrolls the real page, moves a drawn cursor on a curved path with real
//      mouse hover, and clicks or taps for real. Nothing is faked: every state change on
//      screen is the site responding to a real event. Forms are never submitted.
//   3. Every frame is a viewport screenshot at 2x plus a record of the camera, cursor,
//      ripples and dissolves. reel-encoder.html composes and encodes them (VP9 WebM via
//      WebCodecs, our own muxer, no ffmpeg).
//
// Directing rules (from d8 RATIONALE.md section 2): one move at a time; moves 600 to 900 ms
// on an in-out curve; holds 400 to 800 ms; the cursor moves only while the camera is still,
// dips on press and leaves a ripple only where a click really happens; the loop closes with
// a short dissolve back to the exact first frame.
// =============================================================================

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

export const FPS = 30;
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

export const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const outQuart = (t) => 1 - (1 - t) ** 4;
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Cuts. Desktop: a 1200x750 viewport (the hero reel stills are the same viewport), frame
 * 16:10. Phone: a 390x844 viewport, frame the top 390x488 (the stills' 4:5 crop).
 */
export const CUTS = {
  d: { vw: 1200, vh: 750, fw: 1200, fh: 750, mobile: false },
  m: { vw: 390, vh: 844, fw: 390, fh: 488, mobile: true },
};

export async function launch() {
  return chromium.launch({ args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
}

/** Load a page and let it settle in natural time: walk it once so lazy images and reveals land. */
async function load(page, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await page.evaluate(async () => {
    const H = document.documentElement.scrollHeight;
    for (let y = 0; y < H; y += 500) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.fonts.ready);
}

/** Freeze time: pause the fake clock, stop the animation timeline, step videos by hand. */
async function freeze(page, ctx) {
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 200);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
  await page.evaluate(() => {
    // videos are paused and stepped by seeking, so they play at true speed in the clip
    const vids = [...document.querySelectorAll('video')].filter((v) => !v.paused);
    for (const v of vids) v.pause();
    window.__adv = async (dt) => {
      for (const a of document.getAnimations()) {
        try {
          a.currentTime = (a.currentTime || 0) + dt;
        } catch {
          /* an animation that cannot seek is left alone */
        }
      }
      await Promise.all(
        vids.map(
          (v) =>
            new Promise((r) => {
              const t = v.currentTime + dt / 1000;
              v.currentTime = v.duration && v.loop ? t % v.duration : t;
              const done = () => r();
              v.addEventListener('seeked', done, { once: true });
              setTimeout(done, 400);
            }),
        ),
      );
    };
  });
}

/**
 * Open a site and return a director. `dir` receives the frame JPEGs.
 * opts: { url, cut: 'd'|'m', dir, realtime, warm (ms of frozen time run before frame 0) }
 */
export async function open(browser, opts) {
  const spec = CUTS[opts.cut];
  const ctx = await browser.newContext({
    viewport: { width: spec.vw, height: spec.vh },
    deviceScaleFactor: 2,
    isMobile: spec.mobile,
    hasTouch: spec.mobile,
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    userAgent: spec.mobile ? IPHONE_UA : undefined,
  });
  const page = await ctx.newPage();
  // read-only by construction: any non-GET request to the client's own site, and any
  // non-GET navigation anywhere, is refused, so no form can ever be submitted (by a plain
  // form post or by script). Third-party players and widgets keep working: the Theology
  // Matters audio player needs its own POSTs to start.
  const host = new URL(opts.url).hostname;
  await page.route('**/*', (route) => {
    const r = route.request();
    const safe = r.method() === 'GET' || r.method() === 'HEAD';
    if (!safe && (r.isNavigationRequest() || new URL(r.url()).hostname === host)) {
      console.log('  refused', r.method(), r.url().slice(0, 80));
      return route.abort();
    }
    return route.continue();
  });
  if (!opts.realtime) await page.clock.install({ time: new Date('2026-10-04T14:00:00Z') });
  await load(page, opts.url);
  if (opts.prepare) await opts.prepare(page); // off-camera set-up, e.g. dismissing a pop-up
  fs.rmSync(opts.dir, { recursive: true, force: true });
  fs.mkdirSync(opts.dir, { recursive: true });
  const d = new Director(page, ctx, spec, opts);
  if (!opts.realtime) {
    await freeze(page, ctx);
    await d.run(opts.warm ?? 2500); // entrance animations finish before frame 0
  }
  return d;
}

export class Director {
  constructor(page, ctx, spec, opts) {
    this.page = page;
    this.ctx = ctx;
    this.spec = spec;
    this.opts = opts;
    this.frames = [];
    this.cam = { x: 0, y: 0, w: spec.fw, h: spec.fh };
    this.cur = null; // { x, y, op, down } in viewport CSS px
    this.ripples = []; // { x, y, t0 }
    this.snapAlpha = 0;
    this.scrollY = 0;
    this.markers = {};
  }

  get t() {
    return this.frames.length / FPS;
  }

  /** Run frozen time forward without capturing (settling, never shown). */
  async run(ms) {
    if (this.opts.realtime) return this.page.waitForTimeout(ms);
    for (let left = ms; left > 0; left -= 100) {
      const dt = Math.min(100, left);
      await this.page.clock.runFor(dt);
      await this.page.evaluate((d) => window.__adv(d), dt);
    }
  }

  async step() {
    const i = this.frames.length;
    const dt = Math.round(((i + 1) * 1000) / FPS) - Math.round((i * 1000) / FPS);
    if (!this.opts.realtime) {
      await this.page.clock.runFor(dt);
      await this.page.evaluate((d) => window.__adv(d), dt);
    }
  }

  /**
   * Dissolve to another page of the same site, loaded by its own address (used for a
   * search results page: the clip never submits the form that would lead there).
   */
  async goto(url, scrollTo = 0, sec = 0.5) {
    const last = this.frames[this.frames.length - 1];
    last.snap = true;
    if (!this.opts.realtime) await this.page.clock.resume();
    await load(this.page, url);
    if (!this.opts.realtime) {
      await freeze(this.page, this.ctx);
      await this.run(1500);
    }
    this.cam = { x: 0, y: 0, w: this.spec.fw, h: this.spec.fh };
    this.cur = null;
    await this.setScroll(scrollTo);
    const n = Math.round(sec * FPS);
    for (let i = 1; i <= n; i++) {
      this.snapAlpha = 1 - inOut(i / n);
      await this.frame();
    }
    this.snapAlpha = 0;
  }

  /** Capture one frame of the current state, then advance time one frame. */
  async frame(extra = {}) {
    const i = this.frames.length;
    const file = path.join(this.opts.dir, `f${String(i).padStart(4, '0')}.jpg`);
    await this.page.screenshot({ path: file, type: 'jpeg', quality: 92 });
    const now = i / FPS;
    this.ripples = this.ripples.filter((r) => now - r.t0 < 0.52);
    this.frames.push({
      file,
      cam: { ...this.cam },
      cur: this.cur ? { ...this.cur } : null,
      ripples: this.ripples.map((r) => ({ x: r.x, y: r.y, age: now - r.t0 })),
      snapMix: this.snapAlpha,
      ...extra,
    });
    await this.step();
  }

  async hold(sec) {
    const n = Math.round(sec * FPS);
    for (let i = 0; i < n; i++) await this.frame();
  }

  /** Frames against the wall clock (realtime mode), resampled to FPS. */
  async liveHold(sec) {
    const shots = [];
    const t0 = Date.now();
    let k = 0;
    while (Date.now() - t0 < sec * 1000) {
      const file = path.join(this.opts.dir, `live-${this.frames.length}-${k++}.jpg`);
      const at = Date.now() - t0;
      await this.page.screenshot({ path: file, type: 'jpeg', quality: 92 });
      shots.push({ at, file });
    }
    const n = Math.round(sec * FPS);
    for (let i = 0; i < n; i++) {
      const tt = (i * 1000) / FPS;
      let s = shots[0];
      for (const c of shots) if (c.at <= tt) s = c;
      const now = this.frames.length / FPS;
      this.ripples = this.ripples.filter((r) => now - r.t0 < 0.52);
      this.frames.push({
        file: s.file,
        cam: { ...this.cam },
        cur: this.cur ? { ...this.cur } : null,
        ripples: this.ripples.map((r) => ({ x: r.x, y: r.y, age: now - r.t0 })),
        snapMix: 0,
      });
    }
  }

  /** Rect (viewport CSS px, plus page-Y `top`) of the first visible match of a Playwright selector. */
  async rect(sel) {
    const loc = this.page.locator(sel).filter({ visible: true }).first();
    if ((await loc.count()) === 0) return null;
    const b = await loc.boundingBox();
    if (!b) return null;
    const sy = await this.page.evaluate(() => window.scrollY);
    return { x: b.x, y: b.y, w: b.width, h: b.height, top: b.y + sy };
  }

  async must(sel) {
    const r = await this.rect(sel);
    if (!r) throw new Error(`${this.opts.url}: element not found: ${sel}`);
    return r;
  }

  /** Page-Y of an element's top, so a shot list can scroll to it. */
  async topOf(sel, lead = 0) {
    return (await this.must(sel)).top - lead;
  }

  async setScroll(y) {
    this.scrollY = await this.page.evaluate((y) => {
      window.scrollTo({ top: y, behavior: 'instant' });
      return window.scrollY;
    }, Math.round(y));
  }

  /** Eased real scroll to page-Y over `sec`. */
  async scroll(toY, sec = 0.8, ease = inOut) {
    const from = await this.page.evaluate(() => window.scrollY);
    const n = Math.round(sec * FPS);
    for (let i = 1; i <= n; i++) {
      await this.setScroll(lerp(from, toY, ease(i / n)));
      await this.frame();
    }
  }

  /** Camera move to a viewport rect (aspect kept to the frame), zoom eased in log space. */
  async camTo(r, sec = 0.8, ease = inOut) {
    const to = this.fit(r);
    const from = { ...this.cam };
    const n = Math.max(1, Math.round(sec * FPS));
    for (let i = 1; i <= n; i++) {
      const e = ease(i / n);
      const W = Math.exp(lerp(Math.log(from.w), Math.log(to.w), e));
      const fcx = from.x + from.w / 2;
      const fcy = from.y + from.h / 2;
      const tcx = to.x + to.w / 2;
      const tcy = to.y + to.h / 2;
      const H = (W * this.spec.fh) / this.spec.fw;
      this.cam = this.clampCam({
        x: lerp(fcx, tcx, e) - W / 2,
        y: lerp(fcy, tcy, e) - H / 2,
        w: W,
        h: H,
      });
      await this.frame();
    }
  }

  camHome(sec = 0.8) {
    return this.camTo({ x: 0, y: 0, w: this.spec.fw, h: this.spec.fh }, sec);
  }

  /** The frame-shaped camera rect that contains r, centred on it and kept inside the viewport. */
  fit(r) {
    const A = this.spec.fw / this.spec.fh;
    let w = r.w;
    let h = r.w / A;
    if (h < r.h) {
      h = r.h;
      w = h * A;
    }
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    return this.clampCam({ x: cx - w / 2, y: cy - h / 2, w, h });
  }

  clampCam(c) {
    const w = Math.min(c.w, this.spec.vw);
    const h = (w * this.spec.fh) / this.spec.fw;
    return {
      x: Math.min(Math.max(0, c.x), this.spec.vw - w),
      y: Math.min(Math.max(0, c.y), this.spec.vh - h),
      w,
      h,
    };
  }

  /** Bring the cursor (or finger) in, moving on a gentle arc with real hover. */
  async moveTo(p, sec = 0.85) {
    const touch = this.spec.mobile;
    if (!this.cur) {
      // enter from the lower right of the frame, already moving
      const c = this.cam;
      this.cur = touch
        ? { x: p.x, y: p.y, op: 0, down: false }
        : { x: c.x + c.w * 0.92, y: c.y + c.h * 0.95, op: 0, down: false };
    }
    if (touch) {
      // a finger does not travel: it appears where it will land
      this.cur = { x: p.x, y: p.y, op: 0, down: false };
      const n = Math.round(0.25 * FPS);
      for (let i = 1; i <= n; i++) {
        this.cur.op = i / n;
        await this.frame();
      }
      return;
    }
    const a = { x: this.cur.x, y: this.cur.y };
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    const ctrl = { x: a.x + dx / 2 - dy * 0.15, y: a.y + dy / 2 + dx * 0.15 };
    const n = Math.round(sec * FPS);
    const op0 = this.cur.op;
    for (let i = 1; i <= n; i++) {
      const e = inOut(i / n);
      const x = (1 - e) ** 2 * a.x + 2 * (1 - e) * e * ctrl.x + e * e * p.x;
      const y = (1 - e) ** 2 * a.y + 2 * (1 - e) * e * ctrl.y + e * e * p.y;
      this.cur = { x, y, op: Math.min(1, op0 + i / 6), down: false };
      await this.page.mouse.move(x, y);
      await this.frame();
    }
  }

  async moveToEl(sel, sec, dx = 0.5, dy = 0.5) {
    const r = await this.must(sel);
    return this.moveTo({ x: r.x + r.w * dx, y: r.y + r.h * dy }, sec);
  }

  /** A real click (or tap) where the cursor is, with the press dip and a ripple. */
  async click() {
    const { x, y } = this.cur;
    this.ripples.push({ x, y, t0: this.frames.length / FPS });
    this.cur.down = true;
    if (this.spec.mobile) {
      await this.frame();
      await this.page.touchscreen.tap(x, y);
      await this.frame();
      this.cur.down = false;
      return;
    }
    await this.page.mouse.down();
    await this.frame();
    await this.frame();
    await this.page.mouse.up();
    this.cur.down = false;
    await this.frame();
  }

  /** Fade the cursor out where it is (it leaves rather than vanishing). */
  async cursorOut(sec = 0.3) {
    if (!this.cur) return;
    const n = Math.round(sec * FPS);
    const op0 = this.cur.op;
    for (let i = 1; i <= n; i++) {
      this.cur.op = op0 * (1 - i / n);
      if (!this.spec.mobile) {
        this.cur.x += 2;
        this.cur.y += 2;
      }
      await this.frame();
    }
    this.cur = null;
  }

  /** Type text into the focused field, one key at a time, at a human pace. */
  async type(text, perKey = 0.13) {
    for (const ch of text) {
      await this.page.keyboard.type(ch);
      await this.hold(perKey);
    }
  }

  /**
   * A dissolve cut: the last frame stays on top and fades out over `sec` while the page,
   * already at its new scroll position, keeps running underneath.
   */
  async cut(toY, sec = 0.45, cam) {
    const last = this.frames[this.frames.length - 1];
    last.snap = true;
    await this.setScroll(toY);
    if (cam) this.cam = this.fit(cam);
    const n = Math.round(sec * FPS);
    for (let i = 1; i <= n; i++) {
      this.snapAlpha = 1 - inOut(i / n);
      await this.frame();
    }
    this.snapAlpha = 0;
  }

  /** Close the loop: the live page dissolves into the exact first frame. */
  async end(sec = 0.6) {
    const n = Math.round(sec * FPS);
    for (let i = 1; i <= n; i++) {
      await this.frame({ mix: inOut(i / (n + 1)) });
    }
  }

  mark(name) {
    this.markers[name] = +this.t.toFixed(2);
  }

  async close() {
    await this.ctx.close();
  }
}
