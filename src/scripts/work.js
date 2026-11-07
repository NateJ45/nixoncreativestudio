/* Work: the windows are dealt onto the table one by one, and re-dealt when you pick a sector.
   Every window keeps its live offset and velocity, so a second click mid-flight just bends the throw. */
import { ui } from './kit.js';
var reduce = ui.reduce,
  doc = document;
var $ = function (a, r) {
  return (r || doc).querySelector(a);
};
var $$ = function (a, r) {
  return [].slice.call((r || doc).querySelectorAll(a));
};
var clamp = function (v, a, b) {
  return Math.max(a, Math.min(b, v));
};

var grid = $('[data-grid]'),
  bar = $('[data-bar]'),
  statusEl = $('[data-status]'),
  more = $('[data-more]');
var buttons = $$('button', $('[data-filters]')),
  viewButtons = $$('button', $('[data-views]')),
  rowList = $('[data-rows]'),
  rows = $$('li', rowList),
  section = $('[data-section]');

ui.wireFootage(grid);

var items = $$('li', grid).map(function (li, i) {
  return {
    li: li,
    i: i,
    key: li.dataset.key,
    state: 'in',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: 0,
    vr: 0,
    s: 1,
    vs: 0,
    o: 1,
    at: 0,
    lx: 0,
    ly: 0,
    fx: 0,
    fy: 0,
  };
});

var current = 'all',
  view = 'grid';
var matches = function (it, key) {
  return key === 'all' || it.key === key;
};

/* Where the hand is: just under the fold, in the middle of the table. */
function hand() {
  var g = grid.getBoundingClientRect(),
    up = items.filter(function (it) {
      return !it.li.hidden;
    })[0],
    w = up ? up.li.offsetWidth : 0;
  return { x: g.width / 2 - w / 2, y: innerHeight + 30 - g.top };
}
function measure(it) {
  it.lx = it.li.offsetLeft;
  it.ly = it.li.offsetTop;
}

/* The spring. */
var raf = 0,
  last = 0;
function wake() {
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}
function paint(it) {
  it.li.style.transform =
    'translate3d(' +
    it.x.toFixed(2) +
    'px,' +
    it.y.toFixed(2) +
    'px,0) rotate(' +
    it.r.toFixed(3) +
    'deg) scale(' +
    it.s.toFixed(4) +
    ')';
  it.li.style.opacity = it.o === 1 ? '' : it.o.toFixed(3);
}
function land(it) {
  it.x = it.y = it.vx = it.vy = it.r = it.vr = it.vs = 0;
  it.s = 1;
  it.o = 1;
  it.state = 'in';
  it.li.style.transform = '';
  it.li.style.opacity = '';
  it.li.classList.remove('fly');
}
function retire(it) {
  it.state = 'out';
  var l = it.li;
  l.hidden = true;
  l.inert = false;
  l.classList.remove('fly', 'gone');
  l.style.position =
    l.style.left =
    l.style.top =
    l.style.width =
    l.style.transform =
    l.style.opacity =
      '';
  it.x = it.y = it.vx = it.vy = it.r = it.vr = it.vs = 0;
  it.s = 1;
  it.o = 1;
}
function frame(now) {
  raf = 0;
  var dt = Math.min(0.033, (now - last) / 1000 || 0.016),
    live = false;
  last = now;
  items.forEach(function (it) {
    if (it.state === 'fly' || it.state === 'leave') {
      live = true;
      if (now < it.at) return;
      var leaving = it.state === 'leave';
      var k = leaving ? 62 : 150,
        c = leaving ? 11 : 15.5;
      var tx = leaving ? it.fx : 0,
        ty = leaving ? it.fy : 0;
      it.vx += (k * (tx - it.x) - c * it.vx) * dt;
      it.x += it.vx * dt;
      it.vy += (k * (ty - it.y) - c * it.vy) * dt;
      it.y += it.vy * dt;
      /* It leans into the throw, then lies flat when it lands. */
      var speed = Math.sqrt(it.vx * it.vx + it.vy * it.vy);
      var lean = clamp(it.vx * 0.011 + it.vy * 0.0022 * (it.i % 2 ? 1 : -1), -10, 10);
      it.vr += (170 * (lean - it.r) - 17 * it.vr) * dt;
      it.r += it.vr * dt;
      var sT = leaving ? 0.84 : 1 + Math.min(0.045, speed / 26000);
      it.vs += (200 * (sT - it.s) - 22 * it.vs) * dt;
      it.s += it.vs * dt;
      if (leaving) {
        var age = (now - it.at) / 480;
        it.o = clamp(1 - age * age, 0, 1);
        if (age >= 1) {
          retire(it);
          return;
        }
      } else if (
        Math.abs(it.x) < 0.3 &&
        Math.abs(it.y) < 0.3 &&
        Math.abs(it.vx) < 4 &&
        Math.abs(it.vy) < 4 &&
        Math.abs(it.r) < 0.03 &&
        Math.abs(it.s - 1) < 0.0015
      ) {
        land(it);
        return;
      }
      paint(it);
    }
  });
  if (live) raf = requestAnimationFrame(frame);
}

/* The first deal: only what you can see, one at a time; the rest as you scroll to them. */
var nextSlot = 0;
function deal(it) {
  if (it.state !== 'wait') return;
  /* Back or a reload, already scrolled: the table is simply laid, nothing is thrown again. */
  if (ui.restored()) {
    it.li.classList.remove('wait');
    land(it);
    return;
  }
  var now = performance.now(),
    h = hand();
  nextSlot = Math.max(now + 40, nextSlot + 92);
  it.li.classList.remove('wait');
  it.li.classList.add('fly');
  measure(it);
  it.x = h.x - it.lx;
  it.y = h.y - it.ly;
  it.r = (it.lx + 10 < h.x ? -1 : 1) * 12;
  it.vr = 0;
  it.s = 0.94;
  it.vs = 0;
  it.vx = it.vy = 0;
  it.o = 1;
  it.at = nextSlot;
  it.state = 'fly';
  paint(it);
  wake();
}
var io = null;
if (!reduce && 'IntersectionObserver' in window) {
  io = new IntersectionObserver(
    function (es) {
      es.filter(function (e) {
        return e.isIntersecting;
      })
        .sort(function (a, b) {
          return a.target._it.i - b.target._it.i;
        })
        .forEach(function (e) {
          io.unobserve(e.target);
          deal(e.target._it);
        });
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.08 },
  );
}

/* The filter. */
function setPill() {
  $$('.dw-seg', bar).forEach(function (seg) {
    var on = $('button[aria-pressed=true]', seg),
      pill = $('[data-pill]', seg);
    pill.style.width = on.offsetWidth + 'px';
    pill.style.height = on.offsetHeight + 'px';
    pill.style.transform = 'translate(' + on.offsetLeft + 'px,' + on.offsetTop + 'px)';
  });
}
function syncUrl() {
  var q = new URLSearchParams();
  if (current !== 'all') q.set('sector', current);
  if (view === 'list') q.set('view', 'list');
  var s = q.toString();
  try {
    history.replaceState(null, '', s ? '?' + s : location.pathname);
  } catch (e) {}
}
function words(key, n) {
  if (key === 'all') return 'Showing all ' + n + ' sites.';
  var phrase = key === 'small-business' ? 'small business' : key;
  return 'Showing ' + n + ' ' + phrase + (n === 1 ? ' site.' : ' sites.');
}
function setWide(count) {
  items.forEach(function (it) {
    if (matches(it, current)) {
      it.li.classList.toggle('few', count <= 2);
      it.li.classList.toggle('solo', count === 1);
    }
  });
}

/* No throw: put a window straight where it belongs, for when the table isn't on show. */
function settle(it, on) {
  var l = it.li;
  if (io) io.unobserve(l);
  l.classList.remove('wait', 'gone');
  l.inert = false;
  l.style.position = l.style.left = l.style.top = l.style.width = '';
  if (on) {
    l.hidden = false;
    land(it);
  } else retire(it);
}
function resetTable() {
  clearTimeout(grid._t);
  grid.classList.remove('sizing');
  grid.style.height = '';
}
function backToTable(el) {
  scrollTo({
    top: el.getBoundingClientRect().top + scrollY - bar.offsetHeight - 28,
    behavior: reduce ? 'auto' : 'smooth',
  });
}
var bounce = 'cubic-bezier(.3,1.35,.5,1)';
function riseIn(r, delay) {
  r.animate(
    [
      { opacity: 0, transform: 'translateY(22px)' },
      { opacity: 1, transform: 'none' },
    ],
    { duration: 620, delay: delay, easing: bounce, fill: 'backwards' },
  );
}
function visibleRows() {
  return rows.filter(function (r) {
    return !r.hidden;
  });
}

/* In the list, a filter moves the rows that stay and raises the ones that arrive. */
function moveRows(change) {
  if (reduce || view !== 'list') {
    change();
    return;
  }
  var was = new Map(),
    h0 = rowList.offsetHeight;
  visibleRows().forEach(function (r) {
    was.set(r, r.getBoundingClientRect().top);
  });
  rows.forEach(function (r) {
    r.getAnimations().forEach(function (a) {
      a.cancel();
    });
  });
  change();
  var h1 = rowList.offsetHeight,
    n = 0;
  visibleRows().forEach(function (r) {
    if (was.has(r))
      r.animate(
        [
          { transform: 'translateY(' + (was.get(r) - r.getBoundingClientRect().top) + 'px)' },
          { transform: 'none' },
        ],
        { duration: 600, easing: bounce },
      );
    else riseIn(r, 60 + 38 * n++);
  });
  rowList.style.overflow = 'hidden';
  rowList.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], {
    duration: 520,
    easing: 'cubic-bezier(.2,.8,.2,1)',
  }).onfinish = function () {
    rowList.style.overflow = '';
  };
}

function choose(key, first) {
  current = key;
  buttons.forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.f === key ? 'true' : 'false');
  });
  var shown = items.filter(function (it) {
    return matches(it, key);
  });
  var wasStuck = section.getBoundingClientRect().top < 0;
  moveRows(function () {
    rows.forEach(function (r) {
      r.hidden = !(key === 'all' || r.dataset.key === key);
    });
  });
  more.hidden = key !== 'church';
  statusEl.textContent = words(key, shown.length);
  if (!first) syncUrl();
  setPill();

  if (reduce || first) {
    items.forEach(function (it) {
      var on = matches(it, key);
      it.li.hidden = !on;
      if (first && on && !reduce && view === 'grid')
        ((it.state = 'wait'), it.li.classList.add('wait'));
      else if (first && !on) it.state = 'out';
    });
    setWide(shown.length);
    return;
  }
  if (view === 'list') {
    items.forEach(function (it) {
      settle(it, matches(it, key));
    });
    setWide(shown.length);
    if (wasStuck) backToTable(rowList);
    return;
  }

  /* Remember where everything is on screen, change the layout, then carry each window across the gap. */
  var oldH = grid.offsetHeight,
    now = performance.now();
  items.forEach(function (it) {
    if (it.state === 'in' || it.state === 'fly') {
      measure(it);
      it.px = it.lx + it.x;
      it.py = it.ly + it.y;
    } else if (it.state === 'leave') {
      it.px = it.lx + it.x;
      it.py = it.ly + it.y;
    }
  });
  var h0 = hand();
  items.forEach(function (it) {
    var on = matches(it, key),
      li = it.li;
    if (on) {
      li.hidden = false;
      li.inert = false;
      li.classList.remove('wait', 'gone');
      li.style.position = li.style.left = li.style.top = li.style.width = '';
    } else if (it.state === 'in' || it.state === 'fly' || it.state === 'leave') {
      li.classList.add('fly', 'gone');
      li.inert = true;
      li.style.position = 'absolute';
      li.style.left = it.lx + 'px';
      li.style.top = it.ly + 'px';
      li.style.width = li.offsetWidth + 'px';
      if (it.state !== 'leave') {
        it.state = 'leave';
        it.at = now;
      }
      it.fx = h0.x - it.lx;
      it.fy = h0.y - it.ly;
      paint(it);
    } else {
      li.hidden = true;
      it.state = 'out';
    }
  });
  setWide(shown.length);
  grid.classList.remove('sizing');
  grid.style.height = '';
  var newH = grid.offsetHeight;
  var slot = 0,
    h1 = hand();
  shown.forEach(function (it, n) {
    measure(it);
    var inPlay =
      it.px !== undefined && (it.state === 'in' || it.state === 'fly' || it.state === 'leave');
    if (inPlay) {
      it.x = it.px - it.lx;
      it.y = it.py - it.ly;
      it.at = now + slot;
      slot += 36;
    } else {
      it.x = h1.x - it.lx;
      it.y = h1.y - it.ly;
      it.r = (it.lx + 10 < h1.x ? -1 : 1) * 11;
      it.vr = 0;
      it.s = 0.94;
      it.vs = 0;
      it.vx = it.vy = 0;
      it.o = 1;
      it.at = now + 110 + slot;
      slot += 62;
    }
    it.o = 1;
    it.state = 'fly';
    it.li.classList.add('fly');
    if (io) io.unobserve(it.li);
    paint(it);
  });
  items.forEach(function (it) {
    it.px = it.py = undefined;
  });
  grid.style.height = oldH + 'px';
  void grid.offsetHeight;
  grid.classList.add('sizing');
  grid.style.height = newH + 'px';
  clearTimeout(grid._t);
  grid._t = setTimeout(function () {
    grid.classList.remove('sizing');
    grid.style.height = '';
  }, 800);
  wake();
  /* If the bar was stuck over the lower rows, come back up to the top of the table. */
  if (wasStuck) backToTable(grid);
}

/* The view switch. Back to the grid means a fresh deal from the hand; on to the list, the rows rise in. */
function markView() {
  section.dataset.view = view;
  viewButtons.forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.v === view ? 'true' : 'false');
  });
}
function setView(v) {
  var wasStuck = section.getBoundingClientRect().top < 0;
  view = v;
  markView();
  syncUrl();
  setPill();
  resetTable();
  var shown = items.filter(function (it) {
    return matches(it, current);
  });
  items.forEach(function (it) {
    settle(it, matches(it, current));
  });
  if (!reduce) {
    if (v === 'list') {
      visibleRows().forEach(function (r, n) {
        riseIn(r, 38 * n);
      });
    } else {
      var h = hand(),
        slot = 0,
        now = performance.now();
      shown.forEach(function (it) {
        measure(it);
        it.x = h.x - it.lx;
        it.y = h.y - it.ly;
        it.r = (it.lx + 10 < h.x ? -1 : 1) * 11;
        it.vr = 0;
        it.s = 0.94;
        it.vs = 0;
        it.vx = it.vy = 0;
        it.o = 1;
        it.at = now + 60 + slot;
        slot += 62;
        it.state = 'fly';
        it.li.classList.add('fly');
        paint(it);
      });
      wake();
    }
  }
  if (wasStuck) backToTable(v === 'list' ? rowList : grid);
}

viewButtons.forEach(function (b) {
  b.addEventListener('click', function () {
    if (b.dataset.v !== view) setView(b.dataset.v);
  });
});

buttons.forEach(function (b) {
  b.addEventListener('click', function () {
    if (b.dataset.f !== current) choose(b.dataset.f);
  });
});

/* Linking to a sector or the list works: /work/?sector=church&view=list */
var params = new URLSearchParams(location.search),
  want = params.get('sector');
if (params.get('view') === 'list') {
  view = 'list';
  markView();
}
if (
  !buttons.some(function (b) {
    return b.dataset.f === want;
  })
)
  want = 'all';
var pills = $$('[data-pill]', bar);
pills.forEach(function (p) {
  p.style.transition = 'none';
});
choose(want, true);
requestAnimationFrame(function () {
  requestAnimationFrame(function () {
    pills.forEach(function (p) {
      p.style.transition = '';
    });
  });
});

items.forEach(function (it) {
  it.li._it = it;
});
if (io) {
  nextSlot = performance.now() + 260;
  items.forEach(function (it) {
    if (it.state === 'wait') io.observe(it.li);
  });
} else
  items.forEach(function (it) {
    if (it.state === 'wait') deal(it);
  });

addEventListener('resize', function () {
  setPill();
  items.forEach(function (it) {
    if (it.state === 'fly') land(it);
    else if (it.state === 'leave') retire(it);
  });
});
if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(setPill);
addEventListener('load', setPill);
