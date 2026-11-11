/* /journal (src/pages/journal/index.astro): the deck, the list and the chips.

   The deck is the posts stacked newest on top. "Older" deals the top card away to the left and the
   next one comes forward; "Newer" brings the last one back. The arrow keys do the same while focus
   is inside the deck. Only the top card can be reached: the ones behind are inert, so Tab goes from
   the top card's link to the buttons. Under reduced motion the cards simply change places.

   The chips filter both views at once, the view switch picks Deck or List, and the address keeps
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
    railItems.forEach(function (r, i) {
      r.classList.toggle('now', cards[i] === at);
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
    layout();
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
    railItems.forEach(function (li) {
      li.hidden = !matches(li);
    });
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
    b.addEventListener('click', function (e) {
      if (b.dataset.f === current) return;
      if (!reduce) bloom(b, e);
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
