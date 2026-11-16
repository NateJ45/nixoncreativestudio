/* Prices: How it works as a pinned drawing. From 62rem, with motion allowed, the four steps are a
   list on the left and one drawing stays on screen beside them (the layout is CSS, prices.css).
   This draws it: as each step is read, a hairline runs to that step's icon and the icon draws,
   so by the last step the four are joined into one line: conversation, plan, design and build,
   launch. How much is drawn follows the scroll, eased on a spring so it has a little weight, and
   scrolling back up undraws it. The step being read is marked `at` (its number and its part of
   the drawing take the blue).

   Under 62rem, under reduced motion and with no script none of this runs: the section is the four
   cards, whose own icons draw once (prices.js). If this file never runs on a wide screen the
   drawing is simply whole, because a path is only held back under .how-live.

   Where the browser has scroll-driven animation (prices.css, .how-css), each line draws as one,
   tied to the scroll, so it moves in step with it rather than a frame behind: this only works out
   the stretch of scroll each line draws over, on load and whenever the page changes size, and
   marks the step being read from those same numbers. That drawing has no spring; it follows the
   scroll exactly. Elsewhere the spring below draws it as before. */
import { ui } from './kit.js';

var pinQ = matchMedia('(min-width: 62rem)');
var draw = document.querySelector('[data-how-draw]'),
  list = document.querySelector('[data-steps]');

/* prices.js asks this before running the cards' own draw-once sequence. */
export function stepsPinned() {
  return !!draw && !ui.reduce && pinQ.matches;
}

if (draw && list && !ui.reduce) {
  var lis = [].slice.call(list.children),
    numEl = draw.querySelector('[data-how-n]'),
    groups = [].slice.call(draw.querySelectorAll('[data-step]'));
  /* Each path gets its window: the stretch of progress over which it draws. Progress runs 0 to 4,
     one unit a step. A step's hairline comes first, then its icon's strokes one after another. */
  var parts = [];
  groups.forEach(function (g) {
    var k = +g.dataset.step,
      c = g.querySelector('.hw-c'),
      strokes = [].slice.call(g.querySelectorAll('.hw-ic path')),
      t0 = k + (c ? 0.32 : 0.06),
      room = 0.94 - (c ? 0.32 : 0.06),
      each = room / (strokes.length + 1);
    if (c) parts.push({ el: c, a: k, b: k + 0.4 });
    strokes.forEach(function (el, i) {
      parts.push({ el: el, a: t0 + i * each, b: t0 + (i + 2) * each });
    });
  });
  var css = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()')),
    /* Where each step's progress starts, in scroll from the top of the page (place()): knots[k] is
       where step k begins, knots[4] where the last ends. */
    knots = [];
  var sp = ui.spring(90, 20, 0),
    target = 0,
    raf = 0,
    last = 0,
    live = false,
    shown = -1;
  /* Where the reading line is among the steps: 0 before the first, 1 as the first one's middle
     reaches it, and so on to 4. The line sits a little below the middle of the screen. */
  var measure = function () {
    var line = innerHeight * 0.62,
      mids = lis.map(function (li) {
        var r = li.getBoundingClientRect();
        return r.top + r.height / 2;
      }),
      lead = mids[0] - (mids[1] - mids[0]),
      p = 0;
    if (line <= lead) return 0;
    for (var i = 0; i < mids.length; i++) {
      var a = i ? mids[i - 1] : lead,
        b = mids[i];
      if (line >= b) p = i + 1;
      else {
        p = i + (line - a) / (b - a);
        break;
      }
    }
    return Math.min(lis.length, Math.max(0, p));
  };
  /* The same progress as measure(), from the scroll alone: nothing on the page is read. */
  var fromScroll = function () {
    var y = scrollY,
      n = knots.length - 1;
    if (n < 1 || y <= knots[0]) return 0;
    for (var k = 0; k < n; k++)
      if (y < knots[k + 1]) return k + (y - knots[k]) / (knots[k + 1] - knots[k]);
    return n;
  };
  var place = function () {
    var line = innerHeight * 0.62,
      mids = lis.map(function (li) {
        var r = li.getBoundingClientRect();
        return r.top + r.height / 2 + scrollY;
      });
    knots = [mids[0] - (mids[1] - mids[0]) - line].concat(
      mids.map(function (m) {
        return m - line;
      }),
    );
    /* Every window sits inside one step, so its stretch of progress is a straight stretch of scroll. */
    parts.forEach(function (x) {
      var k = Math.floor(x.a),
        s0 = knots[k],
        len = knots[k + 1] - s0;
      ui.put(x.el, '--hw-a', (s0 + (x.a - k) * len).toFixed(1) + 'px');
      ui.put(x.el, '--hw-b', (s0 + (x.b - k) * len).toFixed(1) + 'px');
    });
  };
  var paint = function (p) {
    if (!css)
      parts.forEach(function (x) {
        var t = Math.min(1, Math.max(0, (p - x.a) / (x.b - x.a)));
        ui.put(x.el, 'strokeDashoffset', (1 - t).toFixed(4));
      });
    /* The step being read: its number and its strokes take the blue. */
    var now = Math.min(lis.length - 1, Math.floor(target));
    if (target <= 0) now = -1;
    if (now === shown) return;
    shown = now;
    lis.forEach(function (li, i) {
      li.classList.toggle('at', i === now);
    });
    groups.forEach(function (g) {
      g.classList.toggle('now', +g.dataset.step === now);
    });
    if (numEl) numEl.textContent = String(Math.max(0, now) + 1);
  };
  var frame = function (t) {
    raf = 0;
    if (!live) return;
    var dt = Math.min(0.033, (t - last) / 1000 || 0.016);
    last = t;
    var moving = sp.step(target, dt);
    if (!moving) {
      sp.x = target;
      sp.v = 0;
    }
    paint(sp.x);
    if (moving) raf = requestAnimationFrame(frame);
  };
  var wake = function () {
    if (!live) return;
    if (css) {
      if (!raf)
        raf = requestAnimationFrame(function () {
          raf = 0;
          target = fromScroll();
          paint(target);
        });
      return;
    }
    target = measure();
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  var setLive = function () {
    var on = pinQ.matches;
    if (on === live) return;
    live = on;
    draw.classList.toggle('how-live', on);
    draw.classList.toggle('how-css', on && css);
    if (on && css) {
      place();
      shown = -2;
      target = fromScroll();
      paint(target);
    } else if (on) {
      /* Start where the page already is, with no run-up: a reload half way down is half drawn. */
      target = measure();
      sp.x = target;
      sp.v = 0;
      shown = -2;
      paint(target);
    } else {
      /* Back to the cards: every line whole, nothing marked by this file. */
      parts.forEach(function (x) {
        ui.put(x.el, 'strokeDashoffset', '');
        ui.put(x.el, '--hw-a', '');
        ui.put(x.el, '--hw-b', '');
      });
      lis.forEach(function (li) {
        li.classList.remove('at');
      });
    }
  };
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', function () {
    setLive();
    if (live && css) place();
    wake();
  });
  /* The steps move when the page changes height (a question opening, the pictures and fonts
     arriving): measured again then, just after the browser has laid the page out. */
  var again = function () {
    if (!live || !css) return;
    place();
    wake();
  };
  if (css) {
    if ('ResizeObserver' in window) new ResizeObserver(again).observe(document.body);
    addEventListener('load', again);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(again);
  }
  setLive();
}
