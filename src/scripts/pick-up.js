/* The small portrait card you can pick up (PortraitCard.astro, any [data-pickup]). A mouse over it
   lifts it a little; a press lifts it and a drag carries it a short way on a rubber band, turning
   it with the drag; letting go springs it home. Four springs from the drawer's shared helper
   (spring.js) drive four numbers in portrait-card.css, and the loop stops once all four are at
   rest, so nothing runs while the card is left alone. This is About's feel without About's script:
   no hand of windows, no depth planes, just the lift.

   With reduced motion it does nothing and the card stays a still picture. */
import { ui } from './kit.js';
import { spring } from './spring.js';

/* A rubber band: free near the start, then harder and harder to pull, never past `max`. */
var band = function (d, max) {
  return max * Math.tanh(d / max);
};

var wire = function (card) {
  var sp = {
      x: { x: 0, v: 0 },
      y: { x: 0, v: 0 },
      r: { x: 0, v: 0 },
      up: { x: 0, v: 0 },
    },
    to = { x: 0, y: 0, r: 0, up: 0 },
    hover = false,
    grab = null,
    raf = 0,
    last = 0;

  var paint = function () {
    card.style.setProperty('--pm-x', sp.x.x.toFixed(2));
    card.style.setProperty('--pm-y', sp.y.x.toFixed(2));
    card.style.setProperty('--pm-r', sp.r.x.toFixed(2));
    card.style.setProperty('--pm-up', sp.up.x.toFixed(3));
  };
  var tick = function (t) {
    var dt = Math.min(0.032, (t - last) / 1000 || 0.016);
    last = t;
    /* Every spring takes its step, so none is skipped by an early `||`. */
    var a = spring(sp.x, to.x, 170, 13, dt),
      b = spring(sp.y, to.y, 170, 13, dt),
      c = spring(sp.r, to.r, 150, 11, dt),
      d = spring(sp.up, to.up, 190, 15, dt);
    paint();
    raf = a || b || c || d ? requestAnimationFrame(tick) : 0;
  };
  var wake = function () {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };

  card.addEventListener('pointerenter', function (e) {
    if (e.pointerType !== 'mouse') return;
    hover = true;
    to.up = 1;
    wake();
  });
  card.addEventListener('pointerleave', function (e) {
    if (e.pointerType !== 'mouse') return;
    hover = false;
    if (!grab) to.up = 0;
    wake();
  });
  card.addEventListener('pointerdown', function (e) {
    grab = { id: e.pointerId, x: e.clientX, y: e.clientY };
    card.classList.add('held');
    to.up = 1;
    try {
      card.setPointerCapture(e.pointerId);
    } catch (err) {
      /* An old browser without capture still lifts; the drag just ends at the card's edge. */
    }
    if (e.pointerType === 'mouse') e.preventDefault();
    wake();
  });
  card.addEventListener('pointermove', function (e) {
    if (!grab || e.pointerId !== grab.id) return;
    to.x = band(e.clientX - grab.x, 46);
    to.y = band(e.clientY - grab.y, 30);
    to.r = band((e.clientX - grab.x) * 0.08, 7);
    wake();
  });
  var drop = function (e) {
    if (!grab || (e.pointerId !== undefined && e.pointerId !== grab.id)) return;
    grab = null;
    card.classList.remove('held');
    to.x = to.y = to.r = 0;
    to.up = hover ? 1 : 0;
    wake();
  };
  card.addEventListener('pointerup', drop);
  card.addEventListener('pointercancel', drop);
  card.addEventListener('lostpointercapture', drop);
};

if (!ui.reduce) document.querySelectorAll('[data-pickup]').forEach(wire);
