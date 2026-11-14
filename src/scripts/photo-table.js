/* /photography: the light table. The page prints every photo as a plain grid of links (the gallery
   without JavaScript). This lays the same prints out on an endless table and lets you move round it:

   - The layout is masonry columns. Each column repeats down forever on its own period, and the block
     of columns repeats across, so there is no edge in any direction. Only the prints near the screen
     exist in the DOM; the rest are recycled as you move.
   - Drag (mouse, pen or touch) with inertia when you let go, a trackpad or wheel once you have pressed
     on the table, the arrow keys while it has focus, or the four buttons (WCAG 2.5.7: nothing needs a
     drag). Enter opens the print in the middle.
   - It drifts slowly on its own when nobody is touching it, and the prints lean a little with speed,
     like paper slid across a table. Reduced motion: no drift, no glide, no lean, no deal.
   - A film plays while it is near the middle (three at most); nothing is fetched until then, and with
     Data Saver or reduced motion it stays on its poster.
   - A print opens into a native <dialog>, growing out of where it lay on a spring. Previous and Next
     walk the prints in order; the film there has its own controls (WCAG 2.2.2).
   - The /work filter bar picks a kind, and Table / Grid switches to the plain grid, which is also the
     way through for a screen reader.

   Depth, light and colour (2026-11-13), all on top of the above and all off under reduced motion
   unless it says otherwise:

   - Depth. Neighbouring columns slide at slightly different speeds (columnSpeed in
     src/lib/photo-table.ts), every print trails the table by its own small amount, and the whole
     table tips a couple of degrees toward the way it was thrown.
   - The lens. Prints ease smaller toward the corners (lensScale) and the stage's own edge falls
     into shade (CSS, .pt-stage::after), so the middle print is the subject. A print's opacity is
     never touched: tests/first-viewport.spec.ts holds every image on the first screen at 1.
   - The lamp. With a mouse, a pool of light follows the pointer, and prints near it lift, turn to
     face it and catch a sheen. Touch screens have no hover, so they skip it.
   - The wash. The table's own colour drifts toward the colour of the print in the middle
     (src/data/photo-colors.json, written by `npm run photo-colors`). Under reduced motion it is
     set without the drift.
   - Zoom. Pinch with two fingers, the + and - keys while the table has focus, or the two buttons
     (nothing needs a pinch). Ctrl + wheel is left to the browser's own zoom.
   - A filter scatters the prints that are down before the new kind is dealt.
   - The full view develops in from the print's own colour, the backdrop takes that colour, a
     sideways swipe steps on a touch screen, and the table underneath follows to the print you
     stepped to, so closing lands beside it.
   - "Fill the screen" puts the bar and the table in the browser's full screen, where it has one.

   Around the table (2026-11-13):

   - Films cuts across the kinds (inFilter). The page opens on everything; the Selects filter went
     on 2026-11-14, and the `select` flag now only marks the tour's stops.
   - "Colour" lays the table in hue order, column by column (byHue), so the wash runs round the
     wheel as you travel. "Tour" glides from select to select and stops at a touch.
   - Every print has an address, ?print=<slug>: opening one writes it, closing clears it, and
     arriving with one opens that print.
   - The full view also shows the print's set as a strip to step through, a link to the client's
     case study when there is one, a Copy link button, and a booking card after every few steps.
   - The hero frame, the film strip and the "What I shoot" rows sit outside the table and lead
     into it: any link with data-print opens the full view, data-go sets the filter. */

import { ui } from './kit.js';
import { bloom, setPill } from './seg-bar.js';
import { columnSpeed, lensScale, hexToRgb, inFilter, byHue } from '../lib/photo-table.ts';

var doc = document;
var sec = doc.querySelector('[data-table]');

if (sec) start(sec);

function start(sec) {
  var DATA = JSON.parse(doc.getElementById('pt-data').textContent);
  var stage = sec.querySelector('[data-stage]'),
    world = sec.querySelector('[data-world]'),
    lamp = sec.querySelector('[data-lamp]'),
    grid = sec.querySelector('[data-grid]'),
    bar = sec.querySelector('[data-bar]'),
    status = sec.querySelector('[data-status]'),
    nowEl = sec.querySelector('[data-now]'),
    coordsEl = sec.querySelector('[data-coords]'),
    zoomEl = sec.querySelector('[data-zoomed]');
  var dlg = doc.querySelector('[data-open]');
  var reduce = ui.reduce;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  // The lamp and the lift follow a pointer that can hover; a finger cannot.
  var canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---- Sizes ------------------------------------------------------------- */
  var W, GAP, MAT;
  var ZMIN = 0.6,
    ZMAX = 1.6;
  function measure() {
    var vw = innerWidth;
    W = vw < 520 ? 150 : vw < 900 ? 210 : vw < 1500 ? 250 : 280;
    GAP = vw < 520 ? 16 : 26;
    MAT = parseFloat(getComputedStyle(stage).getPropertyValue('--mat')) * 16 || 8;
  }

  /* A small fixed hash, so a print's tilt and a column's offset are the same on every visit. */
  function hash(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  /* ---- Layout ------------------------------------------------------------ */
  var byColour = false; // lay the table in hue order
  var kind = 'all',
    list = DATA, // the prints in the current filter, in order
    cols = [], // [{ items: [{ p, y, h }], H, off, sp }]
    C = 1,
    colW = 0,
    wanted = 0; // the columns the table asked for when it was last laid

  function layout() {
    list = DATA.filter(function (p) {
      return inFilter(p, kind);
    });
    // A small set is dealt again (rotated) until there is enough to fill a table without repeats
    // standing side by side.
    var deck = list.slice();
    var turn = 1;
    while (deck.length < 28 && list.length) {
      deck = deck.concat(list.slice(turn % list.length).concat(list.slice(0, turn % list.length)));
      turn++;
    }
    if (byColour) {
      // Round the colour wheel. A small set goes round it more than once, so no print sits
      // beside its own copy.
      var sorted = byHue(list),
        times = Math.max(1, Math.ceil(28 / (sorted.length || 1)));
      deck = [];
      for (var r = 0; r < times; r++) deck = deck.concat(sorted);
    }
    colW = W + GAP;
    // Enough columns that the block is wider than the table at its furthest zoom out, where there
    // are prints to fill them, so a print is not on screen twice.
    var want = (wanted = Math.ceil((stage.clientWidth / ZMIN + 400) / colW));
    C = Math.max(2, Math.min(want, Math.floor(deck.length / 3)));
    cols = [];
    for (var c = 0; c < C; c++)
      cols.push({
        items: [],
        H: 0,
        off: Math.round(hash(c + 1) * 180),
        // How fast this column slides compared with the table: the depth.
        sp: reduce ? 1 : columnSpeed(c),
      });
    // In colour order the columns are filled one after another, so the hue runs left to right.
    var per = Math.ceil(deck.length / C);
    // Does column c, or a column beside it, already hold this print? The columns slide at their
    // own speeds, so any two frames in neighbouring columns line up at some point: a copy has to
    // keep at least one column between itself and the original, and the table wraps round.
    function near(c, p) {
      for (var d = -1; d <= 1; d++) {
        var items = cols[mod(c + d, C)].items;
        for (var q = 0; q < items.length; q++) if (items[q].p === p) return true;
      }
      return false;
    }
    deck.forEach(function (p, n) {
      // Otherwise shortest column first, so the columns come out near one height, among the
      // columns where this print has no copy close by (all of them, if none qualifies).
      var open = byColour
        ? []
        : cols.filter(function (_, c) {
            return !near(c, p);
          });
      var col = byColour
        ? cols[Math.min(C - 1, Math.floor(n / per))]
        : (open.length ? open : cols).reduce(function (a, b) {
            return b.H < a.H ? b : a;
          });
      var h = Math.round(((W - 2 * MAT) * p.h) / p.w + 2 * MAT);
      col.items.push({ p: p, y: col.H, h: h });
      col.H += h + GAP;
    });
  }

  /* ---- Camera and motion --------------------------------------------------- */
  // cx, cy: the world point at the stage's top-left. vx, vy: px per second.
  // A column's own camera is cy times its speed, which is all the depth is.
  var cx = 0,
    cy = 0,
    vx = 0,
    vy = 0;
  var zoomBase = 1; // what the visitor asked for; the spring eases to it
  var zoom = ui.spring(170, 22, 1); // and eases out a little more while moving fast
  var lean = { x: 0, y: 0 }; // smoothed velocity, for the prints' lean
  var dragging = false,
    engaged = false, // the wheel moves the table only after a press on it
    lastTouch = performance.now(),
    drift = 0, // 0..1, how much of the idle drift is running
    frameDt = 0.016;
  // The pointer over the table, in stage pixels, for the lamp.
  var ptr = { x: 0, y: 0, on: false, lit: 0 };
  // The wash: the table's colour, drifting toward the middle print's.
  var wash = null,
    washTo = null;

  var live = new Map(); // key -> { el, p, x, y, w, h, tilt, video, sp, k, sx, sy, f }
  var pool = [];

  function el(p) {
    var d = pool.pop();
    if (!d) {
      d = doc.createElement('div');
      d.className = 'pt-p';
      d.setAttribute('aria-hidden', 'true');
    }
    d.innerHTML = '';
    var img = doc.createElement('img');
    img.src = p.small;
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    d.appendChild(img);
    if (p.video) {
      var tag = doc.createElement('span');
      tag.className = 'pt-film label';
      tag.textContent = 'Film';
      d.appendChild(tag);
    }
    d.dataset.i = p.i;
    d.classList.remove('is-mid', 'is-playing');
    d.style.zIndex = '';
    d.style.removeProperty('--g');
    return d;
  }

  function stopFilm(it) {
    if (it.video) {
      it.video.pause();
      it.video.removeAttribute('src');
      it.video.load();
    }
  }
  function release(key, it) {
    stopFilm(it);
    it.el.remove();
    pool.push(it.el);
    live.delete(key);
  }

  function mod(a, n) {
    return ((a % n) + n) % n;
  }

  var mid = null, // the print nearest the middle
    settling = false; // a print is still easing up or down under the lamp
  function paint() {
    var sw = stage.clientWidth,
      sh = stage.clientHeight,
      s = zoom.x;
    // The world rectangle on screen, with a margin so prints are made before they show.
    var vw = sw / s,
      vh = sh / s,
      ox = cx + (sw - vw) / 2,
      m = 200;
    var seen = new Set();
    var c0 = Math.floor((ox - m) / colW),
      c1 = Math.floor((ox + vw + m) / colW);
    var best = null,
      bestD = Infinity,
      mx = cx + sw / 2;
    for (var ci = c0; ci <= c1; ci++) {
      var col = cols[mod(ci, C)];
      if (!col || !col.H) continue;
      var x = ci * colW;
      // This column's own camera.
      var cyc = cy * col.sp,
        oy = cyc + (sh - vh) / 2,
        my = cyc + sh / 2;
      var k0 = Math.floor((oy - m - col.off - col.H) / col.H),
        k1 = Math.floor((oy + vh + m - col.off) / col.H);
      for (var k = k0; k <= k1; k++) {
        for (var j = 0; j < col.items.length; j++) {
          var t = col.items[j];
          var y = k * col.H + col.off + t.y;
          if (y + t.h < oy - m || y > oy + vh + m) continue;
          var key = ci + '|' + k + '|' + j;
          seen.add(key);
          var it = live.get(key);
          if (!it) {
            var d = el(t.p);
            var seed = ci * 31 + k * 17 + j;
            it = {
              el: d,
              p: t.p,
              x: x,
              y: y,
              w: W,
              h: t.h,
              tilt: (hash(seed) - 0.5) * 3,
              // How far this print trails the table, in seconds of the table's speed.
              k: 0.004 + hash(seed + 0.5) * 0.016,
              sp: col.sp,
              sx: 0,
              sy: 0,
              f: 0,
              video: null,
              born: performance.now(),
            };
            d.style.width = W + 'px';
            d.style.height = t.h + 'px';
            world.appendChild(d);
            live.set(key, it);
          }
          var dx = x + W / 2 - mx,
            dy = y + t.h / 2 - my,
            dd = dx * dx + dy * dy;
          if (dd < bestD) {
            bestD = dd;
            best = it;
          }
        }
      }
    }
    live.forEach(function (it, key) {
      if (!seen.has(key)) release(key, it);
    });

    // Place every print: world to screen, scaled about the stage's middle, leaning with speed.
    var lxp = clamp(lean.x, -2400, 2400),
      lyp = clamp(lean.y, -2400, 2400),
      lx = lxp / 2400,
      ly = lyp / 2400,
      half = Math.hypot(sw, sh) / 2,
      reach = 300,
      lit = ptr.lit,
      ease = Math.min(1, frameDt * 11);
    live.forEach(function (it) {
      // The print's middle on screen, before any of the effects below. The films, the deal and
      // the lamp all measure from here.
      var mxs = (it.x + it.w / 2 - cx - sw / 2) * s + sw / 2,
        mys = (it.y + it.h / 2 - cy * it.sp - sh / 2) * s + sh / 2;
      it.sx = mxs;
      it.sy = mys;
      if (reduce) {
        it.el.style.transform =
          'translate3d(' +
          (mxs - it.w / 2).toFixed(1) +
          'px,' +
          (mys - it.h / 2).toFixed(1) +
          'px,0) scale(' +
          s.toFixed(4) +
          ') rotate(' +
          (it.tilt * 0.5).toFixed(2) +
          'deg)';
        return;
      }
      // Trail: loose paper keeps up with the table a moment late.
      var px = mxs - lxp * it.k,
        py = mys - lyp * it.k;
      // Lens: smaller toward the corners.
      var ls = lensScale(Math.hypot(px - sw / 2, py - sh / 2) / half);
      // Lamp: how close the pointer is, eased so a print does not pop.
      var want = 0,
        ddx = 0,
        ddy = 0;
      if (lit > 0.01) {
        ddx = ptr.x - px;
        ddy = ptr.y - py;
        var near = 1 - Math.hypot(ddx, ddy) / reach;
        want = near > 0 ? near * near * lit : 0;
      }
      if (Math.abs(want - it.f) > 0.004) settling = true;
      it.f += (want - it.f) * ease;
      if (it.f < 0.002) it.f = 0;
      var f = it.f;
      var r = it.tilt * (1 - f * 0.7) + lx * 5 * (0.6 + Math.abs(it.tilt) / 3);
      var tr =
        'translate3d(' +
        (px - it.w / 2).toFixed(1) +
        'px,' +
        (py - it.h / 2).toFixed(1) +
        'px,' +
        (f * 70).toFixed(1) +
        'px)';
      if (f) {
        // Turn to face the pointer: at most nine degrees either way.
        tr +=
          ' rotateX(' +
          (clamp(-ddy / (it.h * s), -1, 1) * -9 * f).toFixed(2) +
          'deg) rotateY(' +
          (clamp(-ddx / (it.w * s), -1, 1) * 9 * f).toFixed(2) +
          'deg)';
      }
      it.el.style.transform =
        tr +
        ' scale(' +
        (s * ls).toFixed(4) +
        ') rotate(' +
        r.toFixed(2) +
        'deg) skewY(' +
        (-ly * 3).toFixed(2) +
        'deg)';
      if (f || it.lifted) {
        it.lifted = f > 0;
        it.el.style.zIndex = f > 0.15 ? '2' : '';
        it.el.style.setProperty('--g', f.toFixed(3));
        if (f) {
          it.el.style.setProperty(
            '--gx',
            (50 + clamp(ddx / (it.w * s), -1, 1) * 50).toFixed(1) + '%',
          );
          it.el.style.setProperty(
            '--gy',
            (50 + clamp(ddy / (it.h * s), -1, 1) * 50).toFixed(1) + '%',
          );
        }
      }
    });
    if (!reduce) {
      // The whole table tips toward the way it is moving.
      world.style.transform =
        'rotateX(' + (ly * 2.2).toFixed(2) + 'deg) rotateY(' + (-lx * 2.2).toFixed(2) + 'deg)';
      if (lamp) {
        lamp.style.transform =
          'translate3d(' +
          ptr.x.toFixed(1) +
          'px,' +
          ptr.y.toFixed(1) +
          'px,0) translate(-50%,-50%)';
        lamp.style.opacity = lit.toFixed(2);
      }
    }

    if (best !== mid) {
      if (mid) mid.el.classList.remove('is-mid');
      mid = best;
      if (mid) {
        mid.el.classList.add('is-mid');
        washTo = hexToRgb(mid.p.c);
        if (doc.activeElement === world) say();
      }
    }
    if (coordsEl) {
      var fmt = function (n) {
        n = Math.round(n / 10);
        return (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('en-US');
      };
      coordsEl.textContent = 'x ' + fmt(mx) + '  y ' + fmt(-(cy + sh / 2));
    }
    films();
  }

  /* ---- The wash: the table takes the middle print's colour ------------------------------------ */
  function paintWash(dt) {
    if (!washTo) return false;
    if (!wash || reduce) wash = washTo.slice();
    var moving = false;
    for (var i = 0; i < 3; i++) {
      var d = washTo[i] - wash[i];
      if (Math.abs(d) > 0.6) {
        wash[i] += d * Math.min(1, dt * 1.6);
        moving = true;
      } else wash[i] = washTo[i];
    }
    var css = 'rgb(' + wash.map(Math.round).join(' ') + ')';
    if (css !== paintWash.last) {
      paintWash.last = css;
      stage.style.setProperty('--wash', css);
    }
    return moving;
  }

  /* ---- Films: play the nearest three to the middle --------------------------------------------- */
  function films() {
    if (reduce || saveData) return;
    var sw = stage.clientWidth,
      sh = stage.clientHeight,
      s = zoom.x,
      reach = Math.hypot(sw, sh) * 0.42;
    var near = [];
    live.forEach(function (it) {
      if (!it.p.video) return;
      var d = Math.hypot(it.sx - sw / 2, it.sy - sh / 2) / s;
      if (d < reach) near.push({ it: it, d: d });
    });
    near.sort(function (a, b) {
      return a.d - b.d;
    });
    var on = new Set(
      near.slice(0, 3).map(function (n) {
        return n.it;
      }),
    );
    live.forEach(function (it) {
      if (!it.p.video) return;
      if (on.has(it) && !dragging) {
        if (!it.video) {
          var v = doc.createElement('video');
          v.muted = true;
          v.loop = true;
          v.playsInline = true;
          v.setAttribute('playsinline', '');
          v.preload = 'auto';
          v.poster = it.p.small;
          v.src = it.p.video;
          it.el.insertBefore(v, it.el.firstChild);
          it.video = v;
          v.addEventListener('playing', function () {
            var img = it.el.querySelector('img');
            if (img) img.style.visibility = 'hidden';
          });
        }
        if (it.video.paused) {
          var pr = it.video.play();
          if (pr && pr.catch) pr.catch(function () {});
        }
        it.el.classList.add('is-playing');
      } else if (it.video && !it.video.paused) {
        it.video.pause();
        it.el.classList.remove('is-playing');
      }
    });
  }

  /* ---- The loop ----------------------------------------------------------------------------- */
  var raf = 0,
    last = 0,
    visible = true;
  function wake() {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }
  function tick(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frameDt = dt || 0.016;
    var busy = false;

    if (tour) {
      // Glide to this stop, wait there, then on to the next. No drift meanwhile.
      busy = true;
      lastTouch = now;
      var tk = reduce ? 1 : Math.min(1, dt * 2.4);
      cx += (tour.tx - cx) * tk;
      cy += (tour.ty - cy) * tk;
      if (Math.abs(tour.tx - cx) + Math.abs(tour.ty - cy) < 3) tour.dwell += dt;
      if (tour.dwell > (reduce ? 3.5 : 2.6)) {
        tour.n++;
        if (tour.n >= tour.stops.length) stopTour();
        else tourLeg();
      }
    }

    if (!dragging) {
      // Glide after a throw, then settle.
      var f = Math.exp(-dt * 3.2);
      vx *= f;
      vy *= f;
      if (Math.abs(vx) < 4) vx = 0;
      if (Math.abs(vy) < 4) vy = 0;
      // Drift on its own once nobody has touched it for a few seconds.
      var idle = now - lastTouch > 3500 && !reduce && visible && !dlg.open;
      drift += ((idle ? 1 : 0) - drift) * Math.min(1, dt * 1.2);
      cx += (vx + drift * 16) * dt;
      cy += (vy + drift * 10) * dt;
      if (vx || vy || drift > 0.001) busy = true;
    }
    // The lean follows the speed, a little behind it.
    lean.x += (vx - lean.x) * Math.min(1, dt * 8);
    lean.y += (vy - lean.y) * Math.min(1, dt * 8);
    if (Math.abs(lean.x) > 1 || Math.abs(lean.y) > 1) busy = true;
    var speed = Math.hypot(vx, vy);
    if (reduce) zoom.x = zoomBase;
    else if (zoom.step(zoomBase * (1 - Math.min(0.08, speed / 30000)), dt)) busy = true;
    // The lamp comes up and goes down softly.
    var litTo = ptr.on && !dragging && !reduce ? 1 : 0;
    if (Math.abs(litTo - ptr.lit) > 0.005) {
      ptr.lit += (litTo - ptr.lit) * Math.min(1, dt * 7);
      busy = true;
    } else ptr.lit = litTo;
    if (paintWash(dt)) busy = true;

    settling = false;
    paint();
    if (settling) busy = true;
    if (zoomEl) {
      var pct = Math.round(zoom.x * 100) + '%';
      if (zoomEl.textContent !== pct) zoomEl.textContent = pct;
    }
    if ((busy || dragging) && visible) raf = requestAnimationFrame(tick);
  }

  /* ---- Zoom --------------------------------------------------------------------------------- */
  function setZoom(z, quiet) {
    zoomBase = clamp(z, ZMIN, ZMAX);
    lastTouch = performance.now();
    drift = 0;
    [].forEach.call(sec.querySelectorAll('[data-zoom]'), function (b) {
      var out = b.dataset.zoom === 'out';
      b.disabled = out ? zoomBase <= ZMIN + 0.001 : zoomBase >= ZMAX - 0.001;
    });
    if (!quiet && nowEl) nowEl.textContent = 'Zoom ' + Math.round(zoomBase * 100) + ' percent.';
    wake();
  }
  [].forEach.call(sec.querySelectorAll('[data-zoom]'), function (b) {
    b.addEventListener('click', function () {
      var out = b.dataset.zoom === 'out';
      setZoom(zoomBase * (out ? 1 / 1.3 : 1.3));
      // A button that has just switched itself off would drop the focus on the floor.
      if (b.disabled) (sec.querySelector('[data-zoom]:not(:disabled)') || world).focus();
    });
  });

  /* ---- Moving it -------------------------------------------------------------------------- */
  var pid = null,
    px = 0,
    py = 0,
    pt = 0,
    travel = 0,
    downOn = null;
  // Two fingers down is a pinch: the distance between them sets the zoom.
  var fingers = new Map(),
    pinch = null;
  function spread() {
    var a = [];
    fingers.forEach(function (f) {
      a.push(f);
    });
    return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1;
  }
  world.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    stopTour();
    if (e.pointerType === 'touch') {
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 2) {
        pinch = { d: spread(), z: zoomBase };
        travel = 99; // a pinch is never a tap
        vx = vy = 0;
        world.setPointerCapture(e.pointerId);
        return;
      }
    }
    pid = e.pointerId;
    px = e.clientX;
    py = e.clientY;
    pt = performance.now();
    travel = 0;
    downOn = e.target.closest('.pt-p');
    dragging = true;
    engaged = true;
    vx = vy = 0;
    lastTouch = pt;
    drift = 0;
    world.setPointerCapture(pid);
    world.classList.add('is-dragging');
    wake();
  });
  world.addEventListener('pointermove', function (e) {
    if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && fingers.size === 2) {
      setZoom((pinch.z * spread()) / pinch.d, true);
      lastTouch = performance.now();
      return;
    }
    if (e.pointerId !== pid) return;
    var now = performance.now(),
      dt = Math.max(1, now - pt) / 1000,
      dx = e.clientX - px,
      dy = e.clientY - py;
    travel += Math.abs(dx) + Math.abs(dy);
    cx -= dx / zoom.x;
    cy -= dy / zoom.x;
    // Velocity in world px/s, smoothed.
    vx = vx * 0.6 + (-dx / zoom.x / dt) * 0.4;
    vy = vy * 0.6 + (-dy / zoom.x / dt) * 0.4;
    px = e.clientX;
    py = e.clientY;
    pt = now;
    lastTouch = now;
    wake();
  });
  function up(e) {
    fingers.delete(e.pointerId);
    if (pinch) {
      // One finger left after a pinch: carry on dragging from where it is, with no jump or throw.
      pinch = null;
      var rest = fingers.entries().next().value;
      if (rest) {
        pid = rest[0];
        px = rest[1].x;
        py = rest[1].y;
        pt = performance.now();
        vx = vy = 0;
        return;
      }
    }
    if (e.pointerId !== pid) return;
    pid = null;
    dragging = false;
    world.classList.remove('is-dragging');
    // A pause before letting go means no throw.
    if (performance.now() - pt > 80) vx = vy = 0;
    if (reduce) vx = vy = 0;
    if (travel < 7 && downOn && e.type === 'pointerup') {
      vx = vy = 0;
      openAt(+downOn.dataset.i, downOn);
    }
    lastTouch = performance.now();
    wake();
  }
  world.addEventListener('pointerup', up);
  world.addEventListener('pointercancel', up);
  stage.addEventListener('pointerleave', function () {
    engaged = false;
    ptr.on = false;
    wake();
  });
  // The lamp follows a mouse (or a pen that hovers), never a finger.
  if (canHover && !reduce)
    stage.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = stage.getBoundingClientRect();
      ptr.x = e.clientX - r.left;
      ptr.y = e.clientY - r.top;
      // Off while the pointer is on the buttons, so they are not lit from behind.
      ptr.on = !e.target.closest('button');
      wake();
    });

  // A trackpad's sideways swipe always moves the table; an up-and-down wheel moves it only after a
  // press on it, so the page can still scroll past.
  world.addEventListener(
    'wheel',
    function (e) {
      if (e.ctrlKey) return; // leave browser zoom alone
      stopTour();
      var sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (!engaged && !sideways) return;
      e.preventDefault();
      var k = e.deltaMode === 1 ? 32 : 1;
      cx += (e.deltaX * k) / zoom.x;
      cy += (e.deltaY * k) / zoom.x;
      vx = vy = 0;
      lastTouch = performance.now();
      drift = 0;
      wake();
    },
    { passive: false },
  );

  // Glide the camera by (dx, dy): a throw sized to land about there, or a jump under reduced motion.
  function push(dx, dy) {
    stopTour();
    lastTouch = performance.now();
    drift = 0;
    if (reduce) {
      cx += dx;
      cy += dy;
    } else {
      vx = dx * 3.2;
      vy = dy * 3.2;
    }
    wake();
  }
  world.addEventListener('keydown', function (e) {
    var step = e.shiftKey ? 600 : 220;
    var map = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (map[e.key]) {
      e.preventDefault();
      push(map[e.key][0], map[e.key][1]);
    } else if ((e.key === 'Enter' || e.key === ' ') && mid) {
      e.preventDefault();
      openAt(mid.p.i, mid.el);
    } else if (!e.ctrlKey && !e.metaKey && (e.key === '+' || e.key === '=')) {
      e.preventDefault();
      setZoom(zoomBase * 1.3);
    } else if (!e.ctrlKey && !e.metaKey && (e.key === '-' || e.key === '_')) {
      e.preventDefault();
      setZoom(zoomBase / 1.3);
    }
  });
  world.addEventListener('focus', say);
  [].forEach.call(sec.querySelectorAll('[data-nudge]'), function (b) {
    b.addEventListener('click', function () {
      var d = b.dataset.nudge.split(',').map(Number);
      push((d[0] * stage.clientWidth * 0.45) / zoom.x, (d[1] * stage.clientHeight * 0.45) / zoom.x);
    });
  });

  // Say which print is in the middle, for a screen reader on the table.
  var sayT = 0;
  function say() {
    clearTimeout(sayT);
    sayT = setTimeout(function () {
      if (mid && nowEl)
        nowEl.textContent =
          'In the middle: ' + mid.p.title + '. ' + mid.p.alt + '. Press Enter to open it.';
    }, 350);
  }

  /* ---- The deal: on arrival the prints fly out from the middle into their places ---------- */
  function deal(wait) {
    if (reduce || ui.restored()) return;
    var sw = stage.clientWidth,
      sh = stage.clientHeight;
    live.forEach(function (it) {
      var d = Math.hypot(it.sx - sw / 2, it.sy - sh / 2);
      it.el.animate(
        [
          {
            translate: sw / 2 - it.sx + 'px ' + (sh / 2 - it.sy) + 'px',
            scale: '0.55',
          },
          { translate: '0 0', scale: '1' },
        ],
        {
          duration: 900,
          delay: (wait || 0) + Math.min(500, d * 0.45),
          easing: 'cubic-bezier(.3,1.25,.5,1)',
          fill: 'backwards',
        },
      );
    });
  }

  /* ---- The scatter: the prints that are down leave outward before a new kind is dealt ----- */
  function scatter() {
    var sw = stage.clientWidth,
      sh = stage.clientHeight;
    live.forEach(function (it, key) {
      stopFilm(it);
      live.delete(key);
      var node = it.el;
      if (reduce) {
        node.remove();
        pool.push(node);
        return;
      }
      // Straight out from the middle, far enough to clear the table.
      var ax = it.sx - sw / 2,
        ay = it.sy - sh / 2,
        len = Math.hypot(ax, ay) || 1,
        far = Math.hypot(sw, sh) * 0.7;
      node.style.pointerEvents = 'none';
      var a = node.animate(
        [
          { translate: '0 0', opacity: 1 },
          { translate: (ax / len) * far + 'px ' + (ay / len) * far + 'px', opacity: 0 },
        ],
        { duration: 420, easing: 'cubic-bezier(.5,0,.8,.3)', fill: 'forwards' },
      );
      a.finished
        .catch(function () {})
        .then(function () {
          // A scattered print is not put back in the pool: its finished animation would ride along.
          node.remove();
        });
    });
  }

  /* ---- Filters and views ------------------------------------------------------------------- */
  var items = [].slice.call(grid.querySelectorAll('li'));
  // Mark the bar, the grid and the status line for a filter, without touching the table.
  function mark(k, e, b) {
    kind = k;
    [].forEach.call(bar.querySelectorAll('[data-f]'), function (x) {
      x.setAttribute('aria-pressed', String(x === b));
    });
    if (!reduce && e) bloom(b, e);
    setPill(bar);
    items.forEach(function (li) {
      li.hidden = !inFilter(DATA[+li.dataset.i], k);
    });
    var n = DATA.filter(function (p) {
      return inFilter(p, k);
    }).length;
    status.textContent =
      k === 'all'
        ? 'Showing all ' + n + '.'
        : // The button's own word, without its count: "Weddings 12" says "Showing 12 weddings."
          'Showing ' + n + ' ' + b.firstChild.textContent.trim().toLowerCase() + '.';
  }
  // Lay the table again for the filter and order in force: the old prints scatter, the new are dealt.
  function relay() {
    var onTable = sec.dataset.view === 'table' && live.size > 0;
    stopTour();
    scatter();
    mid = null;
    measure();
    layout();
    // Centre the first print of the new set.
    var first = cols[0] && cols[0].items[0];
    if (first) centreOn(0, cols[0].off + first.y, first.h, cols[0].sp);
    paint();
    deal(onTable && !reduce ? 180 : 0);
    wake();
  }
  function setKind(k, e, b) {
    mark(k, e, b);
    relay();
  }
  // Put the camera so the print at (x, y) with height h, in a column of speed sp, is in the middle.
  function centreOn(x, y, h, sp) {
    cx = x + W / 2 - stage.clientWidth / 2;
    cy = (y + h / 2 - stage.clientHeight / 2) / sp;
  }
  [].forEach.call(bar.querySelectorAll('[data-f]'), function (b) {
    b.addEventListener('click', function (e) {
      setKind(b.dataset.f, e, b);
    });
  });
  function setView(v, e, b) {
    stopTour();
    sec.dataset.view = v;
    [].forEach.call(bar.querySelectorAll('[data-v]'), function (x) {
      x.setAttribute('aria-pressed', String(x.dataset.v === v));
    });
    if (!reduce && e && b) bloom(b, e);
    setPill(bar);
    if (v === 'table') {
      paint();
      wake();
    } else {
      live.forEach(function (it) {
        if (it.video) it.video.pause();
      });
    }
  }
  [].forEach.call(bar.querySelectorAll('[data-v]'), function (b) {
    b.addEventListener('click', function (e) {
      setView(b.dataset.v, e, b);
    });
  });

  /* ---- Colour order ---------------------------------------------------------------------- */
  var colourBtn = sec.querySelector('[data-colour]');
  if (colourBtn)
    colourBtn.addEventListener('click', function () {
      byColour = !byColour;
      colourBtn.setAttribute('aria-pressed', String(byColour));
      if (nowEl)
        nowEl.textContent = byColour
          ? 'The table is in colour order.'
          : 'The table is dealt again.';
      relay();
    });

  /* ---- The tour: glide from select to select ------------------------------------------- */
  var tour = null, // { stops, n, tx, ty, dwell }
    tourBtn = sec.querySelector('[data-tour]');
  function tourLeg() {
    var p = tour.stops[tour.n],
      spot = locate(p);
    if (!spot) return stopTour();
    tour.tx = spot.x + W / 2 - stage.clientWidth / 2;
    tour.ty = (spot.y + spot.h / 2 - stage.clientHeight / 2) / spot.sp;
    tour.dwell = 0;
    if (nowEl) nowEl.textContent = 'On the tour: ' + p.title + '. ' + p.alt + '.';
  }
  function startTour() {
    // The selects on the table, or about eight prints spread through it when it has few selects.
    var stops = list.filter(function (p) {
      return p.select;
    });
    if (stops.length < 3) {
      var gap = Math.max(1, Math.floor(list.length / 8));
      stops = list.filter(function (p, i) {
        return i % gap === 0;
      });
    }
    if (!stops.length) return;
    if (sec.dataset.view !== 'table') setView('table');
    tour = { stops: stops, n: 0, tx: cx, ty: cy, dwell: 0 };
    vx = vy = 0;
    world.classList.add('is-touring');
    if (tourBtn) {
      tourBtn.setAttribute('aria-pressed', 'true');
      tourBtn.setAttribute('aria-label', 'Stop the tour');
      tourBtn.textContent = 'Stop';
    }
    tourLeg();
    wake();
  }
  function stopTour() {
    if (!tour) return;
    tour = null;
    world.classList.remove('is-touring');
    if (tourBtn) {
      tourBtn.setAttribute('aria-pressed', 'false');
      tourBtn.setAttribute('aria-label', 'Play a tour of the table');
      tourBtn.textContent = 'Tour';
    }
  }
  if (tourBtn)
    tourBtn.addEventListener('click', function () {
      if (tour) stopTour();
      else startTour();
    });

  /* ---- "What I shoot": a row's button sets the filter and brings the table up ---------- */
  [].forEach.call(doc.querySelectorAll('[data-go]'), function (a) {
    a.addEventListener('click', function (e) {
      var b = bar.querySelector('[data-f="' + a.dataset.go + '"]');
      if (!b) return; // no such filter: let the link jump to the table as it would without script
      e.preventDefault();
      if (sec.dataset.view !== 'table') setView('table');
      setKind(a.dataset.go, null, b);
      stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      world.focus({ preventScroll: true });
    });
  });

  /* ---- Fill the screen ---------------------------------------------------------------------- */
  var fullBtn = sec.querySelector('[data-full]');
  if (fullBtn) {
    if (!doc.fullscreenEnabled || !sec.requestFullscreen) fullBtn.hidden = true;
    else {
      fullBtn.addEventListener('click', function () {
        if (doc.fullscreenElement) doc.exitFullscreen();
        else {
          var p = sec.requestFullscreen();
          if (p && p.catch) p.catch(function () {});
        }
      });
      doc.addEventListener('fullscreenchange', function () {
        var on = doc.fullscreenElement === sec;
        fullBtn.setAttribute('aria-pressed', String(on));
        fullBtn.setAttribute('aria-label', on ? 'Leave full screen' : 'Fill the screen');
        resized();
      });
    }
  }

  /* ---- The full view ---------------------------------------------------------------------- */
  var media = dlg.querySelector('[data-media]'),
    at = 0,
    returnTo = null;
  var setBox = dlg.querySelector('[data-set]'),
    setName = dlg.querySelector('[data-set-name]'),
    setStrip = dlg.querySelector('[data-set-strip]'),
    studyWrap = dlg.querySelector('[data-study-wrap]'),
    studyLink = dlg.querySelector('[data-study]'),
    copyBtn = dlg.querySelector('[data-copy]'),
    bookTpl = sec.querySelector('template[data-booking]'),
    bookEvery = bookTpl ? +bookTpl.dataset.every || 6 : 0,
    steps = 0, // steps taken since the view opened, for the booking card
    onCard = false; // the booking card is up in place of a print
  // The print's own address: ?print=<slug>, written without adding to the history.
  function address(slug) {
    try {
      var u = new URL(location.href);
      if (slug) u.searchParams.set('print', slug);
      else u.searchParams.delete('print');
      history.replaceState(history.state, '', u);
    } catch (e) {
      /* a sandboxed frame may refuse; the view still works */
    }
  }
  // Show print i in the open view, from the set strip: no slide, the table follows.
  function show(i) {
    onCard = false;
    fill(i);
    placeDev();
    follow(DATA[i]);
  }
  function fill(i) {
    var p = DATA[i];
    at = i;
    if (dlg.open) address(p.slug);
    // The client's case study, when this site has one.
    if (studyWrap) {
      studyWrap.hidden = !p.study;
      if (p.study) {
        studyLink.href = p.study;
        studyLink.textContent = 'See the website I built for ' + p.client;
      }
    }
    // The rest of the shoot, as a strip of small frames.
    if (setBox) {
      setBox.hidden = !p.set;
      setStrip.innerHTML = '';
      if (p.set) {
        var mates = DATA.filter(function (q) {
          return q.set === p.set;
        });
        setName.textContent = p.setName + ' · ' + mates.length + ' frames';
        mates.forEach(function (q) {
          var b = doc.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', q.title + (q.video ? ', a short film' : ''));
          if (q === p) b.setAttribute('aria-current', 'true');
          var im = doc.createElement('img');
          im.src = q.small;
          im.alt = '';
          im.loading = 'lazy';
          im.decoding = 'async';
          b.appendChild(im);
          b.addEventListener('click', function () {
            show(q.i);
          });
          setStrip.appendChild(b);
        });
      }
    }
    media.innerHTML = '';
    if (p.video) {
      var v = doc.createElement('video');
      v.src = p.video;
      v.poster = p.large;
      v.muted = true;
      v.loop = true;
      v.controls = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.setAttribute('aria-label', p.alt);
      if (!reduce && !saveData) v.autoplay = true;
      media.appendChild(v);
    } else {
      var img = doc.createElement('img');
      img.src = p.large;
      img.srcset = p.largeSet;
      img.sizes = '(min-width: 60rem) calc(100vw - 24rem), 100vw';
      img.alt = p.alt;
      img.width = p.w;
      img.height = p.h;
      media.appendChild(img);
      if (!reduce && p.c) {
        var dev = doc.createElement('span');
        dev.className = 'pt-dev';
        dev.setAttribute('aria-hidden', 'true');
        media.appendChild(dev);
      }
    }
    if (p.c) dlg.style.setProperty('--tint', p.c);
    else dlg.style.removeProperty('--tint');
    dlg.querySelector('[data-line]').textContent = p.line;
    dlg.querySelector('[data-title]').textContent = p.title;
    dlg.querySelector('[data-alt]').textContent = p.caption || p.alt;
    dlg.querySelector('[data-place]').textContent = p.place;
    var pos = list.indexOf(p);
    dlg.querySelector('[data-count]').textContent = pos >= 0 ? pos + 1 + ' of ' + list.length : '';
  }
  // Lay the developing sheet exactly over the picture (the dialog has to be open to measure it).
  // A picture has no size until it has loaded, so the sheet waits for that, then starts to clear.
  function placeDev() {
    var dev = media.querySelector('.pt-dev'),
      img = media.querySelector('img');
    if (!dev || !img) return;
    var go = function () {
      if (!dev.isConnected || !img.offsetWidth) return;
      dev.style.left = img.offsetLeft + 'px';
      dev.style.top = img.offsetTop + 'px';
      dev.style.width = img.offsetWidth + 'px';
      dev.style.height = img.offsetHeight + 'px';
      dev.classList.add('is-on');
    };
    if (img.complete && img.naturalWidth) go();
    else img.addEventListener('load', go, { once: true });
  }
  // Bring the table, under the full view, to where this print lies nearest to where it is now.
  // Where print p lies on the table, nearest to the middle of what is showing now.
  function locate(p) {
    var sw = stage.clientWidth,
      sh = stage.clientHeight,
      best = null,
      bestD = Infinity;
    cols.forEach(function (col, c) {
      col.items.forEach(function (t) {
        if (t.p !== p) return;
        // The nearest copy of this column across, and of this print down it.
        var ci = c + C * Math.round((cx + sw / 2 - W / 2 - c * colW) / (C * colW));
        var want = cy * col.sp + sh / 2 - t.h / 2 - col.off - t.y;
        var y = Math.round(want / col.H) * col.H + col.off + t.y;
        var d = Math.hypot(ci * colW + W / 2 - cx - sw / 2, y + t.h / 2 - cy * col.sp - sh / 2);
        if (d < bestD) {
          bestD = d;
          best = { x: ci * colW, y: y, h: t.h, sp: col.sp };
        }
      });
    });
    return best;
  }
  function follow(p) {
    if (sec.dataset.view !== 'table') return;
    var best = locate(p);
    if (!best) return;
    centreOn(best.x, best.y, best.h, best.sp);
    vx = vy = 0;
    paint();
  }
  // The booking card: after every few steps, one card with the price and the way to book.
  function card() {
    onCard = true;
    media.innerHTML = '';
    media.appendChild(bookTpl.content.cloneNode(true));
    dlg.querySelector('[data-line]').textContent = 'Booking';
    dlg.querySelector('[data-title]').textContent = 'Want photos like these?';
    dlg.querySelector('[data-alt]').textContent =
      'I photograph services, events, portraits and weddings across Cincinnati.';
    dlg.querySelector('[data-place]').textContent = '';
    dlg.querySelector('[data-count]').textContent = '';
    if (setBox) setBox.hidden = true;
    if (studyWrap) studyWrap.hidden = true;
  }
  function slide(d) {
    if (!reduce)
      media.animate(
        [
          { opacity: 0.2, transform: 'translateX(' + d * 40 + 'px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' },
      );
  }
  function step(d) {
    if (!onCard && bookEvery && ++steps % bookEvery === 0) {
      card();
      slide(d);
      return;
    }
    onCard = false;
    var pos = list.indexOf(DATA[at]);
    if (pos < 0) pos = 0;
    var next = list[mod(pos + d, list.length)];
    fill(next.i);
    placeDev();
    follow(next);
    slide(d);
  }
  function openAt(i, from) {
    stopTour();
    // Focus goes back to where it came from: the table for one of its prints, else the link itself.
    returnTo = from && !from.classList.contains('pt-p') ? from : world;
    steps = 0;
    onCard = false;
    fill(i);
    dlg.showModal();
    address(DATA[i].slug);
    playReels();
    placeDev();
    lastTouch = performance.now();
    // Grow out of the print it came from, on the house spring.
    if (reduce || !from) return;
    var r0 = from.getBoundingClientRect(),
      r1 = media.getBoundingClientRect();
    if (!r1.width || !r0.width) return;
    var s0 = Math.min(r0.width / r1.width, r0.height / r1.height);
    var sp = ui.spring(170, 18, 0),
      t0 = performance.now(),
      prev = t0;
    var ox = r0.left + r0.width / 2 - (r1.left + r1.width / 2),
      oy = r0.top + r0.height / 2 - (r1.top + r1.height / 2);
    (function run(now) {
      var dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      var going = sp.step(1, dt);
      var k = sp.x;
      media.style.transform =
        'translate(' +
        (ox * (1 - k)).toFixed(1) +
        'px,' +
        (oy * (1 - k)).toFixed(1) +
        'px) scale(' +
        (s0 + (1 - s0) * k).toFixed(4) +
        ')';
      if (going && now - t0 < 1500) requestAnimationFrame(run);
      else media.style.transform = '';
    })(t0);
  }
  dlg.querySelector('[data-prev]').addEventListener('click', function () {
    step(-1);
  });
  dlg.querySelector('[data-next]').addEventListener('click', function () {
    step(1);
  });
  dlg.querySelector('[data-close]').addEventListener('click', function () {
    dlg.close();
  });
  dlg.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('video')) return;
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });
  // A sideways swipe on the picture steps, on a touch screen. Previous and Next do the same
  // without one (WCAG 2.5.1), and a film keeps its own controls.
  var sw0 = null;
  media.addEventListener('pointerdown', function (e) {
    sw0 =
      e.pointerType === 'touch' && !e.target.closest('video')
        ? { x: e.clientX, y: e.clientY }
        : null;
  });
  media.addEventListener('pointerup', function (e) {
    if (!sw0) return;
    var dx = e.clientX - sw0.x,
      dy = e.clientY - sw0.y;
    sw0 = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  });
  media.addEventListener('pointercancel', function () {
    sw0 = null;
  });
  // A click on the backdrop (outside the card) closes it.
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg) dlg.close();
  });
  if (copyBtn)
    copyBtn.addEventListener('click', function () {
      var done = function (words) {
        copyBtn.textContent = words;
        setTimeout(function () {
          copyBtn.textContent = 'Copy link';
        }, 2200);
      };
      // The clipboard can refuse (an old browser, a frame); the address is in the bar either way.
      try {
        navigator.clipboard.writeText(location.href).then(
          function () {
            done('Link copied');
          },
          function () {
            done('Copy it from the address bar');
          },
        );
      } catch (e) {
        done('Copy it from the address bar');
      }
    });
  dlg.addEventListener('close', function () {
    media.innerHTML = '';
    address(null);
    playReels();
    if (returnTo && returnTo.isConnected) returnTo.focus({ preventScroll: true });
    lastTouch = performance.now();
    wake();
  });
  // Any link to a print opens the same view: the grid's, the hero frame, a film in the strip.
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('[data-print]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    openAt(+a.dataset.print, a);
  });

  /* ---- The film strip: a film plays while it is on screen, two at most --------------- */
  var reels = [].slice.call(doc.querySelectorAll('[data-reel]')),
    reelsOn = new Set();
  function playReels() {
    if (reduce || saveData) return;
    var n = 0;
    reels.forEach(function (a) {
      var on = reelsOn.has(a) && n < 2 && !dlg.open && !doc.hidden;
      if (on) n++;
      var v = a.querySelector('video');
      if (on && !v) {
        v = doc.createElement('video');
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.setAttribute('playsinline', '');
        v.preload = 'auto';
        v.src = a.dataset.reel;
        a.insertBefore(v, a.firstChild);
      }
      if (v) {
        if (on && v.paused) {
          var pr = v.play();
          if (pr && pr.catch) pr.catch(function () {});
        } else if (!on && !v.paused) v.pause();
      }
      a.classList.toggle('is-playing', on);
    });
  }
  if (reels.length && !reduce && !saveData && 'IntersectionObserver' in window) {
    var reelWatch = new IntersectionObserver(
      function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting) reelsOn.add(en.target);
          else reelsOn.delete(en.target);
        });
        playReels();
      },
      { threshold: 0.6 },
    );
    reels.forEach(function (a) {
      reelWatch.observe(a);
    });
    doc.addEventListener('visibilitychange', playReels);
  }

  /* ---- The film strip's arrows: about a screen of films a press, greyed at either end ------- */
  var reelRow = doc.querySelector('[data-reels]'),
    reelSteps = doc.querySelector('[data-reel-steps]');
  if (reelRow && reelSteps) {
    var stepBtns = [].slice.call(reelSteps.querySelectorAll('[data-reel-step]'));
    var stepState = function () {
      var max = reelRow.scrollWidth - reelRow.clientWidth;
      reelSteps.hidden = max < 8;
      stepBtns[0].disabled = reelRow.scrollLeft < 8;
      stepBtns[1].disabled = reelRow.scrollLeft > max - 8;
    };
    stepBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        reelRow.scrollBy({
          left: +b.dataset.reelStep * reelRow.clientWidth * 0.8,
          behavior: reduce ? 'auto' : 'smooth',
        });
      });
    });
    reelRow.addEventListener('scroll', stepState, { passive: true });
    addEventListener('resize', stepState);
    addEventListener('load', stepState);
    stepState();
  }

  /* ---- Start ------------------------------------------------------------------------------ */
  // Only run while the table is on screen and the tab is showing.
  new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting && !doc.hidden;
    if (visible) wake();
    else
      live.forEach(function (it) {
        if (it.video) it.video.pause();
      });
  }).observe(stage);
  doc.addEventListener('visibilitychange', function () {
    visible = !doc.hidden;
    if (visible) wake();
  });
  // Keep the middle print in the middle when the table changes size, and lay it again if the
  // print width or the number of columns the table needs has changed.
  function resized() {
    var keep = mid && { p: mid.p };
    var oldW = W;
    measure();
    if (W !== oldW || Math.ceil((stage.clientWidth / ZMIN + 400) / (W + GAP)) !== wanted) {
      live.forEach(function (it, key) {
        release(key, it);
      });
      mid = null;
      layout();
    }
    if (keep) follow(keep.p);
    setPill(bar);
    paint();
    wake();
  }
  var rt = 0;
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(resized, 120);
  });

  // The prints reach past the stage's edge, and a clipped box can still be scrolled by focus or
  // scrollIntoView, which would slide the table and its buttons out from under the frame. The CSS
  // uses overflow: clip where it can; this puts it back anywhere that falls through.
  stage.addEventListener('scroll', function () {
    if (stage.scrollLeft || stage.scrollTop) stage.scrollTo(0, 0);
  });

  stage.hidden = false;
  sec.dataset.view = 'table';
  // Open on everything (2026-11-14: the Selects filter went), with the first print (the
  // featured one) in the middle.
  measure();
  layout();
  centreOn(0, cols[0].off + cols[0].items[0].y, cols[0].items[0].h, cols[0].sp);
  setPill(bar);
  // The pill measures its button, so measure again once the font is in and the page has settled.
  if (doc.fonts && doc.fonts.ready)
    doc.fonts.ready.then(function () {
      setPill(bar);
    });
  addEventListener('load', function () {
    setPill(bar);
  });
  setZoom(1, true);
  paint();
  // The table starts in its first print's colour, with no drift into it.
  if (washTo) {
    wash = washTo.slice();
    paintWash(0);
  }
  deal();
  lastTouch = performance.now() - 1500;
  wake();

  // Arriving at a print's own address opens it, on the whole table if the filter does not hold it.
  var asked = new URLSearchParams(location.search).get('print');
  var askedFor =
    asked &&
    DATA.find(function (p) {
      return p.slug === asked;
    });
  if (askedFor) {
    if (!inFilter(askedFor, kind)) setKind('all', null, bar.querySelector('[data-f="all"]'));
    follow(askedFor);
    openAt(askedFor.i, null);
  }
}
