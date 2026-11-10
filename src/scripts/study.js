/* The signature: a phone beside the story that scrolls through the real site as you read. */
import { ui } from './kit.js';
import './hero-morph.js';
import { pairSpec, pxWords, ratioWords } from '../lib/study-spec';
var reduce = ui.reduce,
  doc = document;
var $$ = function (a, r) {
  return [].slice.call((r || doc).querySelectorAll(a));
};
var clamp = function (v, a, b) {
  return Math.min(b, Math.max(a, v));
};

/* The sizing frame: a dashed frame with corner handles sits round one of the hero's two windows and
   prints the pixel size of the still inside it (the sizes are in the markup, from the files). The
   Desktop and Phone buttons move it, and it resizes from one window to the other on the kit's
   spring while the measured phone steps forward a little. Both windows are real captures, so
   nothing is ever reflowed to fake a width in between, and the number is swapped, never counted.
   It only appears once the fan has landed (start), so it never fights the throw or a window
   growing in from the last page. Under reduced motion it is simply in place and jumps. */
var sizer = (function () {
  var box = doc.querySelector('[data-size]'),
    fan = doc.querySelector('.s-fan');
  if (!box || !fan) return { start: function () {} };
  var btns = $$('button', box),
    out = box.querySelector('[data-size-out]'),
    panes = { home: fan.querySelector('.p-home'), phone: fan.querySelector('.p-phone') },
    frame = doc.createElement('span'),
    px = doc.createElement('b'),
    which = 'home',
    started = false,
    sp = null,
    raf = 0,
    last = 0,
    PAD = 7,
    GROW = 1.06;
  frame.className = 's-frame';
  frame.setAttribute('aria-hidden', 'true');
  frame.innerHTML = '<i></i><i></i><i></i><i></i>';
  px.className = 's-frame-px';
  frame.appendChild(px);
  function target() {
    var p = panes[which],
      k = which === 'phone' ? GROW : 1,
      w = p.offsetWidth,
      h = p.offsetHeight;
    return [
      p.offsetLeft + w / 2,
      p.offsetTop + h / 2,
      w * k + PAD * 2,
      h * k + PAD * 2,
      parseFloat(getComputedStyle(p).getPropertyValue('--r')) || 0,
    ];
  }
  function put() {
    var v = sp.map(function (s) {
      return s.x;
    });
    frame.style.left = (v[0] - v[2] / 2).toFixed(1) + 'px';
    frame.style.top = (v[1] - v[3] / 2).toFixed(1) + 'px';
    frame.style.width = Math.max(0, v[2]).toFixed(1) + 'px';
    frame.style.height = Math.max(0, v[3]).toFixed(1) + 'px';
    frame.style.rotate = v[4].toFixed(2) + 'deg';
  }
  function snap() {
    if (!started) return;
    cancelAnimationFrame(raf);
    raf = 0;
    sp = target().map(function (v) {
      return ui.spring(190, 21, v);
    });
    put();
  }
  function go(now) {
    var dt = Math.min(0.033, (now - last) / 1000 || 0.016),
      to = target(),
      live = false;
    last = now;
    sp.forEach(function (s, i) {
      if (s.step(to[i], dt) && (Math.abs(to[i] - s.x) > 0.2 || Math.abs(s.v) > 2)) live = true;
    });
    if (live) {
      put();
      raf = requestAnimationFrame(go);
    } else snap();
  }
  function pick(name) {
    if (name === which) return;
    which = name;
    fan.classList.toggle('size-phone', name === 'phone');
    btns.forEach(function (b) {
      var on = b.dataset.sizeFor === name;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (!on) return;
      px.textContent = b.dataset.sizePx;
      out.textContent = b.textContent.trim() + ' still: ' + b.dataset.sizePx + ' pixels';
    });
    if (!started) return;
    if (reduce) return snap();
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(go);
    }
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      pick(b.dataset.sizeFor);
    });
  });
  px.textContent = btns[0].dataset.sizePx;
  return {
    start: function () {
      if (started) return;
      started = true;
      fan.appendChild(frame);
      snap();
      if ('ResizeObserver' in window)
        new ResizeObserver(function () {
          if (!raf) snap();
        }).observe(fan);
    },
  };
})();

/* The entry: the two windows get thrown onto the page and land on the kit's spring. The phone arrives second and knocks the desktop window as it lands.
   When a window from the last page is growing into this one (hero-morph.js), the desktop pane is already
   where the morph lands, so only the phone is thrown, and it does not knock. */
(function () {
  var home = doc.querySelector('.s-fan .p-home'),
    ph = doc.querySelector('.s-fan .p-phone');
  if (reduce || !home || !ph) {
    sizer.start();
    return;
  }
  var morph = doc.documentElement.classList.contains('hero-morph');
  if (!morph) {
    try {
      morph = sessionStorage.getItem('ncs-hero') === location.pathname;
    } catch (e) {}
  }
  if (morph) {
    doc.documentElement.classList.add('hero-morph');
    home.style.visibility = 'visible';
  }
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
  var bodies = morph ? [pb] : [hb, pb];
  if (scrollY > 200) {
    bodies.forEach(clear);
    sizer.start();
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
    if (!knocked && !morph && pb.flying && Math.abs(pb.x.x) < 34) {
      knocked = true;
      hb.x.v -= W * 0.1;
      hb.y.v += H * 0.05;
      hb.r.v -= 9;
    }
    if (live) requestAnimationFrame(go);
    else {
      bodies.forEach(clear);
      sizer.start();
    }
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
  /* A tap or click anywhere on the picture moves the line there, so nobody has to drag (WCAG 2.5.7).
     Desktop browsers already jump a range to a click on its track; iOS Safari does not, so this makes
     the tap work everywhere. A real drag ends in a click too, at the spot it let go, so it agrees. */
  input.addEventListener('click', function (e) {
    var b = f.getBoundingClientRect();
    if (!b.width || !e.clientX) return;
    var v = Math.round(Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)) * 100);
    if (v === +input.value) return;
    input.value = v;
    input.dispatchEvent(new Event('input', { bubbles: true }));
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

/* The walk grows as it arrives: the window of the real homepage starts a little small and scales up
   to its full size as you scroll it to the middle of the screen, and back if you scroll away. It is
   tied to the scroll position, transform only, so nothing runs when the page is still. Under
   reduced motion it is simply full size. */
(function () {
  var wins = $$('.walk .win, .walk .walk-ph');
  if (reduce || !wins.length) return;
  var FROM = 0.86,
    tick = 0;
  function size() {
    tick = 0;
    var vh = innerHeight;
    wins.forEach(function (el) {
      var h = el.offsetHeight;
      if (!h) return;
      /* The middle of the box does not move when it scales, so read the unscaled top from it. */
      var r = el.getBoundingClientRect(),
        top = (r.top + r.bottom) / 2 - h / 2,
        p = clamp((vh - top) / (vh / 2 + h / 2), 0, 1),
        e = 1 - Math.pow(1 - p, 3);
      el.style.scale = e >= 1 ? '' : (FROM + (1 - FROM) * e).toFixed(4);
    });
  }
  function ask() {
    if (!tick) tick = requestAnimationFrame(size);
  }
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  size();
})();

/* The two switches at the top of Decisions.

   Show the grid lays this page's own columns over the story: the margin, the story, the gap and the
   phone beside it, each band labelled with the width the browser gives it right now. The bands
   grow down from the top one after another. It is this page's structure, read off the page, not a
   guess at the client's.

   Show the measurements draws, on every decision card, what that card is really set in: the
   heading's size and weight, the card's padding, and the "What I did" label's colour on the card
   with its contrast ratio (the same maths as the palette test, src/lib/study-spec.ts). A pointer
   over one card shows just that card's, and a tap on a card pins it. A value that cannot be read
   is left out. Under reduced motion both simply appear. */
(function () {
  var bar = doc.querySelector('[data-insp]');
  if (!bar || !story) return;
  var gridBtn = bar.querySelector('[data-insp-grid]'),
    specBtn = bar.querySelector('[data-insp-spec]'),
    say = bar.querySelector('[data-insp-out]'),
    chaps = story.querySelector('.chaps'),
    rail = story.querySelector('.rail'),
    decs = $$('.dec', story),
    grid = null;
  bar.hidden = false;
  if (!decs.length) specBtn.hidden = true;

  function bands() {
    var s = story.getBoundingClientRect(),
      c = chaps.getBoundingClientRect(),
      r = rail && rail.getBoundingClientRect(),
      out = [['Margin', s.left, c.left, false]];
    out.push(['Story', c.left, c.right, true]);
    if (r && r.width > 1) {
      out.push(['Gap', c.right, r.left, false]);
      out.push(['Phone', r.left, r.right, true]);
      out.push(['Margin', r.right, s.right, false]);
    } else out.push(['Margin', c.right, s.right, false]);
    return out
      .map(function (b) {
        return { name: b[0], x: b[1] - s.left, w: Math.round(b[2] - b[1]), col: b[3] };
      })
      .filter(function (b) {
        return b.w > 0;
      });
  }
  function drawGrid() {
    var list = bands();
    grid.textContent = '';
    list.forEach(function (b, n) {
      var i = doc.createElement('i'),
        label = doc.createElement('b');
      i.style.left = b.x.toFixed(1) + 'px';
      i.style.width = b.w + 'px';
      i.style.setProperty('--n', n);
      if (b.col) i.className = 'col';
      if (b.w < 96) i.classList.add('thin');
      label.textContent = b.name + ' ' + b.w + 'px';
      i.appendChild(label);
      grid.appendChild(i);
    });
    return list;
  }
  gridBtn.addEventListener('click', function () {
    var on = gridBtn.getAttribute('aria-pressed') !== 'true';
    gridBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (!grid) {
      grid = doc.createElement('div');
      grid.className = 's-grid';
      grid.setAttribute('aria-hidden', 'true');
      story.appendChild(grid);
      if ('ResizeObserver' in window)
        new ResizeObserver(function () {
          if (grid.classList.contains('on')) drawGrid();
        }).observe(story);
    }
    if (!on) {
      grid.classList.remove('on');
      say.textContent = 'The grid is off.';
      return;
    }
    var list = drawGrid();
    /* One frame at rest first, so the bands grow instead of just appearing. */
    void grid.offsetWidth;
    grid.classList.add('on');
    say.textContent =
      'The grid is on. Left to right: ' +
      list
        .map(function (b) {
          return b.name.toLowerCase() + ' ' + b.w + ' pixels';
        })
        .join(', ') +
      '.';
  });

  /* One card's measurements, built the first time they are asked for and re-read each time after. */
  function measure(card) {
    var h = card.querySelector('h3'),
      dt = card.querySelector('.dec-did dt'),
      cs = getComputedStyle(card),
      hs = h && getComputedStyle(h),
      spec = card.querySelector('.spec'),
      words = [];
    if (!spec) {
      spec = doc.createElement('span');
      spec.className = 'spec';
      spec.setAttribute('aria-hidden', 'true');
      card.appendChild(spec);
    }
    spec.textContent = '';
    var box = function (el, cls) {
      var i = doc.createElement('i');
      i.className = cls;
      i.style.left = el.left + 'px';
      i.style.top = el.top + 'px';
      i.style.width = el.width + 'px';
      i.style.height = el.height + 'px';
      spec.appendChild(i);
    };
    var pill = function (text, into) {
      var b = doc.createElement('b');
      b.textContent = text;
      (into || spec).appendChild(b);
      return b;
    };
    var strip = doc.createElement('span');
    strip.className = 'spec-strip';

    var size = hs && pxWords(hs.fontSize);
    if (size) {
      box(
        {
          left: h.offsetLeft - 4,
          top: h.offsetTop - 3,
          width: h.offsetWidth + 8,
          height: h.offsetHeight + 6,
        },
        'spec-h',
      );
      pill('Heading ' + size + ' / ' + hs.fontWeight).className = 'spec-top';
      words.push('heading ' + size + ' at weight ' + hs.fontWeight);
    }
    var pair = dt && pairSpec(getComputedStyle(dt).color, cs.backgroundColor);
    if (pair) {
      var range = doc.createRange(),
        cr = card.getBoundingClientRect();
      range.selectNodeContents(dt);
      var tr = range.getBoundingClientRect();
      box(
        {
          left: tr.left - cr.left - 4,
          top: tr.top - cr.top - 2,
          width: tr.width + 8,
          height: tr.height + 4,
        },
        'spec-l',
      );
      var b = pill('', strip);
      [pair.fg, pair.bg].forEach(function (hex, n) {
        var u = doc.createElement('u');
        u.style.background = hex;
        b.appendChild(u);
        b.appendChild(doc.createTextNode(hex.toUpperCase() + (n ? '' : ' on')));
      });
      b.appendChild(doc.createTextNode(' ' + ratioWords(pair.ratio) + (pair.aa ? ' AA' : '')));
      words.push(
        'label ' +
          pair.fg +
          ' on ' +
          pair.bg +
          ', contrast ' +
          ratioWords(pair.ratio).replace(':', ' to ') +
          (pair.aa ? ', passes AA' : ''),
      );
    }
    var pad = pxWords(cs.paddingLeft);
    if (pad) {
      var top = parseFloat(cs.paddingTop) || 0,
        bottom = parseFloat(cs.paddingBottom) || 0;
      box(
        {
          left: 0,
          top: top,
          width: parseFloat(cs.paddingLeft),
          height: Math.max(0, card.clientHeight - top - bottom),
        },
        'spec-pad',
      );
      pill('Padding ' + pad, strip);
      words.push('side padding ' + pad);
    }
    if (strip.firstChild) spec.appendChild(strip);
    return words;
  }
  var all = false;
  function show(card, on) {
    if (on) measure(card);
    /* Read once, so the lines start from rest and draw in. */
    if (on) void card.offsetWidth;
    card.classList.toggle('spec-on', on);
  }
  decs.forEach(function (card) {
    card.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'mouse' && !all && !card.dataset.pin) show(card, true);
    });
    card.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'mouse' && !all && !card.dataset.pin) show(card, false);
    });
    card.addEventListener('click', function (e) {
      if (all || e.target.closest('a, button') || !getSelection().isCollapsed) return;
      if (card.dataset.pin) delete card.dataset.pin;
      else card.dataset.pin = '1';
      show(card, !!card.dataset.pin);
    });
  });
  specBtn.addEventListener('click', function () {
    all = specBtn.getAttribute('aria-pressed') !== 'true';
    specBtn.setAttribute('aria-pressed', all ? 'true' : 'false');
    var words = [];
    decs.forEach(function (card) {
      delete card.dataset.pin;
      if (all) words = measure(card);
      show(card, all);
    });
    say.textContent = all
      ? words.length
        ? 'Measurements are on. Each decision card: ' + words.join('; ') + '.'
        : 'Measurements are on.'
      : 'Measurements are off.';
  });
  addEventListener('resize', function () {
    decs.forEach(function (card) {
      if (card.classList.contains('spec-on')) measure(card);
    });
  });
})();
