/* ============================================================================
   scripts/generate-og.mjs
   ============================================================================
   Per-page Open Graph card generator. Writes one 1200x630 PNG per page into
   public/og/, so every page (and every case study / journal entry) shares with
   its own branded card instead of the single default.

   Why a Node script and not an Astro route: the Cloudflare adapter prerenders
   pages in a V8 isolate with no node built-ins (no node:crypto, no node:fs), so
   astro-og-canvas / canvaskit can't run as a route here. This runs out of
   process before `astro build` (same pattern as generate-placeholders.mjs and
   generate-og-default.mjs), using opentype.js to draw Bebas Neue glyph outlines
   as SVG paths and sharp to rasterize, so the result is the real brand typeface
   on any build host.

   Output (committed, like og-default.png and the placeholder JSON):
     public/og/<page>.png            e.g. public/og/index.png, /og/work.png
     public/og/work/<slug>.png       one per case study
     public/og/journal/<slug>.png    one per journal entry

   BaseLayout.astro maps the current pathname to /og/<slug>.png ('' -> index).
   Output is deterministic, so re-running with unchanged content produces
   identical bytes (no git churn).

   Run: node scripts/generate-og.mjs   (chained into `npm run build`)
   ============================================================================ */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import opentype from 'opentype.js';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// --- Brand constants (keep in sync with globals.css / generate-og-default) ---
const STUDIO = 'Nixon Creative Studio';
const COLORS = {
  bg0:    '#0A1628', // navy
  bg1:    '#0F1E33', // lifted navy for the gradient
  fg:     '#F4F7FA', // off-white title
  amber:  '#FFA334', // brand amber for the studio line
  accent: '#3478BD', // NCS blue accent rule
};
const WIDTH = 1200;
const HEIGHT = 630;
const PAD = 90;

// --- Font ------------------------------------------------------------------
const fontPath = resolve(
  projectRoot,
  'node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff',
);
function loadFont(p) {
  const buf = readFileSync(p);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}
const font = loadFont(fontPath);

// Bebas Neue is an all-caps display face; render titles uppercased so wrapping
// math matches what actually paints.
const up = (s) => s.toUpperCase();
function advance(text, size) {
  return font.getAdvanceWidth(up(text), size);
}
function pathData(text, size) {
  return font.getPath(up(text), 0, 0, size).toPathData(2);
}

// Greedy word-wrap to fit maxWidth at the given size.
function wrap(text, size, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (cur && advance(trial, size) > maxWidth) {
      lines.push(cur);
      cur = w;
    } else {
      cur = trial;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// --- Card builder ----------------------------------------------------------
function buildSvg(title) {
  const maxWidth = WIDTH - PAD * 2;

  // Start large, shrink until the title fits in at most 3 lines.
  let size = 104;
  let lines = wrap(title, size, maxWidth);
  while (lines.length > 3 && size > 54) {
    size -= 8;
    lines = wrap(title, size, maxWidth);
  }
  const lineHeight = size * 1.0;
  const titleBlock = lines.length * lineHeight;

  const studioSize = 34;
  const gap = 44;
  const groupHeight = titleBlock + gap + studioSize;
  const groupTop = (HEIGHT - groupHeight) / 2;

  // Accent bar sits just above the title block.
  const barY = groupTop - 34;

  // Title line baselines (opentype positions glyphs above the baseline).
  const titlePaths = lines
    .map((line, i) => {
      const baseline = groupTop + size * 0.82 + i * lineHeight;
      return `<g transform="translate(${PAD}, ${baseline})" fill="${COLORS.fg}"><path d="${pathData(line, size)}" /></g>`;
    })
    .join('\n  ');

  const studioBaseline = groupTop + titleBlock + gap + studioSize * 0.82;
  const studioPath = `<g transform="translate(${PAD}, ${studioBaseline})" fill="${COLORS.amber}"><path d="${pathData(STUDIO, studioSize)}" /></g>`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${COLORS.bg0}" />
      <stop offset="1" stop-color="${COLORS.bg1}" />
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />

  <!-- Short accent bar above the title. -->
  <rect x="${PAD}" y="${barY}" width="84" height="6" rx="3" fill="${COLORS.accent}" />

  ${titlePaths}
  ${studioPath}

  <!-- Bottom brand edge (full-width accent rule, not a side stripe). -->
  <rect x="0" y="${HEIGHT - 12}" width="${WIDTH}" height="12" fill="${COLORS.accent}" />
</svg>`.trim();
}

// --- Cover-card builder (case studies) -------------------------------------
// For a case study we put the REAL hero screenshot behind the card, with a navy
// scrim for legibility and the title anchored bottom-left. A share of a case
// study then shows the actual shipped work, which is the strongest trust signal
// the studio has. Non-case-study pages keep the plain navy card above.
function buildCoverOverlay(title) {
  const maxWidth = WIDTH - PAD * 2;

  // Same greedy shrink-to-fit as the navy card, a touch smaller to leave room
  // for the screenshot to breathe behind it.
  let size = 92;
  let lines = wrap(title, size, maxWidth);
  while (lines.length > 3 && size > 50) {
    size -= 8;
    lines = wrap(title, size, maxWidth);
  }
  const lineHeight = size * 1.0;

  // Anchor the text to the bottom-left, building baselines upward from the
  // studio line so the block always sits the same distance off the bottom edge.
  const studioSize = 32;
  const studioBaseline = HEIGHT - 60;
  const gap = 30;
  const studioTop = studioBaseline - studioSize * 0.82;
  const lastBaseline = studioTop - gap;
  const firstBaseline = lastBaseline - (lines.length - 1) * lineHeight;
  const barY = firstBaseline - size * 0.82 - 30;

  const titlePaths = lines
    .map((line, i) => {
      const baseline = firstBaseline + i * lineHeight;
      return `<g transform="translate(${PAD}, ${baseline})" fill="${COLORS.fg}"><path d="${pathData(line, size)}" /></g>`;
    })
    .join('\n  ');
  const studioPath = `<g transform="translate(${PAD}, ${studioBaseline})" fill="${COLORS.amber}"><path d="${pathData(STUDIO, studioSize)}" /></g>`;

  // Two scrims: a vertical one (darkens the bottom for the text) and a
  // horizontal one (darkens the left where the text sits), so off-white type
  // clears contrast over any screenshot.
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="scrimV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.12" stop-color="${COLORS.bg0}" stop-opacity="0" />
      <stop offset="1" stop-color="${COLORS.bg0}" stop-opacity="0.94" />
    </linearGradient>
    <linearGradient id="scrimH" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${COLORS.bg0}" stop-opacity="0.72" />
      <stop offset="0.62" stop-color="${COLORS.bg0}" stop-opacity="0" />
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#scrimV)" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#scrimH)" />

  <rect x="${PAD}" y="${barY}" width="84" height="6" rx="3" fill="${COLORS.accent}" />
  ${titlePaths}
  ${studioPath}

  <rect x="0" y="${HEIGHT - 12}" width="${WIDTH}" height="12" fill="${COLORS.accent}" />
</svg>`.trim();
}

async function writeCard(relPath, title, cover) {
  const hasCover = cover && existsSync(cover);
  let png;
  if (hasCover) {
    // Hero screenshot fills the card (top-anchored so the site header/hero
    // shows), then the scrim + title overlay paints on top.
    const coverBuf = await sharp(cover)
      .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'top' })
      .toBuffer();
    png = await sharp(coverBuf)
      .composite([{ input: Buffer.from(buildCoverOverlay(title)), left: 0, top: 0 }])
      .png()
      .toBuffer();
  } else {
    png = await sharp(Buffer.from(buildSvg(title))).png().toBuffer();
  }
  const outPath = resolve(projectRoot, 'public/og', `${relPath}.png`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, png);
  return outPath;
}

// --- Frontmatter title reader ----------------------------------------------
// Minimal: pull the `title:` line out of an MDX file's frontmatter block.
function readTitle(file) {
  const text = readFileSync(file, 'utf8');
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const m = fm[1].match(/^title:\s*(.+)$/m);
  if (!m) return null;
  return m[1].trim().replace(/^['"]|['"]$/g, '');
}
function collectionEntries(dir, prefix) {
  const base = resolve(projectRoot, dir);
  if (!existsSync(base)) return [];
  return readdirSync(base)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => {
      const slug = f.replace(/\.mdx$/, '');
      const title = readTitle(join(base, f)) ?? slug;
      const entry = { route: `${prefix}/${slug}`, title };
      // Case study covers (real hero screenshots) drive the cover OG card.
      if (prefix === 'work') {
        for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
          const c = resolve(projectRoot, 'src/assets/case-studies', `${slug}.${ext}`);
          if (existsSync(c)) {
            entry.cover = c;
            break;
          }
        }
      }
      return entry;
    });
}

// --- Pages -----------------------------------------------------------------
const STATIC_PAGES = [
  { route: 'index',       title: 'Modern websites and photography' },
  { route: 'work',        title: 'Selected work' },
  { route: 'services',    title: 'Services' },
  { route: 'about',       title: 'About the studio' },
  { route: 'photography', title: 'Photography' },
  { route: 'journal',     title: 'Journal' },
  { route: 'contact',     title: 'Start a project' },
  { route: 'colophon',    title: 'Colophon' },
  { route: 'privacy',     title: 'Privacy' },
  { route: '404',         title: 'Page not found' },
];

const pages = [
  ...STATIC_PAGES,
  ...collectionEntries('src/content/case-studies', 'work'),
  ...collectionEntries('src/content/journal', 'journal'),
];

let count = 0;
for (const page of pages) {
  await writeCard(page.route, page.title, page.cover);
  count += 1;
}
console.log(`Generated ${count} OG cards into public/og/`);
