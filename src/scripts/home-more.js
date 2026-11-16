/* The homepage's lower sections (home.css): the What changed cards are dealt in, the photography
   strip drifts and bows with the scroll, and the four process beats draw in order. home.js keeps
   the hero's deal; this file is everything added below the grid.

   The same three rules throughout: only something that starts below the fold is ever held back,
   reduced motion gets the finished state with nothing moving, and a page that loaded already
   scrolled (a reload, Back) is simply set. With no script none of the waiting classes exist, so
   everything is just there. */
import { ui } from './kit.js';

var reduce = ui.reduce,
  doc = document,
  canWatch = 'IntersectionObserver' in window,
  belowFold = function (el) {
    return el.getBoundingClientRect().top > innerHeight;
  };

/* ---- What changed (src/components/home/WhatChanged.astro) ------------------------------------
   Each wide card comes up from a little low and turned, one after another, as the list arrives.
   The figure's own roll is data-roll (roll.js) and needs nothing here. */
var chg = doc.querySelector('[data-chg]');
if (chg && !reduce && canWatch && !ui.restored()) {
  var chgCards = [].slice.call(chg.querySelectorAll('.chg-card')).filter(belowFold);
  if (chgCards.length) {
    chg.classList.add('chg-wait');
    chgCards.forEach(function (c) {
      c.classList.add('held');
    });
    var cio = new IntersectionObserver(
      function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          cio.unobserve(e.target);
          e.target.classList.remove('held');
          ui.cue('deal', 0.12);
        });
      },
      { threshold: 0.3 },
    );
    chgCards.forEach(function (c) {
      cio.observe(c);
    });
  }
}

/* ---- The process beats (src/components/home/ProcessBeats.astro) -------------------------------
   The same drawing as "How it works" on the Prices page (prices.js): each step's hairline runs
   to it and its icon draws, in order, the one drawing now `.at` in the blue. */
var beats = doc.querySelector('[data-beats]');
if (beats && !reduce && canWatch && !ui.restored() && belowFold(beats)) {
  var beatLis = [].slice.call(beats.children);
  beats.classList.add('bt-wait');
  var bio = new IntersectionObserver(
    function (es) {
      if (!es[0].isIntersecting) return;
      bio.disconnect();
      beatLis.forEach(function (li, i) {
        setTimeout(
          function () {
            beatLis.forEach(function (l) {
              l.classList.remove('at');
            });
            li.classList.add('drawn', 'at');
          },
          150 + i * 520,
        );
      });
      setTimeout(
        function () {
          beatLis[beatLis.length - 1].classList.remove('at');
        },
        150 + beatLis.length * 520 + 900,
      );
    },
    { threshold: 0.35 },
  );
  bio.observe(beats);
}
/* Paper shows every step drawn, however far the drawing had got. */
addEventListener('beforeprint', function () {
  if (!beats) return;
  [].forEach.call(beats.children, function (li) {
    li.classList.add('drawn');
  });
});

/* ---- The photography strip (src/components/home/PhotoStrip.astro) -----------------------------
   Two things, both transforms only:
   - The bow. The prints lean a few degrees with the speed of the scroll and settle flat on a
     spring when it stops. One number (--bow, in degrees) on the row; CSS turns each print by it.
   - The drift. With a mouse, the row slides sideways as the section crosses the screen, far
     enough that every print passes through. The row stops being a sideways scroller for that
     (`.drift`, overflow clipped), so a print the keyboard lands on is nudged into view instead.
     Where the browser has scroll-driven animation the drift is CSS (`.drift-css`, home.css), so
     it moves in step with the scroll itself: this only measures how far the row has to travel
     (--sd-over) on load and resize, and writes the keyboard's nudge (--sd-nudge). Elsewhere (Firefox
     today) the spring below follows the scroll, as before.
   A touch screen keeps the row as a thing you scroll by hand and gets only the bow. Reduced
   motion gets neither: a still row. The bow stays in script on every browser, because it follows
   the scroll's speed, which CSS cannot see; a frame of it reads only scrollY and writes one number. */
var strip = doc.querySelector('[data-strip]');
if (strip && !reduce) {
  var row = strip.querySelector('[data-strip-row]'),
    track = strip.querySelector('[data-strip-track]'),
    fine = matchMedia('(hover: hover) and (pointer: fine)'),
    drifting = false,
    cssDrift = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()')),
    bow = ui.spring(170, 16, 0),
    slide = ui.spring(140, 22, 0),
    seeded = false,
    nudge = 0,
    lastY = scrollY,
    lastT = 0,
    speed = 0,
    raf = 0,
    near = false;

  /* The CSS drift's one measurement: how far the row travels from first print to last. */
  var measure = function () {
    if (cssDrift && drifting)
      ui.put(strip, '--sd-over', Math.max(0, track.scrollWidth - row.clientWidth) + 'px');
  };
  var setMode = function () {
    drifting = fine.matches;
    strip.classList.toggle('drift', drifting);
    strip.classList.toggle('drift-css', drifting && cssDrift);
    if (!drifting) track.style.transform = '';
    else row.scrollLeft = 0;
    seeded = false;
    measure();
  };
  /* Where the row should be: 0 as the section's top meets the foot of the screen, all the way
     across as its foot leaves the top. */
  var target = function () {
    var r = strip.getBoundingClientRect(),
      over = Math.max(0, track.scrollWidth - row.clientWidth),
      p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
    return Math.min(0, Math.max(-over, -p * over + nudge));
  };
  var frame = function (now) {
    raf = 0;
    var dt = Math.min(0.033, lastT ? (now - lastT) / 1000 : 0.016);
    lastT = now;
    /* Scroll speed in screens a second, eased so one wheel notch does not snap the prints. */
    var y = scrollY,
      v = (y - lastY) / dt / Math.max(1, innerHeight);
    lastY = y;
    speed += (v - speed) * Math.min(1, dt * 14);
    if (Math.abs(speed) < 0.002) speed = 0;
    var lean = Math.max(-7, Math.min(7, speed * 4.2)),
      live = bow.step(lean, dt) || speed !== 0;
    ui.put(row, '--bow', bow.x.toFixed(3));
    if (drifting && !cssDrift) {
      var to = target();
      if (!seeded) {
        slide.x = to;
        slide.v = 0;
        seeded = true;
      }
      if (slide.step(to, dt)) live = true;
      track.style.transform = 'translate3d(' + slide.x.toFixed(2) + 'px,0,0)';
    }
    if (live && near) raf = requestAnimationFrame(frame);
    else {
      lastT = 0;
      if (!live) ui.put(row, '--bow', '0');
    }
  };
  var wake = function () {
    if (!raf && near) {
      lastT = 0;
      lastY = scrollY;
      raf = requestAnimationFrame(frame);
    }
  };
  setMode();
  fine.addEventListener('change', function () {
    setMode();
    wake();
  });
  /* Only while the strip is near the screen: nothing runs for it anywhere else on the page. */
  if (canWatch) {
    new IntersectionObserver(
      function (es) {
        near = es[0].isIntersecting;
        if (near) wake();
      },
      { rootMargin: '25% 0px' },
    ).observe(strip);
  } else near = true;
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', function () {
    seeded = false;
    measure();
    wake();
  });
  addEventListener('load', measure);

  /* The keyboard on a print the drift has left off screen: slide the row just far enough to show
     it, and let go when focus leaves. */
  track.addEventListener('focusin', function (e) {
    if (!drifting || !e.target.matches || !e.target.matches(':focus-visible')) return;
    var r = e.target.getBoundingClientRect(),
      m = 24;
    if (r.left < m) nudge += m - r.left;
    else if (r.right > innerWidth - m) nudge -= r.right - (innerWidth - m);
    setNudge();
  });
  track.addEventListener('focusout', function (e) {
    if (track.contains(e.relatedTarget)) return;
    nudge = 0;
    setNudge();
  });
  /* The CSS drift takes the nudge as its own small slide (translate, eased in home.css); the
     spring takes it as part of where the row should be. */
  var setNudge = function () {
    if (cssDrift) ui.put(track, '--sd-nudge', nudge.toFixed(1) + 'px');
    else wake();
  };
}
