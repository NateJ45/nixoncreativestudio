/* Previews on names. Point at a link to a case study with a mouse, or land on it with the keyboard,
   and that client's window comes up beside the link: their phone page in their colour, with the
   name, the sector and the one-line outcome. A link to /services/ shows the three starting prices,
   and a link to a journal post shows its title, cluster and reading time.

   It is automatic, by href: nothing in the markup asks for it. `data-peek="off"` on a link, or on
   anything around it, opts out. A link that already is a window (`.tile`), sits in the dock, the
   client sheet or the palette, or already has a preview of its own (the closing's selected work,
   About's map, the /work list, the journal deck) is left alone, and so is a link to the page you
   are on.

   The card is one element, built here the first time it is needed, and it is `aria-hidden`: it
   only repeats what the link opens. It is a manual `popover`, so it sits in the top layer, and it
   is placed with CSS anchor positioning where the browser has it (`position-try-fallbacks` keeps
   it on the screen); elsewhere a few lines below do the same sum. It never sits on the link, so it
   is never under the pointer. Escape, leaving, blur or scrolling away puts it back, and the pointer
   can travel onto the card without losing it (WCAG 1.4.13). A click on the card follows the link.

   Off on touch (a tap just follows the link) and under 48rem. The data is /peek.json, fetched on
   first use (peek-data.js), and the picture is the 320px still the cards already use, fetched
   only when a preview is shown. The motion is CSS (`.peek` in elevate-b.css): the house spring in,
   and under reduced motion it simply appears. */
import { peekData } from './peek-data.js';

var doc = document;
var roomy = matchMedia('(min-width: 48rem)');
var hovers = matchMedia('(hover: hover) and (pointer: fine)');
var hasPopover = 'popover' in HTMLElement.prototype;
var canAnchor =
  !!window.CSS &&
  CSS.supports('anchor-name: --peek') &&
  CSS.supports('position-area: top') &&
  CSS.supports('position-try-fallbacks: flip-block');

/* Places where a link already has a preview of its own, or where a preview would sit on top of the
   thing it previews. */
var SKIP =
  '[data-peek="off"], .tile, .dock, .sheet, .pal, .peek, .pc-face, .post-endcard, .next, [data-pull], [data-jx], .cm, .dw-rows';

var el = function (tag, cls, text) {
  var n = doc.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
};

/* What a link previews, or null. Worked out once a link and remembered. */
var known = new WeakMap();
function kindOf(a) {
  if (known.has(a)) return known.get(a);
  var k = null;
  if (a.origin === location.origin && a.pathname !== location.pathname && !a.closest(SKIP)) {
    var m;
    if ((m = /^\/work\/([^/]+)\/$/.exec(a.pathname))) {
      /* In the same card as that client's own window (a /work card, a sector page's study) the
         window is already there, so a second one would only cover it. */
      var item = a.closest('li, article, figure');
      if (!item || !item.querySelector('.tile[data-slug="' + m[1] + '"]'))
        k = { kind: 'work', slug: m[1] };
    } else if (a.pathname === '/services/') k = { kind: 'prices' };
    else if ((m = /^\/journal\/([^/]+)\/$/.exec(a.pathname))) k = { kind: 'post', slug: m[1] };
  }
  known.set(a, k);
  return k;
}

/* The card. One for the whole page, filled again for each link. */
var box = null,
  cur = null,
  open = false,
  showT = 0,
  hideT = 0,
  tick = 0;

function build() {
  box = el('div', 'peek');
  box.setAttribute('popover', 'manual');
  box.setAttribute('aria-hidden', 'true');
  /* The pointer may cross onto the card; a click there is a click on the link it belongs to. */
  box.addEventListener('pointerenter', function () {
    clearTimeout(hideT);
  });
  box.addEventListener('pointerleave', function () {
    leave(160);
  });
  box.addEventListener('click', function () {
    var a = cur;
    hide();
    if (a) a.click();
  });
}

/* Fill the card for this link. Returns false when the data has nothing for it (a draft post, a
   study that has gone), and then no card is shown. */
function fill(k, data) {
  box.textContent = '';
  box.className = 'peek peek-' + k.kind;
  if (k.kind === 'work') {
    var s = data.work[k.slug];
    if (!s) return false;
    /* Their window: their colour around their own page, like the windows in the grid. */
    var win = el('span', 'peek-win');
    win.style.setProperty('--c', s.c);
    var img = new Image(320, 624);
    img.alt = '';
    img.decoding = 'async';
    img.src = s.still;
    win.appendChild(img);
    var say = el('span', 'peek-say');
    say.appendChild(el('span', 'label', s.sector));
    say.appendChild(el('strong', '', s.name));
    if (s.outcome) say.appendChild(el('span', 'peek-out', s.outcome));
    if (s.host) say.appendChild(el('span', 'peek-host label', s.host));
    box.appendChild(win);
    box.appendChild(say);
    return true;
  }
  if (k.kind === 'prices') {
    box.appendChild(el('span', 'label', 'Starting prices'));
    var list = el('span', 'peek-rows');
    data.prices.tiers.forEach(function (t) {
      var row = el('span', 'peek-row');
      var name = el('span', 'peek-tier');
      name.appendChild(el('strong', '', t.name));
      name.appendChild(el('span', '', t.who));
      row.appendChild(name);
      row.appendChild(el('span', 'peek-from', 'from ' + t.from));
      list.appendChild(row);
    });
    box.appendChild(list);
    box.appendChild(
      el('span', 'peek-foot', 'One-time build. Prices as of ' + data.prices.asOf + '.'),
    );
    return true;
  }
  var p = data.posts[k.slug];
  if (!p) return false;
  box.appendChild(el('span', 'label', p.cluster ? 'Journal · ' + p.cluster : 'Journal'));
  box.appendChild(el('strong', '', p.title));
  box.appendChild(el('span', 'peek-foot', p.min + ' min read'));
  return true;
}

/* Without anchor positioning: over the link, centred, nudged to stay on the screen, and under the
   link when there is no room above. The same answer the CSS gives. */
function place(a) {
  var r = a.getBoundingClientRect(),
    w = box.offsetWidth,
    h = box.offsetHeight,
    m = 12,
    gap = 10;
  var x = Math.min(Math.max(m, r.left + r.width / 2 - w / 2), innerWidth - w - m);
  var above = r.top - gap - h >= m;
  var y = above ? r.top - gap - h : Math.min(r.bottom + gap, innerHeight - h - m);
  box.style.left = Math.round(x) + 'px';
  box.style.top = Math.round(Math.max(m, y)) + 'px';
  box.classList.toggle('below', !above);
}

function show(a, k, tries) {
  peekData().then(function (data) {
    /* The pointer has moved on while the data was on its way. */
    if (!data || cur !== a) return;
    /* A keyboard's focus can land on a link the page is still scrolling to. Wait for it to
       arrive, for a second and a half at most, so the card is not raised off the screen. */
    var at = a.getBoundingClientRect();
    if (at.bottom < 0 || at.top > innerHeight) {
      if ((tries || 0) < 10)
        showT = setTimeout(function () {
          if (cur === a) show(a, k, (tries || 0) + 1);
        }, 150);
      return;
    }
    if (!box) build();
    if (open) shut();
    if (!fill(k, data)) return;
    /* Inside an open dialog (the photo view) the card has to live in it, or it would be inert. */
    var home = a.closest('dialog[open]') || doc.body;
    if (box.parentNode !== home) home.appendChild(box);
    if (canAnchor) a.style.anchorName = '--peek';
    else box.classList.add('peek-js');
    box.showPopover();
    open = true;
    if (canAnchor) {
      /* Which side did the browser pick? The card grows from the edge nearest its link. */
      box.classList.toggle(
        'below',
        box.getBoundingClientRect().top > a.getBoundingClientRect().top,
      );
    } else place(a);
  });
}

/* Take the card down now, and give the link its anchor name back. */
function shut() {
  if (!open) return;
  open = false;
  box.hidePopover();
  [].forEach.call(doc.querySelectorAll('a[style*="anchor-name"]'), function (a) {
    a.style.anchorName = '';
  });
}
function hide() {
  clearTimeout(showT);
  clearTimeout(hideT);
  cur = null;
  shut();
}
function leave(after) {
  clearTimeout(showT);
  clearTimeout(hideT);
  hideT = setTimeout(hide, after);
}

/* Reaching for a link. A short wait first, so a pointer crossing a paragraph raises nothing. */
function want(a) {
  var k = roomy.matches ? kindOf(a) : null;
  if (!k) {
    if (cur) leave(120);
    return;
  }
  clearTimeout(hideT);
  if (cur === a) return;
  clearTimeout(showT);
  cur = a;
  /* Ask for the data now, so it is usually here by the time the wait is over. */
  peekData();
  showT = setTimeout(
    function () {
      show(a, k);
    },
    open ? 70 : 150,
  );
}

if (hasPopover) {
  /* One listener for the whole page, so links that arrive later (a filter, a dialog) work too. */
  var over = null;
  doc.addEventListener(
    'pointerover',
    function (e) {
      if (e.pointerType !== 'mouse' || !hovers.matches) return;
      var t = e.target;
      if (box && box.contains(t)) return;
      var a = t.closest ? t.closest('a[href]') : null;
      if (a === over) return;
      over = a;
      if (a) want(a);
      else if (cur) leave(160);
    },
    { passive: true },
  );
  doc.documentElement.addEventListener('pointerleave', function () {
    over = null;
    if (cur) leave(160);
  });
  doc.addEventListener('focusin', function (e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (a && a.matches(':focus-visible')) want(a);
  });
  doc.addEventListener('focusout', function () {
    if (cur) leave(0);
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && cur) hide();
  });
  /* Following the link, or pressing anywhere else: the card has done its job. */
  doc.addEventListener(
    'pointerdown',
    function (e) {
      if (cur && !(box && box.contains(e.target))) hide();
    },
    { passive: true },
  );
  /* The card rides with its link while the page scrolls (a keyboard's focus scrolls the page to
     the link it lands on), and goes once the link has left the screen. */
  addEventListener(
    'scroll',
    function () {
      if (!open || tick) return;
      tick = requestAnimationFrame(function () {
        tick = 0;
        if (!open || !cur) return;
        var r = cur.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) hide();
        else if (!canAnchor) place(cur);
      });
    },
    { passive: true },
  );
  addEventListener('pagehide', hide);
}
