/* Prices: the three questions that deal a card, the tiers that lift, the folding rows. */
import { ui } from './kit.js';
var reduce = ui.reduce,
  doc = document;
var all = function (a, r) {
  return [].slice.call((r || doc).querySelectorAll(a));
};

/* "Start with X" carries the tier to the form, in the link and in the session. */
all('[data-tier]').forEach(function (a) {
  a.addEventListener('click', function () {
    try {
      sessionStorage.setItem('ncs-tier', a.dataset.tier);
    } catch (e) {}
  });
});

/* Three questions deal a card. The answer is the largest thing asked for, because one big need sets the scope. */
var pick = doc.querySelector('[data-pick]');
if (pick) {
  var names = ['size', 'who', 'tools'];
  var card = doc.querySelector('[data-pick-card]'),
    go = doc.querySelector('[data-pick-go]');
  var tiers = JSON.parse(pick.dataset.tiers);
  /* Radios can come back checked after a reload or Back, so the card is rebuilt from them, without the throw. */
  var dealCard = function (animate) {
    var vals = names.map(function (n) {
      var c = pick.querySelector('input[name="' + n + '"]:checked');
      return c ? +c.value : -1;
    });
    if (vals.indexOf(-1) !== -1) return;
    var i = Math.max.apply(null, vals),
      t = tiers[i];
    card.className = 'pc pick-card pc-' + ['paper', 'blue', 'ink'][i];
    all('[data-pick-pip]').forEach(function (p) {
      p.textContent = t.name.charAt(0);
    });
    doc.querySelector('[data-pick-name]').textContent = t.name;
    doc.querySelector('[data-pick-price]').textContent = t.from;
    doc.querySelector('[data-pick-who]').textContent = t.range;
    doc.querySelector('[data-pick-go-name]').textContent = t.name;
    go.href = '/contact/?tier=' + t.name.toLowerCase();
    go.dataset.tier = t.name;
    go.hidden = false;
    if (animate && !reduce) {
      card.classList.remove('dealing');
      void card.offsetWidth;
      card.classList.add('dealing');
    }
  };
  pick.addEventListener('change', function () {
    dealCard(true);
  });
  dealCard(false);
  addEventListener('pageshow', function () {
    dealCard(false);
  });
  go.addEventListener('click', function () {
    try {
      sessionStorage.setItem('ncs-tier', go.dataset.tier);
    } catch (e) {}
  });
}

/* One window per kind of client. Sector only, in its own block: no client is tied to a tier or a price. */
var sites = doc.querySelector('[data-sites]');
ui.wireFootage(sites);

/* The tiers. At rest all three sit open. Hover, focus or press one and it lifts on a spring while the others
   ease back and fold their lists away. Let go and all three settle open again. On a phone the stack stays open
   and the card you are reading comes forward as you scroll. With reduced motion none of this runs. */
var list = doc.querySelector('[data-tiers]');
var st = all('.tier', list).map(function (li, i) {
  return {
    li: li,
    i: i,
    card: li.querySelector('.t-card'),
    fold: li.querySelector('.t-list'),
    btn: li.querySelector('.t-inc-b'),
    l: ui.spring(240, 17, 0),
    f: ui.spring(170, 22, 1),
    a: ui.spring(110, 14, 0),
    side: 0,
  };
});
var dealt = performance.now();
var wideQ = matchMedia('(min-width:60rem)'),
  mode = '',
  hovered = null,
  focused = null,
  pinned = null,
  near = null,
  leaveT = 0;
var raf = 0,
  last = 0;
var active = function () {
  return hovered !== null ? hovered : focused !== null ? focused : pinned;
};

function wake() {
  if (!raf && mode) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}
function nearest() {
  var mid = innerHeight / 2,
    best = null,
    bd = 1e9;
  st.forEach(function (s) {
    var r = s.li.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    var d =
      r.top <= mid && r.bottom >= mid
        ? 0
        : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
    if (d < bd) {
      bd = d;
      best = s.i;
    }
  });
  return best;
}
function frame(now) {
  raf = 0;
  var dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;
  var wide = mode === 'wide',
    live = false,
    a = wide ? active() : (near = nearest());
  st.forEach(function (s) {
    var lT = a === null ? 0 : s.i === a ? 1 : -1,
      fT = wide && a !== null && s.i !== a ? 0 : 1;
    if (a !== null) s.side = s.i === a ? 0 : s.i > a ? 1 : -1;
    if (s.l.step(lT, dt)) live = true;
    else {
      s.l.x = lT;
      s.l.v = 0;
    }
    if (s.f.step(fT, dt)) live = true;
    else {
      s.f.x = fT;
      s.f.v = 0;
    }
    if (s.f.x < 0) {
      s.f.x = 0;
      s.f.v = 0;
    }
    var l = s.l.x,
      back = Math.max(0, -l),
      y,
      sc,
      x,
      r;
    if (wide) {
      /* On load the three cards deal out of one stack, then rest set slightly by hand. A card you reach for straightens. */
      var aT = now - dealt > 350 + (s.i === 1 ? 0 : 130) ? 1 : 0;
      if (s.a.step(aT, dt) || aT === 0) live = true;
      else {
        s.a.x = 1;
        s.a.v = 0;
      }
      var k = 1 - s.a.x,
        cw = s.card.offsetWidth,
        rest = (s.i - 1) * 0.7;
      y = (l > 0 ? -l * 16 : back * 10) + k * 90;
      sc = 1 + l * 0.026;
      x = s.side * back * 8 - (s.i - 1) * cw * k;
      r = s.side * back * 0.5 + rest * (1 - Math.max(0, l)) + (s.i - 1) * -4 * k;
    } else {
      y = 0;
      sc = 1 + Math.min(0, l) * 0.02 + Math.max(0, l) * 0.012;
      x = 0;
      r = 0;
    }
    s.card.style.transform =
      'translate3d(' +
      x.toFixed(2) +
      'px,' +
      y.toFixed(2) +
      'px,0) rotate(' +
      r.toFixed(3) +
      'deg) scale(' +
      sc.toFixed(4) +
      ')';
    s.card.style.setProperty('--l', wide ? l.toFixed(3) : 0);
    s.card.style.setProperty('--f', Math.min(1.03, s.f.x).toFixed(4));
    s.li.style.zIndex = s.i === a ? 3 : 1;
  });
  if (live) raf = requestAnimationFrame(frame);
}
function measure() {
  st.forEach(function (s) {
    s.card.style.setProperty('--lh', (mode === 'wide' ? s.fold.offsetHeight : 0) + 'px');
  });
}
function setMode() {
  var next = reduce ? '' : wideQ.matches ? 'wide' : 'stack';
  if (next !== mode) {
    mode = next;
    hovered = focused = pinned = null;
    list.classList.toggle('live', mode === 'wide');
    st.forEach(function (s) {
      s.btn.setAttribute('aria-pressed', 'false');
      if (mode !== 'wide') {
        s.f.x = 1;
        s.f.v = 0;
        s.card.style.setProperty('--f', 1);
      }
    });
  }
  measure();
  wake();
}
if (!reduce) {
  st.forEach(function (s) {
    s.li.addEventListener('pointerenter', function (e) {
      if (mode === 'wide' && e.pointerType === 'mouse') {
        clearTimeout(leaveT);
        hovered = s.i;
        wake();
      }
    });
    s.li.addEventListener('pointerleave', function (e) {
      if (mode === 'wide' && e.pointerType === 'mouse') {
        clearTimeout(leaveT);
        leaveT = setTimeout(function () {
          hovered = null;
          wake();
        }, 110);
      }
    });
    s.li.addEventListener('focusin', function (e) {
      if (mode === 'wide' && e.target.matches(':focus-visible')) {
        focused = s.i;
        wake();
      }
    });
    s.li.addEventListener('focusout', function (e) {
      if (!s.li.contains(e.relatedTarget) && focused === s.i) {
        focused = null;
        wake();
      }
    });
    s.btn.addEventListener('click', function () {
      pinned = pinned === s.i ? null : s.i;
      st.forEach(function (o) {
        o.btn.setAttribute('aria-pressed', o.i === pinned ? 'true' : 'false');
      });
      if (pinned === null && focused === s.i) focused = null;
      wake();
    });
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mode === 'wide' && (pinned !== null || focused !== null)) {
      pinned = focused = null;
      st.forEach(function (o) {
        o.btn.setAttribute('aria-pressed', 'false');
      });
      wake();
    }
  });
  addEventListener(
    'scroll',
    function () {
      if (mode === 'stack') wake();
    },
    { passive: true },
  );
  addEventListener('resize', setMode);
  addEventListener('load', measure);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(measure);
  setMode();
}

/* Native details and summary, with the height eased. Without this it simply opens. */
all('.faq details, .fold').forEach(function (d) {
  var sum = d.querySelector('summary'),
    box = d.querySelector('.faq-a, .fold-a'),
    an = null;
  if (reduce) return;
  sum.addEventListener('click', function (e) {
    e.preventDefault();
    var from = d.open ? box.getBoundingClientRect().height : 0,
      closing = d.open && !d.classList.contains('closing');
    if (an) {
      an.onfinish = null;
      an.cancel();
    }
    d.open = true;
    d.classList.toggle('closing', closing);
    box.style.overflow = 'hidden';
    var to = closing ? 0 : box.scrollHeight;
    an = box.animate(
      { height: [from + 'px', to + 'px'] },
      { duration: closing ? 340 : 520, easing: 'cubic-bezier(.22,1.12,.36,1)' },
    );
    if (!closing)
      box.firstElementChild.animate(
        { opacity: [0, 1], transform: ['translateY(.75rem)', 'none'] },
        { duration: 460, easing: 'cubic-bezier(.2,.8,.2,1)' },
      );
    an.onfinish = function () {
      an = null;
      box.style.overflow = '';
      if (closing) {
        d.open = false;
        d.classList.remove('closing');
      }
    };
  });
});
/* A link to a closed row opens it, so the jump links never land on something shut. */
function openTarget() {
  var t = location.hash && doc.getElementById(location.hash.slice(1));
  if (t && t.matches('details')) t.open = true;
}
all('.jump a').forEach(function (a) {
  var t = doc.getElementById(a.getAttribute('href').slice(1));
  if (t && t.matches('details'))
    a.addEventListener('click', function () {
      t.open = true;
    });
});
addEventListener('hashchange', openTarget);
openTarget();
addEventListener('beforeprint', function () {
  all('.faq details, .fold').forEach(function (d) {
    d.open = true;
  });
});
