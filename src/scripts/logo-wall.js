/* The client marks on the home page (src/components/home/ClientMarks.astro, home.css). Three things,
   all off under reduced motion, and the wall reads and links the same with none of them:

   1. The deal. The tiles start as one loose deck in the middle of the wall and fan out to their
      places as the wall scrolls in. The motion itself is CSS (a scroll-driven animation); this only
      measures how far each tile sits from the middle (--dx, --dy) and gives it a little turn (--r),
      again whenever the layout changes. With no script the offsets are zero and the tiles just rise.

   2. Logo to live site. Pointing at a tile, or landing on it with the keyboard, slides the logo to a
      corner and plays that client's real homepage footage across the tile (.live). The still and the
      clip are fetched the first time a tile is reached, never before. On a touch screen the tile in
      the middle of the screen plays once the scrolling settles, and goes back to its logo within five
      seconds (WCAG 2.2.2), like the phones in the grid. Save-Data plays nothing.

   3. Tilt. With a mouse, a tile tips a few degrees toward the pointer and the logo, on its own layer,
      floats above the colour. Letting go settles it back on a spring curve (CSS). */
import { ui } from './kit.js';

var wall = document.querySelector('[data-lw]');
if (wall) {
  var reduce = ui.reduce,
    saveData = !!(navigator.connection && navigator.connection.saveData),
    tiles = [].slice.call(wall.querySelectorAll('.lw')),
    cells = tiles.map(function (t) {
      return t.parentNode;
    });

  /* ---- 1. The deal: where each tile sits relative to the middle of the wall. ---- */
  var measure = function () {
    /* Layout offsets, not getBoundingClientRect: offsets ignore transforms, so a tile measured
       halfway through its deal still reports its resting place. The grid is the offset parent. */
    var mx = wall.clientWidth / 2,
      my = wall.clientHeight / 2;
    cells.forEach(function (li, i) {
      var cx = li.offsetLeft + li.offsetWidth / 2,
        cy = li.offsetTop + li.offsetHeight / 2;
      li.style.setProperty('--dx', (mx - cx).toFixed(1) + 'px');
      li.style.setProperty('--dy', (my - cy).toFixed(1) + 'px');
      /* Alternate a few degrees either way, the way a hand of cards lies. */
      li.style.setProperty('--r', (((i % 3) - 1) * 4 + (i % 2 ? 2 : -2)).toFixed(1) + 'deg');
    });
  };
  if (!reduce) {
    measure();
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(wall);
    else addEventListener('resize', measure);
  }

  /* ---- 2. Logo to live site. ---- */
  var load = function (t) {
    var still = t.querySelector('.lw-still'),
      v = t.querySelector('video');
    if (still && !still.src) still.src = still.dataset.src;
    if (v && !v.src) v.src = v.dataset.src;
    return v;
  };
  var live = function (t, on) {
    if (reduce || saveData) return;
    var v = on ? load(t) : t.querySelector('video');
    t.classList.toggle('live', on);
    if (!v) return;
    if (on) {
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    } else {
      v.pause();
    }
  };
  tiles.forEach(function (t) {
    t.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') live(t, true);
    });
    t.addEventListener('pointerleave', function () {
      live(t, false);
    });
    t.addEventListener('focus', function () {
      if (t.matches(':focus-visible')) live(t, true);
    });
    t.addEventListener('blur', function () {
      live(t, false);
    });
  });

  /* Touch: the tile in the middle of the screen plays once scrolling settles, for five seconds. */
  if (
    matchMedia('(hover: none)').matches &&
    !reduce &&
    !saveData &&
    'IntersectionObserver' in window
  ) {
    var cur = null,
      wait = 0,
      stop = 0;
    var io = new IntersectionObserver(
      function (es) {
        es.forEach(function (e) {
          var t = e.target.querySelector('.lw');
          if (e.isIntersecting) {
            clearTimeout(wait);
            wait = setTimeout(function () {
              if (cur && cur !== t) live(cur, false);
              cur = t;
              live(t, true);
              clearTimeout(stop);
              stop = setTimeout(function () {
                if (cur === t) live(t, false);
              }, 5000);
            }, 400);
          } else if (cur === t) {
            clearTimeout(stop);
            live(t, false);
            cur = null;
          }
        });
      },
      { rootMargin: '-42% 0px -42% 0px' },
    );
    /* Nothing is watched until the first scroll, so a page that is only looked at costs no video. */
    addEventListener(
      'scroll',
      function () {
        cells.forEach(function (li) {
          io.observe(li);
        });
      },
      { once: true, passive: true },
    );
  }

  /* ---- 3. Tilt, for a mouse only. ---- */
  if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    tiles.forEach(function (t) {
      var frame = 0,
        px = 0,
        py = 0;
      var paint = function () {
        frame = 0;
        /* Measured on the cell, which does not tilt, so the tilt never feeds back into itself.
           --px and --py run from -0.5 to 0.5; home.css turns them into the tilt and the logo's
           drift. */
        var r = t.parentNode.getBoundingClientRect(),
          x = Math.max(-0.5, Math.min(0.5, (px - r.left) / r.width - 0.5)),
          y = Math.max(-0.5, Math.min(0.5, (py - r.top) / r.height - 0.5));
        t.style.setProperty('--px', x.toFixed(3));
        t.style.setProperty('--py', y.toFixed(3));
      };
      t.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        px = e.clientX;
        py = e.clientY;
        t.classList.add('tilting');
        if (!frame) frame = requestAnimationFrame(paint);
      });
      t.addEventListener('pointerleave', function () {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        t.classList.remove('tilting');
        t.style.setProperty('--px', '0');
        t.style.setProperty('--py', '0');
      });
    });
  }
}
