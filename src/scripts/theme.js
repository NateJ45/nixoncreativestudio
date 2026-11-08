/* The flip. The theme itself is one attribute on <html>, set before paint by ThemeBoot.astro. This
   turns it over: the page rotates away on its vertical axis like a card and comes back showing the
   other side. Reduced motion, or a browser with no view transitions, simply swaps. */

var root = document.documentElement;
var KEY = 'ncs-theme';
var GROUND = { light: '#f5f5f3', dark: '#14162f' };
var meta = document.querySelector('meta[name="theme-color"]');
var buttons = document.querySelectorAll('[data-theme-flip]');
var system = matchMedia('(prefers-color-scheme: dark)');
var reduce = matchMedia('(prefers-reduced-motion: reduce)');

function saved() {
  try {
    return localStorage.getItem(KEY);
  } catch (e) {
    return null;
  }
}

/* The switches name what they will do ("Dark mode" or "Light mode"); CSS picks the label from the
   theme attribute, so turning the page over is all this has to do. */
function show(theme) {
  root.dataset.theme = theme;
  if (meta) meta.content = GROUND[theme];
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

buttons.forEach(function (b) {
  b.addEventListener('click', function () {
    var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(KEY, next);
    } catch (e) {}
    turn(next);
  });
});

/* With no choice made, the page keeps following the device. */
system.addEventListener('change', function (e) {
  var choice = saved();
  if (choice !== 'light' && choice !== 'dark') turn(e.matches ? 'dark' : 'light');
});
