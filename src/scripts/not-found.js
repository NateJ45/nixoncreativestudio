/* The 404: one client window, knocked askew, that stands up when you reach for it. */
import { ui } from './kit.js';
var doc = document;

// The address that failed, as text only: the path is whatever someone typed.
var lost = doc.querySelector('.lost'), p = location.pathname;
if (lost && p && p !== '/404/' && p !== '/404.html' && p !== '/') { doc.querySelector('[data-path]').textContent = p; lost.hidden = false; }

// The first client by order, knocked askew.
var host = doc.querySelector('[data-knock]');
ui.wireFootage(host);

var REST = -13, rot = ui.spring(150, 9, REST), lift = ui.spring(150, 9, 0), target = REST, raf = 0, last = 0;
var apply = function () { host.style.transform = 'translateY(' + lift.x.toFixed(2) + 'px) rotate(' + rot.x.toFixed(2) + 'deg)'; };
var tick = function (t) {
  var dt = Math.min(.032, (t - last) / 1000 || .016); last = t;
  var a = rot.step(target, dt), b = lift.step(target === 0 ? -10 : 0, dt);
  apply();
  raf = a || b ? requestAnimationFrame(tick) : 0;
};
var go = function (to) {
  target = to;
  if (ui.reduce) { rot.x = to; rot.v = 0; lift.x = to === 0 ? -10 : 0; lift.v = 0; apply(); return; }
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
};
apply();
host.addEventListener('pointerenter', function () { go(0); });
host.addEventListener('pointerleave', function () { go(REST); });
host.addEventListener('focusin', function () { go(0); });
host.addEventListener('focusout', function () { go(REST); });
// Touch has no hover: a touch on the window stands it up.
host.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') go(0); });
