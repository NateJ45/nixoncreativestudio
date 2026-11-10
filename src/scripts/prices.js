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
  /* Radios can come back checked after a reload or Back, so the card is rebuilt from them, without the throw. */
  var dealCard = function (animate) {
    var vals = names.map(function (n) {
      var c = pick.querySelector('input[name="' + n + '"]:checked');
      return c ? +c.value : -1;
    });
    if (vals.indexOf(-1) !== -1) return;
    var i = vals[2] === 2 ? 2 : Math.min(1, Math.max.apply(null, vals)),
      t = tiers[i];
    card.className = 'pc pick-card pc-' + ['paper', 'blue', 'ink'][i];
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
  go.addEventListener('click', function () {
    try {
      sessionStorage.setItem('ncs-tier', go.dataset.tier);
    } catch (e) {}
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
    if (!closing)
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
    var r = receipt(input);
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
      if (animate) feed(el);
    });
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
