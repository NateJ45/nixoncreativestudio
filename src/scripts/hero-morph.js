/* A window grows into its case study. Page changes are cross-document view transitions (kit.css), so
   when you leave a page for /work/<slug>/, the window you picked takes the name `study-hero` just
   before the old page is captured, and the study's desktop pane (`.s-fan .p-home`, study.css) wears
   the same name, so the browser carries one into the other on a spring (the group's timing is in
   study.css). Coming back to /work runs it the other way (the arriving half is an inline script in
   work/index.astro, because it has to be listening before the first paint).

   Which window: the client sheet's desktop pane if the sheet is open (a /work or home window opens the
   sheet first), else the window you clicked (the study's Up next is a direct link), else one of that
   client's windows on screen. Nothing on screen, no morph: the page just changes as usual.

   The study page has to know a morph is landing, so its pane is shown at once instead of being thrown
   in. A note in sessionStorage carries that across, read by an inline script in [slug].astro before
   the first paint and by study.js.

   Under reduced motion there is no view transition at all (kit.css), so `viewTransition` is null and
   none of this runs. Imported by Tile.astro (home, /work, the sector pages) and study.js. */
var NAME = 'study-hero',
  KEY = 'ncs-hero',
  doc = document,
  picked = null;

doc.addEventListener(
  'click',
  function (e) {
    picked = (e.target.closest && e.target.closest('.tile[data-slug]')) || null;
  },
  true,
);

function studySlug(url) {
  try {
    var u = new URL(url, location.href);
    if (u.origin !== location.origin) return null;
    var m = /^\/work\/([a-z0-9-]+)\/?$/.exec(u.pathname);
    return m ? m[1] : null;
  } catch (e) {
    return null;
  }
}
function onScreen(el) {
  if (!el || !el.isConnected) return false;
  var r = el.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
}
function tileFor(slug) {
  var sheet = doc.querySelector('dialog[data-sheet][open] .p-home > div');
  if (sheet && onScreen(sheet)) return sheet;
  if (picked && picked.dataset.slug === slug && onScreen(picked)) return picked;
  var all = doc.querySelectorAll('.tile[data-slug="' + slug + '"]');
  for (var i = 0; i < all.length; i++) if (onScreen(all[i])) return all[i];
  return null;
}
function note(v) {
  try {
    if (v) sessionStorage.setItem(KEY, v);
    else sessionStorage.removeItem(KEY);
  } catch (e) {}
}

/* Leaving: name the window that is about to grow. A study page's own pane gives its name up first,
   because two elements with one name would cancel the whole transition, unless you are going back to
   /work, where the pane shrinks back into its window (the inline script in work/index.astro). */
addEventListener('pageswap', function (e) {
  note(null);
  if (!e.viewTransition || !e.activation || !e.activation.entry) return;
  var to = new URL(e.activation.entry.url, location.href),
    slug = studySlug(to.href),
    own = doc.querySelector('.s-fan .p-home');
  if (own) {
    var home = to.origin === location.origin && to.pathname === '/work/';
    own.style.viewTransitionName = home && onScreen(own) ? NAME : 'none';
  }
  var el = slug && tileFor(slug);
  if (!el) return;
  el.style.viewTransitionName = NAME;
  note(to.pathname);
});

/* Back (bfcache) restores the old page as it was left: give the borrowed names back. */
addEventListener('pageshow', function (e) {
  if (!e.persisted) return;
  [].forEach.call(doc.querySelectorAll('[style*="view-transition-name"]'), function (el) {
    if (!el.classList.contains('dock')) el.style.viewTransitionName = '';
  });
});
