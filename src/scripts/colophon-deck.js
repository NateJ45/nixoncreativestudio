/* /colophon: the side column deals through every client's window, one at a time. Each window and
   its caption is a slide stacked in one grid cell; the one in front is the only one that can be
   read out, tabbed to or clicked (the rest are inert).

   It moves on every few seconds, but only while it is on screen, the tab is showing and nobody is
   pointing at it or focused inside it, so a window someone is looking at stays put and keeps
   playing. Moving content that runs past five seconds needs a way to stop it (WCAG 2.2.2), so a
   Pause button sits under it. Under reduced motion it never starts and the button stays hidden:
   the first window simply stands still. With no script only the first slide shows (colophon.css). */
import { ui } from './kit.js';

var win = document.querySelector('[data-colo-win]');

if (win) {
  var slides = [].slice.call(win.querySelectorAll('[data-colo-slide]')),
    hold = win.querySelector('[data-colo-hold]'),
    STEP = 4500,
    at = 0,
    held = false,
    seen = true,
    over = false,
    timer = 0;

  var show = function (i) {
    at = (i + slides.length) % slides.length;
    slides.forEach(function (el, j) {
      var on = j === at;
      el.inert = !on;
      el.classList.toggle('is-on', on);
      // A window going to the back stops its footage.
      if (!on) ui.play(el.querySelector('.tile'), false);
    });
  };

  var run = function () {
    clearInterval(timer);
    if (held || over || !seen || document.hidden) return;
    timer = setInterval(function () {
      show(at + 1);
    }, STEP);
  };

  if (slides.length > 1 && !ui.reduce) {
    win.classList.add('is-dealing');
    show(0);

    hold.hidden = false;
    hold.addEventListener('click', function () {
      held = !held;
      hold.setAttribute('aria-pressed', String(held));
      hold.textContent = held ? 'Play' : 'Pause';
      run();
    });

    var deck = win.querySelector('.colo-deck');
    deck.addEventListener('pointerenter', function () {
      over = true;
      run();
    });
    deck.addEventListener('pointerleave', function () {
      over = false;
      run();
    });
    deck.addEventListener('focusin', function () {
      over = true;
      run();
    });
    deck.addEventListener('focusout', function (e) {
      if (deck.contains(e.relatedTarget)) return;
      over = false;
      run();
    });

    if ('IntersectionObserver' in window)
      new IntersectionObserver(function (es) {
        seen = es[0].isIntersecting;
        run();
      }).observe(win);
    document.addEventListener('visibilitychange', run);
    run();
  }
}
