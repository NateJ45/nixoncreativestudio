// Safe to edit.
/* ============================================================================
   gbp-shots.mjs: device-frame photos of client sites for Google Business Profile
   ============================================================================
   Two steps for the stills, so you can look at the raw captures before
   rendering, plus a separate video step:

     node scripts/gbp-shots.mjs capture [slug ...]   shoot the live sites
     node scripts/gbp-shots.mjs render  [slug ...]   build the finished JPGs
     node scripts/gbp-shots.mjs all     [slug ...]   capture + render
     node scripts/gbp-shots.mjs video   [slug ...]   scrolling phone MP4s

   capture: for each case study with a liveUrl (plus extra pages listed in
   gbp-shots.config.mjs) it opens the live site at 1440 wide (2x) and 390 wide
   (3x), loads every lazy image, hides cookie banners, then saves the hero and
   each big section into gbp-shots/raw/{slug}/.

   render: draws CSS laptops and phones around those captures, with studio
   lighting and contact shadows, on a backdrop in the site's brand colour, and
   screenshots the result into gbp-shots/out/:

     {slug}-duo.jpg        1600 x 1200  laptop + phone, straight on
     {slug}-angle.jpg      1600 x 1200  laptop turned three-quarters, phone beside
     {slug}-phones.jpg     1200 x 1200  three phones, staggered
     {slug}-detail-N.jpg   1200 x 1200  one strong section, frameless
     {slug}-{page}.jpg     1600 x 1200  laptop + phone on an extra page
     cover-wall.jpg        1920 x 1080  every site in a tilted wall (16:9 cover)

   video: takes one tall phone capture of each homepage (about five and a
   half screens, saved as raw/{slug}/phone-tall.png), puts it in the same CSS
   phone on the same backdrop at 1080 x 1920, and films the screen holding on
   the hero, easing down about four and a half screens and back up: 14 s,
   30 fps, H.264, silent, written by ffmpeg (must be on PATH) to
   gbp-shots/out/video/{slug}-scroll.mp4. Sticky headers scroll away with
   the page, because the capture is one still.

   Every layout keeps the devices inside the centre square, because Google
   crops thumbnails to a square. There is no text on any image: Google shows
   your business name already, and text-heavy photos get demoted.

   gbp-shots/ is gitignored. Look at every output before uploading: a cookie
   banner or a half-loaded hero is easy to miss.
   ============================================================================ */

import { readFileSync, mkdirSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import config from './gbp-shots.config.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const base = process.env.GBP_SHOTS_DIR || `${root}gbp-shots`;
const rawDir = `${base}/raw`;
const outDir = `${base}/out`;
const tmpDir = `${base}/.tmp`;
for (const d of [rawDir, outDir, tmpDir]) mkdirSync(d, { recursive: true });

// One site per case study with a liveUrl (slug = file name), so the list never
// drifts from the portfolio. Set skip: true in the config to leave one out.
const csDir = `${root}src/content/case-studies`;
const sites = readdirSync(csDir)
  .filter((f) => /\.mdx?$/.test(f))
  .map((f) => ({
    slug: f.replace(/\.mdx?$/, ''),
    url: readFileSync(`${csDir}/${f}`, 'utf8').match(/^liveUrl:\s*['"]?([^'"\s]+)/m)?.[1],
  }))
  .filter((s) => s.url && !config[s.slug]?.skip);

const [step = 'all', ...only] = process.argv.slice(2);
const todo = only.length ? sites.filter((s) => only.includes(s.slug)) : sites;
if (!['capture', 'render', 'video', 'all'].includes(step)) {
  console.log('usage: node scripts/gbp-shots.mjs capture|render|video|all [slug ...]');
  process.exit(1);
}

const HIDE_BANNERS = `
  [id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i],
  #onetrust-banner-sdk, .cc-window, .termly-styles-root,
  [class*="donate-prompt" i], [id*="donate-prompt" i], #donatePrompt,
  [class*="to-top" i], [class*="totop" i], [class*="back-to-top" i] { display: none !important; }
`;

const shapes = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  phone: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
};

/* ---------------------------------------------------------------- capture */

async function loadPage(page, url, hide) {
  // Some sites (chat widgets, analytics beacons) never go network-idle, so
  // load first and give idle a bounded wait.
  // A hero video can hold off "load" forever too, so fall back to the DOM.
  await page
    .goto(url, { waitUntil: 'load', timeout: 45_000 })
    .catch(() => page.waitForLoadState('domcontentloaded'));
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.addStyleTag({
    content: HIDE_BANNERS + (hide ? `${hide} { display: none !important; }` : ''),
  });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);
}

// Tops of the page's big blocks below the hero, so each one can be shot
// filling the viewport.
async function sectionTops(page, minWidth, skip) {
  return page.evaluate(
    ({ minWidth, skip }) => {
      const els = document.querySelectorAll(
        'main section, main > *, main > div > *, body > section, footer',
      );
      const tops = [];
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const top = Math.round(r.top + window.scrollY);
        if (r.height < 380 || r.width < minWidth || top < skip) continue;
        if (tops.some((t) => Math.abs(t - top) < 350)) continue;
        tops.push(top);
      }
      return tops.sort((a, b) => a - b).slice(0, 8);
    },
    { minWidth, skip },
  );
}

async function shoot(browser, site, kind, url, prefix, withSections) {
  const context = await browser.newContext({
    ...shapes[kind],
    reducedMotion: config[site.slug]?.motion ? 'no-preference' : 'reduce',
  });
  const page = await context.newPage();
  context.setDefaultTimeout(30_000);
  // A flaky site can hang a step forever; closing the context after two
  // minutes makes whatever is pending throw, so one site never stalls the run.
  const guard = setTimeout(() => context.close().catch(() => {}), 120_000);
  const dir = `${rawDir}/${site.slug}`;
  mkdirSync(dir, { recursive: true });
  const meta = {};
  try {
    await loadPage(page, url, config[site.slug]?.hide);
    await page.screenshot({ path: `${dir}/${kind}-${prefix}.png` });
    meta.themeColor = await page
      .$eval('meta[name="theme-color"]', (m) => m.content)
      .catch(() => null);
    if (withSections) {
      const vh = shapes[kind].viewport.height;
      const tops = await sectionTops(page, kind === 'desktop' ? 1000 : 350, vh * 0.75);
      let n = 0;
      for (const top of tops) {
        await page.evaluate((y) => window.scrollTo(0, y), top);
        await page.waitForTimeout(500);
        // A sticky header would cover the section's heading, so step back by
        // whatever is pinned to the top of the viewport, plus a little air.
        // Measured twice, because some headers only reappear on scroll-up.
        // Small floating buttons (back to top, chat bubbles) get hidden too.
        const measure = () =>
          page.evaluate(() => {
            let h = 0;
            for (const el of document.querySelectorAll('body *')) {
              const p = getComputedStyle(el).position;
              if (p !== 'fixed' && p !== 'sticky') continue;
              const r = el.getBoundingClientRect();
              if (p === 'fixed' && r.width < 100 && r.height < 100 && r.top > innerHeight / 2) {
                el.style.setProperty('display', 'none', 'important');
              }
              if (r.top <= 2 && r.bottom > 0 && r.height < 220 && r.width > innerWidth / 2) {
                h = Math.max(h, r.bottom);
              }
            }
            return h;
          });
        const scrollTo = (y) => page.evaluate((v) => window.scrollTo(0, Math.max(0, v)), y);
        const pinned = await measure();
        await scrollTo(top - pinned - 4);
        await page.waitForTimeout(500);
        const again = await measure();
        if (again > pinned) await scrollTo(top - again - 4);
        await page.waitForTimeout(700);
        n += 1;
        await page.screenshot({ path: `${dir}/${kind}-sec-${String(n).padStart(2, '0')}.png` });
      }
      meta.sections = n;
    }
    console.log(
      `captured ${site.slug} ${kind} ${prefix}${meta.sections ? ` + ${meta.sections} sections` : ''}`,
    );
  } catch (err) {
    console.log(`FAILED ${site.slug} ${kind} ${prefix}: ${String(err).split('\n')[0]}`);
  }
  clearTimeout(guard);
  await context.close().catch(() => {});
  return meta;
}

async function capture() {
  const browser = await chromium.launch();
  for (const site of todo) {
    const meta = { url: site.url };
    meta.desktop = await shoot(browser, site, 'desktop', site.url, 'hero', true);
    meta.phone = await shoot(browser, site, 'phone', site.url, 'hero', true);
    for (const p of config[site.slug]?.pages ?? []) {
      const url = new URL(p.path, site.url).href;
      await shoot(browser, site, 'desktop', url, p.name, false);
      await shoot(browser, site, 'phone', url, p.name, false);
    }
    writeFileSync(`${rawDir}/${site.slug}/meta.json`, JSON.stringify(meta, null, 2));
  }
  await browser.close();
}

/* ----------------------------------------------------------------- render */

const fileUrl = (p) => pathToFileURL(p).href;

// The colour of the phone capture's top rows, so the status bar continues the
// site's own header instead of a black strip.
async function topColour(file) {
  const { data } = await sharp(file)
    .extract({ left: 0, top: 0, width: 60, height: 6 })
    .resize(1, 1)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [r, g, b] = data;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return { bg: `rgb(${r},${g},${b})`, ink: lum > 0.6 ? '#111' : '#fff' };
}

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: var(--W); height: var(--H); overflow: hidden; }
body {
  font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
  /* Studio sweep: a soft key light from above, falling off to the corners. */
  background:
    radial-gradient(120% 95% at 50% 12%,
      color-mix(in oklab, var(--bg), white 16%) 0%,
      var(--bg) 46%,
      color-mix(in oklab, var(--bg), black 34%) 100%);
  position: relative;
}
body::after { /* faint film grain so the gradient never bands */
  content: ''; position: absolute; inset: 0; opacity: .05; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.stage { position: absolute; inset: 0; }
.abs { position: absolute; }

/* Laptop */
.laptop { width: var(--w); position: relative; }
.laptop .lid {
  width: 86%; margin: 0 auto; position: relative; background: #0c0c0e;
  border-radius: calc(var(--w) * .024) calc(var(--w) * .024) calc(var(--w) * .005) calc(var(--w) * .005);
  padding: calc(var(--w) * .015) calc(var(--w) * .015) calc(var(--w) * .022);
  box-shadow: 0 0 0 calc(var(--w) * .0018) #6e7075, 0 0 0 calc(var(--w) * .0036) #c9cbcf;
}
.laptop .cam { position: absolute; top: calc(var(--w) * .006); left: 50%; width: calc(var(--w) * .004);
  aspect-ratio: 1; border-radius: 50%; background: #23252b; transform: translateX(-50%); }
.screen { aspect-ratio: 16 / 10; overflow: hidden; position: relative; background: #fff;
  border-radius: calc(var(--w) * .003); }
.screen img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
.screen::after, .pscreen::after { /* a single soft reflection from the key light */
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(118deg, rgba(255,255,255,.13) 0%, rgba(255,255,255,.04) 30%, rgba(255,255,255,0) 30.2%);
}
.laptop .base {
  width: 100%; height: calc(var(--w) * .026); position: relative; margin-top: -1px;
  background: linear-gradient(#f1f2f4 0%, #d4d6d9 30%, #a9acb1 78%, #7d8086 100%);
  border-radius: calc(var(--w) * .002) calc(var(--w) * .002) calc(var(--w) * .05) calc(var(--w) * .05) / calc(var(--w) * .002) calc(var(--w) * .002) calc(var(--w) * .016) calc(var(--w) * .016);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.9);
}
.laptop .notch { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 15%; height: 34%;
  background: linear-gradient(#a6a9ae, #cdd0d3); border-radius: 0 0 calc(var(--w) * .01) calc(var(--w) * .01); }
.laptop .contact { position: absolute; left: 2%; right: 2%; bottom: calc(var(--w) * -.014); height: calc(var(--w) * .03);
  background: radial-gradient(closest-side, rgba(0,0,0,.6), rgba(0,0,0,0)); filter: blur(calc(var(--w) * .005)); z-index: -1; }
.laptop .ambient { position: absolute; left: -6%; right: -6%; bottom: calc(var(--w) * -.06); height: calc(var(--w) * .12);
  background: radial-gradient(closest-side, rgba(0,0,0,.32), rgba(0,0,0,0)); filter: blur(calc(var(--w) * .02)); z-index: -2; }

/* Phone */
.phone { width: var(--w); position: relative; background: #121214; padding: calc(var(--w) * .034);
  border-radius: calc(var(--w) * .17);
  box-shadow:
    inset 0 0 0 calc(var(--w) * .006) #2a2b2f,
    0 0 0 calc(var(--w) * .006) #7f8288,
    0 0 0 calc(var(--w) * .011) #34353a,
    0 calc(var(--w) * .05) calc(var(--w) * .09) rgba(0,0,0,.28),
    0 calc(var(--w) * .16) calc(var(--w) * .34) rgba(0,0,0,.30);
}
.phone .btn { position: absolute; width: calc(var(--w) * .012); background: #4a4c51; border-radius: 2px; }
.pscreen { aspect-ratio: 390 / 844; overflow: hidden; position: relative; border-radius: calc(var(--w) * .135); }
.pscreen img { position: absolute; left: 0; top: 5.6%; width: 100%; display: block; }
.pscreen .status { position: absolute; left: 0; right: 0; top: 0; height: 5.6%; display: flex;
  align-items: center; justify-content: space-between; padding: 0 9% 0 11%;
  font-size: calc(var(--w) * .047); font-weight: 600; letter-spacing: -.01em; z-index: 2; }
.pscreen .status svg { height: calc(var(--w) * .038); fill: currentColor; }
.phone .island { position: absolute; top: calc(var(--w) * .062); left: 50%; transform: translateX(-50%);
  width: 31%; height: calc(var(--w) * .088); background: #000; border-radius: 999px; z-index: 3; }

/* Frameless detail */
.detail { position: absolute; overflow: hidden; border-radius: 14px;
  box-shadow: 0 2px 4px rgba(0,0,0,.12), 0 24px 48px -8px rgba(0,0,0,.35), 0 60px 120px -20px rgba(0,0,0,.35); }
.detail img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }

/* Cover wall */
.wall { position: absolute; left: 50%; top: 50%; display: grid; gap: 44px;
  grid-template-columns: repeat(5, 620px);
  transform: translate(-50%, -50%) perspective(3200px) rotateX(24deg) rotateZ(-16deg); }
.tile { aspect-ratio: 16 / 10; border-radius: 12px; overflow: hidden;
  box-shadow: 0 30px 60px -10px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.06); }
.tile img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
`;

const ICONS = `<span style="display:flex;gap:.35em;align-items:center">
<svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx=".8"/><rect x="5" y="5.5" width="3" height="6.5" rx=".8"/><rect x="10" y="3" width="3" height="9" rx=".8"/><rect x="15" y="0" width="3" height="12" rx=".8"/></svg>
<svg viewBox="0 0 16 12"><path d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.6 10.6 0 0 0 8 .4 10.6 10.6 0 0 0 .5 3.4l1.2 1.3A8.9 8.9 0 0 1 8 2.2Zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3A7.3 7.3 0 0 0 8 4a7.3 7.3 0 0 0-4.9 1.9l1.2 1.3c1-.9 2.3-1.4 3.7-1.4Zm0 3.5c-.6 0-1.2.2-1.6.6L8 11.6l1.6-1.7c-.4-.4-1-.6-1.6-.6Z"/></svg>
<svg viewBox="0 0 27 12"><rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="19" height="8" rx="1.8"/><rect x="24" y="4" width="1.6" height="4" rx=".8" opacity=".45"/></svg></span>`;

const laptop = (src, w) => `
<div class="laptop" style="--w:${w}px">
  <div class="ambient"></div><div class="contact"></div>
  <div class="lid"><span class="cam"></span><div class="screen"><img src="${fileUrl(src)}"></div></div>
  <div class="base"><div class="notch"></div></div>
</div>`;

const phone = async (src, w) => {
  const c = await topColour(src);
  return `
<div class="phone" style="--w:${w}px">
  <span class="btn" style="left:-${w * 0.012}px;top:${w * 0.42}px;height:${w * 0.1}px"></span>
  <span class="btn" style="left:-${w * 0.012}px;top:${w * 0.58}px;height:${w * 0.16}px"></span>
  <span class="btn" style="right:-${w * 0.012}px;top:${w * 0.62}px;height:${w * 0.24}px"></span>
  <div class="island"></div>
  <div class="pscreen" style="background:${c.bg}">
    <div class="status" style="color:${c.ink}"><span>9:41</span>${ICONS}</div>
    <img src="${fileUrl(src)}">
  </div>
</div>`;
};

async function renderHtml(browser, name, W, H, bg, body) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>
<body style="--W:${W}px;--H:${H}px;--bg:${bg}"><div class="stage">${body}</div></body></html>`;
  const file = `${tmpDir}/${name}.html`;
  writeFileSync(file, html);
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(fileUrl(file));
  await page.waitForLoadState('networkidle');
  const png = await page.screenshot();
  await page.close();
  await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toFile(`${outDir}/${name}.jpg`);
  console.log(`rendered ${name}.jpg`);
}

function siteFiles(slug) {
  const dir = `${rawDir}/${slug}`;
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir);
  const pick = (re) =>
    files
      .filter((f) => re.test(f))
      .sort()
      .map((f) => `${dir}/${f}`);
  const meta = existsSync(`${dir}/meta.json`)
    ? JSON.parse(readFileSync(`${dir}/meta.json`, 'utf8'))
    : {};
  return {
    dir,
    meta,
    desktopHero: `${dir}/desktop-hero.png`,
    phoneHero: `${dir}/phone-hero.png`,
    desktopSecs: pick(/^desktop-sec-\d+\.png$/),
    phoneSecs: pick(/^phone-sec-\d+\.png$/),
  };
}

const at = (x, y, inner, extra = '') =>
  `<div class="abs" style="left:${x}px;top:${y}px;${extra}">${inner}</div>`;

async function render() {
  const browser = await chromium.launch();
  for (const site of todo) {
    const f = siteFiles(site.slug);
    if (!f || !existsSync(f.desktopHero) || !existsSync(f.phoneHero)) {
      console.log(`SKIP ${site.slug}: run capture first`);
      continue;
    }
    const cfg = config[site.slug] ?? {};
    const bg = cfg.bg || f.meta.desktop?.themeColor || '#0a1628';
    const secs = (cfg.sections ?? [1, 2])
      .map((n) => `${f.dir}/desktop-sec-${String(n).padStart(2, '0')}.png`)
      .filter(existsSync);
    const phones = (cfg.phone ?? ['hero', 'sec-01', 'sec-02'])
      .map((n) => `${f.dir}/phone-${n}.png`)
      .filter(existsSync);

    // 1. Duo, straight on. Laptop 1120 wide centred in the square, phone in front.
    await renderHtml(
      browser,
      `${site.slug}-duo`,
      1600,
      1200,
      bg,
      at(170, 250, laptop(f.desktopHero, 1200)) + at(1090, 430, await phone(f.phoneHero, 270)),
    );

    // 2. Three-quarter laptop with a phone standing to its left.
    await renderHtml(
      browser,
      `${site.slug}-angle`,
      1600,
      1200,
      bg,
      at(
        370,
        270,
        laptop(secs[0] ?? f.desktopHero, 1080),
        'transform:perspective(2600px) rotateY(-24deg) rotateX(4deg);transform-origin:30% 60%',
      ) + at(150, 410, await phone(phones[1] ?? f.phoneHero, 260)),
    );

    // 3. Three phones, middle one raised.
    const trio = phones.length >= 3 ? phones : [f.phoneHero, ...f.phoneSecs].slice(0, 3);
    let body = '';
    const xs = [135, 455, 775];
    const ys = [330, 260, 330];
    for (let i = 0; i < trio.length; i += 1) body += at(xs[i], ys[i], await phone(trio[i], 290));
    await renderHtml(browser, `${site.slug}-phones`, 1200, 1200, bg, body);

    // 4. Frameless details: one strong section each, big enough to read.
    for (const [i, s] of secs.entries()) {
      await renderHtml(
        browser,
        `${site.slug}-detail-${i + 1}`,
        1200,
        1200,
        bg,
        `<div class="detail" style="left:60px;top:256px;width:1080px;height:675px"><img src="${fileUrl(s)}"></div>`,
      );
    }

    // 5. Extra pages.
    for (const p of cfg.pages ?? []) {
      const d = `${f.dir}/desktop-${p.name}.png`;
      const ph = `${f.dir}/phone-${p.name}.png`;
      if (!existsSync(d) || !existsSync(ph)) continue;
      await renderHtml(
        browser,
        `${site.slug}-${p.name}`,
        1600,
        1200,
        bg,
        at(170, 250, laptop(d, 1200)) + at(1090, 430, await phone(ph, 270)),
      );
    }
  }

  // Cover wall from every captured site, heroes first, then sections to fill.
  const pool = [];
  for (const s of sites) {
    const f = siteFiles(s.slug);
    if (f && existsSync(f.desktopHero)) pool.push(f.desktopHero);
  }
  for (const s of sites) {
    const f = siteFiles(s.slug);
    if (f) pool.push(...f.desktopSecs.slice(0, 2));
  }
  if (pool.length) {
    const tiles = Array.from({ length: 25 }, (_, i) => pool[i % pool.length]);
    await renderHtml(
      browser,
      'cover-wall',
      1920,
      1080,
      '#0a1628',
      `<div class="wall">${tiles.map((t) => `<div class="tile"><img src="${fileUrl(t)}"></div>`).join('')}</div>`,
    );
  }
  await browser.close();
}

/* ------------------------------------------------------------------ video */

const VIDEO = { W: 1080, H: 1920, fps: 30, phoneW: 720, screens: 5.5 };

// Scroll position (0 = hero, 1 = deepest) at time t seconds: hold on the hero,
// ease down, hold, ease back up, hold. 14 seconds in all.
const TIMELINE = [
  [2, 0, 0],
  [6.5, 0, 1],
  [1.5, 1, 1],
  [3, 1, 0],
  [1, 0, 0],
];
const SECONDS = TIMELINE.reduce((n, [d]) => n + d, 0);
const ease = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
function scrollAt(t) {
  for (const [d, from, to] of TIMELINE) {
    if (t < d) return from + (to - from) * ease(t / d);
    t -= d;
  }
  return 0;
}

// One tall phone capture of the homepage, about five and a half screens deep.
// Stitched from viewport shots, because a fullPage shot leaves background
// videos (and the tiles around them) unpainted. Anything fixed or sticky is
// hidden after the first screen so a header or floating button never repeats.
async function tallShot(browser, site, file) {
  const context = await browser.newContext({
    ...shapes.phone,
    reducedMotion: config[site.slug]?.motion ? 'no-preference' : 'reduce',
  });
  context.setDefaultTimeout(30_000);
  const page = await context.newPage();
  const guard = setTimeout(() => context.close().catch(() => {}), 120_000);
  let ok = false;
  try {
    await loadPage(page, site.url, config[site.slug]?.hide);
    const vh = shapes.phone.viewport.height;
    const full = await page.evaluate(() => document.documentElement.scrollHeight);
    const height = Math.min(full, Math.round(vh * VIDEO.screens));
    const dpr = shapes.phone.deviceScaleFactor;
    const layers = [];
    for (let y = 0; y < height; y += vh) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(600);
      // Checked on every screen after the first, because some headers only
      // turn fixed once the page scrolls.
      if (y > 0) {
        await page.evaluate(() => {
          for (const el of document.querySelectorAll('body *')) {
            const p = getComputedStyle(el).position;
            if (p === 'fixed' || p === 'sticky') {
              el.style.setProperty('visibility', 'hidden', 'important');
            }
          }
        });
      }
      const top = await page.evaluate(() => Math.round(window.scrollY));
      const rows = Math.min(vh, height - top) * dpr;
      let shot = await page.screenshot();
      if (rows < vh * dpr) {
        shot = await sharp(shot)
          .extract({ left: 0, top: 0, width: 390 * dpr, height: rows })
          .toBuffer();
      }
      layers.push({ input: shot, left: 0, top: top * dpr });
    }
    await sharp({
      create: { width: 390 * dpr, height: height * dpr, channels: 3, background: '#fff' },
    })
      .composite(layers)
      .png()
      .toFile(file);
    ok = true;
  } catch (err) {
    console.log(`FAILED ${site.slug} video capture: ${String(err).split('\n')[0]}`);
  }
  clearTimeout(guard);
  await context.close().catch(() => {});
  return ok;
}

// Feeds JPEG frames to ffmpeg on stdin and encodes a silent H.264 MP4.
function encoder(out) {
  const ff = spawn(
    'ffmpeg',
    [
      ...['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(VIDEO.fps)],
      ...['-c:v', 'mjpeg', '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21'],
      // JPEG frames are full range; convert to the TV range players expect.
      ...[
        '-vf',
        'scale=in_range=pc:out_range=tv,format=yuv420p',
        '-r',
        String(VIDEO.fps),
        '-movflags',
        '+faststart',
        out,
      ],
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const done = new Promise((resolve, reject) => {
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
  });
  const write = (buf) =>
    ff.stdin.write(buf) ? Promise.resolve() : new Promise((r) => ff.stdin.once('drain', r));
  return { write, end: () => (ff.stdin.end(), done) };
}

async function video() {
  const dir = `${outDir}/video`;
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  for (const site of todo) {
    const tall = `${rawDir}/${site.slug}/phone-tall.png`;
    mkdirSync(`${rawDir}/${site.slug}`, { recursive: true });
    if (!(await tallShot(browser, site, tall))) continue;
    const cfg = config[site.slug] ?? {};
    const meta = siteFiles(site.slug)?.meta ?? {};
    const bg = cfg.bg || meta.desktop?.themeColor || '#0a1628';
    const { W, H, phoneW } = VIDEO;
    // The phone() frame from the stills, centred. Its screen scrolls under a
    // status bar that keeps the hero's top colour.
    const phoneH = phoneW * 2.085;
    const body = at(
      (W - phoneW) / 2,
      (H - phoneH) / 2 - 20,
      (await phone(tall, phoneW)).replace('<img ', '<img id="feed" '),
    );
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}
.pscreen .status { background: inherit; }
#feed { will-change: transform; }</style></head>
<body style="--W:${W}px;--H:${H}px;--bg:${bg}"><div class="stage">${body}</div></body></html>`;
    const file = `${tmpDir}/${site.slug}-video.html`;
    writeFileSync(file, html);
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const out = `${dir}/${site.slug}-scroll.mp4`;
    try {
      await page.goto(fileUrl(file));
      await page.waitForLoadState('networkidle');
      const travel = await page.evaluate(() => {
        const img = document.getElementById('feed');
        return Math.max(0, img.offsetHeight - img.parentElement.clientHeight * 0.944);
      });
      const enc = encoder(out);
      const frames = Math.round(SECONDS * VIDEO.fps);
      for (let i = 0; i < frames; i += 1) {
        const y = -travel * scrollAt(i / VIDEO.fps);
        await page.evaluate((v) => {
          document.getElementById('feed').style.transform = `translate3d(0,${v}px,0)`;
        }, y);
        await enc.write(await page.screenshot({ type: 'jpeg', quality: 92 }));
      }
      await enc.end();
      console.log(`filmed ${site.slug}-scroll.mp4 (${SECONDS}s, ${Math.round(travel)}px travel)`);
    } catch (err) {
      console.log(`FAILED ${site.slug} video: ${String(err).split('\n')[0]}`);
    }
    await page.close();
  }
  await browser.close();
}

if (step === 'capture' || step === 'all') await capture();
if (step === 'render' || step === 'all') await render();
if (step === 'video') await video();
