/* Shared behaviour for every page: the top line, footage, the closing deck, quote bands, the dock's highlight,
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
        stop = 0,
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
                  /* Scrolling started it, not a tap, so it goes back to its still inside five
                     seconds (WCAG 2.2.2). Moving it off the middle and back plays it again. */
                  clearTimeout(stop);
                  stop = setTimeout(function () {
                    if (cur === t) ui.play(t, false);
                  }, 5000);
                }, 350);
              } else if (cur === t) {
                clearTimeout(stop);
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
      step: function (to, dt, stiffer) {
        this.v += ((stiffer || k) * (to - this.x) - c * this.v) * dt;
        this.x += this.v * dt;
        return Math.abs(to - this.x) > 0.0005 || Math.abs(this.v) > 0.004;
      },
    };
  },
};

[].forEach.call(doc.querySelectorAll('[data-end]'), function (el) {
  /* The deal in reverse: the clients fan out as the closing arrives, scroll squares them into one deck, and a last card, Yours, lands on top.
     Beside it, a name in the selected work pulls that client's card back out, and the poster name is dealt up a letter at a time. */
  var stage = $('[data-gather]', el),
    nine = $('[data-nine]', el);
  var gcs = [].slice.call(el.querySelectorAll('.gc')).map(function (g, i) {
    return {
      g: g,
      d: i - 3.5,
      s: ui.spring(120, 16, reduce ? 1 : 0),
      pull: ui.spring(190, 17, 0),
    };
  });
  var rows = [].slice.call(el.querySelectorAll('[data-pull]')),
    slide = $('[data-pull-slide]', el),
    slideY = ui.spring(320, 26, 0),
    slideO = 0,
    slideH = 0,
    picked = -1,
    moved = ui.spring(190, 17, 0);
  /* The poster name. Letters rise in reading order, and the ones by the pointer lift a little. */
  var nameEl = $('[data-name]', el),
    glyphs = [].slice.call(el.querySelectorAll('[data-name] i')).map(function (g, i) {
      return {
        g: g,
        i: i,
        s: ui.spring(170, 17, reduce ? 1 : 0),
        h: ui.spring(280, 20, 0),
        cx: 0,
        t: 0,
      };
    });
  var n = ui.spring(150, 15, reduce ? 1 : 0),
    lift = ui.spring(240, 19, 0),
    onCard = 0,
    raf = 0,
    last = 0;
  function paint() {
    var W = stage.offsetWidth,
      gw = gcs.length ? gcs[0].g.offsetWidth : 0,
      /* Out to the right of the deck, as far as the panel leaves room. */
      reach = Math.min(gw * 0.4, (W - gw) / 2 + 24),
      spread = Math.min(W * 0.1, 46);
    gcs.forEach(function (c) {
      var v = c.s.x,
        k = 1 - v;
      c.g.style.transform =
        'translate3d(' +
        (c.d * spread * k + c.d * 1.4 * v + c.pull.x * reach).toFixed(2) +
        'px,' +
        (c.d * c.d * 3 * k - c.pull.x * gw * 0.14).toFixed(2) +
        'px,0) rotate(' +
        (c.d * 6 * k + c.d * 0.9 * v + c.pull.x * 7).toFixed(3) +
        'deg) scale(' +
        (1 + c.pull.x * 0.06).toFixed(4) +
        ')';
      c.g.style.zIndex = c.pull.x > 0.02 ? 5 : '';
    });
    if (slide) {
      slide.style.transform = 'translate3d(0,' + slideY.x.toFixed(2) + 'px,0)';
      slide.style.height = slideH + 'px';
      slide.style.opacity = slideO;
    }
    glyphs.forEach(function (c) {
      var v = c.s.x,
        h = c.h.x;
      c.g.style.transform =
        v > 0.999 && h < 0.002
          ? ''
          : 'translate3d(0,' +
            ((1 - v) * 108 - h * 9).toFixed(2) +
            '%,0) rotate(' +
            ((1 - v) * (c.i % 2 ? 7 : -7)).toFixed(2) +
            'deg)';
    });
    var m = n.x,
      l = lift.x;
    nine.style.transform =
      'translate3d(0,' +
      ((1 - m) * stage.offsetHeight * 0.85 - l * 16).toFixed(2) +
      'px,0) translateX(' +
      (moved.x * gw * -0.13).toFixed(2) +
      'px) rotate(' +
      ((1 - m) * -16 + -1.6 * (1 - l) + moved.x * -3.5).toFixed(3) +
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
    gcs.forEach(function (c, i) {
      var to = picked === i ? 1 : 0;
      if (c.pull.step(to, dt)) live = true;
      else {
        c.pull.x = to;
        c.pull.v = 0;
      }
    });
    if (moved.step(picked < 0 ? 0 : 1, dt)) live = true;
    else {
      moved.x = picked < 0 ? 0 : 1;
      moved.v = 0;
    }
    if (picked >= 0 && slide) {
      var to = rows[picked].parentNode.offsetTop;
      if (slideY.step(to, dt)) live = true;
      else {
        slideY.x = to;
        slideY.v = 0;
      }
    }
    if (glyphs.length) {
      var box = nameEl.getBoundingClientRect();
      /* Done by the time the name is most of the way up, so it always finishes above the page's end. */
      var q = Math.min(1, Math.max(0, (H - box.top) / (box.height * 0.8)));
      glyphs.forEach(function (c) {
        var t = Math.min(1, Math.max(0, q * 1.6 - (c.i / glyphs.length) * 0.6));
        if (c.s.step(t, dt)) live = true;
        else {
          c.s.x = t;
          c.s.v = 0;
        }
        if (c.h.step(c.t, dt)) live = true;
        else {
          c.h.x = c.t;
          c.h.v = 0;
        }
      });
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
  /* Pick a name: its row takes the bar, its card comes out. Under reduced motion both simply jump. */
  function pick(i) {
    if (picked === i) return;
    var was = picked < 0;
    rows.forEach(function (r, k) {
      r.classList.toggle('on', k === i);
    });
    picked = i;
    if (i >= 0 && slide) {
      var li = rows[i].parentNode;
      slideH = li.offsetHeight;
      slideO = 1;
      if (was || reduce) {
        slideY.x = li.offsetTop;
        slideY.v = 0;
      }
    } else slideO = 0;
    if (reduce) {
      gcs.forEach(function (c, k) {
        c.pull.x = k === i ? 1 : 0;
      });
      moved.x = i < 0 ? 0 : 1;
      paint();
    } else wake();
  }
  rows.forEach(function (r, i) {
    /* A finger's tap goes straight to the study. Only a real pointer previews. */
    r.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'touch') pick(i);
    });
    r.addEventListener('focus', function () {
      if (r.matches(':focus-visible')) pick(i);
    });
    r.addEventListener('blur', function () {
      if (picked === i) pick(-1);
    });
  });
  if (rows.length)
    rows[0].closest('ul').addEventListener('pointerleave', function () {
      pick(-1);
    });
  paint();
  if (!reduce) {
    if (nameEl && matchMedia('(hover: hover)').matches) {
      nameEl.addEventListener('pointerenter', function () {
        glyphs.forEach(function (c) {
          var b = c.g.getBoundingClientRect();
          c.cx = b.left + b.width / 2;
        });
      });
      nameEl.addEventListener('pointermove', function (e) {
        var r = nameEl.offsetWidth * 0.07;
        glyphs.forEach(function (c) {
          c.t = Math.max(0, 1 - Math.abs(c.cx - e.clientX) / r);
        });
        wake();
      });
      nameEl.addEventListener('pointerleave', function () {
        glyphs.forEach(function (c) {
          c.t = 0;
        });
        wake();
      });
    }
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
/* The marker on a quote's key phrase (QuoteBand `highlight`) draws once the band is mostly on
   screen. With no IntersectionObserver the phrase is simply marked from the start. */
var hlBands = bands.filter(function (el) {
  return el.querySelector('.hl');
});
if (hlBands.length) {
  if ('IntersectionObserver' in window) {
    var hlSee = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('hl-on');
          hlSee.unobserve(e.target);
        });
      },
      { threshold: 0.4 },
    );
    hlBands.forEach(function (el) {
      el.classList.add('hl-wait');
      hlSee.observe(el);
    });
  }
}
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

/* The dock. Three things move here, all on the same springs as the rest of the site. */
var dock = $('.dock'),
  slide = $('[data-slide]'),
  scrim = $('[data-dock-scrim]'),
  dockLinks = [].slice.call(dock.querySelectorAll(':scope > a'));

/* The puck rests on the page you are on and goes to the link you are near. Each edge has its own
   spring and the leading edge is the quicker, so it stretches on the way and gathers on landing. */
var puckRest = dock.querySelector(':scope > a[aria-current]:not(.go)'),
  puckTo = puckRest,
  puckL = ui.spring(320, 26, 0),
  puckR = ui.spring(320, 26, 0),
  puckRaf = 0,
  puckLast = 0,
  puckFwd = true;
function puckPaint() {
  slide.style.width = Math.max(0, puckR.x - puckL.x) + 'px';
  slide.style.transform = 'translateX(' + puckL.x + 'px)';
}
function puckFrame(t) {
  var dt = Math.min((t - puckLast) / 1000, 0.032),
    left = puckTo.offsetLeft,
    right = left + puckTo.offsetWidth,
    a = puckL.step(left, dt, puckFwd ? 210 : 420),
    b = puckR.step(right, dt, puckFwd ? 420 : 210);
  puckLast = t;
  puckPaint();
  puckRaf = a || b ? requestAnimationFrame(puckFrame) : 0;
}
function puckGo(a, jump) {
  puckTo = a || puckRest;
  slide.style.opacity = puckTo && puckTo.offsetWidth ? 1 : 0;
  if (!puckTo) return;
  var left = puckTo.offsetLeft,
    right = left + puckTo.offsetWidth;
  if (jump || reduce) {
    puckL.x = left;
    puckR.x = right;
    puckL.v = puckR.v = 0;
    puckPaint();
    return;
  }
  /* The edge going forward leads. */
  puckFwd = left > puckL.x;
  if (!puckRaf) {
    puckLast = performance.now();
    puckRaf = requestAnimationFrame(puckFrame);
  }
}

/* How far down the page you are: a hairline round the pill. It answers scrolling and nothing else. */
var rail = $('[data-rail]'),
  railPath = rail.firstElementChild,
  railSeen = -1;
function railShape() {
  var w = dock.offsetWidth,
    h = dock.offsetHeight,
    r = h / 2;
  /* From the left end, along the top, round the right end and back along the bottom. */
  railPath.setAttribute(
    'd',
    'M0 ' +
      r +
      'A' +
      r +
      ' ' +
      r +
      ' 0 0 1 ' +
      r +
      ' 0' +
      'H' +
      (w - r) +
      'A' +
      r +
      ' ' +
      r +
      ' 0 0 1 ' +
      (w - r) +
      ' ' +
      h +
      'H' +
      r +
      'A' +
      r +
      ' ' +
      r +
      ' 0 0 1 0 ' +
      r +
      'Z',
  );
}
function railPaint() {
  var range = doc.documentElement.scrollHeight - innerHeight,
    /* A page with no real length has no distance to show. */
    p = range > innerHeight * 0.25 ? Math.min(1, Math.max(0, scrollY / range)) : 0;
  if (p === railSeen) return;
  railSeen = p;
  rail.classList.toggle('on', p > 0.002);
  railPath.style.strokeDashoffset = 1 - p;
  spyPaint();
}
addEventListener('scroll', railPaint, { passive: true });

/* Where you are in a long read. A page with chapters (a case study) gets one tick a chapter on the
   rail, each at the point the line reaches as that chapter comes up the screen, and the chapter's
   name shows above the pill for a moment when you arrive in it. It is a picture of the headings,
   not a second menu: nothing here is focusable, and the headings themselves are on the page. */
var spy = $('[data-spy]'),
  spyN = $('[data-spy-n]'),
  spyT = $('[data-spy-t]'),
  spyAt = -1,
  spyTall = 0,
  spyHide = 0,
  ticks = [].slice
    .call(doc.querySelectorAll('.chap[id]'))
    .map(function (sec) {
      var h = sec.querySelector('h2');
      return { sec: sec, name: h ? h.textContent.trim() : '', p: 0, el: null };
    })
    .filter(function (t) {
      return t.name;
    });
if (!spy || ticks.length < 2) ticks = [];
ticks.forEach(function (t) {
  t.el = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
  t.el.setAttribute('r', 3);
  rail.appendChild(t.el);
});
if (ticks.length) rail.classList.add('has-ticks');
function spyMeasure() {
  if (!ticks.length) return;
  spyTall = doc.documentElement.scrollHeight;
  var range = Math.max(1, spyTall - innerHeight),
    len = railPath.getTotalLength();
  ticks.forEach(function (t) {
    /* A chapter counts as reached when its top is a little above the middle of the screen. */
    var top = t.sec.getBoundingClientRect().top + scrollY - innerHeight * 0.45;
    t.p = Math.min(1, Math.max(0, top / range));
    var pt = railPath.getPointAtLength(t.p * len);
    t.el.setAttribute('cx', pt.x.toFixed(2));
    t.el.setAttribute('cy', pt.y.toFixed(2));
  });
}
function spyPaint() {
  if (!ticks.length) return;
  /* Pictures loading further up move every chapter down the page. */
  if (doc.documentElement.scrollHeight !== spyTall) spyMeasure();
  var at = -1;
  ticks.forEach(function (t, i) {
    var past = railSeen > 0.002 && railSeen >= t.p;
    t.el.classList.toggle('past', past);
    if (past) at = i;
  });
  if (at === spyAt) return;
  spyAt = at;
  ticks.forEach(function (t, i) {
    t.el.classList.toggle('now', i === at);
  });
  clearTimeout(spyHide);
  /* The name shows only for someone scrolling. Not on a page that loaded already scrolled, not over
     an open hand, and never while the keyboard is on something in the page, so it cannot sit on a
     focused control (WCAG 2.4.11). */
  var f = doc.activeElement,
    keyed = f && f !== doc.body && !dock.contains(f) && f.matches(':focus-visible');
  if (at < 0 || !moved || handOpen || keyed) {
    spy.classList.remove('on');
    return;
  }
  spyN.textContent = (at < 9 ? '0' : '') + (at + 1);
  spyT.textContent = ticks[at].name;
  spy.classList.add('on');
  spyHide = setTimeout(function () {
    spy.classList.remove('on');
  }, 1900);
}
/* Tab moves on to a control in the page: the name steps out of the way at once. */
if (ticks.length) {
  addEventListener('keydown', function (e) {
    if (e.key === 'Tab') spy.classList.remove('on');
  });
}

function dockMeasure() {
  railShape();
  spyMeasure();
  railSeen = -1;
  railPaint();
  puckGo(puckTo, true);
}
if (ticks.length) addEventListener('load', dockMeasure);
dockMeasure();
addEventListener('resize', dockMeasure);
if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(dockMeasure);

/* Tapping the page you are already on goes back to the top of it, rather than reloading it. */
dockLinks.forEach(function (a) {
  if (a.getAttribute('aria-current') !== 'page') return;
  a.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
});

/* The hands. Each link can deal its cards up out of the pill. Only for a mouse on a wide screen,
   or a keyboard (the up arrow opens one; Escape folds it and hands focus back). A phone taps the
   link and gets the page, which has everything a hand has. */
var canDeal = matchMedia(
    '(hover: hover) and (pointer: fine) and (min-width: 56rem) and (min-height: 36rem)',
  ),
  hands = [],
  handOpen = null,
  handWait = 0,
  handRaf = 0,
  handLast = 0;
dockLinks.forEach(function (a) {
  var fan = a.nextElementSibling;
  puckEnter(a);
  if (!fan || !fan.hasAttribute('data-fan')) return;
  var cards = [].slice.call(fan.querySelectorAll('.fc')),
    mid = (cards.length - 1) / 2,
    cap = fan.querySelector('[data-fan-cap]'),
    hand = {
      a: a,
      fan: fan,
      to: 0,
      cards: cards.map(function (el, i) {
        var d = i - mid;
        el.style.setProperty('--d', d);
        el.style.setProperty('--far', Math.round(Math.abs(d)));
        return { el: el, s: ui.spring(170, 17, 0), wait: Math.abs(d) * 26 };
      }),
    };
  hands.push(hand);
  if (canDeal.matches) a.setAttribute('aria-expanded', 'false');
  if (cap) {
    cards.forEach(function (el) {
      var say = function () {
          cap.textContent = el.dataset.cap;
        },
        rest = function () {
          cap.textContent = cap.dataset.rest;
        };
      el.addEventListener('pointerenter', say);
      el.addEventListener('focus', say);
      el.addEventListener('pointerleave', rest);
      el.addEventListener('blur', rest);
    });
  }
  a.addEventListener('pointerenter', function (e) {
    if (e.pointerType !== 'mouse' || !canDeal.matches) return;
    clearTimeout(handWait);
    /* A pointer just passing through the dock on its way somewhere does not deal anything. */
    handWait = setTimeout(
      function () {
        handShow(hand);
      },
      handOpen ? 0 : 90,
    );
  });
  a.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowUp' || !canDeal.matches) return;
    e.preventDefault();
    handShow(hand);
    var first = fan.querySelector('a');
    if (first) first.focus({ preventScroll: true });
  });
  fan.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      handHide();
      a.focus();
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      var all = [].slice.call(fan.querySelectorAll('a')),
        at = all.indexOf(doc.activeElement);
      if (at < 0) return;
      e.preventDefault();
      all[(at + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length].focus({
        preventScroll: true,
      });
    }
  });
  fan.addEventListener('focusout', function (e) {
    if (!dock.contains(e.relatedTarget) && handOpen === hand) handHide();
  });
});
function puckEnter(a) {
  a.addEventListener('pointerenter', function () {
    /* The action has its own color, so the puck stays home for it. */
    puckGo(a.classList.contains('go') ? puckRest : a);
  });
}
dock.addEventListener('pointerleave', function () {
  puckGo(puckRest);
  clearTimeout(handWait);
  handWait = setTimeout(handHide, 180);
});
dock.addEventListener('pointerenter', function () {
  clearTimeout(handWait);
});
addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && handOpen && !handOpen.fan.contains(doc.activeElement)) handHide();
});
function handMark(hand, open) {
  hand.to = open ? 1 : 0;
  hand.opened = performance.now();
  hand.fan.classList.toggle('on', open);
  if (hand.a.hasAttribute('aria-expanded')) hand.a.setAttribute('aria-expanded', String(open));
  if (open) hand.fan.hidden = false;
}
function handShow(hand) {
  if (handOpen === hand) return;
  if (handOpen) handMark(handOpen, false);
  handOpen = hand;
  scrim.classList.add('on');
  handMark(hand, true);
  handWake();
}
function handHide() {
  if (!handOpen) return;
  handMark(handOpen, false);
  handOpen = null;
  scrim.classList.remove('on');
  handWake();
}
function handFrame(t) {
  var dt = Math.min((t - handLast) / 1000, 0.032),
    alive = false;
  handLast = t;
  hands.forEach(function (h) {
    if (h.fan.hidden) return;
    var moving = false;
    h.cards.forEach(function (c) {
      /* Dealt from the middle out; folded all together, and quicker. */
      var go = h.to === 0 || t - h.opened >= c.wait;
      if (reduce) {
        c.s.x = h.to;
        c.s.v = 0;
      } else if (go && c.s.step(h.to, h.to ? dt : dt * 1.5)) {
        moving = true;
      } else if (!go) {
        moving = true;
      }
      c.el.style.setProperty('--v', c.s.x.toFixed(4));
    });
    if (moving) alive = true;
    /* A folded hand leaves the tab order and the page's way. */
    else if (h.to === 0) h.fan.hidden = true;
  });
  handRaf = alive ? requestAnimationFrame(handFrame) : 0;
}
function handWake() {
  if (!handRaf) {
    handLast = performance.now();
    handRaf = requestAnimationFrame(handFrame);
  }
}

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

/* A big line builds as you scroll to it: its words rise into place in reading order, tied to the
   scroll, and are all home by the time the line's top reaches 40 percent of the screen.
   data-build="1 0.4" is that default (start as the top crosses the bottom edge, finish at 40
   percent); two numbers change it. Only a line that starts below the fold does this. One already
   on the first screen, a page that loaded scrolled (ui.restored), and reduced motion all leave it
   simply set. The words are wrapped in visual spans here; the heading keeps its plain sentence as
   its accessible name. Works beside data-weigh: that one sets the weight, this one moves the words. */
var builds =
  reduce || ui.restored()
    ? []
    : [].filter.call(doc.querySelectorAll('[data-build]'), function (el) {
        return el.getBoundingClientRect().top >= innerHeight;
      });
var wordsOf = function (el) {
  var words = [];
  var walk = function (node) {
    [].slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 1) return walk(n);
      if (n.nodeType !== 3 || !n.textContent.trim()) return;
      var frag = doc.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) return frag.appendChild(doc.createTextNode(part));
        var s = doc.createElement('span');
        s.className = 'bw';
        s.textContent = part;
        words.push(s);
        frag.appendChild(s);
      });
      n.parentNode.replaceChild(frag, n);
    });
  };
  if (!el.hasAttribute('aria-label'))
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  walk(el);
  return words;
};
var lines = builds.map(function (el) {
  var range = (el.dataset.build || '').split(' ').map(Number);
  var words = wordsOf(el);
  return {
    el: el,
    from: range.length === 2 ? range[0] : 1,
    to: range.length === 2 ? range[1] : 0.4,
    words: words.map(function () {
      return { q: 0, shown: -1 };
    }),
    spans: words,
  };
});
if (lines.length) {
  var braf = 0,
    blast = 0;
  var bwake = function () {
    if (!braf) {
      blast = performance.now();
      braf = requestAnimationFrame(bframe);
    }
  };
  /* Each word gets a window of the line's progress, half of it wide, spaced in reading order. */
  var WIN = 0.5;
  var bframe = function (now) {
    braf = 0;
    var dt = Math.min(0.033, (now - blast) / 1000 || 0.016),
      H = innerHeight,
      live = false;
    blast = now;
    lines.forEach(function (l) {
      var top = l.el.getBoundingClientRect().top;
      var P = (H * l.from - top) / (H * (l.from - l.to));
      P = Math.min(1, Math.max(0, P));
      var n = l.words.length;
      /* Off the screen the words only wait low, at full ink: the faint start is applied once the
         line is in sight, so an audit of the page as it loads never meets half-faded text. */
      var seen = top < H ? 1 : 0;
      l.words.forEach(function (w, i) {
        var start = n > 1 ? (i * (1 - WIN)) / (n - 1) : 0;
        var t = Math.min(1, Math.max(0, (P - start) / WIN));
        t = t * t * (3 - 2 * t);
        w.q += (t - w.q) * (1 - Math.pow(0.0008, dt));
        if (Math.abs(t - w.q) > 0.002) live = true;
        else w.q = t;
        var shown = Math.round(w.q * 1000) * 2 + seen;
        if (shown === w.shown) return;
        w.shown = shown;
        var s = l.spans[i].style;
        if (w.q >= 1) {
          s.transform = '';
          s.opacity = '';
        } else {
          s.transform = 'translateY(' + ((1 - w.q) * 0.4).toFixed(3) + 'em)';
          s.opacity = seen ? (0.15 + 0.85 * w.q).toFixed(3) : '';
        }
      });
    });
    if (live) braf = requestAnimationFrame(bframe);
  };
  addEventListener('scroll', bwake, { passive: true });
  addEventListener('resize', bwake, { passive: true });
  bwake();
}

/* The top line. Two things the markup cannot do by itself: both corners come back as pills when you
   scroll up, and the name takes on weight under the pointer. Without this file it is a plain line
   that scrolls away, and the status card still opens. */
var topLine = doc.querySelector('[data-top]');
if (topLine) {
  var reach = doc.querySelector('[data-reach]');
  /* A page with its own bar stuck to the top of the screen keeps that spot: /work's filter, a legal
     page's contents. They are only sticky at wider sizes, so ask the browser. */
  var topBar = doc.querySelector('.dw-bar, .toc');
  var topClear = function () {
    return !topBar || getComputedStyle(topBar).position !== 'sticky';
  };
  var topAway = ui.spring(210, 24, 1);
  var topWant = 1,
    topY = scrollY,
    topTravel = 0,
    topRaf = 0,
    topLast = 0,
    reachOpen = false,
    reachFrom = 0;
  var topPaint = function () {
    topLine.style.transform = 'translate3d(0,' + (-130 * topAway.x).toFixed(2) + '%,0)';
  };
  var topLand = function () {
    /* Fully away: back to the plain line, which by now is off the top of the page. */
    if (topWant === 1) {
      topLine.classList.remove('float');
      topLine.style.transform = '';
    }
  };
  var topFrame = function (now) {
    topRaf = 0;
    var dt = Math.min(0.033, (now - topLast) / 1000 || 0.016);
    topLast = now;
    var live = topAway.step(topWant, dt);
    topPaint();
    if (live) topRaf = requestAnimationFrame(topFrame);
    else {
      topAway.x = topWant;
      topAway.v = 0;
      topPaint();
      topLand();
    }
  };
  var topGo = function (want) {
    topWant = want;
    if (want === 0) topLine.classList.add('float');
    if (reduce) {
      topAway.x = want;
      topPaint();
      topLand();
    } else if (!topRaf) {
      topLast = performance.now();
      topRaf = requestAnimationFrame(topFrame);
    }
  };
  addEventListener(
    'scroll',
    function () {
      var y = scrollY,
        dy = y - topY;
      topY = y;
      if (reachOpen) {
        /* A card pinned to a line that has scrolled away is nobody's. */
        if (Math.abs(y - reachFrom) > 60) reach.hidePopover();
        return;
      }
      if (y <= 0) {
        /* Home at the top: the pills melt into the line, which sits in the very same place. */
        if (topRaf) cancelAnimationFrame(topRaf);
        topRaf = 0;
        topWant = 1;
        topAway.x = 1;
        topAway.v = 0;
        topLine.classList.remove('float');
        topLine.style.transform = '';
        return;
      }
      topTravel = topTravel < 0 === dy < 0 ? topTravel + dy : dy;
      if (topWant === 1 && topTravel < -6 && y > 240 && topClear()) topGo(0);
      /* Below 120px the plain line would still show once the pill left, so the pill stays. It also
         stays while the keyboard is on it. */
      else if (topWant === 0 && topTravel > 6 && y > 120) {
        var on = doc.activeElement;
        if (!(topLine.contains(on) && on.matches(':focus-visible'))) topGo(1);
      }
    },
    { passive: true },
  );
  if (reach) {
    reach.addEventListener('toggle', function (e) {
      reachOpen = e.newState === 'open';
      reachFrom = scrollY;
    });
  }

  var mark = topLine.querySelector('[data-mark]');
  if (mark && !reduce) {
    var letters = null,
      markX = null,
      waveAt = 0,
      markRaf = 0,
      markLast = 0;
    var split = function () {
      /* Each letter is locked to the width it has at rest, kerning included, so a heavier letter
         thickens in place and the name never shifts under the pointer. */
      letters = [];
      [mark.querySelector('b'), mark.querySelector('.nm-fold > span')].forEach(function (part) {
        var text = part.firstChild,
          value = text.nodeValue,
          rest = parseInt(getComputedStyle(part).fontWeight, 10),
          range = doc.createRange(),
          widths = [];
        for (var i = 0; i < value.length; i++) {
          range.setStart(text, i);
          range.setEnd(text, i + 1);
          widths.push(range.getBoundingClientRect().width);
        }
        part.textContent = '';
        widths.forEach(function (w, i) {
          var s = doc.createElement('span');
          s.className = 'lt';
          s.style.width = w + 'px';
          s.textContent = value[i];
          part.appendChild(s);
          letters.push({ el: s, rest: rest, s: ui.spring(240, 17, 0), shown: rest });
        });
      });
    };
    var markFrame = function (now) {
      markRaf = 0;
      var dt = Math.min(0.033, (now - markLast) / 1000 || 0.016),
        live = false,
        at = markX;
      markLast = now;
      if (waveAt) {
        var box = mark.getBoundingClientRect(),
          t = (now - waveAt) / 1100;
        if (t >= 1) waveAt = 0;
        else {
          at = box.left - 40 + (box.width + 80) * t;
          live = true;
        }
      }
      letters.forEach(function (l) {
        var r = l.el.getBoundingClientRect();
        var d = at === null || !r.width ? 1e3 : (r.left + r.width / 2 - at) / 30;
        if (l.s.step(Math.exp(-d * d), dt)) live = true;
        var w = Math.round(Math.min(900, Math.max(100, l.rest + (880 - l.rest) * l.s.x)));
        if (w !== l.shown) {
          l.shown = w;
          l.el.style.fontWeight = w;
        }
        l.el.style.transform =
          Math.abs(l.s.x) > 0.002 ? 'translateY(' + (-l.s.x * 0.07).toFixed(3) + 'em)' : '';
      });
      if (live) markRaf = requestAnimationFrame(markFrame);
    };
    var markWake = function () {
      if (!letters) split();
      if (!markRaf) {
        markLast = performance.now();
        markRaf = requestAnimationFrame(markFrame);
      }
    };
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      mark.addEventListener('pointermove', function (e) {
        markX = e.clientX;
        markWake();
      });
      mark.addEventListener('pointerleave', function () {
        markX = null;
        markWake();
      });
    }
    mark.addEventListener('focus', function () {
      if (mark.matches(':focus-visible')) {
        waveAt = performance.now();
        markWake();
      }
    });
    /* One wave through the name, the first time a visit opens at the top of a page. */
    var seen = false;
    try {
      seen = !!sessionStorage.getItem('ncs-mark-wave');
      sessionStorage.setItem('ncs-mark-wave', '1');
    } catch (e) {
      seen = true;
    }
    if (!seen && scrollY < 200 && doc.fonts) {
      doc.fonts.ready.then(function () {
        setTimeout(function () {
          waveAt = performance.now();
          markWake();
        }, 700);
      });
    }
  }
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
