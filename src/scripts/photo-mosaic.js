/* "Whole days" on /photography: the mosaic reveal (Details Vault "Mosaic Reveal Scroll").

   The section is a tall track ([data-mosaic-reveal], 400svh) with a sticky, screen-high camera
   inside it. As the track scrolls past, one number, the progress p (0 when the track's top meets
   the top of the screen, 1 when the camera lets go at the bottom), drives three things:

   1. The collage's --mosaic-scale goes from 1 to 0.5. The featured frame's box is the camera's
      width and height times that scale, so it shrinks about its centre and the six frames
      around it open out (the geometry is all CSS, in photography.css).
   2. Each headline line's band of colour sweeps across it (background-position 100% to 0%) while
      its blur clears, the first line from 0.18 of the way, the second 0.10 after, 0.32 each.
   3. The featured frame's shade goes from 0 to 0.3 from 0.18, over 0.26, so the bone headline
      reads over it.

   Those numbers are the resource's GSAP timeline (one ScrollTrigger, scrub: true, every ease
   "none"), re-done here in plain script because the site carries no motion library. The
   timeline is 0.752 long (the shrink, its longest part), and p maps straight onto it, so
   everything is a straight line of the scroll and runs backwards on the way up. Nothing eases
   on its own and nothing keeps moving after the scroll stops.

   It only runs where photography.css lets the track be tall: with script, and without reduced
   motion (html.js and prefers-reduced-motion: no-preference). Otherwise, and in print, the
   section is the finished mosaic, one screen high, and this file does nothing at all.

   It keeps the site's frame-loop rules (.claude/rules/styling.md, Motion): it asks where the
   track is with ui.top and ui.height, never mid-frame layout reads, and writes through ui.put,
   which skips a value that has not changed. One exception, on purpose: --mosaic-scale sits on
   the collage and is inherited by its tiles, because the resource's geometry needs the featured
   frame and the middle sides' photos to read the one value. */

import { ui } from './kit.js';

var root = document.querySelector('[data-mosaic-reveal]');
var motion = matchMedia('(prefers-reduced-motion: no-preference)');

if (root && motion.matches) {
  var camera = root.querySelector('.mr-camera'),
    collage = root.querySelector('[data-collage]'),
    featured = root.querySelector('[data-featured]'),
    lines = [].slice.call(root.querySelectorAll('[data-mosaic-headline] .mr-line'));

  /* The timeline, in the resource's own units. */
  var TOTAL = 0.752, // the shrink: 0 to 0.752, the whole of the sticky stretch
    SWEEP_AT = 0.18, // the first line starts sweeping here
    SWEEP_FOR = 0.32, // each line takes this long
    STAGGER = 0.1, // the second line starts this much after the first
    SHADE_AT = 0.18,
    SHADE_FOR = 0.26,
    SHADE_TO = 0.3;
  /* The blur a line starts with: the root's --mosaic-sweep-blur, read once (3px). */
  var blur = parseFloat(getComputedStyle(root).getPropertyValue('--mosaic-sweep-blur')) || 3;

  var cam = 0, // the camera's height (one small screen), measured at load and on resize
    queued = false,
    near = false,
    off = false;

  var clamp = function (v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  };
  var fix = function (v) {
    return String(Math.round(v * 1000) / 1000);
  };

  /* How far the page scrolls while the camera is stuck: the track less the camera, which is
     where the native sticky lets go, so the reveal finishes exactly there. */
  var run = function () {
    return Math.max(1, ui.height(root) - cam);
  };

  var draw = function () {
    queued = false;
    if (off) return;
    var t = clamp(-ui.top(root) / run()) * TOTAL;
    ui.put(collage, '--mosaic-scale', fix(1 - 0.5 * clamp(t / TOTAL)));
    ui.put(featured, '--mosaic-shade', fix(SHADE_TO * clamp((t - SHADE_AT) / SHADE_FOR)));
    lines.forEach(function (line, i) {
      var k = clamp((t - SWEEP_AT - STAGGER * i) / SWEEP_FOR);
      ui.put(line, 'backgroundPosition', fix(100 * (1 - k)) + '% 0%');
      ui.put(line, 'filter', 'blur(' + fix(blur * (1 - k)) + 'px)');
    });
  };

  var ask = function () {
    if (!queued) {
      queued = true;
      requestAnimationFrame(draw);
    }
  };

  /* Measure once before any scrolling (the frame-loop rules), then draw where the page is. */
  cam = camera.clientHeight;
  ui.top(root);
  draw();

  /* The six frames around the featured one start outside the camera, clipped, so the browser's
     lazy loading would not fetch them until they were already opening out, and they would pop
     in mid-reveal. Once the track is near, they are all asked for. */
  var fetchAll = function () {
    root.querySelectorAll('img[loading="lazy"]').forEach(function (img) {
      img.loading = 'eager';
    });
    fetchAll = function () {};
  };

  /* Only follow the scroll while the track is near the screen. Far away it rests where it was
     last drawn: at its start above it, finished below it. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      function (entries) {
        near = entries[0].isIntersecting;
        if (near) {
          fetchAll();
          ask();
        }
      },
      { rootMargin: '50% 0px' },
    ).observe(root);
  } else {
    near = true;
    fetchAll();
  }

  addEventListener(
    'scroll',
    function () {
      if (near) ask();
    },
    { passive: true },
  );
  addEventListener('resize', function () {
    cam = camera.clientHeight;
    ask();
  });

  /* A tile reached with the keyboard: jump to the finished mosaic first, so every tile is on
     camera and the focus ring can be seen (WCAG 2.4.11). The browser's own scroll into view
     cannot do it, because the tiles are clipped by the camera, not by the page. */
  root.addEventListener('focusin', function () {
    var by = ui.top(root) + run();
    if (Math.abs(by) > 1) {
      scrollTo({ top: scrollY + by, behavior: 'instant' });
      draw();
    }
  });

  /* Reduced motion switched on mid-visit: let go, and the CSS shows the finished mosaic. */
  motion.addEventListener('change', function () {
    if (motion.matches) return;
    off = true;
    collage.style.removeProperty('--mosaic-scale');
    featured.style.removeProperty('--mosaic-shade');
    lines.forEach(function (line) {
      line.style.backgroundPosition = '';
      line.style.filter = '';
    });
  });
}
