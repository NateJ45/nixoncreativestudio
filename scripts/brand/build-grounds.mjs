// Foundation, edit with care.
// =============================================================================
// Ground generator: bakes the texture assets behind the <Band ground="...">
// primitive (src/components/Band.astro) into src/assets/grounds/, then checks
// WCAG contrast of the text tokens against the WORST pixel of every ground.
//
//   node scripts/brand/build-grounds.mjs            # bake all, then check
//   node scripts/brand/build-grounds.mjs --check    # check only (no writes)
//
// What it makes (each ground stays under a 25 KB budget, asserted below):
//   window-light : wall.webp    limewash wall tile in shade (384 px, seamless)
//                  window.webp  late sun through a six-pane sash window, as a
//                               warm alpha patch the CSS slides and dims
//   paper-contours: contours.svg  contour sheet of the Ohio River bend at
//                               Cincinnati (river courses traced in d6, relief
//                               DRAWN from them, not surveyed)
//   deep         : ink-flat.webp  ink-dyed board, ambient light (384 px tile)
//                  ink-rake.webp  the same fibres under a low raking lamp; the
//                               CSS reveals it through a travelling window
//
// Colours are READ FROM src/styles/globals.css (:root), so a palette edit
// there flows into the next bake and the contrast check uses the live values.
// Run it after changing any --ground-* or text token, and commit the assets.
//
// History: rebuilt 2026-10-04 from the d9 background study (T8, T5 and T1's
// lamp, recoloured from bookcloth green to the logo's ink). See DESIGN.md
// "Grounds" for how each one is used.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {
  ROOT,
  fbm,
  shade,
  fibreField,
  composite,
  blur,
  writeWebp,
  hex,
  toHex,
  clamp8,
  ratio,
  sharp,
} from './lib.mjs';

const OUT = path.join(ROOT, 'src', 'assets', 'grounds');
const CHECK_ONLY = process.argv.includes('--check');
const BUDGET_KB = 25;

// ---- Tokens, read from the stylesheet --------------------------------------
const css = fs.readFileSync(path.join(ROOT, 'src', 'styles', 'globals.css'), 'utf8');
const rootStart = css.indexOf('\n:root {');
const rootBlock = css.slice(rootStart, css.indexOf('\n}', rootStart));
const T = {};
for (const m of rootBlock.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) T[m[1]] = m[2];
const need = (n) => {
  if (!T[n]) throw new Error(`globals.css :root has no hex --${n}`);
  return T[n];
};

// ---- window-light ------------------------------------------------------------
async function bakeWindowLight() {
  const N = 384;
  // Limewash: cloudy tone, almost no relief. Low-frequency noise only.
  const big = fbm(N, 2, 6, 29, 0.6);
  const H = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) H[y * N + x] = big(x, y);
  const S = shade(H, N, 3, 225, 50);
  const tone = H.map((h) => 0.2 * h);
  const wall = composite(S, N, need('ground-wall'), 0.3, 0.26, [255, 250, 240], [70, 55, 35], tone);
  const kb1 = await writeWebp(path.join(OUT, 'wall.webp'), wall, N, N, 3, { quality: 82 });

  // The window: six panes (3 across, 2 down) projected as a leaning
  // parallelogram, mullions and frame in shadow, penumbra widening with
  // distance from the sill, weaker as it falls down the wall.
  const W = 760;
  const Hh = 520;
  const L = new Float32Array(W * Hh);
  const O = [230, 30];
  const U = [470, 30];
  const V = [-190, 430];
  const det = U[0] * V[1] - U[1] * V[0];
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const dx = x - O[0];
      const dy = y - O[1];
      const u = (dx * V[1] - dy * V[0]) / det;
      const v = (U[0] * dy - U[1] * dx) / det;
      if (u < 0 || u > 1 || v < 0 || v > 1) continue;
      const cu = (u * 3) % 1;
      const cv = (v * 2) % 1;
      const inMullion = Math.min(cu, 1 - cu) < 0.033 || Math.min(cv, 1 - cv) < 0.026;
      const inFrame = u < 0.03 || u > 0.97 || v < 0.03 || v > 0.97;
      if (!inMullion && !inFrame) L[y * W + x] = 1;
    }
  const mid = blur(L, W, Hh, 7);
  const sharpL = blur(L, W, Hh, 2.2);
  const soft = blur(L, W, Hh, 18);
  const sun = hex(need('ground-sun'));
  const out = new Uint8Array(W * Hh * 4);
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const t = y / Hh;
      const a =
        ((0.45 + 0.5 * t) * sharpL[i] + (0.55 - 0.45 * t) * mid[i] + 0.2 * soft[i]) *
        (1 - 0.45 * t);
      out[4 * i] = sun[0];
      out[4 * i + 1] = sun[1];
      out[4 * i + 2] = sun[2];
      out[4 * i + 3] = clamp8(Math.min(1, a) * 255);
    }
  const kb2 = await writeWebp(path.join(OUT, 'window.webp'), out, W, Hh, 4, {
    quality: 60,
    alphaQuality: 60,
  });
  return { 'wall.webp': kb1, 'window.webp': kb2 };
}

// ---- deep (ink board under a raking lamp) ------------------------------------
async function bakeDeep() {
  const N = 384;
  // Mostly felt, sparse short fibres that only show under the raking light.
  const H = fibreField(N, 11, 300, {
    felt: 0.7,
    lenMin: 5,
    lenMax: 22,
    wMin: 0.35,
    wMax: 0.75,
    ampMin: 0.55,
    ampMax: 0.8,
    bend: 0.035,
  });
  const A = shade(H, N, 1.8, 225, 55);
  const B = shade(H, N, 1.9, 180, 16);
  for (let i = 0; i < N * N; i++) B[i] = Math.min(B[i], 2.2);
  const ink = need('ink');
  const flat = composite(A, N, ink, 0.22, 0.4, [214, 222, 236], [0, 0, 0]);
  const rake = composite(B, N, need('ink-raised'), 0.045, 0.24, [255, 226, 186], [0, 0, 0]);
  const kb1 = await writeWebp(path.join(OUT, 'ink-flat.webp'), flat, N, N, 3, { quality: 82 });
  const kb2 = await writeWebp(path.join(OUT, 'ink-rake.webp'), rake, N, N, 3, { quality: 80 });
  return { 'ink-flat.webp': kb1, 'ink-rake.webp': kb2 };
}

// ---- paper-contours (the Ohio bend) -------------------------------------------
const CONTOUR = {
  // Stroke strengths are tuned so the darkest fully-covered line pixel still
  // gives muted text AA (asserted in checkContrast). Raise them and the check fails.
  minor: { opacity: 0.11, width: 1 },
  index: { opacity: 0.15, width: 1.6 },
  riverBand: 0.06, // how far the river band moves from the survey paper toward --river
  bank: 0.22, // opacity of the two bank lines drawn in --river
};
function bakeContours() {
  const W = 1600;
  const H = 1000;
  const lon0 = -84.82;
  const lon1 = -84.28;
  const lat0 = 38.95;
  const lat1 = 39.21;
  const P = ([la, lo]) => [((lo - lon0) / (lon1 - lon0)) * W, ((lat1 - la) / (lat1 - lat0)) * H];
  // The Ohio's course round the Cincinnati bend and four tributaries, traced in
  // the d6 atlas study (lat, lon). The relief below is generated from them.
  const ohio = [
    [38.9, -84.86],
    [38.95, -84.85],
    [39.05, -84.9],
    [39.09, -84.85],
    [39.12, -84.8],
    [39.155, -84.745],
    [39.14, -84.7],
    [39.115, -84.655],
    [39.09, -84.615],
    [39.087, -84.57],
    [39.093, -84.53],
    [39.097, -84.51],
    [39.11, -84.47],
    [39.115, -84.44],
    [39.1, -84.42],
    [39.07, -84.41],
    [39.04, -84.4],
    [38.99, -84.33],
    [38.95, -84.28],
    [38.92, -84.18],
    [38.9, -84.1],
  ].map(P);
  const tribs = [
    {
      w: 0.8,
      pts: [
        [39.11, -84.82],
        [39.16, -84.8],
        [39.21, -84.77],
        [39.24, -84.735],
        [39.3, -84.7],
      ],
    },
    {
      w: 0.7,
      pts: [
        [39.095, -84.545],
        [39.13, -84.54],
        [39.17, -84.5],
        [39.22, -84.47],
        [39.25, -84.46],
        [39.3, -84.44],
      ],
    },
    {
      w: 0.8,
      pts: [
        [39.093, -84.505],
        [39.06, -84.49],
        [39.02, -84.47],
        [38.98, -84.48],
        [38.92, -84.45],
      ],
    },
    {
      w: 0.75,
      pts: [
        [39.11, -84.43],
        [39.15, -84.38],
        [39.21, -84.3],
        [39.26, -84.24],
      ],
    },
  ].map((t) => ({ ...t, pts: t.pts.map(P) }));

  const dens = (pts, step = 6) => {
    const o = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let k = 0; k < n; k++)
        o.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
    o.push(pts[pts.length - 1]);
    return o;
  };
  const dO = dens(ohio);
  const dT = tribs.map((t) => ({ ...t, d: dens(t.pts) }));
  const dist = (pts, x, y) => {
    let m = 1e9;
    for (const [px, py] of pts) m = Math.min(m, (px - x) ** 2 + (py - y) ** 2);
    return Math.sqrt(m);
  };
  const ss = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  // Height field: dissected upland, bluffs down to a floodplain along each river.
  const C = 4;
  const GW = W / C + 1;
  const GH = H / C + 1;
  const up = fbm(512, 3, 5, 131, 0.55);
  const rav = fbm(512, 6, 4, 137, 0.5);
  const wob = fbm(512, 4, 3, 139, 0.5);
  const Z = new Float32Array(GW * GH);
  for (let j = 0; j < GH; j++)
    for (let i = 0; i < GW; i++) {
      const x = i * C;
      const y = j * C;
      const nx = (x / W) * 512;
      const ny = (y / H) * 512;
      const plateau = 262 + 22 * up(nx, ny);
      const ravine = Math.pow(1 - Math.abs(rav(nx, ny)) * 2.2, 3);
      let h = plateau - 46 * Math.max(0, ravine);
      h = Math.min(h, 148 + (plateau - 148) * ss(28, 105, dist(dO, x, y) + 26 * wob(nx, ny)));
      for (const t of dT)
        h = Math.min(
          h,
          152 + (plateau - 152) * ss(10 * t.w, 70 * t.w, dist(t.d, x, y) + 18 * wob(ny, nx)),
        );
      Z[j * GW + i] = h;
    }

  // Marching squares every 10 m, chained into polylines.
  const key = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const lines = [];
  for (let Lv = 160; Lv <= 290; Lv += 10) {
    const segs = [];
    const ip = (x0, y0, v0, x1, y1, v1) => {
      const t = (Lv - v0) / (v1 - v0);
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    };
    for (let j = 0; j < GH - 1; j++)
      for (let i = 0; i < GW - 1; i++) {
        const a = Z[j * GW + i];
        const b = Z[j * GW + i + 1];
        const c = Z[(j + 1) * GW + i + 1];
        const d = Z[(j + 1) * GW + i];
        const x = i * C;
        const y = j * C;
        const idx = (a > Lv ? 8 : 0) | (b > Lv ? 4 : 0) | (c > Lv ? 2 : 0) | (d > Lv ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const Tp = ip(x, y, a, x + C, y, b);
        const R = ip(x + C, y, b, x + C, y + C, c);
        const B = ip(x, y + C, d, x + C, y + C, c);
        const Lf = ip(x, y, a, x, y + C, d);
        const tab = {
          1: [[Lf, B]],
          2: [[B, R]],
          3: [[Lf, R]],
          4: [[Tp, R]],
          5: [
            [Lf, Tp],
            [B, R],
          ],
          6: [[Tp, B]],
          7: [[Lf, Tp]],
          8: [[Lf, Tp]],
          9: [[Tp, B]],
          10: [
            [Lf, B],
            [Tp, R],
          ],
          11: [[Tp, R]],
          12: [[Lf, R]],
          13: [[B, R]],
          14: [[Lf, B]],
        }[idx];
        for (const s of tab) segs.push(s);
      }
    const ends = new Map();
    const used = new Uint8Array(segs.length);
    segs.forEach((s, n) => {
      for (const p of s) {
        const k = key(p);
        if (!ends.has(k)) ends.set(k, []);
        ends.get(k).push(n);
      }
    });
    for (let n = 0; n < segs.length; n++) {
      if (used[n]) continue;
      used[n] = 1;
      const line = [segs[n][0], segs[n][1]];
      for (const dir of [1, 0]) {
        for (;;) {
          const tip = dir ? line[line.length - 1] : line[0];
          const cand = (ends.get(key(tip)) || []).find((m) => !used[m]);
          if (cand === undefined) break;
          used[cand] = 1;
          const s = segs[cand];
          const nxt = key(s[0]) === key(tip) ? s[1] : s[0];
          if (dir) line.push(nxt);
          else line.unshift(nxt);
        }
      }
      if (line.length > 6) lines.push({ Lv, line });
    }
  }

  // Simplify (RDP), smooth (Chaikin x2), write as relative integer-ish paths.
  const rdp = (pts, eps) => {
    if (pts.length < 3) return pts;
    const [a, b] = [pts[0], pts[pts.length - 1]];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    let md = 0;
    let mi = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / len;
      if (d > md) {
        md = d;
        mi = i;
      }
    }
    if (md <= eps) return [a, b];
    return [...rdp(pts.slice(0, mi + 1), eps).slice(0, -1), ...rdp(pts.slice(mi), eps)];
  };
  const chaikin = (p) => {
    const o = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const [a, b] = [p[i], p[i + 1]];
      o.push(
        [0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]],
        [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]],
      );
    }
    o.push(p[p.length - 1]);
    return o;
  };
  const r1 = (v) => Math.round(v);
  const toD = (p) => {
    let d = `M${r1(p[0][0])} ${r1(p[0][1])}`;
    let [px, py] = [r1(p[0][0]), r1(p[0][1])];
    for (let i = 1; i < p.length; i++) {
      const [x, y] = [r1(p[i][0]), r1(p[i][1])];
      if (x === px && y === py) continue;
      d += `l${x - px} ${y - py}`.replace(/ -/g, '-');
      [px, py] = [x, y];
    }
    return d;
  };
  let minor = '';
  let index = '';
  for (const { Lv, line } of lines) {
    const d = toD(rdp(chaikin(chaikin(rdp(line, 0.8))), 0.5));
    if (Lv % 50 === 0) index += d;
    else minor += d;
  }
  const smoothPath = (pts) => {
    let d = `M${pts[0][0].toFixed(0)} ${pts[0][1].toFixed(0)}`;
    for (let i = 1; i < pts.length - 1; i++)
      d += `Q${pts[i][0].toFixed(0)} ${pts[i][1].toFixed(0)} ${((pts[i][0] + pts[i + 1][0]) / 2).toFixed(0)} ${((pts[i][1] + pts[i + 1][1]) / 2).toFixed(0)}`;
    const l = pts[pts.length - 1];
    return d + `L${l[0].toFixed(0)} ${l[1].toFixed(0)}`;
  };
  const survey = hex(need('ground-survey'));
  const river = hex(need('river'));
  const band = toHex(survey.map((c, i) => c + (river[i] - c) * CONTOUR.riverBand));
  const line = need('contour-ink');
  const [lx, ly] = P([39.127, -84.677]);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
    `<g fill="none" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${smoothPath(ohio)}" stroke="${band}" stroke-width="30"/>` +
    tribs
      .map(
        (t) =>
          `<path d="${smoothPath(t.pts)}" stroke="${band}" stroke-width="${(7 * t.w).toFixed(1)}"/>`,
      )
      .join('') +
    `<path d="${smoothPath(ohio)}" stroke="${need('river')}" stroke-opacity="${CONTOUR.bank}" stroke-width="1" transform="translate(0 -15)"/>` +
    `<path d="${smoothPath(ohio)}" stroke="${need('river')}" stroke-opacity="${CONTOUR.bank}" stroke-width="1" transform="translate(0 15)"/>` +
    `<path d="${minor}" stroke="${line}" stroke-opacity="${CONTOUR.minor.opacity}" stroke-width="${CONTOUR.minor.width}"/>` +
    `<path d="${index}" stroke="${line}" stroke-opacity="${CONTOUR.index.opacity}" stroke-width="${CONTOUR.index.width}"/>` +
    `</g>` +
    `<text x="${lx.toFixed(0)}" y="${(ly + 34).toFixed(0)}" transform="rotate(35 ${lx.toFixed(0)} ${(ly + 34).toFixed(0)})" font-family="Georgia,serif" font-style="italic" font-size="17" letter-spacing="4" fill="${need('river')}" fill-opacity="${CONTOUR.bank}" text-anchor="middle">Ohio River</text>` +
    `</svg>\n`;
  const file = path.join(OUT, 'contours.svg');
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(file, svg);
  return {
    'contours.svg (raw)': svg.length / 1024,
    'contours.svg (brotli)': zlib.brotliCompressSync(svg).length / 1024,
    band,
  };
}

// ---- Contrast against the worst pixel ---------------------------------------
async function pixels(file) {
  const { data, info } = await sharp(file)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = [];
  for (let i = 0; i < data.length; i += info.channels) px.push([data[i], data[i + 1], data[i + 2]]);
  return px;
}
const over = (fg, a, bg) => fg.map((c, i) => c * a + bg[i] * (1 - a));

async function checkContrast(bandColour) {
  const rows = [];
  const fail = [];
  const assert = (ground, worstBg, textToken, min) => {
    const r = ratio(hex(need(textToken)), worstBg);
    rows.push({ ground, text: textToken, worstBg: toHex(worstBg), ratio: +r.toFixed(2), min });
    if (r < min)
      fail.push(
        `${ground}: --${textToken} is ${r.toFixed(2)}:1 on its worst pixel ${toHex(worstBg)}, needs ${min}:1`,
      );
  };
  const darkest = (px) => px.reduce((m, p) => (ratio(p, [0, 0, 0]) < ratio(m, [0, 0, 0]) ? p : m));
  const lightest = (px) => px.reduce((m, p) => (ratio(p, [0, 0, 0]) > ratio(m, [0, 0, 0]) ? p : m));

  // window-light: the sun only ever LIGHTENS the wall, so the worst point for
  // dark text is the darkest wall pixel in shade.
  const wallDark = darkest(await pixels(path.join(OUT, 'wall.webp')));
  for (const [t, m] of [
    ['foreground', 4.5],
    ['heading', 4.5],
    ['muted-foreground', 4.5],
    ['link', 4.5],
    ['marker', 4.5],
  ])
    assert('window-light', wallDark, t, m);
  // ...and the brightest point for the lighter accents is the full sun patch.
  const sunLit = over(hex(need('ground-sun')), 1, hex(need('ground-wall')));
  for (const [t, m] of [
    ['muted-foreground', 4.5],
    ['marker', 4.5],
  ])
    assert('window-light (sun)', sunLit, t, m);

  // paper-contours: a fully covered index line, then the river band.
  const survey = hex(need('ground-survey'));
  const lineOn = (bg) => over(hex(need('contour-ink')), CONTOUR.index.opacity, bg);
  const bandRgb = hex(bandColour);
  // ...and the bank lines and the river label, drawn in --river at CONTOUR.bank.
  const riverOn = (bg) => over(hex(need('river')), CONTOUR.bank, bg);
  for (const bg of [lineOn(survey), lineOn(bandRgb), riverOn(bandRgb), riverOn(survey)])
    for (const [t, m] of [
      ['foreground', 4.5],
      // The contour ground re-scopes these two (globals.css .ground-paper-contours).
      ['contour-muted', 4.5],
      ['link', 4.5],
      ['contour-marker', 4.5],
    ])
      assert('paper-contours', bg, t, m);

  // deep: the brightest raking-lit fibre, and the flat board.
  const rakeLight = lightest(await pixels(path.join(OUT, 'ink-rake.webp')));
  const flatLight = lightest(await pixels(path.join(OUT, 'ink-flat.webp')));
  for (const bg of [rakeLight, flatLight])
    for (const [t, m] of [
      ['on-ink', 4.5],
      ['on-ink-muted', 4.5],
      ['marker-hot', 4.5],
      ['ring-on-ink', 3],
    ])
      assert('deep', bg, t, m);
  return { rows, fail };
}

// ---- Run ----------------------------------------------------------------------
const sizes = {};
let band = null;
if (!CHECK_ONLY) {
  Object.assign(sizes, await bakeWindowLight(), await bakeDeep());
  const c = bakeContours();
  band = c.band;
  delete c.band;
  Object.assign(sizes, c);
} else {
  const survey = hex(need('ground-survey'));
  const river = hex(need('river'));
  band = toHex(survey.map((c, i) => c + (river[i] - c) * CONTOUR.riverBand));
}
const kb = (n) => +n.toFixed(1);
if (!CHECK_ONLY) {
  const budget = {
    'window-light': sizes['wall.webp'] + sizes['window.webp'],
    deep: sizes['ink-flat.webp'] + sizes['ink-rake.webp'],
    'paper-contours': sizes['contours.svg (brotli)'],
  };
  console.log(
    'Asset sizes (KB):',
    Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, kb(v)])),
  );
  console.log(
    'Per ground, as served (KB):',
    Object.fromEntries(Object.entries(budget).map(([k, v]) => [k, kb(v)])),
  );
  for (const [g, v] of Object.entries(budget))
    if (v > BUDGET_KB) {
      console.error(`FAIL: ${g} is ${kb(v)} KB, over the ${BUDGET_KB} KB ground budget`);
      process.exitCode = 1;
    }
}
const { rows, fail } = await checkContrast(band);
console.table(rows);
if (fail.length) {
  console.error('FAIL:\n  ' + fail.join('\n  '));
  process.exitCode = 1;
} else console.log(`All ${rows.length} worst-pixel pairs pass.`);
