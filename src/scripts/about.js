/* About: the portrait you can pick up, and the hand of clients behind it. */
import { ui } from './kit.js';
import { spring } from './spring.js';
var reduce = ui.reduce,
  doc = document;
var $ = function (a, r) {
  return (r || doc).querySelector(a);
};
[].forEach.call(doc.querySelectorAll('[data-say]'), function (el) {
  ui.wireFootage(el);
});

/* A hand of clients behind the portrait: partly open at rest, wide under the pointer or a press. */
var REST = 0.5,
  READ = 0.2;
var wins = $('[data-wins]'),
  stage = $('[data-stage]'),
  card = $('[data-card]'),
  story = $('[data-story]');
var tiles = [].slice.call(wins.querySelectorAll('.tile'));
var C = (tiles.length - 1) / 2;
var st = tiles.map(function (el, i) {
  return {
    el: el,
    d: i - C,
    v: reduce ? REST : -0.1 - Math.abs(i - C) * 0.12,
    vv: 0,
    hov: 0,
    lift: 0,
    liftv: 0,
  };
});
var W = 0,
  H = 0,
  pw = 400,
  tw = 200,
  stageW = 600,
  wide = true,
  storyEnd = 1;
function layout() {
  W = innerWidth;
  H = innerHeight;
  wide = W > 960;
  pw = card.offsetWidth;
  tw = tiles[0].offsetWidth;
  stageW = stage.offsetWidth;
  storyEnd = story.getBoundingClientRect().bottom + scrollY;
  ui.top(stage);
  tiles.forEach(function (t, i) {
    ui.put(t, 'zIndex', String(10 - Math.round(Math.abs(st[i].d) * 2)));
  });
  cssMode = cssOk && wide;
  stage.classList.toggle('ab-css', cssMode);
  if (cssMode) placeCss();
  wake();
}
/* The hand tied to the scroll (about.css, .ab-css): on a wide screen the browser moves the
   windows, and this only measures, on load and resize. On a phone the frame loop below moves them
   as before: there the CSS hand restyled the windows every frame and measured slower than the
   script (2026-11-16). Off too under reduced motion and where scroll-driven animation is missing. */
var cssOk =
    !reduce && !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()')),
  cssMode = false;
function px(v) {
  return v.toFixed(1) + 'px';
}
function placeCss() {
  var q = pose({ d: 1 }, 1),
    base = pose({ d: 1 }, 0).x,
    S = Math.max(240, (storyEnd - H) * 0.72);
  wins.style.setProperty('--ab-pw', px(pw));
  wins.style.setProperty('--ab-base', px(base));
  wins.style.setProperty('--ab-span', px(q.x - base));
  st.forEach(function (s) {
    /* The hand opens over the story, by the page's scroll, the middle windows first. */
    var ad = Math.abs(s.d),
      o = (C - ad) * 0.05,
      e = s.el.style;
    e.setProperty('--ab-d', String(s.d));
    e.setProperty('--ab-ad', String(ad));
    e.setProperty('--ab-k', (1 - ad * ad * 0.11).toFixed(4));
    e.setProperty('--ab-v0', (-0.1 - ad * 0.12).toFixed(3));
    e.setProperty('--ab-r0', px(o * S));
    e.setProperty('--ab-r1', px((o + 0.9) * S));
  });
}
/* The spread stops inside the stage, so a window never reaches the text. */
function pose(s, v) {
  var th = tw * 2.02,
    ad = Math.abs(s.d),
    rot = s.d * (2 + 9 * v);
  var r = (22 * Math.PI) / 180,
    halfW = (tw / 2) * Math.cos(r) + (th / 2) * Math.sin(r);
  /* Ten spare pixels each side, for the spring's overshoot. */
  var base = pw * 0.06,
    per = Math.min(pw * 0.3, Math.max(base, (stageW / 2 - halfW - 10) / 2));
  return {
    x: s.d * (base + (per - base) * v),
    y: -pw * (0.05 + 0.33 * v) * (1 - ad * ad * 0.11) + ad * pw * 0.02,
    r: rot,
  };
}

/* The portrait: tilts with the pointer, comes up when held, and springs home when let go.
   The tilt is a few degrees at most (TILT_Y across, TILT_X up and down), and it has depth: the
   photo and its caption sit on two planes above the card (--depth in about.css), so as the card
   leans the caption slides a little over the photo. Hover goes through ui.stillHover and the
   angle is measured against where the card RESTED when the pointer arrived, never against the
   leaning card itself, so the card cannot chase the pointer and jitter.
   A touch screen has no pointer to follow, so there the card leans a little with the scroll
   instead: forward as it comes up the screen, back as it leaves (LEAN degrees at most).
   Reduced motion: none of this runs and the card is still. */
var TILT_Y = 4.5,
  TILT_X = 3.5,
  LEAN = 2.5;
var touchOnly = matchMedia('(hover: none)');
var mk = function (v) {
  return { x: v, v: 0 };
};
var c = { x: mk(0), y: mk(0), rx: mk(0), ry: mk(0), rz: mk(0), s: mk(1), dp: mk(0) };
var held = false,
  hover = false,
  inStage = false,
  pressed = false,
  grab = null,
  gx = 0,
  gy = 0,
  tRx = 0,
  tRy = 0,
  vx = 0,
  lastX = 0,
  lastT = 0,
  focusOpen = 0;
var band = function (d, max) {
  var a = Math.abs(d);
  return (d < 0 ? -1 : 1) * max * (1 - Math.exp(-a / max));
};

var raf = 0,
  last = performance.now();
function wake() {
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}
/* The springs are the drawer's shared helper (src/scripts/spring.js). */
var go = spring;
function frame(now) {
  raf = 0;
  var dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;
  var live = false,
    p;
  if (wide) p = scrollY / Math.max(240, (storyEnd - H) * 0.72);
  /* Where the stage is comes from ui.top and ui.height: asked of the browser after the windows
     below had moved, it laid the page out again, twice a frame. */
  else p = (H * 0.86 - ui.top(stage)) / Math.max(200, H * 0.68);
  p = Math.min(1, Math.max(0, p));
  var open = focusOpen || (!reduce && (inStage || pressed || held));
  if (cssMode) {
    /* Only the numbers the keyframes read change here, and only when the pointer or focus does. */
    st.forEach(function (s) {
      ui.put(s.el, '--ab-open', open ? '1' : '0');
      ui.put(s.el, '--ab-lift', s.hov ? '1' : '0');
      ui.put(s.el, 'zIndex', String(s.hov ? 15 : 10 - Math.round(Math.abs(s.d) * 2)));
    });
  } else
    st.forEach(function (s) {
      var tgt = open
        ? 1
        : reduce
          ? REST
          : REST + READ * Math.min(1, Math.max(0, (p - (C - Math.abs(s.d)) * 0.05) / 0.9));
      if (reduce) {
        s.v = tgt;
        s.vv = 0;
      } else {
        s.vv += (140 * (tgt - s.v) - 14 * s.vv) * dt;
        s.v += s.vv * dt;
        if (Math.abs(tgt - s.v) < 0.0006 && Math.abs(s.vv) < 0.004) {
          s.v = tgt;
          s.vv = 0;
        } else live = true;
      }
      var lt = s.hov ? 1 : 0;
      if (reduce) {
        s.lift = lt;
        s.liftv = 0;
      } else {
        s.liftv += (260 * (lt - s.lift) - 20 * s.liftv) * dt;
        s.lift += s.liftv * dt;
        if (Math.abs(lt - s.lift) > 0.001 || Math.abs(s.liftv) > 0.01) live = true;
        else {
          s.lift = lt;
          s.liftv = 0;
        }
      }
      var q = pose(s, s.v);
      ui.put(s.el, 'zIndex', String(s.hov ? 15 : 10 - Math.round(Math.abs(s.d) * 2)));
      ui.put(
        s.el,
        'transform',
        'translate3d(' +
          q.x.toFixed(2) +
          'px,' +
          (q.y - s.lift * pw * 0.05).toFixed(2) +
          'px,0) rotate(' +
          q.r.toFixed(3) +
          'deg) scale(' +
          (1 + s.lift * 0.02).toFixed(4) +
          ')',
      );
    });
  if (!reduce) {
    /* Tight in the hand, soft when let go. */
    var k = held ? 420 : 105,
      d = held ? 34 : 9.5;
    var a = go(c.x, held ? gx : 0, k, d, dt),
      b = go(c.y, held ? gy : 0, k, d, dt);
    /* No pointer to follow: lean with the scroll, by where the stage sits on the screen. */
    var leaning = touchOnly.matches && !held && !hover;
    if (leaning) {
      var off = (ui.top(stage) + ui.height(stage) / 2 - H / 2) / H;
      tRx = Math.max(-1, Math.min(1, off * 1.6)) * LEAN;
      tRy = 0;
    }
    var e = go(c.rx, tRx, 170, 15, dt),
      f = go(c.ry, tRy, 170, 15, dt);
    /* The planes come apart while the card is being looked at, and lie flat (and sharp) at rest. */
    var dz = go(c.dp, held || hover ? 1 : leaning ? Math.abs(tRx) / LEAN : 0, 150, 16, dt);
    vx *= Math.pow(0.02, dt);
    var g = go(
      c.rz,
      held ? Math.max(-9, Math.min(9, vx * 0.012)) + (c.x.x / pw) * 6 : 0,
      150,
      11,
      dt,
    );
    var h = go(c.s, held ? 1.045 : hover ? 1.012 : 1, 300, 20, dt);
    live = live || a || b || e || f || g || h || dz || held;
    ui.put(card, '--depth', Math.max(0, c.dp.x).toFixed(3));
    ui.put(card, '--lift', Math.max(0, Math.min(1, (c.s.x - 1) / 0.045)).toFixed(3));
    ui.put(
      card,
      'transform',
      'perspective(1100px) translate3d(' +
        c.x.x.toFixed(2) +
        'px,' +
        c.y.x.toFixed(2) +
        'px,0) rotateX(' +
        c.rx.x.toFixed(3) +
        'deg) rotateY(' +
        c.ry.x.toFixed(3) +
        'deg) rotate(' +
        c.rz.x.toFixed(3) +
        'deg) scale(' +
        c.s.x.toFixed(4) +
        ')',
    );
  }
  if (live) raf = requestAnimationFrame(frame);
}

if (!reduce) {
  /* The stage box stays put while the windows move, so the pointer can't make it flicker. */
  stage.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'mouse') {
      inStage = true;
      wake();
    }
  });
  stage.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse') {
      inStage = false;
      wake();
    }
  });
  stage.addEventListener('pointerdown', function (e) {
    if (!e.button) {
      pressed = true;
      wake();
    }
  });
  var letGo = function () {
    if (pressed) {
      pressed = false;
      wake();
    }
  };
  addEventListener('pointerup', letGo);
  addEventListener('pointercancel', letGo);
  /* Measured against the card's resting place (ui.stillHover keeps it, and measures again on
     scroll), or where the card is now for a finger that has just picked it up. */
  var tilt = function (e) {
    var r = (hover && card._still && card._still.rest) || card.getBoundingClientRect();
    var nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)),
      ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    tRy = nx * TILT_Y;
    tRx = -ny * TILT_X;
  };
  /* While the mouse is "on" the card it may be a little outside the leaning card itself, so the
     tilt follows the pointer from the document, not from the card. */
  var follow = function (e) {
    if (hover && !held && e.pointerType === 'mouse') {
      tilt(e);
      wake();
    }
  };
  ui.stillHover(
    card,
    function () {
      hover = true;
      doc.addEventListener('pointermove', follow, { passive: true });
      wake();
    },
    function () {
      hover = false;
      doc.removeEventListener('pointermove', follow);
      if (!held) {
        tRx = tRy = 0;
      }
      wake();
    },
  );
  card.addEventListener('pointermove', function (e) {
    if (held && e.pointerId === grab.id) {
      gx = band(e.clientX - grab.x, pw * 0.62);
      gy = band(e.clientY - grab.y, pw * 0.5);
      var t = performance.now();
      if (t > lastT) {
        vx = vx * 0.6 + ((e.clientX - lastX) / (t - lastT)) * 1000 * 0.4;
        lastX = e.clientX;
        lastT = t;
      }
      tilt(e);
      wake();
    }
  });
  card.addEventListener('pointerdown', function (e) {
    if (e.button) return;
    grab = { id: e.pointerId, x: e.clientX, y: e.clientY };
    held = true;
    gx = gy = 0;
    lastX = e.clientX;
    lastT = performance.now();
    vx = 0;
    card.classList.add('held');
    try {
      card.setPointerCapture(e.pointerId);
    } catch (err) {}
    if (e.pointerType === 'mouse') e.preventDefault();
    wake();
  });
  var drop = function (e) {
    if (!held || (grab && e.pointerId !== grab.id)) return;
    held = false;
    grab = null;
    card.classList.remove('held');
    if (!hover) {
      tRx = tRy = 0;
    }
    wake();
  };
  card.addEventListener('pointerup', drop);
  card.addEventListener('pointercancel', drop);
  card.addEventListener('lostpointercapture', drop);
}

st.forEach(function (s) {
  s.el.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'mouse') {
      s.hov = 1;
      ui.play(s.el, true);
      wake();
    }
  });
  s.el.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse') {
      s.hov = 0;
      ui.play(s.el, false);
      wake();
    }
  });
  /* A window reached by keyboard opens the hand, so focus is never hidden behind the portrait. */
  s.el.addEventListener('focus', function () {
    if (s.el.matches(':focus-visible')) {
      s.hov = 1;
      focusOpen = 1;
      wake();
    }
  });
  s.el.addEventListener('blur', function () {
    s.hov = 0;
    focusOpen = 0;
    wake();
  });
});

/* The stamps on the fact cards peel by src/scripts/peel.js, which Stamp.astro brings with it. */

/* The postcard's flags (about.css, "The flags"): each loop gets its poster and sources only as the
   card comes near the screen, plays while the card is on screen and pauses when it leaves. With
   reduced motion or Data Saver, only the poster: the flags still show, standing still. */
var crossing = doc.querySelector('.crossing');
var saveData = navigator.connection && navigator.connection.saveData;
if (crossing && 'IntersectionObserver' in window) {
  var waves = [].slice.call(crossing.querySelectorAll('.cx-wave'));
  var still = reduce || saveData;
  new IntersectionObserver(
    function (es) {
      var on = es[0].isIntersecting;
      waves.forEach(function (v) {
        if (on && !v.dataset.loaded) {
          v.dataset.loaded = '1';
          v.poster = v.dataset.poster;
          if (still) {
            // A poster shows once the video has nothing to play; make that visible now.
            v.classList.add('is-on');
            return;
          }
          [
            ['webm', 'video/webm'],
            ['mp4', 'video/mp4'],
          ].forEach(function (t) {
            var s = doc.createElement('source');
            s.src = v.dataset[t[0]];
            s.type = t[1];
            v.appendChild(s);
          });
          v.addEventListener('playing', function () {
            v.classList.add('is-on');
          });
          v.load();
        }
        if (still) return;
        if (on) {
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else v.pause();
      });
    },
    { rootMargin: '150px 0px' },
  ).observe(crossing);
}

/* With the hand in CSS, only a touch screen's lean (on a sticky stage) still needs the scroll here. */
addEventListener(
  'scroll',
  function () {
    if (!cssMode || touchOnly.matches) wake();
  },
  { passive: true },
);
addEventListener('resize', layout);
if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(layout);
addEventListener('load', layout);
layout();
if (cssMode) {
  stage.classList.add('ab-intro');
  /* The hand fans out of a tight stack on arrival, once. */
  setTimeout(function () {
    stage.classList.remove('ab-intro');
  }, 1000);
}
