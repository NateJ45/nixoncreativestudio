/* Shared parts for every page: the top line, floating menu, closing block, phone windows, footage and the client sheet.
   Load /shared.js, then /deal/kit.js, then the page's own script. Use window.NCS.ui. */
(function () {
  var N = window.NCS,
    doc = document;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (a, r) {
    return (r || doc).querySelector(a);
  };
  N.sites.forEach(function (s) {
    s.study = '/deal/study/' + s.slug + '/';
    s.clip = '/assets/' + s.slug + '-m.mp4';
    s.still = '/assets/' + s.slug + '-m.webp';
    s.desk = '/assets/' + s.slug + '.mp4';
    s.deskStill = '/assets/' + s.slug + '-cover.webp';
    s.cms = s.slug === 'first-presbyterian-orangeburg' ? '' : '/assets/' + s.slug + '-cms.webp';
  });
  var LOCK =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.500 7V5a3.500 3.500 0 0 1 7 0v2h.5a1.500 1.500 0 0 1 1.500 1.500v4A1.500 1.500 0 0 1 12 14H4a1.500 1.500 0 0 1-1.500-1.500v-4A1.500 1.500 0 0 1 4 7zm1.500 0h4V5a2 2 0 0 0-4 0z"/></svg>';
  var ic = function (d, off) {
    return (
      '<svg viewBox="0 0 24 24"' + (off ? ' class="off"' : '') + '><path d="' + d + '"/></svg>'
    );
  };
  var TOOLS =
    ic('M15 5l-7 7 7 7') +
    ic('M9 5l7 7-7 7', true) +
    ic('M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7') +
    ic('M5 7a2 2 0 0 1 2-2h4v14H7a2 2 0 0 1-2-2zM11 5h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6') +
    ic('M8 8h11v11H8zM5 16V5h11');

  var ui = (N.ui = {
    reduce: reduce,
    bySlug: function (slug) {
      return N.sites.find(function (s) {
        return s.slug === slug;
      });
    },
    /* A phone browser window. It opens the client sheet on click, unless o.direct makes it a plain link. */
    tile: function (s, o) {
      o = o || {};
      return (
        '<a class="tile" href="' +
        s.study +
        '" data-slug="' +
        s.slug +
        '"' +
        (o.direct ? ' data-direct' : '') +
        (o.index !== undefined ? ' data-i="' + o.index + '"' : '') +
        ' aria-label="' +
        s.name +
        ', ' +
        s.host +
        ': ' +
        s.hook +
        '" style="--c:' +
        s.accent +
        ';--p:' +
        s.paper +
        '"><span class="b-top" aria-hidden="true"><span class="url">' +
        LOCK +
        '<span>' +
        s.host +
        '</span></span></span><span class="scr" aria-hidden="true"><img src="' +
        s.still +
        '" alt="" loading="' +
        (o.lazy ? 'lazy' : 'eager') +
        '"><video muted loop playsinline preload="none" data-src="' +
        s.clip +
        '"></video></span><span class="b-bot" aria-hidden="true">' +
        TOOLS +
        '</span></a>'
      );
    },
    /* Pass a place in the deck to number the card: 01 Nonprofit. */
    caption: function (s, i) {
      return (
        '<p class="cap"><b>' +
        s.name +
        '</b>' +
        (i === undefined
          ? '<span>' + s.sector + '</span>'
          : '<span class="label"><i>' +
            (i < 9 ? '0' : '') +
            (i + 1) +
            '</i>' +
            s.sector +
            '</span>') +
        '</p>'
      );
    },
    chrome: TOOLS,
    lock: LOCK,
    /* Footage: a window plays its real site on hover, or on touch while centered. Two at most. */
    play: function (tile, on) {
      var v = $('video', tile);
      if (!v) return;
      if (on && !reduce) {
        if (!v.src) v.src = v.dataset.src;
        var p = v.play();
        if (p && p.then)
          p.then(function () {
            v.classList.add('on');
          }).catch(function () {});
      } else {
        v.classList.remove('on');
        v.pause();
      }
    },
    wireFootage: function (root) {
      var tiles = [].slice.call((root || doc).querySelectorAll('.tile'));
      tiles.forEach(function (t) {
        t.addEventListener('pointerenter', function (e) {
          if (e.pointerType === 'mouse') ui.play(t, true);
        });
        t.addEventListener('pointerleave', function (e) {
          if (e.pointerType === 'mouse') ui.play(t, false);
        });
      });
      if (matchMedia('(hover: none)').matches && !reduce && 'IntersectionObserver' in window) {
        var cur = null,
          io = new IntersectionObserver(
            function (es) {
              es.forEach(function (e) {
                if (e.isIntersecting) {
                  if (cur && cur !== e.target) ui.play(cur, false);
                  cur = e.target;
                  ui.play(cur, true);
                } else if (cur === e.target) {
                  ui.play(cur, false);
                  cur = null;
                }
              });
            },
            { rootMargin: '-40% 0px -40% 0px' },
          );
        tiles.forEach(function (t) {
          io.observe(t);
        });
      }
    },
    /* A plain spring, for anything that should move with weight. Returns a stepper. */
    spring: function (k, c, v) {
      return {
        x: v || 0,
        v: 0,
        step: function (to, dt) {
          this.v += (k * (to - this.x) - c * this.v) * dt;
          this.x += this.v * dt;
          return Math.abs(to - this.x) > 0.0005 || Math.abs(this.v) > 0.004;
        },
      };
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
              if (/^\s+$/.test(w)) {
                f.appendChild(doc.createTextNode(' '));
                return;
              }
              var s = doc.createElement('span');
              s.className = 'w';
              s.style.setProperty('--n', n++);
              s.style.setProperty('--wd', (delay || 120) + 'ms');
              s.textContent = w;
              f.appendChild(s);
            });
            node.replaceChild(f, c);
          } else if (c.nodeType === 1 && !c.classList.contains('me')) wrap(c);
        });
      };
      if (!el.hasAttribute('aria-label'))
        el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
      wrap(el);
    },
  });

  /* The shared chrome. */
  var path = location.pathname;
  var link = function (href, label, cls) {
    var on = path.indexOf(href) === 0;
    return (
      '<a href="' +
      href +
      '"' +
      (cls ? ' class="' + cls + '"' : '') +
      (on ? ' aria-current="page"' : '') +
      '>' +
      label +
      '</a>'
    );
  };
  doc.body.insertAdjacentHTML(
    'afterbegin',
    '<a class="skip" href="#main">Skip to content</a><header class="top' +
      (doc.body.dataset.ink ? ' on-color' : '') +
      '"><a class="mark" href="/deal/"><b>Nixon</b> Creative Studio</a><span class="status"><i></i>Booking projects, Cincinnati</span></header>',
  );
  doc.body.insertAdjacentHTML(
    'beforeend',
    '<nav class="dock" aria-label="Primary"><span class="slide" data-slide></span>' +
      link('/deal/work/', 'Work') +
      link('/deal/prices/', 'Prices') +
      link('/deal/about/', 'About') +
      link('/deal/start/', 'Start a project', 'go') +
      '</nav>' +
      '<dialog class="sheet" data-sheet aria-labelledby="sn"><button type="button" class="back" data-back>Back to the work</button><div class="sheet-in"><div><h2 id="sn" class="fade" style="--d:0" data-n></h2><p class="hook fade" style="--d:1" data-k></p><p class="meta fade" style="--d:2" data-m></p><div class="sheet-links fade" style="--d:3"><a class="chip" data-st href="#">Read the case study</a><a class="chip ghost" data-vi href="#">Visit the site</a></div></div>' +
      '<div class="fan"><figure class="pane p-home" style="--d:0"><div><video data-pv muted loop playsinline preload="none"></video></div><figcaption>The homepage</figcaption></figure><figure class="pane p-phone" style="--d:1"><div><img data-pp alt=""></div><figcaption>On a phone</figcaption></figure><figure class="pane p-cms" style="--d:2" data-cmsbox><div><img data-pc alt=""></div><figcaption>The editor behind it</figcaption></figure></div></div></dialog>',
  );
  [].forEach.call(doc.querySelectorAll('[data-end]'), function (el) {
    el.classList.add('end');
    var lead = el.dataset.end || 'Tell me what you are <b>building.</b>';
    var deck = N.sites
      .map(function (s) {
        return (
          '<span class="gc" style="--c:' +
          s.accent +
          '"><img src="' +
          s.still +
          '" alt="" loading="lazy" width="584" height="1138"></span>'
        );
      })
      .join('');
    el.innerHTML =
      '<div class="end-top label"><span class="end-live"><i></i>Booking projects</span><span>' +
      N.contact.place +
      '</span></div>' +
      '<div class="end-main"><div class="end-say"><h2>' +
      lead +
      '</h2><p>' +
      N.contact.free +
      ' ' +
      N.contact.reply +
      '</p><div class="end-links"><a class="chip" href="/deal/start/">Start a project</a><a class="chip ghost" href="mailto:' +
      N.contact.email +
      '">' +
      N.contact.email +
      '</a><a class="chip ghost" href="tel:' +
      N.contact.phone.replace(/[^0-9+]/g, '') +
      '">' +
      N.contact.phone +
      '</a></div></div>' +
      '<div class="gather" data-gather><div class="gather-deck" aria-hidden="true">' +
      deck +
      '</div><a class="nine" href="/deal/start/" data-nine><span class="pip" aria-hidden="true">9</span><span class="pip flip" aria-hidden="true">9</span><span class="label">Next in the deck</span><strong>Yours.</strong></a></div></div>' +
      '<div class="end-name" aria-hidden="true"><p><b>Nixon</b> <span>Creative</span> <span>Studio</span></p></div>' +
      '<p class="legal"><a href="/deal/privacy/">Privacy</a><a href="/deal/accessibility/">Accessibility</a><a href="/deal/colophon/">How this site is built</a></p>';

    /* The deal in reverse: the clients fan out as the closing arrives, scroll squares them into one deck, and a ninth card lands on top. */
    var stage = $('[data-gather]', el),
      nine = $('[data-nine]', el);
    var gcs = [].slice.call(el.querySelectorAll('.gc')).map(function (g, i) {
      return { g: g, d: i - 3.5, s: ui.spring(120, 16, reduce ? 1 : 0) };
    });
    var n = ui.spring(150, 15, reduce ? 1 : 0),
      lift = ui.spring(240, 19, 0),
      onCard = 0,
      raf = 0,
      last = 0;
    function paint() {
      var W = stage.offsetWidth,
        spread = Math.min(W * 0.1, 46);
      gcs.forEach(function (c) {
        var v = c.s.x,
          k = 1 - v;
        c.g.style.transform =
          'translate3d(' +
          (c.d * spread * k + c.d * 1.4 * v).toFixed(2) +
          'px,' +
          (c.d * c.d * 3 * k).toFixed(2) +
          'px,0) rotate(' +
          (c.d * 6 * k + c.d * 0.9 * v).toFixed(3) +
          'deg)';
      });
      var m = n.x,
        l = lift.x;
      nine.style.transform =
        'translate3d(0,' +
        ((1 - m) * stage.offsetHeight * 0.85 - l * 16).toFixed(2) +
        'px,0) rotate(' +
        ((1 - m) * -16 + -1.6 * (1 - l)).toFixed(3) +
        'deg) scale(' +
        (1 + l * 0.03).toFixed(4) +
        ')';
      nine.style.opacity = Math.min(1, Math.max(0, m * 2.5)).toFixed(3);
    }
    function frame(now) {
      raf = 0;
      var dt = Math.min(0.033, (now - last) / 1000 || 0.016),
        H = innerHeight,
        live = false;
      last = now;
      var p = Math.min(1, Math.max(0, (H * 0.92 - stage.getBoundingClientRect().top) / (H * 0.55)));
      gcs.forEach(function (c, i) {
        var t = Math.min(1, Math.max(0, (p - Math.abs(c.d) * 0.03) / 0.72));
        t = t * t * (3 - 2 * t);
        if (c.s.step(t, dt)) live = true;
        else {
          c.s.x = t;
          c.s.v = 0;
        }
      });
      var nt = p >= 0.8 || onCard ? 1 : 0;
      if (n.step(nt, dt)) live = true;
      else {
        n.x = nt;
        n.v = 0;
      }
      if (lift.step(onCard, dt)) live = true;
      else {
        lift.x = onCard;
        lift.v = 0;
      }
      paint();
      if (live) raf = requestAnimationFrame(frame);
    }
    function wake() {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }
    paint();
    if (!reduce) {
      addEventListener('scroll', wake, { passive: true });
      addEventListener('resize', wake);
      nine.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'mouse') {
          onCard = 1;
          wake();
        }
      });
      nine.addEventListener('pointerleave', function () {
        onCard = 0;
        wake();
      });
      nine.addEventListener('focus', function () {
        onCard = 1;
        wake();
      });
      nine.addEventListener('blur', function () {
        onCard = 0;
        wake();
      });
      wake();
    } else addEventListener('resize', paint);
  });

  /* Quote bands: the band opens out and its phone settles as it reaches you. */
  ui.band = function (el, slug, html) {
    var s = ui.bySlug(slug);
    el.style.setProperty('--c', s.accent);
    el.style.setProperty('--p', s.paper);
    el.innerHTML = html + '<div class="band-w">' + ui.tile(s, { lazy: true }) + '</div>';
    ui.wireFootage(el);
  };
  var bands = [].slice.call(doc.querySelectorAll('.band'));
  if (bands.length && !reduce) {
    var braf = 0,
      blast = 0;
    var bstate = bands.map(function () {
      return 0;
    });
    var bframe = function (now) {
      braf = 0;
      var dt = Math.min(0.033, (now - blast) / 1000 || 0.016),
        H = innerHeight,
        live = false;
      blast = now;
      bands.forEach(function (el, i) {
        var t = Math.min(1, Math.max(0, (H * 1.02 - el.getBoundingClientRect().top) / (H * 0.62)));
        t = t * t * (3 - 2 * t);
        bstate[i] += (t - bstate[i]) * (1 - Math.pow(0.002, dt));
        if (Math.abs(t - bstate[i]) > 0.001) live = true;
        else bstate[i] = t;
        el.style.setProperty('--bs', (0.9 + bstate[i] * 0.1).toFixed(4));
        el.style.setProperty('--bk', (1 - bstate[i]).toFixed(4));
      });
      if (live) braf = requestAnimationFrame(bframe);
    };
    var bwake = function () {
      if (!braf) {
        blast = performance.now();
        braf = requestAnimationFrame(bframe);
      }
    };
    addEventListener('scroll', bwake, { passive: true });
    bwake();
  }

  /* The pill's highlight slides to whichever link you are near. */
  var dock = $('.dock'),
    slide = $('[data-slide]');
  [].forEach.call(dock.querySelectorAll('a:not(.go)'), function (a) {
    a.addEventListener('pointerenter', function () {
      slide.style.width = a.offsetWidth + 'px';
      slide.style.transform = 'translateX(' + a.offsetLeft + 'px)';
      slide.style.opacity = 1;
    });
  });
  dock.addEventListener('pointerleave', function () {
    slide.style.opacity = 0;
  });

  /* The client sheet: a window grows into its color and the screens fan out. */
  var sheet = $('[data-sheet]'),
    opener = null,
    pv = $('[data-pv]');
  var clipFor = function (r) {
    return (
      'inset(' +
      r.top +
      'px ' +
      (innerWidth - r.right) +
      'px ' +
      (innerHeight - r.bottom) +
      'px ' +
      r.left +
      'px round 28px)'
    );
  };
  ui.openSheet = function (s, el) {
    opener = el;
    sheet.style.setProperty('--c', s.accent);
    sheet.style.setProperty('--p', s.paper);
    $('[data-n]').textContent = s.name;
    $('[data-k]').textContent = s.hook;
    $('[data-m]').textContent = s.sector;
    $('[data-st]').href = s.study;
    var vi = $('[data-vi]');
    vi.href = 'https://' + s.host;
    vi.textContent = 'Visit ' + s.host;
    pv.poster = s.deskStill;
    pv.src = s.desk;
    $('[data-pp]').src = s.still;
    var cms = $('[data-cmsbox]');
    cms.style.display = s.cms ? '' : 'none';
    if (s.cms) $('[data-pc]').src = s.cms;
    sheet.style.setProperty('--from', clipFor(el.getBoundingClientRect()));
    sheet.scrollTop = 0;
    sheet.showModal();
    $('[data-back]').focus({ preventScroll: true });
    doc.documentElement.style.overflow = 'hidden';
    if (!reduce) {
      var p = pv.play();
      if (p && p.catch) p.catch(function () {});
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        sheet.classList.add('on');
      });
    });
  };
  var closeSheet = function () {
    if (!sheet.open) return;
    if (opener) sheet.style.setProperty('--from', clipFor(opener.getBoundingClientRect()));
    sheet.classList.remove('on');
    setTimeout(
      function () {
        pv.pause();
        sheet.close();
        doc.documentElement.style.overflow = '';
        if (opener) opener.focus({ preventScroll: true });
      },
      reduce ? 0 : 640,
    );
  };
  $('[data-back]').addEventListener('click', closeSheet);
  sheet.addEventListener('cancel', function (e) {
    e.preventDefault();
    closeSheet();
  });
  sheet.addEventListener('click', function (e) {
    if (e.target === sheet) closeSheet();
  });
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.tile[data-slug]:not([data-direct])');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    ui.play(a, false);
    ui.openSheet(ui.bySlug(a.dataset.slug), a);
  });

  /* Three price cards, each lettered in its corners like a face card. On a wide screen scroll deals them out of one
     stack into a fan, and a card straightens and lifts when you reach for it. On a phone CSS stacks them instead. */
  ui.priceHand = function (hand) {
    hand.innerHTML = N.tiers
      .map(function (t, i) {
        var pip = t.name.charAt(0);
        return (
          '<li class="pc pc-' +
          ['paper', 'blue', 'ink'][i] +
          '" style="--i:' +
          i +
          '"><a href="/deal/prices/#websites" class="pc-face"><span class="pip" aria-hidden="true">' +
          pip +
          '</span><span class="pip flip" aria-hidden="true">' +
          pip +
          '</span><h3 class="label">' +
          t.name +
          '</h3><strong>' +
          t.from +
          '</strong><span class="pc-who">Starting price.<br>' +
          t.who +
          '.</span></a></li>'
        );
      })
      .join('');
    var wide = matchMedia('(min-width:52.01rem)'),
      raf = 0,
      last = 0;
    var cards = [].slice.call(hand.children).map(function (li, i) {
      return {
        li: li,
        i: i,
        d: i - 1,
        deal: ui.spring(120, 15, 0),
        lift: ui.spring(240, 19, 0),
        on: 0,
      };
    });
    function wake() {
      if (!raf && !reduce && wide.matches) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }
    function frame(now) {
      raf = 0;
      var dt = Math.min(0.033, (now - last) / 1000 || 0.016);
      last = now;
      var r = hand.getBoundingClientRect(),
        live = false,
        cw = cards[0].li.offsetWidth;
      var p = Math.min(1, Math.max(0, (innerHeight * 0.92 - r.top) / (r.height * 0.72)));
      cards.forEach(function (c) {
        var tgt = Math.min(1, Math.max(0, (p - (c.i === 1 ? 0 : 0.1)) / 0.9));
        tgt = tgt * tgt * (3 - 2 * tgt);
        if (c.deal.step(tgt, dt)) live = true;
        else {
          c.deal.x = tgt;
          c.deal.v = 0;
        }
        if (c.lift.step(c.on, dt)) live = true;
        else {
          c.lift.x = c.on;
          c.lift.v = 0;
        }
        var v = c.deal.x,
          l = c.lift.x,
          k = 1 - v;
        var x = -c.d * cw * 0.86 * k,
          y = (c.d === 0 ? -14 : 8) * v + 60 * k - l * 26,
          rot = c.d * 6 * v * (1 - l) + c.d * 1.5 * k;
        c.li.style.transform =
          'translate3d(' +
          x.toFixed(2) +
          'px,' +
          y.toFixed(2) +
          'px,0) rotate(' +
          rot.toFixed(3) +
          'deg) scale(' +
          (1 + l * 0.035).toFixed(4) +
          ')';
        c.li.style.zIndex = c.on ? 5 : c.d === 0 ? 2 : 1;
      });
      if (live) raf = requestAnimationFrame(frame);
    }
    cards.forEach(function (c) {
      c.li.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'mouse') {
          c.on = 1;
          wake();
        }
      });
      c.li.addEventListener('pointerleave', function () {
        c.on = 0;
        wake();
      });
      c.li.addEventListener('focusin', function (e) {
        if (e.target.matches(':focus-visible')) {
          c.on = 1;
          wake();
        }
      });
      c.li.addEventListener('focusout', function () {
        c.on = 0;
        wake();
      });
    });
    addEventListener('scroll', wake, { passive: true });
    addEventListener('resize', function () {
      if (wide.matches) wake();
      else
        cards.forEach(function (c) {
          c.li.style.transform = '';
          c.li.style.zIndex = '';
        });
    });
    wake();
  };

  /* A big heading picks up weight as you scroll to it, thin to heavy, so "pull their weight" happens to the type. */
  var weighs = [].map.call(doc.querySelectorAll('[data-weigh]'), function (el) {
    return { el: el, g: 200, shown: 0 };
  });
  if (weighs.length && !reduce) {
    var wraf = 0,
      wlast = 0;
    var wwake = function () {
      if (!wraf) {
        wlast = performance.now();
        wraf = requestAnimationFrame(wframe);
      }
    };
    var wframe = function (now) {
      wraf = 0;
      var dt = Math.min(0.033, (now - wlast) / 1000 || 0.016),
        H = innerHeight,
        live = false;
      wlast = now;
      weighs.forEach(function (w) {
        var p = Math.min(
          1,
          Math.max(0, (H * 1.02 - w.el.getBoundingClientRect().top) / (H * 0.72)),
        );
        var t = 200 + 500 * p * p * (3 - 2 * p);
        w.g += (t - w.g) * (1 - Math.pow(0.0015, dt));
        if (Math.abs(t - w.g) > 0.8) live = true;
        else w.g = t;
        var n = Math.round(w.g);
        if (n !== w.shown) {
          w.shown = n;
          w.el.style.fontWeight = n;
        }
      });
      if (live) wraf = requestAnimationFrame(wframe);
    };
    addEventListener('scroll', wwake, { passive: true });
    wwake();
  }

  addEventListener('pageshow', function () {
    doc.documentElement.style.overflow = '';
  });
})();
