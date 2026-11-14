/* About's map and its hand of state cards (src/components/ClientMap.astro). Alive while on screen.

   - The first time it comes into view the map glides from the whole country to the East, and the
     four cards are dealt out of one stack into a fan along the map's foot.
   - The walk: every few seconds the next state is shown. A point of light leaves Cincinnati along
     that state's arc, and its card lifts out of the hand and turns blue as the light lands (the
     lift waits for it in CSS, under .cm-walk). Ohio, the home state, has no arc and lifts at once.
   - Hovering or focusing a card, or hovering a state or pin on the map, shows that state at once
     and holds it; the walk carries on a little after you leave.
   - `data-live` lets the CSS run the ripple, the pings, the flowing arcs and the light. It is set
     only while the map is on screen, the tab is visible and nobody has pressed Pause.
   - "Pause the map" stops all of it (WCAG 2.2.2) and "Play the map" starts it again.

   Under reduced motion none of that runs and the Pause button stays hidden: the map rests on the
   East, the hand is already fanned, and hover and focus still move the highlight, with no
   transition. With no script the same resting state is in the markup. */
import { ui } from './kit.js';

var root = document.querySelector('[data-cm]');
if (root) {
  var reduce = ui.reduce,
    svg = root.querySelector('.cm-svg'),
    btn = root.querySelector('[data-cm-pause]'),
    cards = [].slice.call(root.querySelectorAll('.sc')),
    order = cards.map(function (c) {
      return c.getAttribute('data-st');
    }),
    // Every card, state, arc and pin carries its state's data-st; the matching ones get `.on`.
    marked = [].slice.call(root.querySelectorAll('[data-st]')),
    phone = matchMedia('(max-width: 40rem)'),
    STEP = 3600,
    RESUME = 2400,
    onScreen = false,
    paused = false,
    held = false,
    timer = 0,
    resumeTimer = 0,
    opened = false;

  var view = function (which) {
    return svg.getAttribute('data-' + which + (phone.matches ? '-phone' : ''));
  };

  var running = function () {
    return !reduce && onScreen && !paused && !document.hidden;
  };

  var fire = function (st) {
    var arc = svg.querySelector('.cm-arc[data-st="' + st + '"]');
    if (!arc) return;
    arc.classList.remove('fire');
    arc.getBoundingClientRect(); // restart the light from Cincinnati
    arc.classList.add('fire');
  };

  var on = function (st, walked) {
    root.setAttribute('data-on', st);
    root.classList.toggle('cm-walk', !!walked);
    marked.forEach(function (el) {
      el.classList.toggle('on', el.getAttribute('data-st') === st);
    });
    if (running()) fire(st);
  };
  on(root.getAttribute('data-on') || order[0]);

  var tick = function () {
    clearTimeout(timer);
    if (!running() || held) return;
    timer = setTimeout(function () {
      if (!running() || held) return;
      var i = order.indexOf(root.getAttribute('data-on'));
      on(order[(i + 1) % order.length], true);
      tick();
    }, STEP);
  };

  var sync = function () {
    root.toggleAttribute('data-live', running());
    tick();
  };

  /* Holding the highlight on what you point at or focus, then walking on after a pause. */
  var hold = function (st) {
    clearTimeout(resumeTimer);
    clearTimeout(timer);
    held = true;
    if (root.getAttribute('data-on') !== st || root.classList.contains('cm-walk')) on(st, false);
  };
  var release = function () {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(function () {
      held = false;
      tick();
    }, RESUME);
  };
  var wire = function (el, keyboard) {
    var st = el.getAttribute('data-st');
    el.addEventListener('pointerenter', function () {
      hold(st);
    });
    el.addEventListener('pointerleave', release);
    if (keyboard) {
      el.addEventListener('focusin', function () {
        hold(st);
      });
      el.addEventListener('focusout', release);
    }
  };
  cards.forEach(function (c) {
    wire(c, true);
  });
  [].forEach.call(svg.querySelectorAll('.cm-st, .cm-pin'), function (g) {
    wire(g, false);
  });

  /* The opening: the map glides in on the house ease while the hand is dealt. */
  var parse = function (s) {
    return s.split(' ').map(Number);
  };
  var open = function () {
    if (opened) return;
    opened = true;
    var a = parse(view('full')),
      b = parse(view('crop')),
      t0 = 0,
      DELAY = 350,
      DUR = 1900,
      ease = function (t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };
    setTimeout(
      function () {
        root.classList.add('cm-dealing');
        root.classList.remove('cm-stacked');
        setTimeout(function () {
          root.classList.remove('cm-dealing');
        }, 1200);
      },
      DELAY + DUR * 0.45,
    );
    var frame = function (now) {
      if (!t0) t0 = now;
      var t = Math.max(0, Math.min((now - t0 - DELAY) / DUR, 1));
      var k = ease(t);
      svg.setAttribute(
        'viewBox',
        a
          .map(function (v, i) {
            return (v + (b[i] - v) * k).toFixed(2);
          })
          .join(' '),
      );
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  // A phone and a big screen frame the map differently; follow the screen if it changes.
  var rest = function () {
    svg.setAttribute('viewBox', view(opened || reduce ? 'crop' : 'full'));
  };
  phone.addEventListener('change', rest);

  if (reduce || !('IntersectionObserver' in window)) {
    svg.setAttribute('viewBox', view('crop'));
  } else {
    // Wait on the whole country with the cards in one stack, so the opening starts from somewhere
    // nobody saw jump.
    rest();
    root.classList.add('cm-stacked');
    btn.hidden = false;
    btn.addEventListener('click', function () {
      paused = !paused;
      root.toggleAttribute('data-paused', paused);
      btn.textContent = paused ? 'Play the map' : 'Pause the map';
      sync();
    });
    document.addEventListener('visibilitychange', sync);
    new IntersectionObserver(
      function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) open();
        sync();
      },
      { threshold: 0.2 },
    ).observe(root);
  }

  /* The preview: a client's home page in their desktop window, raised above its card while a name
     is pointed at (a mouse) or has keyboard focus, wide screens only (the fanned hand). It plays
     their clip (ui.play stands down under reduced motion and Save-Data) and stays while the
     pointer is on the card or on the window; leaving both, blurring, or Escape puts it away
     (WCAG 1.4.13). A click on it
     opens the case study, like the name. Nothing in it is fetched until it is first shown. */
  var peek = root.querySelector('[data-peek]'),
    wide = matchMedia('(min-width: 52.01rem)'),
    figs = {},
    cur = null,
    hideT = 0;
  if (peek) {
    [].forEach.call(peek.querySelectorAll('.pk'), function (f) {
      figs[f.getAttribute('data-for')] = f;
      f.addEventListener('pointerenter', function () {
        clearTimeout(hideT);
      });
      f.addEventListener('pointerleave', function () {
        hideSoon();
      });
      f.addEventListener('click', function () {
        location.href = f.getAttribute('data-href');
      });
    });
    var hideNow = function () {
      clearTimeout(hideT);
      if (!cur) return;
      ui.play(cur.querySelector('.tile'), false);
      cur.hidden = true;
      cur = null;
    };
    var hideSoon = function () {
      clearTimeout(hideT);
      hideT = setTimeout(hideNow, 160);
    };
    // Centred over the card the name sits on, its foot just above the card's top edge, and kept
    // inside the section.
    var place = function (f, link) {
      var card = link.closest('.sc').getBoundingClientRect(),
        base = root.getBoundingClientRect(),
        half = f.offsetWidth / 2,
        x = card.left + card.width / 2 - base.left;
      x = Math.min(Math.max(x, half), base.width - half);
      f.style.left = x + 'px';
      f.style.bottom = base.bottom - card.top + 14 + 'px';
    };
    var show = function (link) {
      var f = figs[link.getAttribute('data-slug')];
      if (!f || !wide.matches) return;
      clearTimeout(hideT);
      if (cur === f) return;
      hideNow();
      cur = f;
      var img = f.querySelector('img');
      if (!img.getAttribute('src')) img.setAttribute('src', img.getAttribute('data-src'));
      f.hidden = false;
      place(f, link);
      if (!reduce)
        f.animate(
          [
            { transform: 'translateX(-50%) translateY(22px) rotate(-1.4deg) scale(0.95)' },
            { transform: 'translateX(-50%)' },
          ],
          { duration: 560, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
        );
      ui.play(f.querySelector('.tile'), true);
    };
    // A name raises its window; it goes when the pointer leaves the whole card (not just the name:
    // pointing at a name lifts its card, which moves the name out from under a still pointer).
    cards.forEach(function (c) {
      c.addEventListener('pointerleave', function (e) {
        if (e.pointerType === 'mouse') hideSoon();
      });
    });
    // Where the pointer last really was. Browsers send a move at the same spot when the page shifts
    // under a still pointer; the names' handler (which runs first) ignores those.
    var lastX = -1,
      lastY = -1;
    document.addEventListener('pointermove', function (e) {
      lastX = e.clientX;
      lastY = e.clientY;
    });
    [].forEach.call(root.querySelectorAll('.sc-names a[data-slug]'), function (a) {
      // A real move over a name, not pointerenter: the lifting card slides the next name under a
      // still pointer, and that must not swap the window.
      a.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse' || (e.clientX === lastX && e.clientY === lastY)) return;
        show(a);
      });
      a.addEventListener('focus', function () {
        show(a);
      });
      a.addEventListener('blur', hideSoon);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hideNow();
    });
    wide.addEventListener('change', hideNow);
  }
}
