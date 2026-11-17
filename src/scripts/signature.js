/* The signature writes itself (src/components/ephemera/Signature.astro, src/styles/ephemera/signature.css).
   Each signature not on screen yet is set to "wait" (blank), and the first time it comes into view
   it is set to "go" with the moving drawing (its data-sig-src, public/assets/signature.svg?at=...),
   which draws its strokes in order from the moment it loads. Once only. With no script, under
   reduced motion, or with no IntersectionObserver, nothing is set and the finished drawing simply
   stays. A signature already on screen when the page loads stays drawn too, so nothing ever blinks
   out. data-sig-after (ms) holds the pen a moment longer, for a signature that sits on something
   that is still arriving (the printing receipt, the closing's last card). */
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var sigs = [].slice.call(document.querySelectorAll('[data-sig]'));
  if (!sigs.length) return;
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        setTimeout(function () {
          el.style.setProperty('--sig-go', 'url("' + el.dataset.sigSrc + '")');
          el.dataset.sig = 'go';
        }, +el.dataset.sigAfter || 0);
      });
    },
    /* Most of it in view, so the first strokes are seen being made. */
    { threshold: 0.8 },
  );
  sigs.forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight && r.width) return;
    el.dataset.sig = 'wait';
    io.observe(el);
  });
})();
