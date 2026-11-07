/* Work: large windows of the real sites, a sector filter and a list view. A big card thrown across the
   table fought the page, so here a window simply rises as it arrives, and a filter carries the ones that
   stay to their new places. Nothing starts hidden: only the position moves, so the page reads and paints
   without any of this. */
import { ui } from './kit.js';
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
  $$('.dw-seg', bar).forEach(function (seg) {
    var on = $('button[aria-pressed=true]', seg),
      pill = $('[data-pill]', seg);
    pill.style.width = on.offsetWidth + 'px';
    pill.style.height = on.offsetHeight + 'px';
    pill.style.transform = 'translate(' + on.offsetLeft + 'px,' + on.offsetTop + 'px)';
  });
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
  if (wasStuck) backToTable(view === 'list' ? rowList : grid);
}

/* The view switch. Windows rise back onto the page; on to the list, the rows rise in. */
function markView() {
  section.dataset.view = view;
  viewButtons.forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.v === view ? 'true' : 'false');
  });
}
function setView(v) {
  var wasStuck = section.getBoundingClientRect().top < 0;
  view = v;
  markView();
  syncUrl();
  setPill();
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

buttons.forEach(function (b) {
  b.addEventListener('click', function () {
    if (b.dataset.f !== current) choose(b.dataset.f);
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
