/* Ask what a visitor asks: the shared engine behind "Try it" on /churches/ and on the lean sector
   pages (/schools/, /nonprofits/, /small-business/). A question is a real button; pressing it
   scrolls a client's real phone page, inside its window, to where the answer sits, and shows a
   sentence that says in words where it was found. So nobody has to read the picture.

   The markup it expects (see churches.astro and SectorLean.astro):

     [data-sun]                 the section
       [data-sun-q="<stop>"]    one button a question; the stop is in pixels of the 560-wide capture
       [data-sun-a]             the answer under that button, one per question, in the same order
       .scr img                 the long capture inside a Tile's screen

   The scroll is critically damped, so it eases to a stop and never bounces. Under reduced motion
   the page simply jumps to the answer, so the tool still works. With no script every answer is
   on the page under its question (the CSS shows them all). */
import { ui } from './kit.js';

/* The long captures are all 560 pixels wide; a stop is a distance down one of them. */
var CAPTURE_W = 560;

export function wireAsk(sun) {
  if (!sun) return;
  var reduce = ui.reduce;
  var scr = sun.querySelector('.scr'),
    img = sun.querySelector('.scr img'),
    qs = [].slice.call(sun.querySelectorAll('[data-sun-q]')),
    answers = [].slice.call(sun.querySelectorAll('[data-sun-a]'));
  if (!img || !qs.length) return;
  var y = 0,
    v = 0,
    target = 0,
    raf = 0,
    last = 0;
  var scale = function () {
    return img.offsetWidth / CAPTURE_W || 0;
  };
  /* The page never scrolls past its own foot: a stop near the end of a capture rests with the
     capture's last line on the bottom of the window. Until the picture has loaded its height is
     unknown, so nothing is held back; the load listener below paints again. */
  var paint = function () {
    var s = scale(),
      px = y * s,
      max = img.offsetHeight - scr.offsetHeight;
    if (img.naturalHeight && max > 0) px = Math.min(px, max);
    img.style.transform = 'translate3d(0,' + (-px).toFixed(2) + 'px,0)';
  };
  var frame = function (now) {
    raf = 0;
    var dt = Math.min(0.033, (now - last) / 1000 || 0.016);
    last = now;
    v += (42 * (target - y) - 13 * v) * dt;
    y += v * dt;
    if (Math.abs(target - y) < 0.5 && Math.abs(v) < 0.5) {
      y = target;
      v = 0;
    } else raf = requestAnimationFrame(frame);
    paint();
  };
  var pick = function (btn) {
    target = +btn.dataset.sunQ;
    qs.forEach(function (b, i) {
      var on = b === btn;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (answers[i]) answers[i].hidden = !on;
    });
    if (reduce) {
      y = target;
      paint();
    } else if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  qs.forEach(function (b) {
    b.addEventListener('click', function () {
      pick(b);
      /* A small tick as the question is picked, only if the visitor switched sound on. */
      if (ui.cue) ui.cue('tick');
    });
  });
  /* The page opens on the first question, already at its answer. */
  target = y = +qs[0].dataset.sunQ;
  pick(qs[0]);
  paint();
  addEventListener('resize', paint);
  img.addEventListener('load', paint);
}
