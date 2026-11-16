/* Prices: the chapter bar. The row of links under the first screen sticks to the top of the screen
   in CSS (prices.css). This marks the chapter you are in with the sliding pill the /work filter
   uses (setPill in seg-bar.js, .dw-pill in seg-bar.css), fills a thin line with how far through
   the page you are, and on a phone, where the row scrolls sideways, keeps the current link in
   view. Without it the bar is a plain sticky row of links.

   The current link carries aria-current="location". Nothing here animates by itself: the pill
   and the line only move when the page is scrolled, and under reduced motion the pill jumps
   (seg-bar.css) and the row is scrolled without easing.

   The line is a scroll-driven animation where the browser has them (prices.css, .jump-css): this
   only works out the stretch of scroll it fills over, on load and whenever the page changes size,
   and the browser fills it in step with the scroll. Written here every frame, it was a frame
   behind and restyled the bar each time. Where scroll-driven animation is missing, under reduced
   motion, and on a screen too short for the bar to stick, this writes it as before (--jp). */
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
    raf = 0,
    canCss =
      !ui.reduce && !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()')),
    css = false,
    /* The bar's own numbers, measured in place() so a scroll frame reads nothing from the page:
       whether it sticks, where it rests (its top and its foot on the screen once stuck), and how
       far down the page it starts to stick. */
    bar = { sticky: false, top: 0, foot: 0, natFoot: 0, stickAt: 0 };
  spots.forEach(function (s) {
    ui.top(s.el);
  });
  /* The line a chapter's top has to pass: 48px under the bar's foot, wherever the bar is. */
  var lineAt = function (y) {
    if (bar.sticky && y >= bar.stickAt) return bar.foot + 48;
    return bar.natFoot - y + 48;
  };
  var place = function () {
    var cs = getComputedStyle(nav);
    bar.sticky = cs.position === 'sticky';
    bar.top = parseFloat(cs.top) || 0;
    /* Where the bar would sit if it never stuck: measured with sticking switched off for a moment.
       Only here, never in a scroll frame. */
    if (bar.sticky) nav.style.position = 'static';
    var r = nav.getBoundingClientRect();
    if (bar.sticky) nav.style.position = '';
    bar.natFoot = r.bottom + scrollY;
    bar.stickAt = r.top + scrollY - bar.top;
    bar.foot = bar.top + r.height;
    css = canCss && bar.sticky;
    nav.classList.toggle('jump-css', css);
    if (css && spots.length) {
      /* The same stretch the frame loop below fills over, in scroll from the top of the page. */
      var first = spots[0].el.getBoundingClientRect().top + scrollY - (bar.foot + 48),
        end =
          spots[spots.length - 1].el.getBoundingClientRect().bottom + scrollY - innerHeight * 0.6;
      ui.put(nav, '--jp', '');
      ui.put(nav, '--jp0', first.toFixed(1) + 'px');
      ui.put(nav, '--jp1', Math.max(first + 1, end).toFixed(1) + 'px');
    }
  };
  var paint = function () {
    raf = 0;
    var y = scrollY,
      line,
      now = null;
    if (css) line = lineAt(y);
    else line = nav.getBoundingClientRect().bottom + 48;
    /* A chapter is the current one once its top has passed under the bar. */
    spots.forEach(function (s) {
      /* A section folded away on a phone still has a box (its heading), so this holds there too. */
      if (ui.top(s.el) <= line) now = s;
    });
    /* Stuck: the bar has reached its resting place at the top, so it gets its shadow. */
    var stuck = css
      ? y > 0 && y >= bar.stickAt - 1
      : y > 0 && nav.getBoundingClientRect().top <= parseFloat(getComputedStyle(nav).top) + 1;
    if (stuck !== nav.classList.contains('stuck')) nav.classList.toggle('stuck', stuck);
    /* How far through the chapters: from the first one's top to the end of the last. */
    if (!css && spots.length) {
      var first = ui.top(spots[0].el) + y - line,
        lastBox = spots[spots.length - 1].el.getBoundingClientRect(),
        end = lastBox.bottom + y - innerHeight * 0.6,
        p = end > first ? (y - first) / (end - first) : 0;
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
    place();
    /* The links change size with the window, so the pill is measured again. */
    if (at) setPill(nav);
    wake();
  });
  /* The chapters move when the page changes height (a fold or a question opening, the pictures
     and fonts arriving): measured again then, just after the browser has laid the page out. */
  var again = function () {
    place();
    wake();
  };
  if ('ResizeObserver' in window) new ResizeObserver(again).observe(document.body);
  addEventListener('load', again);
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(function () {
      again();
      if (at) setPill(nav);
    });
  place();
  paint();
}
