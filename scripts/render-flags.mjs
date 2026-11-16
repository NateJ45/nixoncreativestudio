// Renders the waving flags on About's postcard as one short seamless loop (npm run flags:render).
// Both flags are drawn from src/lib/flags.ts: the Saltire on the left, the Stars and Stripes
// fading in over it between 45% and 65% across, as on the page. Then every pixel column is moved
// along a sine wave that runs from left to right, one ripple every 480 units, larger towards the
// free end, with light and shade from the slope for the folds. One loop is exactly one wave
// period, so the last frame leads straight back into the first. Rows are sampled with linear
// interpolation, so the cloth bends smoothly rather than in steps. One video, not one a flag, so
// the browser decodes a single stream.
//
// Off the flags the loop is mid grey, the colour the page's hard-light blend ignores. The files
// are written to public/media/ with a short content hash in the name, since /media/* is cached
// for a year (public/_headers), and the names are recorded in src/data/flag-loops.json.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, renameSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import sharp from 'sharp';
import { H, PAD, W, saltireSvg, usFlagSvg } from '../src/lib/flags.ts';

const NAME = 'flag-sky';
const FPS = 30;
const SECONDS = 2.4;
const FRAMES = Math.round(FPS * SECONDS);
const WAVE = 480; // units per ripple
const OUT = { w: 960, h: 448 }; // the loop's size; the page scales it to the sky box
const S = OUT.w / W; // units to pixels
const GREY = 128;
const MERGE = [0.45 * W, 0.65 * W]; // where the Stars and Stripes fades in, in units

const amp = (x) => (4 + (12 * x) / W) * S; // swing in pixels, 4 units at the left to 16 at the right
const merge = (x) => Math.max(0, Math.min(1, (x - MERGE[0]) / (MERGE[1] - MERGE[0])));

async function source(svg) {
  const h = Math.round((H + 2 * PAD) * S);
  const { data, info } = await sharp(Buffer.from(svg), { density: 72 * S * 2 })
    .resize(OUT.w, h, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, pad: PAD * S };
}

/** One channel of a source at a fractional row, with its coverage. */
function sample(src, x, sy, c) {
  const y0 = Math.max(0, Math.min(src.h - 1, Math.floor(sy)));
  const y1 = Math.min(src.h - 1, y0 + 1);
  const k = sy - Math.floor(sy);
  const i0 = (y0 * src.w + x) * 4;
  const i1 = (y1 * src.w + x) * 4;
  const a0 = src.data[i0 + 3] / 255;
  const a1 = src.data[i1 + 3] / 255;
  return [
    src.data[i0 + c] * a0 * (1 - k) + src.data[i1 + c] * a1 * k, // premultiplied
    a0 * (1 - k) + a1 * k,
  ];
}

function frame(sal, us, f) {
  const out = Buffer.alloc(OUT.w * OUT.h * 3);
  const t = f / FRAMES;
  for (let x = 0; x < OUT.w; x++) {
    const ux = x / S;
    const phase = 2 * Math.PI * (ux / WAVE - t);
    const a = amp(ux);
    const dy = a * Math.sin(phase);
    const m = merge(ux);
    // The fold's light: the slope of the cloth, strongest where the swing is.
    const shade = 1 + 0.22 * Math.cos(phase) * (a / amp(W));
    for (let y = 0; y < OUT.h; y++) {
      const sy = y + sal.pad - dy;
      const o = (y * OUT.w + x) * 3;
      for (let c = 0; c < 3; c++) {
        const [s, sa] = sample(sal, x, sy, c);
        const [u, ua0] = sample(us, x, sy, c);
        const ua = ua0 * m;
        let v = GREY * (1 - sa) + s; // the Saltire over grey
        v = v * (1 - ua) + u * m; // the Stars and Stripes over that
        const cover = 1 - (1 - sa) * (1 - ua);
        // Shade only the cloth, never the grey the blend ignores.
        out[o + c] = Math.max(0, Math.min(255, Math.round(v * (1 + (shade - 1) * cover))));
      }
    }
  }
  return out;
}

function encode(args, frames) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-s',
      `${OUT.w}x${OUT.h}`,
      '-r',
      String(FPS),
      '-i',
      '-',
      '-an',
      ...args,
    ]);
    ff.on('error', reject);
    ff.on('close', (code) => (code ? reject(new Error(`ffmpeg exited ${code}`)) : resolve()));
    for (const fr of frames) ff.stdin.write(fr);
    ff.stdin.end();
  });
}

const sal = await source(saltireSvg());
const us = await source(usFlagSvg());
const frames = Array.from({ length: FRAMES }, (_, f) => frame(sal, us, f));
const tmp = { mp4: `public/media/${NAME}.tmp.mp4`, webm: `public/media/${NAME}.tmp.webm` };
await encode(
  [
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    tmp.mp4,
  ],
  frames,
);
await encode(['-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', '-row-mt', '1', tmp.webm], frames);

// Clear out earlier renders (and the old one-a-flag loops), then name the new one by its hash.
for (const old of readdirSync('public/media').filter(
  (n) => /^flag-.*\.(mp4|webm)$/.test(n) && !n.includes('.tmp.'),
))
  rmSync(`public/media/${old}`);
const h = createHash('sha256').update(readFileSync(tmp.mp4)).digest('hex').slice(0, 8);
const names = { mp4: `${NAME}.${h}.mp4`, webm: `${NAME}.${h}.webm` };
renameSync(tmp.mp4, `public/media/${names.mp4}`);
renameSync(tmp.webm, `public/media/${names.webm}`);
writeFileSync(
  'src/data/flag-loops.json',
  JSON.stringify(
    { [NAME]: { mp4: `/media/${names.mp4}`, webm: `/media/${names.webm}` } },
    null,
    2,
  ) + '\n',
);
console.log(names);
