/* The tier picker from anywhere (TierPicker.astro). A card in the dock's Prices hand opens a small
   corner card that asks the three questions from /services one at a time, then deals the tier they
   suggest with its "Why:" line and a link to /services/ with that tier chosen.

   The rule is src/lib/tier-pick.ts, the module the picker on /services reads too (prices.js), so
   the two always agree. This file only asks and shows.

   Keys and pointers: a pointer's pick moves on to the next question by itself, a beat later, so the
   choice is seen landing. A keyboard picks with the arrows (which select a radio as they move) and
   goes on with Next or Enter, so an arrow press never skips a question. Back steps back. Escape, the
   close button, or a press outside the card puts it away and focus goes back to the dock's Prices
   link, the thing that opened it (the hand it came from has folded by then).

   Motion: the card rises out of the dock on the house spring (CSS), each question slides in from
   the side it comes from, and the answer is dealt in with ui.cue('deal'). Reduced motion: it simply
   appears, and the questions swap in place. Nothing runs until the card is opened. */
import { ui } from './kit.js';
import { suggestTier, whyLine } from '../lib/tier-pick';

var doc = document;
var box = doc.querySelector('[data-tp]');
var openers = [].slice.call(doc.querySelectorAll('[data-tp-open]'));

if (box && openers.length) {
  var tiers = JSON.parse(box.dataset.tpTiers || '[]');
  var $ = function (s) {
    return box.querySelector(s);
  };
  var form = $('[data-tp-form]'),
    qs = [].slice.call(box.querySelectorAll('[data-tp-q]')),
    count = $('[data-tp-count]'),
    back = $('[data-tp-back]'),
    next = $('[data-tp-next]'),
    out = $('[data-tp-out]'),
    head = $('#tp-h'),
    go = $('[data-tp-go]'),
    at = 0,
    shut = 0;
  /* The dock's own Prices link: focus comes home here when the card is put away. */
  var home = doc.querySelector('.dock a[href="/services/"]');

  var answer = function (k) {
    var c = qs[k].querySelector('input:checked');
    return c ? +c.value : -1;
  };
  var answers = function () {
    return qs.map(function (_q, k) {
      return answer(k);
    });
  };
  /* A small slide for whatever just came in: from the right going on, from the left going back. */
  var slide = function (el, from) {
    if (ui.reduce || !el.animate) return;
    el.animate(
      [
        { transform: 'translateX(' + from + 'rem)', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 460, easing: 'cubic-bezier(.3,1.3,.5,1)' },
    );
  };

  /* Show question k (or the answer, at k === 3). dir is +1 going on, -1 going back, 0 for no slide. */
  var show = function (k, dir) {
    at = k;
    var done = k >= qs.length;
    qs.forEach(function (q, i) {
      q.hidden = i !== k;
    });
    form.hidden = done;
    out.hidden = !done;
    back.hidden = k === 0;
    next.disabled = done || answer(k) < 0;
    next.textContent = k === qs.length - 1 ? 'See my tier' : 'Next';
    if (done) {
      var vals = answers(),
        i = suggestTier(vals),
        t = tiers[i];
      if (!t) return show(0, 0);
      count.textContent = 'Your suggestion';
      $('[data-tp-name]').textContent = t.name;
      $('[data-tp-price]').textContent = t.from;
      $('[data-tp-range]').textContent = t.range;
      $('[data-tp-why]').textContent = whyLine(vals, i);
      $('[data-tp-go-name]').textContent = t.name;
      var slug = t.name.toLowerCase();
      go.href = '/services/?tier=' + slug + '#' + slug;
      /* The tier card takes the face it has on the dock's price cards: paper, blue, ink. */
      out.className = 'tp-out tp-' + ['paper', 'blue', 'ink'][i];
      if (dir) {
        if (!ui.reduce && out.animate) {
          out.animate(
            [
              { transform: 'translateY(1.25rem) rotate(-2deg) scale(.96)', opacity: 0 },
              { transform: 'none', opacity: 1 },
            ],
            { duration: 620, easing: 'cubic-bezier(.3,1.4,.5,1)' },
          );
        }
        if (ui.cue) ui.cue('deal');
      }
      go.focus({ preventScroll: true });
      return;
    }
    count.textContent = 'Question ' + (k + 1) + ' of ' + qs.length;
    if (dir) {
      slide(qs[k], dir > 0 ? 1.5 : -1.5);
      if (ui.cue) ui.cue('tick');
      /* Focus to the new question's chosen answer, or its first, so the arrows work straight on. */
      var f = qs[k].querySelector('input:checked') || qs[k].querySelector('input');
      if (f) f.focus({ preventScroll: true });
    }
  };

  var isOpen = function () {
    return !box.hidden && !box.classList.contains('out');
  };
  var setOpeners = function (open) {
    openers.forEach(function (b) {
      b.setAttribute('aria-expanded', String(open));
    });
  };
  var open = function () {
    clearTimeout(shut);
    box.classList.remove('out');
    box.hidden = false;
    /* A fresh start each time it is opened from the dock. */
    form.reset();
    show(0, 0);
    setOpeners(true);
    /* One frame at rest below, then up: the rise is a CSS transition on .on. */
    void box.offsetWidth;
    box.classList.add('on');
    if (ui.cue) ui.cue('open');
    head.focus({ preventScroll: true });
  };
  var close = function (toHome) {
    if (box.hidden) return;
    box.classList.remove('on');
    box.classList.add('out');
    setOpeners(false);
    if (ui.cue) ui.cue('close');
    /* Hidden once it has dropped away, so nothing in it can be reached by Tab. */
    shut = setTimeout(
      function () {
        box.hidden = true;
        box.classList.remove('out');
      },
      ui.reduce ? 0 : 260,
    );
    if (toHome && home) home.focus({ preventScroll: true });
  };

  openers.forEach(function (b) {
    b.addEventListener('click', function () {
      if (isOpen()) close(true);
      else open();
    });
  });
  $('[data-tp-close]').addEventListener('click', function () {
    close(true);
  });
  $('[data-tp-again]').addEventListener('click', function () {
    form.reset();
    show(0, -1);
  });
  back.addEventListener('click', function () {
    show(Math.max(0, at - 1), -1);
  });
  /* Next, or Enter anywhere in the questions. */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (answer(at) >= 0) show(at + 1, 1);
  });
  /* A pointer's pick goes on by itself; a pick made from the keyboard (an arrow or Space) waits for
     Next. Which one it was is the last thing to happen in the form before the change. */
  var byPointer = false;
  form.addEventListener('pointerdown', function () {
    byPointer = true;
  });
  form.addEventListener('keydown', function () {
    byPointer = false;
  });
  form.addEventListener('change', function () {
    next.disabled = answer(at) < 0;
    if (!byPointer || answer(at) < 0) return;
    var from = at;
    setTimeout(
      function () {
        if (at === from && answer(from) >= 0) show(from + 1, 1);
      },
      ui.reduce ? 0 : 240,
    );
  });
  box.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    }
  });
  /* A press anywhere else puts it away, without taking focus anywhere (the press has put it there). */
  doc.addEventListener('pointerdown', function (e) {
    if (!isOpen() || box.contains(e.target)) return;
    if (
      openers.some(function (b) {
        return b.contains(e.target);
      })
    )
      return;
    close(false);
  });
  /* A page left open in the back/forward cache comes back with the card away. */
  addEventListener('pagehide', function () {
    if (!box.hidden) {
      box.classList.remove('on', 'out');
      box.hidden = true;
      setOpeners(false);
    }
  });
}
