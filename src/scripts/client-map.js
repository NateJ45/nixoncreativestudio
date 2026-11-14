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
}
