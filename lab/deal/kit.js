/* Shared parts for every page: the top line, floating menu, closing block, phone windows, footage and the client sheet.
   Load /shared.js, then /deal/kit.js, then the page's own script. Use window.NCS.ui. */
(function () {
  var N = window.NCS, doc = document;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (a, r) { return (r || doc).querySelector(a); };
  N.sites.forEach(function (s) {
    s.study = '/deal/study/' + s.slug + '/';
    s.clip = '/assets/' + s.slug + '-m.mp4';
    s.still = '/assets/' + s.slug + '-m.webp';
    s.desk = '/assets/' + s.slug + '.mp4';
    s.deskStill = '/assets/' + s.slug + '-cover.webp';
    s.cms = s.slug === 'first-presbyterian-orangeburg' ? '' : '/assets/' + s.slug + '-cms.webp';
  });
  var LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.500 7V5a3.500 3.500 0 0 1 7 0v2h.5a1.500 1.500 0 0 1 1.500 1.500v4A1.500 1.500 0 0 1 12 14H4a1.500 1.500 0 0 1-1.500-1.500v-4A1.500 1.500 0 0 1 4 7zm1.500 0h4V5a2 2 0 0 0-4 0z"/></svg>';
  var ic = function (d, off) { return '<svg viewBox="0 0 24 24"' + (off ? ' class="off"' : '') + '><path d="' + d + '"/></svg>'; };
  var TOOLS = ic('M15 5l-7 7 7 7') + ic('M9 5l7 7-7 7', true) + ic('M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7') + ic('M5 7a2 2 0 0 1 2-2h4v14H7a2 2 0 0 1-2-2zM11 5h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6') + ic('M8 8h11v11H8zM5 16V5h11');

  var ui = N.ui = {
    reduce: reduce,
    bySlug: function (slug) { return N.sites.find(function (s) { return s.slug === slug; }); },
    /* A phone browser window. It opens the client sheet on click, unless o.direct makes it a plain link. */
    tile: function (s, o) {
      o = o || {};
      return '<a class="tile" href="' + s.study + '" data-slug="' + s.slug + '"' + (o.direct ? ' data-direct' : '') + (o.index !== undefined ? ' data-i="' + o.index + '"' : '') + ' aria-label="' + s.name + ', ' + s.host + ': ' + s.hook + '" style="--c:' + s.accent + ';--p:' + s.paper + '"><span class="b-top" aria-hidden="true"><span class="url">' + LOCK + '<span>' + s.host + '</span></span></span><span class="scr" aria-hidden="true"><img src="' + s.still + '" alt="" loading="' + (o.lazy ? 'lazy' : 'eager') + '"><video muted loop playsinline preload="none" data-src="' + s.clip + '"></video></span><span class="b-bot" aria-hidden="true">' + TOOLS + '</span></a>';
    },
    caption: function (s) { return '<p class="cap"><b>' + s.name + '</b><span>' + s.sector + '</span></p>'; },
    chrome: TOOLS,
    lock: LOCK,
    /* Footage: a window plays its real site on hover, or on touch while centered. Two at most. */
    play: function (tile, on) {
      var v = $('video', tile); if (!v) return;
      if (on && !reduce) { if (!v.src) v.src = v.dataset.src; var p = v.play(); if (p && p.then) p.then(function () { v.classList.add('on'); }).catch(function () {}); }
      else { v.classList.remove('on'); v.pause(); }
    },
    wireFootage: function (root) {
      var tiles = [].slice.call((root || doc).querySelectorAll('.tile'));
      tiles.forEach(function (t) {
        t.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') ui.play(t, true); });
        t.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') ui.play(t, false); });
      });
      if (matchMedia('(hover: none)').matches && !reduce && 'IntersectionObserver' in window) {
        var cur = null, io = new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting) { if (cur && cur !== e.target) ui.play(cur, false); cur = e.target; ui.play(cur, true); }
            else if (cur === e.target) { ui.play(cur, false); cur = null; }
          });
        }, { rootMargin: '-40% 0px -40% 0px' });
        tiles.forEach(function (t) { io.observe(t); });
      }
    },
    /* A plain spring, for anything that should move with weight. Returns a stepper. */
    spring: function (k, c, v) {
      return { x: v || 0, v: 0, step: function (to, dt) { this.v += (k * (to - this.x) - c * this.v) * dt; this.x += this.v * dt; return Math.abs(to - this.x) > .0005 || Math.abs(this.v) > .004; } };
    },
    /* Reveals a headline word by word. Put <b> around heavy words in the source text. */
    words: function (el, delay) {
      if (!el || reduce) return;
      var n = 0;
      var wrap = function (node) {
        [].slice.call(node.childNodes).forEach(function (c) {
          if (c.nodeType === 3) {
            var f = doc.createDocumentFragment();
            c.textContent.split(/(\s+)/).forEach(function (w) {
              if (!w) return;
              if (/^\s+$/.test(w)) { f.appendChild(doc.createTextNode(' ')); return; }
              var s = doc.createElement('span'); s.className = 'w'; s.style.setProperty('--n', n++); s.style.setProperty('--wd', (delay || 120) + 'ms'); s.textContent = w; f.appendChild(s);
            });
            node.replaceChild(f, c);
          } else if (c.nodeType === 1 && !c.classList.contains('me')) wrap(c);
        });
      };
      if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
      wrap(el);
    },
  };

  /* The shared chrome. */
  var path = location.pathname;
  var link = function (href, label, cls) { var on = path.indexOf(href) === 0; return '<a href="' + href + '"' + (cls ? ' class="' + cls + '"' : '') + (on ? ' aria-current="page"' : '') + '>' + label + '</a>'; };
  doc.body.insertAdjacentHTML('afterbegin', '<a class="skip" href="#main">Skip to content</a><header class="top' + (doc.body.dataset.ink ? ' on-color' : '') + '"><a class="mark" href="/deal/">Nixon Creative Studio</a><span class="status"><i></i>Booking projects, Cincinnati</span></header>');
  doc.body.insertAdjacentHTML('beforeend', '<nav class="dock" aria-label="Primary"><span class="slide" data-slide></span>' + link('/deal/work/', 'Work') + link('/deal/prices/', 'Prices') + link('/deal/about/', 'About') + link('/deal/start/', 'Start a project', 'go') + '</nav>' +
    '<dialog class="sheet" data-sheet aria-labelledby="sn"><button type="button" class="back" data-back>Back to the work</button><div class="sheet-in"><div><h2 id="sn" class="fade" style="--d:0" data-n></h2><p class="hook fade" style="--d:1" data-k></p><p class="meta fade" style="--d:2" data-m></p><div class="sheet-links fade" style="--d:3"><a class="chip" data-st href="#">Read the case study</a><a class="chip ghost" data-vi href="#">Visit the site</a></div></div>' +
    '<div class="fan"><figure class="pane p-home" style="--d:0"><div><video data-pv muted loop playsinline preload="none"></video></div><figcaption>The homepage</figcaption></figure><figure class="pane p-phone" style="--d:1"><div><img data-pp alt=""></div><figcaption>On a phone</figcaption></figure><figure class="pane p-cms" style="--d:2" data-cmsbox><div><img data-pc alt=""></div><figcaption>The editor behind it</figcaption></figure></div></div></dialog>');
  [].forEach.call(doc.querySelectorAll('[data-end]'), function (el) {
    el.classList.add('end');
    var lead = el.dataset.end || 'Tell me what you are <b>building.</b>';
    el.innerHTML = '<h2>' + lead + '</h2><p>' + N.contact.free + ' ' + N.contact.reply + '</p><div class="end-links"><a class="chip" href="/deal/start/">Start a project</a><a class="chip ghost" href="mailto:' + N.contact.email + '">' + N.contact.email + '</a><a class="chip ghost" href="tel:' + N.contact.phone.replace(/[^0-9+]/g, '') + '">' + N.contact.phone + '</a></div><p class="legal"><a href="/deal/privacy/">Privacy</a><a href="/deal/accessibility/">Accessibility</a><a href="/deal/colophon/">How this site is built</a></p>';
  });

  /* The pill's highlight slides to whichever link you are near. */
  var dock = $('.dock'), slide = $('[data-slide]');
  [].forEach.call(dock.querySelectorAll('a:not(.go)'), function (a) {
    a.addEventListener('pointerenter', function () { slide.style.width = a.offsetWidth + 'px'; slide.style.transform = 'translateX(' + a.offsetLeft + 'px)'; slide.style.opacity = 1; });
  });
  dock.addEventListener('pointerleave', function () { slide.style.opacity = 0; });

  /* The client sheet: a window grows into its color and the screens fan out. */
  var sheet = $('[data-sheet]'), opener = null, pv = $('[data-pv]');
  var clipFor = function (r) { return 'inset(' + r.top + 'px ' + (innerWidth - r.right) + 'px ' + (innerHeight - r.bottom) + 'px ' + r.left + 'px round 28px)'; };
  ui.openSheet = function (s, el) {
    opener = el;
    sheet.style.setProperty('--c', s.accent); sheet.style.setProperty('--p', s.paper);
    $('[data-n]').textContent = s.name; $('[data-k]').textContent = s.hook; $('[data-m]').textContent = s.sector;
    $('[data-st]').href = s.study; var vi = $('[data-vi]'); vi.href = 'https://' + s.host; vi.textContent = 'Visit ' + s.host;
    pv.poster = s.deskStill; pv.src = s.desk;
    $('[data-pp]').src = s.still;
    var cms = $('[data-cmsbox]'); cms.style.display = s.cms ? '' : 'none'; if (s.cms) $('[data-pc]').src = s.cms;
    sheet.style.setProperty('--from', clipFor(el.getBoundingClientRect()));
    sheet.scrollTop = 0;
    sheet.showModal();
    $('[data-back]').focus({ preventScroll: true });
    doc.documentElement.style.overflow = 'hidden';
    if (!reduce) { var p = pv.play(); if (p && p.catch) p.catch(function () {}); }
    requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add('on'); }); });
  };
  var closeSheet = function () {
    if (!sheet.open) return;
    if (opener) sheet.style.setProperty('--from', clipFor(opener.getBoundingClientRect()));
    sheet.classList.remove('on');
    setTimeout(function () { pv.pause(); sheet.close(); doc.documentElement.style.overflow = ''; if (opener) opener.focus({ preventScroll: true }); }, reduce ? 0 : 640);
  };
  $('[data-back]').addEventListener('click', closeSheet);
  sheet.addEventListener('cancel', function (e) { e.preventDefault(); closeSheet(); });
  sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.tile[data-slug]:not([data-direct])');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); ui.play(a, false); ui.openSheet(ui.bySlug(a.dataset.slug), a);
  });
  addEventListener('pageshow', function () { doc.documentElement.style.overflow = ''; });
})();
