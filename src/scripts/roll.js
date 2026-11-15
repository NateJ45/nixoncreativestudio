/* Numbers that roll. Each digit of a figure is its own small column, clipped to one line, and a
   change slides the old digit out and the new one in. Commas, dollar signs and letters never move.
   The figure is never counted through the values in between: 4,500 becoming 12,300 shows those two
   numbers only, one digit column each.

   Two ways in:

     ui.roll(el, 'new text')          a script that has just worked out a new figure. `el` must hold
                                      text only; its text becomes 'new text'.
     ui.roll(el, text, { from, delay, still })
                                      `from` is the text to roll away from, when the old figure was
                                      in another element (the cost bars swap whole elements);
                                      `delay` waits that many ms first (a receipt line that has not
                                      come out of the printer yet); `still: true` sets the text
                                      with no roll, and stops one that is running.
     <strong data-roll>$4,500</strong>
                                      a static figure. It rolls once, in place, the first time it
                                      comes on screen, and only if it started below the fold. The
                                      text in the HTML is the real, final value, and it is readable
                                      before, during and after.

   What a screen reader and a test meet: the element's text is the plain new value at every moment.
   While the digits move, that value sits in a visually hidden span and the moving columns are
   aria-hidden and hold no text at all (their glyphs are drawn by CSS from data attributes), so
   nothing is ever read out digit by digit and textContent is never doubled. When the roll ends the
   element is back to one plain text node.

   Reduced motion, or a browser with no Web Animations: the text is simply swapped. Widths hold
   because every [data-roll] and every rolled element is set in tabular figures (elevate.css). */
import { ui } from './kit.js';

var doc = document,
  DUR = 520,
  STEP = 34,
  /* The house bounce: a digit lands a hair past its line and settles. */
  EASE = 'cubic-bezier(0.3, 1.32, 0.5, 1)';
var isDigit = function (c) {
  return c >= '0' && c <= '9';
};
/* The numbers in a string, each with where it starts: "$4,208 over 1 year" holds "4,208" and "1". */
var numbers = function (text) {
  var runs = [],
    re = /\d[\d,.]*/g,
    m;
  while ((m = re.exec(text))) runs.push({ at: m.index, s: m[0] });
  return runs;
};
/* The first number in a string, to tell whether a figure went up or down. */
var valueOf = function (text) {
  var first = numbers(text)[0],
    n = first ? parseFloat(first.s.replace(/,/g, '')) : 0;
  return isNaN(n) ? 0 : n;
};
/* A figure's words as one line: Astro's template leaves line breaks round a value. */
var tidy = function (text) {
  return String(text).replace(/\s+/g, ' ').trim();
};
/* Put the element back to one plain text node. */
var settle = function (el) {
  var r = el._roll;
  if (!r) return;
  clearTimeout(r.wait);
  clearTimeout(r.done);
  r.anims.forEach(function (a) {
    a.cancel();
  });
  el._roll = null;
  el.classList.remove('rolling');
  el.textContent = r.text;
};

ui.roll = function (el, text, opts) {
  if (!el) return;
  opts = opts || {};
  /* What is showing now: the target of a roll still running, or the element's own text. */
  var showing = el._roll ? el._roll.text : tidy(el.textContent);
  var from = opts.from != null ? tidy(opts.from) : showing;
  text = text == null ? showing : tidy(text);
  settle(el);
  if (opts.still || ui.reduce || !el.animate || !/\d/.test(text)) {
    el.textContent = text;
    return;
  }
  /* Up when the figure grew (the new digit rises from below), down when it shrank. A figure
     rolling in place on arrival goes up. */
  var up = valueOf(text) >= valueOf(from) ? 1 : -1;
  var sr = doc.createElement('span');
  sr.className = 'roll-sr';
  sr.textContent = text;
  var view = doc.createElement('span');
  view.className = 'roll-v';
  view.setAttribute('aria-hidden', 'true');
  var cols = [];
  /* Pair the numbers off in order (the first with the first), and line each pair up from the
     right, so the ones stay under the ones whatever the words around them do. `old` maps a place
     in the new text to the digit that stood there. */
  var old = {},
    was = numbers(from);
  numbers(text).forEach(function (run, k) {
    var prev = was[k] ? was[k].s : '';
    for (var p = 0; p < run.s.length; p++)
      old[run.at + p] = prev.charAt(prev.length - run.s.length + p);
  });
  for (var i = 0; i < text.length; i++) {
    var c = text.charAt(i),
      o = old[i] || '',
      cell = doc.createElement('span');
    if (isDigit(c)) {
      cell.className = 'roll-d';
      var col = doc.createElement('span');
      col.className = 'roll-c' + (up < 0 ? ' down' : '');
      col.dataset.n = c;
      /* The digit that leaves. A place that held no digit before has nothing to leave. */
      col.dataset.o = isDigit(o) ? o : '';
      cell.appendChild(col);
      cols.push(col);
    } else {
      cell.className = 'roll-k';
      cell.dataset.n = c;
    }
    view.appendChild(cell);
  }
  el.textContent = '';
  el.appendChild(sr);
  el.appendChild(view);
  el.classList.add('rolling');
  var state = (el._roll = { text: text, anims: [], wait: 0, done: 0 });
  var delay = opts.delay || 0,
    last = cols.length - 1;
  cols.forEach(function (col, k) {
    /* Unchanged digits of a changing figure stay put; only on an arrival (same text) do all roll. */
    if (from !== text && col.dataset.o === col.dataset.n) return;
    state.anims.push(
      col.animate(
        [{ transform: 'translateY(' + up * 100 + '%)' }, { transform: 'translateY(0)' }],
        { duration: DUR, delay: delay + k * STEP, easing: EASE, fill: 'backwards' },
      ),
    );
  });
  state.done = setTimeout(
    function () {
      if (el._roll === state) settle(el);
    },
    delay + DUR + last * STEP + 40,
  );
};

/* Static figures roll once as they arrive. Only one that starts below the fold: a figure on the
   first screen, a page that loaded already scrolled and reduced motion all leave it alone. */
if (!ui.reduce && !ui.restored() && 'IntersectionObserver' in window) {
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        ui.roll(e.target);
      });
    },
    /* Well inside the screen, clear of the dock, so the roll is seen and not half under it. */
    { rootMargin: '0px 0px -14% 0px', threshold: 0.6 },
  );
  [].forEach.call(doc.querySelectorAll('[data-roll]'), function (el) {
    if (el.getBoundingClientRect().top >= innerHeight) io.observe(el);
  });
}
