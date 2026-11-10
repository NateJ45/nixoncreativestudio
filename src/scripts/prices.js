/* Prices: the three questions that suggest a tier, the tiers that lift, the folding rows, the live
   receipt, the weeks strip in the care section and the step icons in How it works. */
import { ui } from './kit.js';
import { receipt, receiptLines, usd, yearsWord } from '../lib/receipt';
var reduce = ui.reduce,
  doc = document;
var all = function (a, r) {
  return [].slice.call((r || doc).querySelectorAll(a));
};

/* "Start with X" carries the tier to the form, in the link and in the session. */
all('[data-tier]').forEach(function (a) {
  a.addEventListener('click', function () {
    try {
      sessionStorage.setItem('ncs-tier', a.dataset.tier);
    } catch (e) {}
  });
});

/* Three questions suggest a tier. The answer is the largest thing asked for, because one big need sets
   the scope, with one exception: Flagship is for custom tools, so only that answer reaches it. Everything
   else tops out at Signature. A "Why:" line under the card says which answers decided it. */
var pick = doc.querySelector('[data-pick]');
if (pick) {
  var names = ['size', 'who', 'tools'];
  var card = doc.querySelector('[data-pick-card]'),
    go = doc.querySelector('[data-pick-go]');
  var tiers = JSON.parse(pick.dataset.tiers);
  var whyEl = doc.querySelector('[data-pick-why]');
  /* What each answer means, in the words of a "Why:" line. */
  var SAID = {
    size: ['it holds the essential pages', 'it needs deeper sections', 'it is a large site'],
    who: [
      'your team keeps a few pages current',
      'your team keeps several kinds of content current',
      'your team keeps a lot current',
    ],
    tools: ['it mostly informs people', 'it connects to other services', 'it needs custom tools'],
  };
  var join = function (parts) {
    return parts.length < 2
      ? parts[0]
      : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  };
  var why = function (vals, i) {
    if (i === 2) return 'Why: you said ' + SAID.tools[2] + '.';
    var parts = names
      .map(function (n, k) {
        return vals[k] >= i ? SAID[n][vals[k]] : '';
      })
      .filter(Boolean);
    var capped = vals[0] === 2 || vals[1] === 2;
    return (
      'Why: you said ' +
      join(parts) +
      '.' +
      (capped ? ' Flagship is for custom tools, so Signature is the place to start.' : '')
    );
  };
  /* The card's stub: a strip under a perforation, in the card's own color, naming the tier. It is
     there once there is an answer, and it is put back whole whenever the card is dealt again. */
  var stub = doc.querySelector('[data-pick-stub]'),
    torn = false;
  /* Radios can come back checked after a reload or Back, so the card is rebuilt from them, without the throw. */
  var dealCard = function (animate) {
    torn = false;
    stub.style.transform = stub.style.opacity = '';
    var vals = names.map(function (n) {
      var c = pick.querySelector('input[name="' + n + '"]:checked');
      return c ? +c.value : -1;
    });
    if (vals.indexOf(-1) !== -1) return;
    var i = vals[2] === 2 ? 2 : Math.min(1, Math.max.apply(null, vals)),
      t = tiers[i];
    card.className = 'pc pick-card has-stub pc-' + ['paper', 'blue', 'ink'][i];
    stub.querySelector('[data-pick-stub-name]').textContent = t.name;
    stub.hidden = false;
    doc.querySelector('[data-pick-name]').textContent = t.name;
    doc.querySelector('[data-pick-price]').textContent = t.from;
    doc.querySelector('[data-pick-who]').textContent = t.range;
    whyEl.textContent = why(vals, i);
    whyEl.hidden = false;
    doc.querySelector('[data-pick-go-name]').textContent = t.name;
    go.href = '/contact/?tier=' + t.name.toLowerCase();
    go.dataset.tier = t.name;
    go.hidden = false;
    if (animate && !reduce) {
      card.classList.remove('dealing');
      void card.offsetWidth;
      card.classList.add('dealing');
    }
  };
  var shown = false;
  pick.addEventListener('change', function () {
    dealCard(true);
    /* On a phone the answer lands below the questions, so bring it up the first time it appears. */
    if (!shown && !go.hidden) {
      shown = true;
      var r = go.getBoundingClientRect();
      if (r.bottom > innerHeight - 90) {
        doc.querySelector('[data-pick-out]').scrollIntoView({
          block: 'center',
          behavior: reduce ? 'auto' : 'smooth',
        });
      }
    }
  });
  dealCard(false);
  addEventListener('pageshow', function () {
    dealCard(false);
  });
  /* Following "Start with X" tears the stub off first: it swings away from the perforation on a
     spring, hangs for a moment, then drops, and the form opens with the tier already chosen. That
     takes under half a second. A new tab, a modified click and reduced motion all go straight
     there, and a timer makes sure the visit happens even if no frame is ever drawn. */
  go.addEventListener('click', function (e) {
    try {
      sessionStorage.setItem('ncs-tier', go.dataset.tier);
    } catch (err) {}
    if (reduce || torn || stub.hidden) return;
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    torn = true;
    var href = go.href,
      swing = ui.spring(210, 9, 0),
      t0 = performance.now(),
      prev = t0,
      y = 0,
      vy = 0,
      left = false;
    var leave = function () {
      if (left) return;
      left = true;
      location.href = href;
    };
    var tick = function (now) {
      var dt = Math.min(0.033, (now - prev) / 1000 || 0.016),
        t = now - t0;
      prev = now;
      swing.step(t < 200 ? 11 : 28, dt);
      if (t >= 200) {
        vy += 2600 * dt;
        y += vy * dt;
      }
      stub.style.transform =
        'translateY(' + y.toFixed(1) + 'px) rotate(' + swing.x.toFixed(2) + 'deg)';
      if (t > 330) stub.style.opacity = Math.max(0, 1 - (t - 330) / 110).toFixed(2);
      if (t < 440) requestAnimationFrame(tick);
      else leave();
    };
    requestAnimationFrame(tick);
    setTimeout(leave, 700);
  });
}

/* One window per kind of client. Sector only, in its own block: no client is tied to a tier or a price. */
var sites = doc.querySelector('[data-sites]');
ui.wireFootage(sites);

/* The tiers. All three are always open, with every "What's included" list showing. On a wide screen they
   deal out of one stack on load, and hovering or focusing one lifts it on a spring while the others ease
   back a little. Nothing folds or hides. On a phone they are a plain stack with no transform, so cards
   never overlap, and with reduced motion none of this runs. */
var list = doc.querySelector('[data-tiers]');
var st = all('.tier', list).map(function (li, i) {
  return {
    li: li,
    i: i,
    card: li.querySelector('.t-card'),
    l: ui.spring(240, 17, 0),
    a: ui.spring(110, 14, 0),
    side: 0,
  };
});
var dealt = performance.now();
var wideQ = matchMedia('(min-width:60rem)'),
  mode = '',
  hovered = null,
  focused = null,
  leaveT = 0;
var raf = 0,
  last = 0;
var active = function () {
  return hovered !== null ? hovered : focused;
};

function wake() {
  if (!raf && mode) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}
function frame(now) {
  raf = 0;
  if (!mode) return;
  var dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;
  var live = false,
    a = active();
  st.forEach(function (s) {
    var lT = a === null ? 0 : s.i === a ? 1 : -1;
    if (a !== null) s.side = s.i === a ? 0 : s.i > a ? 1 : -1;
    if (s.l.step(lT, dt)) live = true;
    else {
      s.l.x = lT;
      s.l.v = 0;
    }
    var l = s.l.x,
      back = Math.max(0, -l);
    /* On load the three cards deal out of one stack, then rest set slightly by hand. A card you reach for straightens. */
    var aT = now - dealt > 350 + (s.i === 1 ? 0 : 130) ? 1 : 0;
    if (s.a.step(aT, dt) || aT === 0) live = true;
    else {
      s.a.x = 1;
      s.a.v = 0;
    }
    var k = 1 - s.a.x,
      cw = s.card.offsetWidth,
      rest = (s.i - 1) * 0.7;
    var y = (l > 0 ? -l * 16 : back * 10) + k * 90,
      sc = 1 + l * 0.026,
      x = s.side * back * 8 - (s.i - 1) * cw * k,
      r = s.side * back * 0.5 + rest * (1 - Math.max(0, l)) + (s.i - 1) * -4 * k;
    s.card.style.transform =
      'translate3d(' +
      x.toFixed(2) +
      'px,' +
      y.toFixed(2) +
      'px,0) rotate(' +
      r.toFixed(3) +
      'deg) scale(' +
      sc.toFixed(4) +
      ')';
    s.card.style.setProperty('--l', l.toFixed(3));
    s.li.style.zIndex = s.i === a ? 3 : 1;
  });
  if (live) raf = requestAnimationFrame(frame);
}
function setMode() {
  var next = reduce || !wideQ.matches ? '' : 'wide';
  if (next !== mode) {
    mode = next;
    hovered = focused = null;
    list.classList.toggle('live', mode === 'wide');
    if (!mode)
      st.forEach(function (s) {
        s.card.style.transform = '';
        s.card.style.removeProperty('--l');
        s.li.style.zIndex = '';
      });
  }
  wake();
}
if (!reduce) {
  st.forEach(function (s) {
    s.li.addEventListener('pointerenter', function (e) {
      if (mode === 'wide' && e.pointerType === 'mouse') {
        clearTimeout(leaveT);
        hovered = s.i;
        wake();
      }
    });
    s.li.addEventListener('pointerleave', function (e) {
      if (mode === 'wide' && e.pointerType === 'mouse') {
        clearTimeout(leaveT);
        leaveT = setTimeout(function () {
          hovered = null;
          wake();
        }, 110);
      }
    });
    s.li.addEventListener('focusin', function (e) {
      if (mode === 'wide' && e.target.matches(':focus-visible')) {
        focused = s.i;
        wake();
      }
    });
    s.li.addEventListener('focusout', function (e) {
      if (!s.li.contains(e.relatedTarget) && focused === s.i) {
        focused = null;
        wake();
      }
    });
  });
  addEventListener('resize', setMode);
  setMode();
}

/* Native details and summary, with the height eased. Without this it simply opens. */
all('.faq details, .fold').forEach(function (d) {
  var sum = d.querySelector('summary'),
    box = d.querySelector('.faq-a, .fold-a'),
    an = null;
  if (reduce) return;
  sum.addEventListener('click', function (e) {
    e.preventDefault();
    var from = d.open ? box.getBoundingClientRect().height : 0,
      closing = d.open && !d.classList.contains('closing');
    if (an) {
      an.onfinish = null;
      an.cancel();
    }
    d.open = true;
    d.classList.toggle('closing', closing);
    box.style.overflow = 'hidden';
    var to = closing ? 0 : box.scrollHeight;
    an = box.animate(
      { height: [from + 'px', to + 'px'] },
      { duration: closing ? 340 : 520, easing: 'cubic-bezier(.22,1.12,.36,1)' },
    );
    /* An FAQ answer arrives like a reply in a thread: it grows out of its top corner (the right one
       where it sits on the right) with a small overshoot. The other rows keep the plain rise. */
    var reply = box.querySelector('.faq-reply');
    if (!closing && reply)
      reply.animate(
        { opacity: [0, 1], transform: ['translateY(-.35rem) scale(.88)', 'none'] },
        { duration: 520, easing: 'cubic-bezier(.3,1.5,.5,1)' },
      );
    else if (!closing)
      box.firstElementChild.animate(
        { opacity: [0, 1], transform: ['translateY(.75rem)', 'none'] },
        { duration: 460, easing: 'cubic-bezier(.2,.8,.2,1)' },
      );
    an.onfinish = function () {
      an = null;
      box.style.overflow = '';
      if (closing) {
        d.open = false;
        d.classList.remove('closing');
      }
    };
  });
});
/* On a phone the page was a very long scroll, so the sections marked data-mfold fold down to their
   headings. The markup is untouched until this runs: wide screens, no script and search all get
   the whole page, and these sections have no prices a buyer needs first (the tiers, add-ons and care
   plans stay open). Each heading gets a real button; everything else in the section is folded. */
var phoneFolds = matchMedia('(max-width:52rem)');
var mfolds = all('[data-mfold]').map(function (sec) {
  var h = sec.querySelector('h2'),
    parts = [],
    node = h;
  while (node !== sec) {
    [].forEach.call(node.parentElement.children, function (c) {
      if (c !== node) parts.push(c);
    });
    node = node.parentElement;
  }
  parts.forEach(function (c) {
    c.classList.add('mfold-part');
  });
  var btn = doc.createElement('button');
  btn.type = 'button';
  btn.className = 'mfold-btn';
  var mark = doc.createElement('i');
  mark.setAttribute('aria-hidden', 'true');
  var f = { sec: sec, h: h, btn: btn, mark: mark };
  btn.addEventListener('click', function () {
    setFold(f, !sec.classList.contains('shut'));
  });
  return f;
});
function setFold(f, shut) {
  f.sec.classList.toggle('shut', shut);
  f.btn.setAttribute('aria-expanded', shut ? 'false' : 'true');
}
function mountFolds(folded) {
  mfolds.forEach(function (f) {
    if (phoneFolds.matches && !f.btn.parentElement) {
      while (f.h.firstChild) f.btn.appendChild(f.h.firstChild);
      f.btn.appendChild(f.mark);
      f.h.appendChild(f.btn);
      setFold(f, folded);
    } else if (!phoneFolds.matches && f.btn.parentElement) {
      f.mark.remove();
      while (f.btn.firstChild) f.h.appendChild(f.btn.firstChild);
      f.btn.remove();
      f.sec.classList.remove('shut');
    }
  });
}
/* After a reload or Back the page is already scrolled, and folding it now would move what is on screen. */
mountFolds(!ui.restored());
phoneFolds.addEventListener('change', function () {
  mountFolds(true);
});
/* What a link points at can be inside a folded section. Returns whether it opened anything. */
function openFoldAround(t) {
  var sec = t && t.closest('[data-mfold].shut');
  if (!sec) return false;
  mfolds.forEach(function (f) {
    if (f.sec === sec) setFold(f, false);
  });
  return true;
}
doc.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a[href^="#"]');
  if (a) openFoldAround(doc.getElementById(a.getAttribute('href').slice(1)));
});

/* A link to a closed row opens it, so the jump links never land on something shut. */
function openTarget() {
  var t = location.hash && doc.getElementById(location.hash.slice(1));
  if (t && t.matches('details')) t.open = true;
  return t;
}
all('.jump a').forEach(function (a) {
  var t = doc.getElementById(a.getAttribute('href').slice(1));
  if (t && t.matches('details'))
    a.addEventListener('click', function () {
      t.open = true;
    });
});
addEventListener('hashchange', function () {
  openFoldAround(openTarget());
});
/* Arriving on an address with a hash: the folds above it have just shortened the page, so go back to it. */
(function () {
  var t = openTarget();
  if (t) {
    openFoldAround(t);
    if (phoneFolds.matches) t.scrollIntoView();
  }
})();
addEventListener('beforeprint', function () {
  mfolds.forEach(function (f) {
    if (f.btn.parentElement) setFold(f, false);
  });
  all('.faq details, .fold').forEach(function (d) {
    d.open = true;
  });
  /* Paper shows the finished state: every dot and every icon. */
  all('[data-weeks]').forEach(function (w) {
    w.classList.add('in');
  });
  all('[data-steps] li').forEach(function (li) {
    li.classList.add('drawn');
  });
  /* And the whole receipt, however far it had fed. */
  all('[data-rcpt-card]').forEach(function (c) {
    c.classList.remove('rcpt-wait');
    c.style.clipPath = '';
  });
});

/* The live receipt (LiveReceipt.astro). A tier, a plan and a number of years print the build, Hosting,
   care and the total, from src/lib/receipt.ts, which is the cost table's rule (receipt.test.ts checks
   they agree). The page hands over the numbers from pricing.ts, so nothing here types a price. A line
   whose words changed is reprinted and feeds back in from just above on a small spring, like a till
   slip; the numbers are swapped as text, never counted. Under reduced motion they are simply swapped. */
var rc = doc.querySelector('[data-rcpt]');
if (rc) {
  var R = JSON.parse(rc.dataset.r);
  var rform = rc.querySelector('[data-rcpt-form]'),
    range = rform.querySelector('input[type="range"]'),
    yearsOut = rc.querySelector('[data-rcpt-years]'),
    needEl = rc.querySelector('[data-rcpt-need]'),
    say = rc.querySelector('[data-rcpt-say]');
  var lineEls = {};
  all('[data-line]', rc).forEach(function (el) {
    lineEls[el.dataset.line] = el;
  });
  var checked = function (name) {
    return rform.querySelector('input[name="' + name + '"]:checked');
  };
  var byName = function (list, name) {
    return list.filter(function (x) {
      return x.name === name;
    })[0];
  };

  /* The paper feed: each reprinted line starts 14px up, inside its own clipped row, and springs down. */
  var feeds = [],
    fraf = 0,
    flast = 0;
  var feedFrame = function (now) {
    fraf = 0;
    var dt = Math.min(0.033, (now - flast) / 1000 || 0.016);
    flast = now;
    feeds = feeds.filter(function (f) {
      var going = f.s.step(0, dt);
      var t = going ? 'translateY(' + f.s.x.toFixed(2) + 'px)' : '';
      f.kids.forEach(function (k) {
        k.style.transform = t;
      });
      return going;
    });
    if (feeds.length) fraf = requestAnimationFrame(feedFrame);
  };
  var feed = function (el) {
    if (reduce) return;
    var f = feeds.filter(function (x) {
      return x.el === el;
    })[0];
    if (!f) {
      f = { el: el, kids: all('dt, dd', el), s: ui.spring(260, 18, 0) };
      feeds.push(f);
    }
    f.s.x = -14;
    f.s.v = 0;
    if (!fraf) {
      flast = performance.now();
      fraf = requestAnimationFrame(feedFrame);
    }
  };

  /* The printer. The card hangs from a drawn slot and is clipped along its bottom edge, so it reads
     as paper that has only come out so far. It feeds a piece at a time, a beat apart (the heading,
     the four lines, the footnote), the edge chasing each stop on a spring, and each line drops into
     its row as its turn comes. Printing from piece i leaves everything above i out and still. The
     text is always the finished text: only how much paper is showing moves. */
  var rcard = rc.querySelector('[data-rcpt-card]'),
    rout = rc.querySelector('[data-rcpt-out]'),
    slot = rc.querySelector('.rcpt-slot');
  var pieces = [rcard.querySelector('.label')].concat(all('[data-line]', rcard), [
    rcard.querySelector('.rcpt-foot'),
  ]);
  var pr = { s: ui.spring(300, 30, 0), raf: 0, last: 0, due: 0, next: 0, stops: [] };
  var clip = function (y) {
    rcard.style.clipPath = 'inset(-3rem -3rem ' + (rcard.offsetHeight - y).toFixed(1) + 'px -3rem)';
  };
  /* Where the paper's edge rests after each piece, from the card's top. The last stop runs past the
     card so its shadow comes out too. */
  var measure = function () {
    var top = rcard.getBoundingClientRect().top;
    var st = pieces.map(function (el) {
      return el.getBoundingClientRect().bottom - top;
    });
    st[st.length - 1] = rcard.offsetHeight + 48;
    return st;
  };
  var printFrame = function (now) {
    pr.raf = 0;
    var dt = Math.min(0.033, (now - pr.last) / 1000 || 0.016),
      end = pr.stops.length - 1;
    pr.last = now;
    while (pr.next < end && now >= pr.due) {
      pr.next++;
      pr.due += 95;
      if (pieces[pr.next].dataset.line) feed(pieces[pr.next]);
    }
    if (!pr.s.step(pr.stops[pr.next], dt) && pr.next === end) {
      rcard.style.clipPath = '';
      return;
    }
    clip(pr.s.x);
    pr.raf = requestAnimationFrame(printFrame);
  };
  /* Pull the paper back to just above piece i and leave it there. */
  var holdAt = function (i) {
    cancelAnimationFrame(pr.raf);
    pr.raf = 0;
    pr.stops = measure();
    pr.next = i - 1;
    pr.s.x = pr.stops[i - 1];
    pr.s.v = 0;
    clip(pr.s.x);
  };
  var print = function (i) {
    holdAt(i);
    pr.due = performance.now() + 70;
    pr.last = performance.now();
    pr.raf = requestAnimationFrame(printFrame);
  };
  /* Reduced motion: nothing feeds. The lines that changed are tinted for a moment instead. */
  var tintT = 0;
  var tint = function (els) {
    els.forEach(function (el) {
      el.classList.add('fresh');
    });
    clearTimeout(tintT);
    tintT = setTimeout(function () {
      all('.fresh', rcard).forEach(function (el) {
        el.classList.remove('fresh');
      });
    }, 900);
  };
  /* The receipt prints the first time it comes on screen, with only its heading out until then. Only
     when it starts below the screen, or folded away on a phone: a page that loads already scrolled,
     reduced motion and no observer all get the whole receipt at once. */
  var waiting = false,
    pio = null;
  var arrive = function (thenPrint) {
    if (!waiting) return;
    waiting = false;
    pio.disconnect();
    rcard.classList.remove('rcpt-wait');
    if (thenPrint) print(1);
  };
  if (!reduce && 'IntersectionObserver' in window && !ui.restored()) {
    var rr = rout.getBoundingClientRect();
    if (!rr.height || rr.top > innerHeight) {
      waiting = true;
      rcard.classList.add('rcpt-wait');
      pio = new IntersectionObserver(
        function (es) {
          if (es[0].isIntersecting) arrive(true);
        },
        { threshold: 0.25 },
      );
      pio.observe(rout);
    }
  }
  /* The "Show on the receipt" buttons in the cost table. The one whose row is on the receipt is pressed. */
  var sends = all('[data-send-tier]');
  /* While a row's slip is on its way to the slot the paper waits, pulled back to the first line that
     will change; held is that line's place among the pieces. */
  var held = 0;

  var sayT = 0;
  var update = function (animate) {
    var tier = byName(R.tiers, (checked('r-tier') || {}).value) || R.tiers[1];
    /* Only the plans this tier's cost table prints: Flagship's custom tools need Care or Care+. */
    all('input[name="r-plan"]', rform).forEach(function (i) {
      i.disabled = tier.plans.indexOf(i.value) === -1;
    });
    var pick = checked('r-plan');
    if (!pick || pick.disabled) {
      pick = rform.querySelector(
        'input[name="r-plan"][value="' + (tier.needs || tier.plans[0]) + '"]',
      );
      pick.checked = true;
    }
    if (needEl) needEl.hidden = !tier.needs;
    var plan = byName(R.plans, pick.value),
      years = +range.value;
    range.style.setProperty('--p', ((years - 1) / 4) * 100 + '%');
    yearsOut.textContent = yearsWord(years);
    var input = {
      build: tier.build,
      hostingPerYear: R.hostingPerYear,
      carePerMonth: plan.perMonth,
      years: years,
    };
    sends.forEach(function (b) {
      var on = b.dataset.sendTier === tier.name && b.dataset.sendPlan === pick.value;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var r = receipt(input),
      changed = [];
    receiptLines(
      r,
      {
        tier: tier.name,
        plan: plan.perMonth ? plan.name : '',
        hostingName: R.hostingName,
        years: years,
      },
      input,
    ).forEach(function (l) {
      var el = lineEls[l.key],
        b = el.querySelector('dt b'),
        sp = el.querySelector('dt span'),
        dd = el.querySelector('dd');
      if (
        b.textContent === l.label &&
        (!sp || sp.textContent === l.note) &&
        dd.textContent === l.amount
      )
        return;
      b.textContent = l.label;
      if (sp) sp.textContent = l.note;
      dd.textContent = l.amount;
      changed.push(el);
    });
    /* Reprint from the first line that changed. A receipt still waiting to arrive prints whole when it does. */
    var from = changed.length ? pieces.indexOf(changed[0]) : 0;
    if (animate && reduce) tint(changed);
    else if (animate && held) holdAt((held = Math.min(held, from || 1)));
    else if (animate && from && !waiting) print(from);
    /* One short sentence for a screen reader, once the scrubber has settled, rather than one per step. */
    if (animate) {
      clearTimeout(sayT);
      sayT = setTimeout(function () {
        say.textContent =
          tier.name +
          (plan.perMonth ? ' with ' + plan.name : ' on ' + R.hostingName + ' only') +
          ', ' +
          yearsWord(years) +
          ': ' +
          usd(r.total) +
          ' in total.';
      }, 450);
    }
  };
  rform.addEventListener('input', function () {
    update(true);
  });
  rform.addEventListener('change', function () {
    update(true);
  });
  /* Radios and the scrubber can come back set after a reload or Back, so the receipt is rebuilt from them. */
  update(false);
  addEventListener('pageshow', function () {
    update(false);
  });

  /* A row drops out of the cost table. Its button sets the form to that row's tier and plan over the
     table's last column of years, then a slip with the row's name and total leaves the row, falls to
     the slot on a spring and goes in, and the receipt prints. The row itself never leaves the table.
     The page follows the slip down and focus moves to the receipt, which says its total. Under
     reduced motion there is no slip: the button is pressed, the page jumps and the lines are tinted. */
  var slip = function (row, label, done) {
    var from = row.getBoundingClientRect(),
      cells = all('td', row),
      g = doc.createElement('div'),
      name = doc.createElement('b'),
      sum = doc.createElement('span');
    g.className = 'row-ghost';
    g.setAttribute('aria-hidden', 'true');
    name.textContent = label;
    sum.textContent = cells[cells.length - 1].textContent + ' in total';
    g.appendChild(name);
    g.appendChild(sum);
    var w = Math.min(from.width, 336);
    g.style.width = w + 'px';
    g.style.left = from.left + scrollX + 'px';
    g.style.top = from.top + scrollY + 'px';
    doc.body.appendChild(g);
    /* Both boxes are read at one scroll position, so the distance holds while the page scrolls. */
    var to = slot.getBoundingClientRect(),
      dx = to.left + to.width / 2 - (from.left + w / 2),
      dy = to.top + to.height / 2 - (from.top + g.offsetHeight / 2);
    var s = ui.spring(46, 11, 0),
      prev = performance.now(),
      over = false;
    var land = function () {
      if (over) return;
      over = true;
      g.remove();
      done();
    };
    var tick = function (now) {
      if (over) return;
      var dt = Math.min(0.033, (now - prev) / 1000 || 0.016);
      prev = now;
      s.step(1, dt);
      var p = Math.min(1, s.x);
      g.style.transform =
        'translate(' +
        (dx * p).toFixed(1) +
        'px,' +
        (dy * p).toFixed(1) +
        'px) rotate(' +
        (-3 * p).toFixed(2) +
        'deg) scale(' +
        (1 - 0.4 * p).toFixed(3) +
        ')';
      g.style.opacity = p < 0.92 ? '' : ((1 - p) / 0.08).toFixed(2);
      if (p < 0.985) requestAnimationFrame(tick);
      else land();
    };
    requestAnimationFrame(tick);
    setTimeout(land, 1600);
  };
  sends.forEach(function (b) {
    b.addEventListener('click', function () {
      var plan = rform.querySelector('input[name="r-plan"][value="' + b.dataset.sendPlan + '"]');
      rform.querySelector('input[name="r-tier"][value="' + b.dataset.sendTier + '"]').checked =
        true;
      plan.disabled = false;
      plan.checked = true;
      range.value = range.max;
      arrive(false);
      if (!reduce) held = pieces.length;
      update(true);
      if (!reduce)
        slip(b.closest('tr'), b.dataset.sendLabel, function () {
          var i = held;
          held = 0;
          print(i);
        });
      rcard.focus({ preventScroll: true });
      rout.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    });
  });
}

/* The cost bars at 1, 3 and 5 years. Three real radios; each bar's parts spring to that view's lengths
   on the one five-year scale, so a bar keeps its place and only grows or shrinks. The totals and the
   sentence under each bar are printed in the page for every view and swapped whole, never counted.
   A part that is nothing in a view (Hosting in year one) leaves once it has shrunk. Under reduced
   motion the bars jump. */
var barsEl = doc.querySelector('[data-bars]');
if (barsEl) {
  var segs = all('.bars-bar i', barsEl).map(function (el) {
    var w = el.dataset.w.split(' ').map(Number);
    return { el: el, w: w, to: w[w.length - 1], s: ui.spring(170, 19, w[w.length - 1]) };
  });
  var views = all('input[name="bars-years"]', barsEl).map(function (i) {
    return i.value;
  });
  var braf = 0,
    blast = 0;
  var rest = function (g) {
    g.s.x = g.to;
    g.s.v = 0;
    g.el.style.width = g.to + '%';
    g.el.classList.toggle('nil', g.to === 0);
  };
  var barFrame = function (now) {
    braf = 0;
    var dt = Math.min(0.033, (now - blast) / 1000 || 0.016),
      live = false;
    blast = now;
    segs.forEach(function (g) {
      if (g.s.step(g.to, dt)) {
        live = true;
        g.el.style.width = Math.max(0, g.s.x).toFixed(2) + '%';
      } else rest(g);
    });
    if (live) braf = requestAnimationFrame(barFrame);
  };
  var setBars = function (animate) {
    var c = barsEl.querySelector('input[name="bars-years"]:checked');
    if (!c) return;
    var k = views.indexOf(c.value);
    all('[data-v]', barsEl).forEach(function (el) {
      el.hidden = el.dataset.v !== c.value;
    });
    segs.forEach(function (g) {
      g.to = g.w[k];
      if (!animate || reduce) rest(g);
      else if (g.to) g.el.classList.remove('nil');
    });
    if (animate && !reduce && !braf) {
      blast = performance.now();
      braf = requestAnimationFrame(barFrame);
    }
  };
  barsEl.addEventListener('change', function () {
    setBars(true);
  });
  /* The radios can come back set after a reload or Back. */
  setBars(false);
  addEventListener('pageshow', function () {
    setBars(false);
  });
}

/* How soon you hear back (ReplyOrder.astro). The rows are the plans, soonest reply first, each with
   its own promise from pricing.ts. Picking a plan moves the "Your message" slip to that plan's row:
   it is put in the new row at once and springs there from where it was. Under reduced motion it is
   simply in the new row. A sentence for a screen reader says the plan and its promise. */
var replyEl = doc.querySelector('[data-reply]');
if (replyEl) {
  var note = replyEl.querySelector('[data-reply-note]'),
    replySay = replyEl.querySelector('[data-reply-say]');
  var ns = ui.spring(190, 17, 0),
    nraf = 0,
    nlast = 0,
    ndx = 0,
    ndy = 0;
  var noteFrame = function (now) {
    nraf = 0;
    var dt = Math.min(0.033, (now - nlast) / 1000 || 0.016);
    nlast = now;
    if (!ns.step(0, dt)) {
      note.style.transform = '';
      return;
    }
    note.style.transform =
      'translate(' + (ndx * ns.x).toFixed(1) + 'px,' + (ndy * ns.x).toFixed(1) + 'px)';
    nraf = requestAnimationFrame(noteFrame);
  };
  var place = function (animate) {
    var c = replyEl.querySelector('input[name="reply-plan"]:checked');
    if (!c) return;
    var row = replyEl.querySelector('[data-reply-row="' + c.value + '"]'),
      to = row.querySelector('.reply-slot');
    if (note.parentElement === to) return;
    var a = note.getBoundingClientRect();
    note.style.transform = '';
    to.appendChild(note);
    if (!animate) return;
    replySay.textContent =
      row.querySelector('b').textContent + ': ' + row.querySelector('.reply-says').textContent;
    if (reduce) return;
    var b = note.getBoundingClientRect();
    ndx = a.left - b.left;
    ndy = a.top - b.top;
    ns.x = 1;
    ns.v = 0;
    note.style.transform = 'translate(' + ndx.toFixed(1) + 'px,' + ndy.toFixed(1) + 'px)';
    if (!nraf) {
      nlast = performance.now();
      nraf = requestAnimationFrame(noteFrame);
    }
  };
  replyEl.addEventListener('change', function () {
    place(true);
  });
  place(false);
  addEventListener('pageshow', function () {
    place(false);
  });
}

/* Life in weeks (ClientWeeks.astro). The filled dots fill left to right as the strip arrives. Only when it
   starts below the screen: a strip already on screen, reduced motion or no observer keeps them filled. */
var weeksEl = doc.querySelector('[data-weeks]');
if (weeksEl && !reduce && 'IntersectionObserver' in window) {
  if (weeksEl.getBoundingClientRect().top > innerHeight) {
    weeksEl.classList.add('wk-wait');
    var wio = new IntersectionObserver(
      function (es) {
        if (!es[0].isIntersecting) return;
        wio.disconnect();
        requestAnimationFrame(function () {
          weeksEl.classList.add('in');
        });
      },
      { threshold: 0.3 },
    );
    wio.observe(weeksEl);
  }
}

/* How it works: as the list arrives, each step's stretch of hairline runs to it and its icon draws, in
   order, the one drawing in the blue. Same rule as the weeks: only from below the screen, never under
   reduced motion. A step folded away on a phone has no box, so it is simply drawn. */
var stepsEl = doc.querySelector('[data-steps]');
if (stepsEl && !reduce && 'IntersectionObserver' in window) {
  if (stepsEl.getBoundingClientRect().top > innerHeight) {
    var stepLis = all('li', stepsEl);
    stepsEl.classList.add('st-wait');
    var sio = new IntersectionObserver(
      function (es) {
        if (!es[0].isIntersecting) return;
        sio.disconnect();
        stepLis.forEach(function (li, i) {
          setTimeout(
            function () {
              stepLis.forEach(function (l) {
                l.classList.remove('at');
              });
              li.classList.add('drawn', 'at');
            },
            150 + i * 520,
          );
        });
        setTimeout(
          function () {
            stepLis[stepLis.length - 1].classList.remove('at');
          },
          150 + stepLis.length * 520 + 900,
        );
      },
      { threshold: 0.35 },
    );
    sio.observe(stepsEl);
  }
}
