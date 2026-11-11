/* Work: large windows of the real sites, a sector filter and a list view. A big card thrown across the
   table fought the page, so here a window simply rises as it arrives, and a filter carries the ones that
   stay to their new places. Nothing starts hidden: only the position moves, so the page reads and paints
   without any of this. */
import { ui } from './kit.js';
import { bloom, setPill as pillUnder } from './seg-bar.js';
var reduce = ui.reduce,
  doc = document;
var $ = function (a, r) {
  return (r || doc).querySelector(a);
};
var $$ = function (a, r) {
  return [].slice.call((r || doc).querySelectorAll(a));
};

var grid = $('[data-grid]'),
  bar = $('[data-bar]'),
  statusEl = $('[data-status]'),
  more = $('[data-more]');
var buttons = $$('button', $('[data-filters]')),
  viewButtons = $$('button', $('[data-views]')),
  rowList = $('[data-rows]'),
  rows = $$('li', rowList),
  cards = [].slice.call(grid.children),
  section = $('[data-section]');

ui.wireFootage(grid);

var current = 'all',
  view = 'grid';

var bounce = 'cubic-bezier(.3,1.35,.5,1)';

/* A window rises and straightens as it arrives. Opacity stays at 1 on purpose: it only ever moves. */
function deal(li, delay) {
  var odd = cards.indexOf(li) % 2 ? 1 : -1;
  li.animate(
    [
      { transform: 'translateY(46px) rotate(' + odd * 1.1 + 'deg) scale(.985)' },
      { transform: 'none' },
    ],
    { duration: 760, delay: delay, easing: bounce, fill: 'backwards' },
  );
}
function riseIn(r, delay) {
  r.animate(
    [
      { opacity: 0, transform: 'translateY(22px)' },
      { opacity: 1, transform: 'none' },
    ],
    { duration: 620, delay: delay, easing: bounce, fill: 'backwards' },
  );
}
function shown(list) {
  return list.filter(function (el) {
    return !el.hidden;
  });
}

/* Whatever stays slides from where it was, whatever arrives rises. Used by the list and the grid. */
function carry(list, box, change, arrive) {
  if (reduce || !box.offsetHeight) {
    change();
    return;
  }
  var was = new Map(),
    h0 = box.offsetHeight;
  shown(list).forEach(function (el) {
    var r = el.getBoundingClientRect();
    was.set(el, { x: r.left, y: r.top });
  });
  list.forEach(function (el) {
    el.getAnimations().forEach(function (a) {
      a.cancel();
    });
  });
  change();
  var h1 = box.offsetHeight,
    n = 0;
  shown(list).forEach(function (el) {
    var from = was.get(el);
    if (from) {
      var r = el.getBoundingClientRect();
      el.animate(
        [
          { transform: 'translate(' + (from.x - r.left) + 'px,' + (from.y - r.top) + 'px)' },
          { transform: 'none' },
        ],
        { duration: 600, easing: bounce },
      );
    } else arrive(el, 60 + 38 * n++);
  });
  box.style.overflow = 'hidden';
  box.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], {
    duration: 520,
    easing: 'cubic-bezier(.2,.8,.2,1)',
  }).onfinish = function () {
    box.style.overflow = '';
  };
}

/* The first arrival: only what you can see, the rest as you scroll to them. Back or a reload, already
   scrolled, and the windows are simply there. */
var io = null;
if (!reduce && !ui.restored() && 'IntersectionObserver' in window) {
  var slot = 0;
  io = new IntersectionObserver(
    function (es) {
      var now = performance.now();
      es.filter(function (e) {
        return e.isIntersecting;
      }).forEach(function (e) {
        io.unobserve(e.target);
        slot = Math.max(now + 20, slot + 92);
        deal(e.target, slot - now);
      });
    },
    { rootMargin: '0px 0px -4% 0px', threshold: 0.04 },
  );
}

/* The filter. */
function setPill() {
  pillUnder(bar);
}
function syncUrl() {
  var q = new URLSearchParams();
  if (current !== 'all') q.set('sector', current);
  if (view === 'list') q.set('view', 'list');
  /* An address with an open client sheet keeps it, and the sheet's history entry stays one. */
  var client = new URLSearchParams(location.search).get('client');
  if (client) q.set('client', client);
  var s = q.toString();
  try {
    history.replaceState(history.state, '', s ? '?' + s : location.pathname);
  } catch (e) {}
}
function words(key, n) {
  if (key === 'all') return 'Showing all ' + n + ' case studies.';
  var phrase = key === 'small-business' ? 'small business' : key;
  return 'Showing ' + n + ' ' + phrase + (n === 1 ? ' case study.' : ' case studies.');
}
function backToTable(el) {
  scrollTo({
    top: el.getBoundingClientRect().top + scrollY - bar.offsetHeight - 28,
    behavior: reduce ? 'auto' : 'smooth',
  });
}
function jumpToTable(el) {
  scrollTo(0, el.getBoundingClientRect().top + scrollY - bar.offsetHeight - 28);
}
function matches(el, key) {
  return key === 'all' || el.dataset.key === key;
}
function applyFilter(key) {
  cards.forEach(function (li) {
    li.hidden = !matches(li, key);
  });
  /* One window left: its words sit beside it, so a lone study does not float in half a page. */
  grid.classList.toggle('one', shown(cards).length === 1);
}

function choose(key, first) {
  var wasStuck = section.getBoundingClientRect().top < 0;
  current = key;
  buttons.forEach(function (b) {
    var on = b.dataset.f === key;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on && b.dataset.moreHref) {
      more.href = b.dataset.moreHref;
      more.textContent = b.dataset.moreLabel;
    }
  });
  more.hidden = key === 'all';
  statusEl.textContent = words(
    key,
    cards.filter(function (li) {
      return matches(li, key);
    }).length,
  );
  if (first) {
    rows.forEach(function (r) {
      r.hidden = !matches(r, key);
    });
    applyFilter(key);
    setPill();
    syncPeek();
    return;
  }
  syncUrl();
  setPill();
  carry(
    rows,
    rowList,
    function () {
      rows.forEach(function (r) {
        r.hidden = !matches(r, key);
      });
    },
    riseIn,
  );
  carry(
    cards,
    grid,
    function () {
      applyFilter(key);
    },
    deal,
  );
  syncPeek();
  if (wasStuck) backToTable(view === 'list' ? rowList : grid);
}

/* The list's stage: the row you are on shows its window and its outcome beside the list (work.css,
   wide screens only). A mouse picks by hovering, a keyboard by focus, and a touch screen by which
   row is nearest the middle, so nothing here needs a hover. The stage always shows a row that is
   on the page, and the window lands on the house bounce; under reduced motion it is simply
   swapped. A hidden figure's still is never fetched. */
var peek = $('[data-peek]'),
  figs = peek ? $$('figure', peek) : [],
  peekRow = null,
  peekWide = matchMedia('(min-width: 75rem)');
function showPeek(row, quiet) {
  if (!peek || !row || row.hidden || row === peekRow) return;
  if (peekRow) peekRow.classList.remove('on');
  peekRow = row;
  row.classList.add('on');
  figs.forEach(function (f) {
    f.hidden = f.dataset.for !== row.dataset.slug;
    if (f.hidden || quiet || reduce || view !== 'list' || !peekWide.matches) return;
    f.animate(
      [{ transform: 'translateY(16px) rotate(-1.1deg) scale(.975)' }, { transform: 'none' }],
      { duration: 520, easing: bounce },
    );
  });
}
function syncPeek() {
  if (peekRow && !peekRow.hidden) return;
  if (peekRow) peekRow.classList.remove('on');
  peekRow = null;
  showPeek(shown(rows)[0], true);
}
var peekTick = 0;
function peekByScroll() {
  peekTick = 0;
  if (view !== 'list' || !peekWide.matches) return;
  var mid = innerHeight / 2,
    best = null,
    gap = Infinity;
  shown(rows).forEach(function (r) {
    var b = r.getBoundingClientRect(),
      d = Math.abs((b.top + b.bottom) / 2 - mid);
    if (d < gap) {
      gap = d;
      best = r;
    }
  });
  showPeek(best);
}
if (peek) {
  rows.forEach(function (r) {
    r.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'mouse') showPeek(r);
    });
    r.addEventListener('focusin', function () {
      showPeek(r);
    });
  });
  if (matchMedia('(hover: none)').matches)
    addEventListener(
      'scroll',
      function () {
        if (!peekTick) peekTick = requestAnimationFrame(peekByScroll);
      },
      { passive: true },
    );
}

/* The view switch. Windows rise back onto the page; on to the list, the rows rise in. */
function markView() {
  section.dataset.view = view;
  viewButtons.forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.v === view ? 'true' : 'false');
  });
}
/* Where the browser can, the switch is one view transition: window i and row i share a name for the
   moment it runs, so each window folds into its row and back on the house spring. Only the ones on
   show take part, and the names go again once it has landed. */
var canMorph = !reduce && typeof doc.startViewTransition === 'function';
function pairs() {
  var bySlug = {};
  shown(rows).forEach(function (r) {
    bySlug[r.dataset.slug] = r;
  });
  return shown(cards)
    .map(function (li) {
      var slug = li.querySelector('.tile').dataset.slug;
      return [li, bySlug[slug], 'dw-' + slug];
    })
    .filter(function (p) {
      return p[1];
    });
}
function nameAll(list, on) {
  list.forEach(function (p) {
    p[0].style.viewTransitionName = on ? p[2] : '';
    p[1].style.viewTransitionName = on ? p[2] : '';
  });
}
function setView(v) {
  var wasStuck = section.getBoundingClientRect().top < 0;
  var change = function () {
    view = v;
    markView();
    syncUrl();
    setPill();
  };
  if (canMorph) {
    var list = pairs(),
      html = doc.documentElement;
    nameAll(list, true);
    html.classList.add('dw-morph');
    /* Inside the transition the page jumps straight back to the table: the morph is the motion. */
    doc
      .startViewTransition(function () {
        change();
        if (wasStuck) jumpToTable(v === 'list' ? rowList : grid);
      })
      .finished.finally(function () {
        nameAll(list, false);
        html.classList.remove('dw-morph');
      });
    return;
  }
  change();
  if (!reduce) {
    if (v === 'list')
      shown(rows).forEach(function (r, n) {
        riseIn(r, 38 * n);
      });
    else
      shown(cards).forEach(function (li, n) {
        deal(li, 62 * n);
      });
  }
  if (wasStuck) backToTable(v === 'list' ? rowList : grid);
}

viewButtons.forEach(function (b) {
  b.addEventListener('click', function () {
    if (b.dataset.v !== view) setView(b.dataset.v);
  });
});

/* The ink bloom lives in seg-bar.js, shared with /journal. */
buttons.forEach(function (b) {
  b.addEventListener('click', function (e) {
    if (b.dataset.f === current) return;
    if (!reduce) bloom(b, e);
    choose(b.dataset.f);
  });
});

/* Linking to a sector or the list works: /work/?sector=church&view=list */
var params = new URLSearchParams(location.search),
  want = params.get('sector');
if (params.get('view') === 'list') {
  view = 'list';
  markView();
}
if (
  !buttons.some(function (b) {
    return b.dataset.f === want;
  })
)
  want = 'all';
var pills = $$('[data-pill]', bar);
pills.forEach(function (p) {
  p.style.transition = 'none';
});
choose(want, true);
requestAnimationFrame(function () {
  requestAnimationFrame(function () {
    pills.forEach(function (p) {
      p.style.transition = '';
    });
  });
});

if (io && view === 'grid')
  shown(cards).forEach(function (li) {
    io.observe(li);
  });

addEventListener('resize', setPill);
if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(setPill);
addEventListener('load', setPill);

/* What changed: as a card comes up the screen its capture settles into place and, where the number is
   part of a whole, the bar draws to its length. CSS holds the waiting state (work.css) only while
   motion is allowed; a page that loads already scrolled just shows them in place, and so does a
   browser without IntersectionObserver. */
var figCards = $$('[data-figures] .wf-card');
function fill(card) {
  card.classList.add('on');
}
if (figCards.length) {
  if (reduce || ui.restored() || !('IntersectionObserver' in window))
    figCards.forEach(function (c) {
      fill(c);
    });
  else {
    var fio = new IntersectionObserver(
      function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          fio.unobserve(e.target);
          fill(e.target);
        });
      },
      { rootMargin: '0px 0px -25% 0px' },
    );
    figCards.forEach(function (c) {
      fio.observe(c);
    });
  }
}
