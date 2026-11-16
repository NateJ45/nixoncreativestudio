/* Prices: the chapter bar. The row of links under the first screen sticks to the top of the screen
   in CSS (prices.css). This marks the chapter you are in with the sliding pill the /work filter
   uses (setPill in seg-bar.js, .dw-pill in seg-bar.css), fills a thin line with how far through
   the page you are, and on a phone, where the row scrolls sideways, keeps the current link in
   view. Without it the bar is a plain sticky row of links.

   The current link carries aria-current="location". Nothing here animates by itself: the pill
   and the line only move when the page is scrolled, and under reduced motion the pill jumps
   (seg-bar.css) and the row is scrolled without easing. */
import { ui } from './kit.js';
import { setPill } from './seg-bar.js';

var nav = document.querySelector('[data-chapters]');
if (nav) {
  var row = nav.querySelector('.jump-row'),
    pill = nav.querySelector('[data-pill]'),
    links = [].slice.call(nav.querySelectorAll('a[href^="#"]')),
    spots = links
      .map(function (a) {
        return { a: a, el: document.getElementById(a.getAttribute('href').slice(1)) };
      })
      .filter(function (s) {
        return s.el;
      }),
    at = null,
    raf = 0;
  spots.forEach(function (s) {
    ui.top(s.el);
  });
  var paint = function () {
    raf = 0;
    /* A chapter is the current one once its top has passed under the bar. */
    var line = nav.getBoundingClientRect().bottom + 48,
      now = null;
    spots.forEach(function (s) {
      /* A section folded away on a phone still has a box (its heading), so this holds there too. */
      if (ui.top(s.el) <= line) now = s;
    });
    /* Stuck: the bar has reached its resting place at the top, so it gets its shadow. */
    var stuck =
      scrollY > 0 && nav.getBoundingClientRect().top <= parseFloat(getComputedStyle(nav).top) + 1;
    nav.classList.toggle('stuck', stuck);
    /* How far through the chapters: from the first one's top to the end of the last. */
    if (spots.length) {
      var first = ui.top(spots[0].el) + scrollY - line,
        lastBox = spots[spots.length - 1].el.getBoundingClientRect(),
        end = lastBox.bottom + scrollY - innerHeight * 0.6,
        p = end > first ? (scrollY - first) / (end - first) : 0;
      ui.put(nav, '--jp', Math.min(1, Math.max(0, p)).toFixed(4));
    }
    if (now === at) return;
    at = now;
    links.forEach(function (a) {
      if (now && a === now.a) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    if (!now) {
      pill.style.width = '0px';
      return;
    }
    setPill(nav);
    /* On a narrow screen the row scrolls sideways: bring the current link to the middle of it. Only
       the row is scrolled, never the page. */
    if (row.scrollWidth > row.clientWidth + 1) {
      var left = now.a.offsetLeft - (row.clientWidth - now.a.offsetWidth) / 2;
      row.scrollTo({ left: Math.max(0, left), behavior: ui.reduce ? 'auto' : 'smooth' });
    }
  };
  var wake = function () {
    if (!raf) raf = requestAnimationFrame(paint);
  };
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', function () {
    /* The links change size with the window, so the pill is measured again. */
    if (at) setPill(nav);
    wake();
  });
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(function () {
      if (at) setPill(nav);
    });
  paint();
}
