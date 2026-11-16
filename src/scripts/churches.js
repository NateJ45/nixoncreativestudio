/* Churches: as you read the four points, the church's real phone page scrolls along in its window.
   Everything here is critically damped, so it eases to a stop and never bounces. */
import { ui } from './kit.js';
import { wireAsk } from './ask.js';

(function () {
  var reduce = ui.reduce,
    doc = document;
  var $ = function (a, r) {
    return (r || doc).querySelector(a);
  };
  var $$ = function (a, r) {
    return [].slice.call((r || doc).querySelectorAll(a));
  };
  var clamp = function (v) {
    return Math.max(0, Math.min(1, v));
  };

  ui.wireFootage($('.ch-studies'));

  /* Where each page rests, in pixels of the 560-wide capture: the top, then the part each point is talking about.
     Orangeburg stops above its events band: that real section reads "No events at the moment" between
     events, which says nothing about the site. The screen is about 1090 of these pixels tall, and the
     band starts at 1947, so the last stop keeps the band out of the window on the way there too. */
  var STOPS = {
    'first-baptist-muncie': [0, 1370, 2280],
    'first-presbyterian-orangeburg': [0, 430, 840],
  };
  var LONG = { 'first-baptist-muncie': 3300, 'first-presbyterian-orangeburg': 3400 };
  var stands = $$('[data-stand]').map(function (el, i) {
    var slug = el.dataset.stand,
      img = $('.scr img', el);
    return {
      el: el,
      i: i,
      scr: $('.scr', el),
      img: img,
      cap: $('.cap', el),
      stops: STOPS[slug],
      long: LONG[slug],
      p: 0,
      pv: 0,
      target: 0,
    };
  });
  var A = stands[0],
    B = stands[1];
  var pts = $$('[data-pt]');
  var wide = matchMedia('(min-width:62.01rem)');

  /* The swap and the entrance share one critically damped spring. */
  var K = 64,
    C = 2 * Math.sqrt(K),
    swap = 0,
    swapV = 0,
    swapT = 0,
    intro = reduce ? 1 : 0,
    introV = 0,
    t0 = performance.now();
  var mark = { a0: 0, a1: 1, b0: 0, b1: 1, s0: 0, s1: 1 };
  function pageY(el) {
    return el.getBoundingClientRect().top + scrollY;
  }
  function layout() {
    var H = innerHeight,
      r = pts.map(function (p) {
        var t = pageY(p);
        return { t: t, c: t + p.offsetHeight / 2 };
      });
    mark.a0 = r[0].t - H * 0.78;
    mark.a1 = r[1].c - H * 0.45;
    mark.s0 = r[2].t - H * 0.8;
    mark.s1 = r[2].t - H * 0.5;
    mark.b0 = mark.s1 - H * 0.1;
    mark.b1 = r[3].c - H * 0.45;
    pts.forEach(function (p) {
      ui.top(p);
    });
    /* The sizes the frame needs, taken here and not every frame: read mid-frame, straight after the
       last window moved, each one made the browser lay the page out again. */
    stands.forEach(function (st) {
      st.w = st.scr.offsetWidth;
      st.h = st.scr.offsetHeight;
      st.ew = st.el.offsetWidth;
    });
    if (cssMode) placeCss(H, r);
    else wake();
  }
  /* The windows tied to the scroll (churches.css, .ch-css): the browser moves them; this only
     measures, on load and resize. Off under reduced motion and where scroll-driven animation is
     missing, where the frame loop below runs them as before. */
  var cssMode =
    !reduce && !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'));
  var box = $('.ch'),
    marks = [];
  function px(v) {
    return v.toFixed(1) + 'px';
  }
  function placeCss(H, r) {
    var big = wide.matches;
    box.style.setProperty('--ch-s0', px(mark.s0));
    box.style.setProperty('--ch-s1', px(Math.max(mark.s0 + 1, mark.s1)));
    stands.forEach(function (st) {
      var a, b;
      if (big) {
        a = st === A ? mark.a0 : mark.b0;
        b = st === A ? mark.a1 : mark.b1;
      } else {
        /* On a phone each window sits in the page, and its screen moves as it crosses yours. */
        a = pageY(st.el) - H * 0.6;
        b = a + H * 0.6 + st.el.offsetHeight * 0.15;
      }
      /* Each stop as a place on the page and a point in the scroll. A page that would run past
         the foot of its capture stops at the foot, and the stretch that reaches it ends there. */
      var fac = st.w / 560,
        max = Math.max(0, st.long * fac - st.h),
        n = st.stops.length - 1,
        ys = [],
        ps = [];
      for (var i = 0; i <= n; i++) {
        ys.push(st.stops[i] * fac);
        ps.push(a + ((b - a) * i) / n);
      }
      for (i = 1; i <= n; i++) {
        if (ys[i] > max) {
          var k = ys[i - 1] >= max ? 0 : (max - ys[i - 1]) / (ys[i] - ys[i - 1]);
          ps[i] = ps[i - 1] + (ps[i] - ps[i - 1]) * k;
          ys[i] = max;
        }
        if (ys[i - 1] > max) ys[i - 1] = max;
      }
      for (i = 0; i <= n; i++) {
        st.img.style.setProperty('--ch-y' + i, px(-ys[i]));
        st.img.style.setProperty('--ch-p' + i, px(Math.max(i ? ps[i - 1] + 1 : -1e5, ps[i])));
      }
    });
    /* The point you are reading sits on a white card: where each one's middle is on the page,
       for the scroll listener below to compare against. */
    marks = r;
    readNow();
  }
  /* The one whose middle is nearest 45% of the way down the screen, once its top is above 80%. */
  function readNow() {
    var H = innerHeight,
      y = scrollY,
      best = -1,
      bd = 1e9;
    if (wide.matches)
      marks.forEach(function (m, i) {
        var d = Math.abs(m.c - y - H * 0.45);
        if (d < bd && m.t - y < H * 0.8) {
          bd = d;
          best = i;
        }
      });
    pts.forEach(function (p, i) {
      if (p._on !== (i === best)) {
        p._on = i === best;
        p.classList.toggle('on', p._on);
      }
    });
  }
  function along(st, t) {
    var n = st.stops.length - 1,
      f = clamp(t) * n,
      i = Math.min(n - 1, Math.floor(f));
    return st.stops[i] + (st.stops[i + 1] - st.stops[i]) * (f - i);
  }
  function panTo(st) {
    var w = st.w || st.scr.offsetWidth,
      fac = w / 560,
      y = along(st, st.p) * fac,
      max = st.long * fac - (st.h || st.scr.offsetHeight);
    ui.put(
      st.img,
      'transform',
      'translate3d(0,' + (-Math.min(y, Math.max(0, max))).toFixed(1) + 'px,0)',
    );
  }
  var raf = 0,
    last = 0;
  function wake() {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }
  function frame(now) {
    raf = 0;
    var dt = Math.min(0.033, (now - last) / 1000 || 0.016),
      live = false,
      H = innerHeight,
      y = scrollY;
    last = now;
    var big = wide.matches;

    if (big) {
      A.target = clamp((y - mark.a0) / (mark.a1 - mark.a0));
      B.target = clamp((y - mark.b0) / (mark.b1 - mark.b0));
      swapT = clamp((y - mark.s0) / (mark.s1 - mark.s0));
      swapT = swapT * swapT * (3 - 2 * swapT);
    } else {
      /* On a phone each window sits in the page, and its screen moves as it crosses yours. */
      stands.forEach(function (st) {
        var r = st.el.getBoundingClientRect();
        st.target = clamp((H * 0.6 - r.top) / (H * 0.6 + r.height * 0.15));
      });
      swapT = 0;
    }

    stands.forEach(function (st) {
      st.pv += (K * (st.target - st.p) - C * st.pv) * dt;
      st.p += st.pv * dt;
      if (Math.abs(st.target - st.p) < 0.0004 && Math.abs(st.pv) < 0.002) {
        st.p = st.target;
        st.pv = 0;
      } else live = true;
      panTo(st);
    });

    swapV += (K * (swapT - swap) - C * swapV) * dt;
    swap += swapV * dt;
    if (Math.abs(swapT - swap) < 0.0004 && Math.abs(swapV) < 0.002) {
      swap = swapT;
      swapV = 0;
    } else live = true;

    if (now - t0 > 240 && intro !== 1) {
      introV += (K * (1 - intro) - C * introV) * dt;
      intro += introV * dt;
      if (Math.abs(1 - intro) < 0.001 && Math.abs(introV) < 0.004) {
        intro = 1;
        introV = 0;
      } else live = true;
    } else if (intro !== 1) live = true;

    if (big) {
      var W = A.ew || A.el.offsetWidth,
        s = swap,
        apart = Math.sin(Math.PI * s) * 0.3 * W,
        rest = 0.19 * W;
      /* On arrival the first window rises at full strength (nothing on the first screen starts
         hidden), then the second slides out from behind it. */
      var rise = (1 - intro) * 46,
        out = clamp((intro - 0.35) / 0.65);
      ui.put(
        A.el,
        'transform',
        'translate3d(' +
          (-rest * s - apart).toFixed(1) +
          'px,' +
          rise.toFixed(1) +
          'px,0) rotate(' +
          (-2.6 * s).toFixed(2) +
          'deg) scale(' +
          (1 - 0.075 * s).toFixed(4) +
          ')',
      );
      ui.put(
        B.el,
        'transform',
        'translate3d(' +
          (rest * out * (1 - s) + apart).toFixed(1) +
          'px,' +
          rise.toFixed(1) +
          'px,0) rotate(' +
          (2.6 * out * (1 - s)).toFixed(2) +
          'deg) scale(' +
          (1 - 0.075 * (1 - s)).toFixed(4) +
          ')',
      );
      ui.put(A.el, 'zIndex', s < 0.5 ? '2' : '1');
      ui.put(B.el, 'zIndex', s < 0.5 ? '1' : '2');
      ui.put(A.cap, '--co', clamp(1 - s * 3).toFixed(3));
      ui.put(B.cap, '--co', clamp(s * 3 - 2).toFixed(3));
      /* The point you are reading sits on a white card. */
      var best = -1,
        bd = 1e9;
      pts.forEach(function (p, i) {
        var top = ui.top(p),
          d = Math.abs(top + ui.height(p) / 2 - H * 0.45);
        if (d < bd && top < H * 0.8) {
          bd = d;
          best = i;
        }
      });
      pts.forEach(function (p, i) {
        p.classList.toggle('on', i === best);
      });
    } else {
      stands.forEach(function (st) {
        ui.put(st.el, 'transform', '');
        ui.put(st.el, 'zIndex', '');
        st.el.style.opacity = '';
        ui.put(st.cap, '--co', '');
      });
      pts.forEach(function (p) {
        p.classList.remove('on');
      });
    }
    if (live) raf = requestAnimationFrame(frame);
  }

  /* Try it: a question scrolls the church's real page to its answer. The engine is shared with the
     lean sector pages (src/scripts/ask.js). It is wired before the reduced-motion return below, so
     it works there too: the page simply jumps to the answer. */
  wireAsk($('[data-sun]'));

  if (reduce) {
    /* A still page: both windows at the part of the page that matters most, and all the words at full strength. */
    var still = function () {
      stands.forEach(function (st) {
        st.p = 0.5;
        st.target = 0.5;
        panTo(st);
      });
    };
    addEventListener('resize', still);
    addEventListener('load', still);
    still();
    return;
  }
  if (cssMode) {
    box.classList.add('ch-css');
    addEventListener('scroll', readNow, { passive: true });
  } else {
    stands.forEach(function (st) {
      st.img.addEventListener('load', wake);
    });
    addEventListener('scroll', wake, { passive: true });
  }
  addEventListener('resize', layout);
  addEventListener('load', layout);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(layout);
  layout();
  if (cssMode) {
    /* On arrival the first window rises and the second slides out from behind it. The slide only
       on a page opened above the swap, the one place it starts from. */
    box.classList.add('ch-intro');
    if (scrollY < mark.s0) box.classList.add('ch-out');
    setTimeout(function () {
      box.classList.remove('ch-intro', 'ch-out');
    }, 1500);
  }
})();
