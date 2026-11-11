/* The segmented bar (src/styles/seg-bar.css): the sliding pill under the pressed button in each
   .dw-seg, and the ink bloom a press draws. /work (work.js) and /journal (journal.js) both use it. */

var $$ = function (a, r) {
  return [].slice.call(r.querySelectorAll(a));
};

/* Move each group's pill under its pressed button. */
export function setPill(bar) {
  $$('.dw-seg', bar).forEach(function (seg) {
    var on = seg.querySelector('button[aria-pressed=true]'),
      pill = seg.querySelector('[data-pill]');
    if (!on || !pill) return;
    pill.style.width = on.offsetWidth + 'px';
    pill.style.height = on.offsetHeight + 'px';
    pill.style.transform = 'translate(' + on.offsetLeft + 'px,' + on.offsetTop + 'px)';
  });
}

/* The ink. A press blooms a circle of the pill's blue inside the button, from the pointer, or from the
   centre when Enter or Space pressed it. The circle holds a white copy of the label, so each letter is
   ink on the card or white on the blue at every moment (AA throughout). It grows on a quick spring,
   waits for the sliding pill to arrive under it, and is taken away: by then the two look the same.
   Callers skip it under reduced motion. */
export function bloom(b, e) {
  var bar = b.closest('.dw-bar') || b.parentNode;
  var r = b.getBoundingClientRect(),
    x = e.detail > 0 && e.clientX ? e.clientX - r.left : r.width / 2,
    y = e.detail > 0 && e.clientY ? e.clientY - r.top : r.height / 2;
  var far = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y)) + 1;
  $$('.dw-ink', bar).forEach(function (old) {
    old.remove();
  });
  $$('button.inking', bar).forEach(function (o) {
    o.classList.remove('inking');
  });
  var ink = document.createElement('span');
  ink.className = 'dw-ink';
  ink.setAttribute('aria-hidden', 'true');
  ink.innerHTML = b.innerHTML;
  b.classList.add('inking');
  b.appendChild(ink);
  var at = function (rad) {
    return 'circle(' + rad.toFixed(1) + 'px at ' + x.toFixed(1) + 'px ' + y.toFixed(1) + 'px)';
  };
  ink.animate(
    [{ clipPath: at(0) }, { clipPath: at(far * 1.04), offset: 0.7 }, { clipPath: at(far) }],
    {
      duration: 420,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      fill: 'forwards',
    },
  );
  setTimeout(function () {
    ink.remove();
    b.classList.remove('inking');
  }, 640);
}
