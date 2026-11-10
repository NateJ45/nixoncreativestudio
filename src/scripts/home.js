/* The homepage: the hand of clients that scroll deals into the grid, and draw a card. */
import { ui } from './kit.js';
var reduce = ui.reduce,
  $ = function (a) {
    return document.querySelector(a);
  };

var grid = $('[data-grid]');
var tiles = [].slice.call(grid.querySelectorAll('.tile'));
/* Layout measures each window against its cell, so the cell must be positioned before the first measure. */
tiles.forEach(function (t) {
  t.parentNode.style.position = 'relative';
});
ui.wireFootage(grid);

/* Draw a card: a random client opens from its own place in the grid, never the same one twice running.
   It draws from the windows you can see, so the sheet visibly grows out of one, and from all of them
   when none is on the screen. */
var lastDraw = null;
$('[data-draw]').addEventListener('click', function () {
  var inView = tiles.filter(function (t) {
    var r = t.getBoundingClientRect();
    return t !== lastDraw && r.bottom > 40 && r.top < innerHeight - 40;
  });
  var pool = inView.length
    ? inView
    : tiles.filter(function (t) {
        return t !== lastDraw;
      });
  var tile = pool[Math.floor(Math.random() * pool.length)];
  lastDraw = tile;
  ui.openSheet(ui.bySlug(tile.dataset.slug), tile);
});

/* "Websites for:" in the ledger. Reaching for a sector with a mouse, or landing on it with the
   keyboard, deals that sector's client windows up beside the word (the motion is CSS, `.lf` in
   kit.css). The pictures are fetched the first time they are asked for, so they cost nothing on
   load. Escape puts them away, and a touch screen or a narrow one gets the plain link. */
var roomy = matchMedia('(min-width: 48rem)');
[].forEach.call(document.querySelectorAll('[data-lf]'), function (stack) {
  var box = stack.parentNode,
    link = box.querySelector('a'),
    filled = false;
  var show = function () {
    if (!roomy.matches) return;
    if (!filled) {
      filled = true;
      [].forEach.call(stack.children, function (card) {
        var img = new Image();
        img.alt = '';
        img.decoding = 'async';
        img.src = card.dataset.src;
        card.appendChild(img);
      });
    }
    box.classList.add('on');
  };
  var hide = function () {
    box.classList.remove('on');
  };
  link.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'mouse') show();
  });
  link.addEventListener('pointerleave', hide);
  link.addEventListener('focus', function () {
    if (link.matches(':focus-visible')) show();
  });
  link.addEventListener('blur', hide);
  link.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hide();
  });
});

/* The deal: every window has one spot in the real grid. Scroll carries it there from the hand. */
var C = (tiles.length - 1) / 2,
  st = tiles.map(function (el, i) {
    return {
      el: el,
      i: i,
      v: reduce ? 1 : 0,
      vv: 0,
      a: reduce ? 1 : 0,
      av: 0,
      hov: 0,
      dx: 0,
      dy: 0,
      rot: 0,
      sc: 1,
      lift: 0,
      liftv: 0,
      d: 0,
    };
  });
var space = $('[data-space]'),
  W = 0,
  H = 0,
  gridTop = 1,
  dealEnd = 1,
  px = 0,
  pxT = 0,
  t0 = performance.now();
function layout() {
  W = innerWidth;
  H = innerHeight;
  var narrow = W < 720,
    tw = tiles[0].offsetWidth;
  var cardW = narrow
    ? Math.min(W * 0.42, Math.max(120, (H - 470) / 2.02), 200)
    : Math.min(W * 0.142, Math.max(170, (H - 515) / 2.02), 250);
  var cardH = cardW * 2.02,
    gap = narrow ? 26 : 30;
  space.style.setProperty('--stackh', cardH + (narrow ? 88 : 104) + 'px');
  var sr = space.getBoundingClientRect(),
    sy = sr.top + scrollY,
    cy = sy + gap + cardH / 2,
    cx = W / 2;
  var spread = narrow ? W * 0.068 : Math.min(W * 0.082, 132);
  gridTop = grid.getBoundingClientRect().top + scrollY;
  /* The windows land while the whole headline can still be read: the grid stops at 60% of the screen, or lower when a tall headline needs the room. */
  dealEnd = Math.max(
    H * 0.6,
    gridTop - ($('#wh').getBoundingClientRect().top + scrollY) + H * 0.16,
  );
  st.forEach(function (s) {
    var r = s.el.parentNode.getBoundingClientRect(),
      midY = r.top + s.el.offsetTop + s.el.offsetHeight / 2,
      d = s.i - C;
    s.dx = cx + d * spread - (r.left + r.width / 2);
    s.dy = cy + d * d * (narrow ? 2.2 : 3.6) - (midY + scrollY);
    s.rot = d * (narrow ? 4.2 : 3.8);
    s.sc = cardW / tw;
    s.d = d;
  });
  wake();
}
var raf = 0,
  last = performance.now();
function wake() {
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}
function frame(now) {
  raf = 0;
  var dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;
  var p = Math.min(1, Math.max(0, scrollY / Math.max(200, gridTop - dealEnd)));
  px += (pxT - px) * (1 - Math.pow(0.002, dt));
  var live = Math.abs(pxT - px) > 0.001;
  /* Loaded already scrolled, by a reload or Back: everything is simply where it would have ended up. */
  var seed = ui.restored();
  st.forEach(function (s) {
    if (seed) s.a = 1;
    if (now - t0 > 260 + s.i * 62 && s.a !== 1) {
      s.av += (190 * (1 - s.a) - 15 * s.av) * dt;
      s.a += s.av * dt;
      if (Math.abs(1 - s.a) < 0.001 && Math.abs(s.av) < 0.01) {
        s.a = 1;
        s.av = 0;
      } else live = true;
    } else if (s.a !== 1) live = true;
    var o = (st.length - 1 - s.i) * 0.045,
      tgt = reduce ? 1 : Math.min(1, Math.max(0, (p - o) / (1 - 0.32)));
    tgt = tgt * tgt * (3 - 2 * tgt);
    if (seed) {
      s.v = tgt;
      s.vv = 0;
    }
    s.vv += (150 * (tgt - s.v) - 19 * s.vv) * dt;
    s.v += s.vv * dt;
    if (Math.abs(tgt - s.v) < 0.0006 && Math.abs(s.vv) < 0.004) {
      s.v = tgt;
      s.vv = 0;
    } else live = true;
    var liftT = s.hov ? 1 : 0;
    s.liftv += (260 * (liftT - s.lift) - 20 * s.liftv) * dt;
    s.lift += s.liftv * dt;
    if (Math.abs(liftT - s.lift) > 0.001 || Math.abs(s.liftv) > 0.01) live = true;
    else {
      s.lift = liftT;
      s.liftv = 0;
    }
    var k = 1 - s.v,
      a = s.a,
      hand = k * a;
    var tx = s.dx * k + hand * s.d * px * 16,
      ty = s.dy * k - s.lift * (k > 0.5 ? 34 : 7);
    var rot = s.rot * k * (0.25 + 0.75 * a) + hand * px * 2.5;
    var sc =
      (s.sc + (1 - s.sc) * s.v) * (0.35 + 0.65 * a) * (1 + s.lift * (k > 0.5 ? 0.07 : 0.012));
    s.el.parentNode.style.setProperty('--capo', Math.max(0, (s.v - 0.82) / 0.18).toFixed(3));
    s.el.style.transform =
      'translate3d(' +
      tx.toFixed(2) +
      'px,' +
      ty.toFixed(2) +
      'px,0) rotate(' +
      rot.toFixed(3) +
      'deg) scale(' +
      sc.toFixed(4) +
      ')';
    s.el.parentNode.style.zIndex = s.hov ? 30 : k > 0.02 ? 20 - Math.round(Math.abs(s.d) * 2) : 1;
    s.el.parentNode.style.position = 'relative';
  });
  if (live) raf = requestAnimationFrame(frame);
}
addEventListener('scroll', wake, { passive: true });
/* A phone's URL bar sliding away is a height-only resize, and the grid must not move for it. */
var laidW = innerWidth;
addEventListener('resize', function () {
  if (innerWidth < 720 && innerWidth === laidW) return;
  laidW = innerWidth;
  layout();
});
if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
addEventListener('load', layout);
addEventListener(
  'pointermove',
  function (e) {
    if (e.pointerType === 'mouse') {
      pxT = (e.clientX / W) * 2 - 1;
      wake();
    }
  },
  { passive: true },
);
st.forEach(function (s) {
  ui.stillHover(
    s.el,
    function () {
      s.hov = 1;
      wake();
    },
    function () {
      s.hov = 0;
      wake();
    },
  );
  s.el.addEventListener('focus', function () {
    if (s.el.matches(':focus-visible')) {
      s.hov = 1;
      wake();
    }
  });
  s.el.addEventListener('blur', function () {
    s.hov = 0;
    wake();
  });
});
layout();
