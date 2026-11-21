/* How it works on home, the card unfold (src/components/home/ProcessBeats.astro, home.css).

   This is the Details Vault "Card Unfold" timeline written out by hand, so the site needs no motion
   library. Every tween keeps the original's start, length and ease; the scroll position picks the
   moment, so scrolling back up plays it backwards, exactly.

   From 1000px wide: the section is a 260svh track with a sticky 100svh stage. As the section's top
   comes up the screen the photo settles (a small parallax). Then, over the track:
     0     to 0.28  the photo's clip shrinks to the deck (at 1.08 times its size), power1.in
     0.28           the photo hides and the deck of four slices shows in its place
     0.28  to 0.46  the deck settles to its own size and every card gets its corners, power1.out
     0.28  to 0.54  the cards fan out to -14, -5, 6 and 15 degrees, power1.inOut
     0.48  to 0.70  cards 2 and 4 turn over, power1.inOut
     0.57  to 0.79  cards 1 and 3 turn over
     0.79  to 0.84  a short hold, so the finished deck sits still before the section lets go.
   Under 1000px: the backs stack in a sticky column (CSS) and each card turns in as it arrives,
   from a little low and more tilted to its resting lean, power2.out.

   Reduced motion: none of this runs, and CSS shows the finished deck. With no script, the same.
   The work only happens while the section is near the screen, at most once a frame. */
import { ui } from './kit.js';

var root = document.querySelector('[data-fan-split]');

if (root && !ui.reduce) {
  var stage = root.querySelector('[data-stage]'),
    deck = root.querySelector('[data-cards]'),
    cards = [].slice.call(root.querySelectorAll('[data-card]')),
    turns = [].slice.call(root.querySelectorAll('[data-turn]')),
    cover = root.querySelector('[data-cover]'),
    coverImage = cover.querySelector('img'),
    wide = matchMedia('(min-width: 1000px)'),
    mode = '',
    near = false,
    raf = 0;

  var motion = {
    entryScale: 1.2,
    handoffScale: 1.08,
    shrink: 0.28,
    settle: 0.18,
    fan: 0.26,
    flipStart: 0.48,
    flip: 0.22,
    flipGap: 0.09,
    hold: 0.05,
    spread: [-14, -5, 6, 15],
  };
  /* The timeline's whole length: the last flip ends at 0.79, then the hold. */
  var total = motion.flipStart + motion.flipGap + motion.flip + motion.hold;

  var entryAngles = [-6, 5, -4, 6],
    stackAngles = [-2.5, 1.5, -1, 2.5];

  /* The eases, as GSAP writes them. */
  var ease = {
    in1: function (x) {
      return x * x;
    },
    out1: function (x) {
      return 1 - (1 - x) * (1 - x);
    },
    inOut1: function (x) {
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    },
    out2: function (x) {
      return 1 - Math.pow(1 - x, 3);
    },
  };
  var clamp01 = function (x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  };
  /* How far a tween that starts at `start` and lasts `dur` has got at time t, eased. */
  var at = function (t, start, dur, fn) {
    return fn(clamp01((t - start) / dur));
  };
  var mix = function (a, b, k) {
    return a + (b - a) * k;
  };
  var px = function (v) {
    return parseFloat(v) || 0;
  };

  /* Put every element back to its CSS, for a change of mode and for paper. */
  var clear = function () {
    [cover, coverImage, deck].concat(cards, turns).forEach(function (el) {
      el.removeAttribute('style');
    });
    cards.forEach(function (c, i) {
      c.style.setProperty('--i', i);
    });
  };

  /* ---- Wide: the timeline ---------------------------------------------------------------- */
  var wideFrame = function () {
    /* Read everything first, then write. */
    var rect = root.getBoundingClientRect(),
      vh = innerHeight,
      range = Math.max(1, root.offsetHeight - stage.offsetHeight),
      sw = stage.clientWidth,
      sh = stage.clientHeight,
      dw = deck.offsetWidth,
      dh = deck.offsetHeight,
      radius = px(getComputedStyle(root).getPropertyValue('--card-radius'));

    /* The entry: from the section's top at the foot of the screen to its top at the top. */
    var entry = clamp01((vh - rect.top) / vh),
      t = clamp01(-rect.top / range) * total;

    /* The cover's clip, from the whole stage to the enlarged deck (the original's framed()). */
    var k = at(t, 0, motion.shrink, ease.in1),
      y = ((sh - dh * motion.handoffScale) / 2) * k,
      x = ((sw - dw * motion.handoffScale) / 2) * k,
      r = radius * motion.handoffScale * k,
      shown = t >= motion.shrink;
    cover.style.clipPath =
      'inset(' + y + 'px ' + x + 'px ' + y + 'px ' + x + 'px round ' + r + 'px)';
    cover.style.visibility = shown ? 'hidden' : '';
    cover.style.opacity = shown ? '0' : '';
    coverImage.style.transform =
      'translateY(' +
      -(motion.entryScale - 1) * 50 * (1 - entry) +
      '%) scale(' +
      mix(motion.entryScale, motion.handoffScale, k) +
      ')';

    /* The deck: hidden until the handoff, then settling from 1.08 to its own size. */
    var settle = at(t, motion.shrink, motion.settle, ease.out1),
      fan = at(t, motion.shrink, motion.fan, ease.inOut1),
      flipA = at(t, motion.flipStart, motion.flip, ease.inOut1),
      flipB = at(t, motion.flipStart + motion.flipGap, motion.flip, ease.inOut1);
    deck.style.visibility = shown ? 'visible' : 'hidden';
    deck.style.opacity = shown ? '1' : '0';
    deck.style.transform = 'scale(' + mix(motion.handoffScale, 1, settle) + ')';

    var last = cards.length - 1,
      round = radius * settle;
    cards.forEach(function (card, i) {
      /* The outer corners start round and the inner ones square, so the four read as one photo. */
      var left = i === 0 ? radius : round,
        right = i === last ? radius : round;
      card.style.borderRadius = left + 'px ' + right + 'px ' + right + 'px ' + left + 'px';
      card.style.transform = 'rotate(' + motion.spread[i] * fan + 'deg)';
      /* Two and four turn first, then one and three. */
      var turn = i % 2 ? flipA : flipB;
      turns[i].style.transform = 'rotateY(' + 180 * turn + 'deg)';
    });
  };

  /* ---- Narrow: each card turns in as it arrives ------------------------------------------ */
  var narrowFrame = function () {
    var gap = px(getComputedStyle(deck).rowGap),
      deckTop = deck.getBoundingClientRect().top + scrollY,
      stuck = px(getComputedStyle(cards[0]).top),
      step = px(getComputedStyle(root).getPropertyValue('--stack-step')),
      vh = innerHeight,
      heights = cards.map(function (c) {
        return c.offsetHeight;
      });
    /* Where each card would be in normal flow, never where it is stuck now (the original's
       cardTop()): the deck's place on the page plus the cards and gaps before it. */
    var top = deckTop;
    turns.forEach(function (turn, i) {
      var start = top - vh * 0.9,
        end = top - stuck - i * step,
        k = ease.out2(clamp01((scrollY - start) / Math.max(1, end - start)));
      turn.style.transform =
        'translateY(' +
        mix(24, 0, k) +
        'px) rotate(' +
        mix(entryAngles[i], stackAngles[i], k) +
        'deg) scale(' +
        mix(0.98, 1, k) +
        ')';
      top += heights[i] + gap;
    });
  };

  var frame = function () {
    raf = 0;
    if (mode === 'wide') wideFrame();
    else narrowFrame();
  };
  var ask = function () {
    if (near && !raf) raf = requestAnimationFrame(frame);
  };

  var setMode = function () {
    var next = wide.matches ? 'wide' : 'narrow';
    if (next === mode) return ask();
    mode = next;
    clear();
    root.classList.add('uf-live');
    /* Draw the right moment at once, near the screen or not, so nothing jumps on arrival. */
    frame();
  };

  setMode();
  if (wide.addEventListener) wide.addEventListener('change', setMode);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      function (es) {
        near = es[0].isIntersecting;
        /* One more frame on the way out, so a fast scroll leaves the deck at its end state. */
        if (!raf) raf = requestAnimationFrame(frame);
      },
      { rootMargin: '100% 0px' },
    ).observe(root);
  } else near = true;

  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);

  /* Paper shows the finished deck as the column, however far the scroll had got. */
  addEventListener('beforeprint', function () {
    root.classList.remove('uf-live');
    clear();
  });
  addEventListener('afterprint', function () {
    mode = '';
    setMode();
  });
}
