/* About, below the fold: the "Off the clock" cards that turn over, and the bio's photo stacks.
   Both are real buttons with aria-expanded, so a screen reader hears what each one does and
   whether it is open. Reduced motion is handled in CSS (no turn, no fan). */

/* ---- Off the clock (src/components/OffTheClock.astro) ----------------------------------------
   The face you can't see is inert, so Tab never lands on a link that is turned away. Turning a
   card moves focus to its back, and "Turn back" returns focus to the button that turned it. */
[].forEach.call(document.querySelectorAll('[data-otc]'), function (otc) {
  var front = otc.querySelector('.otc-front'),
    back = otc.querySelector('.otc-back'),
    turn = otc.querySelector('[data-otc-turn]'),
    home = otc.querySelector('[data-otc-back]');
  function set(over, moveFocus) {
    otc.classList.toggle('over', over);
    turn.setAttribute('aria-expanded', String(over));
    front.inert = over;
    back.inert = !over;
    if (moveFocus) (over ? back : turn).focus({ preventScroll: true });
  }
  set(false, false);
  turn.addEventListener('click', function () {
    set(true, true);
  });
  home.addEventListener('click', function () {
    set(false, true);
  });
});

/* ---- Photo stacks (src/components/PhotoStack.astro) ------------------------------------------
   Up while a mouse is over the word or its photos, while the word has keyboard focus, or after a
   tap or a click pins it. Escape puts every stack away (WCAG 1.4.13). Before it rises the stack is
   nudged sideways to stay on screen, and drops below the word when there is no room above. */
var stacks = [].map.call(document.querySelectorAll('[data-ps]'), function (el) {
  return {
    el: el,
    btn: el.querySelector('.ps-w'),
    pile: el.querySelector('.ps-pile'),
    hover: false,
    focus: false,
    pinned: false,
  };
});
function place(s) {
  s.el.style.setProperty('--nx', '0px');
  s.el.classList.remove('below');
  var r = s.pile.getBoundingClientRect(),
    m = 16,
    nx = 0;
  if (r.left < m) nx = m - r.left;
  else if (r.right > innerWidth - m) nx = innerWidth - m - r.right;
  s.el.style.setProperty('--nx', nx.toFixed(1) + 'px');
  if (r.top < m) s.el.classList.add('below');
}
function sync(s) {
  var open = s.hover || s.focus || s.pinned;
  if (open === s.el.classList.contains('open')) return;
  s.el.classList.toggle('open', open);
  s.btn.setAttribute('aria-expanded', String(open));
  if (open) place(s);
}
stacks.forEach(function (s) {
  s.el.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'mouse') {
      s.hover = true;
      sync(s);
    }
  });
  s.el.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse') {
      s.hover = false;
      sync(s);
    }
  });
  s.btn.addEventListener('focus', function () {
    if (s.btn.matches(':focus-visible')) {
      s.focus = true;
      sync(s);
    }
  });
  s.btn.addEventListener('blur', function () {
    s.focus = false;
    s.pinned = false;
    sync(s);
  });
  /* A tap, a click or Enter pins it up (a mouse has usually raised it already by hovering), and
     the next one puts it away. */
  s.btn.addEventListener('click', function () {
    s.pinned = !s.pinned;
    if (!s.pinned) s.hover = s.focus = false;
    sync(s);
  });
});
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  stacks.forEach(function (s) {
    s.hover = s.focus = s.pinned = false;
    sync(s);
  });
});
/* A tap anywhere else puts a pinned stack away. */
document.addEventListener('pointerdown', function (e) {
  stacks.forEach(function (s) {
    if (s.pinned && !s.el.contains(e.target)) {
      s.pinned = false;
      sync(s);
    }
  });
});
