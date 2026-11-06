/* Kinetic poster: shape morph engine, fitted type, beat director, video governor. */
(() => {
  const N = window.NCS;
  const root = document.documentElement;
  const main = document.getElementById('main');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const INK = { K: '#0a0814', W: '#ffffff', Y: '#ffe600', M: '#ff2a93', C: '#00cfff', B: '#1a1fff', O: '#ff4314', G: '#00e266', L: '#c8ff00' };
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  /* ---------- shapes: all polygons in a 1.6 x 1 box, resampled to the same vertex count so any shape can morph to any other ---------- */
  const VERTS = 180;
  const arc = (cx, cy, rx, ry, a0, a1, n) => { const o = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return o; };
  const RAW = {
    slab: () => [[0, 0], [1.6, 0], [1.6, 1], [0, 1]],
    circle: () => arc(.8, .5, .5, .5, -90, 269, 90),
    arch: () => [[.34, 1], [.34, .46], ...arc(.8, .46, .46, .46, 180, 360, 44), [1.26, 1]],
    stairs: () => [[0, 1], [0, .78], [.3, .78], [.3, .58], [.6, .58], [.6, .38], [.9, .38], [.9, .18], [1.25, .18], [1.25, 0], [1.6, 0], [1.6, 1]],
    diamond: () => [[.8, 0], [1.42, .5], [.8, 1], [.18, .5]],
    octagon: () => [[.6, 0], [1.0, 0], [1.3, .29], [1.3, .71], [1.0, 1], [.6, 1], [.3, .71], [.3, .29]],
    tri: () => [[.8, 0], [1.4, 1], [.2, 1]],
    semi: () => [[0, 1], ...arc(.8, 1, .8, 1, 180, 360, 50)],
    pill: () => [...arc(.5, .5, .5, .5, 90, 270, 26), ...arc(1.1, .5, .5, .5, -90, 90, 26)],
    seal: () => { const o = []; for (let i = 0; i < 120; i++) { const a = i * 3 * Math.PI / 180; const r = .47 + .03 * Math.cos(a * 14); o.push([.8 + r * Math.sin(a), .5 - r * Math.cos(a)]); } return o; },
    arches: () => { const w = .5, g = .05, top = .3, floor = .955; const r = w / 2; const o = [[0, 1], [0, top]]; for (let k = 0; k < 3; k++) { const x = k * (w + g); o.push(...arc(x + r, top, r, top, 180, 360, 16)); if (k < 2) { o.push([x + w, floor], [x + w + g, floor], [x + w + g, top]); } } o.push([1.6, 1]); return o; },
    bars: () => { const tops = [.0, .2, .08, .28, 0, .14, .32, .06, .18]; const n = tops.length, gap = .03, w = (1.6 - gap * (n - 1)) / n; const floor = .955; const o = [[0, 1]]; tops.forEach((t, i) => { const x = i * (w + gap); o.push([x, t], [x + w, t]); if (i < n - 1) o.push([x + w, floor], [x + w + gap, floor]); }); o.push([1.6, 1]); return o; },
    stack: () => { const rows = [1.6, 1.28, 1.48, 1.04]; const h = .22, gap = .04; const o = [[0, 0]]; rows.forEach((r, i) => { const y = i * (h + gap); o.push([r, y], [r, y + h]); if (i < rows.length - 1) o.push([.06, y + h], [.06, y + h + gap]); }); o.push([0, 1]); return o; },
  };
  const resample = (pts) => {
    const p = pts.map((q) => q.slice());
    while (p.length < VERTS) {
      let best = 0, bd = -1;
      for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; const d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2; if (d > bd) { bd = d; best = i; } }
      const a = p[best], b = p[(best + 1) % p.length];
      p.splice(best + 1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    }
    let s = 0, sd = 1e9;
    p.forEach((q, i) => { const d = (q[0] - .8) ** 2 + (q[1] + 1) ** 2; if (d < sd) { sd = d; s = i; } });
    return p.slice(s).concat(p.slice(0, s));
  };
  const POLY = {};
  for (const k in RAW) POLY[k] = 'polygon(' + resample(RAW[k]()).slice(0, VERTS).map(([x, y]) => (x / 1.6 * 100).toFixed(2) + '% ' + (y * 100).toFixed(2) + '%').join(',') + ')';

  /* ---------- the eight sheets: inks, shape sequence, line breaks ---------- */
  const SHEETS = {
    'stone-steps-50k': { bg: 'Y', ink: 'K', ghost: 'M', sb: 'K', sf: 'Y', a: 'M', b: 'C', oa: ['stairs', 'circle', 'stairs'], seq: ['circle', 'slab', 'stairs'], L: ['Stone Steps', '50K'], P: ['Stone', 'Steps', '50K'] },
    'mas-monograms': { bg: 'B', ink: 'W', ghost: 'K', sb: 'Y', sf: 'K', a: 'M', acol: '#f01c80', ablend: 'diff', b: 'Y', oa: ['seal', 'diamond', 'circle'], seq: ['diamond', 'seal', 'circle'], L: ['MAS', 'Monograms'], P: ['MAS', 'Monograms'] },
    'presbyterian-academy': { bg: 'G', ink: 'K', ghost: 'Y', sb: 'K', sf: 'G', a: 'Y', b: 'M', oa: ['stack', 'slab', 'stack'], seq: ['pill', 'slab', 'stack'], L: ['The Presbyterian', 'Academy'], P: ['The', 'Presbyterian', 'Academy'] },
    'theology-matters': { bg: 'O', ink: 'K', ghost: 'Y', sb: 'Y', sf: 'K', a: 'Y', b: 'C', oa: ['arch', 'octagon', 'arch'], seq: ['semi', 'slab', 'arch'], L: ['Theology', 'Matters'], P: ['Theology', 'Matters'] },
    'first-baptist-muncie': { bg: 'C', ink: 'K', ghost: 'W', sb: 'M', sf: 'K', a: 'Y', b: 'M', oa: ['arches', 'circle', 'semi'], seq: ['arch', 'slab', 'arches'], L: ['First Baptist', 'Church Muncie'], P: ['First', 'Baptist', 'Church', 'Muncie'] },
    'reid-design': { bg: 'K', ink: 'L', ghost: 'B', safe: 1, sb: 'L', sf: 'K', a: 'M', ablend: 'diff', b: 'L', oa: ['stairs', 'tri', 'slab'], seq: ['tri', 'slab', 'octagon'], L: ['Reid', 'Design'], P: ['Reid', 'Design'] },
    'foundation-for-reformed-theology': { bg: 'M', ink: 'K', ghost: 'Y', sb: 'K', sf: 'M', a: 'Y', b: 'C', oa: ['bars', 'circle', 'bars'], seq: ['arch', 'slab', 'bars'], L: ['Foundation for', 'Reformed Theology'], P: ['Foundation', 'for Reformed', 'Theology'] },
    'first-presbyterian-orangeburg': { bg: 'L', ink: 'K', ghost: 'C', sb: 'B', sf: 'W', a: 'C', b: 'M', oa: ['circle', 'semi', 'pill'], seq: ['octagon', 'slab', 'pill'], L: ['First Presbyterian', 'Church of Orangeburg'], P: ['First', 'Presbyterian', 'Church of', 'Orangeburg'] },
  };
  const vars = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');

  const videoEl = (s, cls) => `<video class="${cls || ''}" muted loop playsinline preload="none" poster="${s.poster}" data-src="${s.video}" aria-hidden="true" tabindex="-1"></video>`;

  /* ---------- build ---------- */
  const stages = [];
  const buildHero = () => {
    const s0 = N.sites[0], s1 = N.sites[1];
    const sec = el('section', 'stage hero'); sec.id = 'top'; sec.style.cssText = '--bg:#fff;--ink:' + INK.K + ';--len:190vh';
    sec.innerHTML = `<div class="pin" data-b="h">
      <div class="ov a oh1"><div><div class="clip" style="--c:${INK.Y}"></div></div></div>
      <div class="ov a oh2"><div class="clip" style="--c:${INK.M}"></div></div>
      <div class="ov a oh3"><div class="clip" style="--c:${INK.C}"></div></div>
      <h1 class="sr">${esc(N.line.lead)} ${esc(N.line.heavy)}</h1>
      <div class="hrows jolt-in" aria-hidden="true"></div>
      <div class="shape hv1"><div class="clip pop">${videoEl(s1)}</div></div>
      <div class="shape hv2"><div class="clip">${videoEl(s0)}</div></div>
      <div class="ov a oh4"><div class="spin" style="--t:6.4s"><div class="clip" style="--c:${INK.M}"></div></div></div>
      <div class="slab heroslab hgo"><div class="hgo-in"><p class="sub">${esc(N.sub)}</p></div><div class="acts"><a href="#work">See the work</a><a href="#start">Start a project</a></div></div>
    </div>`;
    main.append(sec);
    stages.push({ sec, pin: sec.querySelector('.pin'), hero: true });
  };
  const buildSite = (s, i) => {
    const sh = SHEETS[s.slug];
    const sec = el('section', 'stage site');
    sec.id = 'site-' + s.slug; sec.setAttribute('aria-labelledby', 'h-' + s.slug);
        const label = String(i + 1).padStart(2, '0') + ' / 0' + N.sites.length;
    const strip = (s.sector + ' / ' + s.host + ' / ').repeat(6);
    sec.style.cssText = vars({ bg: INK[sh.bg], ink: INK[sh.ink], ghost: INK[sh.ghost], sb: INK[sh.sb], sf: INK[sh.sf], runbg: INK.K === INK[sh.bg] ? INK.L : INK.K, runfg: INK.K === INK[sh.bg] ? INK.K : INK[sh.bg === 'B' ? 'Y' : sh.bg], runr: (i % 2 ? '2deg' : '-2deg'), crawl: 18 + i * 3 + 's', len: '190vh' });
    sec.insertAdjacentHTML('beforeend', `<div class="pin" data-b="0">
      <div class="ov a ${sh.ablend || ''}"><div class="${sh.safe ? '' : 'spin'}" style="--t:${8 + i}s"><div class="clip" style="--c:${sh.acol || INK[sh.a]}"></div></div></div>
      <h2 class="sr" id="h-${s.slug}">${esc(s.name)}</h2>
      <div class="name" aria-hidden="true"></div>
      <div class="shape"><div class="clip pop">${videoEl(s)}</div></div>
      <div class="ov b ${sh.b === 'L' ? 'diff' : ''}"><div class="clip" style="--c:${INK[sh.b]}"></div></div>
      <div class="run"><div class="runo"><div class="runi" aria-hidden="true"><span>${esc(strip)}</span><span>${esc(strip)}</span></div></div></div>
      <div class="slab"><div class="tag"><span>${esc(s.sector)}</span><span>${label}</span></div>
        <p class="hook">${esc(s.hook)}</p>
        <a href="${s.study}">See the study<span class="sr"> of ${esc(s.name)}</span><span aria-hidden="true"> &#8599;</span></a></div>
    </div>`);
    main.append(sec);
    stages.push({ sec, pin: sec.querySelector('.pin'), site: s, sh, i });
  };
  const buildOverture = () => {
    const sec = el('section', 'stage overture'); sec.id = 'work'; sec.setAttribute('aria-labelledby', 'h-work');
    sec.style.cssText = vars({ bg: INK.C, ink: INK.K, ghost: INK.W, len: '190vh' });
    const items = N.sites.map((s, i) => `<a class="shape chip" href="#site-${s.slug}" aria-label="${esc(s.name)}" data-i="${i}"><div class="clip">${videoEl(s)}</div></a>`).join('');
    sec.innerHTML = `<div class="pin" data-b="0">
      <div class="ov a"><div class="spin" style="--t:7.2s"><div class="clip" style="--c:${INK.Y}"></div></div></div>
      <h2 class="sr" id="h-work">The work</h2>
      <div class="name" aria-hidden="true"></div>
      ${items}
      <div class="ov b"><div class="clip" style="--c:${INK.M}"></div></div>
    </div>`;
    main.append(sec);
    stages.push({ sec, pin: sec.querySelector('.pin'), over: true });
  };
  const buildFlow = () => {
    const prices = el('section', 'flow spr'); prices.id = 'prices'; prices.setAttribute('aria-labelledby', 'ph');
    const heights = ['clamp(190px,36vh,460px)', 'clamp(200px,47vh,560px)', 'clamp(210px,58vh,660px)'];
    const inks = ['Y', 'M', 'C'];
    prices.innerHTML = `<div class="hd"><h2 id="ph"><span class="fit" data-fit="What it" data-pr="1"></span><span class="fit" data-fit="costs" data-pr="2"></span></h2></div>
      <ul class="tiers">${N.tiers.map((t, i) => `<li class="tier" style="--c:${INK[inks[i]]};--h:${heights[i]}"><span class="nm">${esc(t.name)}</span><span class="who">${esc(t.who)}</span><span class="fr">From</span><span class="pr">${esc(t.from)}</span></li>`).join('')}</ul>`;
    prices.querySelector('.hd').insertAdjacentHTML('beforeend', `<a class="pricelink" href="${N.links.services}">See the services<span aria-hidden="true">&nbsp;&#8599;</span></a>`);
    main.append(prices);

    const q = el('section', 'flow spr'); q.id = 'quote';
    const hi = [['slow, clunky station wagon', 'm1'], ['fast, beautiful sports car', 'm2']];
    let html = esc(N.quote.text);
    hi.forEach(([p, c]) => { html = html.replace(p, '\u0001' + c + '\u0002' + p + '\u0003'); });
    let n = 0, inMark = false;
    const words = html.split(/(\s+|\u0001m\d\u0002|\u0003)/).map((w) => {
      if (!w) return '';
      if (/^\u0001/.test(w)) { inMark = w.slice(1, 3); return ''; }
      if (w === '\u0003') { inMark = false; return ''; }
      if (/^\s+$/.test(w)) return ' ';
      const inner = inMark ? `<mark class="${inMark}">${w}</mark>` : w;
      return `<span class="w" style="--n:${n++}">${inner}</span>`;
    }).join('');
    const tm = N.sites.find((x) => x.slug === 'theology-matters');
    q.innerHTML = `<figure><blockquote>${words}</blockquote><figcaption>${esc(N.quote.by)}<span>${esc(N.quote.role)}</span></figcaption></figure>
      <div class="qvid"><div class="clip" style="width:100%;height:100%">${videoEl(tm)}</div><div class="qov"></div></div>`;
    main.append(q);

    const a = el('section', 'flow'); a.id = 'about'; a.setAttribute('aria-label', 'About');
    const aRows = ['One person in Cincinnati', 'does the design,', 'the build and,', 'when needed,', 'the photos.'];
    a.innerHTML = `<div class="a-ov one"></div><div class="a-ov two"></div>
      <p class="sr">One person in Cincinnati does the design, the build and, when needed, the photos.</p>
      ${aRows.map((t) => `<div class="row fit" aria-hidden="true" data-fit="${esc(t)}"></div>`).join('')}
      <a class="more" href="${N.links.about}">More about me<span aria-hidden="true">&nbsp;&#8599;</span></a>`;
    main.append(a);

    const c = el('section', 'flow'); c.id = 'start'; c.setAttribute('aria-labelledby', 'sh');
    c.innerHTML = `<div class="dcircle"></div>
      <h2 id="sh" class="sr">Start a project</h2>
      <div><div class="fit row-y" aria-hidden="true" data-fit="Start"></div><div class="fit row-y" aria-hidden="true" data-fit="a project" style="margin-top:.8vh"></div></div>
      <div>
        <a class="big" href="mailto:${N.contact.email}"><span class="fit" data-fit="${N.contact.email}" data-lower="1"></span><span class="sr">Email ${N.contact.email}</span></a>
        <a class="big" href="tel:+12563186627"><span class="fit" data-fit="${N.contact.phone}" data-short="1"></span><span class="sr">Call ${N.contact.phone}</span></a>
      </div>
      <div class="info"><p>${esc(N.contact.reply)}</p><p>${esc(N.contact.free)}</p></div>
      <p class="foot"><span>Nixon Creative Studio</span><span>${esc(N.contact.place)}</span><a href="${N.links.contact}" style="display:inline-flex;align-items:center;min-height:44px;color:inherit">Contact page</a></p>`;
    main.append(c);
  };

  buildHero();
  buildOverture();
  N.sites.forEach(buildSite);
  buildFlow();

  /* ---------- measure ---------- */
  let W = 0, H = 0, portrait = false, short = false, still = false, headH = 44;
  const measurer = (lnEl, t, wdth, wght) => { t.style.fontSize = '200px'; t.style.fontVariationSettings = `"wdth" ${wdth},"wght" ${wght}`; return t.offsetWidth / 200; };

  /* fill a line to width: pick the width axis so the height lands near targetFs, then finish with font-size. */
  const fitLine = (ln, width, targetFs, wght = 900) => {
    const t = ln.querySelector('.t');
    let lo = 50, hi = 150, best = 100;
    for (let k = 0; k < 7; k++) {
      const mid = (lo + hi) / 2; const per = measurer(ln, t, mid, wght);
      best = mid;
      if (per * targetFs > width) hi = mid; else lo = mid;
    }
    const per = measurer(ln, t, best, wght);
    t.style.fontSize = (width / per) + 'px';
    return width / per;
  };
  const mkLine = (text, idx) => {
    const ln = el('span', 'ln');
    const t = el('span', 't'); t.textContent = text; t.dataset.t = text; t.style.setProperty('--i', idx);
    ln.append(t); return ln;
  };

  /* apply a pose to a shape or ink: x,y centre as fractions of the screen, w box width as fraction of screen width */
  const pose = (node, p) => {
    if (!node) return;
    const BW = Math.max(W, H * 1.6), BH = BW / 1.6;
    node.style.width = BW + 'px'; node.style.height = BH + 'px';
    const k = (p.w * W) / BW;
    const tx = p.x * W - (BW * k) / 2, ty = p.y * H - (BH * k) / 2;
    node.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) rotate(${p.r || 0}deg) scale(${k.toFixed(4)})`;
    const c = node.querySelector('.clip');
    if (c && p.s) c.style.clipPath = POLY[p.s];
  };

  /* ---------- per-sheet choreography, in three beats ---------- */
  const SHAPE_K = { circle: 1.2, seal: 1.2, diamond: 1.18, octagon: 1.18, arch: 1.15, arches: 1, stairs: 1, slab: 1, tri: 1.15, semi: 1, pill: 1, stack: 1, bars: 1 };
  const posesFor = (st) => {
    const { sh, i } = st;
    const left = i % 2 === 1; /* video on the left for odd sheets */
    const mir = (x) => (left ? 1 - x : x);
    const [s0, s1, s2] = sh.seq;
    const [a0, a1, a2] = sh.oa;
    if (portrait) {
      const bandB = H * .3;
      const vy = bandB + 6 + (1.08 * SHAPE_K[s2] * W / 1.6) / 2;
      return {
        v: [{ x: mir(.74), y: .8, w: .62, r: left ? 14 : -14, s: s0 }, { x: .5, y: .52, w: 1.9, r: 0, s: s1 }, { x: .5 + (left ? -.04 : .04), y: vy / H, w: 1.08 * SHAPE_K[s2], r: 0, s: s2 }],
        a: sh.safe ? [{ x: 1.8, y: .7, w: 1, r: 0, s: a0 }, { x: 1.8, y: .7, w: 1, r: 0, s: a1 }, { x: mir(.25), y: (vy + W * .12) / H, w: 1.1, r: 0, s: a2 }]
        : [{ x: mir(.7), y: .36, w: 1.7, r: 0, s: a0 }, { x: mir(.15), y: .72, w: 1.5, r: 30, s: a1 }, { x: mir(.25), y: vy / H, w: 1.1, r: 0, s: a2 }],
        b: [{ x: mir(1.5), y: .9, w: .9, r: 30, s: 'circle' }, { x: mir(.7), y: .5, w: .9, r: -12, s: 'circle' }, { x: mir(.84), y: (vy + W * .1) / H, w: .6, r: 0, s: 'circle' }],
      };
    }
    const vw = short ? .5 : .62;
    const band = short ? .37 : .435;
    const below = (w) => band + ((w * W) / 1.6) / 2 / H;
    const fw = vw * SHAPE_K[s2];
    const obShape = ['circle', 'semi', 'tri', 'circle', 'semi', 'diamond', 'circle', 'semi'][i];
    const obW = short ? .24 : .34;
    const ob = [{ x: mir(.95), y: below(obW) }, { x: mir(.62), y: .86 }, { x: mir(.9), y: .82 }][i % 3];
    return {
      v: [{ x: mir(.84), y: .74, w: .3, r: left ? 12 : -12, s: s0 }, { x: mir(.56), y: .54, w: .82, r: left ? 3.5 : -3.5, s: s1 }, { x: mir(.71), y: below(fw), w: fw, r: 0, s: s2 }],
      a: sh.safe ? [{ x: mir(1.6), y: .7, w: .6, r: 0, s: a0 }, { x: mir(1.6), y: .7, w: .6, r: 0, s: a1 }, { x: mir(.3), y: below(.56), w: .56, r: 0, s: a2 }]
        : [{ x: mir(.68), y: .42, w: 1.1, r: 0, s: a0 }, { x: mir(.1), y: .64, w: .9, r: 25, s: a1 }, { x: mir(.32), y: .7, w: .6, r: 0, s: a2 }],
      b: [{ x: mir(1.25), y: .75, w: .4, r: 40, s: 'circle' }, { x: mir(.74), y: .54, w: .4, r: 0, s: 'circle' }, { x: ob.x, y: ob.y, w: obW, r: 0, s: obShape }],
    };
  };

  const layoutSite = (st) => {
    const { pin, sh, site } = st;
    const name = pin.querySelector('.name');
    const lines = portrait ? sh.P : sh.L;
    name.innerHTML = '';
    lines.forEach((t, idx) => name.append(mkLine(t, idx)));
    const padPx = parseFloat(getComputedStyle(root).getPropertyValue('--pad')) || Math.max(8, W * .011);
    const pad = Math.min(18, Math.max(8, W * .011));
    const width = W - pad * 2;
    const top = headH + (short ? 4 : 8);
    name.style.setProperty('--nametop', top + 'px');
    const bandH = portrait ? H * .3 - top : short ? H * .36 - top : H * .42 - top;
    const gapPx = Math.max(4, H * .008);
    const target = ((bandH - gapPx * (lines.length - 1)) / lines.length) / .675;
    name.querySelectorAll('.ln').forEach((ln) => { fitLine(ln, width, target); ln.style.setProperty('--gap', gapPx + 'px'); });
    const h0 = name.offsetHeight || bandH;
    st.k2 = bandH / h0;
    st.k0 = (H - top - pad) / h0;
    st.h0 = h0;

    const P = posesFor(st);
    st.P = P;

    const slab = pin.querySelector('.slab'), run = pin.querySelector('.run');
    const left = st.i % 2 === 1;
    const hl = site.hook.length;
    if (portrait) {
      slab.style.cssText = `left:${pad}px;right:${pad}px;bottom:${pad}px;--hook:${Math.min(W * .094, H * .05, 44)}px`;
      run.style.setProperty('--runh', '28px'); run.style.setProperty('--runb', '-40px'); run.hidden = true;
    } else if (short) {
      slab.style.cssText = `${left ? 'right' : 'left'}:${pad}px;bottom:${pad}px;width:${W * .46}px;--hook:${Math.min(H * .068, 26)}px`;
      run.hidden = true;
    } else {
      const f = Math.min(W * .037, H * .062) * (hl > 52 ? .86 : 1);
      slab.style.cssText = `${left ? 'right' : 'left'}:${pad * 2}px;bottom:${H * .09}px;width:${W * .43}px;--hook:${f}px`;
      run.hidden = false; run.style.setProperty('--runh', Math.max(36, H * .052) + 'px'); run.style.setProperty('--runb', H * .012 + 'px');
    }
  };

  const applyBeat = (st, b) => {
    const { pin, P } = st;
    if (!P) return;
    pin.dataset.b = b;
    const name = pin.querySelector('.name');
    const k = b === 2 ? st.k2 : st.k0;
    name.style.transform = `scaleY(${k.toFixed(3)})`;
    name.style.transition = 'transform .75s var(--spring)';
    if (P.chips) pin.querySelectorAll('.chip').forEach((n, i) => { n.style.transitionDelay = (i * 38) + 'ms'; n.firstElementChild.style.transitionDelay = (i * 38) + 'ms'; pose(n, P.chips[i][b]); });
    else pose(pin.querySelector('.shape'), P.v[b]);
    pose(pin.querySelector('.ov.a'), P.a[b]);
    pose(pin.querySelector('.ov.b'), P.b[b]);
  };

  /* overture: the pile, the fan, the wall */
  const CHIP = ['stairs', 'circle', 'stack', 'arch', 'arches', 'octagon', 'bars', 'pill'];
  const layoutOver = (st) => {
    const { pin } = st;
    const name = pin.querySelector('.name');
    const lines = ['The', 'Work'];
    name.innerHTML = ''; lines.forEach((t, idx) => name.append(mkLine(t, idx)));
    const pad = Math.min(18, Math.max(8, W * .011));
    const top = headH + (short ? 4 : 8);
    const bandH = portrait ? H * .2 : short ? H * .3 : H * .36;
    name.style.setProperty('--nametop', top + 'px');
    name.querySelectorAll('.ln').forEach((ln) => { fitLine(ln, W - pad * 2, (bandH / 2) / .675); ln.style.setProperty('--gap', '6px'); });
    const h0 = name.offsetHeight || bandH;
    st.k2 = (portrait ? H * .2 : short ? H * .3 - top : H * .36 - top) / h0;
    st.k0 = (H - top - pad) / h0;
    const cols = portrait ? 2 : 4, rows = portrait ? 4 : 2;
    const yStart = top + st.k2 * h0 + 6;
    const cellW = Math.min(W / cols, ((H - yStart) / rows) * 1.6);
    const off = (W - cellW * cols) / 2;
    const P = { chips: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const cx = (off + cellW * (i % cols + .5)) / W;
      const cy = (yStart + (cellW / 1.6) * (Math.floor(i / cols) + .5)) / H;
      const k = SHAPE_K[CHIP[i]] > 1 ? 1.14 : 1;
      return [
        { x: .5 + (i - 3.5) * (portrait ? .022 : .012), y: .55 + (i - 3.5) * .022, w: portrait ? .92 : .46, r: (i - 3.5) * 5.5, s: 'slab' },
        { x: (i + .5) / 8 + 0, y: .56 + (i % 2 ? .13 : -.13), w: portrait ? .5 : .3, r: (i % 2 ? 9 : -9), s: i % 2 ? 'circle' : 'arch' },
        { x: cx, y: cy, w: (cellW * k * .985) / W, r: 0, s: CHIP[i] },
      ];
    }) };
    P.a = [{ x: .78, y: .4, w: 1.1, r: 0, s: 'circle' }, { x: .2, y: .6, w: 1, r: 20, s: 'arch' }, { x: .5, y: .68, w: 1.04, r: 0, s: 'stairs' }];
    P.b = [{ x: 1.3, y: .9, w: .4, r: 0, s: 'circle' }, { x: 1.3, y: .4, w: .4, r: 0, s: 'circle' }, { x: 1.3, y: .9, w: .4, r: 0, s: 'semi' }];
    st.P = P;
  };

  /* hero: rows that fill the sheet, the last one heavy */
  const layoutHero = () => {
    const st = stages[0]; const pin = st.pin;
    const rows = pin.querySelector('.hrows'); rows.innerHTML = '';
    const pad = Math.min(18, Math.max(8, W * .011));
    const width = W - pad * 2;
    const top = headH + (short ? 3 : 8);
    const spec = portrait
      ? [['I build', .12], ['websites that', .12], ['pull ●', .19], ['their', .17], ['weight.', .4]]
      : short
        ? [['I build websites that', .16], ['pull ● their', .34], ['weight.', .5]]
        : [['I build websites that', .15], ['pull ● their', .34], ['weight.', .51]];
    const slabEl = pin.querySelector('.heroslab');
    if (portrait) slabEl.style.cssText = `left:${pad}px;right:${pad}px;bottom:${pad}px`;
    const area = portrait ? H - slabEl.offsetHeight - pad * 2 - top : short ? H * .62 - top : H * .72 - top;
    const gap = Math.max(3, H * .007);
    let y = top; let gapRect = null;
    spec.forEach(([txt, frac], idx) => {
      const isHeavy = idx === spec.length - 1;
      const rowH = (area - gap * (spec.length - 1)) * frac;
      const row = el('div', 'hrow r' + (idx % 4) + (isHeavy ? ' heavy' : ''));
      const run = el('div', 'hrun');
      const grow = el('div', isHeavy ? 'hgrow' : '');
      const ln = mkLine(txt.replace(' ●', ''), idx);
      const t = ln.querySelector('.t');
      let gapEl = null;
      if (txt.includes('●')) {
        const [a, b] = txt.split(' ●');
        t.innerHTML = ''; t.dataset.t = '';
        t.append(document.createTextNode(a));
        gapEl = el('span'); gapEl.style.cssText = 'display:inline-block;width:1.02em';
        t.append(gapEl);
        if (b) t.append(document.createTextNode(b.trim()));
      }
      grow.append(ln); run.append(grow); row.append(run); rows.append(row);
      row.style.top = y + 'px';
      fitLine(ln, width, rowH / .675);
      const hNat = ln.offsetHeight || rowH;
      const sy = rowH / hNat;
      row.style.transform = `scaleY(${sy.toFixed(3)})`;
      if (isHeavy) grow.style.setProperty('--hg', Math.max(3, (H * 1.35) / rowH).toFixed(2));
      if (gapEl) {
        const fs = parseFloat(t.style.fontSize);
        gapRect = { x: pad + gapEl.offsetLeft + fs * .51, y: y + rowH / 2, d: Math.min(rowH * 1.16, fs * 1.0) };
      }
      y += rowH + gap;
    });

    const slab = pin.querySelector('.heroslab');
    const bottomH = H - y - gap;
    pose(pin.querySelector('.hv1'), { x: gapRect.x / W, y: gapRect.y / H, w: (gapRect.d * 1.6) / W, r: 0, s: 'circle' });
    if (portrait) {
      slab.style.cssText = `left:${pad}px;right:${pad}px;bottom:${pad}px`;
      pose(pin.querySelector('.hv2'), { x: 1.2, y: .9, w: .4, r: 0, s: 'stairs' });
      pose(pin.querySelector('.oh1'), { x: .5, y: .5, w: 3.2, r: 0, s: 'slab' });
      pose(pin.querySelector('.oh2'), { x: .3, y: .24, w: 1.6, r: 0, s: 'slab' });
      pose(pin.querySelector('.oh3'), { x: .9, y: .9, w: 1.4, r: 0, s: 'stairs' });
      pose(pin.querySelector('.oh4'), { x: -1, y: -1, w: .1, r: 0, s: 'circle' });
    } else {
      const sw = short ? W * .52 : W * .47;
      slab.style.cssText = `left:${pad}px;bottom:${pad}px;width:${sw}px`;
      const rightW = W - sw - pad * 3;
      const vh2 = Math.min(bottomH * 1.45, rightW / 1.6);
      pose(pin.querySelector('.hv2'), { x: (W - (vh2 * 1.6) / 2) / W, y: (y + vh2 / 2) / H, w: (vh2 * 1.6) / W, r: 0, s: 'stairs' });
      st.oh3 = { x: (W - (vh2 * 1.6) / 2 - 16) / W, y: (y + vh2 / 2 - 16) / H, w: (vh2 * 1.6) / W, r: 0, s: 'stairs' };
      pose(pin.querySelector('.oh1'), { x: .78, y: .5, w: 1.25, r: 0, s: 'slab' });
      pose(pin.querySelector('.oh2'), { x: .17, y: .5, w: 1.0, r: 0, s: 'slab' });
      pose(pin.querySelector('.oh3'), st.oh3);
      pose(pin.querySelector('.oh4'), { x: .56, y: .34, w: .42, r: 0, s: 'circle' });
    }
  };

  const layoutFlow = () => {
    const pad = Math.min(18, Math.max(8, W * .011));
    document.querySelectorAll('[data-fit]').forEach((node) => {
      let text = node.dataset.fit;
      if (node.dataset.pr) { if (!portrait) { if (node.dataset.pr === '2') { node.innerHTML = ''; node.style.display = 'none'; return; } text = 'What it costs'; } node.style.display = 'block'; }
      node.innerHTML = '';
      const ln = mkLine(text, 0);
      if (node.dataset.lower) ln.style.textTransform = 'none';
      node.append(ln);
      const width = (node.clientWidth || (W - pad * 2));
      const target = node.dataset.pr ? (portrait ? W * .3 : short ? H * .22 : H * .2) : node.dataset.short ? (portrait ? W * .2 : H * .13) : portrait ? W * .24 : short ? H * .2 : H * .16;
      fitLine(ln, width, target, node.dataset.lower ? 720 : 900);
    });
    document.querySelectorAll('.row-y .ln').forEach((ln) => { /* the two biggest rows */
      fitLine(ln, ln.parentElement.clientWidth, portrait ? W * .4 : short ? H * .26 : H * .3);
    });
  };

  /* ---------- director ---------- */
  let active = null, tops = [], flowTop = 0;
  const cacheTops = () => { tops = stages.map((s) => s.sec.getBoundingClientRect().top + scrollY); flowTop = document.getElementById('prices').getBoundingClientRect().top + scrollY + (still ? 0 : H * .09); };

  const setActive = (st) => {
    if (active === st) return;
    if (active) { active.pin.classList.remove('on', 'spring'); }
    active = st;
    if (st) {
      st.pin.classList.remove('spring');
      st.beat = -1;
      st.pin.classList.add('on');
    }
    govern();
  };

  const scrollFrame = () => {
    ticking = false;
    const y = scrollY;
    if (still) { fallbackP(y); return; }
    let cur = null;
    if (y < flowTop) { for (let i = stages.length - 1; i >= 0; i--) { if (tops[i] <= y + 1) { cur = stages[i]; break; } } if (!cur) cur = stages[0]; }
    else cur = null;
    /* the last sheet stays lit until the prices sheet has fully covered it */
    setActive(cur);
    if (cur && (cur.site || cur.over)) {
      const q = (y - tops[stages.indexOf(cur)]) / H;
      const b = q < .28 ? 0 : q < .62 ? 1 : 2;
      if (b !== cur.beat) {
        const first = cur.beat === -1;
        if (first) { cur.pin.classList.remove('spring'); applyBeat(cur, b); void cur.pin.offsetWidth; cur.pin.classList.add('spring'); }
        else { applyBeat(cur, b); kick(cur.pin); }
        cur.beat = b;
      }
    }
    fallbackP(y);
    vidsOnScreen();
  };
  const kick = (pin) => { const n = pin.querySelector('.name'); if (!n) return; n.classList.remove('jolt'); void n.offsetWidth; n.classList.add('jolt'); };
  const noTL = !(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  const fallbackP = (y) => {
    if (!noTL) return;
    stages.forEach((st, i) => {
      if (st !== active) return;
      const len = st.sec.offsetHeight - H; const p = Math.max(0, Math.min(1, (y - tops[i]) / Math.max(1, len)));
      st.sec.style.setProperty('--p', p.toFixed(3));
      const w = p < .08 ? 0 : p < .3 ? (p - .08) / .22 : p < .44 ? 1 - (p - .3) / .14 : 0;
      st.sec.style.setProperty('--w1', w.toFixed(3));
    });
  };
  let ticking = false;
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(scrollFrame); } }, { passive: true });

  /* ---------- video governor: at most 3 play, only what is on screen ---------- */
  const flowVids = [...document.querySelectorAll('.flow video')];
  let paused = false;
  const onScreen = (v) => { const r = v.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const govern = () => {
    const want = [];
    if (!still && active) {
      const vs = [...active.pin.querySelectorAll('video')].filter(onScreen);
      if (active.over) { const shift = Math.floor(performance.now() / 5600) % vs.length; want.push(...vs.slice(shift), ...vs.slice(0, shift)); } else want.push(...vs);
    }
    if (still) document.querySelectorAll('video').forEach((v) => { if (onScreen(v)) want.push(v); });
    flowVids.forEach((v) => { if (onScreen(v)) want.push(v); });
    const list = want.slice(0, 3);
    document.querySelectorAll('video').forEach((v) => {
      if (!paused && list.includes(v)) {
        if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.load(); }
        if (v.paused) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
      } else if (!v.paused) v.pause();
    });
  };
  let vt = 0;
  const vidsOnScreen = () => { const n = performance.now(); if (n - vt > 180) { vt = n; govern(); } };
  setInterval(govern, 900);

  /* pause */
  const pauseBtn = document.getElementById('pause');
  const setPaused = (v) => {
    paused = v; root.classList.toggle('paused', v);
    pauseBtn.setAttribute('aria-pressed', String(v));
    pauseBtn.setAttribute('aria-label', v ? 'Play motion' : 'Pause motion');
    pauseBtn.querySelector('.pl').textContent = v ? 'Play' : 'Pause';
    govern();
  };
  pauseBtn.addEventListener('click', () => setPaused(!paused));

  /* keyboard: tabbing to a link inside a sheet takes you to the beat where that link is showing */
  document.addEventListener('focusin', (e) => {
    if (still) return;
    const pin = e.target.closest && e.target.closest('.stage .pin');
    if (!pin) return;
    const st = stages.find((s) => s.pin === pin); if (!st) return;
    const beatable = st.site || st.over;
    const y = st.sec.getBoundingClientRect().top + scrollY + (beatable ? H * .72 : 0);
    if (st !== active || (beatable && st.beat !== 2)) scrollTo(0, y);
  });

  /* flow sheets slam when they arrive */
  const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) en.target.classList.add('in'); }), { threshold: .3 });
  document.querySelectorAll('.flow.spr').forEach((n) => io.observe(n));

  /* ---------- layout ---------- */
  let lastW = 0, lastH = 0;
  const layout = (force) => {
    const iw = root.clientWidth, ih = innerHeight;
    if (!force && iw === lastW && Math.abs(ih - lastH) < 130) return;
    lastW = iw; lastH = ih;
    W = iw; H = ih;
    portrait = W < 760 && H > W; short = !portrait && H < 500;
    const wantStill = reduce.matches || H < 300;
    still = wantStill;
    root.classList.toggle('still', still); root.classList.toggle('motion', !still);
    if (still) { H = Math.max(H, 560); if (!paused) setPaused(true); }
    headH = 44;
    layoutHero();
    stages.forEach((st) => { if (st.site || st.over) { if (st.over) layoutOver(st); else layoutSite(st); if (still) { st.pin.classList.remove('spring'); applyBeat(st, 2); } else st.beat = -1; } });
    layoutFlow();
    cacheTops();
    scrollFrame();
    govern();
  };
  addEventListener('resize', () => layout(false));
  reduce.addEventListener('change', () => layout(true));

  const go = () => { layout(true); root.classList.add('ready'); if (location.hash) { const t = document.querySelector(location.hash); if (t) t.scrollIntoView(); } };
  if (document.fonts && document.fonts.load) {
    Promise.race([
      Promise.all(['900 100px Anybody', 'italic 800 40px Fraunces', '700 12px "Martian Mono"'].map((f) => document.fonts.load(f, 'ABCabc$')))
        .then(() => document.fonts.ready),
      new Promise((r) => setTimeout(r, 2500)),
    ]).then(go);
  } else go();
})();
