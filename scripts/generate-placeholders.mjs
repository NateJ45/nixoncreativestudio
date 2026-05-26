/* ============================================================================
   scripts/generate-placeholders.mjs
   ============================================================================
   Pre-build step that scans src/assets/case-studies/ for cover images,
   generates a tiny base64 blur preview for each via plaiceholder, and
   writes the lot to src/lib/coverPlaceholders.json.

   The JSON is then imported by src/lib/coverPlaceholder.ts (a runtime-safe
   lookup) and passed to CaseStudyCover so the wrapper can paint the blur
   while the full image downloads.

   Why a pre-build script rather than calling plaiceholder inline in the
   page frontmatter: Astro pages render inside the Cloudflare Pages
   prerender worker, which runs in a V8 isolate without node:fs.
   Plaiceholder needs fs to read the original image bytes, so we have to
   do the work in Node before the prerender worker ever spins up.

   Convention: cover filename matches the case study slug (the .mdx
   filename without extension). e.g. crestview-presbyterian.mdx pairs
   with crestview-presbyterian.png in src/assets/case-studies/.

   Run with:
     node scripts/generate-placeholders.mjs

   Hooked into `npm run build` via package.json so it runs automatically
   on every build (including Cloudflare Pages CI). Re-run by hand after
   adding a new case study cover during dev:
     npm run placeholders
   ============================================================================ */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPlaiceholder } from 'plaiceholder';

const __dirname    = dirname(fileURLToPath(import.meta.url));
const projectRoot  = resolve(__dirname, '..');
const coversDir    = resolve(projectRoot, 'src/assets/case-studies');
const outFile      = resolve(projectRoot, 'src/lib/coverPlaceholders.json');
const validExts    = new Set(['.png', '.jpg', '.jpeg', '.webp']);

// --- Discover --------------------------------------------------------------

let files;
try {
  files = await readdir(coversDir);
} catch (err) {
  if (err.code === 'ENOENT') {
    console.warn(`[placeholders] ${coversDir} does not exist yet. Writing empty JSON.`);
    files = [];
  } else {
    throw err;
  }
}

const covers = files.filter((name) => validExts.has(extname(name).toLowerCase()));

// --- Generate --------------------------------------------------------------

const out = {};

for (const file of covers) {
  const slug = basename(file, extname(file));
  const path = resolve(coversDir, file);

  try {
    const buffer = await readFile(path);
    // size:8 keeps the encoded string ~150-300 bytes per cover. The
    // wrapper applies a CSS blur(20px) so the tiny preview reads as a
    // smooth color wash rather than a pixelated thumbnail.
    const { base64 } = await getPlaiceholder(buffer, { size: 8 });
    out[slug] = base64;
    console.log(`[placeholders] ${slug}: ${base64.length} bytes`);
  } catch (err) {
    console.warn(`[placeholders] Failed for ${slug}: ${err.message}`);
  }
}

// --- Write -----------------------------------------------------------------

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, JSON.stringify(out, null, 2) + '\n', 'utf8');

console.log(`[placeholders] Wrote ${Object.keys(out).length} entries to ${outFile}`);
