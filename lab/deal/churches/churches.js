/* Churches: as you read the four points, the church's real phone page scrolls along in its window.
   Everything here is critically damped, so it eases to a stop and never bounces. */
(function () {
  var N = window.NCS, ui = N.ui, reduce = ui.reduce, doc = document;
  var $ = function (a, r) { return (r || doc).querySelector(a); };
  var $$ = function (a, r) { return [].slice.call((r || doc).querySelectorAll(a)); };
  var clamp = function (v) { return Math.max(0, Math.min(1, v)); };

  ui.words($('#h'), 120);

  /* The windows lower on the page play their footage on hover, like everywhere else. */
  $$('[data-tile]').forEach(function (el) { el.innerHTML = ui.tile(ui.bySlug(el.dataset.tile), { lazy: true }); });
  ui.wireFootage($('.ch-studies'));

  /* Where each page rests, in pixels of the 560-wide capture: the top, then the part each point is talking about. */
  var STOPS = { 'first-baptist-muncie': [0, 1370, 2280], 'first-presbyterian-orangeburg': [0, 985, 2200] };
  var LONG = { 'first-baptist-muncie': 3300, 'first-presbyterian-orangeburg': 3400 };
  var stands = $$('[data-stand]').map(function (el, i) {
    var s = ui.bySlug(el.dataset.stand);
    el.innerHTML = ui.tile(s, {}) + ui.caption(s);
    var v = $('video', el); if (v) v.parentNode.removeChild(v);
    var img = $('.scr img', el);
    img.src = '/assets/churches/' + s.slug + '-long.webp';
    return { el: el, i: i, scr: $('.scr', el), img: img, cap: $('.cap', el), stops: STOPS[s.slug], long: LONG[s.slug], p: 0, pv: 0, target: 0 };
  });
  var A = stands[0], B = stands[1];
  var pts = $$('[data-pt]');
  var wide = matchMedia('(min-width:62.01rem)');

  /* The swap and the entrance share one critically damped spring. */
  var K = 64, C = 2 * Math.sqrt(K), swap = 0, swapV = 0, swapT = 0, intro = reduce ? 1 : 0, introV = 0, t0 = performance.now();
  var mark = { a0: 0, a1: 1, b0: 0, b1: 1, s0: 0, s1: 1 };
  function pageY(el) { return el.getBoundingClientRect().top + scrollY; }
  function layout() {
    var H = innerHeight, r = pts.map(function (p) { var t = pageY(p); return { t: t, c: t + p.offsetHeight / 2 }; });
    mark.a0 = r[0].t - H * .78; mark.a1 = r[1].c - H * .45;
    mark.s0 = r[2].t - H * .8; mark.s1 = r[2].t - H * .5;
    mark.b0 = mark.s1 - H * .1; mark.b1 = r[3].c - H * .45;
    wake();
  }
  function along(st, t) {
    var n = st.stops.length - 1, f = clamp(t) * n, i = Math.min(n - 1, Math.floor(f));
    return st.stops[i] + (st.stops[i + 1] - st.stops[i]) * (f - i);
  }
  function panTo(st) {
    var w = st.scr.offsetWidth, fac = w / 560, y = along(st, st.p) * fac, max = st.long * fac - st.scr.offsetHeight;
    st.img.style.transform = 'translate3d(0,' + (-Math.min(y, Math.max(0, max))).toFixed(1) + 'px,0)';
  }
  var raf = 0, last = 0;
  function wake() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0;
    var dt = Math.min(.033, (now - last) / 1000 || .016), live = false, H = innerHeight, y = scrollY; last = now;
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
        st.target = clamp((H * .6 - r.top) / (H * .6 + r.height * .15));
      });
      swapT = 0;
    }

    stands.forEach(function (st) {
      st.pv += (K * (st.target - st.p) - C * st.pv) * dt; st.p += st.pv * dt;
      if (Math.abs(st.target - st.p) < .0004 && Math.abs(st.pv) < .002) { st.p = st.target; st.pv = 0; } else live = true;
      panTo(st);
    });

    swapV += (K * (swapT - swap) - C * swapV) * dt; swap += swapV * dt;
    if (Math.abs(swapT - swap) < .0004 && Math.abs(swapV) < .002) { swap = swapT; swapV = 0; } else live = true;

    if (now - t0 > 240 && intro !== 1) {
      introV += (K * (1 - intro) - C * introV) * dt; intro += introV * dt;
      if (Math.abs(1 - intro) < .001 && Math.abs(introV) < .004) { intro = 1; introV = 0; } else live = true;
    } else if (intro !== 1) live = true;

    if (big) {
      var W = A.el.offsetWidth, s = swap, apart = Math.sin(Math.PI * s) * .3 * W, rest = .19 * W;
      /* On arrival the first window rises, then the second slides out from behind it. */
      var rise = (1 - intro) * 46, out = clamp((intro - .35) / .65);
      A.el.style.transform = 'translate3d(' + (-rest * s - apart).toFixed(1) + 'px,' + rise.toFixed(1) + 'px,0) rotate(' + (-2.6 * s).toFixed(2) + 'deg) scale(' + (1 - .075 * s).toFixed(4) + ')';
      B.el.style.transform = 'translate3d(' + (rest * out * (1 - s) + apart).toFixed(1) + 'px,' + rise.toFixed(1) + 'px,0) rotate(' + (2.6 * out * (1 - s)).toFixed(2) + 'deg) scale(' + (1 - .075 * (1 - s)).toFixed(4) + ')';
      A.el.style.opacity = intro < 1 ? clamp(intro * 2.2).toFixed(3) : '';
      B.el.style.opacity = intro < .6 ? '0' : '';
      A.el.style.zIndex = s < .5 ? 2 : 1; B.el.style.zIndex = s < .5 ? 1 : 2;
      A.cap.style.setProperty('--co', clamp(1 - s * 3).toFixed(3));
      B.cap.style.setProperty('--co', clamp(s * 3 - 2).toFixed(3));
      /* The point you are reading sits on a white card. */
      var best = -1, bd = 1e9;
      pts.forEach(function (p, i) { var r = p.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - H * .45); if (d < bd && r.top < H * .8) { bd = d; best = i; } });
      pts.forEach(function (p, i) { p.classList.toggle('on', i === best); });
    } else {
      stands.forEach(function (st) { st.el.style.transform = st.el.style.opacity = st.el.style.zIndex = ''; st.cap.style.removeProperty('--co'); });
      pts.forEach(function (p) { p.classList.remove('on'); });
    }
    if (live) raf = requestAnimationFrame(frame);
  }

  if (reduce) {
    /* A still page: both windows at the part of the page that matters most, and all the words at full strength. */
    var still = function () { stands.forEach(function (st) { st.p = .5; st.target = .5; panTo(st); }); };
    addEventListener('resize', still); addEventListener('load', still); still();
    return;
  }
  stands.forEach(function (st) { st.img.addEventListener('load', wake); });
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', layout);
  addEventListener('load', layout);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(layout);
  layout();
})();
