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
     way through for a screen reader. */

import { ui } from './kit.js';
import { bloom, setPill } from './seg-bar.js';

var doc = document;
var sec = doc.querySelector('[data-table]');

if (sec) start(sec);

function start(sec) {
  var DATA = JSON.parse(doc.getElementById('pt-data').textContent);
  var stage = sec.querySelector('[data-stage]'),
    world = sec.querySelector('[data-world]'),
    grid = sec.querySelector('[data-grid]'),
    bar = sec.querySelector('[data-bar]'),
    status = sec.querySelector('[data-status]'),
    nowEl = sec.querySelector('[data-now]'),
    coordsEl = sec.querySelector('[data-coords]');
  var dlg = doc.querySelector('[data-open]');
  var reduce = ui.reduce;
  var saveData = !!(navigator.connection && navigator.connection.saveData);

  /* ---- Sizes ------------------------------------------------------------- */
  var W, GAP, MAT;
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

  /* ---- Layout ------------------------------------------------------------ */
  var kind = 'all',
    list = DATA, // the prints in the current filter, in order
    cols = [], // [{ items: [{ p, y, h }], H, off }]
    C = 1,
    colW = 0;

  function layout() {
    list = DATA.filter(function (p) {
      return kind === 'all' || p.kind === kind;
    });
    // A small set is dealt again (rotated) until there is enough to fill a table without repeats
    // standing side by side.
    var deck = list.slice();
    var turn = 1;
    while (deck.length < 28 && list.length) {
      deck = deck.concat(list.slice(turn % list.length).concat(list.slice(0, turn % list.length)));
      turn++;
    }
    colW = W + GAP;
    var want = Math.ceil((stage.clientWidth * 1.5) / colW);
    C = Math.max(2, Math.min(want, Math.floor(deck.length / 3)));
    cols = [];
    for (var c = 0; c < C; c++) cols.push({ items: [], H: 0, off: Math.round(hash(c + 1) * 180) });
    deck.forEach(function (p) {
      // Shortest column first, so the columns come out near one height.
      var col = cols.reduce(function (a, b) {
        return b.H < a.H ? b : a;
      });
      var h = Math.round(((W - 2 * MAT) * p.h) / p.w + 2 * MAT);
      col.items.push({ p: p, y: col.H, h: h });
      col.H += h + GAP;
    });
  }

  /* ---- Camera and motion --------------------------------------------------- */
  // cx, cy: the world point at the stage's top-left. vx, vy: px per second.
  var cx = 0,
    cy = 0,
    vx = 0,
    vy = 0;
  var zoom = ui.spring(170, 22, 1); // eases out a little while moving fast
  var lean = { x: 0, y: 0 }; // smoothed velocity, for the prints' lean
  var dragging = false,
    engaged = false, // the wheel moves the table only after a press on it
    lastTouch = performance.now(),
    drift = 0; // 0..1, how much of the idle drift is running

  var live = new Map(); // key -> { el, p, x, y, w, h, tilt, video }
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
    return d;
  }

  function release(key, it) {
    if (it.video) {
      it.video.pause();
      it.video.removeAttribute('src');
      it.video.load();
    }
    it.el.remove();
    pool.push(it.el);
    live.delete(key);
  }

  function mod(a, n) {
    return ((a % n) + n) % n;
  }

  var mid = null; // the print nearest the middle
  function paint() {
    var sw = stage.clientWidth,
      sh = stage.clientHeight,
      s = zoom.x;
    // The world rectangle on screen, with a margin so prints are made before they show.
    var vw = sw / s,
      vh = sh / s,
      ox = cx + (sw - vw) / 2,
      oy = cy + (sh - vh) / 2,
      m = 200;
    var seen = new Set();
    var c0 = Math.floor((ox - m) / colW),
      c1 = Math.floor((ox + vw + m) / colW);
    var best = null,
      bestD = Infinity,
      mx = cx + sw / 2,
      my = cy + sh / 2;
    for (var ci = c0; ci <= c1; ci++) {
      var col = cols[mod(ci, C)];
      if (!col || !col.H) continue;
      var x = ci * colW;
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
            it = {
              el: d,
              p: t.p,
              x: x,
              y: y,
              w: W,
              h: t.h,
              tilt: (hash(ci * 31 + k * 17 + j) - 0.5) * 3,
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
    var lx = Math.max(-1, Math.min(1, lean.x / 2400)),
      ly = Math.max(-1, Math.min(1, lean.y / 2400));
    live.forEach(function (it) {
      var sx = (it.x - cx - sw / 2) * s + sw / 2,
        sy = (it.y - cy - sh / 2) * s + sh / 2;
      var r = reduce ? it.tilt * 0.5 : it.tilt + lx * 5 * (0.6 + Math.abs(it.tilt) / 3);
      var skew = reduce ? 0 : -ly * 3;
      it.el.style.transform =
        'translate3d(' +
        sx.toFixed(1) +
        'px,' +
        sy.toFixed(1) +
        'px,0) scale(' +
        s.toFixed(4) +
        ') rotate(' +
        r.toFixed(2) +
        'deg) skewY(' +
        skew.toFixed(2) +
        'deg)';
      it.el.style.transformOrigin = '0 0';
    });

    if (best !== mid) {
      if (mid) mid.el.classList.remove('is-mid');
      mid = best;
      if (mid) {
        mid.el.classList.add('is-mid');
        if (doc.activeElement === world) say();
      }
    }
    if (coordsEl) {
      var fmt = function (n) {
        n = Math.round(n / 10);
        return (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('en-US');
      };
      coordsEl.textContent = 'x ' + fmt(mx) + '  y ' + fmt(-my);
    }
    films();
  }

  /* ---- Films: play the nearest three to the middle --------------------------------------------- */
  function films() {
    if (reduce || saveData) return;
    var sw = stage.clientWidth,
      sh = stage.clientHeight,
      mx = cx + sw / 2,
      my = cy + sh / 2,
      reach = Math.hypot(sw, sh) * 0.42;
    var near = [];
    live.forEach(function (it) {
      if (!it.p.video) return;
      var d = Math.hypot(it.x + it.w / 2 - mx, it.y + it.h / 2 - my);
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
    var busy = false;

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
    var tx = dragging ? vx : vx,
      ty = dragging ? vy : vy;
    lean.x += (tx - lean.x) * Math.min(1, dt * 8);
    lean.y += (ty - lean.y) * Math.min(1, dt * 8);
    if (Math.abs(lean.x) > 1 || Math.abs(lean.y) > 1) busy = true;
    var speed = Math.hypot(vx, vy);
    if (!reduce && zoom.step(1 - Math.min(0.08, speed / 30000), dt)) busy = true;

    paint();
    if ((busy || dragging) && visible) raf = requestAnimationFrame(tick);
  }

  /* ---- Moving it -------------------------------------------------------------------------- */
  var pid = null,
    px = 0,
    py = 0,
    pt = 0,
    travel = 0,
    downOn = null;
  world.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
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
  });

  // A trackpad's sideways swipe always moves the table; an up-and-down wheel moves it only after a
  // press on it, so the page can still scroll past.
  world.addEventListener(
    'wheel',
    function (e) {
      if (e.ctrlKey) return; // leave browser zoom alone
      var sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (!engaged && !sideways) return;
      e.preventDefault();
      var k = e.deltaMode === 1 ? 32 : 1;
      cx += e.deltaX * k;
      cy += e.deltaY * k;
      vx = vy = 0;
      lastTouch = performance.now();
      drift = 0;
      wake();
    },
    { passive: false },
  );

  // Glide the camera by (dx, dy): a throw sized to land about there, or a jump under reduced motion.
  function push(dx, dy) {
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
    }
  });
  world.addEventListener('focus', say);
  [].forEach.call(sec.querySelectorAll('[data-nudge]'), function (b) {
    b.addEventListener('click', function () {
      var d = b.dataset.nudge.split(',').map(Number);
      push(d[0] * stage.clientWidth * 0.45, d[1] * stage.clientHeight * 0.45);
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
  function deal() {
    if (reduce || ui.restored()) return;
    var sw = stage.clientWidth,
      sh = stage.clientHeight;
    live.forEach(function (it) {
      var sx = it.x - cx,
        sy = it.y - cy;
      var d = Math.hypot(sx + it.w / 2 - sw / 2, sy + it.h / 2 - sh / 2);
      it.el.animate(
        [
          {
            translate: sw / 2 - sx - it.w / 2 + 'px ' + (sh / 2 - sy - it.h / 2) + 'px',
            scale: '0.55',
          },
          { translate: '0 0', scale: '1' },
        ],
        {
          duration: 900,
          delay: Math.min(500, d * 0.45),
          easing: 'cubic-bezier(.3,1.25,.5,1)',
          fill: 'backwards',
        },
      );
    });
  }

  /* ---- Filters and views ------------------------------------------------------------------- */
  var items = [].slice.call(grid.querySelectorAll('li'));
  function setKind(k, e, b) {
    kind = k;
    [].forEach.call(bar.querySelectorAll('[data-f]'), function (x) {
      x.setAttribute('aria-pressed', String(x === b));
    });
    if (!reduce && e) bloom(b, e);
    setPill(bar);
    items.forEach(function (li) {
      li.hidden = !(k === 'all' || li.dataset.kind === k);
    });
    var n = DATA.filter(function (p) {
      return k === 'all' || p.kind === k;
    }).length;
    status.textContent =
      k === 'all'
        ? 'Showing all ' + n + '.'
        : // The button's own word, without its count: "Weddings 12" says "Showing 12 weddings."
          'Showing ' + n + ' ' + b.firstChild.textContent.trim().toLowerCase() + '.';
    live.forEach(function (it, key) {
      release(key, it);
    });
    mid = null;
    layout();
    // Centre the first print of the new set.
    var first = cols[0] && cols[0].items[0];
    if (first) {
      cx = W / 2 - stage.clientWidth / 2;
      cy = cols[0].off + first.h / 2 - stage.clientHeight / 2;
    }
    paint();
    deal();
    wake();
  }
  [].forEach.call(bar.querySelectorAll('[data-f]'), function (b) {
    b.addEventListener('click', function (e) {
      setKind(b.dataset.f, e, b);
    });
  });
  function setView(v, e, b) {
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

  /* ---- The full view ---------------------------------------------------------------------- */
  var media = dlg.querySelector('[data-media]'),
    at = 0,
    returnTo = null;
  function fill(i) {
    var p = DATA[i];
    at = i;
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
    }
    dlg.querySelector('[data-line]').textContent = p.line;
    dlg.querySelector('[data-title]').textContent = p.title;
    dlg.querySelector('[data-alt]').textContent = p.caption || p.alt;
    dlg.querySelector('[data-place]').textContent = p.place;
    var pos = list.indexOf(p);
    dlg.querySelector('[data-count]').textContent = pos >= 0 ? pos + 1 + ' of ' + list.length : '';
  }
  function step(d) {
    var pos = list.indexOf(DATA[at]);
    if (pos < 0) pos = 0;
    var next = list[mod(pos + d, list.length)];
    fill(next.i);
    if (!reduce)
      media.animate(
        [
          { opacity: 0.2, transform: 'translateX(' + d * 40 + 'px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' },
      );
  }
  function openAt(i, from) {
    returnTo = sec.dataset.view === 'grid' ? from : world;
    fill(i);
    dlg.showModal();
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
  // A click on the backdrop (outside the card) closes it.
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg) dlg.close();
  });
  dlg.addEventListener('close', function () {
    media.innerHTML = '';
    if (returnTo && returnTo.isConnected) returnTo.focus({ preventScroll: true });
    lastTouch = performance.now();
    wake();
  });
  // The grid's links open the same view.
  grid.addEventListener('click', function (e) {
    var a = e.target.closest('[data-print]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    openAt(+a.dataset.print, a);
  });

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
  var rt = 0;
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var mx = cx + stage.clientWidth / 2,
        my = cy + stage.clientHeight / 2;
      var oldW = W;
      measure();
      if (W !== oldW) {
        live.forEach(function (it, key) {
          release(key, it);
        });
        layout();
      }
      cx = mx - stage.clientWidth / 2;
      cy = my - stage.clientHeight / 2;
      setPill(bar);
      paint();
    }, 120);
  });

  stage.hidden = false;
  sec.dataset.view = 'table';
  measure();
  layout();
  // Open centred on the first print (the featured one).
  cx = W / 2 - stage.clientWidth / 2;
  cy = cols[0].off + cols[0].items[0].h / 2 - stage.clientHeight / 2;
  setPill(bar);
  // The pill measures its button, so measure again once the font is in and the page has settled.
  if (doc.fonts && doc.fonts.ready)
    doc.fonts.ready.then(function () {
      setPill(bar);
    });
  addEventListener('load', function () {
    setPill(bar);
  });
  paint();
  deal();
  lastTouch = performance.now() - 1500;
  wake();
}
