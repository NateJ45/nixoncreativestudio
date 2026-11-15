/* The results line under the home headline (index.astro, kit.css `.proof`): once the headline has
   landed, step through every client figure on a loop. Each one stays up as long as it takes to
   read (a beat plus a little per character), and the ring beside it is the timer: its CSS arc
   fills over that time and, when it ends, the next figure comes in. So everything that holds the
   arc holds the line too: a pointer resting on it, the ring pressed as Pause (WCAG 2.2.2), or the
   hero scrolled out of view. As a figure arrives its number counts up from zero, and the line
   eases to that figure's width so it stays centred under the headline. Reduced motion, or no
   script, leaves the first figure where it is; the full list is always there for a screen reader. */
(function () {
  var box = document.querySelector('[data-proof]');
  if (!box || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var run = box.querySelector('.proof-run'),
    ring = box.querySelector('[data-proof-pause]'),
    items = [].slice.call(box.querySelectorAll('.proof-i'));
  if (!run || !ring || items.length < 2) return;
  var at = 0;

  /* Reading time: about 1.4s to take in the figure, then 45ms a character, held to 2.6 to 4.4s. */
  var dwell = function (el) {
    var n = el.textContent.replace(/\s+/g, ' ').trim().length;
    return Math.max(2600, Math.min(4400, 1400 + n * 45));
  };

  /* The figure's own text, split into what counts (the number) and what stays (a "$", "About ",
     a "%"). "Next morning" has no number and simply appears. */
  items.forEach(function (el) {
    var b = el.querySelector('b');
    var m = b && b.textContent.match(/^(\D*?)([\d,]+(?:\.\d+)?)(\D*)$/);
    if (!m) return;
    var digits = m[2].replace(/,/g, '');
    b.dataset.pre = m[1];
    b.dataset.num = digits;
    b.dataset.dp = (digits.split('.')[1] || '').length;
    b.dataset.post = m[3];
  });
  var count = function (b) {
    if (!b || !b.dataset.num) return;
    var to = parseFloat(b.dataset.num),
      dp = +b.dataset.dp,
      t0 = performance.now(),
      len = 700;
    var fmt = function (v) {
      return (
        b.dataset.pre +
        v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }) +
        b.dataset.post
      );
    };
    var tick = function (now) {
      var p = Math.min(1, (now - t0) / len);
      b.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* Size the line to one item: its full width (the figure at its final value). On a narrow phone a
     long item is set a little smaller until it fits the space beside the ring, never cut off. */
  var fit = function (el) {
    var host = box.parentElement,
      cs = getComputedStyle(host),
      room =
        host.clientWidth -
        parseFloat(cs.paddingLeft) -
        parseFloat(cs.paddingRight) -
        ring.offsetWidth -
        parseFloat(getComputedStyle(box).columnGap || 0);
    el.style.fontSize = '';
    var w = el.scrollWidth;
    if (w > room) {
      el.style.fontSize = (room / w).toFixed(3) + 'em';
      w = el.scrollWidth;
    }
    run.style.setProperty('--w', Math.ceil(w) + 'px');
  };

  var start = function () {
    ring.style.setProperty('--dwell', dwell(items[at]) + 'ms');
    ring.classList.remove('run');
    void ring.offsetWidth;
    ring.classList.add('run');
  };

  var next = function () {
    var prev = items[at];
    at = (at + 1) % items.length;
    var el = items[at];
    prev.classList.remove('on');
    prev.classList.add('off');
    el.classList.remove('off');
    fit(el);
    el.classList.add('on');
    count(el.querySelector('b'));
    /* Clear the exit class once the old item has left, so it comes in from below next time. */
    setTimeout(function () {
      prev.classList.remove('off');
    }, 520);
    start();
  };

  ring.addEventListener('animationend', next);
  ring.addEventListener('click', function () {
    var paused = ring.getAttribute('aria-pressed') !== 'true';
    ring.setAttribute('aria-pressed', String(paused));
    ring.setAttribute(
      'aria-label',
      paused ? 'Play the client results' : 'Pause the client results',
    );
  });

  /* Wait while the hero is off screen, so a returning visitor picks up where they left off. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      box.classList.toggle('idle', !e[0].isIntersecting);
    }).observe(box);
  }
  addEventListener('resize', function () {
    fit(items[at]);
  });

  ring.hidden = false;
  fit(items[0]);
  /* Measure again once the web font is in, or the first line can be cut short. */
  if (document.fonts) {
    document.fonts.ready.then(function () {
      fit(items[at]);
    });
  }
  /* The first figure is already up; give the headline time to land before its ring starts. */
  setTimeout(start, 1900);
})();
