/* A price card grows into its tier. The three cards in the price hand (Home, Churches) each link to
   their tier on the Prices page, /services/#light and so on. Page changes are cross-document view
   transitions (kit.css), so when you follow one, the card you picked takes the name `tier-card`
   just before the old page is captured, and on the Prices page the tier it points at wears the
   same name for that one arrival (elevate.css, html.tier-morph), so the browser carries one into
   the other.

   The same rule as hero-morph.js: two elements with one name cancel a whole transition, so the
   name is only ever lent. Here it goes on exactly one card, the one that was clicked, and only
   when it is on screen. On the Prices page an inline script in the <head> (BaseLayout.astro) reads
   the note this leaves in sessionStorage, sets html.tier-morph before the first paint, and takes
   it off when the transition ends; the timer at the foot of this file is the backstop.

   Only a click on a price card does it. The dock's price hand does not: it lives inside the dock,
   which holds its own name, and a name inside a name is asking for trouble
   (_vault/gotchas/view-transition-name-*). Under reduced motion there is no view transition at
   all, so none of this runs. */
var NAME = 'tier-card',
  KEY = 'ncs-tier-morph',
  doc = document,
  picked = null;

doc.addEventListener(
  'click',
  function (e) {
    picked = (e.target.closest && e.target.closest('a.pc-face[href*="/services/#"]')) || null;
  },
  true,
);
function note(v) {
  try {
    if (v) sessionStorage.setItem(KEY, v);
    else sessionStorage.removeItem(KEY);
  } catch (e) {}
}
function onScreen(el) {
  var r = el.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
}

addEventListener('pageswap', function (e) {
  note(null);
  if (!e.viewTransition || !e.activation || !e.activation.entry || !picked) return;
  var to = new URL(e.activation.entry.url, location.href);
  if (to.origin !== location.origin || to.pathname !== '/services/') return;
  if (!/^#[a-z][a-z0-9-]*$/.test(to.hash)) return;
  if (!picked.isConnected || picked.hash !== to.hash || !onScreen(picked)) return;
  picked.style.viewTransitionName = NAME;
  note(to.hash.slice(1));
});

/* Back (bfcache) restores the old page as it was left: give the borrowed name back. */
addEventListener('pageshow', function (e) {
  if (!e.persisted) return;
  [].forEach.call(doc.querySelectorAll('a.pc-face'), function (el) {
    el.style.viewTransitionName = '';
  });
  doc.documentElement.classList.remove('tier-morph');
});

/* The arriving page: the inline script drops the class when the transition finishes. If that
   never fires (no pagereveal in this browser), drop it here so the name is not left on the tier. */
if (doc.documentElement.classList.contains('tier-morph')) {
  setTimeout(function () {
    doc.documentElement.classList.remove('tier-morph');
  }, 1600);
}
