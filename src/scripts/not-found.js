/* The 404: the numerals as a drawing whose points give when you reach for them, and one client
   window, knocked askew, that stands up when you reach for it. */
import { ui } from './kit.js';
import { POINTS, VIEW, artPaths } from '../lib/not-found-art.ts';
var doc = document;

/* The numerals. Every anchor point sits on its own spring. They get one shake as the page arrives,
   lean away from a mouse that comes near, and shake again when the drawing is pressed or the window
   beside it is knocked. Then they settle and stop: nothing here keeps moving by itself. With reduced
   motion the drawing is the still one the page was built with. */
var art = doc.querySelector('[data-nf]'),
  artSvg = art.querySelector('svg'),
  artO = art.querySelector('.nf-o'),
  artH = art.querySelector('.nf-h'),
  artE = art.querySelector('.nf-e'),
  artA = art.querySelector('.nf-a'),
  artAi = art.querySelector('.nf-ai'),
  /* x and y for every point, side by side: where it is, how fast it is going, where it is headed. */
  off = POINTS.map(function () {
    return [0, 0];
  }).flat(),
  vel = off.slice(),
  aim = off.slice(),
  artRaf = 0,
  artLast = 0;
var artDraw = function () {
  var p = artPaths(off);
  artO.setAttribute('d', p.outline);
  artH.setAttribute('d', p.handles);
  artE.setAttribute('d', p.ends);
  artA.setAttribute('d', p.anchors);
  artAi.setAttribute('d', p.anchors);
};
var artTick = function (t) {
  var dt = Math.min(0.032, (t - artLast) / 1000 || 0.016),
    live = false;
  artLast = t;
  for (var j = 0; j < off.length; j++) {
    vel[j] += (150 * (aim[j] - off[j]) - 11 * vel[j]) * dt;
    off[j] += vel[j] * dt;
    if (Math.abs(aim[j] - off[j]) > 0.05 || Math.abs(vel[j]) > 0.5) live = true;
    else {
      off[j] = aim[j];
      vel[j] = 0;
    }
  }
  artDraw();
  artRaf = live ? requestAnimationFrame(artTick) : 0;
};
var artWake = function () {
  if (!artRaf) {
    artLast = performance.now();
    artRaf = requestAnimationFrame(artTick);
  }
};
/* A shake: every point is sent off its own way and its spring brings it home. */
var shake = function (size) {
  if (ui.reduce) return;
  for (var j = 0; j < vel.length; j++) vel[j] += Math.sin(j * 2.4 + size) * size;
  artWake();
};
if (!ui.reduce) {
  art.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var r = artSvg.getBoundingClientRect(),
      k = VIEW.w / r.width,
      px = VIEW.x + (e.clientX - r.left) * k,
      py = VIEW.y + (e.clientY - r.top) * k;
    POINTS.forEach(function (pt, i) {
      var dx = pt.x - px,
        dy = pt.y - py,
        d = Math.sqrt(dx * dx + dy * dy) || 1,
        push = d < 120 ? (1 - d / 120) * 34 : 0;
      aim[i * 2] = (dx / d) * push;
      aim[i * 2 + 1] = (dy / d) * push;
    });
    artWake();
  });
  art.addEventListener('pointerleave', function () {
    for (var j = 0; j < aim.length; j++) aim[j] = 0;
    artWake();
  });
  /* A press or a tap anywhere on the drawing shakes it, so a touch screen can play too. */
  art.addEventListener('pointerdown', function () {
    shake(360);
  });
  if (!ui.restored()) shake(300);
}

// The address that failed, as text only: the path is whatever someone typed.
var lost = doc.querySelector('.lost'),
  p = location.pathname;
if (lost && p && p !== '/404/' && p !== '/404.html' && p !== '/') {
  doc.querySelector('[data-path]').textContent = p;
  lost.hidden = false;
}

// The first client by order, knocked askew.
var host = doc.querySelector('[data-knock]');
ui.wireFootage(host);

var REST = -13,
  rot = ui.spring(150, 9, REST),
  lift = ui.spring(150, 9, 0),
  target = REST,
  raf = 0,
  last = 0;
var apply = function () {
  host.style.transform =
    'translateY(' + lift.x.toFixed(2) + 'px) rotate(' + rot.x.toFixed(2) + 'deg)';
};
var tick = function (t) {
  var dt = Math.min(0.032, (t - last) / 1000 || 0.016);
  last = t;
  var a = rot.step(target, dt),
    b = lift.step(target === 0 ? -10 : 0, dt);
  apply();
  raf = a || b ? requestAnimationFrame(tick) : 0;
};
var go = function (to) {
  /* Standing the window up knocks the drawing beside it. */
  if (to === 0 && target !== 0) shake(170);
  target = to;
  if (ui.reduce) {
    rot.x = to;
    rot.v = 0;
    lift.x = to === 0 ? -10 : 0;
    lift.v = 0;
    apply();
    return;
  }
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
};
apply();
host.addEventListener('pointerenter', function () {
  go(0);
});
host.addEventListener('pointerleave', function () {
  go(REST);
});
host.addEventListener('focusin', function () {
  go(0);
});
host.addEventListener('focusout', function () {
  go(REST);
});
// Touch has no hover: a touch on the window stands it up.
host.addEventListener('pointerdown', function (e) {
  if (e.pointerType !== 'mouse') go(0);
});
