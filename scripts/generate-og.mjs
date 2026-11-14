/* ============================================================================
   scripts/generate-og.mjs
   ============================================================================
   Per-page Open Graph card generator. Writes one 1200x630 PNG per page into
   public/og/, plus the fallback public/og-default.png, so every page shares with
   its own card: the studio name, that page's title and that page's own picture.

   The look follows the Facebook cover (2026-11-14): the site's light paper
   background, a studio-blue panel on the left holding "Nixon Creative Studio",
   the page title and the domain, and on the right one to three gently tilted
   tiles of real work (client sites and photos), each with a rounded corner and a
   soft shadow. A link preview is small, so a card carries one to three tiles,
   never the cover's whole wall.

   Guarantees, enforced here so the build fails rather than ship a gap:
   - every non-dynamic page in src/pages/ has an entry in PAGES (a new page with
     no entry stops the build with its route named);
   - every published case study and journal post gets a card;
   - every card says "Nixon Creative Studio";
   - no two cards are byte-identical and no two share a title.

   Why a Node script and not an Astro route: the Cloudflare adapter prerenders
   pages in a V8 isolate with no node built-ins, so astro-og-canvas / canvaskit
   can't run as a route here. This runs out of process before `astro build`,
   using opentype.js to draw Hanken Grotesk glyph outlines as SVG paths and sharp
   to rasterize and composite, so the result is the real brand type on any host.
   The site's font is a variable woff2, which opentype.js cannot read, so the two
   static weights live in brand/fonts/ (@fontsource/hanken-grotesk 5.3.0, OFL).

   Output (committed, like the placeholder JSON):
     public/og-default.png           fallback (coming-soon gate, schema.ts)
     public/og/<page>.png            e.g. public/og/index.png, /og/work.png
     public/og/work/<slug>.png       one per case study
     public/og/journal/<slug>.png    one per published journal post

   BaseLayout.astro maps the current pathname to /og/<slug>.png ('' -> index).
   Output is deterministic: unchanged inputs give identical bytes.

   Run: node scripts/generate-og.mjs   (chained into `npm run build`; also `npm run og`)
   ============================================================================ */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import opentype from 'opentype.js';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const at = (...p) => resolve(root, ...p);

// --- Brand (keep in sync with src/styles/kit.css) -------------------------
const STUDIO = 'Nixon Creative Studio';
const DOMAIN = 'nixoncreativestudio.com';
const C = {
  paper: '#F5F5F3', // site background
  blue: '#2F3FE6', // the studio blue
  white: '#FFFFFF',
  soft: '#DDE1FF', // quiet text on blue
  ink: '#121211', // tile label pill
};
const W = 1200;
const H = 630;

// --- Fonts and text paths --------------------------------------------------
function loadFont(file) {
  const buf = readFileSync(at('brand/fonts', file));
  const f = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  // opentype.js cannot run this font's substitution lookups; plain latin needs none.
  delete f.tables.gsub;
  return f;
}
const FONTS = {
  500: loadFont('hanken-grotesk-latin-500-normal.woff'),
  800: loadFont('hanken-grotesk-latin-800-normal.woff'),
};
const capOf = (f) => f.tables.os2.sCapHeight / f.unitsPerEm;

// Laid out glyph by glyph (cmap, advance, pair kerning) and printed by hand:
// opentype.js 2.0.0's shaper throws on some contextual lookups, and its
// toPathData() prints NaN once a glyph is offset, which librsvg then drops.
const fmt = (n) => (Math.round(n * 100) / 100).toString();
function glyphPath(path) {
  return path.commands
    .map((c) => {
      if (c.type === 'M' || c.type === 'L') return `${c.type}${fmt(c.x)} ${fmt(c.y)}`;
      if (c.type === 'Q') return `Q${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x)} ${fmt(c.y)}`;
      if (c.type === 'C')
        return `C${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x2)} ${fmt(c.y2)} ${fmt(c.x)} ${fmt(c.y)}`;
      return 'Z';
    })
    .join('');
}
function measure(text, size, weight = 800) {
  const f = FONTS[weight];
  const g = Array.from(text, (ch) => f.charToGlyph(ch));
  let x = 0;
  g.forEach((gl, i) => {
    x += gl.advanceWidth;
    if (i < g.length - 1) x += f.getKerningValue(gl, g[i + 1]);
  });
  return (x * size) / f.unitsPerEm;
}
function textPaths(text, size, weight = 800) {
  const f = FONTS[weight];
  const scale = size / f.unitsPerEm;
  const g = Array.from(text, (ch) => f.charToGlyph(ch));
  let x = 0;
  let d = '';
  g.forEach((gl, i) => {
    const p = glyphPath(gl.getPath(x * scale, 0, size));
    if (p) d += `<path d="${p}"/>`;
    x += gl.advanceWidth;
    if (i < g.length - 1) x += f.getKerningValue(gl, g[i + 1]);
  });
  return d;
}
function text(str, x, baseline, size, weight, fill, extra = '') {
  return `<g transform="translate(${fmt(x)} ${fmt(baseline)})" fill="${fill}" ${extra}>${textPaths(str, size, weight)}</g>`;
}
function wrap(str, size, maxWidth, weight = 800) {
  const words = str.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (cur && measure(trial, size, weight) > maxWidth) {
      lines.push(cur);
      cur = w;
    } else cur = trial;
  }
  if (cur) lines.push(cur);
  return lines;
}

// --- Image sources -----------------------------------------------------------
const site = (slug) => at('src/assets/case-studies', `${slug}.png`);
const mobile = (slug) => at('src/assets/case-studies/shots', `${slug}-mobile.png`);
const photo = (name) => at('src/assets/photography/canvas', `${name}.jpg`);
const about = (name) => at('src/assets/about', `${name}.jpg`);

// --- The panel (left) --------------------------------------------------------
const PANEL = { x: 48, y: 48, w: 552, h: H - 96, pad: 48, r: 28 };

function panelSvg({ title, eyebrow }) {
  const { x, y, w, h, pad, r } = PANEL;
  const inner = w - pad * 2;
  const cap800 = capOf(FONTS[800]);
  const cap500 = capOf(FONTS[500]);

  // Studio name at the top of the panel: the one line every card shares.
  let nameSize = 40;
  while (measure(STUDIO, nameSize, 500) > inner) nameSize -= 1;
  const nameBase = y + pad + nameSize * cap500;

  // Domain pinned to the bottom.
  const domSize = 24;
  const domBase = y + h - pad;

  // Title: as large as fits in up to four lines, sitting above the domain.
  // The block (eyebrow + title) must clear the rule under the studio name.
  const lastBase = domBase - domSize * cap500 - 40;
  const ceiling = nameBase + 22 + 5 + 34;
  const eyebrowRoom = eyebrow ? 24 * cap500 + 26 : 0;
  let size = 72;
  let lines;
  let lh;
  let firstBase;
  for (;;) {
    lines = wrap(title, size, inner);
    lh = size * 1.08;
    firstBase = lastBase - (lines.length - 1) * lh;
    const top = firstBase - size * cap800 - eyebrowRoom;
    const fits =
      lines.length <= 4 && lines.every((l) => measure(l, size) <= inner) && top >= ceiling;
    if (fits || size <= 36) break;
    size -= 2;
  }
  const titleSvg = lines
    .map((l, i) => text(l, x + pad, firstBase + i * lh, size, 800, C.white))
    .join('');

  let eyebrowSvg = '';
  if (eyebrow) {
    const eSize = 24;
    const eBase = firstBase - size * cap800 - 26;
    eyebrowSvg = text(eyebrow, x + pad, eBase, eSize, 500, C.soft);
  }

  return `
  <defs>
    <filter id="panelShadow" x="-20%" y="-20%" width="140%" height="150%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>
  <rect x="${x + 6}" y="${y + 22}" width="${w - 12}" height="${h - 10}" rx="${r}" fill="${C.blue}" opacity="0.22" filter="url(#panelShadow)"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${C.blue}"/>
  ${text(STUDIO, x + pad, nameBase, nameSize, 500, C.white)}
  <rect x="${x + pad}" y="${fmt(nameBase + 22)}" width="56" height="5" rx="2.5" fill="${C.white}" opacity="0.9"/>
  ${eyebrowSvg}
  ${titleSvg}
  ${text(DOMAIN, x + pad, domBase, domSize, 500, C.soft)}`;
}

// --- Tiles (right) -----------------------------------------------------------
// Each slot is a box in card space plus a tilt; the image is cropped to the box.
// position: sharp crop gravity ('top' keeps a site's header in view).
const LAYOUTS = {
  one: [{ cx: 905, cy: 315, w: 470, h: 500, rot: -2.5 }],
  pair: [
    { cx: 885, cy: 185, w: 480, h: 236, rot: -2 },
    { cx: 920, cy: 445, w: 470, h: 236, rot: 1.8 },
  ],
  // Site above, phone beside it (case studies).
  sitePhone: [
    { cx: 865, cy: 300, w: 470, h: 420, rot: -2 },
    { cx: 1085, cy: 400, w: 170, h: 340, rot: 3 },
  ],
  trio: [
    { cx: 760, cy: 205, w: 260, h: 280, rot: -2.5 },
    { cx: 760, cy: 470, w: 250, h: 220, rot: 2 },
    { cx: 1015, cy: 330, w: 270, h: 500, rot: 1.6 },
  ],
};

function pill(label, maxW) {
  let size = 22;
  while (measure(label, size, 800) > maxW - 36 && size > 14) size -= 1;
  const tw = measure(label, size, 800);
  const ph = size + 20;
  return {
    svg: (x, y) =>
      `<rect x="${x}" y="${y}" width="${fmt(tw + 32)}" height="${ph}" rx="${ph / 2}" fill="${C.ink}" opacity="0.86"/>${text(label, x + 16, y + ph / 2 + (size * capOf(FONTS[800])) / 2, size, 800, C.white)}`,
    h: ph,
  };
}

async function tile(slot, src) {
  const { w, h } = slot;
  const r = 18;
  const img = await sharp(src.file)
    .resize(w, h, { fit: 'cover', position: src.position ?? 'centre' })
    .toBuffer();
  const overlays = [
    {
      input: Buffer.from(
        `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`,
      ),
      blend: 'dest-in',
    },
  ];
  let framed = sharp(img).composite(overlays).png();
  // Hairline frame and optional label, painted on the tile before it tilts.
  let deco = `<rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" rx="${r}" fill="none" stroke="#000" stroke-opacity="0.08" stroke-width="1.5"/>`;
  if (src.label) {
    const p = pill(src.label, w - 28);
    deco += p.svg(14, h - p.h - 14);
  }
  framed = sharp(await framed.toBuffer())
    .composite([{ input: Buffer.from(`<svg width="${w}" height="${h}">${deco}</svg>`) }])
    .png();
  const rotated = await sharp(await framed.toBuffer())
    .rotate(slot.rot, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const meta = await sharp(rotated).metadata();
  return {
    input: rotated,
    left: Math.round(slot.cx - meta.width / 2),
    top: Math.round(slot.cy - meta.height / 2),
  };
}

function shadowSvg(slots) {
  return slots
    .map(
      (s) =>
        `<rect x="${s.cx - s.w / 2 + 4}" y="${s.cy - s.h / 2 + 16}" width="${s.w - 8}" height="${s.h - 6}" rx="18" fill="#1B1F3B" opacity="0.2" filter="url(#tileShadow)" transform="rotate(${s.rot} ${s.cx} ${s.cy})"/>`,
    )
    .join('');
}

async function renderCard(card) {
  const slots = LAYOUTS[card.layout];
  if (!slots) throw new Error(`Unknown layout "${card.layout}" for ${card.route}`);
  if (card.images.length !== slots.length)
    throw new Error(`${card.route}: layout ${card.layout} needs ${slots.length} images`);
  for (const im of card.images)
    if (!existsSync(im.file))
      throw new Error(`${card.route}: missing image ${relative(root, im.file)}`);

  const base = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><filter id="tileShadow" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur stdDeviation="14"/></filter></defs>
  <rect width="${W}" height="${H}" fill="${C.paper}"/>
  ${shadowSvg(slots)}
</svg>`;
  const tiles = [];
  for (let i = 0; i < slots.length; i++) tiles.push(await tile(slots[i], card.images[i]));
  const panel = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${panelSvg(card)}</svg>`;

  return sharp(Buffer.from(base))
    .composite([...tiles, { input: Buffer.from(panel), left: 0, top: 0 }])
    .png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 })
    .toBuffer();
}

// --- Pages -------------------------------------------------------------------
// One entry per non-dynamic route in src/pages/. Every card gets its own title
// and its own picture. Photos come from the photography canvas set (no dates on
// any of them); sites are the case-study captures.
const S = (slug, label) => ({ file: site(slug), position: 'top', label });
const P = (name, label) => ({ file: photo(name), label });

const PAGES = [
  {
    route: 'index',
    title: 'Websites your team can update. Photos of your people.',
    layout: 'trio',
    images: [
      S('stone-steps-50k', 'Stone Steps 50K'),
      P('grad-friends', 'Graduation'),
      P('conference-group', 'Church photography'),
    ],
  },
  {
    route: 'work',
    title: 'Case studies',
    layout: 'trio',
    images: [
      S('mas-monograms', 'MAS Monograms'),
      S('reid-design', 'Reid Design'),
      S('theology-matters', 'Theology Matters'),
    ],
  },
  {
    route: 'services',
    title: 'Prices',
    eyebrow: 'Websites, photography, hosting',
    layout: 'pair',
    images: [
      S('first-baptist-muncie', 'First Baptist Muncie'),
      S('foundation-for-reformed-theology', 'Foundation for Reformed Theology'),
    ],
  },
  {
    route: 'about',
    title: 'About the studio',
    layout: 'one',
    images: [{ file: about('running-race-bibs'), position: 'north' }],
  },
  {
    route: 'now',
    title: "What I'm doing now",
    layout: 'one',
    images: [{ file: about('family-picnic') }],
  },
  {
    route: 'photography',
    title: 'Photography',
    eyebrow: 'Cincinnati region',
    layout: 'pair',
    images: [P('wedding-first-dance', 'Weddings'), P('easter-choir', 'Churches')],
  },
  { route: 'journal', title: 'Journal', layout: 'one', images: [P('library-dusk')] },
  {
    route: 'churches',
    title: 'Church websites',
    layout: 'pair',
    images: [
      S('first-baptist-muncie', 'First Baptist Muncie'),
      P('anniversary-group', 'Church photography'),
    ],
  },
  {
    route: 'schools',
    title: 'School websites',
    layout: 'pair',
    images: [
      S('presbyterian-academy', 'Presbyterian Academy'),
      P('preschool-cap', 'School photography'),
    ],
  },
  {
    route: 'nonprofits',
    title: 'Nonprofit websites',
    layout: 'pair',
    images: [
      S('foundation-for-reformed-theology', 'Foundation for Reformed Theology'),
      P('tm-podium', 'Event photography'),
    ],
  },
  {
    route: 'small-business',
    title: 'Small business websites',
    layout: 'pair',
    images: [S('mas-monograms', 'MAS Monograms'), S('reid-design', 'Reid Design')],
  },
  {
    route: 'one-page',
    title: 'The studio on one page',
    layout: 'one',
    images: [S('stone-steps-50k')],
  },
  { route: 'contact', title: 'Start a project', layout: 'one', images: [P('piano-hands')] },
  {
    route: 'colophon',
    title: 'How this site is built',
    eyebrow: 'Colophon',
    layout: 'one',
    images: [S('theology-matters')],
  },
  { route: 'privacy', title: 'Privacy', layout: 'one', images: [P('ig-canal-footbridge')] },
  { route: 'accessibility', title: 'Accessibility', layout: 'one', images: [P('ig-calm-river')] },
  { route: 'text', title: 'Text me back', layout: 'one', images: [P('ig-farmland-clouds')] },
  { route: '404', title: 'Page not found', layout: 'one', images: [P('ig-lone-walker-snow')] },
];

// The fallback card (coming-soon gate, schema.ts Organization image).
const DEFAULT_CARD = {
  route: '../og-default',
  title: 'Web design, photography, strategy',
  layout: 'pair',
  images: [S('theology-matters', 'Theology Matters'), P('grad-family', 'Graduation')],
};

// Routes that never get a card of their own: coming-soon sets og-default.png.
const NO_CARD = new Set(['coming-soon']);

// Every non-dynamic page in src/pages/ must have an entry above.
function staticRoutes(dir = at('src/pages'), prefix = '') {
  const out = [];
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) out.push(...staticRoutes(full, `${prefix}${f}/`));
    else if (/\.astro$/.test(f) && !f.includes('[')) {
      const name = f.replace(/\.astro$/, '');
      out.push(name === 'index' ? prefix.replace(/\/$/, '') || 'index' : `${prefix}${name}`);
    }
  }
  return out;
}
const known = new Set(PAGES.map((p) => p.route));
const missing = staticRoutes().filter((r) => !known.has(r) && !NO_CARD.has(r));
if (missing.length)
  throw new Error(`No OG card entry in scripts/generate-og.mjs PAGES for: ${missing.join(', ')}`);

// --- Collections -------------------------------------------------------------
function frontmatter(file) {
  const m = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
}
function field(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}
function mdx(dir) {
  const base = at(dir);
  return existsSync(base)
    ? readdirSync(base)
        .filter((f) => f.endsWith('.mdx'))
        .sort()
    : [];
}

const caseStudies = mdx('src/content/case-studies').map((f) => {
  const slug = f.replace(/\.mdx$/, '');
  const fm = frontmatter(at('src/content/case-studies', f));
  const client = field(fm, 'client') ?? field(fm, 'title') ?? slug;
  const hasPhone = existsSync(mobile(slug));
  return {
    route: `work/${slug}`,
    title: client,
    eyebrow: 'Case study',
    layout: hasPhone ? 'sitePhone' : 'one',
    images: hasPhone
      ? [
          { file: site(slug), position: 'top' },
          { file: mobile(slug), position: 'top' },
        ]
      : [{ file: site(slug), position: 'top' }],
  };
});

// Journal: a post's own cover when it has one, else a photo for its cluster.
const CLUSTER_PHOTO = {
  lab: 'film-music-keys',
  nonprofits: 'tm-handshake',
  costs: 'sanctuary-band',
  churches: 'film-greens-welcome',
  schools: 'preschool-bubbles',
};
// A picture per post, so posts in one cluster still look different. A new post
// with no entry here falls back to its cluster's photo (its title keeps it unique).
const POST_PHOTO = {
  'church-av-rota-that-fills-its-own-gaps': photo('sanctuary-band'),
  'google-ad-grants-does-your-nonprofit-website-qualify': photo('tm-handshake'),
  'how-i-check-every-client-site': photo('ig-hiker-ridge-view'),
  'how-much-does-a-church-website-cost': photo('easter-pews'),
  'how-to-show-up-in-chatgpt-and-google-ai-answers': photo('film-greens-welcome'),
  'minecraft-server-for-my-family-and-your-website': about('family-shoulders'),
  'squarespace-vs-wordpress-vs-custom-church-website': photo('choir-red'),
  'what-parents-look-for-on-a-preschool-website': photo('preschool-bubbles'),
};
const journal = mdx('src/content/journal')
  .filter((f) => !/^draft:\s*true/m.test(frontmatter(at('src/content/journal', f))))
  .map((f) => {
    const slug = f.replace(/\.mdx$/, '');
    const fm = frontmatter(at('src/content/journal', f));
    const own = POST_PHOTO[slug];
    const cover = field(fm, 'cover');
    const coverFile = cover ? resolve(at('src/content/journal'), cover) : null;
    const file =
      coverFile && existsSync(coverFile)
        ? coverFile
        : (own ?? photo(CLUSTER_PHOTO[field(fm, 'cluster')] ?? 'library-dusk'));
    return {
      route: `journal/${slug}`,
      title: field(fm, 'metaTitle') ?? field(fm, 'title') ?? slug,
      eyebrow: 'Journal',
      layout: 'one',
      images: [{ file }],
    };
  });

// --- Write -------------------------------------------------------------------
const cards = [DEFAULT_CARD, ...PAGES, ...caseStudies, ...journal];

const titles = new Map();
for (const c of cards) {
  const key = `${c.eyebrow ?? ''}|${c.title}`.toLowerCase();
  if (titles.has(key))
    throw new Error(`Two OG cards share a title: ${titles.get(key)} and ${c.route}`);
  titles.set(key, c.route);
}

const hashes = new Map();
for (const c of cards) {
  const png = await renderCard(c);
  const hash = createHash('sha256').update(png).digest('hex');
  if (hashes.has(hash))
    throw new Error(`OG cards ${hashes.get(hash)} and ${c.route} are identical`);
  hashes.set(hash, c.route);
  const out = at('public/og', `${c.route}.png`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, png);
}
console.log(`Generated ${cards.length} OG cards (public/og/ and og-default.png), all unique`);
