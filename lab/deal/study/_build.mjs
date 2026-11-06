// Builds /deal/study/<slug>/index.html for every case study from the repo's MDX.
// An unknown component or chapter throws, so nothing in a study can drop out silently.
// node _build.mjs            pages only, images made when missing
// node _build.mjs --images   remake the images too
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = 'C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall';
const req = createRequire(REPO + '/package.json');
const sharp = req('sharp');
const YAML = req('yaml');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LAB = path.resolve(HERE, '../..');
const OUT = path.join(LAB, 'assets/study');
const CASES = path.join(REPO, 'src/content/case-studies');
const SHOTS = 'src/assets/case-studies/shots';
const FORCE = process.argv.includes('--images');
const CAP = 200 * 1024;
// Source captures run into the next section's ghosted heading. Top and bottom, in source pixels, so each shot ends clean.
const CROPS = {
  'stone-steps-50k-feature-board': [185, 685],
  'stone-steps-50k-feature-elevation': [222, 640],
  'stone-steps-50k-feature-weather': [50, 520],
  'stone-steps-50k-after-records': [0, 842],
  'stone-steps-50k-before-records': [0, 842],
  'stone-steps-50k-home': [0, 3720],
};
fs.mkdirSync(OUT, { recursive: true });

/* ---- Words ---------------------------------------------------------------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Nathan's own prose only, never a client's quote. American spelling, dates and his known corrections.
const fix = (s) => String(s)
  .replace(/\bprogramme/g, 'program').replace(/\bback catalogue/g, 'back catalog').replace(/\bcatalogue/g, 'catalog')
  .replace(/\bcolour/g, 'color').replace(/\bColour/g, 'Color')
  .replace(/a theme I wrote for it/, 'a theme I built for it')
  .replace(/\b(\d{1,2}) (October|September|November) (\d{4})/g, '$2 $1, $3');
const inline = (s) => esc(fix(s)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '$1');
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ---- MDX ------------------------------------------------------------------ */
function readValue(src, i) {
  const q = src[i];
  if (q === '"' || q === "'") {
    let j = i + 1, out = '';
    while (src[j] !== q) { if (src[j] === '\\') j++; out += src[j++]; }
    return [out, j + 1, 'str'];
  }
  if (q !== '{') throw new Error('Bad attribute at ' + src.slice(i, i + 40));
  let d = 0, j = i, str = null;
  for (; j < src.length; j++) {
    const c = src[j];
    if (str) { if (c === '\\') j++; else if (c === str) str = null; continue; }
    if (c === '"' || c === "'" || c === '`') str = c;
    else if (c === '{') d++;
    else if (c === '}' && --d === 0) break;
  }
  return [src.slice(i + 1, j).trim(), j + 1, 'expr'];
}
function readComponent(src, i) {
  const name = /^<([A-Z]\w*)/.exec(src.slice(i))[1];
  let j = i + name.length + 1;
  const props = {};
  for (;;) {
    while (/\s/.test(src[j])) j++;
    if (src.startsWith('/>', j)) { j += 2; break; }
    const m = /^(\w+)=/.exec(src.slice(j));
    if (!m) throw new Error('Bad props on ' + name + ': ' + src.slice(j, j + 40));
    const [v, next, kind] = readValue(src, j + m[0].length);
    props[m[1]] = { v, kind };
    j = next;
  }
  return [{ type: name, props }, j];
}
function parseMdx(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n/.exec(raw);
  const data = YAML.parse(m[1]);
  const src = raw.slice(m[0].length);
  const imports = {}, chapters = [];
  let cur = null, i = 0;
  const push = (b) => { if (!cur) throw new Error('Block before the first heading in ' + file); cur.blocks.push(b); };
  while (i < src.length) {
    if (src[i] === '\n') { i++; continue; }
    if (src[i] === '<') {
      const [c, j] = readComponent(src, i);
      push(c); i = j; continue;
    }
    let e = src.indexOf('\n', i); if (e < 0) e = src.length;
    const line = src.slice(i, e).trim();
    i = e + 1;
    let k;
    if ((k = /^import (\w+) from '(.+)';$/.exec(line))) { imports[k[1]] = k[2]; continue; }
    if ((k = /^## (.+)$/.exec(line))) { cur = { title: k[1], blocks: [] }; chapters.push(cur); continue; }
    if (/^#/.test(line)) throw new Error('Heading level not handled: ' + line);
    if ((k = /^\*\*([^*]+)\*\*$/.exec(line))) { push({ type: 'sub', text: k[1] }); continue; }
    if (line.startsWith('- ')) {
      const last = cur.blocks[cur.blocks.length - 1];
      if (last && last.type === 'list') last.items.push(line.slice(2)); else push({ type: 'list', items: [line.slice(2)] });
      continue;
    }
    if (line) push({ type: 'p', text: line });
  }
  return { data, chapters, imports };
}
const propStr = (c, k) => (c.props[k] ? c.props[k].v : undefined);

/* ---- Images --------------------------------------------------------------- */
async function webp(srcRel, name, { width, depth } = {}) {
  const crop = CROPS[path.basename(srcRel, '.png')];
  if (crop) name += '-crop';
  const dest = path.join(OUT, name + '.webp');
  const url = '/assets/study/' + name + '.webp';
  const abs = path.join(REPO, srcRel);
  if (!fs.existsSync(abs)) throw new Error('Missing image ' + srcRel);
  const meta = await sharp(abs).metadata();
  const pipe = (w, q) => {
    let p = sharp(abs);
    if (crop) p = p.extract({ left: 0, top: crop[0], width: meta.width, height: crop[1] - crop[0] });
    else if (depth && meta.height > depth) p = p.extract({ left: 0, top: 0, width: meta.width, height: depth });
    return p.resize({ width: Math.min(w, meta.width) }).webp({ quality: q, effort: 5 });
  };
  if (FORCE || !fs.existsSync(dest)) {
    let done = false;
    for (let w = width; w >= width * 0.7 && !done; w = Math.round(w * 0.86)) {
      for (const q of [76, 68, 60, 52, 44, 38]) {
        const buf = await pipe(w, q).toBuffer();
        if (buf.length <= CAP || (q === 38 && w < width * 0.75)) { fs.writeFileSync(dest, buf); done = true; break; }
      }
    }
  }
  const out = await sharp(dest).metadata();
  return { url, w: out.width, h: out.height };
}
async function clip(src) {
  const base = path.basename(src);
  const from = path.join(REPO, 'public', src);
  for (const ext of ['.mp4', '.webp']) {
    const dest = path.join(OUT, base + ext);
    if (FORCE || !fs.existsSync(dest)) fs.copyFileSync(from + ext, dest);
  }
  const m = await sharp(path.join(OUT, base + '.webp')).metadata();
  return { mp4: '/assets/study/' + base + '.mp4', poster: '/assets/study/' + base + '.webp', w: m.width, h: m.height };
}

/* ---- Windows -------------------------------------------------------------- */
const tile = ({ tag = 'div', cls = '', attrs = '', host, inner, c, p }) =>
  `<${tag} class="tile ${cls}" ${attrs} style="--c:${c};--p:${p}"><span class="b-top" aria-hidden="true"><span class="url"><span data-lock></span><span>${esc(host)}</span></span></span><span class="scr" aria-hidden="true">${inner}</span><span class="b-bot" aria-hidden="true" data-tools></span></${tag}>`;
const longPhone = (s, cls, extra = '') => tile({
  cls: 'phone ' + cls, host: s.host, c: s.accent, p: s.accentInk, attrs: extra,
  inner: `<img class="long" src="${s.mobile.url}" width="${s.mobile.w}" height="${s.mobile.h}" alt="" loading="lazy" decoding="async"><i class="thumb"></i>`,
});
const zoomImg = (img, alt, sizes) =>
  `<button type="button" class="zoom" data-zoom data-full="${img.url}"><img src="${img.url}" width="${img.w}" height="${img.h}" alt="${esc(fix(alt))}" loading="lazy" decoding="async" sizes="${sizes}"></button>`;

/* ---- Blocks --------------------------------------------------------------- */
const DECISION = (c) => `<article class="dec rv"><h3>${inline(propStr(c, 'title'))}</h3><dl><div class="dec-easy"><dt>The easy version</dt><dd>${inline(propStr(c, 'easy'))}</dd></div><div class="dec-did"><dt>What I did</dt><dd>${inline(propStr(c, 'did'))}</dd></div></dl></article>`;

let featNo = 0;
async function FEATURE(c, st) {
  const src = st.imports[propStr(c, 'src')];
  if (!src) throw new Error('Feature image import missing: ' + propStr(c, 'src'));
  const rel = path.join('src/content/case-studies', src);
  const name = path.basename(src, '.png');
  const img = await webp(path.normalize(rel), name, { width: 1200 });
  st.count.features++;
  return `<article class="feat rv ${propStr(c, 'side') === 'right' ? 'flip' : ''}" data-i="${featNo++}"><div class="feat-m">${zoomImg(img, propStr(c, 'alt'), '(min-width:60rem) 40rem,100vw')}</div><div class="feat-t"><h3>${inline(propStr(c, 'title'))}</h3><p>${inline(propStr(c, 'body'))}</p></div></article>`;
}
async function COMPARE(c, st) {
  const a = st.imports[propStr(c, 'before')], b = st.imports[propStr(c, 'after')];
  const before = await webp(path.normalize(path.join('src/content/case-studies', a)), path.basename(a, '.png'), { width: 1200 });
  const after = await webp(path.normalize(path.join('src/content/case-studies', b)), path.basename(b, '.png') + '-after', { width: 1200 });
  st.count.compares++;
  const bl = 'Before' + (propStr(c, 'beforePlatform') ? ', on ' + propStr(c, 'beforePlatform') : '');
  const al = 'After' + (propStr(c, 'afterPlatform') ? ', on ' + propStr(c, 'afterPlatform') : '');
  return `<figure class="ba rv" data-ba><figcaption class="ba-l"><span>${esc(bl)}</span><span>${esc(al)}</span></figcaption><div class="ba-f" style="aspect-ratio:${Math.max(after.w / after.h, 1.6).toFixed(3)};--v:50"><div class="ba-i"><img class="ba-a" src="${after.url}" width="${after.w}" height="${after.h}" alt="${esc(fix(propStr(c, 'afterAlt')))}" loading="lazy" decoding="async"><img class="ba-b" src="${before.url}" width="${before.w}" height="${before.h}" alt="${esc(fix(propStr(c, 'beforeAlt')))}" loading="lazy" decoding="async"></div><input type="range" min="0" max="100" step="1" value="50" aria-label="Slide between the old site and the new one" aria-valuetext="50 percent of the old site showing"><span class="ba-h" aria-hidden="true"><i></i></span></div></figure>`;
}
function RESULTS(c) {
  const items = new Function('return ' + propStr(c, 'items'))();
  const figures = items.filter((x) => typeof x !== 'string' && x.source);
  const lines = items.map((x) => (typeof x === 'string' ? x : x.source ? null : x.figure + ' ' + x.text)).filter(Boolean);
  return (figures.length ? `<dl class="figs rv">${figures.map((f) => `<div class="fig card"><dt>${esc(f.figure)}</dt><dd>${inline(f.text)}</dd><dd class="src">Source: ${inline(f.source)}</dd></div>`).join('')}</dl>` : '') +
    (lines.length ? `<ul class="changes rv">${lines.map((l) => `<li>${inline(l)}</li>`).join('')}</ul>` : '');
}
function COURSE() {
  const code = fs.readFileSync(path.join(REPO, 'src/data/stone-steps-course.ts'), 'utf8')
    .replace(/export type[^\n]*\n/g, '').replace(/export const/g, 'const').replace(/ as const/g, '')
    .replace(/: ReadonlyArray<[^=]*> =/g, ' =');
  const { courseBounds: B, courseElevation: E, courseLoops: L, courseMiles: M, coursePoints: P } = new Function(code + ';return {courseBounds,courseElevation,courseLoops,courseMiles,coursePoints};')();
  const PLAN_W = 3000, PAD = 80, midLat = ((B.north + B.south) / 2) * (Math.PI / 180);
  const scale = (PLAN_W - PAD * 2) / ((B.east - B.west) * Math.cos(midLat));
  const PLAN_H = Math.round((B.north - B.south) * scale + PAD * 2);
  const px = (lon) => Math.round(PAD + (lon - B.west) * Math.cos(midLat) * scale);
  const py = (lat) => Math.round(PAD + (B.north - lat) * scale);
  const W = 6000, H = 2000, TOP = 100, BOT = 100;
  const ex = (mi) => Math.round((mi / M) * W);
  const ey = (ft) => Math.round(TOP + (1 - (ft - E.lowFt) / (E.highFt - E.lowFt)) * (H - TOP - BOT));
  const toPath = (pts) => pts.map(([x, y], i) => (i ? `l${x - pts[i - 1][0]} ${y - pts[i - 1][1]}` : `M${x} ${y}`)).join('');
  const plan = P.map((p) => [px(p[0]), py(p[1])]), prof = P.map((p) => [ex(p[3]), ey(p[2])]);
  const ft = (n) => n.toLocaleString('en-US');
  const starts = L.map((l) => P.findIndex((p) => p[5] === l.loop));
  return `<figure class="course rv" data-course data-total="${M}" data-low="${E.lowFt}" data-high="${E.highFt}" data-prof="${W} ${H} ${TOP} ${BOT}" data-starts="${starts.join(' ')}" data-grades="${P.map((p) => p[4]).join(' ')}"><div class="course-d"><svg class="course-plan" viewBox="0 0 ${PLAN_W} ${PLAN_H}" role="img" aria-label="The Stone Steps course from above: ${L.length} loops through Mt. Airy Forest"><path class="cl" d="${toPath(plan)}" data-plan/><circle class="cd" data-plan-dot cx="${plan[0][0]}" cy="${plan[0][1]}" r="70"/></svg><div class="course-p"><svg class="course-prof" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Elevation along the course: ${ft(E.lowFt)} to ${ft(E.highFt)} feet over ${M} miles, ${L.length} loops" data-profile>${L.slice(1).map((l) => `<line class="cv" x1="${ex(l.startMile)}" x2="${ex(l.startMile)}" y1="0" y2="${H}"/>`).join('')}<path class="cl" d="${toPath(prof)}" data-prof-path/><line class="cc" data-cursor x1="0" x2="0" y1="0" y2="${H}"/></svg><span class="cdot" data-prof-dot style="left:0;top:${(prof[0][1] / H) * 100}%"></span><div class="course-ax"><span>Mile 0</span><span>${ft(E.highFt)} ft high, ${ft(E.lowFt)} ft low</span><span>Mile ${M}</span></div></div></div><div class="course-s" data-scrub hidden><label for="course-range">Walk the course, a tenth of a mile at a time</label><input id="course-range" type="range" min="0" max="${Math.floor(M * 10) / 10}" step="0.1" value="0" data-range><output for="course-range" data-readout></output></div><figcaption>${L.length} loops, ${M} miles as recorded on David's own run of the course, between ${ft(E.lowFt)} and ${ft(E.highFt)} feet. Elevation from USGS 1-meter LiDAR.</figcaption></figure>`;
}
async function WALK(c, st) {
  const shot = await webp(`${SHOTS}/${st.slug}-home.png`, st.slug + '-home', { width: 900, depth: 4000 });
  st.count.walk++;
  return `<figure class="walk rv"><div class="win" style="--c:${st.accent};--p:${st.accentInk}"><div class="win-bar" aria-hidden="true"><span class="url"><span data-lock></span><span>${esc(propStr(c, 'label'))}</span></span></div><div class="walk-s" data-walk tabindex="0" role="group" aria-label="${esc(fix(propStr(c, 'alt')))}"><img class="long" src="${shot.url}" width="${shot.w}" height="${shot.h}" alt="${esc(fix(propStr(c, 'alt')))}" loading="lazy" decoding="async"><i class="thumb"></i></div></div><div class="walk-ph" role="img" aria-label="${esc(fix(propStr(c, 'alt')))}">${longPhone(st, 'wp')}</div><figcaption><a class="tlink" href="${esc(propStr(c, 'href'))}" target="_blank" rel="noopener">Visit ${esc(propStr(c, 'label'))}<span class="sr"> (opens in a new tab)</span></a></figcaption></figure>`;
}

async function renderBlock(b, st) {
  switch (b.type) {
    case 'p': return /:$/.test(b.text) ? `<p class="lead-in rv">${inline(b.text)}</p>` : `<p class="para rv">${inline(b.text)}</p>`;
    case 'sub': return `<h3 class="sub rv">${inline(b.text)}</h3>`;
    case 'list': st.count.lists++; return `<ul class="full rv">${b.items.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`;
    case 'Decision': st.count.decisions++; return DECISION(b);
    case 'FeatureHighlight': return FEATURE(b, st);
    case 'BeforeAfter': return COMPARE(b, st);
    case 'CourseLine': st.count.course++; return COURSE();
    case 'SiteShowcase': return WALK(b, st);
    case 'ResultsBlock': st.count.results++; return RESULTS(b);
    case 'Lightbox': st.count.lightbox++; return ''; // Every shot zooms: see [data-zoom] in study.js.
    default: throw new Error('Component not mapped: ' + b.type + ' in ' + st.slug);
  }
}
const CHAPTERS = new Set(['The brief', 'Decisions', 'What I built', 'Before and after', 'Walk the homepage']);

/* ---- A page --------------------------------------------------------------- */
async function page(st, next) {
  const d = st.data;
  const sectorLine = d.sector === 'small-business' ? 'small business' : d.sector;
  const hostName = d.facts?.host || new URL(d.liveUrl).hostname.replace(/^www\./, '');
  const facts = [['Sector', esc(d.facts?.sector)], ['Role', esc(d.facts?.role || d.role)], ['Built with', esc((d.facts?.stack || d.stack).join(', '))],
    ['Live', `<a href="${esc(d.liveUrl)}" target="_blank" rel="noopener">${esc(hostName)}<span class="sr"> (opens in a new tab)</span></a>`]];
  const longest = Math.max(...d.client.split(' ').map((w) => w.length));

  const byTitle = {};
  for (const c of st.chapters) { if (!CHAPTERS.has(c.title)) throw new Error('Chapter not mapped: ' + c.title + ' in ' + st.slug); byTitle[c.title] = c; }

  const render = async (blocks) => (await Promise.all(blocks.map((b) => renderBlock(b, st)))).join('');
  const walk = byTitle['Walk the homepage'].blocks;
  const results = walk.filter((b) => b.type === 'ResultsBlock'), rest = walk.filter((b) => b.type !== 'ResultsBlock');
  const decisions = byTitle['Decisions'].blocks;

  const list = [];
  // The brief opens on the summary, then the study's own paragraphs, then what changed.
  list.push({ title: 'The brief', html: `<p class="lede2 rv">${inline(d.summary)}</p>` + (await render(byTitle['The brief'].blocks)) + (await render(results)) });

  // The idea: the hook with its clip or still, only where that shot does not appear again in the full build.
  const repeated = Object.values(st.imports).some((p) => d.featureShot && path.basename(p) === path.basename(d.featureShot));
  if (d.signatureClip) {
    const v = await clip(d.signatureClip.src);
    st.count.clip++;
    list.push({ title: d.hook, cls: 'idea', html: `<figure class="clip rv" data-clip><div class="win" style="--c:${st.accent};--p:${st.accentInk}"><div class="win-bar" aria-hidden="true"><span class="url"><span data-lock></span><span>${esc(hostName)}</span></span></div><video muted playsinline preload="none" poster="${v.poster}" width="${v.w}" height="${v.h}" aria-label="${esc(fix(d.signatureClip.alt))}"><source src="${v.mp4}" type="video/mp4"></video></div><figcaption><p>${inline(d.signatureClip.alt)}</p><button type="button" class="tbtn" data-clip-btn hidden>Play it</button></figcaption></figure>` });
  } else if (d.featureShot && !repeated && st.slug !== 'first-presbyterian-orangeburg') {
    const name = path.basename(d.featureShot, '.png');
    const img = await webp(path.normalize(path.join('src/content/case-studies', d.featureShot)), name, { width: 1200 });
    st.count.idea++;
    list.push({ title: d.hook, cls: 'idea', html: `<figure class="still rv">${zoomImg(img, d.featureShotAlt, '(min-width:60rem) 60rem,100vw')}<figcaption>${inline(d.featureShotAlt)}</figcaption></figure>` });
  }

  // The cards and the course stay on the page. The prose and comparisons between them wait in the full build.
  const later = (b) => b.type === 'BeforeAfter' || b.type === 'p';
  list.push({ title: 'Decisions', html: await render(decisions.filter((b) => !later(b))) });
  if (byTitle['Before and after']) list.push({ title: 'Before and after', html: await render(byTitle['Before and after'].blocks) });
  list.push({ title: 'Walk the homepage', html: await render(rest) });

  if (d.cmsShot) {
    const u = new URL(d.cmsName === 'WordPress' ? '/wp-admin/' : '/studio/', d.liveUrl);
    const label = u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/+$/, '');
    st.count.cms++;
    const who = { 'mas-monograms': 'Mary Ann', 'reid-design': 'Staci', 'stone-steps-50k': 'Dave' }[st.slug];
    list.push({ title: who ? `What ${who} edits` : 'What the staff edit', cls: 'edit', html: `<p class="para rv">The site's own editor, as ${who ? who + ' sees' : 'the staff see'} it. ${inline(d.cmsShotAlt)}.</p><figure class="cms rv"><div class="win" style="--c:${st.accent};--p:${st.accentInk}"><div class="win-bar" aria-hidden="true"><span class="url"><span data-lock></span><span>${esc(label)}</span></span></div><button type="button" class="zoom flat" data-zoom data-full="/assets/${st.slug}-cms.webp"><img src="/assets/${st.slug}-cms.webp" width="1440" height="900" alt="${esc(d.cmsName)} home screen for ${esc(d.client)}" loading="lazy" decoding="async"></button></div></figure>` });
  }

  if (d.testimonials?.length) {
    st.count.quotes = d.testimonials.length;
    // Word for word: no fix() here, ever.
    list.push({ title: 'In their words', html: d.testimonials.map((t) => `<figure class="q rv"><blockquote>${esc(t.quote)}</blockquote><figcaption><b>${esc(t.name)}</b>${esc(t.title)}${t.context ? `<span class="q-ctx">${esc(fix(t.context))}</span>` : ''}</figcaption></figure>`).join('') });
  }

  const chapters = list.map((c, i) => `<section class="chap ${c.cls || ''}" id="${slugify(c.title)}" aria-labelledby="c${i}"><h2 id="c${i}">${inline(c.title)}</h2>${c.html}</section>`).join('\n');

  // The long feature list stays closed until someone asks for it.
  const notes = decisions.filter((b) => b.type === 'p'), extra = decisions.filter((b) => b.type === 'BeforeAfter');
  const build = `<section class="chap build" id="what-i-built" aria-labelledby="cb"><details class="more" data-more><summary><h2 id="cb">What I built</h2><span class="more-l">The full build, with screenshots${extra.length ? ' and more before and afters' : ''}</span><i aria-hidden="true"></i></summary><div class="more-box"><div class="more-in">${await render(byTitle['What I built'].blocks)}${notes.length ? `<h3 class="sub">Behind the decisions</h3>${await render(notes)}` : ''}${extra.length ? `<h3 class="sub">More before and afters</h3>${await render(extra)}` : ''}</div></div></details></section>`;

  const nextTile = tile({
    tag: 'a', cls: 'next-tile', c: next.accent, p: next.accentInk, host: next.host,
    attrs: `href="/deal/study/${next.slug}/" data-slug="${next.slug}" data-direct aria-label="${esc(next.name)}, ${esc(next.host)}: ${esc(next.hook)}"`,
    inner: `<img src="/assets/${next.slug}-m.webp" alt="" loading="lazy"><video muted loop playsinline preload="none" data-src="/assets/${next.slug}-m.mp4"></video>`,
  });

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(d.client)} | Nixon Creative Studio</title><meta name="description" content="${esc(fix(d.metaDescription || d.summary))}"><link rel="icon" href="data:,">
<link rel="preload" href="/assets/fonts/bricolage.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/assets/fonts/instrument.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/deal/kit.css"><link rel="stylesheet" href="/deal/study/study.css"><script>document.documentElement.classList.add('js')</script></head>
<body data-ink="1" style="--c:${st.accent};--p:${st.accentInk};--oncolor:${st.accentInk};--long:${longest}"><main id="main">
<section class="s-hero" aria-labelledby="sh">
<div class="s-hero-t"><h1 id="sh">${esc(d.client)}</h1><p class="s-out">${inline(d.outcome)}</p><dl class="s-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></div>
<div class="s-fan" role="img" aria-label="The ${esc(d.client)} homepage on a laptop and a phone">
<figure class="pane p-home" style="--d:0" data-pane><div><img src="/assets/${st.slug}-cover.webp" alt="" fetchpriority="high"><video muted loop playsinline preload="none" data-src="/assets/${st.slug}.mp4"></video></div></figure>
<figure class="pane p-phone" style="--d:1">${tile({ cls: 'inv', c: st.accentInk, p: st.accent, host: hostName, inner: `<img src="/assets/${st.slug}-m.webp" alt=""><video muted loop playsinline preload="none" data-src="/assets/${st.slug}-m.mp4"></video>` })}</figure>
</div>
</section>
<div class="story" data-story>
<div class="chaps">
${chapters}
${build}
</div>
<aside class="rail" aria-hidden="true"><div class="rail-in">${longPhone(st, 'rp')}<p class="rail-cap">The real homepage, on a phone</p></div></aside>
</div>
<section class="next" aria-labelledby="nh"><div class="next-t"><p class="next-l">Up next</p><h2 id="nh"><a href="/deal/study/${next.slug}/">${esc(next.name)}</a></h2><p class="next-k">${esc(fix(next.hook))}</p><p><a class="tlink" href="/deal/work/">See all the work</a></p></div><div class="next-w">${nextTile}</div></section>
<section data-end="Building for a <b>${sectorLine}?</b>" aria-label="Start a project"></section>
</main>
<script src="/shared.js"></script><script src="/deal/kit.js"></script><script src="/deal/study/study.js"></script></body></html>
`;
  const dir = path.join(HERE, st.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  // Leftover-check: the prose rules, outside the verbatim quotes.
  const noQuotes = html.replace(/<blockquote>[\s\S]*?<\/blockquote>/g, '');
  const bad = /—|→|\b(delve|leverage|robust|seamless|elevate|tapestry)\b|kilobyte|\bKB\b/i.exec(noQuotes);
  if (bad) throw new Error('Style rule hit in ' + st.slug + ': ' + bad[0]);
  if (d.year && st.slug === 'first-presbyterian-orangeburg' && /\b2023\b/.test(noQuotes)) throw new Error('Orangeburg year on the page');
  return { slug: st.slug, chapters: list.map((c) => c.title).concat('(closed) What I built'), count: st.count, html: Math.round(html.length / 1024) };
}

/* ---- Run ------------------------------------------------------------------ */
const studies = [];
for (const f of fs.readdirSync(CASES).filter((x) => x.endsWith('.mdx'))) {
  const slug = f.replace('.mdx', '');
  const { data, chapters, imports } = parseMdx(path.join(CASES, f));
  const p = data.palette;
  studies.push({ slug, data, chapters, imports, accent: p.accent, accentInk: p.paper, count: { decisions: 0, features: 0, compares: 0, lists: 0, results: 0, course: 0, walk: 0, cms: 0, quotes: 0, clip: 0, idea: 0, lightbox: 0 } });
}
studies.sort((a, b) => a.data.order - b.data.order);
for (const s of studies) {
  s.host = s.data.facts?.host || new URL(s.data.liveUrl).hostname.replace(/^www\./, '');
  s.mobile = await webp(`${SHOTS}/${s.slug}-mobile.png`, s.slug + '-mobile', { width: 560 });
}
const report = [];
for (let i = 0; i < studies.length; i++) {
  const s = studies[i], n = studies[(i + 1) % studies.length];
  featNo = 0;
  report.push(await page(s, { slug: n.slug, name: n.data.client, hook: n.data.hook, accent: n.accent, accentInk: n.accentInk, host: n.host }));
}
for (const r of report) console.log(r.slug.padEnd(36), `${r.html}k`, JSON.stringify(Object.fromEntries(Object.entries(r.count).filter(([, v]) => v))), '\n   ', r.chapters.join(' | '));
for (const f of fs.readdirSync(OUT)) { const z = fs.statSync(path.join(OUT, f)).size; if (f.endsWith('.webp') && z > CAP * 1.15) console.log('OVER', f, Math.round(z / 1024)); }
