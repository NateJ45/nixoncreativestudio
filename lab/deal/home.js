(function () {
  var N = window.NCS,
    ui = N.ui,
    reduce = ui.reduce,
    $ = function (a) {
      return document.querySelector(a);
    };

  /* Headline, word by word, with the portrait inside the sentence. */
  var h1 = $('#h'),
    n = 0,
    out = '';
  var word = function (t, b) {
    var s = '<span class="w" aria-hidden="true" style="--n:' + n++ + '">' + t + '</span> ';
    return b ? '<b>' + s + '</b>' : s;
  };
  ['I', 'build', 'websites'].forEach(function (w) {
    out += word(w);
  });
  out +=
    '<span class="me" aria-hidden="true"><img src="/assets/portrait.webp" alt=""><span>Hi, that\'s me</span></span> ';
  out += word('that');
  ['pull', 'their', 'weight.'].forEach(function (w) {
    out += word(w, true);
  });
  h1.innerHTML = out;

  ui.priceHand($('[data-prices]'));

  /* The ledger under the big heading: real counts, read from the client list. */
  var plural = {
    Nonprofit: 'nonprofits',
    Church: 'churches',
    School: 'schools',
    'Small business': 'small businesses',
  };
  var single = {
    Nonprofit: 'nonprofit',
    Church: 'church',
    School: 'school',
    'Small business': 'small business',
  };
  var counts = {};
  N.sites.forEach(function (s) {
    counts[s.sector] = (counts[s.sector] || 0) + 1;
  });
  $('[data-ledger]').innerHTML = ['Since 2020', 'One person', 'Cincinnati']
    .concat(
      Object.keys(counts)
        .sort(function (a, b) {
          return counts[b] - counts[a];
        })
        .map(function (k) {
          return counts[k] + ' ' + (counts[k] === 1 ? single[k] : plural[k]);
        }),
    )
    .map(function (t) {
      return '<li>' + t + '</li>';
    })
    .join('');

  ui.band(
    $('[data-band]'),
    'theology-matters',
    '<div class="band-t"><p class="label">In their words</p><blockquote>' +
      N.quote.text +
      '</blockquote><p class="cite"><b>' +
      N.quote.by +
      '</b>' +
      N.quote.role +
      '</p></div>',
  );

  var grid = $('[data-grid]');
  grid.innerHTML = N.sites
    .map(function (s, i) {
      return '<li>' + ui.tile(s, { index: i }) + ui.caption(s, i) + '</li>';
    })
    .join('');
  var tiles = [].slice.call(grid.querySelectorAll('.tile'));
  /* Layout measures each window against its cell, so the cell must be positioned before the first measure. */
  tiles.forEach(function (t) {
    t.parentNode.style.position = 'relative';
  });
  ui.wireFootage(grid);

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
    var p = Math.min(1, Math.max(0, scrollY / Math.max(200, gridTop - H * 0.6)));
    px += (pxT - px) * (1 - Math.pow(0.002, dt));
    var live = Math.abs(pxT - px) > 0.001;
    st.forEach(function (s) {
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
  addEventListener('resize', layout);
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
    s.el.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'mouse') {
        s.hov = 1;
        wake();
      }
    });
    s.el.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'mouse') {
        s.hov = 0;
        wake();
      }
    });
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
})();
