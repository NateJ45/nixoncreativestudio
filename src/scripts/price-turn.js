/* The price cards turn over (src/components/PriceHand.astro, src/styles/price-turn.css). The same
   rules as About's "Off the clock" cards (off-the-clock.js): a real button with aria-expanded
   turns the card, the face you cannot see is inert so Tab never lands on something turned away,
   turning moves focus to the back, and "Turn back" returns it to the button that turned it.
   Escape on the back turns it home too. The turn itself is CSS, so reduced motion is answered
   there (the faces swap with no turn).

   The front link is left exactly as it was, so price-morph.js still finds `a.pc-face` and the
   card still grows into its tier. */
import { ui } from './kit.js';

[].forEach.call(document.querySelectorAll('[data-pt]'), function (pc) {
  var front = pc.querySelector('.pc-face'),
    back = pc.querySelector('.pt-back'),
    turn = pc.querySelector('[data-pt-turn]'),
    home = pc.querySelector('[data-pt-back]');
  if (!front || !back || !turn || !home) return;
  function set(over, moveFocus) {
    pc.classList.toggle('over', over);
    turn.setAttribute('aria-expanded', String(over));
    front.inert = over;
    turn.inert = over;
    back.inert = !over;
    if (!moveFocus) return;
    ui.cue('turn');
    (over ? back : turn).focus({ preventScroll: true });
  }
  set(false, false);
  turn.addEventListener('click', function () {
    set(true, true);
  });
  home.addEventListener('click', function () {
    set(false, true);
  });
  back.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') set(false, true);
  });
});

/* Back from the Prices page (bfcache) restores the page as it was left, turned cards included.
   That is fine: the classes, aria-expanded and inert all came back together. */
