// Turns the Blender flag renders into seamless web loops, each flag filling the sky of its
// photograph, faded, behind the skyline:
//   npm run flags:loop -- <frames dir> <name> <photo> <day|night>
// e.g. node scripts/flag-loops.mjs renders/saltire flag-saltire src/assets/photography/canvas/edinburgh-skyline.jpg day
//
// The renders come from scripts/flags/flag.py: a close-up cloth simulation of the flag in gusting
// wind, one transparent PNG a frame, 1116 x 840 (the shape of the photograph's 62% of the
// postcard). A simulation never repeats, so this finds the stretch of 5 to 8 seconds whose last
// frame looks most like its first (compared small and in grey), then blends its last few frames
// into the frames just before its start, so the end runs straight into the beginning.
//
// Every frame is the photograph, cropped exactly as the page crops it (centred cover), with the
// flag laid into its sky: a sky mask keyed from the photograph (blue and cloud by day; near-black
// by night, taken from the top of each column down to the first solid run of skyline), so the
// flag sits behind the buildings. The flag is graded down (less colour, a little darker) and fades
// out towards the horizon. The loop is written to public/media/ as WebM and MP4 with a short
// content hash in the name (/media/* is cached for a year), plus a WebP poster of its first frame,
// and the names go into src/data/flag-loops.json.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const [dir, name, photo, kind] = process.argv.slice(2);
if (!dir || !name || !photo || !['day', 'night'].includes(kind)) {
  console.error('usage: node scripts/flag-loops.mjs <frames dir> <name> <photo> <day|night>');
  process.exit(1);
}
const FPS = 30;
const MIN = 5 * FPS;
const MAX = 8 * FPS;
const BLEND = 12; // frames of crossfade at the seam
const W = 1116;
const H = 840;
// How strongly the flag shows, and its grade: a share of its colour kept, and a brightness.
const LOOK = {
  day: { strength: 0.8, sat: 0.85, bright: 0.8 },
  night: { strength: 0.72, sat: 0.8, bright: 0.95 },
}[kind];

const files = readdirSync(dir)
  .filter((f) => f.endsWith('.png'))
  .sort();

// ---- the photograph and its sky ----------------------------------------------------------
const bg = await sharp(photo).resize(W, H, { fit: 'cover' }).removeAlpha().raw().toBuffer();
const sky = Buffer.alloc(W * H);
for (let p = 0; p < W * H; p++) {
  const r = bg[p * 3];
  const g = bg[p * 3 + 1];
  const b = bg[p * 3 + 2];
  const L = 0.3 * r + 0.59 * g + 0.11 * b;
  const isSky =
    kind === 'day'
      ? (b > 150 && b >= r + 15) || (L > 185 && Math.max(r, g, b) - Math.min(r, g, b) < 40)
      : L < 30 && b >= r - 4;
  sky[p] = isSky ? 255 : 0;
}
// At night, sky only from the top of each column down to its first solid run of 6 non-sky pixels
// (dark building faces and the river would otherwise pass as sky). By day the colour key is clean
// enough on its own, so sky shows between the monument's columns too; nothing below 70% down.
if (kind === 'day') sky.fill(0, Math.round(0.7 * H) * W);
else
  for (let x = 0; x < W; x++) {
    let run = 0;
    let ended = false;
    for (let y = 0; y < H; y++) {
      const k = y * W + x;
      if (ended) sky[k] = 0;
      else if (sky[k]) run = 0;
      else if (++run >= 6) {
        ended = true;
        for (let u = y - 5; u <= y; u++) sky[u * W + x] = 0;
      }
    }
  }
const mask = await sharp(sky, { raw: { width: W, height: H, channels: 1 } })
  .median(5)
  .blur(2)
  .extractChannel(0) // sharp writes three channels from one unless told
  .raw()
  .toBuffer();
// The weight of the flag at each pixel: the sky, fading out over the lower half of the frame.
const weight = new Float32Array(W * H);
for (let y = 0; y < H; y++) {
  const fade = Math.min(1, Math.max(0, (0.62 - y / H) / 0.42));
  for (let x = 0; x < W; x++) weight[y * W + x] = (mask[y * W + x] / 255) * fade * LOOK.strength;
}

// ---- the loop ----------------------------------------------------------------------------
const small = await Promise.all(
  files.map((f) =>
    sharp(`${dir}/${f}`)
      .flatten({ background: { r: 128, g: 128, b: 128 } })
      .resize(96, 72)
      .greyscale()
      .raw()
      .toBuffer(),
  ),
);
const diff = (a, b) => {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
  return d / a.length;
};
let best = { d: Infinity };
for (let i = BLEND; i < files.length - MIN; i++)
  for (let j = i + MIN; j <= Math.min(files.length - 1, i + MAX); j++) {
    const d = diff(small[i], small[j]);
    if (d < best.d) best = { d, i, j };
  }
const { i, j } = best;
console.log(
  `loop ${files[i]}..${files[j - 1]} (${((j - i) / FPS).toFixed(1)} s), seam difference ${best.d.toFixed(2)}`,
);

// One frame: the graded flag laid into the sky of the photograph.
const full = async (k) => {
  const f = await sharp(`${dir}/${files[k]}`).resize(W, H).ensureAlpha().raw().toBuffer();
  const out = Buffer.alloc(W * H * 3);
  for (let p = 0; p < W * H; p++) {
    const r = f[p * 4];
    const g = f[p * 4 + 1];
    const b = f[p * 4 + 2];
    const a = (f[p * 4 + 3] / 255) * weight[p];
    const grey = 0.3 * r + 0.59 * g + 0.11 * b;
    for (let c = 0; c < 3; c++) {
      const v = (grey + (f[p * 4 + c] - grey) * LOOK.sat) * LOOK.bright;
      out[p * 3 + c] = Math.round(bg[p * 3 + c] * (1 - a) + v * a);
    }
  }
  return out;
};
const frames = [];
for (let t = i; t < j; t++) {
  let f = await full(t);
  const into = t - (j - BLEND);
  if (into >= 0) {
    const a = (into + 1) / (BLEND + 1);
    const g = await full(t - (j - i));
    const m = Buffer.alloc(f.length);
    for (let p = 0; p < f.length; p++) m[p] = Math.round(f[p] * (1 - a) + g[p] * a);
    f = m;
  }
  frames.push(f);
}

// ---- encode -------------------------------------------------------------------------------
function encode(args) {
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
      `${W}x${H}`,
      '-r',
      String(FPS),
      '-i',
      '-',
      '-an',
      ...args,
    ]);
    ff.on('error', reject);
    ff.on('close', (c) => (c ? reject(new Error(`ffmpeg exited ${c}`)) : resolve()));
    for (const f of frames) ff.stdin.write(f);
    ff.stdin.end();
  });
}
const tmp = { mp4: `public/media/${name}.tmp.mp4`, webm: `public/media/${name}.tmp.webm` };
await encode([
  '-c:v',
  'libx264',
  '-preset',
  'slow',
  '-crf',
  '23',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
  tmp.mp4,
]);
await encode([
  '-c:v',
  'libvpx-vp9',
  '-crf',
  '34',
  '-b:v',
  '0',
  '-row-mt',
  '1',
  '-pix_fmt',
  'yuv420p',
  tmp.webm,
]);

for (const old of readdirSync('public/media').filter(
  (n) => n.startsWith(`${name}.`) && !n.includes('.tmp.'),
))
  rmSync(`public/media/${old}`);
const h = createHash('sha256').update(readFileSync(tmp.mp4)).digest('hex').slice(0, 8);
const out = { mp4: `${name}.${h}.mp4`, webm: `${name}.${h}.webm`, poster: `${name}.${h}.webp` };
renameSync(tmp.mp4, `public/media/${out.mp4}`);
renameSync(tmp.webm, `public/media/${out.webm}`);
await sharp(frames[0], { raw: { width: W, height: H, channels: 3 } })
  .webp({ quality: 78 })
  .toFile(`public/media/${out.poster}`);

const recordPath = 'src/data/flag-loops.json';
const record = existsSync(recordPath) ? JSON.parse(readFileSync(recordPath, 'utf8')) : {};
record[name] = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, `/media/${v}`]));
writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n');
console.log(out);
