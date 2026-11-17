/* The peeling stamps (src/components/ephemera/Stamp.astro, styles in src/styles/stamp.css).
   Hover and keyboard focus lift one in CSS alone; a tap or a click holds it up, and the next one
   lets it down. Moved here unchanged from about.js so any page with a stamp gets it. */
import { ui } from './kit.js';

[].forEach.call(document.querySelectorAll('[data-peel]'), function (b) {
  b.addEventListener('click', function () {
    var up = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(up));
    if (ui.cue) ui.cue('tick');
  });
});
