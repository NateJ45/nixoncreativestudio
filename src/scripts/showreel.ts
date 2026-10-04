/* ============================================================================
   showreel.ts | the <nx-reel> directed showreel player
   ============================================================================
   Safe to edit. Productionised from the d8 mock-up (docs/redesign-2026/mockups/
   d8-showreel, RATIONALE.md: "use the hybrid, on case study pages").

   What it does: a virtual camera moves over 2x stills of a real client site,
   with short muted clips cut in exactly where the live site really moves (the
   Stone Steps race clock and course map, the Reid concept room). The camera,
   the cursor and the click ripples are pure functions of time, baked once into
   Web Animations keyframes (60 a second), so the compositor plays them and the
   main thread does almost nothing while it runs.

   The rules it keeps (each one measured in d8):
   - Poster first. The poster <img> is in the server HTML and is the page's LCP
     element. Nothing else downloads until the page has fired `load`, the
     poster has decoded, 700 ms have passed and the browser has gone idle.
   - Only near the viewport (300 px margin) does it fetch; it plays only while
     at least 40% visible, pauses off screen and in a hidden tab.
   - prefers-reduced-motion: the player never builds. The server HTML already
     shows a designed still of the best detail in that case (<picture> source).
   - A real Play / Pause button (44 px), no sound ever.
   - Any failure leaves the poster in place: a good still is the worst case.

   Config: data-d / data-m on the element point at a timeline JSON (desktop and
   phone cut; the phone cut is chosen at max-width 600px). The JSON's file names
   resolve relative to the JSON. Format (from d8 _capture/build.mjs):
     { W, H, T (loop seconds), end (dissolve start), PW, PH (page size),
       cam: [[t, x, y, zoom, ease]], cur: [[t, x, y, opacity, ease]],
       clicks: [t], touch: 0|1,
       layers: [[file, x, y, w, h]], clips: [[file, x, y, w, h, t0, dur]],
       patches: [[file, x, y, w, h, [[t, opacity]]]] }
   Ease codes: 0 linear, 1 in-out cubic, 2 out-back (zooms), 3 out-quart.

   No dependencies. Registered once; safe across View Transitions (a new
   element connects fresh, a removed one stops its observers and animations).
   ============================================================================ */

type Key = number[];
interface ReelConfig {
  W: number;
  H: number;
  T: number;
  end: number;
  PW: number;
  PH: number;
  cam: Key[];
  cur: Key[];
  clicks: number[];
  touch: number;
  layers: [string, number, number, number, number][];
  clips: [string, number, number, number, number, number, number][];
  patches: [string, number, number, number, number, [number, number][]][];
}

const EASE: ((p: number) => number)[] = [
  (p) => p,
  (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2),
  (p) => 1 + 2.25 * (p - 1) ** 3 + 1.25 * (p - 1) ** 2,
  (p) => 1 - (1 - p) ** 4,
];
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** The keyframe pair around time t and the eased progress between them. */
function seg(keys: Key[], t: number): [Key, Key, number] {
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1][0] <= t) i++;
  const a = keys[i];
  const b = keys[i + 1];
  if (!b || t <= a[0]) return [a, a, 0];
  return [a, b, EASE[b[b.length - 1]]((t - a[0]) / (b[0] - a[0]))];
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls: string,
  parent?: Element,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  parent?.append(e);
  return e;
}
const place = (e: HTMLElement, r: readonly unknown[]) => {
  e.style.cssText = `left:${r[1]}px;top:${r[2]}px;width:${r[3]}px;height:${r[4]}px`;
};

// The cursor arrow, drawn with classes so its colours come from the stylesheet.
const ARROW =
  '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M5 2.5v17.2l4.6-4.3 2.9 6.6 2.7-1.2-2.9-6.5H19z"/></svg>';

class Reel extends HTMLElement {
  private c?: ReelConfig;
  private started = false;
  private ok = false;
  private vis = false;
  private userPaused = false;
  private io?: IntersectionObserver;
  private ro?: ResizeObserver;
  private anims: Animation[] = [];
  private clips: { v: HTMLVideoElement; t0: number; d: number }[] = [];
  private btn?: HTMLButtonElement;
  private raf = 0;
  private onVis = () => this.sync();

  connectedCallback() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || this.started) return;
    this.io = new IntersectionObserver((es) => this.seen(es[es.length - 1]), {
      rootMargin: '300px 0px',
      threshold: [0, 0.4],
    });
    this.io.observe(this);
    document.addEventListener('visibilitychange', this.onVis);
  }

  disconnectedCallback() {
    this.io?.disconnect();
    this.ro?.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
    cancelAnimationFrame(this.raf);
    this.anims.forEach((a) => a.cancel());
    this.clips.forEach((k) => k.v.pause());
  }

  private async seen(e: IntersectionObserverEntry) {
    this.vis = e.intersectionRatio >= 0.4;
    if (e.isIntersecting && !this.started) {
      this.started = true;
      // The poster is the LCP: nothing else downloads until the page has loaded and gone idle.
      if (document.readyState !== 'complete') {
        await new Promise((r) => addEventListener('load', r, { once: true }));
      }
      await this.poster()
        ?.decode()
        .catch(() => 0);
      await new Promise((r) => setTimeout(r, 700));
      await new Promise((r) =>
        'requestIdleCallback' in window
          ? requestIdleCallback(() => r(0), { timeout: 1500 })
          : setTimeout(r, 200),
      );
      const cut = matchMedia('(max-width: 600px)').matches ? 'm' : 'd';
      const path = this.dataset[cut];
      if (!path) return;
      const src = new URL(path, location.href);
      try {
        const res = await fetch(src);
        if (!res.ok) return;
        await this.build((await res.json()) as ReelConfig, src);
      } catch {
        // Any failure leaves the poster in place.
      }
    }
    this.sync();
  }

  private poster() {
    return this.querySelector<HTMLImageElement>('img.nxr-poster');
  }

  private async build(c: ReelConfig, base: URL) {
    this.c = c;
    const u = (f: string) => new URL(f, base).href;
    const D = c.T * 1000;
    const fit = el('div', 'nxr-fit');
    fit.setAttribute('aria-hidden', 'true');
    this.prepend(fit);
    fit.style.cssText = `width:${c.W}px;height:${c.H}px`;
    this.ro = new ResizeObserver(() => {
      fit.style.transform = `scale(${this.clientWidth / c.W})`;
    });
    this.ro.observe(this);
    const world = el('div', 'nxr-w', fit);
    const imgs: HTMLImageElement[] = c.layers.map((r) => {
      const i = el('img', '', world);
      i.alt = '';
      i.src = u(r[0]);
      place(i, r);
      return i;
    });
    this.clips = c.clips.map((r) => {
      const v = el('video', '', world);
      v.muted = true;
      v.playsInline = true;
      v.preload = 'auto';
      v.src = u(r[0]);
      place(v, r);
      return { v, t0: r[5], d: r[6] };
    });
    const opts: KeyframeAnimationOptions = { duration: D, iterations: Infinity, fill: 'both' };
    const add = (e: Element, k: Keyframe[]) => this.anims.push(e.animate(k, opts));
    for (const r of c.patches) {
      const i = el('img', '', world);
      i.alt = '';
      i.src = u(r[0]);
      place(i, r);
      imgs.push(i);
      add(
        i,
        r[5].map(([t, o]) => ({ offset: t / c.T, opacity: o })),
      );
    }
    const cur = el('div', 'nxr-cur' + (c.touch ? ' nxr-touch' : ''), fit);
    cur.innerHTML = c.touch ? '<i></i>' : ARROW;
    const N = Math.round(c.T * 60);
    const cam: Keyframe[] = [];
    const cu: Keyframe[] = [];
    for (let n = 0; n <= N; n++) {
      const t = (n / N) * c.T;
      const [x, y, z] = this.cam(t);
      const k = this.cur(t);
      cam.push({ transform: `translate(${c.W / 2 - x * z}px,${c.H / 2 - y * z}px) scale(${z})` });
      cu.push({
        opacity: k[2],
        transform: `translate(${c.W / 2 + (k[0] - x) * z}px,${c.H / 2 + (k[1] - y) * z}px) scale(${k[3]})`,
      });
    }
    add(world, cam);
    add(cur, cu);
    for (const tc of c.clicks) {
      const [x, y, z] = this.cam(tc);
      const k = this.cur(tc);
      const rip = el('b', 'nxr-rip', fit);
      const o = tc / c.T;
      rip.style.cssText = `left:${c.W / 2 + (k[0] - x) * z}px;top:${c.H / 2 + (k[1] - y) * z}px`;
      add(rip, [
        { offset: 0, opacity: 0, transform: 'scale(.3)' },
        { offset: o, opacity: 0, transform: 'scale(.3)' },
        {
          offset: o + 0.01,
          opacity: 0.55,
          transform: 'scale(.45)',
          easing: 'cubic-bezier(.2,.7,.3,1)',
        },
        { offset: Math.min(1, o + 0.55 / c.T), opacity: 0, transform: 'scale(1.9)' },
        { offset: 1, opacity: 0, transform: 'scale(1.9)' },
      ]);
    }
    // The poster is the first and last frame: it hides under an identical world, then
    // dissolves back in to close the loop without a visible jump.
    const p = this.poster();
    if (p) {
      add(p, [
        { offset: 0, opacity: 1 },
        { offset: 0.001, opacity: 0 },
        { offset: c.end / c.T, opacity: 0, easing: 'cubic-bezier(.4,0,.2,1)' },
        { offset: 1, opacity: 1 },
      ]);
    }
    this.anims.forEach((a) => a.pause());
    const b = (this.btn = el('button', 'nxr-pp', this));
    b.type = 'button';
    b.addEventListener('click', () => {
      this.userPaused = !this.userPaused;
      this.sync();
    });
    await Promise.all(imgs.map((i) => i.decode().catch(() => 0)));
    this.ok = true;
    this.sync();
  }

  /** Camera: page-space centre and zoom; zoom interpolates in log space so it feels even. */
  private cam(t: number): [number, number, number] {
    const c = this.c!;
    const [a, b, p] = seg(c.cam, t);
    const z = a[3] * (b[3] / a[3]) ** p;
    const hw = c.W / 2 / z;
    const hh = c.H / 2 / z;
    return [
      Math.min(Math.max(lerp(a[1], b[1], p), hw), c.PW - hw),
      Math.min(Math.max(lerp(a[2], b[2], p), hh), c.PH - hh),
      z,
    ];
  }

  /** Cursor: curved travel (a quadratic bend), eased, with a press dip on each click. */
  private cur(t: number): [number, number, number, number] {
    const c = this.c!;
    const [a, b, p] = seg(c.cur, t);
    const dx = b[1] - a[1];
    const dy = b[2] - a[2];
    const bend = 0.16 * 4 * p * (1 - p);
    let s = 1;
    for (const tc of c.clicks) {
      const d = t - tc;
      if (d > -0.09 && d < 0.22) s = 1 - 0.16 * (d < 0 ? (d + 0.09) / 0.09 : 1 - d / 0.22);
    }
    return [
      lerp(a[1], b[1], p) - dy * bend,
      lerp(a[2], b[2], p) + dx * bend,
      lerp(a[3], b[3], p),
      s,
    ];
  }

  private get playing() {
    return this.ok && this.vis && !this.userPaused && !document.hidden;
  }

  private sync() {
    if (!this.ok || !this.btn) return;
    const on = this.playing;
    const word = this.userPaused ? 'Play' : 'Pause';
    this.btn.textContent = word;
    this.btn.setAttribute('aria-label', `${word} the walkthrough`);
    this.anims.forEach((a) => (on ? a.play() : a.pause()));
    if (on && !this.raf) this.tick();
    if (!on) this.clips.forEach((k) => k.v.pause());
  }

  /** Keep the clips on the master clock (a few comparisons a frame, only while playing). */
  private tick() {
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      if (!this.playing || !this.c) return;
      const now = Number(this.anims[0].currentTime ?? 0);
      const t = (now % (this.c.T * 1000)) / 1000;
      for (const k of this.clips) {
        const l = t - k.t0;
        if (l >= 0 && l < k.d) {
          if (Math.abs(k.v.currentTime - l) > 0.2) k.v.currentTime = l;
          if (k.v.paused) k.v.play().catch(() => 0);
        } else {
          if (!k.v.paused) k.v.pause();
          if (l < 0 && k.v.currentTime) k.v.currentTime = 0;
        }
      }
      this.tick();
    });
  }
}

if (!customElements.get('nx-reel')) customElements.define('nx-reel', Reel);
