// Foundation, edit with care.
// =============================================================================
// Shared helpers for the brand asset generators (build-grounds.mjs,
// build-logo.mjs): a seeded random source, periodic gradient noise (so tiles
// repeat without a seam), heightfield shading, and WCAG contrast math for the
// worst-pixel checks.
//
// Ported from the d9 background study (docs/redesign-2026/mockups/
// d9-background-study/_build/lib.mjs) on 2026-10-04 and trimmed to what the
// shipped grounds use. Every output is deterministic: the same seed gives the
// same bytes, so re-running a generator only changes a file when the recipe
// or a colour changes.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export { sharp };
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Mulberry32: small, fast, seeded. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gradient noise that repeats every `period` lattice cells. */
export function makeNoise(period, seed) {
  const r = rng(seed);
  const g = new Float32Array(period * period * 2);
  for (let i = 0; i < period * period; i++) {
    const a = r() * Math.PI * 2;
    g[2 * i] = Math.cos(a);
    g[2 * i + 1] = Math.sin(a);
  }
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X0 = ((xi % period) + period) % period;
    const Y0 = ((yi % period) + period) % period;
    const X1 = (X0 + 1) % period;
    const Y1 = (Y0 + 1) % period;
    const d = (X, Y, dx, dy) => {
      const k = 2 * (Y * period + X);
      return g[k] * dx + g[k + 1] * dy;
    };
    const u = fade(xf);
    const v = fade(yf);
    const a = d(X0, Y0, xf, yf);
    const b = d(X1, Y0, xf - 1, yf);
    const c = d(X0, Y1, xf, yf - 1);
    const e = d(X1, Y1, xf - 1, yf - 1);
    const top = a + (b - a) * u;
    const bot = c + (e - c) * u;
    return top + (bot - top) * v;
  };
}

/** Fractal noise over an N px tile; seamless because every octave's period divides the tile. */
export function fbm(N, basePeriod, octaves, seed, gain = 0.5) {
  const ns = [];
  for (let o = 0; o < octaves; o++) ns.push(makeNoise(basePeriod << o, seed + o * 101));
  return (x, y) => {
    let s = 0;
    let a = 1;
    let n = 0;
    for (let o = 0; o < octaves; o++) {
      const P = basePeriod << o;
      s += a * ns[o]((x / N) * P, (y / N) * P);
      n += a;
      a *= gain;
    }
    return s / n;
  };
}

/** Splat a soft round dab into a wrapping heightfield. */
export function splat(H, N, x, y, r, amp) {
  const R = Math.ceil(r * 2);
  const xi = Math.round(x);
  const yi = Math.round(y);
  for (let dy = -R; dy <= R; dy++)
    for (let dx = -R; dx <= R; dx++) {
      const px = xi + dx;
      const py = yi + dy;
      const w = Math.exp(-((px - x) ** 2 + (py - y) ** 2) / (r * r));
      if (w < 0.01) continue;
      const k = (((py % N) + N) % N) * N + (((px % N) + N) % N);
      H[k] = Math.max(H[k], H[k] * (1 - w) + amp * w);
    }
}

/**
 * Lambert shading of a wrapping heightfield. Returns light factors where 1.0 is
 * a flat surface under this light. az in degrees (0 = from the right, 180 =
 * from the left, screen y down), el = elevation in degrees.
 */
export function shade(H, N, strength, az, el) {
  const out = new Float32Array(N * N);
  const a = (az * Math.PI) / 180;
  const e = (el * Math.PI) / 180;
  const L = [Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e)];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const nx = -(H[y * N + ((x + 1) % N)] - H[y * N + ((x - 1 + N) % N)]) * strength;
      const ny = -(H[((y + 1) % N) * N + x] - H[((y - 1 + N) % N) * N + x]) * strength;
      const d = (nx * L[0] + ny * L[1] + L[2]) / Math.hypot(nx, ny, 1);
      out[y * N + x] = Math.max(0, d) / L[2];
    }
  return out;
}

/** Fibrous stock heightfield: a felted mottle plus individual fibres laid at random. */
export function fibreField(N, seed, nFibres, o) {
  const H = new Float32Array(N * N);
  const f = fbm(N, 8, 5, seed, 0.55);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) H[y * N + x] = 0.5 + o.felt * f(x, y);
  const r = rng(seed + 7);
  for (let i = 0; i < nFibres; i++) {
    let x = r() * N;
    let y = r() * N;
    let a = r() * Math.PI * 2;
    const len = o.lenMin + r() * (o.lenMax - o.lenMin);
    const bend = (r() - 0.5) * o.bend;
    const w = o.wMin + r() * (o.wMax - o.wMin);
    const amp = 0.2 * o.felt + o.ampMin + r() * (o.ampMax - o.ampMin);
    for (let s = 0; s < len; s += 0.6) {
      splat(H, N, x, y, w, amp);
      x += Math.cos(a) * 0.6;
      y += Math.sin(a) * 0.6;
      a += bend;
    }
  }
  return H;
}

export const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const toHex = (rgb) =>
  '#' + rgb.map((v) => clamp8(v).toString(16).padStart(2, '0')).join('');
export const clamp8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

/** Shade factors -> composite onto a base colour: light tint above 1, dark ink below. */
export function composite(S, N, base, kLight, kDark, tint, ink, extra) {
  const b = hex(base);
  const out = new Uint8Array(N * N * 3);
  for (let i = 0; i < N * N; i++) {
    const d = S[i] - 1 + (extra ? extra[i] : 0);
    const c = d > 0 ? tint : ink;
    const a = d > 0 ? Math.min(1, d * kLight) : Math.min(1, -d * kDark);
    for (let ch = 0; ch < 3; ch++) out[3 * i + ch] = clamp8(b[ch] * (1 - a) + c[ch] * a);
  }
  return out;
}

/** Separable gaussian blur of a W x H float field (edges clamped). */
export function blur(src, W, H, sig) {
  const R = Math.ceil(sig * 3);
  const k = [];
  let s = 0;
  for (let i = -R; i <= R; i++) {
    const w = Math.exp(-(i * i) / (2 * sig * sig));
    k.push(w);
    s += w;
  }
  for (let i = 0; i < k.length; i++) k[i] /= s;
  const tmp = new Float32Array(W * H);
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let a = 0;
      for (let i = -R; i <= R; i++)
        a += k[i + R] * src[y * W + Math.min(W - 1, Math.max(0, x + i))];
      tmp[y * W + x] = a;
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let a = 0;
      for (let i = -R; i <= R; i++)
        a += k[i + R] * tmp[Math.min(H - 1, Math.max(0, y + i)) * W + x];
      out[y * W + x] = a;
    }
  return out;
}

/** Write raw pixels as WebP and return the size in KB. */
export async function writeWebp(file, buf, w, h, channels, opts = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(buf.buffer ?? buf), { raw: { width: w, height: h, channels } })
    .webp({ quality: 70, effort: 6, ...opts })
    .toFile(file);
  return fs.statSync(file).size / 1024;
}

/** WCAG relative luminance and contrast ratio for [r,g,b] triples. */
export function lum([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function ratio(a, b) {
  const A = lum(a);
  const B = lum(b);
  return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05);
}
