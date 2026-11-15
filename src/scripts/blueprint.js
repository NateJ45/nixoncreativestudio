/* The first load of a visit, as a drawing. For well under a second the page reads as a print in
   the studio's cobalt, with construction lines and small square anchor points on its main blocks
   (the language of the 404's numerals, src/lib/not-found-art.ts), and then it resolves into the
   finished page.

   The page itself is never hidden, faded or delayed. The real content is painted at full opacity
   from the first frame; what you see is two things laid over it, neither of which can take a click
   or a key:

     1. The ink (elevate.css, html.bp body::before and ::after): two full-screen layers that only
        blend. They turn whatever is under them into one colour, and fade away. They are pure CSS,
        so they are there in the very first paint and they finish by themselves even if this file
        never runs.
     2. The line work (this file): a box with four anchor points round each main block on the first
        screen, and a few long guides through their edges. Drawn once from where the blocks really
        are, then gone.

   When it runs: once per browser session, on the first page only. An inline script in the <head>
   (BaseLayout.astro) decides before the first paint and sets html.bp and window.__bp (the time it
   started). It stands down for reduced motion, for a page that is restored, reloaded or
   prerendered, for a tab opened in the background, and on every later page of the visit, which
   arrives by view transition instead. This file only draws the lines and tidies up. */
var doc = document,
  root = doc.documentElement,
  /* The whole thing, start to finish, in ms. Must match --bp-dur in elevate.css. */
  TOTAL = 850,
  /* Too late to draw lines that would only flash: just let the ink finish. */
  LATE = 380,
  MAX_BOXES = 9;

if (root.classList.contains('bp')) {
  var began = window.__bp || performance.now(),
    elapsed = performance.now() - began,
    layer = null;
  var done = function () {
    root.classList.remove('bp');
    if (layer) layer.remove();
  };
  if (elapsed < LATE) {
    var W = innerWidth,
      H = innerHeight;
    /* The main blocks on the first screen: the name and the status in the top line, the headline,
       windows, cards, buttons and pictures. An element inside one already chosen is left out, so a
       window is one box and not a box round its picture as well. */
    var picked = [];
    [].forEach.call(
      doc.querySelectorAll(
        '.top .mark, .top .status, main h1, main .tile, main .card, main .pc-face, main .chip, main img, main video, main h2',
      ),
      function (el) {
        var r = el.getBoundingClientRect();
        if (r.width < 28 || r.height < 18) return;
        if (r.bottom < 8 || r.top > H - 8 || r.right < 8 || r.left > W - 8) return;
        if (getComputedStyle(el).visibility === 'hidden') return;
        for (var i = 0; i < picked.length; i++) if (picked[i].el.contains(el)) return;
        picked = picked.filter(function (p) {
          return !el.contains(p.el);
        });
        picked.push({ el: el, r: r, area: r.width * r.height });
      },
    );
    /* The biggest few, then back into reading order so the lines draw top to bottom. */
    picked.sort(function (a, b) {
      return b.area - a.area;
    });
    picked = picked.slice(0, MAX_BOXES).sort(function (a, b) {
      return a.r.top - b.r.top || a.r.left - b.r.left;
    });
    if (picked.length) {
      layer = doc.createElement('div');
      layer.className = 'bp-lines';
      layer.setAttribute('aria-hidden', 'true');
      /* Start the lines where the ink already is in its run, so they end together. */
      layer.style.setProperty('--bp-t', -Math.round(elapsed) + 'ms');
      var px = function (n) {
        return Math.round(n) + 'px';
      };
      picked.forEach(function (p, i) {
        var box = doc.createElement('span');
        box.className = 'bp-box';
        box.style.cssText =
          'left:' +
          px(p.r.left) +
          ';top:' +
          px(p.r.top) +
          ';width:' +
          px(p.r.width) +
          ';height:' +
          px(p.r.height) +
          ';--i:' +
          i;
        /* Four anchor points, one a corner. */
        for (var k = 0; k < 4; k++) box.appendChild(doc.createElement('i'));
        layer.appendChild(box);
      });
      /* Guides: a long hairline through the top and the left edge of the three biggest blocks. */
      picked
        .slice()
        .sort(function (a, b) {
          return b.area - a.area;
        })
        .slice(0, 3)
        .forEach(function (p, i) {
          var h = doc.createElement('span'),
            v = doc.createElement('span');
          h.className = 'bp-guide bp-h';
          h.style.cssText = 'top:' + px(p.r.top) + ';--i:' + i;
          v.className = 'bp-guide bp-v';
          v.style.cssText = 'left:' + px(p.r.left) + ';--i:' + i;
          layer.appendChild(h);
          layer.appendChild(v);
        });
      doc.body.appendChild(layer);
    }
  }
  setTimeout(done, Math.max(0, TOTAL - elapsed) + 60);
  /* A scroll or a key in the first second means the visitor is already using the page. */
  ['wheel', 'touchmove', 'keydown'].forEach(function (type) {
    addEventListener(
      type,
      function () {
        if (layer) layer.classList.add('bp-out');
      },
      { once: true, passive: true },
    );
  });
}
