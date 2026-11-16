/* The flip. The theme itself is one attribute on <html>, set before paint by ThemeBoot.astro. This
   turns it over: the page rotates away on its vertical axis like a card and comes back showing the
   other side. Reduced motion, or a browser with no view transitions, simply swaps. */
import { cue } from './sound.js';

var root = document.documentElement;
var KEY = 'ncs-theme';
var GROUND = { light: '#f5f5f3', dark: '#14162f' };
var meta = document.querySelector('meta[name="theme-color"]');
var buttons = document.querySelectorAll('[data-theme-flip]');
/* The dock's theme hand: one card a side, which says which side you are on. */
var picks = document.querySelectorAll('[data-theme-set]');
var reduce = matchMedia('(prefers-reduced-motion: reduce)');

/* The switches name what they will do ("Dark mode" or "Light mode"); CSS picks the label from the
   theme attribute, so turning the page over is all this has to do. */
function show(theme) {
  root.dataset.theme = theme;
  if (meta) meta.content = GROUND[theme];
  picks.forEach(function (p) {
    p.setAttribute('aria-pressed', String(p.dataset.themeSet === theme));
  });
}

function turn(theme) {
  if (reduce.matches || !document.startViewTransition) {
    show(theme);
    return;
  }
  root.classList.add('flipping');
  var done = function () {
    root.classList.remove('flipping');
  };
  document
    .startViewTransition(function () {
      show(theme);
    })
    .finished.then(done, done);
}

show(root.dataset.theme === 'dark' ? 'dark' : 'light');

function choose(next) {
  try {
    localStorage.setItem(KEY, next);
  } catch (e) {}
  cue('turn');
  turn(next);
}

buttons.forEach(function (b) {
  b.addEventListener('click', function () {
    choose(root.dataset.theme === 'dark' ? 'light' : 'dark');
  });
});

picks.forEach(function (p) {
  p.addEventListener('click', function () {
    if (p.dataset.themeSet !== root.dataset.theme) choose(p.dataset.themeSet);
  });
});

/* The device's own light or dark setting is not followed: the page opens light, and dark is a
   choice made with the flip (ThemeBoot.astro). */
