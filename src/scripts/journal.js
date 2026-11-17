/* /journal (src/pages/journal/index.astro): the deck, the list and the chips.

   The deck is the posts stacked newest on top. "Older" deals the top card away to the left and the
   next one comes forward; "Newer" brings the last one back. The arrow keys do the same while focus
   is inside the deck. Only the top card can be reached: the ones behind are inert, so Tab goes from
   the top card's link to the buttons. Under reduced motion the cards simply change places.

   Each card wears its cluster's drawing (src/lib/journal-art.ts). When a card comes to the front
   its lines draw themselves in (the class "draw", journal.css); at load and under reduced motion
   the drawing is simply there. The date rail shows a day once: the day of the card on top is the
   filled one, its count says how many posts that day holds under the chosen chip, and one dot a
   post shows which of them you are on.

   The notebook's divider tabs filter both views at once (a pressed tab stands up, in CSS; the
   ink bloom belongs to the bar's switch), the view switch picks Deck or List, and the address keeps
   both (?cluster=lab&view=list), the way /work does. Until a view is picked the screen decides in
   CSS (journal.css), so nothing moves when the page loads. */
import { ui } from './kit.js';
import { bloom, setPill } from './seg-bar.js';

var doc = document,
  reduce = ui.reduce;
var all = function (a, r) {
  return [].slice.call((r || doc).querySelectorAll(a));
};

var jx = doc.querySelector('[data-jx]');
if (jx) {
  var bar = jx.querySelector('[data-bar]'),
    chips = all('[data-filters] button', jx),
    views = all('[data-views] button', jx),
    statusEl = jx.querySelector('[data-status]'),
    pile = jx.querySelector('[data-pile]'),
    cards = all(':scope > li', pile),
    railItems = all('li', jx.querySelector('[data-rail]')),
    dots = all('[data-dot]', jx),
    rows = all('.sub-rows > li', jx),
    place = jx.querySelector('[data-place]'),
    deal = all('[data-deal]', jx),
    deck = jx.querySelector('[data-deck]');

  var q = new URLSearchParams(location.search);
  var current = chips.some(function (b) {
    return b.dataset.f === q.get('cluster');
  })
    ? q.get('cluster')
    : 'all';
  var view = q.get('view') === 'list' || q.get('view') === 'deck' ? q.get('view') : '';
  var top = 0;

  var matches = function (el) {
    return current === 'all' || el.dataset.key === current;
  };
  var shown = function () {
    return cards.filter(function (li) {
      return !li.hidden;
    });
  };
  /* Which view is on screen: the one picked, or the one the CSS chose for this screen. */
  var onScreen = function () {
    if (view) return view;
    return getComputedStyle(deck).display === 'none' ? 'list' : 'deck';
  };

  /* Every visible card's place in the pile: 0 on top, then 1, 2 behind it; dealt ones are away. */
  function layout() {
    var list = shown();
    list.forEach(function (li, i) {
      var k = i - top;
      li.style.setProperty('--k', String(Math.max(0, k)));
      li.classList.toggle('away', k < 0);
      li.classList.toggle('on-top', k === 0);
      li.classList.toggle('deep', k > 2);
      li.inert = k !== 0;
    });
    var at = list[top];
    railItems.forEach(function (r) {
      r.classList.toggle('now', !!at && r.dataset.day === at.dataset.day);
    });
    dots.forEach(function (d) {
      d.classList.toggle('on', !!at && d.dataset.dot === at.dataset.id);
    });
    place.textContent = list.length ? 'Post ' + (top + 1) + ' of ' + list.length : '';
    deal[0].disabled = top <= 0;
    deal[1].disabled = top >= list.length - 1;
  }

  function move(step) {
    var list = shown(),
      next = Math.min(list.length - 1, Math.max(0, top + step));
    if (next === top) return;
    top = next;
    if (ui.cue) ui.cue('deal');
    layout();
    draw(list[top]);
  }

  /* The card that has just come to the front draws its face: the class restarts the CSS
     animation, and comes off when it ends so the next arrival can start it again. */
  function draw(li) {
    var face = li && li.querySelector('.jf');
    if (!face || reduce) return;
    face.classList.remove('draw');
    void face.getBoundingClientRect();
    face.classList.add('draw');
  }
  pile.addEventListener('animationend', function (e) {
    if (e.animationName === 'jf-points') e.target.closest('.jf').classList.remove('draw');
  });

  /* The rail's days under the chosen chip: a day with nothing showing goes, and the count beside
     the others says how many of its posts are in the pile now. */
  function days(quiet) {
    railItems.forEach(function (r) {
      var n = 0;
      cards.forEach(function (li) {
        if (!li.hidden && li.dataset.day === r.dataset.day) n++;
      });
      r.hidden = n === 0;
      var count = r.querySelector('[data-day-n]'),
        text = n + (n === 1 ? ' post' : ' posts');
      if (count && count.textContent.trim() !== text) ui.roll(count, text, { still: quiet });
    });
    dots.forEach(function (d) {
      var li = cards.find(function (c) {
        return c.dataset.id === d.dataset.dot;
      });
      d.hidden = !li || li.hidden;
    });
  }

  function syncUrl() {
    var s = new URLSearchParams();
    if (current !== 'all') s.set('cluster', current);
    if (view) s.set('view', view);
    var str = s.toString();
    try {
      history.replaceState(history.state, '', str ? '?' + str : location.pathname);
    } catch (e) {}
  }

  function words(n) {
    var c = chips.find(function (b) {
      return b.dataset.f === current;
    });
    var noun = n === 1 ? ' post' : ' posts';
    if (current === 'all') return 'Showing all ' + n + noun + '.';
    return 'Showing ' + n + noun + ' in ' + c.firstChild.textContent.trim() + '.';
  }

  function choose(key, quiet) {
    current = key;
    chips.forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.f === key ? 'true' : 'false');
    });
    cards.forEach(function (li) {
      li.hidden = !matches(li);
    });
    days(quiet || reduce);
    rows.forEach(function (li) {
      li.hidden = !matches(li);
    });
    top = 0;
    layout();
    if (!quiet) statusEl.textContent = words(shown().length);
    setPill(bar);
    syncUrl();
  }

  function setView(v) {
    view = v;
    jx.dataset.view = v;
    views.forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.v === v ? 'true' : 'false');
    });
    setPill(bar);
    syncUrl();
  }

  chips.forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.f === current) return;
      choose(b.dataset.f);
    });
  });
  views.forEach(function (b) {
    b.addEventListener('click', function (e) {
      if (b.dataset.v === onScreen() && view) return;
      if (!reduce && b.dataset.v !== onScreen()) bloom(b, e);
      setView(b.dataset.v);
    });
  });
  deal.forEach(function (b) {
    b.addEventListener('click', function () {
      move(Number(b.dataset.deal));
    });
  });
  deck.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    move(step);
    /* Keep the focus in the deck: on the new top card's link if it came from a card. */
    if (e.target.closest('[data-pile]')) {
      var link = shown()[top].querySelector('a');
      if (link) link.focus();
    }
  });

  /* The start: the address's choices, or All on whatever view the screen picked. */
  if (view) jx.dataset.view = view;
  var first = onScreen();
  views.forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.v === first ? 'true' : 'false');
  });
  choose(current, true);
  if (current !== 'all') statusEl.textContent = words(shown().length);
  addEventListener('resize', function () {
    if (!view) {
      var v = onScreen();
      views.forEach(function (b) {
        b.setAttribute('aria-pressed', b.dataset.v === v ? 'true' : 'false');
      });
    }
    setPill(bar);
  });
  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready.then(function () {
      setPill(bar);
    });
  }
}
