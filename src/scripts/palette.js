/* The command palette (src/components/Palette.astro). Ctrl+K, Cmd+K or / opens it, and so does any
   [data-pal-open] button. Type to filter, arrows to move, Enter to go, Escape to close. Every row
   is a real link or a real button, so a mouse or a finger works the same way.

   The rows come from /peek.json, the file the link previews read (peek-data.js), fetched the
   first time the palette opens: pages, the case studies, the sector pages, the three prices, the
   journal posts. The actions are built here. If the file cannot be fetched, the actions still
   work and the dock still has every page.

   The dialog is native, so the browser traps focus and gives it back on close. The keyboard stays
   in the text field the whole time (the combobox pattern): the row you are on is named to a screen
   reader through aria-activedescendant. The / shortcut is a single key, so the foot of the card
   has a switch that turns it off (WCAG 2.1.4); the choice is kept on the device. */
import { ui, sites } from './kit.js';
import { peekData } from './peek-data.js';
import { cue, setSound, soundOn } from './sound.js';

var doc = document;
var dlg = doc.querySelector('[data-pal]');

if (dlg && dlg.showModal) {
  var input = dlg.querySelector('[data-pal-q]'),
    list = dlg.querySelector('[data-pal-list]'),
    none = dlg.querySelector('[data-pal-none]'),
    say = dlg.querySelector('[data-pal-say]'),
    slashBtn = dlg.querySelector('[data-pal-slash]'),
    openers = [].slice.call(doc.querySelectorAll('[data-pal-open]'));
  var SLASH = 'ncs-slash';
  var slashOn = true;
  try {
    slashOn = localStorage.getItem(SLASH) !== 'off';
  } catch (e) {
    /* No storage: the shortcut stays on for this page. */
  }
  slashBtn.setAttribute('aria-pressed', String(slashOn));

  /* A Mac names the key differently. */
  var mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  if (mac) {
    [].forEach.call(doc.querySelectorAll('[data-pal-key]'), function (k) {
      k.textContent = '⌘K';
    });
  }

  var groups = [],
    rows = [],
    at = 0,
    opener = null,
    data = null;

  /* ---- What can be found -------------------------------------------------------------------
     A group is a label-voice heading and its items. An item is a title, a quieter second line,
     extra words to be found by, and either an address or something to do. */
  var theme = function () {
    return doc.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  };
  function actions() {
    var me = (data && data.me) || null;
    var list = [
      { t: 'Start a project', s: 'The contact form', href: '/contact/', k: 'contact hire quote' },
    ];
    if (me) {
      list.push({
        t: 'Copy email',
        s: me.email,
        k: 'mail address clipboard',
        keep: true,
        run: function (row) {
          var done = function (ok) {
            row.querySelector('.pal-s').textContent = ok ? 'Copied' : me.email;
            say.textContent = ok ? 'Email address copied.' : 'Could not copy. It is ' + me.email;
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(me.email).then(
              function () {
                done(true);
              },
              function () {
                done(false);
              },
            );
          } else done(false);
        },
      });
      list.push({ t: 'Text me', s: me.phone, href: me.smsHref, k: 'sms phone message call' });
    }
    list.push({
      t: 'Turn the page over',
      s: theme() === 'dark' ? 'To light mode' : 'To dark mode',
      k: 'theme dark light mode night',
      run: function () {
        /* The switch already knows how to turn the page; press it. */
        var flip = doc.querySelector('[data-theme-flip]');
        if (flip) flip.click();
      },
    });
    list.push({
      t: soundOn() ? 'Sound off' : 'Sound on',
      s: soundOn() ? 'Stop the small cues' : 'Small cues as things land',
      k: 'audio mute volume noise',
      keep: true,
      run: function () {
        setSound(!soundOn());
        render();
      },
    });
    if (sites && sites.length) {
      list.push({
        t: 'Show me a random one',
        s: 'Open a client at random',
        k: 'surprise shuffle draw card client',
        run: function () {
          /* Not the study you are already reading. */
          var pool = sites.filter(function (s) {
            return s.study !== location.pathname;
          });
          var s = pool[Math.floor(Math.random() * pool.length)];
          var tile = doc.querySelector('.tile[data-slug="' + s.slug + '"]');
          if (ui.openSheet) ui.openSheet(s, tile || null);
          else location.href = s.study;
        },
      });
    }
    return list;
  }
  function build() {
    groups = [];
    if (data) {
      groups.push({
        name: 'Pages',
        items: data.pages
          .filter(function (p) {
            return p.href !== '/contact/';
          })
          .map(function (p) {
            return { t: p.t, href: p.href, k: p.k };
          }),
      });
      groups.push({
        name: 'Case studies',
        items: Object.keys(data.work).map(function (slug) {
          var w = data.work[slug];
          return { t: w.name, s: w.sector, href: '/work/' + slug + '/', k: w.host + ' ' + slug };
        }),
      });
      groups.push({
        name: 'Websites for',
        items: data.sectors.map(function (s) {
          return { t: s.t, href: s.href, k: 'sector websites for' };
        }),
      });
      groups.push({
        name: 'Prices',
        items: data.prices.tiers.map(function (t) {
          return { t: t.name, s: 'from ' + t.from, href: t.href, k: 'price cost tier ' + t.who };
        }),
      });
      var posts = Object.keys(data.posts);
      if (posts.length) {
        groups.push({
          name: 'Journal',
          items: posts.map(function (slug) {
            var p = data.posts[slug];
            return {
              t: p.title,
              s: (p.cluster ? p.cluster + ' · ' : '') + p.min + ' min read',
              href: '/journal/' + slug + '/',
              k: 'journal post ' + p.cluster,
            };
          }),
        });
      }
    }
    groups.push({ name: 'Actions', items: actions() });
  }

  /* ---- The match ---------------------------------------------------------------------------
     Small and by hand. A word found whole scores best, most of all at the start of a word; failing
     that, its letters in order in the title (so "fbm" finds First Baptist Muncie and "stn" finds
     Stone Steps), with more for letters that start a word or sit together. A letter only counts
     at the start of a word or inside the word the last one was found in, or two letters would
     match half the journal. Every word typed has to be found somewhere. */
  var edge = /[\s\-/.,&(]/;
  function word(q, text, loose) {
    var t = text.toLowerCase(),
      i = t.indexOf(q);
    if (i >= 0) return 100 + (i === 0 || edge.test(t[i - 1]) ? 40 : 0) - Math.min(i, 30);
    if (!loose) return 0;
    var qi = 0,
      s = 0,
      prev = -2,
      /* Has a new word begun since the last letter was found? */
      crossed = true;
    for (i = 0; i < t.length && qi < q.length; i++) {
      var starts = i === 0 || edge.test(t[i - 1]);
      if (starts) crossed = true;
      if (t[i] !== q[qi] || (crossed && !starts)) continue;
      s += 4 + (starts ? 10 : 0) + (prev === i - 1 ? 6 : 0);
      prev = i;
      crossed = false;
      qi++;
    }
    return qi === q.length ? s : 0;
  }
  function score(words, item) {
    var total = 0;
    for (var i = 0; i < words.length; i++) {
      var best = Math.max(
        word(words[i], item.t, true),
        item.s ? word(words[i], item.s, false) * 0.6 : 0,
        item.k ? word(words[i], item.k, false) * 0.5 : 0,
      );
      if (!best) return 0;
      total += best;
    }
    return total;
  }

  /* ---- The rows ---------------------------------------------------------------------------- */
  function rowFor(item, id) {
    var row = doc.createElement(item.href ? 'a' : 'button');
    if (item.href) row.href = item.href;
    else row.type = 'button';
    row.className = 'pal-row';
    row.id = 'pal-o-' + id;
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', 'false');
    /* The keyboard never leaves the text field, so a row is not a tab stop of its own. */
    row.tabIndex = -1;
    var t = doc.createElement('span');
    t.className = 'pal-t';
    t.textContent = item.t;
    row.appendChild(t);
    var s = doc.createElement('span');
    s.className = 'pal-s';
    s.textContent = item.s || '';
    row.appendChild(s);
    row._item = item;
    return row;
  }
  function render() {
    build();
    var words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    var shown = groups
      .map(function (g) {
        var items = g.items
          .map(function (it) {
            return { it: it, sc: words.length ? score(words, it) : 1 };
          })
          .filter(function (m) {
            return m.sc > 0;
          });
        /* With something typed, the best match leads its group; with nothing, the group's own order. */
        if (words.length)
          items.sort(function (a, b) {
            return b.sc - a.sc;
          });
        return { name: g.name, items: items, best: items.length ? items[0].sc : 0 };
      })
      .filter(function (g) {
        return g.items.length;
      });
    /* And the group with the best match comes first. */
    if (words.length)
      shown.sort(function (a, b) {
        return b.best - a.best;
      });
    list.textContent = '';
    rows = [];
    shown.forEach(function (g, gi) {
      var box = doc.createElement('div');
      box.className = 'pal-group';
      box.setAttribute('role', 'group');
      box.setAttribute('aria-labelledby', 'pal-g-' + gi);
      var head = doc.createElement('p');
      head.className = 'label';
      head.id = 'pal-g-' + gi;
      head.setAttribute('role', 'presentation');
      head.textContent = g.name;
      box.appendChild(head);
      g.items.forEach(function (m) {
        var row = rowFor(m.it, rows.length);
        rows.push(row);
        box.appendChild(row);
      });
      list.appendChild(box);
    });
    none.hidden = rows.length > 0;
    list.hidden = rows.length === 0;
    mark(0);
    list.scrollTop = 0;
    if (words.length) {
      say.textContent = rows.length
        ? rows.length + (rows.length === 1 ? ' result.' : ' results.')
        : 'No results.';
    }
  }
  /* The row the keyboard is on. */
  function mark(i, scroll) {
    if (!rows.length) {
      at = 0;
      input.removeAttribute('aria-activedescendant');
      return;
    }
    at = (i + rows.length) % rows.length;
    rows.forEach(function (r, n) {
      r.setAttribute('aria-selected', String(n === at));
    });
    input.setAttribute('aria-activedescendant', rows[at].id);
    if (scroll) rows[at].scrollIntoView({ block: 'nearest' });
  }

  /* ---- Opening and closing ------------------------------------------------------------------ */
  function openPal() {
    if (dlg.open) return;
    opener = doc.activeElement;
    input.value = '';
    say.textContent = '';
    render();
    dlg.showModal();
    input.focus();
    cue('open');
    if (!data) {
      peekData().then(function (d) {
        if (!d) return;
        data = d;
        if (dlg.open) render();
      });
    }
  }
  function closePal() {
    if (dlg.open) dlg.close();
  }
  dlg.addEventListener('close', function () {
    cue('close');
    /* The browser hands focus back to whatever opened it. If that was inside the top line's card,
       which shut when this opened, the card's own button takes it instead. */
    var back = opener;
    opener = null;
    if (back && back.isConnected && !back.offsetParent && back.closest('[popover]')) {
      var status = doc.querySelector('.top .status');
      if (status) status.focus({ preventScroll: true });
    }
  });

  /* Do what a row is for. A link is simply followed by the browser (so a new tab still works); an
     action runs, and unless it wants the palette kept open, the palette closes first. */
  function go(row, e) {
    var item = row._item;
    if (!item.run) {
      /* A plain link. Let the click through, and get out of the way of the page change. */
      if (!e) row.click();
      return;
    }
    if (e) e.preventDefault();
    if (item.keep) item.run(row);
    else {
      closePal();
      item.run(row);
    }
  }
  list.addEventListener('click', function (e) {
    var row = e.target.closest('.pal-row');
    if (!row) return;
    if (row._item.run) go(row, e);
    else if (!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
      /* Same tab: put the card away so it is not in the picture of the page change. */
      setTimeout(closePal, 0);
    }
  });
  /* The pointer picks a row the way the arrows do, but only when it really moves. */
  list.addEventListener('pointermove', function (e) {
    var row = e.target.closest('.pal-row'),
      i = row ? rows.indexOf(row) : -1;
    if (i >= 0 && i !== at) mark(i);
  });
  input.addEventListener('input', render);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      mark(at + (e.key === 'ArrowDown' ? 1 : -1), true);
    } else if (e.key === 'Enter' && rows.length) {
      e.preventDefault();
      go(rows[at]);
    }
  });
  dlg.querySelector('[data-pal-close]').addEventListener('click', closePal);
  /* A press on the dimmed page outside the card closes it. */
  dlg.addEventListener('pointerdown', function (e) {
    if (e.target !== dlg) return;
    var r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      closePal();
  });
  slashBtn.addEventListener('click', function () {
    slashOn = !slashOn;
    slashBtn.setAttribute('aria-pressed', String(slashOn));
    try {
      localStorage.setItem(SLASH, slashOn ? 'on' : 'off');
    } catch (e) {
      /* Not kept: it holds for this page. */
    }
    cue('toggle');
  });
  openers.forEach(function (b) {
    b.setAttribute('aria-haspopup', 'dialog');
    b.addEventListener('click', openPal);
  });

  /* The keys. Ctrl+K or Cmd+K anywhere, and it closes the palette too. A bare / only when nobody
     is typing, and only while its switch is on. */
  var typing = function (t) {
    return (
      t &&
      (t.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) ||
        (t.getAttribute && /^(textbox|combobox|searchbox)$/.test(t.getAttribute('role') || '')))
    );
  };
  addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (dlg.open) closePal();
      else openPal();
    } else if (
      e.key === '/' &&
      slashOn &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      !dlg.open &&
      !typing(e.target)
    ) {
      e.preventDefault();
      openPal();
    }
  });
}
