/* About's map (src/components/ClientMap.astro): it stays alive while it is on screen.

   - The first time it comes into view it opens on the whole country and glides in to the East.
   - The highlight walks the states in list order, one every few seconds.
   - Hovering or focusing a row in the list, or hovering a picked state or its pin, holds the
     highlight there; it walks on a little after you leave.
   - `data-live` on the root lets the CSS run the ripple, the pings and the light on the arcs. It is
     set only while the map is on screen, the tab is visible and nobody has pressed Pause.
   - "Pause the map" stops all of it (WCAG 2.2.2) and "Play the map" starts it again.

   Under reduced motion none of that runs and the Pause button stays hidden: the map is drawn in its
   resting view and hover and focus still move the highlight, with no transition. */
import { ui } from './kit.js';

var root = document.querySelector('[data-cm]');
if (root) {
  var reduce = ui.reduce,
    svg = root.querySelector('.cm-svg'),
    btn = root.querySelector('[data-cm-pause]'),
    rows = [].slice.call(root.querySelectorAll('.cm-row')),
    order = rows.map(function (r) {
      return r.getAttribute('data-st');
    }),
    // Where the map comes to rest: closer on a phone.
    rest = matchMedia('(max-width: 40rem)').matches
      ? svg.getAttribute('data-crop-phone')
      : svg.getAttribute('data-crop'),
    STEP = 3400,
    RESUME = 2400,
    onScreen = false,
    paused = false,
    held = false,
    timer = 0,
    resumeTimer = 0,
    opened = false;

  // Every row, state, arc and pin carries its state's data-st; the matching ones get `.on`.
  var marked = [].slice.call(root.querySelectorAll('[data-st]'));
  var on = function (st) {
    root.setAttribute('data-on', st);
    marked.forEach(function (el) {
      el.classList.toggle('on', el.getAttribute('data-st') === st);
    });
  };
  on(root.getAttribute('data-on') || order[0]);

  var running = function () {
    return !reduce && onScreen && !paused && !document.hidden;
  };

  var tick = function () {
    clearTimeout(timer);
    if (!running() || held) return;
    timer = setTimeout(function () {
      if (!running() || held) return;
      var i = order.indexOf(root.getAttribute('data-on'));
      on(order[(i + 1) % order.length]);
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
    held = true;
    on(st);
    clearTimeout(timer);
  };
  var release = function () {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(function () {
      held = false;
      tick();
    }, RESUME);
  };
  rows.forEach(function (r) {
    var st = r.getAttribute('data-st');
    r.addEventListener('pointerenter', function () {
      hold(st);
    });
    r.addEventListener('pointerleave', release);
    r.addEventListener('focusin', function () {
      hold(st);
    });
    r.addEventListener('focusout', release);
  });
  [].forEach.call(svg.querySelectorAll('.cm-st, .cm-pin'), function (g) {
    var st = g.getAttribute('data-st');
    g.addEventListener('pointerenter', function () {
      hold(st);
    });
    g.addEventListener('pointerleave', release);
  });

  /* The opening glide, from the whole country to the East, on the house ease. */
  var parse = function (s) {
    return s.split(' ').map(Number);
  };
  var glide = function () {
    if (opened || reduce) return;
    opened = true;
    var a = parse(svg.getAttribute('data-full')),
      b = parse(rest),
      t0 = 0,
      DUR = 1900,
      ease = function (t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };
    root.classList.add('cm-opening');
    var frame = function (now) {
      if (!t0) t0 = now;
      var t = Math.min((now - t0 - 350) / DUR, 1);
      if (t < 0) t = 0;
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
      else root.classList.remove('cm-opening');
    };
    requestAnimationFrame(frame);
  };

  if (reduce) svg.setAttribute('viewBox', rest);
  else {
    // Wait on the whole country, so the glide has somewhere to start that nobody saw jump.
    if ('IntersectionObserver' in window)
      svg.setAttribute('viewBox', svg.getAttribute('data-full'));
    btn.hidden = false;
    btn.addEventListener('click', function () {
      paused = !paused;
      root.toggleAttribute('data-paused', paused);
      btn.textContent = paused ? 'Play the map' : 'Pause the map';
      sync();
    });
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        function (entries) {
          onScreen = entries[0].isIntersecting;
          if (onScreen) glide();
          sync();
        },
        { threshold: 0.2 },
      ).observe(root);
    }
  }
}
