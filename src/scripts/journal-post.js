/* A journal post (src/pages/journal/[slug].astro): the tables, and where you are in the read.

   Tables. Each one is wrapped in a card that scrolls sideways on its own when the table is wider
   than the column, so a phone never scrolls the page (WCAG 1.4.10). A scrolling box has to be
   reachable by keyboard, so the wrapper is a focusable region named after the table's first column.
   A paragraph straight after it that starts "Source" is its source line and sits under the card.

   Margin notes (Aside.astro, .mnote). From 85rem a note sits in the right margin. CSS alone lines
   its foot up with the foot of the table above it; here it is lifted level with the table's top
   instead (--note-up), and kept there when the table changes size.

   Charts (BarChart.astro, .pchart). A chart that starts below the fold waits with its bars at no
   length, and they draw out to their real lengths as it arrives, one a beat after the last. The
   lengths are in the markup, so with no script, on the first screen, on a page that loaded
   scrolled and under reduced motion the chart is simply drawn.

   The marker. The short answer's key phrase (.hl) is marked across once the card is on screen,
   the way a quote band's is. The words are readable throughout; only the marker's ink waits.

   Contents. One <nav popover> is the sticky rail on a wide screen and, on a phone, the list the
   "Contents" pill opens (both work without this script). Here: the heading you are reading gets
   aria-current and the blue mark beside it, the pill shows its name, and choosing a link in the
   phone list closes it. Nothing moves under reduced motion except the mark, which jumps. */
import { ui } from './kit.js';

var doc = document,
  reduce = ui.reduce;
var all = function (a, r) {
  return [].slice.call((r || doc).querySelectorAll(a));
};

var prose = doc.querySelector('[data-prose]');
if (prose) {
  all('table', prose).forEach(function (table, i) {
    var box = doc.createElement('div');
    box.className = 'tbl';
    var head = table.querySelector('th');
    box.setAttribute('role', 'region');
    box.setAttribute(
      'aria-label',
      'Table ' + (i + 1) + (head ? ': ' + head.textContent.trim() : ''),
    );
    table.parentNode.insertBefore(box, table);
    box.appendChild(table);
    /* Only a table that really overflows needs to take focus. */
    if (box.scrollWidth > box.clientWidth + 1) box.tabIndex = 0;
    var next = box.nextElementSibling;
    if (next && next.tagName === 'P' && /^sources?:/i.test(next.textContent.trim())) {
      next.classList.add('tbl-src');
    }
  });
}

/* Margin notes: level with the top of the table or chart they follow. */
all('[data-mnote]').forEach(function (note) {
  var above = note.previousElementSibling;
  if (!above || !/\b(tbl|pchart)\b/.test(above.className)) return;
  var place = function () {
    note.style.setProperty('--note-up', above.offsetHeight + 'px');
  };
  place();
  if ('ResizeObserver' in window) new ResizeObserver(place).observe(above);
});

/* Charts and the marker wait only when they start below the fold, and only with motion allowed. */
var canWait = !reduce && 'IntersectionObserver' in window && !(ui.restored && ui.restored());
var arrive = function (el, waitClass, threshold) {
  if (!canWait || el.getBoundingClientRect().top < innerHeight) return;
  el.classList.add(waitClass);
  var see = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        el.classList.add('in');
        see.disconnect();
      });
    },
    { threshold: threshold },
  );
  see.observe(el);
};
all('[data-pchart] .pchart-fig').forEach(function (fig) {
  arrive(fig, 'pchart-wait', 0.35);
});
/* The marker is on the first screen on most windows, so it does not wait for a scroll: it is
   drawn across shortly after load, and stays put under reduced motion. */
var sa = doc.querySelector('[data-sa]');
if (sa && sa.querySelector('.hl') && !reduce) sa.classList.add('hl-on');

var toc = doc.querySelector('[data-toc]');
if (toc && prose) {
  var links = all('a[href^="#"]', toc),
    pillNow = doc.querySelector('[data-toc-now]'),
    mark = doc.createElement('span');
  mark.className = 'toc-mark';
  mark.setAttribute('aria-hidden', 'true');
  toc.querySelector('ol').appendChild(mark);
  var heads = links
    .map(function (a) {
      return doc.getElementById(decodeURIComponent(a.hash.slice(1)));
    })
    .filter(Boolean);
  var at = -1;
  var paint = function () {
    /* The heading you are in is the last one whose top has passed a third of the way down. */
    var line = innerHeight * 0.33,
      now = 0;
    heads.forEach(function (h, i) {
      if (h.getBoundingClientRect().top < line) now = i;
    });
    if (now === at) return;
    at = now;
    links.forEach(function (a, i) {
      if (i === now) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    var on = links[now];
    if (!on) return;
    mark.style.height = on.offsetHeight + 'px';
    mark.style.transform = 'translateY(' + on.offsetTop + 'px)';
    mark.classList.toggle('jump', reduce);
    if (pillNow) pillNow.textContent = on.textContent;
  };
  var queued = false;
  addEventListener(
    'scroll',
    function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        paint();
      });
    },
    { passive: true },
  );
  addEventListener('resize', function () {
    at = -1;
    paint();
  });
  paint();
  /* A closed phone list has no size, so the mark is placed again once it opens. */
  toc.addEventListener('toggle', function () {
    at = -1;
    paint();
  });

  /* On a phone the list is open over the page: a chosen link closes it, then the page jumps. */
  links.forEach(function (a) {
    a.addEventListener('click', function () {
      try {
        if (toc.matches(':popover-open')) toc.hidePopover();
      } catch (e) {}
    });
  });
}
