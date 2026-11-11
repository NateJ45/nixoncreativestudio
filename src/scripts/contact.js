/* The contact form's enhancement layer: one question at a time, a "Check your answers" step with a
   Change button per answer, validation that says what to do, draft save and restore, URL prefill, the
   "Your answers so far" phone, fetch submit and the success panel. The form works without any of this:
   it is a plain post to the site's own /api/contact/ endpoint, with the same fields. */
import { ui } from './kit.js';
import { track } from '../lib/track';
import { attributionFields } from '../lib/attribution';

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
/* When the page loaded, for the endpoint's "too fast to be a person" check. */
var renderedAt = $('[data-rendered-at]', form);
if (renderedAt) renderedAt.value = String(Date.now());
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
/* The last step is "Check your answers"; the ones before it are the questions. */
var checkAt = steps.length - 1,
  checkEl = $('[data-check]'),
  returning = false;

/* The brief. A line shows its label until it has an answer. The same element holds one or the other, and a line still waiting is hidden from screen readers. */
var orgLabel = {
  church: 'A church',
  school: 'A school',
  nonprofit: 'A nonprofit',
  'small-business': 'A small business',
  other: 'Something else',
};
var runsLabel = {},
  budgetLabel = {},
  timeLabel = {},
  heardLabel = {};
$$('input[name=runs]').forEach(function (r) {
  runsLabel[r.value] = r.nextElementSibling.textContent;
});
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
    term: 'What you hope to build',
    ph: "What you're hoping to build",
    cls: 'msg',
    get: function () {
      return val('message');
    },
  },
  {
    key: 'runs',
    term: 'Who will keep it updated',
    ph: 'Who will keep it updated',
    cls: 'pill',
    get: function () {
      return runsLabel[val('runs')] || '';
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
    term: 'How you heard',
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

/* Check your answers: every answer in a list, "Not provided" for a skipped one, and a Change button
   that goes back to that question and then straight back here. Built with textContent only. */
var CHECK_ROWS = [
  ['Name', 'name', 'name'],
  ['Email', 'email', 'email'],
  ['Kind of organization', 'org_type', 'org_type'],
  ['What you hope to build', 'message', 'message'],
  ['Who will keep it updated', 'runs', 'runs'],
  ['Budget range', 'budget', 'budget'],
  ['Organization name', 'organization', 'details'],
  ['Phone', 'phone', 'details'],
  ['Current website', 'current_website', 'details'],
  ['Project timeline', 'timeline', 'details'],
  ['How you heard about me', 'heard_from', 'details'],
];
var shownAs = function (key) {
  var v = val(key);
  if (key === 'org_type') return orgLabel[v] || '';
  if (key === 'runs') return runsLabel[v] || '';
  if (key === 'budget') return budgetLabel[v] || '';
  if (key === 'timeline') return timeLabel[v] || '';
  if (key === 'heard_from') return heardLabel[v] || '';
  return v;
};
var stepIndex = function (name) {
  for (var i = 0; i < steps.length; i++) if (steps[i].dataset.step === name) return i;
  return 0;
};
function buildCheck() {
  checkEl.textContent = '';
  CHECK_ROWS.forEach(function (row) {
    var wrapRow = doc.createElement('div'),
      dt = doc.createElement('dt'),
      dd = doc.createElement('dd'),
      act = doc.createElement('dd'),
      btn = doc.createElement('button'),
      hint = doc.createElement('span'),
      shown = shownAs(row[1]);
    wrapRow.className = 'ck';
    dt.textContent = row[0];
    dd.textContent = shown || 'Not provided';
    if (!shown) dd.className = 'ck-none';
    act.className = 'ck-act';
    btn.type = 'button';
    btn.className = 'ck-change';
    btn.textContent = 'Change';
    hint.className = 'sr-only';
    hint.textContent = ' ' + row[0].toLowerCase();
    btn.appendChild(hint);
    btn.addEventListener('click', function () {
      returning = true;
      show(stepIndex(row[2]), -1);
    });
    act.appendChild(btn);
    wrapRow.appendChild(dt);
    wrapRow.appendChild(dd);
    wrapRow.appendChild(act);
    checkEl.appendChild(wrapRow);
  });
}

/* One question at a time. */
function focusStep(q) {
  var t =
    q.dataset.step === 'check'
      ? q.querySelector('#check-h')
      : q.querySelector('input:checked') ||
        q.querySelector('input:not([type=hidden]),textarea,select');
  if (t) t.focus({ preventScroll: true });
  clearDock();
}
/* Bring the card into view, and keep its Next button above the dock on a small phone. If the card is
   taller than the room there is, Next wins: it is the thing to reach, and the field is just above it. */
function clearDock() {
  var r = form.getBoundingClientRect(),
    nav = form.querySelector('.q-nav').getBoundingClientRect(),
    room = innerHeight - 96;
  var by = r.top < 8 || r.top > innerHeight * 0.55 ? r.top - 16 : 0;
  if (nav.bottom - by > room) by = nav.bottom - room;
  if (by) window.scrollTo({ top: scrollY + by, behavior: reduce ? 'auto' : 'smooth' });
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
/* Funnel events: form_start on the first answer, form_step each time a new question is reached
   going forward, so GA4 shows where people stop. Step names are the fixed data-step keys. */
var started = false,
  furthest = 0;
function noteStart() {
  if (started) return;
  started = true;
  track('form_start', { form: 'contact' });
}
function show(i, dir, noFocus) {
  steps[cur].classList.remove('on');
  if (dir > 0 && i > furthest) {
    furthest = i;
    track('form_step', {
      form: 'contact',
      step_number: i + 1,
      step_name: i === checkAt ? 'check' : steps[i].dataset.step || 'step',
    });
  }
  cur = i;
  var q = steps[cur];
  q.classList.add('on');
  var lastStep = cur === checkAt;
  if (lastStep) {
    returning = false;
    buildCheck();
  }
  var msg = lastStep ? 'Check your answers' : 'Question ' + (cur + 1) + ' of ' + checkAt;
  count.textContent = msg;
  /* The visible count is hidden from screen readers; this is the one that gets read. */
  live.textContent = msg;
  bar.style.setProperty('--pr', (lastStep ? 1 : (cur + 1) / (checkAt + 1)).toFixed(4));
  back.hidden = cur === 0;
  next.hidden = lastStep;
  send.hidden = !lastStep;
  setNextLabel();
  if (dir) enter(q, dir);
  if (!noFocus) focusStep(q);
}

/* Next says what it does: Skip on an unanswered optional choice, and after a Change, back to the list. */
function setNextLabel() {
  var step = steps[cur].dataset.step;
  next.textContent = returning
    ? 'Back to your answers'
    : (step === 'budget' && !val('budget')) || (step === 'runs' && !val('runs'))
      ? 'Skip'
      : 'Next';
}

/* Say what to do when something is off: "Enter your email address", in the question's own words. */
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
  q.removeAttribute('aria-invalid');
  $$('[aria-invalid]', q).forEach(function (e) {
    e.removeAttribute('aria-invalid');
  });
}
var CHECK = {
  name: function () {
    return val('name')
      ? true
      : fail('name-err', form.elements.name, "Enter your name, so I know who I'm writing back to.");
  },
  email: function () {
    var v = val('email');
    if (!v)
      return fail('email-err', form.elements.email, 'Enter your email address, so I can reply.');
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ? true
      : fail('email-err', form.elements.email, 'Enter an email address like name@example.org.');
  },
  org_type: function () {
    return val('org_type')
      ? true
      : fail(
          'org-err',
          steps[cur],
          "Choose the kind of organization closest to yours. It doesn't have to be exact.",
        );
  },
  message: function () {
    var v = val('message');
    if (!v)
      return fail(
        'message-err',
        form.elements.message,
        "Tell me what you're hoping to build. A few sentences is plenty.",
      );
    return v.length >= 30
      ? true
      : fail(
          'message-err',
          form.elements.message,
          'Write a little more about what you hope to build: at least 30 letters. What you wrote is still there.',
        );
  },
  details: function () {
    var v = val('current_website');
    return !v || /^\S+\.\S+$/.test(v)
      ? true
      : fail(
          'site-err',
          form.elements.current_website,
          'Enter a web address like yourchurch.org, or leave it empty.',
        );
  },
};
function check(q) {
  clear(q);
  var f = CHECK[q.dataset.step],
    ok = f ? f() : true;
  if (!ok) {
    var t =
      q.querySelector('input[aria-invalid=true],textarea[aria-invalid=true]') ||
      q.querySelector('input:not([type=hidden]),textarea');
    if (t) t.focus({ preventScroll: true });
    /* The message that just appeared pushed Next down. */
    clearDock();
  }
  return ok;
}
function goNext() {
  if (!check(steps[cur])) return;
  if (returning) show(checkAt, 1);
  else if (cur < checkAt) show(cur + 1, 1);
}
next.addEventListener('click', goNext);
back.addEventListener('click', function () {
  if (cur > 0) {
    clear(steps[cur]);
    returning = false;
    show(cur - 1, -1);
  }
});

form.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter' || e.isComposing) return;
  var t = e.target;
  if (t.tagName === 'BUTTON' || t.tagName === 'A' || t.tagName === 'SELECT') return;
  /* Enter in the long answer is a new line, always. Only the buttons move on. */
  if (t.tagName === 'TEXTAREA') return;
  e.preventDefault();
  /* On the many-field question, Enter walks down the fields, then to Next. */
  if (steps[cur].dataset.step === 'details') {
    var fs = $('input:not([type=hidden]),select', steps[cur]),
      i = fs.indexOf(t);
    (fs[i + 1] || next).focus();
    return;
  }
  goNext();
});
form.addEventListener('input', function (e) {
  noteStart();
  var q = e.target.closest('[data-step]');
  if (q) {
    clear(q);
    setNextLabel();
  }
  refresh();
});
form.addEventListener('change', function () {
  noteStart();
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
  'runs',
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

/* The "Received" stamp on the sent card. It carries today's date, written plainly ("Nov 9, 2026").
   After a send it presses in on a spring: it comes down from above the card, large and a little
   turned, lands with a small overshoot, and the ink spreads once. A reload of #sent, and reduced
   motion, find it already stamped. */
var stamp = $('[data-stamp]'),
  stampDate = $('[data-stamp-date]');
if (stampDate) {
  try {
    stampDate.textContent = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());
  } catch (err) {
    /* An old browser without Intl: the stamp just says Received. */
  }
}
function pressStamp() {
  if (!stamp || reduce) return;
  var press = ui.spring(230, 13, 0),
    last = 0,
    landed = false;
  /* Waiting above the card until the panel has settled into view. */
  stamp.style.opacity = '0';
  stamp.classList.remove('inked');
  setTimeout(function () {
    requestAnimationFrame(function frame(now) {
      var dt = Math.min(0.033, last ? (now - last) / 1000 : 0.016);
      last = now;
      var going = press.step(1, dt),
        p = press.x;
      /* Scale 1.6 down to 1, a dip under 1 on the overshoot reads as the press. */
      stamp.style.transform =
        'rotate(' + (-16 + 8 * p).toFixed(2) + 'deg) scale(' + (1.6 - 0.6 * p).toFixed(3) + ')';
      stamp.style.opacity = String(Math.min(1, 0.15 + p * 1.7));
      if (!landed && p >= 0.98) {
        landed = true;
        stamp.classList.add('inked');
      }
      if (going) requestAnimationFrame(frame);
      else {
        stamp.style.transform = '';
        stamp.style.opacity = '';
      }
    });
  }, 260);
}

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
  pressStamp();
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
  /* Copy the first-touch note into the hidden fields, so the stored inquiry says where this
     person first found the site. */
  var attr = attributionFields();
  $$('[data-attr]', form).forEach(function (el) {
    el.value = attr[el.dataset.attr] || '';
  });
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
        track('form_error', { form: 'contact', error_type: 'http-' + res.status });
        return;
      }
      clearDraft();
      /* GA4 key event. Only fixed labels, never a field value, and a no-op when gtag is absent.
         The honeypot path above deliberately sends nothing. */
      track('generate_lead', leadParams(attr));
      showSuccess();
    })
    .catch(function () {
      errorEl.hidden = false;
      track('form_error', { form: 'contact', error_type: 'network' });
    })
    .then(function () {
      send.disabled = false;
      send.classList.remove('is-spinning');
      submitLabel.textContent = label;
    });
});

/* The lead event's parameters: the CHOICE keys the visitor picked (org type, budget band,
   timeline, how they heard), never anything they typed. track() drops anything that is not a
   short label. value is the floor of the budget band they chose, from src/data/pricing.ts via
   the form's data-tiers, so GA4 can total "lead value" per channel; no band, no value. */
function leadParams(attr) {
  var p = { form: 'contact', lead_source: attr.lead_source || 'unknown' };
  /* The first page they saw, as a label (work/stone-steps-50k; home for /). */
  var landing = (attr.first_landing || '').replace(/^\/+|\/+$/g, '');
  if (attr.first_landing) p.landing_page = landing || 'home';
  ['org_type', 'budget', 'timeline', 'heard_from', 'runs'].forEach(function (k) {
    var v = val(k);
    if (v) p[k] = v;
  });
  var tiers = JSON.parse(form.dataset.tiers || '{}'),
    band = 0;
  Object.keys(tiers).forEach(function (k) {
    if (tiers[k].budget && tiers[k].budget === p.budget) band = tiers[k].floor;
  });
  if (band) {
    p.value = band;
    p.currency = 'USD';
  }
  return p;
}

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
