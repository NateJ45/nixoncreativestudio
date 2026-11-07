/* The contact form's enhancement layer: one question at a time, validation in plain words, draft
   save and restore, URL prefill, the brief phone, fetch submit and the success panel. The form works
   without any of this: it is a plain post to Web3Forms. */
import { ui } from './kit.js';
import { track } from '../lib/track';

var reduce = ui.reduce,
  doc = document;
var $ = function (a, r) {
  return (r || doc).querySelector(a);
};
var $$ = function (a, r) {
  return [].slice.call((r || doc).querySelectorAll(a));
};

var form = $('[data-form]');
form.noValidate = true;
var steps = $$('[data-step]', form),
  cur = 0;
var count = $('[data-count]'),
  bar = $('[data-bar]'),
  live = $('[data-live]');
var back = $('[data-back]'),
  next = $('[data-next]'),
  send = $('[data-send]');
var wrap = $('[data-contact]'),
  sentH = $('[data-sent-h]');
var errorEl = $('[data-contact-error]'),
  submitLabel = $('[data-contact-submit-label]');
var studies = JSON.parse(form.dataset.studies || '{}');
var coarse = matchMedia('(hover: none)').matches;

/* The brief. A line shows its label until it has an answer. The same element holds one or the other, and a line still waiting is hidden from screen readers. */
var orgLabel = {
  church: 'A church',
  school: 'A school',
  nonprofit: 'A nonprofit',
  'small-business': 'A small business',
  other: 'Something else',
};
var budgetLabel = {},
  timeLabel = {},
  heardLabel = {};
$$('input[name=budget]').forEach(function (r) {
  budgetLabel[r.value] = r.nextElementSibling.textContent;
});
$$('#timeline option').forEach(function (o) {
  if (o.value) timeLabel[o.value] = o.textContent;
});
$$('#heard_from option').forEach(function (o) {
  if (o.value) heardLabel[o.value] = o.textContent;
});
var val = function (n) {
  var el = form.elements.namedItem(n);
  return el ? (el.value || '').trim() : '';
};
var LINES = [
  {
    key: 'status',
    term: 'Status',
    cls: 'done',
    opt: 1,
    get: function () {
      return isSent ? 'Sent to Nathan' : '';
    },
  },
  {
    key: 'name',
    term: 'Name',
    ph: 'Your name',
    cls: 'name',
    get: function () {
      return val('name');
    },
  },
  {
    key: 'email',
    term: 'Email',
    ph: 'Your email',
    cls: '',
    get: function () {
      return val('email');
    },
  },
  {
    key: 'org_type',
    term: 'Organization type',
    ph: 'Your kind of organization',
    cls: '',
    get: function () {
      return orgLabel[val('org_type')] || '';
    },
  },
  {
    key: 'organization',
    term: 'Organization name',
    ph: 'Your organization',
    cls: '',
    opt: 1,
    get: function () {
      return val('organization');
    },
  },
  {
    key: 'message',
    term: 'What they hope to build',
    ph: "What you're hoping to build",
    cls: 'msg',
    get: function () {
      return val('message');
    },
  },
  {
    key: 'budget',
    term: 'Budget range',
    ph: 'Your budget range',
    cls: 'pill',
    get: function () {
      return budgetLabel[val('budget')] || '';
    },
  },
  {
    key: 'tier',
    term: 'Note',
    cls: '',
    opt: 1,
    get: function () {
      return tierName ? 'Looking at ' + tierName : '';
    },
  },
  {
    key: 'service',
    term: 'Interested in',
    cls: '',
    opt: 1,
    get: function () {
      return val('service').replace(/-/g, ' ');
    },
  },
  {
    key: 'from',
    term: 'Came from',
    cls: '',
    opt: 1,
    get: function () {
      var f = val('from');
      return !f ? '' : studies[f] ? 'The ' + studies[f] + ' study' : '/' + f + '/';
    },
  },
  {
    key: 'phone',
    term: 'Phone',
    ph: 'Your phone',
    cls: '',
    opt: 1,
    get: function () {
      return val('phone');
    },
  },
  {
    key: 'current_website',
    term: 'Current website',
    ph: 'Your current website',
    cls: '',
    opt: 1,
    get: function () {
      return val('current_website');
    },
  },
  {
    key: 'timeline',
    term: 'Project timeline',
    ph: 'Your timeline',
    cls: '',
    opt: 1,
    get: function () {
      return timeLabel[val('timeline')] || '';
    },
  },
  {
    key: 'heard_from',
    term: 'How they heard',
    ph: 'How you heard about me',
    cls: '',
    opt: 1,
    get: function () {
      return heardLabel[val('heard_from')] || '';
    },
  },
];
var linesEl = $('[data-lines]'),
  docEl = $('.doc'),
  phone = $('[data-phone]');
var isSent = false,
  tierName = '';
LINES.forEach(function (l) {
  var el = doc.createElement('div');
  el.className = 'ln';
  el.innerHTML = '<dt>' + l.term + '</dt><dd></dd>';
  linesEl.appendChild(el);
  l.el = el;
  l.dd = el.lastChild;
  l.y = 0;
  l.yv = 0;
  l.s = 1;
  l.sv = 0;
  l.txt = null;
});

/* Lines keep their weight: a new one pops in, and the ones below it are pushed and settle. */
var ph = { r: 0, rv: 0, y: 0, yv: 0 };
function refresh(kick) {
  var before = LINES.map(function (l) {
    return l.el.getBoundingClientRect().top;
  });
  var added = 0;
  LINES.forEach(function (l) {
    var t = l.get(),
      shown = !!t;
    /* Once sent, a skipped question stops waiting for an answer. */
    l.el.hidden = !shown && (!l.ph || isSent);
    if (t === l.txt) return;
    var was = l.txt;
    l.txt = t;
    l.dd.textContent = t || l.ph || '';
    l.el.className = 'ln ' + l.cls + (shown ? '' : ' sk');
    if (shown) l.el.removeAttribute('aria-hidden');
    else l.el.setAttribute('aria-hidden', 'true');
    if (shown && !was) {
      l.s = reduce ? 1 : 0.55;
      l.sv = 0;
      added++;
    }
  });
  docEl.classList.remove('tight', 'tighter');
  if (docEl.scrollHeight > docEl.clientHeight + 1) docEl.classList.add('tight');
  /* Answers always fit: optional labels give way from the bottom when a long brief needs the room. */
  for (var i = LINES.length - 1; i >= 0 && docEl.scrollHeight > docEl.clientHeight + 1; i--) {
    if (LINES[i].opt && !LINES[i].txt) LINES[i].el.hidden = true;
  }
  /* Up to the bottom padding's worth of overflow still clips nothing. */
  if (docEl.scrollHeight > docEl.clientHeight + 14) docEl.classList.add('tighter');
  if (!reduce) {
    LINES.forEach(function (l, i) {
      var d = before[i] - l.el.getBoundingClientRect().top;
      if (Math.abs(d) > 0.5 && !l.el.hidden && before[i]) l.y += d;
    });
    if (added || kick) {
      ph.rv += (cur % 2 ? -1 : 1) * 16;
      ph.yv -= 90;
    }
    wake();
  }
}
var raf = 0,
  last = 0;
function wake() {
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}
function frame(now) {
  raf = 0;
  var dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;
  var alive = false;
  LINES.forEach(function (l) {
    l.yv += (240 * (0 - l.y) - 19 * l.yv) * dt;
    l.y += l.yv * dt;
    l.sv += (260 * (1 - l.s) - 15 * l.sv) * dt;
    l.s += l.sv * dt;
    if (Math.abs(l.y) < 0.05 && Math.abs(l.yv) < 0.2) {
      l.y = 0;
      l.yv = 0;
    } else alive = true;
    if (Math.abs(1 - l.s) < 0.002 && Math.abs(l.sv) < 0.02) {
      l.s = 1;
      l.sv = 0;
    } else alive = true;
    l.el.style.transform =
      l.y || l.s !== 1
        ? 'translate3d(0,' + l.y.toFixed(2) + 'px,0) scale(' + l.s.toFixed(4) + ')'
        : '';
    l.el.style.opacity = l.s < 1 ? Math.max(0, Math.min(1, (l.s - 0.4) / 0.5)).toFixed(3) : '';
  });
  ph.rv += (150 * (0 - ph.r) - 11 * ph.rv) * dt;
  ph.r += ph.rv * dt;
  ph.yv += (170 * (0 - ph.y) - 13 * ph.yv) * dt;
  ph.y += ph.yv * dt;
  if (
    Math.abs(ph.r) > 0.004 ||
    Math.abs(ph.rv) > 0.02 ||
    Math.abs(ph.y) > 0.02 ||
    Math.abs(ph.yv) > 0.1
  )
    alive = true;
  else {
    ph.r = ph.rv = ph.y = ph.yv = 0;
  }
  phone.style.transform =
    ph.r || ph.y
      ? 'translate3d(0,' + ph.y.toFixed(2) + 'px,0) rotate(' + ph.r.toFixed(3) + 'deg)'
      : '';
  if (alive) raf = requestAnimationFrame(frame);
}

/* One question at a time. */
function focusStep(q) {
  var t =
    q.querySelector('input:checked') || q.querySelector('input:not([type=hidden]),textarea,select');
  if (t) t.focus({ preventScroll: true });
  var r = form.getBoundingClientRect();
  if (r.top < 8 || r.top > innerHeight * 0.55)
    window.scrollTo({ top: scrollY + r.top - 16, behavior: reduce ? 'auto' : 'smooth' });
}
var inSpring = null;
function enter(q, dir) {
  if (reduce) return;
  var s = { y: 26 * dir, v: 0, a: 0 },
    id = {};
  inSpring = id;
  var prev = performance.now();
  var f = function (now) {
    if (inSpring !== id) return;
    var dt = Math.min(0.033, (now - prev) / 1000 || 0.016);
    prev = now;
    s.v += (240 * (0 - s.y) - 20 * s.v) * dt;
    s.y += s.v * dt;
    s.a = Math.min(1, s.a + dt * 6);
    q.style.transform = 'translateY(' + s.y.toFixed(2) + 'px)';
    q.style.opacity = s.a.toFixed(3);
    if (Math.abs(s.y) > 0.05 || Math.abs(s.v) > 0.2 || s.a < 1) requestAnimationFrame(f);
    else {
      q.style.transform = '';
      q.style.opacity = '';
    }
  };
  q.style.opacity = 0;
  requestAnimationFrame(f);
}
function show(i, dir, noFocus) {
  steps[cur].classList.remove('on');
  cur = i;
  var q = steps[cur];
  q.classList.add('on');
  var msg = 'Question ' + (cur + 1) + ' of ' + steps.length;
  count.textContent = msg;
  [].forEach.call(document.querySelectorAll('[data-q-pip]'), function (p) {
    p.textContent = cur + 1;
  });
  if (!noFocus) live.textContent = msg;
  bar.style.setProperty('--pr', ((cur + 1) / steps.length).toFixed(4));
  back.hidden = cur === 0;
  var lastStep = cur === steps.length - 1;
  next.hidden = lastStep;
  send.hidden = !lastStep;
  next.textContent = q.dataset.step === 'budget' && !val('budget') ? 'Skip' : 'Next';
  if (dir) enter(q, dir);
  if (!noFocus) focusStep(q);
}

/* Plain words when something is off. */
function fail(id, field, text) {
  var e = doc.getElementById(id);
  e.textContent = text;
  e.classList.add('on');
  if (field) field.setAttribute('aria-invalid', 'true');
  return false;
}
function clear(q) {
  $$('[data-err]', q).forEach(function (e) {
    e.textContent = '';
    e.classList.remove('on');
  });
  $$('[aria-invalid]', q).forEach(function (e) {
    e.removeAttribute('aria-invalid');
  });
}
var CHECK = {
  name: function () {
    return val('name')
      ? true
      : fail(
          'name-err',
          form.elements.name,
          "I'd like to know who I'm writing back to. What's your name?",
        );
  },
  email: function () {
    var v = val('email');
    if (!v)
      return fail('email-err', form.elements.email, 'I need an email address so I can reply.');
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ? true
      : fail(
          'email-err',
          form.elements.email,
          "That email doesn't look quite right. It should look like name@example.org.",
        );
  },
  org_type: function () {
    return val('org_type')
      ? true
      : fail('org-err', null, "Pick whichever is closest. It doesn't have to be perfect.");
  },
  message: function () {
    var v = val('message');
    if (!v)
      return fail(
        'message-err',
        form.elements.message,
        'Tell me a little about what you have in mind.',
      );
    return v.length >= 30
      ? true
      : fail(
          'message-err',
          form.elements.message,
          'Just a little more, please. A few sentences gives me enough to go on.',
        );
  },
  details: function () {
    var v = val('current_website');
    return !v || /^\S+\.\S+$/.test(v)
      ? true
      : fail(
          'site-err',
          form.elements.current_website,
          "That web address doesn't look right. Something like yourchurch.org is fine.",
        );
  },
};
function check(q) {
  clear(q);
  var f = CHECK[q.dataset.step],
    ok = f ? f() : true;
  if (!ok) {
    var t =
      q.querySelector('[aria-invalid=true]') ||
      q.querySelector('input:not([type=hidden]),textarea');
    if (t) t.focus();
  }
  return ok;
}
function goNext() {
  if (!check(steps[cur])) return;
  if (cur < steps.length - 1) show(cur + 1, 1);
}
next.addEventListener('click', goNext);
back.addEventListener('click', function () {
  if (cur > 0) {
    clear(steps[cur]);
    show(cur - 1, -1);
  }
});

form.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter' || e.isComposing) return;
  var t = e.target;
  if (t.tagName === 'BUTTON' || t.tagName === 'A' || t.tagName === 'SELECT') return;
  if (t.tagName === 'TEXTAREA') {
    if (e.shiftKey || coarse) return;
    e.preventDefault();
    goNext();
    return;
  }
  e.preventDefault();
  /* On the last, many-field question, Enter walks down the fields so nothing is sent by accident. */
  if (steps[cur].dataset.step === 'details') {
    var fs = $$('input:not([type=hidden]),select', steps[cur]),
      i = fs.indexOf(t);
    (fs[i + 1] || send).focus();
    return;
  }
  goNext();
});
form.addEventListener('input', function (e) {
  var q = e.target.closest('[data-step]');
  if (q) {
    clear(q);
    if (q.dataset.step === 'budget') next.textContent = 'Next';
  }
  refresh();
});
form.addEventListener('change', function () {
  refresh();
});

/* The draft: everything typed stays if the tab closes, and leaves once it is sent. Hidden
   Web3Forms fields, the origin fields and the honeypot are never saved. */
var DRAFT_KEY = 'ncs-contact-draft';
var PERSISTED = [
  'name',
  'email',
  'organization',
  'org_type',
  'message',
  'budget',
  'phone',
  'current_website',
  'timeline',
  'heard_from',
];
function restoreDraft() {
  try {
    var data = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    PERSISTED.forEach(function (n) {
      if (typeof data[n] === 'string' && data[n]) {
        var el = form.elements.namedItem(n);
        if (el) el.value = data[n];
      }
    });
  } catch (err) {
    /* storage blocked or bad data: nothing to restore */
  }
}
function saveDraft() {
  try {
    var out = {};
    PERSISTED.forEach(function (n) {
      var v = val(n);
      if (v) out[n] = v;
    });
    if (Object.keys(out).length) localStorage.setItem(DRAFT_KEY, JSON.stringify(out));
    else localStorage.removeItem(DRAFT_KEY);
  } catch (err) {
    /* storage blocked */
  }
}
function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (err) {
    /* storage blocked */
  }
}
var saveTimer = 0;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, 250);
}
form.addEventListener('input', scheduleSave);
form.addEventListener('change', scheduleSave);
restoreDraft();

/* Sent: two studies from the visitor's sector, the status on the brief, focus on the heading. */
function showSuccess() {
  var sector = val('org_type') || val('origin_org_type');
  var sets = $$('[data-success-studies]');
  var match = sets.some(function (x) {
    return x.dataset.successStudies === sector;
  })
    ? sector
    : 'any';
  sets.forEach(function (x) {
    x.hidden = x.dataset.successStudies !== match;
  });
  isSent = true;
  $('[data-tier-note]').hidden = true;
  errorEl.hidden = true;
  wrap.dataset.state = 'sent';
  refresh(true);
  sentH.focus({ preventScroll: true });
  /* Back to the top if the note fits there, with the brief still beside it; otherwise bring the note up. */
  var r = sentH.parentNode.getBoundingClientRect(),
    fits = r.bottom + scrollY < innerHeight - 72;
  if (fits && scrollY) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  else if (!fits && (r.top < 8 || r.top > innerHeight * 0.5))
    window.scrollTo({ top: scrollY + r.top - 16, behavior: reduce ? 'auto' : 'smooth' });
}
/* Back from the no-JS redirect with the script running after all, or a reload of it. */
if (location.hash === '#sent') {
  wrap.dataset.state = 'sent';
  isSent = true;
  sentH.focus({ preventScroll: true });
}

form.addEventListener('submit', function (e) {
  e.preventDefault();
  for (var i = 0; i < steps.length; i++) {
    if (!check(steps[i])) {
      if (i !== cur) {
        show(i, -1, true);
        check(steps[i]);
      }
      return;
    }
  }
  /* Honeypot: real people never fill it. Pretend it worked, and send nothing. */
  if (form.elements.botcheck.value) {
    clearDraft();
    showSuccess();
    return;
  }
  errorEl.hidden = true;
  send.disabled = true;
  send.classList.add('is-spinning');
  var label = submitLabel.textContent;
  submitLabel.textContent = 'Sending...';
  fetch(form.action, {
    method: 'POST',
    body: new FormData(form),
    headers: { Accept: 'application/json' },
  })
    .then(function (res) {
      if (!res.ok) {
        errorEl.hidden = false;
        return;
      }
      clearDraft();
      /* GA4 key event. Only fixed labels, never a field value, and a no-op when gtag is absent.
         The honeypot path above deliberately sends nothing. */
      track('generate_lead', { form: 'contact' });
      showSuccess();
    })
    .catch(function () {
      errorEl.hidden = false;
    })
    .then(function () {
      send.disabled = false;
      send.classList.remove('is-spinning');
      submitLabel.textContent = label;
    });
});

/* A preselected tier: a note, and the budget only where a tier's floor truly starts a bracket. */
var TIER = JSON.parse(form.dataset.tiers || '{}');
var params = new URLSearchParams(location.search),
  raw = params.get('tier');
if (!raw) {
  try {
    raw = sessionStorage.getItem('ncs-tier');
  } catch (err) {
    raw = null;
  }
}
var slug = /^[a-z0-9-]{1,40}$/i;
var tier = raw && slug.test(raw) ? TIER[raw.toLowerCase()] : null;
if (tier) {
  tierName = tier.name;
  $('[data-origin=tier]').value = tier.name.toLowerCase();
  var note = $('[data-tier-note]');
  var radio = !val('budget') && $('input[name=budget][value="' + tier.budget + '"]');
  if (radio) radio.checked = true;
  note.textContent =
    'You were looking at ' +
    tier.name +
    ', from ' +
    tier.from +
    (radio ? ', so I set the budget to match. Change it any time.' : '.');
  note.hidden = false;
}
['from', 'service', 'org_type'].forEach(function (k) {
  var v = params.get(k);
  if (!v || !slug.test(v)) return;
  var h = $('[data-origin=' + k + ']');
  if (h) h.value = v.toLowerCase();
  if (k === 'org_type' && !val('org_type')) {
    var o = $('input[name=org_type][value="' + v + '"]');
    if (o) o.checked = true;
  }
});

refresh();
show(0, 0, true);
addEventListener('pageshow', function () {
  refresh();
});
