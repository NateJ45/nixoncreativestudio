/* A quote band with every quote on file (QuoteBand `cycle`): Previous and Next step through them,
   and the band takes each client's color and phone as it goes. The buttons sit beside the label at
   the top, so they never move under your finger. The hidden quotes are inert, so only the one you can
   see is read out or reachable by Tab.

   The band fits the quote in front of you (kit.css hides the others), so a short quote is not left
   floating in a band cut for the longest. Stepping eases the quotes' height from the old to the new
   rather than jumping the page below; under reduced motion it just changes. */
var still = window.matchMedia('(prefers-reduced-motion: reduce)');
[].forEach.call(document.querySelectorAll('[data-cycle]'), function (band) {
  var slides = [].slice.call(band.querySelectorAll('[data-q]')),
    tiles = [].slice.call(band.querySelectorAll('[data-tw]')),
    count = band.querySelector('[data-q-count]'),
    box = band.querySelector('.band-q'),
    ease,
    at = 0;
  var show = function (i) {
    var from = box.offsetHeight;
    if (ease) ease.cancel();
    at = (i + slides.length) % slides.length;
    var s = slides[at];
    slides.forEach(function (el, j) {
      el.inert = j !== at;
    });
    tiles.forEach(function (el) {
      el.inert = el.dataset.tw !== s.dataset.slug;
    });
    band.classList.add('stepped');
    /* The marker on the key phrase draws again for the quote that has just come in. */
    band.classList.remove('hl-on');
    void band.offsetWidth;
    band.classList.add('hl-on');
    band.style.setProperty('--c', s.dataset.c);
    band.style.setProperty('--p', s.dataset.p);
    count.textContent = at + 1 + ' / ' + slides.length;
    var to = box.offsetHeight;
    if (from !== to && !still.matches && box.animate)
      ease = box.animate([{ height: from + 'px' }, { height: to + 'px' }], {
        duration: 450,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      });
  };
  band.querySelector('[data-q-prev]').addEventListener('click', function () {
    show(at - 1);
  });
  band.querySelector('[data-q-next]').addEventListener('click', function () {
    show(at + 1);
  });
  band.querySelector('[data-q-nav]').hidden = false;
});
