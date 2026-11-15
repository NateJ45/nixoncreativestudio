/* Prices: your plan, everywhere. The one place that knows which tier and which care plan the
   visitor has picked. Anything that lets them pick (the receipt, a cost row's "Show on the
   receipt", the three questions, "How soon you hear back", a plan's name in the care table, or an
   address carrying ?tier= and ?plan=) calls setPlan(), and everything that shows the choice hears
   about it through onPlan().

   This file also does the quiet marking: the tier's card, its row in the cost table, and the
   plan's column in the care table (its card on a phone) each take the class `yours` and show
   their "Your pick" tag, which is in the markup, hidden, from the start. Nothing is marked until
   the visitor chooses: the receipt opening on Signature with Care is not a choice.

   The choice is kept in the address (?tier=signature&plan=care, with replaceState, so it adds no
   history entry and the hash stays), which is how the dock's corner card sends a tier here. */
var doc = document;
var all = function (a, r) {
  return [].slice.call((r || doc).querySelectorAll(a));
};

/* "Care+" travels as "care-plus", "Light Care" as "light-care". */
export function slug(name) {
  return String(name).toLowerCase().replace(/\+/g, '-plus').replace(/\s+/g, '-');
}

var state = { tier: '', plan: '' },
  subs = [];
/* Every tier and plan the page can mark, read from the markup, so a name that is not on the page
   (a stale or mistyped address) is never taken. */
var names = function (attr) {
  return all('[' + attr + ']')
    .map(function (el) {
      return el.getAttribute(attr);
    })
    .filter(function (n, i, list) {
      return list.indexOf(n) === i;
    });
};
var TIERS = names('data-yours-tier'),
  PLANS = names('data-yours-plan');
var known = function (list, value) {
  return (
    list.filter(function (n) {
      return n === value || slug(n) === slug(value || '');
    })[0] || ''
  );
};

export function getPlan() {
  return { tier: state.tier, plan: state.plan };
}

/* Hear every change. fn(state, source): source is who made it, so a listener can ignore its own. */
export function onPlan(fn) {
  subs.push(fn);
}

var mark = function (el, on) {
  el.classList.toggle('yours', on);
  all('[data-yours-tag]', el).forEach(function (tag) {
    /* A row's tag belongs to the row, a card's to the card: never reach into a nested one. */
    if (tag.closest('[data-yours-tier], [data-yours-plan], [data-row-tier]') === el)
      tag.hidden = !on;
  });
};
function paint() {
  all('[data-yours-tier]').forEach(function (el) {
    mark(el, el.getAttribute('data-yours-tier') === state.tier);
  });
  all('[data-yours-plan]').forEach(function (el) {
    mark(el, el.getAttribute('data-yours-plan') === state.plan);
  });
  /* The cost table has a row for each usual pairing. With a tier and a plan picked, the row that is
     exactly that pair is marked; with a tier alone, or a pair the table does not print, the tier's
     first row is. */
  var rows = all('[data-row-tier]');
  var mine = rows.filter(function (r) {
    return r.dataset.rowTier === state.tier;
  });
  var exact = mine.filter(function (r) {
    return r.dataset.rowPlan === state.plan;
  })[0];
  rows.forEach(function (r) {
    mark(r, r === (exact || mine[0]));
  });
  /* The care table marks a whole column: the table carries which one (prices.css draws it). */
  all('table.care').forEach(function (t) {
    var at = PLANS.indexOf(state.plan);
    if (at < 0) t.removeAttribute('data-yours-col');
    else t.setAttribute('data-yours-col', String(at + 1));
  });
  all('[data-plan-pick]').forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.planPick === state.plan ? 'true' : 'false');
  });
}

function keep() {
  try {
    var u = new URL(location.href);
    if (state.tier) u.searchParams.set('tier', slug(state.tier));
    else u.searchParams.delete('tier');
    if (state.plan) u.searchParams.set('plan', slug(state.plan));
    else u.searchParams.delete('plan');
    history.replaceState(history.state, '', u.pathname + u.search + u.hash);
  } catch (e) {}
}

/* patch is { tier, plan }, either or both. Unknown names are ignored. */
export function setPlan(patch, source) {
  var tier = 'tier' in patch ? known(TIERS, patch.tier) : state.tier,
    plan = 'plan' in patch ? known(PLANS, patch.plan) : state.plan;
  if (tier === state.tier && plan === state.plan) return;
  state.tier = tier;
  state.plan = plan;
  paint();
  if (source !== 'url') keep();
  subs.forEach(function (fn) {
    fn(getPlan(), source);
  });
}

/* A plan's name at the head of its care table column becomes a real button, so a keyboard can pick
   a plan there too (and the column lights while it has focus). Without script it stays plain text. */
all('table.care thead th[data-yours-plan]').forEach(function (th) {
  var pl = th.querySelector('.pl');
  if (!pl) return;
  var b = doc.createElement('button'),
    more = doc.createElement('span');
  b.type = 'button';
  b.className = 'care-pick';
  b.dataset.planPick = th.getAttribute('data-yours-plan');
  b.setAttribute('aria-pressed', 'false');
  more.className = 'vh';
  more.textContent = ': mark as my plan';
  pl.parentNode.insertBefore(b, pl);
  b.appendChild(pl);
  b.appendChild(more);
  b.addEventListener('click', function () {
    setPlan({ plan: state.plan === b.dataset.planPick ? '' : b.dataset.planPick }, 'care');
  });
});

/* An address that carries a choice (the dock's corner card links here with ?tier=). Called by
   prices.js once every listener is in place. */
export function planFromUrl() {
  var q = new URLSearchParams(location.search),
    patch = {};
  if (q.get('tier')) patch.tier = q.get('tier');
  if (q.get('plan')) patch.plan = q.get('plan');
  if ('tier' in patch || 'plan' in patch) setPlan(patch, 'url');
}
