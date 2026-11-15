/* Light. Three small things that share one idea, that the page sits under a real light:

   1. Cincinnati light. --sun-x and --sun-y on <html> say where the light comes from this hour in
      Cincinnati (America/New_York), and the card shadow leans a few pixels away from it
      (kit.css .card, elevate.css --lean). Morning light comes from the left, evening from the
      right, and at night it sits low. Never more than about 6px, on both sides of the card.

        --sun-x   -1 (from the left, 6 AM)  ...  0 (overhead, noon and midnight)  ...  1 (6 PM)
        --sun-y   1 at noon (high, short shadows) down to 0.35 at night (low, longer ones)

   2. The local time. Every [data-cincy] holder has a [data-cincy-time] inside it; this fills the
      time in ("3:42 PM"), shows the holder, and keeps it right each minute. With no script the
      holder stays hidden and the place name stands alone.

   3. The sheen. [data-sheen] on a window or card: a soft highlight follows the mouse across it. It
      goes through ui.stillHover, so a card that lifts cannot shake it loose, it never loops, and a
      touch screen, a keyboard and reduced motion never see it (it is decoration only).

   Nothing here runs a frame loop: the clock is one timer a minute, and the sheen only moves when
   the mouse does. */
import { ui } from './kit.js';

var doc = document,
  root = doc.documentElement,
  ZONE = 'America/New_York';

/* ---- The hour's light and the clock ---- */
var clockFmt = null,
  partsFmt = null;
try {
  clockFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
  partsFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE,
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  });
} catch (e) {
  /* No time zone data: the page keeps its still, overhead light and shows no time. */
}
var holders = [].slice.call(doc.querySelectorAll('[data-cincy]'));
var tick = function () {
  if (!clockFmt) return;
  var now = new Date(),
    h = 12,
    m = 0;
  partsFmt.formatToParts(now).forEach(function (p) {
    if (p.type === 'hour') h = +p.value % 24;
    if (p.type === 'minute') m = +p.value;
  });
  /* One turn a day, with noon at the top. */
  var a = ((h + m / 60 - 12) / 24) * 2 * Math.PI;
  root.style.setProperty('--sun-x', Math.sin(a).toFixed(2));
  root.style.setProperty('--sun-y', (0.35 + 0.65 * Math.max(0, Math.cos(a))).toFixed(2));
  /* A narrow no-break space keeps "3:42 PM" on one line. */
  var text = clockFmt.format(now).replace(/\s/g, ' ');
  holders.forEach(function (el) {
    var out = el.querySelector('[data-cincy-time]');
    if (!out) return;
    if (out.textContent !== text) out.textContent = text;
    el.hidden = false;
  });
};
if (clockFmt) {
  var timer = 0;
  /* Wake just after each minute turns over. A hidden tab's timers are throttled, so coming back
     to the tab sets the clock at once. */
  var arm = function () {
    clearTimeout(timer);
    timer = setTimeout(
      function () {
        tick();
        arm();
      },
      60000 - (Date.now() % 60000) + 60,
    );
  };
  tick();
  arm();
  doc.addEventListener('visibilitychange', function () {
    if (doc.visibilityState === 'visible') {
      tick();
      arm();
    }
  });
}

/* ---- The sheen ---- */
var mouse = matchMedia('(hover: hover) and (pointer: fine)');
if (!ui.reduce && mouse.matches) {
  var lit = null,
    px = 0,
    py = 0,
    raf = 0;
  var paint = function () {
    raf = 0;
    if (!lit) return;
    var r = lit.getBoundingClientRect();
    lit.style.setProperty('--mx', (px - r.left).toFixed(1) + 'px');
    lit.style.setProperty('--my', (py - r.top).toFixed(1) + 'px');
  };
  addEventListener(
    'pointermove',
    function (e) {
      px = e.clientX;
      py = e.clientY;
      if (lit && !raf) raf = requestAnimationFrame(paint);
    },
    { passive: true },
  );
  ui.sheen = function (el) {
    if (el._sheen) return;
    el._sheen = true;
    ui.stillHover(
      el,
      function () {
        lit = el;
        paint();
        el.classList.add('sheen-on');
      },
      function () {
        if (lit === el) lit = null;
        el.classList.remove('sheen-on');
      },
    );
  };
  [].forEach.call(doc.querySelectorAll('[data-sheen]'), ui.sheen);
} else {
  ui.sheen = function () {};
}
