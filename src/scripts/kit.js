/* Shared behaviour for every page: footage, the closing deck, quote bands, the dock's highlight,
   the client sheet, the price hand and the big type's weight. The markup all comes from the server
   (Tile, Closing, QuoteBand, PriceHand, ClientSheet, Dock); this file only moves it. Page scripts
   import { ui, sites } from here, so this always runs first. Without JavaScript none of it runs and
   every link, price and client is still on the page. */

var doc = document;
var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
/* Data Saver on: a window stays on its poster still, and no clip is fetched. */
var saveData = !!(navigator.connection && navigator.connection.saveData);
/* Anything the visitor does that could scroll the page. Until one happens, a page that is already
   scrolled got there by reload or Back, and has nothing to replay. */
var moved = false;
['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (type) {
  addEventListener(
    type,
    function () {
      moved = true;
    },
    { once: true, passive: true },
  );
});
/* The one thing a mouse can be holding, see ui.stillHover below. */
var held = null,
  heldX = 0,
  heldY = 0,
  HOLD_PAD = 40;
var outside = function (r, x, y, pad) {
  return x < r.left - pad || x > r.right + pad || y < r.top - pad || y > r.bottom + pad;
};
var letGo = function () {
  var h = held;
  if (!h) return;
  held = null;
  h.offs.forEach(function (f) {
    f();
  });
};
addEventListener(
  'pointermove',
  function (e) {
    heldX = e.clientX;
    heldY = e.clientY;
    if (!held || e.pointerType !== 'mouse') return;
    if (outside(held.rest, heldX, heldY, HOLD_PAD)) letGo();
    else if (outside(held.rest, heldX, heldY, 0)) {
      /* In the margin: if another card is under the pointer now, that one takes over. */
      var over = doc.elementFromPoint(heldX, heldY),
        el = over && over.closest('[data-still]');
      if (el && el !== held.el && el._still) el._still.take();
    }
  },
  { passive: true },
);
/* Scrolling moves the card out from under a pointer that has not moved, so measure again. */
addEventListener(
  'scroll',
  function () {
    if (!held) return;
    held.rest = held.el.getBoundingClientRect();
    if (outside(held.rest, heldX, heldY, HOLD_PAD)) letGo();
  },
  { passive: true },
);
doc.documentElement.addEventListener('pointerleave', letGo);
var $ = function (a, r) {
  return (r || doc).querySelector(a);
};
/* The clients, printed by ClientSheet.astro from the case study frontmatter. */
var N = { sites: JSON.parse(doc.getElementById('ncs-clients').textContent) };
export var ui = {
  reduce: reduce,
  bySlug: function (slug) {
    return N.sites.find(function (s) {
      return s.slug === slug;
    });
  },
  /* True when the page is already scrolled and the visitor has not touched it: a reload or a Back. */
  restored: function () {
    return !moved && scrollY > 0;
  },
  /* Hover with a memory. A card that lifts can lift off the pointer, which would drop it, which
     would put it back under the pointer, for as long as the mouse moves. So this remembers where
     the card rested when the pointer arrived, and only counts the pointer as gone once it is outside
     that rectangle grown by 40px, or on another card. Mouse only; several callers can share a card. */
  stillHover: function (el, on, off) {
    if (!el._still) {
      el.dataset.still = '';
      var s = (el._still = {
        el: el,
        rest: null,
        ons: [],
        offs: [],
        take: function () {
          letGo();
          s.rest = el.getBoundingClientRect();
          held = s;
          s.ons.forEach(function (f) {
            f();
          });
        },
      });
      el.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return;
        heldX = e.clientX;
        heldY = e.clientY;
        if (held === s) {
          /* Back under the pointer after something covered it, like the client sheet. */
          s.ons.forEach(function (f) {
            f();
          });
          return;
        }
        /* Still over the held card's resting place: the card under the pointer waits its turn. */
        if (held && !outside(held.rest, heldX, heldY, 0)) return;
        s.take();
      });
    }
    el._still.ons.push(on);
    el._still.offs.push(off);
  },
  /* Footage: a window plays its real site on hover, or on touch while centered. Two at most. */
  play: function (tile, on) {
    var v = $('video', tile);
    if (!v) return;
    if (on && !reduce && !saveData) {
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
    tiles = tiles.filter(function (t) {
      if (t.dataset.wired) return false;
      t.dataset.wired = '1';
      return true;
    });
    tiles.forEach(function (t) {
      ui.stillHover(
        t,
        function () {
          ui.play(t, true);
        },
        function () {
          ui.play(t, false);
        },
      );
    });
    if (
      matchMedia('(hover: none)').matches &&
      !reduce &&
      !saveData &&
      'IntersectionObserver' in window
    ) {
      /* Touch has no hover, so the phone at the middle of the screen plays. It is judged by its holder,
         because the home deal moves the phones themselves: otherwise the whole hand counts as centered
         on load and every clip downloads. Nothing starts until the first scroll, so a page that is only
         looked at costs no video. */
      var cur = null,
        wait = 0,
        holders = new Map(),
        io = new IntersectionObserver(
          function (es) {
            es.forEach(function (e) {
              var t = holders.get(e.target);
              if (e.isIntersecting) {
                /* Wait until it has settled there, so scrolling past a phone never downloads its clip. */
                clearTimeout(wait);
                wait = setTimeout(function () {
                  if (cur && cur !== t) ui.play(cur, false);
                  cur = t;
                  ui.play(cur, true);
                }, 350);
              } else if (cur === t) {
                ui.play(cur, false);
                cur = null;
              }
            });
          },
          { rootMargin: '-40% 0px -40% 0px' },
        );
      tiles.forEach(function (t) {
        holders.set(t.parentNode, t);
      });
      addEventListener(
        'scroll',
        function () {
          holders.forEach(function (t, holder) {
            io.observe(holder);
          });
        },
        { once: true, passive: true },
      );
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
};

[].forEach.call(doc.querySelectorAll('[data-end]'), function (el) {
  /* The deal in reverse: the clients fan out as the closing arrives, scroll squares them into one deck, and a last card, Yours, lands on top. */
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
    ui.stillHover(
      nine,
      function () {
        onCard = 1;
        wake();
      },
      function () {
        onCard = 0;
        wake();
      },
    );
    nine.addEventListener('focus', function () {
      /* The browser scrolled to where the card was waiting, below the deck. Land it now and scroll
         to where it really is, so at 200 percent zoom focus does not leave it off the screen. */
      n.x = 1;
      n.v = 0;
      onCard = 1;
      paint();
      nine.scrollIntoView({ block: 'nearest', behavior: 'instant' });
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
var bands = [].slice.call(doc.querySelectorAll('.band'));
bands.forEach(function (el) {
  ui.wireFootage(el);
});
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

/* The client sheet: a window grows into its color and the screens fan out. A window is a plain link
   until this script runs, so it only says it opens a dialog from here on. */
[].forEach.call(doc.querySelectorAll('.tile[data-slug]:not([data-direct])'), function (t) {
  t.setAttribute('aria-haspopup', 'dialog');
});
var sheet = $('[data-sheet]'),
  opener = null,
  closing = false,
  pv = $('[data-pv]'),
  pvBtn = $('[data-pv-toggle]'),
  pvStopped = false;
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
var pvPlay = function () {
  if (reduce || saveData || pvStopped) return;
  var p = pv.play();
  if (p && p.catch) p.catch(function () {});
};
/* The sheet's footage loops, so it gets a pause button. A paused clip stays paused for the visit. */
if (reduce || saveData) pvBtn.hidden = true;
pvBtn.addEventListener('click', function () {
  pvStopped = !pvStopped;
  pvBtn.textContent = pvStopped ? 'Play video' : 'Pause video';
  if (pvStopped) pv.pause();
  else pvPlay();
});
/* An open sheet has its own address, the page plus ?client=<slug>, so it can be shared, and reload
   comes back to it. Without a script that address is simply the page, with every window on it a
   plain link to its case study. */
var sheetUrl = function (slug) {
  var u = new URL(location.href);
  if (slug) u.searchParams.set('client', slug);
  else u.searchParams.delete('client');
  return u.pathname + u.search + u.hash;
};
/* The sheet gets its own history entry, so the browser's Back closes it instead of leaving the page.
   restoring means that entry already exists: the visitor came back to it. */
ui.openSheet = function (s, el, restoring) {
  if (sheet.open) return;
  opener = el;
  if (!restoring) history.pushState({ ncsSheet: s.slug }, '', sheetUrl(s.slug));
  sheet.style.setProperty('--c', s.accent);
  sheet.style.setProperty('--p', s.paper);
  $('[data-n]').textContent = s.name;
  $('[data-k]').textContent = s.hook;
  $('[data-m]').textContent = s.sector;
  $('[data-st]').href = s.study;
  var vi = $('[data-vi]');
  vi.href = s.live;
  vi.textContent = 'Visit ' + s.host;
  pv.poster = s.deskStill;
  pv.src = s.desk;
  $('[data-pp]').src = s.still;
  var cms = $('[data-cmsbox]');
  cms.style.display = s.cms ? '' : 'none';
  if (s.cms) $('[data-pc]').src = s.cms;
  /* A shared address can name a client this page has no window for: grow from the middle instead. */
  var cx = innerWidth / 2,
    cy = innerHeight / 2;
  sheet.style.setProperty(
    '--from',
    clipFor(
      el
        ? el.getBoundingClientRect()
        : { top: cy - 40, right: cx + 40, bottom: cy + 40, left: cx - 40 },
    ),
  );
  sheet.scrollTop = 0;
  sheet.showModal();
  $('[data-back]').focus({ preventScroll: true });
  doc.documentElement.style.overflow = 'hidden';
  pvPlay();
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      sheet.classList.add('on');
    });
  });
};
var shutSheet = function () {
  if (!sheet.open || closing) return;
  closing = true;
  if (opener) sheet.style.setProperty('--from', clipFor(opener.getBoundingClientRect()));
  sheet.classList.remove('on');
  setTimeout(
    function () {
      closing = false;
      pv.pause();
      sheet.close();
      doc.documentElement.style.overflow = '';
      if (opener) opener.focus({ preventScroll: true });
    },
    reduce ? 0 : 640,
  );
};
/* Closed by hand: step back off the sheet's history entry too. popstate finds it already closing. */
var closeSheet = function () {
  if (!sheet.open || closing) return;
  shutSheet();
  if (history.state && history.state.ncsSheet) history.back();
};
/* Arrived on a sheet's history entry with the sheet shut: open it again. Arrived fresh on a shared
   address: put the plain page behind it first, so Back and Esc land on this page, not off the site. */
var sheetEntry = function () {
  if (sheet.open) return;
  var slug = history.state && history.state.ncsSheet,
    restoring = !!slug;
  if (!slug) {
    slug = new URLSearchParams(location.search).get('client');
    if (!slug) return;
    history.replaceState(history.state, '', sheetUrl(null));
  }
  var client = ui.bySlug(slug),
    tile = [].filter.call(doc.querySelectorAll('.tile[data-slug]'), function (t) {
      return t.dataset.slug === slug;
    })[0];
  if (client) ui.openSheet(client, tile || null, restoring);
};
addEventListener('popstate', function () {
  if (history.state && history.state.ncsSheet) sheetEntry();
  else shutSheet();
});
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

/* The three price cards (PriceHand.astro), each lettered in its corners like a face card. On a wide screen scroll deals them out of one
   stack into a fan, and a card straightens and lifts when you reach for it. On a phone CSS stacks them instead. */
var priceHand = function (hand) {
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
    ui.stillHover(
      c.li,
      function () {
        c.on = 1;
        wake();
      },
      function () {
        c.on = 0;
        wake();
      },
    );
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

[].forEach.call(doc.querySelectorAll('[data-prices]'), priceHand);

/* A big heading picks up weight as you scroll to it, thin to heavy, so "pull their weight" happens to the type. */
var weighs = [].map.call(doc.querySelectorAll('[data-weigh]'), function (el) {
  /* data-weigh="0.6 0.15" gains the weight while the line's top goes from 60 to 15 percent of the
     screen. With no value it runs from just below the fold to 30 percent. */
  var range = (el.dataset.weigh || '').split(' ').map(Number);
  return {
    el: el,
    g: 200,
    shown: 0,
    from: range.length === 2 ? range[0] : 1.02,
    to: range.length === 2 ? range[1] : 0.3,
  };
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
      var p = (H * w.from - w.el.getBoundingClientRect().top) / (H * (w.from - w.to));
      p = Math.min(1, Math.max(0, p));
      var t = 200 + 500 * p * p * (3 - 2 * p);
      w.g += (t - w.g) * (1 - Math.pow(0.0015, dt));
      if (Math.abs(t - w.g) > 0.8) live = true;
      else w.g = t;
      var n = Math.round(w.g);
      if (n !== w.shown) {
        w.shown = n;
        w.el.style.fontWeight = n;
        w.el.style.setProperty('--lit', ((n - 200) / 500).toFixed(3));
      }
    });
    if (live) wraf = requestAnimationFrame(wframe);
  };
  addEventListener('scroll', wwake, { passive: true });
  wwake();
}

addEventListener('pageshow', function () {
  /* Back from a case study returns to the sheet it was opened from. With bfcache the sheet is still
     open and only its clip needs restarting; without it, the sheet's history entry opens it again. */
  if (sheet.open) {
    doc.documentElement.style.overflow = 'hidden';
    pvPlay();
    return;
  }
  doc.documentElement.style.overflow = '';
  sheetEntry();
});

export var sites = N.sites;
