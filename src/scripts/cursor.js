/* A cursor that knows what it is over. On a mouse (a fine pointer that can hover), a small pill in
   the label voice follows the pointer while it is over anything that carries data-cursor, saying
   what a click will do there: Open, Play, Drag, New tab, Turn. Over a button or a chip that
   carries it, the pill leaves the pointer and sits at the middle of the control's top edge.

   The system cursor is never hidden or replaced: the pill is a caption beside it. It is
   aria-hidden and never takes a click, because the thing under it already has a real name for a
   screen reader and a real focus ring for a keyboard. Touch never sees it (those screens keep the
   captions that are printed on the page).

   Labels come from the markup (data-cursor="Open"). A few are given here, to things that are the
   same on every page, so no page has to remember them: see AUTO below. data-cursor="" on an
   element switches the pill off for it and everything inside it.

   Motion: the pill chases its place on a spring (one frame loop that stops the moment it has
   settled). Under reduced motion there is no spring: it is simply placed. */
import { ui } from './kit.js';

var doc = document;
var AUTO = [
  /* A link that leaves the site opens a new tab (every one does: components.md). */
  ['a[target="_blank"]', 'New tab'],
  /* A case study's interaction clip. */
  ['[data-clip]', 'Play'],
  /* The before and after slider, and the photography light table. */
  ['[data-ba] .ba-f', 'Drag'],
  ['[data-table] [data-stage]', 'Drag'],
  /* The cards that turn over: About's Off the clock and the Lab on /work. */
  ['[data-otc-turn], [data-otc-back], [data-lab-turn]', 'Turn'],
];
/* What counts as a button for the snap. */
var SNAP = 'button, .chip, [role="button"], input[type="submit"]';

if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  AUTO.forEach(function (pair) {
    [].forEach.call(doc.querySelectorAll(pair[0]), function (el) {
      if (!el.hasAttribute('data-cursor')) el.setAttribute('data-cursor', pair[1]);
    });
  });

  var pill = doc.createElement('div');
  pill.className = 'cur';
  pill.setAttribute('aria-hidden', 'true');
  var words = doc.createElement('span');
  pill.appendChild(words);
  doc.body.appendChild(pill);

  var sx = ui.spring(420, 34, 0),
    sy = ui.spring(420, 34, 0),
    over = null,
    snap = false,
    shown = false,
    mx = 0,
    my = 0,
    tx = 0,
    ty = 0,
    raf = 0,
    last = 0;
  var place = function () {
    pill.style.transform = 'translate3d(' + sx.x.toFixed(1) + 'px,' + sy.x.toFixed(1) + 'px,0)';
  };
  /* Where the pill wants to be: a little down and right of the pointer, or on a button's top
     edge. Kept on screen either way. */
  var aim = function () {
    var w = pill.offsetWidth,
      h = pill.offsetHeight;
    if (snap && over) {
      var r = over.getBoundingClientRect();
      tx = r.left + r.width / 2 - w / 2;
      ty = r.top - h - 8;
      /* No room above (a button at the top of the screen): sit under it. */
      if (ty < 4) ty = r.bottom + 8;
    } else {
      tx = mx + 16;
      ty = my + 20;
      if (tx + w > innerWidth - 6) tx = mx - w - 12;
      if (ty + h > innerHeight - 6) ty = my - h - 14;
    }
    tx = Math.max(4, Math.min(innerWidth - w - 4, tx));
  };
  var frame = function (now) {
    raf = 0;
    var dt = Math.min(0.033, (now - last) / 1000 || 0.016);
    last = now;
    var a = sx.step(tx, dt),
      b = sy.step(ty, dt);
    if (!a && !b) {
      sx.x = tx;
      sy.x = ty;
    }
    place();
    if ((a || b) && shown) raf = requestAnimationFrame(frame);
  };
  var go = function (jump) {
    aim();
    if (jump || ui.reduce) {
      sx.x = tx;
      sy.x = ty;
      sx.v = sy.v = 0;
      place();
    } else if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  var hide = function () {
    if (!shown) return;
    shown = false;
    over = null;
    pill.classList.remove('on');
  };
  var track = function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return hide();
    mx = e.clientX;
    my = e.clientY;
    var t = e.target,
      el = t && t.closest ? t.closest('[data-cursor]') : null,
      label = el ? el.getAttribute('data-cursor') : '';
    if (!label) return hide();
    var fresh = !shown;
    if (el !== over) {
      over = el;
      snap = el.matches(SNAP);
      words.textContent = label;
      pill.classList.toggle('snap', snap);
    }
    shown = true;
    /* It appears where it belongs: only a move after that is chased. */
    go(fresh);
    pill.classList.add('on');
  };
  addEventListener('pointermove', track, { passive: true });
  addEventListener('pointerdown', track, { passive: true });
  /* The page can slide out from under a still pointer, and a pill left hanging over nothing is
     wrong: scrolling puts it away until the mouse moves again. So do leaving the window, a key
     (the keyboard has taken over) and a dialog opening. */
  addEventListener('scroll', hide, { passive: true, capture: true });
  addEventListener('keydown', hide, { passive: true });
  addEventListener('blur', hide);
  doc.documentElement.addEventListener('pointerleave', hide);
}
