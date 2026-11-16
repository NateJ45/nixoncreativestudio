/* About, below the fold: the "Off the clock" cards (a camera roll, a program monitor and a course
   line that draws), and the bio's photo stacks, whose words are real buttons with aria-expanded.
   Reduced motion is handled in CSS (no drawing, no meters, no fan). */
import { cue } from './sound.js';

/* ---- Off the clock (src/components/OffTheClock.astro) ----------------------------------------
   The cards are open: everything is on the face. A card is .seen once it is well on screen (the
   course line draws then) and .alive while any of it is on screen (the program monitor's meters
   and tally move only then). Without IntersectionObserver both are simply on. */
var otcs = [].slice.call(document.querySelectorAll('[data-otc]'));
if ('IntersectionObserver' in window) {
  var seenIo = new IntersectionObserver(
    function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('seen');
          seenIo.unobserve(e.target);
        }
      });
    },
    { threshold: 0.45 },
  );
  var aliveIo = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      e.target.classList.toggle('alive', e.isIntersecting);
    });
  });
  otcs.forEach(function (o) {
    seenIo.observe(o);
    aliveIo.observe(o);
  });
} else
  otcs.forEach(function (o) {
    o.classList.add('seen', 'alive');
  });

/* ---- The camera roll on the Photography card ------------------------------------------
   One frame, six prints side by side in a row that snaps (CSS scroll snap, so a swipe works and
   so does the page with no script). The two buttons and the left and right arrow keys step one
   print at a time and go round at the ends. The count under the frame is a polite live region,
   so a screen reader hears "2 of 6: Still morning". Reduced motion: the step is a jump. */
var noMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
[].forEach.call(document.querySelectorAll('[data-reel]'), function (reel) {
  var strip = reel.querySelector('[data-reel-strip]'),
    frames = [].slice.call(strip.children),
    count = reel.querySelector('[data-reel-n]'),
    n = frames.length,
    at = 0,
    busy = 0;
  if (!n) return;
  var say = function () {
    var title = frames[at].querySelector('figcaption b');
    count.textContent = at + 1 + ' of ' + n + (title ? ': ' + title.textContent : '');
  };
  var go = function (i) {
    at = (i + n) % n;
    strip.scrollTo({ left: frames[at].offsetLeft, behavior: noMotion ? 'auto' : 'smooth' });
    say();
    cue('tick');
  };
  reel.querySelector('[data-reel-prev]').addEventListener('click', function () {
    go(at - 1);
  });
  reel.querySelector('[data-reel-next]').addEventListener('click', function () {
    go(at + 1);
  });
  reel.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    go(at + (e.key === 'ArrowRight' ? 1 : -1));
  });
  /* A swipe or a drag of the scrollbar moves the row itself: read back which print it rests on. */
  strip.addEventListener(
    'scroll',
    function () {
      clearTimeout(busy);
      busy = setTimeout(function () {
        var i = Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth));
        i = Math.max(0, Math.min(n - 1, i));
        if (i !== at) {
          at = i;
          say();
        }
      }, 120);
    },
    { passive: true },
  );
});

/* ---- The route on the Running card ----------------------------------------------------------
   The route draws itself in CSS once the card is well on screen (.otc.seen, about.css). "Draw it again"
   lifts the pen and replays it: the class puts the line back to undrawn with no transition, one
   reflow makes that stick, and taking the class off lets it draw. Hidden under reduced motion,
   where the line is simply there. */
[].forEach.call(document.querySelectorAll('[data-otc-course]'), function (box) {
  var again = box.querySelector('[data-otc-again]');
  if (!again) return;
  again.addEventListener('click', function () {
    box.classList.add('lifted');
    void box.offsetWidth;
    box.classList.remove('lifted');
  });
});

/* ---- Photo stacks (src/components/PhotoStack.astro) ------------------------------------------
   Up while a mouse is over the word or its photos, while the word has keyboard focus, or after a
   tap or a click pins it. Escape puts every stack away (WCAG 1.4.13). Before it rises the stack is
   nudged sideways to stay on screen, and drops below the word when there is no room above. */
var stacks = [].map.call(document.querySelectorAll('[data-ps]'), function (el) {
  return {
    el: el,
    btn: el.querySelector('.ps-w'),
    pile: el.querySelector('.ps-pile'),
    hover: false,
    focus: false,
    pinned: false,
  };
});
function place(s) {
  s.el.style.setProperty('--nx', '0px');
  s.el.classList.remove('below');
  var r = s.pile.getBoundingClientRect(),
    m = 16,
    nx = 0;
  if (r.left < m) nx = m - r.left;
  else if (r.right > innerWidth - m) nx = innerWidth - m - r.right;
  s.el.style.setProperty('--nx', nx.toFixed(1) + 'px');
  if (r.top < m) s.el.classList.add('below');
}
function sync(s) {
  var open = s.hover || s.focus || s.pinned;
  if (open === s.el.classList.contains('open')) return;
  s.el.classList.toggle('open', open);
  s.btn.setAttribute('aria-expanded', String(open));
  if (open) place(s);
}
stacks.forEach(function (s) {
  s.el.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'mouse') {
      s.hover = true;
      sync(s);
    }
  });
  s.el.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse') {
      s.hover = false;
      sync(s);
    }
  });
  s.btn.addEventListener('focus', function () {
    if (s.btn.matches(':focus-visible')) {
      s.focus = true;
      sync(s);
    }
  });
  s.btn.addEventListener('blur', function () {
    s.focus = false;
    s.pinned = false;
    sync(s);
  });
  /* A tap, a click or Enter pins it up (a mouse has usually raised it already by hovering), and
     the next one puts it away. */
  s.btn.addEventListener('click', function () {
    s.pinned = !s.pinned;
    if (!s.pinned) s.hover = s.focus = false;
    sync(s);
  });
});
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  stacks.forEach(function (s) {
    s.hover = s.focus = s.pinned = false;
    sync(s);
  });
});
/* A tap anywhere else puts a pinned stack away. */
document.addEventListener('pointerdown', function (e) {
  stacks.forEach(function (s) {
    if (s.pinned && !s.el.contains(e.target)) {
      s.pinned = false;
      sync(s);
    }
  });
});
