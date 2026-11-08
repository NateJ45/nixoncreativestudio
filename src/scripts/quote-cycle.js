/* A quote band with every quote on file (QuoteBand `cycle`): Previous and Next step through them,
   and the band takes each client's color and phone as it goes. The slides are stacked in one cell, so
   the band keeps the height of its longest quote and the buttons never move under your finger. The
   hidden ones are inert, so only the quote you can see is read out or reachable by Tab. */
[].forEach.call(document.querySelectorAll('[data-cycle]'), function (band) {
  var slides = [].slice.call(band.querySelectorAll('[data-q]')),
    tiles = [].slice.call(band.querySelectorAll('[data-tw]')),
    count = band.querySelector('[data-q-count]'),
    at = 0;
  var show = function (i) {
    at = (i + slides.length) % slides.length;
    var s = slides[at];
    slides.forEach(function (el, j) {
      el.inert = j !== at;
    });
    tiles.forEach(function (el) {
      el.inert = el.dataset.tw !== s.dataset.slug;
    });
    band.classList.add('stepped');
    band.style.setProperty('--c', s.dataset.c);
    band.style.setProperty('--p', s.dataset.p);
    count.textContent = at + 1 + ' / ' + slides.length;
  };
  band.querySelector('[data-q-prev]').addEventListener('click', function () {
    show(at - 1);
  });
  band.querySelector('[data-q-next]').addEventListener('click', function () {
    show(at + 1);
  });
  band.querySelector('[data-q-nav]').hidden = false;
});
