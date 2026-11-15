/* Prices: the tier cards turn over. The front says who a tier fits and what it costs; the back
   says what I take responsibility for, what happens if you ever move on, and what is included.
   It is About's "Off the clock" turn (off-the-clock.js), copied small because that file also runs
   About's photo stacks: a real button with aria-expanded, the face you cannot see is inert so Tab
   never lands on something turned away, turning moves focus to the back, and "Turn back" returns
   it to the button that turned the card. The buttons carry data-otc-turn and data-otc-back, so
   the cursor caption says "Turn" over them (cursor.js).

   All of the turning is CSS (prices.css, under `.js` on a screen): this only sets the state. On a
   narrow screen the face turned away is taken out of the flow so a card is only as tall as the
   face showing, and the height eases from one to the other here. Reduced motion: the faces swap
   with no turn and no easing. No script, and print: both faces are one open card. */
import { ui } from './kit.js';

var narrow = matchMedia('(max-width: 59.99rem)');

[].forEach.call(document.querySelectorAll('[data-turn]'), function (li) {
  var box = li.querySelector('.t-turn'),
    front = li.querySelector('.t-front'),
    back = li.querySelector('.t-back'),
    turn = li.querySelector('[data-otc-turn]'),
    home = li.querySelector('[data-otc-back]'),
    an = null;
  if (!box || !front || !back || !turn || !home) return;
  function set(over, byHand) {
    var from = box.offsetHeight;
    li.classList.toggle('over', over);
    turn.setAttribute('aria-expanded', String(over));
    front.inert = over;
    back.inert = !over;
    if (!byHand) return;
    if (ui.cue) ui.cue('turn');
    (over ? back : turn).focus({ preventScroll: true });
    if (!narrow.matches) return;
    /* The card is now as tall as its other face. Ease there, then make sure its top is on screen:
       turning back from a long list can leave the short front above the fold. */
    var to = box.offsetHeight;
    if (an) an.cancel();
    if (!ui.reduce && from !== to && box.animate) {
      an = box.animate(
        { height: [from + 'px', to + 'px'] },
        { duration: 620, easing: 'cubic-bezier(.3,1.2,.5,1)' },
      );
      an.onfinish = an.oncancel = function () {
        an = null;
      };
    }
    if (li.getBoundingClientRect().top < 80)
      li.scrollIntoView({ block: 'start', behavior: ui.reduce ? 'auto' : 'smooth' });
  }
  set(false, false);
  turn.addEventListener('click', function () {
    set(true, true);
  });
  home.addEventListener('click', function () {
    set(false, true);
  });
  /* Before printing, every card shows its front again (print lays both faces out anyway). */
  addEventListener('beforeprint', function () {
    set(false, false);
  });
});
