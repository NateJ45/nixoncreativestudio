// PROTOTYPE (redesign-2, phase 0). See _vault/projects/ncs-hyper-modern-plan.md.
/* ============================================================================
   The Wall: one WebGL canvas holding every client site
   ============================================================================
   Scroll reforms the wall through three formations, all from real captures:

     drift  tilted columns sliding past, behind the headline
     drum   a turning drum; the site at the front takes over the page's colour
     grid   every site laid flat, matched to real links in the DOM

   Native scroll only: this reads scrollY and never touches the wheel or touch
   events. Hand-written WebGL2 with no library, so it stays small.

   The vertex shader works out each tile's position in all three formations
   and mixes them. World units are CSS pixels, centred on the viewport, with
   the z = 0 plane drawn 1:1, so the grid formation lands exactly on the DOM
   cells the visitor clicks.

   Only mounted when the inline check in WallHero.astro set html.wall-on. If
   WebGL fails here, the class comes off and the CSS reel shows instead.
   ============================================================================ */

import { isMotionPaused, MOTION_EVENT } from './motion';

interface WallSite {
  slug: string;
  name: string;
  tex: string;
  texSmall: string;
  paper: string;
  ink: string;
}

interface Tile {
  site: number;
  /** Drift: column, loop start and speed. */
  x: number;
  y: number;
  span: number;
  speed: number;
  w: number;
  h: number;
  /** Drum: ring position and row, or -1 for tiles that leave the drum. */
  k: number;
  row: number;
  intro: number;
}

const VERT = `#version 300 es
in vec2 aPos;
uniform vec2 uRes;
uniform float uFocal, uM1, uM2, uRadius, uDrumZ, uIntro, uBulge;
uniform mat3 uTilt;
uniform vec3 uA;
uniform vec2 uB, uC, uSizeA, uSizeB, uSizeC, uPointer;
out vec2 vUv;
out vec2 vSize;
out float vShade;
void main() {
  vec2 q = aPos - 0.5;
  vec3 pA = uTilt * (uA + vec3(q * uSizeA, 0.0));
  float th = uB.x + q.x * uSizeB.x / uRadius;
  vec3 pB = vec3(uRadius * sin(th), uB.y + q.y * uSizeB.y, uRadius * cos(th) - uRadius + uDrumZ);
  vec3 pC = vec3(uC + q * uSizeC, 0.0);
  vec3 p = mix(pA, pB, uM1);
  p = mix(p, pC, uM2);
  // The cursor presses into the wall, so it feels like a thing with weight.
  float d = length(p.xy - uPointer);
  p.z -= uBulge * exp(-(d * d) / 52000.0);
  p.z -= (1.0 - uIntro) * 500.0;
  p.y -= (1.0 - uIntro) * 120.0;
  gl_Position = vec4(p.x * 2.0 / uRes.x, p.y * 2.0 / uRes.y, 0.0, (uFocal - p.z) / uFocal);
  vUv = vec2(aPos.x, 1.0 - aPos.y);
  vSize = mix(mix(uSizeA, uSizeB, uM1), uSizeC, uM2);
  vShade = mix(1.0, smoothstep(-2.0 * uRadius, -0.1 * uRadius, pB.z - uDrumZ), uM1 * (1.0 - uM2));
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vSize;
in float vShade;
uniform sampler2D uTex;
uniform float uTexAspect, uAlpha, uDpr;
out vec4 color;
void main() {
  float a = vSize.x / vSize.y;
  vec2 uv = vUv;
  // Cover, anchored to the top of the capture: a homepage's first screen.
  if (a > uTexAspect) uv.y *= uTexAspect / a;
  else uv.x = 0.5 + (uv.x - 0.5) * a / uTexAspect;
  vec2 p = (vUv - 0.5) * vSize;
  vec2 q = abs(p) - vSize * 0.5 + 10.0;
  float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 10.0;
  float edge = 1.0 - smoothstep(-0.75, 0.75, dist * uDpr / max(uDpr, 1.0));
  vec3 rgb = texture(uTex, uv).rgb;
  float alpha = edge * uAlpha * vShade;
  color = vec4(rgb * alpha, alpha);
}`;

// Scroll timeline, as fractions of the section's scroll range.
const T = { driftEnd: 0.1, drumIn: 0.2, drumOut: 0.8, gridIn: 0.9 };
const K = 8;
const FOCAL = 1500;

const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('wall: no shader');
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`wall: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

/** A fixed shuffle, so the wall reads the same on every visit. */
function shuffled<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Mounts the wall. Returns the teardown, or undefined if WebGL is unusable. */
export function mountWall(root: HTMLElement): (() => void) | undefined {
  const html = document.documentElement;
  const canvas = root.querySelector<HTMLCanvasElement>('[data-wall-canvas]');
  const dataEl = root.querySelector('[data-wall-sites]');
  const stage = root.querySelector<HTMLElement>('[data-wall-stage]');
  if (!canvas || !dataEl || !stage) return undefined;
  const sites = JSON.parse(dataEl.textContent ?? '[]') as WallSite[];
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
  });
  if (!gl) return undefined;

  const program = gl.createProgram();
  try {
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  } catch {
    return undefined;
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;
  gl.useProgram(program);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const u = (name: string): WebGLUniformLocation | null => gl.getUniformLocation(program, name);
  const U = {
    res: u('uRes'),
    focal: u('uFocal'),
    m1: u('uM1'),
    m2: u('uM2'),
    radius: u('uRadius'),
    drumZ: u('uDrumZ'),
    intro: u('uIntro'),
    bulge: u('uBulge'),
    tilt: u('uTilt'),
    a: u('uA'),
    b: u('uB'),
    c: u('uC'),
    sizeA: u('uSizeA'),
    sizeB: u('uSizeB'),
    sizeC: u('uSizeC'),
    pointer: u('uPointer'),
    texAspect: u('uTexAspect'),
    alpha: u('uAlpha'),
    dpr: u('uDpr'),
  };

  // One subdivided quad, shared by every tile, so tiles can curve on the drum.
  const SEG = 16;
  const verts: number[] = [];
  const idx: number[] = [];
  for (let y = 0; y <= SEG; y++) for (let x = 0; x <= SEG; x++) verts.push(x / SEG, y / SEG);
  for (let y = 0; y < SEG; y++) {
    for (let x = 0; x < SEG; x++) {
      const a = y * (SEG + 1) + x;
      idx.push(a, a + 1, a + SEG + 1, a + 1, a + SEG + 2, a + SEG + 1);
    }
  }
  gl.bindVertexArray(gl.createVertexArray());
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

  // The drift tilt, the same angles as the CSS reel.
  const rad = Math.PI / 180;
  const [rx, ry, rz] = [18 * rad, -14 * rad, -16 * rad];
  const [cx, sx, cy, sy, cz, sz] = [
    Math.cos(rx),
    Math.sin(rx),
    Math.cos(ry),
    Math.sin(ry),
    Math.cos(rz),
    Math.sin(rz),
  ];
  // Column-major rotation: Rx * Ry * Rz.
  const tilt = new Float32Array([
    cy * cz,
    sx * sy * cz + cx * sz,
    -cx * sy * cz + sx * sz,
    -cy * sz,
    -sx * sy * sz + cx * cz,
    cx * sy * sz + sx * cz,
    sy,
    -sx * cy,
    cx * cy,
  ]);
  gl.uniformMatrix3fv(U.tilt, false, tilt);
  gl.uniform1f(U.focal, FOCAL);

  // Textures: one per site, loaded after the page is up.
  const textures: Array<{ tex: WebGLTexture; aspect: number } | null> = sites.map(() => null);
  let alive = true;
  let loaded = 0;
  let introStart = 0;
  const maxAniso = gl.getExtension('EXT_texture_filter_anisotropic');
  const useSmall = window.innerWidth < 768;
  sites.forEach((site, i) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (!alive) return;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (maxAniso) gl.texParameterf(gl.TEXTURE_2D, maxAniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
      textures[i] = { tex, aspect: img.naturalWidth / img.naturalHeight };
      loaded++;
      if (loaded === sites.length) {
        introStart = performance.now();
        html.classList.add('wall-ready');
      }
    };
    img.src = useSmall ? site.texSmall : site.tex;
  });

  // Layout, rebuilt on resize.
  let W = 0;
  let H = 0;
  let dpr = 1;
  let radius = 600;
  let drumW = 400;
  let drumH = 300;
  let drumY = 0;
  let scrollRange = 1;
  let rects: Array<{ x: number; y: number; w: number; h: number }> = [];
  const tiles: Tile[] = [];

  function buildTiles(): void {
    tiles.length = 0;
    const s = Math.max(W / 1440, 0.72);
    const cols = 7;
    const rows = 5;
    const colW = 330 * s;
    const gap = 26 * s;
    const slots: Array<Pick<Tile, 'x' | 'y' | 'span' | 'speed' | 'w' | 'h'>> = [];
    for (let c = 0; c < cols; c++) {
      const heights = Array.from({ length: rows }, (_, r) => ((c + r) % 2 === 0 ? 470 : 340) * s);
      const span = heights.reduce((a, b) => a + b + gap, 0);
      let y = 0;
      const speed = (c % 2 === 0 ? 1 : -1) * (15 + ((c * 7) % 5) * 3) * s;
      for (const h of heights) {
        slots.push({
          x: (c - (cols - 1) / 2) * (colW + gap) + W * 0.04,
          y: y + (c % 3) * 90 * s,
          span,
          speed,
          w: colW,
          h,
        });
        y += h + gap;
      }
    }
    const order = shuffled(slots, 1723);
    order.forEach((slot, i) => {
      // The drum is three rows of eight. Its middle row runs through every
      // site in order, and the rest of the tiles leave during the first morph.
      const onDrum = i < K * 3;
      const row = onDrum ? Math.floor(i / K) : -1;
      const k = onDrum ? i % K : -1;
      const site = onDrum
        ? (k + (row === 0 ? 3 : row === 2 ? 5 : 0)) % sites.length
        : i % sites.length;
      tiles.push({ ...slot, site, k, row, intro: i });
    });
  }

  function layout(): void {
    W = stage!.clientWidth;
    H = stage!.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, W < 768 ? 1.5 : 1.75);
    canvas!.width = Math.round(W * dpr);
    canvas!.height = Math.round(H * dpr);
    gl!.viewport(0, 0, canvas!.width, canvas!.height);
    gl!.uniform2f(U.res, W, H);
    gl!.uniform1f(U.dpr, dpr);
    drumW = W < 768 ? W * 0.8 : clamp(W * 0.62, 230, Math.min(620, H * 0.74));
    drumH = drumW * 0.68;
    radius = (K * drumW * 1.1) / (2 * Math.PI);
    drumY = H * 0.16;
    gl!.uniform1f(U.radius, radius);
    gl!.uniform1f(U.drumZ, 40);
    scrollRange = Math.max(1, root.offsetHeight - H);
    const base = stage!.getBoundingClientRect();
    rects = [...root.querySelectorAll<HTMLElement>('[data-wall-frame]')].map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
    });
    buildTiles();
    dirty = true;
  }

  // Interaction.
  let dirty = true;
  let pointerX = 0;
  let pointerY = 0;
  let bulge = 0;
  let bulgeTarget = 0;
  let hovered = -1;
  let front = -1;
  let selected = -1;
  let selectedAt = 0;
  let paused = isMotionPaused();
  let onScreen = true;
  let raf = 0;
  let last = performance.now();
  let clock = 0;
  let pS = clamp(window.scrollY / Math.max(1, root.offsetHeight - window.innerHeight));

  const captions = [...root.querySelectorAll<HTMLElement>('[data-wall-caption]')];
  const copy = root.querySelector<HTMLElement>('[data-wall-copy]');
  const panel = root.querySelector<HTMLElement>('[data-wall-panel]');
  const veil = root.querySelector<HTMLElement>('[data-wall-veil]');
  const drumVeil = root.querySelector<HTMLElement>('[data-wall-drum-veil]');

  let ground = '';
  function setGround(i: number): void {
    const key = i < 0 ? '' : sites[i]!.slug;
    if (key === ground) return;
    ground = key;
    if (i < 0) {
      html.style.removeProperty('--wall-ground');
      html.style.removeProperty('--wall-ink');
    } else {
      html.style.setProperty('--wall-ground', sites[i]!.paper);
      html.style.setProperty('--wall-ink', sites[i]!.ink);
    }
  }

  function draw(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused) clock += dt;
    const target = clamp(window.scrollY / scrollRange);
    pS += (target - pS) * (1 - Math.pow(0.0015, dt));
    if (Math.abs(target - pS) < 0.0001) pS = target;
    const p = pS;

    bulge += (bulgeTarget - bulge) * (1 - Math.pow(0.02, dt));

    const m1 = smooth(T.driftEnd, T.drumIn, p);
    const m2 = smooth(T.drumOut, T.gridIn, p);
    const inDrum = p > (T.driftEnd + T.drumIn) / 2 && p < T.drumOut + 0.012;

    // The drum dwells on each site: stepped easing over a steady scroll.
    const q = clamp((p - T.drumIn) / (T.drumOut - T.drumIn)) * (sites.length - 1);
    const n = Math.floor(q);
    const rot = n + smooth(0.25, 0.75, q - n);
    const frontNow = inDrum ? Math.round(rot) % sites.length : -1;
    if (frontNow !== front) {
      front = frontNow;
      captions.forEach((c, i) => c.classList.toggle('is-front', i === front));
    }

    const selT = selected >= 0 ? smooth(0, 560, now - selectedAt) : 0;
    setGround(selected >= 0 ? selected : hovered >= 0 ? hovered : front);

    if (copy) {
      const out = smooth(0.015, T.driftEnd, p);
      copy.style.opacity = String(1 - out);
      copy.style.transform = `translateY(${-out * H * 0.12}px)`;
      copy.style.visibility = out > 0.99 ? 'hidden' : '';
    }
    if (veil) veil.style.opacity = String(1 - smooth(0.02, T.driftEnd, p));
    if (drumVeil) drumVeil.style.opacity = String(m1 * (1 - m2));
    if (panel) {
      panel.style.opacity = String(smooth(T.gridIn - 0.03, T.gridIn + 0.02, p));
      panel.classList.toggle('is-live', p > T.gridIn - 0.02);
    }

    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.uniform2f(U.pointer, pointerX, pointerY);
    gl!.uniform1f(U.bulge, bulge * (1 - m2));

    const introClock = introStart ? (now - introStart) / 1000 : 0;
    const angle = (2 * Math.PI) / K;

    // Painter's order: furthest first, judged by where the tile is now.
    const draws = tiles.map((t) => {
      const th = t.k >= 0 ? t.k * angle - rot * angle : 0;
      const z = t.k >= 0 ? Math.cos(th) * m1 * (1 - m2) : -2;
      return { t, th, z };
    });
    draws.sort((a, b) => a.z - b.z);

    for (const { t, th } of draws) {
      const texture = textures[t.site];
      if (!texture) continue;
      gl!.bindTexture(gl!.TEXTURE_2D, texture.tex);
      gl!.uniform1f(U.texAspect, texture.aspect);

      let driftY = (t.y + t.speed * clock) % t.span;
      if (driftY < 0) driftY += t.span;
      gl!.uniform3f(U.a, t.x, driftY - t.span / 2, -60);
      gl!.uniform2f(U.sizeA, t.w, t.h);

      const rowY = t.row < 0 ? 0 : (1 - t.row) * (drumH + 22);
      gl!.uniform2f(U.b, th, drumY + rowY);
      gl!.uniform2f(U.sizeB, drumW, drumH);

      // Grid: the middle row's tiles land on the DOM cells; the others leave
      // upward or downward past the screen edge.
      const cell = t.row === 1 ? rects[t.k] : undefined;
      let cxW = 0;
      let cyW = t.row === 0 ? H : -H;
      let cw = drumW;
      let ch = drumH;
      if (cell) {
        cxW = cell.x + cell.w / 2 - W / 2;
        cyW = H / 2 - (cell.y + cell.h / 2);
        cw = cell.w;
        ch = cell.h;
        if (hovered === t.k && selected < 0) {
          cw *= 1.03;
          ch *= 1.03;
        }
      }

      let tM1 = m1;
      let tM2 = m2;
      let alpha =
        t.row < 0 ? 1 - smooth(0, 0.45, m1) : t.row === 1 ? 1 : 1 - 0.55 * smooth(0.6, 1, m1);
      if (t.row !== 1) alpha *= 1 - m2;

      const isSelected = selected >= 0 && t.row === 1 && t.site === selected;
      if (selected >= 0) {
        if (isSelected) {
          const tw = Math.min(W * 0.86, 1180);
          const th2 = Math.min(tw * 0.62, H * 0.72);
          cxW = lerp(cxW, 0, selT);
          cyW = lerp(cell ? cyW : drumY, -H * 0.1, selT);
          cw = lerp(cw, tw, selT);
          ch = lerp(ch, th2, selT);
          tM2 = Math.max(tM2, selT);
          tM1 = Math.max(tM1, selT);
        } else {
          alpha *= 1 - selT;
        }
      }
      if (alpha <= 0.002) continue;

      gl!.uniform2f(U.c, cxW, cyW);
      gl!.uniform2f(U.sizeC, cw, ch);
      gl!.uniform1f(U.m1, tM1);
      gl!.uniform1f(U.m2, tM2);
      gl!.uniform1f(U.alpha, alpha);
      const intro = introStart ? smooth(0, 0.9, introClock - t.intro * 0.022) : 0;
      gl!.uniform1f(U.intro, intro);
      gl!.drawElements(gl!.TRIANGLES, idx.length, gl!.UNSIGNED_SHORT, 0);
    }
  }

  function frame(now: number): void {
    raf = 0;
    if (!alive) return;
    const settled =
      Math.abs(window.scrollY / scrollRange - pS) < 0.0002 && Math.abs(bulgeTarget - bulge) < 0.5;
    const introDone = introStart > 0 && now - introStart > 2000;
    // A paused wall that has come to rest draws nothing at all.
    if (!paused || !settled || !introDone || dirty || selected >= 0) {
      dirty = false;
      draw(now);
    } else {
      last = now;
    }
    schedule();
  }
  function schedule(): void {
    if (!raf && alive && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
  }

  const onResize = (): void => layout();
  const onPointer = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    const r = stage!.getBoundingClientRect();
    pointerX = e.clientX - r.left - W / 2;
    pointerY = H / 2 - (e.clientY - r.top);
    bulgeTarget = paused ? 0 : 150;
  };
  const onPointerLeave = (): void => {
    bulgeTarget = 0;
  };
  const onVisibility = (): void => schedule();
  const onMotion = (): void => {
    paused = isMotionPaused();
    dirty = true;
    schedule();
  };

  const cells = [...root.querySelectorAll<HTMLAnchorElement>('[data-wall-cell]')];
  const onCellEnter = (e: Event): void => {
    hovered = cells.indexOf(e.currentTarget as HTMLAnchorElement);
    dirty = true;
  };
  const onCellLeave = (): void => {
    hovered = -1;
    dirty = true;
  };
  // Tabbing into the grid brings it on screen, wherever the visitor had scrolled.
  const onFocusIn = (e: Event): void => {
    onCellEnter(e);
    if (clamp(window.scrollY / scrollRange) < T.gridIn) {
      window.scrollTo({ top: scrollRange * ((T.gridIn + 1) / 2), behavior: 'instant' });
    }
  };

  /* Tile to page. The tile grows on the canvas, then a plain DOM element takes
     over at the same spot wearing the study stage's View Transition name, so
     the browser morphs it into the stage on the new page. */
  let flyer: HTMLElement | null = null;
  const onClick = (e: MouseEvent): void => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (selected >= 0 || paused) return;
    const link = (e.target as Element | null)?.closest?.<HTMLAnchorElement>(
      '[data-wall-cell], [data-wall-caption]',
    );
    const slug = link?.dataset.slug;
    if (!link || !slug) return;
    const i = sites.findIndex((s) => s.slug === slug);
    if (i < 0) return;
    e.preventDefault();
    selected = i;
    selectedAt = performance.now();
    schedule();
    window.setTimeout(() => {
      if (!alive) return;
      const tw = Math.min(W * 0.86, 1180);
      const th = Math.min(tw * 0.62, H * 0.72);
      flyer = document.createElement('div');
      flyer.setAttribute('aria-hidden', 'true');
      flyer.style.cssText = [
        'position:fixed',
        `left:${(W - tw) / 2}px`,
        `top:${H / 2 + H * 0.1 - th / 2}px`,
        `width:${tw}px`,
        `height:${th}px`,
        'border-radius:10px',
        `background:url("${useSmall ? sites[i]!.texSmall : sites[i]!.tex}") top center / cover no-repeat`,
        'z-index:40',
        `view-transition-name:cover-${slug}`,
      ].join(';');
      document.body.append(flyer);
      // A real click on the real link: the router takes it from here, and
      // onClick ignores it because a tile is already selected.
      link.click();
    }, 560);
  };

  layout();
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true;
    if (onScreen) {
      last = performance.now();
      schedule();
    }
  });
  io.observe(stage);
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener(MOTION_EVENT, onMotion);
  stage.addEventListener('pointermove', onPointer);
  stage.addEventListener('pointerleave', onPointerLeave);
  root.addEventListener('click', onClick);
  cells.forEach((c) => {
    c.addEventListener('pointerenter', onCellEnter);
    c.addEventListener('pointerleave', onCellLeave);
    c.addEventListener('focus', onFocusIn);
    c.addEventListener('blur', onCellLeave);
  });
  document.fonts?.ready.then(() => {
    if (alive) layout();
  });
  schedule();

  return () => {
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    io.disconnect();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener(MOTION_EVENT, onMotion);
    html.style.removeProperty('--wall-ground');
    html.style.removeProperty('--wall-ink');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}
