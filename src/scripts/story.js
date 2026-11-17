/* /story: the print button, and the pieces of paper you can pick up.

   Print: the button only works with this script, so story.css hides it without one (the browser's
   own Print still gives the plain CV).

   Pick up: press on a chapter's piece of paper ([data-lift]) and drag, and it comes with you,
   turning a little the way it would in your hand; let go and it springs back to where it lay
   (spring.js, the feel About's portrait has). A press on a button inside it (the peeling stamp)
   is left to the button, and a finger on a phone keeps scrolling. It is decoration on top of words that are already in the markup, so it
   does nothing for a keyboard and nothing under reduced motion. */
import { ui } from './kit.js';
import { spring } from './spring.js';

var printBtn = document.querySelector('[data-print]');
if (printBtn) {
  printBtn.addEventListener('click', function () {
    window.print();
  });
}

if (!ui.reduce) {
  [].forEach.call(document.querySelectorAll('[data-lift]'), function (el) {
    // Where it is (x, y in px, r in degrees) and how fast each is moving.
    var sp = { x: { x: 0, v: 0 }, y: { x: 0, v: 0 }, r: { x: 0, v: 0 } };
    var held = null;
    var raf = 0;
    var last = 0;

    function draw() {
      ui.put(
        el,
        'transform',
        sp.x.x || sp.y.x || sp.r.x
          ? 'translate(' + sp.x.x + 'px,' + sp.y.x + 'px) rotate(' + sp.r.x + 'deg)'
          : '',
      );
    }

    function tick(t) {
      var dt = Math.min(0.032, (t - (last || t)) / 1000) || 0.016;
      last = t;
      if (held) {
        draw();
        raf = requestAnimationFrame(tick);
        return;
      }
      // Let go: each part springs home, and the loop stops once all three are at rest.
      var a = spring(sp.x, 0, 170, 14, dt);
      var b = spring(sp.y, 0, 170, 14, dt);
      var c = spring(sp.r, 0, 170, 12, dt);
      draw();
      if (a || b || c) raf = requestAnimationFrame(tick);
      else {
        raf = 0;
        last = 0;
        el.classList.remove('is-held');
      }
    }

    el.addEventListener('pointerdown', function (e) {
      // A finger on a phone is scrolling the page, so only a mouse or a pen picks paper up.
      if (e.pointerType === 'touch' || e.button !== 0 || e.target.closest('button, a')) return;
      held = { x: e.clientX - sp.x.x, y: e.clientY - sp.y.x };
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-held');
      if (!raf) raf = requestAnimationFrame(tick);
    });
    el.addEventListener('pointermove', function (e) {
      if (!held) return;
      var nx = e.clientX - held.x;
      // Turn with the sideways speed, as a card does when you swing it, kept to a few degrees.
      sp.r.x = Math.max(-8, Math.min(8, sp.r.x * 0.8 + (nx - sp.x.x) * 0.25));
      sp.x.x = nx;
      sp.y.x = e.clientY - held.y;
    });
    function drop() {
      if (!held) return;
      held = null;
      sp.x.v = sp.y.v = sp.r.v = 0;
      ui.cue('deal');
    }
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);
  });
}
