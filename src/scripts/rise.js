/* Section headings rise. As a heading that started below the fold arrives, each of its lines comes
   up out of a mask, one line a beat after the last. It shares its word splitter with the big
   [data-build] lines (ui.words in kit.js): every word is wrapped, the words are grouped into the
   lines they really fall on (measured as the heading arrives, and again if the window is resized
   mid-rise, so a phone and a wide screen each get their own lines), and each line's words move
   together.

   Who gets it: every <h2> inside <main> on its own, plus any h2 or h3 that carries data-rise. Opt a
   heading out with data-rise="off". Never a page-head H1, never a .giant or [data-build] line, and
   never anything on the first screen: only a heading whose top is below the fold when the page
   loads is touched at all.

   What is left alone: a heading inside a dialog, a popover, a form or a live region (scripts
   rewrite those), one inside a .rv block (study.js already reveals it), and one that is not laid
   out when the page loads (folded away on a phone). If another script changes a waiting heading's
   words, this lets go of it at once and it reads as plain text.

   Accessibility: the heading keeps its plain sentence as its accessible name while the words are
   wrapped, and once it has risen the wrappers are taken out again, so it ends as the markup it
   started as. With no script, under reduced motion, on a page that loaded already scrolled
   (ui.restored) and in print, nothing is wrapped or hidden. */
import { ui } from './kit.js';

var doc = document,
  /* A line starts this long after the one above it; the rise itself is 0.8s in elevate.css. */
  BEAT = 80,
  RISE = 800;
var SKIP = 'dialog, [popover], form, [aria-live], [role="status"], .rv, [hidden]';

if (!ui.reduce && !ui.restored() && 'IntersectionObserver' in window && ui.words) {
  var H = innerHeight;
  var heads = [].filter.call(
    doc.querySelectorAll('main h2:not(.giant):not([data-build]), [data-rise]'),
    function (el) {
      if (el.dataset.rise === 'off' || !/^H[23]$/.test(el.tagName)) return false;
      if (el.closest(SKIP) || el.querySelector('.w, .bw, [data-roll]')) return false;
      var r = el.getBoundingClientRect();
      return r.height > 0 && r.top >= H;
    },
  );
  var live = [];
  /* Group the words into the lines they fall on: a new top edge is a new line. */
  var measure = function (h) {
    var line = -1,
      top = null;
    h.words.forEach(function (w) {
      var t = w.offsetTop;
      if (top === null || Math.abs(t - top) > 2) {
        line++;
        top = t;
      }
      w.style.setProperty('--l', line);
    });
    h.lines = line + 1;
  };
  /* Take the wrappers out again: each word span becomes its text, and the heading is as it was. */
  var release = function (h) {
    if (h.gone) return;
    h.gone = true;
    clearTimeout(h.t);
    watch.unobserve(h.el);
    h.mo.disconnect();
    h.words.forEach(function (w) {
      if (w.parentNode) w.parentNode.replaceChild(doc.createTextNode(w.textContent), w);
    });
    h.el.normalize();
    h.el.classList.remove('rise', 'rise-in');
    if (h.named) h.el.removeAttribute('aria-label');
    live = live.filter(function (x) {
      return x !== h;
    });
  };
  var watch = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var h = e.target._rise;
        watch.unobserve(e.target);
        if (!h || h.gone) return;
        measure(h);
        h.el.classList.add('rise-in');
        h.t = setTimeout(
          function () {
            release(h);
          },
          RISE + (h.lines - 1) * BEAT + 80,
        );
      });
    },
    /* A little inside the screen, so the rise is seen above the dock. */
    { rootMargin: '0px 0px -9% 0px', threshold: 0.2 },
  );
  heads.forEach(function (el) {
    var h = { el: el, named: !el.hasAttribute('aria-label'), lines: 1, gone: false, t: 0 };
    h.words = ui.words(el, 'rw');
    if (!h.words.length) {
      if (h.named) el.removeAttribute('aria-label');
      return;
    }
    /* The mask is the word's own box; what moves is the text inside it. */
    h.words.forEach(function (w) {
      var inner = doc.createElement('span');
      inner.className = 'rw-i';
      inner.textContent = w.textContent;
      w.textContent = '';
      w.appendChild(inner);
    });
    el._rise = h;
    el.classList.add('rise');
    /* Another script rewrote the heading while it waited: hand it back untouched. */
    h.mo = new MutationObserver(function () {
      h.words = [];
      release(h);
    });
    h.mo.observe(el, { childList: true, subtree: true, characterData: true });
    live.push(h);
    watch.observe(el);
  });
  /* A resize can re-break a heading that is part way up. */
  addEventListener(
    'resize',
    function () {
      live.forEach(function (h) {
        if (h.el.classList.contains('rise-in')) measure(h);
      });
    },
    { passive: true },
  );
  /* Paper gets every heading whole. */
  addEventListener('beforeprint', function () {
    live.slice().forEach(release);
  });
}
