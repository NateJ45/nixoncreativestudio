/* Drag to dismiss, on the client sheet, for a finger only. Pull the open sheet down past a third of
   its height, or flick it down, and it closes; let go short of that and it springs back. Nothing
   needs the drag: "Back to the work", Escape and the browser's Back all still close it, and this
   file only ever presses that same button (WCAG 2.5.7).

   The sheet itself is kit.js's (the block under "The client sheet"). This hooks it from outside:
   it moves the dialog with a transform while a finger is on it, and to close it clicks
   [data-back], so the history entry, the focus return and the shrink back into its window all
   stay kit.js's job. While the sheet shrinks home, the offset the finger left springs back to
   nothing, so it lands on its window and not beside it.

   The drag only starts at the very top of the sheet and only for a mostly downward pull, so
   scrolling the sheet and swiping sideways are untouched. Under reduced motion the sheet still
   follows the finger (that is the visitor's own movement) but there is no spring: it closes or
   returns at once. */
import { ui } from './kit.js';

var sheet = document.querySelector('[data-sheet]'),
  back = document.querySelector('[data-back]');

if (sheet && back && 'ontouchstart' in window) {
  var x0 = 0,
    y0 = 0,
    dy = 0,
    /* A finger is down and this might become a drag. */
    armed = false,
    dragging = false,
    lastY = 0,
    lastT = 0,
    /* Pixels a second, downward positive, smoothed over the last few moves. */
    vel = 0,
    raf = 0,
    sp = ui.spring(230, 25, 0);

  var paint = function (y) {
    sheet.style.transform = y ? 'translate3d(0,' + y.toFixed(1) + 'px,0)' : '';
  };
  /* Carry the offset back to nothing on the house spring, starting at the speed the finger left. */
  var settle = function () {
    cancelAnimationFrame(raf);
    if (ui.reduce) {
      paint(0);
      return;
    }
    sp.x = dy;
    sp.v = vel;
    var last = performance.now();
    var frame = function (now) {
      var dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      sp.step(0, dt);
      if (Math.abs(sp.x) < 0.4 && Math.abs(sp.v) < 8) {
        paint(0);
        raf = 0;
        return;
      }
      /* Never above its resting place: a sheet that bounced up would show the page under it. */
      paint(Math.max(0, sp.x));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  };

  sheet.addEventListener(
    'touchstart',
    function (e) {
      armed = false;
      /* One finger, on a sheet that is fully open and scrolled to its top. */
      if (e.touches.length !== 1 || !sheet.classList.contains('on') || sheet.scrollTop > 0) return;
      cancelAnimationFrame(raf);
      armed = true;
      dragging = false;
      x0 = e.touches[0].clientX;
      y0 = lastY = e.touches[0].clientY;
      lastT = e.timeStamp;
      dy = vel = 0;
    },
    { passive: true },
  );
  sheet.addEventListener(
    'touchmove',
    function (e) {
      if (!armed) return;
      var t = e.touches[0],
        d = t.clientY - y0,
        dx = t.clientX - x0;
      if (!dragging) {
        /* Up, or sideways: that is a scroll or a swipe, and not this file's business. */
        if (d < -8 || Math.abs(dx) > 12 || e.touches.length !== 1) {
          armed = false;
          return;
        }
        if (d < 10 || d < Math.abs(dx) * 1.5) return;
        dragging = true;
        /* Start from here, so the sheet does not jump the first ten pixels. */
        y0 = t.clientY;
        sheet.classList.add('dragging');
      }
      /* The sheet is following the finger now, so the page must not scroll or pull to refresh. */
      if (e.cancelable) e.preventDefault();
      dy = Math.max(0, t.clientY - y0);
      var dt = Math.max(1, e.timeStamp - lastT);
      vel = vel * 0.6 + ((t.clientY - lastY) / dt) * 1000 * 0.4;
      lastY = t.clientY;
      lastT = e.timeStamp;
      paint(dy);
    },
    { passive: false },
  );
  var end = function (e) {
    if (!armed) return;
    armed = false;
    if (!dragging) return;
    dragging = false;
    sheet.classList.remove('dragging');
    /* A finger that stopped before lifting was placing the sheet, not throwing it. */
    if (e.timeStamp - lastT > 90) vel = 0;
    var far = dy > sheet.offsetHeight / 3,
      flick = vel > 700 && dy > 24;
    if (e.type === 'touchend' && (far || flick)) back.click();
    settle();
  };
  sheet.addEventListener('touchend', end);
  sheet.addEventListener('touchcancel', end);
  /* However it closed, the next client opens where a sheet belongs. */
  sheet.addEventListener('close', function () {
    cancelAnimationFrame(raf);
    raf = 0;
    paint(0);
  });
}
