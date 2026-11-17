/* The signature writes itself (src/components/ephemera/Signature.astro, src/styles/ephemera/signature.css).
   Nothing is fetched until a signature is wanted. One already on screen when the page loads gets
   the finished drawing (signature.svg#still), so nothing ever blinks out, and so does every one
   when there is no IntersectionObserver. Any other waits, blank, and the first time it comes into
   view gets the moving drawing (its data-sig-src, public/assets/signature.svg?at=..., one clock
   per placement), which draws its strokes in order from the moment it loads; under reduced motion
   it gets the finished drawing instead. Once only.
   data-sig-after (ms) holds the pen a moment longer, for a signature that sits on something still
   arriving (the printing receipt, the closing's last card). */
(function () {
  var sigs = [].slice.call(document.querySelectorAll('[data-sig]'));
  if (!sigs.length) return;
  var show = function (el, src) {
    el.style.setProperty('--sig-go', 'url("' + src + '")');
    el.dataset.sig = 'go';
  };
  var still = '/assets/signature.svg#still';
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var watch = 'IntersectionObserver' in window;
  var io =
    watch &&
    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          io.unobserve(el);
          setTimeout(function () {
            show(el, calm ? still : el.dataset.sigSrc);
          }, +el.dataset.sigAfter || 0);
        });
      },
      /* Most of it in view, so the first strokes are seen being made. */
      { threshold: 0.8 },
    );
  sigs.forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (!watch || (r.bottom > 0 && r.top < innerHeight && r.width)) show(el, still);
    else io.observe(el);
  });
})();
