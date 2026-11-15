/* The results line under the home headline (index.astro, kit.css `.proof`): once the headline has
   landed, step through each client figure once, about a second and a half apiece, and come back to
   rest on the first. It runs once and stops, so nothing on the first screen keeps moving. A pointer
   resting on it holds the current figure. Reduced motion, or no script, leaves the first figure
   where it is; the full list is always there for a screen reader. */
(function () {
  var box = document.querySelector('[data-proof]');
  if (!box || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var items = [].slice.call(box.querySelectorAll('.proof-i'));
  if (items.length < 2) return;
  var at = 0,
    held = false,
    step = 1500;
  box.addEventListener('pointerenter', function () {
    held = true;
  });
  box.addEventListener('pointerleave', function () {
    held = false;
  });
  var go = function () {
    if (held) return setTimeout(go, 400);
    var prev = items[at];
    at = (at + 1) % items.length;
    prev.classList.remove('on');
    prev.classList.add('off');
    items[at].classList.remove('off');
    items[at].classList.add('on');
    /* Clear the exit class once the old item has left, so it comes in from below next time. */
    setTimeout(function () {
      prev.classList.remove('off');
    }, 520);
    if (at !== 0) setTimeout(go, step);
  };
  setTimeout(go, 1900 + step);
})();
