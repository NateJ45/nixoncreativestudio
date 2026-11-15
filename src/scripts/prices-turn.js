/* Prices: the tier cards turn over. The front says who a tier fits and what it costs; the back
   says what I take responsibility for, what happens if you ever move on, and what is included.
   It is About's "Off the clock" turn (off-the-clock.js), copied small because that file also runs
   About's photo stacks: a real button with aria-expanded, the face you cannot see is inert so Tab
   never lands on something turned away, turning moves focus to the back, and "Turn back" returns
   it to the button that turned the card. The buttons carry data-otc-turn and data-otc-back, so
   the cursor caption says "Turn" over them (cursor.js).

   The turn itself is CSS (prices.css, under `.js` on a screen): this sets the state and the height.
   A card at rest is as tall as its front.
   - Three across (from 60rem): the back lies over the front and takes no room. Turning springs
     the card's --grow from 0 to the back's extra height (ui.spring, so it has the house weight),
     and the list's --tgrow follows the largest grow, so the page below moves on the same spring
     while the cards beside it stay put. Turning back springs it home to 0.
   - One to a row: the face turned away leaves the flow, and the card's height eases from one face
     to the other.
   Reduced motion: the faces swap and the height is simply there. No script, and print: both faces
   are one open card. */
import { ui } from './kit.js';

var narrow = matchMedia('(max-width: 59.99rem)');
var list = document.querySelector('[data-tiers]');
var cards = [];

/* The page below the list moves with the tallest turned card. */
var setFoot = function () {
  if (!list) return;
  var most = 0;
  cards.forEach(function (c) {
    most = Math.max(most, c.s.x);
  });
  list.style.setProperty('--tgrow', most > 0.5 ? most.toFixed(1) + 'px' : '0px');
};

[].forEach.call(document.querySelectorAll('[data-turn]'), function (li) {
  var box = li.querySelector('.t-turn'),
    front = li.querySelector('.t-front'),
    back = li.querySelector('.t-back'),
    turn = li.querySelector('[data-otc-turn]'),
    home = li.querySelector('[data-otc-back]'),
    an = null;
  if (!box || !front || !back || !turn || !home) return;
  var c = { s: ui.spring(170, 19, 0), to: 0, raf: 0, last: 0 };
  cards.push(c);

  /* How much taller the back is than the front, read with the back at its own height. */
  var extra = function () {
    back.style.height = 'auto';
    var h = back.offsetHeight - box.offsetHeight;
    back.style.height = '';
    return Math.max(0, h);
  };
  var paint = function () {
    li.style.setProperty('--grow', c.s.x.toFixed(1) + 'px');
    setFoot();
  };
  var frame = function (t) {
    c.raf = 0;
    var dt = Math.min(0.033, (t - c.last) / 1000 || 0.016);
    c.last = t;
    var moving = c.s.step(c.to, dt);
    /* A spring can dip below zero on the way home; a card is never shorter than its front. */
    if (c.s.x < 0) c.s.x = 0;
    if (!moving) {
      c.s.x = c.to;
      c.s.v = 0;
    }
    paint();
    if (moving) c.raf = requestAnimationFrame(frame);
    else li.classList.remove('growing');
  };
  /* Spring (or, with reduced motion or no hurry, set) the height to what the face showing needs. */
  var grow = function (animate) {
    if (narrow.matches) {
      c.to = c.s.x = c.s.v = 0;
      if (c.raf) cancelAnimationFrame(c.raf);
      c.raf = 0;
      li.classList.remove('growing');
      paint();
      return;
    }
    c.to = li.classList.contains('over') ? extra() : 0;
    if (!animate || ui.reduce) {
      c.s.x = c.to;
      c.s.v = 0;
      paint();
      return;
    }
    li.classList.add('growing');
    if (!c.raf) {
      c.last = performance.now();
      c.raf = requestAnimationFrame(frame);
    }
  };
  c.grow = grow;

  function set(over, byHand) {
    var from = box.offsetHeight;
    li.classList.toggle('over', over);
    turn.setAttribute('aria-expanded', String(over));
    front.inert = over;
    back.inert = !over;
    grow(byHand);
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

/* A new width wraps the words differently, so a turned card's height is measured again (no spring). */
var again = 0;
addEventListener('resize', function () {
  cancelAnimationFrame(again);
  again = requestAnimationFrame(function () {
    cards.forEach(function (c) {
      c.grow(false);
    });
  });
});
