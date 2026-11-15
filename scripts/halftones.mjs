// Safe to run any time: `npm run halftones`.
/* ============================================================================
   A halftone of each client's own picture, for the case study hero
   ============================================================================
   The hero of /work/<slug>/ sits on the client's colour. Behind it goes a
   halftone of the study's backdrop picture (frontmatter `backdrop.src`): round
   dots on a 45 degree screen, like a newspaper photograph.

   The file written here holds ONLY the dots, as transparency: white dots on
   nothing. The page uses it as a CSS mask over a layer painted in the client's
   paper (study.css, .s-bg), so the two colours on screen are always the
   client's own accent and paper, straight from the frontmatter, and a palette
   change needs no re-run.

   Most backdrops are captures of a web page, and a page is mostly one flat
   ground. Dots all over that ground would only fog the client's colour, so the
   script looks at the picture first: where it is mostly light, the dots follow
   its darks (the type, the photographs, the boxes), and where it is mostly dark
   they follow its lights. Either way the page's own ground stays clear and what
   is ON the page carries the dots.

   Writes public/assets/halftone/<slug>.webp (1440 x 900, a few dozen KB) and
   src/data/halftones.json (slug -> a short hash of the file, used as ?v= so a
   re-run gets past the month-long cache on /assets/). A study with no backdrop
   gets no file and no entry, and its hero keeps the flat colour.

   Run it after adding or replacing a backdrop, look at the pages, and commit
   the outputs. Nothing in the build runs it.
   ============================================================================ */

import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const studies = new URL('../src/content/case-studies/', import.meta.url);
const outDir = new URL('../public/assets/halftone/', import.meta.url);
const manifest = new URL('../src/data/halftones.json', import.meta.url);

/* The picture is drawn `cover` across the hero, so on a 1440px screen one pixel here is about one
   on screen. CELL is the screen's pitch in pixels: 12 gives dots you can see as dots without the
   picture falling apart, and keeps the file small (fewer edges to store). */
const W = 1440;
const H = 900;
const CELL = 12;
const ANGLE = Math.PI / 4;
/* The biggest dot stops short of touching its neighbours, so the strongest part of a picture is
   still a field of separate dots and never a flat slab of the paper colour. */
const MAX_R = CELL * 0.46;

/** Where a study's backdrop lives, read the same plain way case-palettes.test.ts reads a palette. */
function read(file) {
  const text = readFileSync(new URL(file, studies), 'utf8').replace(/\r\n/g, '\n');
  const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
  const backdrop = /^backdrop:\n {2}src: (.+)$/m.exec(front)?.[1]?.trim();
  return {
    slug: file.replace(/\.mdx$/, ''),
    backdrop: backdrop ? new URL(backdrop.replace(/^['"]|['"]$/g, ''), studies) : null,
  };
}

async function halftone({ backdrop }) {
  /* One grey value per screen cell is all a halftone ever reads, so shrink the picture to about
     that and stretch its tones to the full range first: a washed-out capture then still gives
     small dots and big ones. */
  const gw = Math.ceil(W / CELL) * 2;
  const gh = Math.ceil(H / CELL) * 2;
  const { data: grey } = await sharp(fileURLToPath(backdrop))
    .resize(gw, gh, { fit: 'cover' })
    .greyscale()
    .normalise()
    .blur(1.1)
    .raw()
    .toBuffer({ resolveWithObject: true });
  /* Which way round: the middle value of the whole picture says whether its ground is light. */
  const sorted = Uint8Array.from(grey).sort();
  const mostlyLight = sorted[sorted.length >> 1] > 140;
  const tone = (x, y) => {
    const gx = Math.min(gw - 1, Math.max(0, Math.round((x / W) * gw)));
    const gy = Math.min(gh - 1, Math.max(0, Math.round((y / H) * gh)));
    const v = grey[gy * gw + gx] / 255;
    // A little extra weight on the strong tones, so a faint tint in the ground makes no dot.
    return Math.pow(mostlyLight ? 1 - v : v, 1.35);
  };

  /* Every pixel finds the middle of the cell it falls in on the turned screen, reads the
     picture there, and is inside the dot or not. The half pixel of soft edge is the antialiasing. */
  const cos = Math.cos(ANGLE);
  const sin = Math.sin(ANGLE);
  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x * cos + y * sin;
      const v = -x * sin + y * cos;
      const cu = (Math.floor(u / CELL) + 0.5) * CELL;
      const cv = (Math.floor(v / CELL) + 0.5) * CELL;
      const cx = cu * cos - cv * sin;
      const cy = cu * sin + cv * cos;
      // Area, not width, is what the eye reads as tone, so the radius goes with the square root.
      const r = MAX_R * Math.sqrt(tone(cx, cy));
      const d = Math.hypot(u - cu, v - cv);
      const a = Math.min(1, Math.max(0, r - d + 0.5));
      const i = (y * W + x) * 4;
      out[i] = out[i + 1] = out[i + 2] = 255;
      // A dot under a pixel across is noise, not tone: leave it out.
      out[i + 3] = r < 0.9 ? 0 : Math.round(a * 255);
    }
  }
  /* The colour planes are plain white, so they cost nothing. The transparency is what is stored,
     at a low alpha quality: a dot's soft edge survives it and the file is about a tenth the size. */
  return sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .webp({ quality: 1, alphaQuality: 12, effort: 6 })
    .toBuffer();
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const hashes = {};
for (const file of readdirSync(studies)
  .filter((f) => f.endsWith('.mdx'))
  .sort()) {
  const study = read(file);
  if (!study.backdrop) {
    console.log(`${study.slug}: no backdrop, the hero keeps the flat colour`);
    continue;
  }
  const buf = await halftone(study);
  writeFileSync(new URL(`${study.slug}.webp`, outDir), buf);
  hashes[study.slug] = createHash('sha1').update(buf).digest('hex').slice(0, 8);
  console.log(`${study.slug}: ${(buf.length / 1024).toFixed(1)} KB`);
}
writeFileSync(manifest, JSON.stringify(hashes, null, 2) + '\n');
console.log(`Wrote ${Object.keys(hashes).length} halftones and src/data/halftones.json`);
