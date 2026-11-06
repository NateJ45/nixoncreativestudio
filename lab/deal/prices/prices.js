(function () {
  var N = window.NCS, ui = N.ui, reduce = ui.reduce, doc = document;
  var all = function (a, r) { return [].slice.call((r || doc).querySelectorAll(a)); };

  ui.words(doc.querySelector('.page-head h1'));

  /* "Start with X" carries the tier to the form, in the link and in the session. */
  all('[data-tier]').forEach(function (a) {
    a.addEventListener('click', function () { try { sessionStorage.setItem('ncs-tier', a.dataset.tier); } catch (e) {} });
  });

  /* One window per kind of client. Sector only, in its own block: no client is tied to a tier or a price. */
  var sites = doc.querySelector('[data-sites]');
  sites.innerHTML = ['first-baptist-muncie', 'presbyterian-academy', 'theology-matters', 'reid-design'].map(function (slug) {
    var s = ui.bySlug(slug); return '<li>' + ui.tile(s, { lazy: true }) + ui.caption(s) + '</li>';
  }).join('');
  ui.wireFootage(sites);

  /* The tiers. At rest all three sit open. Hover, focus or press one and it lifts on a spring while the others
     ease back and fold their lists away. Let go and all three settle open again. On a phone the stack stays open
     and the card you are reading comes forward as you scroll. With reduced motion none of this runs. */
  var list = doc.querySelector('[data-tiers]');
  var st = all('.tier', list).map(function (li, i) {
    return { li: li, i: i, card: li.querySelector('.t-card'), fold: li.querySelector('.t-list'), btn: li.querySelector('.t-inc-b'), l: ui.spring(240, 17, 0), f: ui.spring(170, 22, 1), side: 0 };
  });
  var wideQ = matchMedia('(min-width:60rem)'), mode = '', hovered = null, focused = null, pinned = null, near = null, leaveT = 0;
  var raf = 0, last = 0;
  var active = function () { return hovered !== null ? hovered : focused !== null ? focused : pinned; };

  function wake() { if (!raf && mode) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function nearest() {
    var mid = innerHeight / 2, best = null, bd = 1e9;
    st.forEach(function (s) {
      var r = s.li.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      var d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
      if (d < bd) { bd = d; best = s.i; }
    });
    return best;
  }
  function frame(now) {
    raf = 0;
    var dt = Math.min(.033, (now - last) / 1000 || .016); last = now;
    var wide = mode === 'wide', live = false, a = wide ? active() : (near = nearest());
    st.forEach(function (s) {
      var lT = a === null ? 0 : s.i === a ? 1 : -1, fT = wide && a !== null && s.i !== a ? 0 : 1;
      if (a !== null) s.side = s.i === a ? 0 : (s.i > a ? 1 : -1);
      if (s.l.step(lT, dt)) live = true; else { s.l.x = lT; s.l.v = 0; }
      if (s.f.step(fT, dt)) live = true; else { s.f.x = fT; s.f.v = 0; }
      if (s.f.x < 0) { s.f.x = 0; s.f.v = 0; }
      var l = s.l.x, back = Math.max(0, -l), y, sc, x, r;
      if (wide) {
        y = l > 0 ? -l * 16 : back * 10; sc = 1 + l * .026; x = s.side * back * 8; r = s.side * back * .5;
      } else {
        y = 0; sc = 1 + Math.min(0, l) * .02 + Math.max(0, l) * .012; x = 0; r = 0;
      }
      s.card.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) rotate(' + r.toFixed(3) + 'deg) scale(' + sc.toFixed(4) + ')';
      s.card.style.setProperty('--l', wide ? l.toFixed(3) : 0);
      s.card.style.setProperty('--f', Math.min(1.03, s.f.x).toFixed(4));
      s.li.style.zIndex = s.i === a ? 3 : 1;
    });
    if (live) raf = requestAnimationFrame(frame);
  }
  function measure() {
    st.forEach(function (s) { s.card.style.setProperty('--lh', (mode === 'wide' ? s.fold.offsetHeight : 0) + 'px'); });
  }
  function setMode() {
    var next = reduce ? '' : wideQ.matches ? 'wide' : 'stack';
    if (next !== mode) {
      mode = next; hovered = focused = pinned = null;
      list.classList.toggle('live', mode === 'wide');
      st.forEach(function (s) {
        s.btn.setAttribute('aria-pressed', 'false');
        if (mode !== 'wide') { s.f.x = 1; s.f.v = 0; s.card.style.setProperty('--f', 1); }
      });
    }
    measure(); wake();
  }
  if (!reduce) {
    st.forEach(function (s) {
      s.li.addEventListener('pointerenter', function (e) { if (mode === 'wide' && e.pointerType === 'mouse') { clearTimeout(leaveT); hovered = s.i; wake(); } });
      s.li.addEventListener('pointerleave', function (e) {
        if (mode === 'wide' && e.pointerType === 'mouse') { clearTimeout(leaveT); leaveT = setTimeout(function () { hovered = null; wake(); }, 110); }
      });
      s.li.addEventListener('focusin', function (e) { if (mode === 'wide' && e.target.matches(':focus-visible')) { focused = s.i; wake(); } });
      s.li.addEventListener('focusout', function (e) { if (!s.li.contains(e.relatedTarget) && focused === s.i) { focused = null; wake(); } });
      s.btn.addEventListener('click', function () {
        pinned = pinned === s.i ? null : s.i;
        st.forEach(function (o) { o.btn.setAttribute('aria-pressed', o.i === pinned ? 'true' : 'false'); });
        if (pinned === null && focused === s.i) focused = null;
        wake();
      });
    });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mode === 'wide' && (pinned !== null || focused !== null)) { pinned = focused = null; st.forEach(function (o) { o.btn.setAttribute('aria-pressed', 'false'); }); wake(); } });
    addEventListener('scroll', function () { if (mode === 'stack') wake(); }, { passive: true });
    addEventListener('resize', setMode);
    addEventListener('load', measure);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(measure);
    setMode();
  }

  /* Native details and summary, with the height eased. Without this it simply opens. */
  all('.faq details, .fold').forEach(function (d) {
    var sum = d.querySelector('summary'), box = d.querySelector('.faq-a, .fold-a'), an = null;
    if (reduce) return;
    sum.addEventListener('click', function (e) {
      e.preventDefault();
      var from = d.open ? box.getBoundingClientRect().height : 0, closing = d.open && !d.classList.contains('closing');
      if (an) { an.onfinish = null; an.cancel(); }
      d.open = true;
      d.classList.toggle('closing', closing);
      box.style.overflow = 'hidden';
      var to = closing ? 0 : box.scrollHeight;
      an = box.animate({ height: [from + 'px', to + 'px'] }, { duration: closing ? 340 : 520, easing: 'cubic-bezier(.22,1.12,.36,1)' });
      if (!closing) box.firstElementChild.animate({ opacity: [0, 1], transform: ['translateY(.75rem)', 'none'] }, { duration: 460, easing: 'cubic-bezier(.2,.8,.2,1)' });
      an.onfinish = function () {
        an = null; box.style.overflow = '';
        if (closing) { d.open = false; d.classList.remove('closing'); }
      };
    });
  });
  /* A link to a closed row opens it, so the jump links never land on something shut. */
  function openTarget() { var t = location.hash && doc.getElementById(location.hash.slice(1)); if (t && t.matches('details')) t.open = true; }
  all('.jump a').forEach(function (a) {
    var t = doc.getElementById(a.getAttribute('href').slice(1));
    if (t && t.matches('details')) a.addEventListener('click', function () { t.open = true; });
  });
  addEventListener('hashchange', openTarget); openTarget();
  addEventListener('beforeprint', function () { all('.faq details, .fold').forEach(function (d) { d.open = true; }); });
})();
