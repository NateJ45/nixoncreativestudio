/* The favicon turns over when you come back. Leave the tab for three seconds or more, return, and
   the N card in the tab flips like a playing card: it squeezes to an edge, shows its plain blue
   back, and turns again to the N, in about 600ms, once per return. Then the real /favicon.svg is
   put back. The frames are drawn from that same file (fetched once, while the tab is away), so the
   colors stay the favicon's own. Reduced motion skips it, a tab that was never hidden never flips,
   and the .ico link is left alone. */
import { ui } from './kit.js';

var link = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
var AWAY = 3000,
  STEP = 75;

if (link && !ui.reduce && 'visibilityState' in document) {
  var original = link.getAttribute('href'),
    frames = null,
    hiddenAt = 0,
    flipping = false;

  /* One frame: the card at a horizontal squeeze, face up (the N) or face down (the back). */
  var draw = function (svg, sx, face) {
    var rect = svg.querySelector('rect'),
      mark = svg.querySelector('path');
    var w = svg.getAttribute('width') || '64';
    var inner = face ? rect.outerHTML + mark.outerHTML : rect.outerHTML + back(rect, mark);
    var c = Number(w) / 2;
    var out =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      w +
      '" height="' +
      (svg.getAttribute('height') || w) +
      '" viewBox="' +
      (svg.getAttribute('viewBox') || '0 0 64 64') +
      '"><g transform="translate(' +
      c +
      ' 0) scale(' +
      sx +
      ' 1) translate(-' +
      c +
      ' 0)">' +
      inner +
      '</g></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(out);
  };
  /* The back of the card: the same blue with a faint inner rule, like the .keyed border on the deck. */
  var back = function (rect, mark) {
    var size = Number(rect.getAttribute('width') || 64),
      r = Number(rect.getAttribute('rx') || 14);
    return (
      '<rect x="6" y="6" width="' +
      (size - 12) +
      '" height="' +
      (size - 12) +
      '" rx="' +
      Math.max(0, r - 6) +
      '" fill="none" stroke="' +
      mark.getAttribute('fill') +
      '" stroke-opacity=".45" stroke-width="3"/>'
    );
  };
  var load = function () {
    if (frames) return;
    frames = [];
    fetch(original)
      .then(function (r) {
        return r.text();
      })
      .then(function (text) {
        var svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
        if (!svg.querySelector('rect') || !svg.querySelector('path')) return;
        /* Squeeze to the edge, the back turns through, then the N comes round again. */
        frames = [
          draw(svg, 0.55, true),
          draw(svg, 0.1, true),
          draw(svg, 0.55, false),
          draw(svg, 1, false),
          draw(svg, 0.55, false),
          draw(svg, 0.1, false),
          draw(svg, 0.55, true),
        ];
      })
      .catch(function () {
        /* No frames, no flip. */
      });
  };
  var flip = function () {
    if (flipping || !frames || !frames.length) return;
    flipping = true;
    var i = 0;
    var tick = function () {
      if (i < frames.length) {
        link.setAttribute('href', frames[i++]);
        setTimeout(tick, STEP);
      } else {
        link.setAttribute('href', original);
        flipping = false;
      }
    };
    tick();
  };
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      hiddenAt = performance.now();
      load();
    } else if (hiddenAt) {
      var away = performance.now() - hiddenAt;
      hiddenAt = 0;
      if (away >= AWAY) flip();
    }
  });
}
