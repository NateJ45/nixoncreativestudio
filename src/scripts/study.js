/* The signature: a phone beside the story that scrolls through the real site as you read. */
import { ui } from './kit.js';
var reduce = ui.reduce,
  doc = document;
var $$ = function (a, r) {
  return [].slice.call((r || doc).querySelectorAll(a));
};
var clamp = function (v, a, b) {
  return Math.min(b, Math.max(a, v));
};

/* The entry: the two windows get thrown onto the page and land on the kit's spring. The phone arrives second and knocks the desktop window as it lands. */
(function () {
  var home = doc.querySelector('.s-fan .p-home'),
    ph = doc.querySelector('.s-fan .p-phone');
  if (reduce || !home || !ph) return;
  var show = function (b) {
    b.el.style.visibility = 'visible';
  };
  var put = function (b) {
    b.el.style.setProperty('--tx', b.x.x.toFixed(1) + 'px');
    b.el.style.setProperty('--ty', b.y.x.toFixed(1) + 'px');
    b.el.style.setProperty('--tr', b.r.x.toFixed(2) + 'deg');
  };
  var clear = function (b) {
    ['--tx', '--ty', '--tr'].forEach(function (p) {
      b.el.style.removeProperty(p);
    });
    show(b);
  };
  var W = innerWidth,
    H = innerHeight;
  /* Start just out of sight, already moving fast: a throw, not a pull. */
  var launch = function (el, x, y, r, at) {
    var b = {
      el: el,
      at: at,
      x: ui.spring(150, 17, x),
      y: ui.spring(150, 17, y),
      r: ui.spring(95, 9.5, r),
      flying: false,
    };
    b.x.v = -x * 2.4;
    b.y.v = -y * 2.4;
    b.r.v = -r * 1.2;
    return b;
  };
  var hb = launch(home, W * 0.07, Math.max(260, H - home.getBoundingClientRect().top + 40), 11, 90);
  var pb = launch(ph, Math.max(260, W - ph.getBoundingClientRect().left + 40), H * 0.34, 30, 300);
  var bodies = [hb, pb];
  if (scrollY > 200) {
    bodies.forEach(clear);
    return;
  }
  bodies.forEach(put);
  var t0 = performance.now(),
    last = t0,
    knocked = false;
  requestAnimationFrame(function go(now) {
    var dt = Math.min(0.033, (now - last) / 1000 || 0.016),
      live = false;
    last = now;
    bodies.forEach(function (b) {
      if (now - t0 < b.at) {
        live = true;
        return;
      }
      if (!b.flying) {
        b.flying = true;
        show(b);
      }
      b.x.step(0, dt);
      b.y.step(0, dt);
      b.r.step(0, dt);
      put(b);
      if (
        Math.abs(b.x.x) + Math.abs(b.y.x) > 0.15 ||
        Math.abs(b.x.v) + Math.abs(b.y.v) > 1 ||
        Math.abs(b.r.x) > 0.02 ||
        Math.abs(b.r.v) > 0.3
      )
        live = true;
    });
    if (!knocked && pb.flying && Math.abs(pb.x.x) < 34) {
      knocked = true;
      hb.x.v -= W * 0.1;
      hb.y.v += H * 0.05;
      hb.r.v -= 9;
    }
    if (live) requestAnimationFrame(go);
    else bodies.forEach(clear);
  });
})();
ui.wireFootage(doc.querySelector('.s-fan'));
ui.wireFootage(doc.querySelector('.next'));

/* The desktop pane plays its real footage under the pointer, like every other window. */
$$('[data-pane]').forEach(function (p) {
  var v = p.querySelector('video');
  p.addEventListener('pointerenter', function (e) {
    if (e.pointerType !== 'mouse' || reduce) return;
    if (!v.src) v.src = v.dataset.src;
    var q = v.play();
    if (q && q.then)
      q.then(function () {
        v.classList.add('on');
      }).catch(function () {});
  });
  p.addEventListener('pointerleave', function () {
    v.classList.remove('on');
    v.pause();
  });
});

/* Each block of a chapter comes in as it reaches you. */
if (!reduce && 'IntersectionObserver' in window) {
  doc.documentElement.classList.add('rv-on');
  var rio = new IntersectionObserver(
    function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          rio.unobserve(e.target);
        }
      });
    },
    { rootMargin: '0px 0px -7% 0px' },
  );
  $$('.rv').forEach(function (el) {
    rio.observe(el);
  });
}

/* Long windows: the real capture slides inside the window, driven by native scroll through a spring. */
var story = doc.querySelector('[data-story]'),
  longs = [];
var add = function (win, img, o) {
  var thumb = win.querySelector('.thumb');
  longs.push({
    win: win,
    img: img,
    thumb: thumb,
    tile: o.tile,
    self: o.self,
    from: o.from,
    to: o.to,
    ratio: +img.getAttribute('height') / +img.getAttribute('width'),
    sp: ui.spring(150, 21, 0),
    travel: 0,
  });
};
if (!reduce) {
  $$('.phone').forEach(function (t) {
    var scr = t.querySelector('.scr'),
      img = t.querySelector('img.long');
    add(scr, img, { tile: t, self: t.classList.contains('wp'), from: 0, to: 1 });
  });
  $$('[data-walk]').forEach(function (w) {
    w.classList.add('linked');
    w.removeAttribute('tabindex');
    w.removeAttribute('role');
    w.removeAttribute('aria-label');
    add(w, w.querySelector('img.long'), { self: true, from: 0, to: 1 });
  });
}
var raf = 0,
  last = 0,
  H = innerHeight;
function measure() {
  H = innerHeight;
  longs.forEach(function (l) {
    var w = l.win.clientWidth,
      h = l.win.clientHeight;
    l.on = w > 0 && h > 0;
    l.travel = l.on ? Math.max(0, w * l.ratio - h) : 0;
    if (l.thumb && l.on) l.thumb.style.height = Math.max(18, (h * h) / (w * l.ratio)) + 'px';
    l.h = h;
  });
  wake();
}
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
  var live = false,
    sr = story.getBoundingClientRect();
  longs.forEach(function (l) {
    if (!l.on) return;
    var p;
    if (l.self) {
      var r = l.win.getBoundingClientRect();
      p = clamp((H - r.top) / (H + r.height), 0, 1);
      if (r.bottom < -200 || r.top > H + 200) {
        l.sp.x = (l.from + (l.to - l.from) * p) * l.travel;
        l.sp.v = 0;
        apply(l);
        return;
      }
    } else {
      p = clamp(-sr.top / Math.max(1, sr.height - H), 0, 1);
    }
    var moving = l.sp.step((l.from + (l.to - l.from) * p) * l.travel, dt);
    if (moving) live = true;
    else l.sp.v = 0;
    apply(l);
  });
  if (live) raf = requestAnimationFrame(frame);
}
function apply(l) {
  var y = clamp(l.sp.x, 0, l.travel);
  l.img.style.transform = 'translate3d(0,' + (-y).toFixed(1) + 'px,0)';
  var speed = Math.abs(l.sp.v);
  if (l.thumb) {
    l.thumb.style.transform =
      'translate3d(0,' +
      (l.travel ? (y / l.travel) * (l.h - l.thumb.offsetHeight) : 0).toFixed(1) +
      'px,0)';
    if (speed > 30) l.thumb.classList.add('on');
    else if (speed < 6) l.thumb.classList.remove('on');
  }
  /* The whole phone leans a little with the speed of the page, then settles. */
  if (l.tile && !l.self)
    l.tile.style.transform = 'rotate(' + clamp(l.sp.v / 420, -1.8, 1.8).toFixed(3) + 'deg)';
}
if (longs.length) {
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', measure);
  addEventListener('load', measure);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(measure);
  measure();
}

/* The full build. Native details, so keyboard and find-in-page come free; the height springs a little. Without this it simply opens. */
$$('[data-more]').forEach(function (d) {
  var sum = d.querySelector('summary'),
    box = d.querySelector('.more-box'),
    an = null;
  var done = function () {
    if (longs.length) measure();
  };
  d.addEventListener('toggle', done);
  if (!reduce && box.animate)
    sum.addEventListener('click', function (e) {
      e.preventDefault();
      var closing = d.open && !d.classList.contains('closing');
      var from = d.open ? box.getBoundingClientRect().height : 0;
      if (an) an.cancel();
      d.classList.toggle('closing', closing);
      d.open = true;
      var to = closing ? 0 : box.scrollHeight;
      an = box.animate(
        { height: [from + 'px', to + 'px'] },
        { duration: closing ? 340 : 560, easing: 'cubic-bezier(.22,1.12,.36,1)' },
      );
      an.onfinish = function () {
        an = null;
        if (closing) {
          d.open = false;
          d.classList.remove('closing');
        }
        done();
      };
    });
  addEventListener('beforeprint', function () {
    d.open = true;
  });
});

/* Before and after. The range input does the work, so arrows, Home, End and both ends all come free. */
var baIO =
  !reduce && 'IntersectionObserver' in window
    ? new IntersectionObserver(
        function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting) {
              baIO.unobserve(e.target);
              e.target.__nudge();
            }
          });
        },
        { threshold: 0.55 },
      )
    : null;
$$('[data-ba]').forEach(function (fig) {
  var f = fig.querySelector('.ba-f'),
    input = fig.querySelector('input'),
    touched = false;
  var say = function (v) {
    input.setAttribute(
      'aria-valuetext',
      v === 0
        ? 'All of the new site'
        : v === 100
          ? 'All of the old site'
          : v + ' percent of the old site showing',
    );
  };
  var set = function (v) {
    f.style.setProperty('--v', v);
  };
  input.addEventListener('input', function () {
    touched = true;
    var v = +input.value;
    set(v);
    say(v);
  });
  set(+input.value);
  say(+input.value);
  if (baIO) {
    fig.__nudge = function () {
      if (touched) return;
      /* It swings in from the right with some weight, so you can tell it moves. */
      var s = ui.spring(70, 9, 74),
        t = performance.now();
      (function go(n) {
        if (touched) return;
        var more = s.step(50, Math.min(0.033, (n - t) / 1000));
        t = n;
        set(s.x.toFixed(2));
        if (more) requestAnimationFrame(go);
        else set(50);
      })(t);
    };
    baIO.observe(fig);
  }
});

/* The Stone Steps course: same reading of the same trace as the live study. */
$$('[data-course]').forEach(function (fig) {
  var read = function (d) {
    var out = [],
      x = 0,
      y = 0;
    d.slice(1)
      .split('l')
      .forEach(function (part) {
        var a = part.trim().split(/\s+/).map(Number);
        x += a[0];
        y += a[1];
        out.push([x, y]);
      });
    return out;
  };
  var plan = read(fig.querySelector('[data-plan]').getAttribute('d'));
  var prof = read(fig.querySelector('[data-prof-path]').getAttribute('d'));
  var total = +fig.dataset.total,
    low = +fig.dataset.low,
    high = +fig.dataset.high;
  var dims = fig.dataset.prof.split(' ').map(Number),
    W = dims[0],
    H2 = dims[1],
    TOP = dims[2],
    BOT = dims[3];
  var starts = fig.dataset.starts.split(' ').map(Number),
    grades = fig.dataset.grades.split(' ').map(Number);
  var range = fig.querySelector('[data-range]'),
    out = fig.querySelector('[data-readout]');
  var dot = fig.querySelector('[data-plan-dot]'),
    cur = fig.querySelector('[data-cursor]'),
    pdot = fig.querySelector('[data-prof-dot]'),
    box = fig.querySelector('[data-profile]');
  var pts = prof.map(function (p, i) {
    return {
      px: plan[i][0],
      py: plan[i][1],
      x: p[0],
      y: p[1],
      mile: (p[0] / W) * total,
      ft: Math.round(low + (1 - (p[1] - TOP) / (H2 - TOP - BOT)) * (high - low)),
      g: grades[i],
      loop: starts.filter(function (s) {
        return s <= i;
      }).length,
    };
  });
  var near = function (mile) {
    var lo = 0,
      hi = pts.length - 1;
    while (hi - lo > 1) {
      var m = (lo + hi) >> 1;
      if (pts[m].mile < mile) lo = m;
      else hi = m;
    }
    return Math.abs(pts[lo].mile - mile) <= Math.abs(pts[hi].mile - mile) ? pts[lo] : pts[hi];
  };
  var show = function (mile) {
    var p = near(mile),
      ft = p.ft.toLocaleString('en-US'),
      a = Math.abs(p.g).toFixed(0);
    dot.setAttribute('cx', p.px);
    dot.setAttribute('cy', p.py);
    cur.setAttribute('x1', p.x);
    cur.setAttribute('x2', p.x);
    pdot.style.left = (p.x / W) * 100 + '%';
    pdot.style.top = (p.y / H2) * 100 + '%';
    var flat = Math.abs(p.g) < 0.5;
    /* The steepness in words first, the percentage after it: "gently downhill (−2%)". */
    var how = Math.abs(p.g) < 4 ? 'gently ' : Math.abs(p.g) < 10 ? '' : 'steeply ';
    out.textContent =
      'Mile ' +
      mile.toFixed(1) +
      ', loop ' +
      p.loop +
      ' of ' +
      starts.length +
      ', ' +
      ft +
      ' feet above sea level, ' +
      (flat ? 'level' : how + (p.g > 0 ? 'uphill (+' : 'downhill (−') + a + '%)');
    range.setAttribute(
      'aria-valuetext',
      'Mile ' +
        mile.toFixed(1) +
        ', loop ' +
        p.loop +
        ' of ' +
        starts.length +
        ', ' +
        ft +
        ' feet, ' +
        (flat ? 'level' : a + ' percent ' + (p.g > 0 ? 'climb' : 'descent')),
    );
  };
  range.addEventListener('input', function () {
    show(+range.value);
  });
  var fromPointer = function (e) {
    var b = box.getBoundingClientRect(),
      t = clamp((e.clientX - b.left) / b.width, 0, 1);
    range.value = Math.min(Math.round(t * total * 10) / 10, +range.max);
    show(+range.value);
  };
  box.addEventListener('pointerdown', function (e) {
    box.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  box.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse' || e.buttons) fromPointer(e);
  });
  fig.querySelector('[data-scrub]').hidden = false;
  show(0);
});

/* Interaction clips play once when they reach you, with a button to see them again. Never on a loop. */
$$('[data-clip]').forEach(function (fig) {
  var v = fig.querySelector('video'),
    btn = fig.querySelector('[data-clip-btn]');
  btn.hidden = false;
  var go = function () {
    v.currentTime = 0;
    var q = v.play();
    if (q && q.catch) q.catch(function () {});
  };
  btn.addEventListener('click', function () {
    if (v.paused) go();
    else v.pause();
  });
  v.addEventListener('play', function () {
    btn.textContent = 'Pause';
  });
  v.addEventListener('pause', function () {
    btn.textContent = 'Play it again';
  });
  v.addEventListener('ended', function () {
    btn.textContent = 'Play it again';
  });
  if (!reduce && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      function (es, o) {
        es.forEach(function (e) {
          if (e.isIntersecting) {
            o.disconnect();
            go();
          }
        });
      },
      { threshold: 0.6 },
    ).observe(v);
  }
});

/* Zoom: a native dialog, so focus and Escape come free. */
var lb = doc.createElement('dialog');
lb.className = 'lb';
lb.setAttribute('aria-label', 'Larger view');
lb.innerHTML = '<button type="button">Close</button><img alt="">';
doc.body.appendChild(lb);
var lbImg = lb.querySelector('img');
lb.querySelector('button').addEventListener('click', function () {
  lb.close();
});
lb.addEventListener('click', function (e) {
  if (e.target === lb || e.target === lbImg) lb.close();
});
$$('[data-zoom]').forEach(function (b) {
  var img = b.querySelector('img');
  b.setAttribute('aria-haspopup', 'dialog');
  b.addEventListener('click', function () {
    lbImg.src = b.dataset.full;
    lbImg.alt = img.alt;
    lb.showModal();
    lb.scrollTop = 0;
  });
});
