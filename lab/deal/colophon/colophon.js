/* One window, the site's signature object, beside the text. It plays on hover and opens its sheet like everywhere else. */
(function () {
  var ui = window.NCS.ui, el = document.querySelector('[data-colo-win]');
  var s = ui.bySlug('mas-monograms');
  el.innerHTML = ui.tile(s, { lazy: true }) + ui.caption(s);
  ui.wireFootage(el);
})();
