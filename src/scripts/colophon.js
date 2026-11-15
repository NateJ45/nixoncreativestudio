/* /colophon: "This page, right now". Live facts about the page you are reading, measured here in
   your browser, so the colophon shows its working instead of a number I typed.

   - Transferred: the bytes this page and everything it fetched took over the network, and how
     many requests that was (Resource Timing: the navigation entry plus every resource entry). A
     file your browser already had costs nothing, so a second visit reads lighter, and a file from
     another site that does not share its timing counts as a request with no size. Lazy pictures
     that load as you scroll are added as they arrive (a PerformanceObserver), so the figure keeps
     up with the page.
   - Fonts: the faces the page has really loaded (document.fonts), grouped by family.
   - Theme and motion: which side you are on and whether you chose it, and whether you asked for
     reduced motion. The theme row follows the flip in the dock as it happens.
   - Built: printed at build time, so it needs no script and is in the markup.

   The figures carry data-roll (roll.js): one written while it is below the fold is set quietly
   and rolls in when it arrives; one already on screen rolls from the old figure to the new.
   Under reduced motion ui.roll just sets the text. With no script the measured rows are hidden
   (colophon.css) and a line says why; the build row stays. */
import { ui } from './kit.js';

var doc = document,
  root = doc.documentElement,
  box = doc.querySelector('[data-live]');

if (box) {
  var kbEl = box.querySelector('[data-live-kb]'),
    reqEl = box.querySelector('[data-live-req]'),
    fontEl = box.querySelector('[data-live-fonts]'),
    themeEl = box.querySelector('[data-live-theme]'),
    motionEl = box.querySelector('[data-live-motion]');

  // A figure rolls only where someone can see it; below the fold roll.js rolls it on arrival.
  var put = function (el, text) {
    if (!el || el.textContent.trim() === text) return;
    var r = el.getBoundingClientRect();
    ui.roll(el, text, { still: r.top >= innerHeight || r.bottom <= 0 });
  };

  var weigh = function () {
    var all = performance
        .getEntriesByType('navigation')
        .concat(performance.getEntriesByType('resource')),
      bytes = 0;
    all.forEach(function (e) {
      bytes += e.transferSize || 0;
    });
    // One decimal under 100 KB, whole kilobytes above, with thousands marked.
    var kb = bytes / 1024;
    put(kbEl, kb < 100 ? kb.toFixed(1) : Math.round(kb).toLocaleString('en-US'));
    put(reqEl, String(all.length));
  };

  var fonts = function () {
    if (!doc.fonts || !fontEl) return;
    var fam = {};
    doc.fonts.forEach(function (f) {
      if (f.status !== 'loaded') return;
      var name = f.family.replace(/^["']|["']$/g, '');
      (fam[name] = fam[name] || []).push(f.weight);
    });
    var names = Object.keys(fam);
    fontEl.textContent = names.length
      ? names
          .map(function (n) {
            // A variable face reports its range ("100 900"), said "100 to 900"; a static face
            // its one weight. Each weight once, lightest first.
            var w = fam[n]
              .filter(function (x, i, a) {
                return a.indexOf(x) === i;
              })
              .sort(function (a, b) {
                return parseFloat(a) - parseFloat(b);
              })
              .map(function (x) {
                return String(x).replace(/^(\d+) (\d+)$/, '$1 to $2');
              });
            return n + ', weight ' + w.join(', ');
          })
          .join('; ')
      : 'None loaded yet';
  };

  var chosen = function () {
    try {
      return !!localStorage.getItem('ncs-theme');
    } catch (e) {
      return false;
    }
  };
  var theme = function () {
    if (!themeEl) return;
    var dark = root.dataset.theme === 'dark';
    themeEl.textContent =
      (dark ? 'Dark' : 'Light') + (chosen() ? ', the side you picked' : ', from your system');
  };

  var motion = function () {
    if (!motionEl) return;
    motionEl.textContent = ui.reduce
      ? 'Reduced, as your system asks: nothing moves on its own'
      : 'Full: your system has not asked for less';
  };

  theme();
  motion();
  // The theme row turns with the page.
  new MutationObserver(theme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  // Resource Timing is complete for the first load once the load event has run.
  var settle = function () {
    weigh();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fonts);
    else fonts();
    // Pictures and films fetched later (lazy, as you scroll) are added as they land, a beat
    // after the last one so a burst of them is one roll.
    if ('PerformanceObserver' in window) {
      var t = 0;
      try {
        new PerformanceObserver(function () {
          clearTimeout(t);
          t = setTimeout(function () {
            weigh();
            fonts();
          }, 400);
        }).observe({ type: 'resource', buffered: false });
      } catch (e) {
        /* an old browser: the first measure stands */
      }
    }
  };
  if (doc.readyState === 'complete') settle();
  else addEventListener('load', settle, { once: true });
}
