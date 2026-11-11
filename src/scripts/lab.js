/* The Lab strip on /work (LabStrip.astro). Each card has a demo run by a real button and a second
   button that turns the card over. Everything here runs on made-up data written into the markup.

   Motion: a demo only moves when its button is pressed, never at load. Under reduced motion each
   demo is set to its end state at load and its button reads Replay; pressing it runs the same steps
   with nothing sliding. The turn reuses the light and dark switch's keyframes (page-out, page-in in
   kit.css); under reduced motion the card simply shows its other side.

   Screen readers: the demo's own changes are visual; one sentence in the card's role="status" says
   what happened once a run finishes. */
import { ui } from './kit.js';
var reduce = ui.reduce;

var $ = function (a, r) {
  return r.querySelector(a);
};
var $$ = function (a, r) {
  return [].slice.call(r.querySelectorAll(a));
};
var wait = function (ms) {
  return new Promise(function (go) {
    setTimeout(go, reduce ? Math.min(ms, 120) : ms);
  });
};
/* A small rise as something new lands in place. Transform only, so nothing is ever hidden. */
var land = function (el) {
  if (reduce || !el.animate) return;
  el.animate(
    [
      { transform: 'translateY(8px) scale(.94)', opacity: 0.4 },
      { transform: 'none', opacity: 1 },
    ],
    { duration: 420, easing: 'cubic-bezier(.3,1.5,.5,1)' },
  );
};
var drop = function (el) {
  if (reduce || !el.animate) return;
  el.animate(
    [{ transform: 'translateY(-130%)' }, { transform: 'translateY(6%)' }, { transform: 'none' }],
    { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)' },
  );
};

/* ---- The rota: gaps fill one after another, one swap pings, the gap count drops. ---- */
function rota(card) {
  var count = $('[data-lab-count]', card),
    word = $('[data-lab-word]', card),
    ping = $('[data-lab-ping]', card),
    swap = $('[data-lab-swap]', card),
    fills = $$('[data-lab-fill]', card),
    total = fills.length + $$('[data-lab-open]', card).length;
  var setCount = function (n) {
    count.textContent = n;
    word.textContent = n === 1 ? 'gap' : 'gaps';
  };
  var reset = function () {
    fills.forEach(function (td) {
      td.classList.add('gap');
      td.classList.remove('got');
      $('.lr-n', td).textContent = 'Gap';
    });
    $('.lr-n', swap).textContent = swap.dataset.labWas;
    swap.classList.remove('got');
    ping.hidden = true;
    setCount(total);
  };
  var fill = function (td) {
    td.classList.remove('gap');
    td.classList.add('got');
    $('.lr-n', td).textContent = td.dataset.labFill;
  };
  return {
    reset: reset,
    end: function () {
      fills.forEach(fill);
      $('.lr-n', swap).textContent = swap.dataset.labSwap;
      swap.classList.add('got');
      ping.hidden = false;
      setCount(total - fills.length);
    },
    run: async function () {
      reset();
      await wait(250);
      for (var i = 0; i < fills.length; i++) {
        fill(fills[i]);
        land($('.lr-n', fills[i]));
        setCount(total - i - 1);
        await wait(260);
      }
      $('.lr-n', swap).textContent = swap.dataset.labSwap;
      swap.classList.add('got');
      land($('.lr-n', swap));
      ping.hidden = false;
      land(ping);
    },
    said: 'Filled 5 gaps and sent 1 swap. One gap is left with nobody free, so the rota asks the team for help.',
  };
}

/* ---- The site check: a sweep turns each dot green, one goes amber, an alert drops in, it recovers. ---- */
function status(card) {
  var sites = $$('[data-lab-site]', card),
    alert = $('[data-lab-alert]', card),
    alertT = $('[data-lab-alert-t]', card),
    down = $('[data-lab-down]', card),
    name = $('.ls-name', down).textContent;
  var mark = function (li, state, words) {
    li.classList.remove('up', 'down');
    if (state) li.classList.add(state);
    $('[data-lab-st]', li).textContent = words;
  };
  var reset = function () {
    sites.forEach(function (li) {
      mark(li, '', 'Not checked');
    });
    alert.classList.remove('on');
    alertT.textContent = 'No alerts';
  };
  return {
    reset: reset,
    end: function () {
      sites.forEach(function (li) {
        mark(li, 'up', 'Up');
      });
      alertT.textContent = name + ': back up after 4 minutes';
      alert.classList.add('on');
    },
    run: async function () {
      reset();
      await wait(200);
      for (var i = 0; i < sites.length; i++) {
        var li = sites[i];
        if (li === down) mark(li, 'down', 'Down');
        else mark(li, 'up', 'Up');
        await wait(150);
      }
      alertT.textContent = name + ' is down';
      alert.classList.add('on');
      drop(alert);
      await wait(1500);
      mark(down, 'up', 'Up');
      alertT.textContent = name + ': back up after 4 minutes';
      land(alertT);
    },
    said:
      'Checked 8 sites. ' +
      name +
      ' went down, my phone got an alert, and it was back up after 4 minutes.',
  };
}

/* ---- The desk console: the meter drains and fills again, the lines come back in. ---- */
function deskConsole(card) {
  var bar = $('[data-lab-meter]', card),
    pct = $('[data-lab-pct]', card),
    to = parseFloat(bar.style.getPropertyValue('--v')) || 0,
    lines = $$('[data-lab-lines] > *', card);
  var set = function (v) {
    bar.style.setProperty('--v', v.toFixed(3));
    pct.textContent = Math.round(v * 100);
  };
  return {
    reset: function () {
      set(to);
    },
    end: function () {
      set(to);
    },
    run: async function () {
      if (reduce) {
        set(to);
        return;
      }
      /* The meter on a spring, so it overshoots a touch and settles like the rest of the site. */
      var s = ui.spring(90, 13, 0),
        last = performance.now();
      set(0);
      lines.forEach(function (el, i) {
        setTimeout(
          function () {
            land(el);
          },
          120 + i * 90,
        );
      });
      await new Promise(function (done) {
        var frame = function (now) {
          var dt = Math.min(0.032, (now - last) / 1000);
          last = now;
          var moving = s.step(to, dt);
          set(Math.max(0, Math.min(1, s.x)));
          if (moving) requestAnimationFrame(frame);
          else {
            set(to);
            done();
          }
        };
        requestAnimationFrame(frame);
      });
    },
    said: 'Refreshed: 62 percent of this week used, two things next on the calendar, and Ben, Ivy and Gus on this Sunday.',
  };
}

var KINDS = { rota: rota, status: status, console: deskConsole };

/* ---- Turning the card over. ---- */
function turn(card, toBack) {
  var show = function () {
    card.dataset.side = toBack ? 'back' : 'front';
    var face = $('[data-lab-face="' + card.dataset.side + '"]', card);
    var btn = $('[data-lab-turn]', face);
    if (btn) btn.focus({ preventScroll: true });
  };
  if (reduce || !card.animate) {
    show();
    return;
  }
  /* A press while the card is still turning is kept and runs once it lands, so a quick Enter on
     the button that just took focus is never lost. */
  if (card.dataset.turning) {
    card.dataset.queued = '1';
    return;
  }
  card.dataset.turning = '1';
  /* The page-out and page-in keyframes from kit.css (the theme switch's turn), on the card. */
  var after = function (then) {
    var on = function (e) {
      if (e.target !== card) return;
      card.removeEventListener('animationend', on);
      then();
    };
    card.addEventListener('animationend', on);
  };
  card.style.animation = 'page-out .3s cubic-bezier(.55,0,.9,.5) both';
  after(function () {
    show();
    card.style.animation = 'page-in .72s linear both';
    after(function () {
      card.style.animation = '';
      delete card.dataset.turning;
      if (card.dataset.queued) {
        delete card.dataset.queued;
        turn(card, card.dataset.side !== 'back');
      }
    });
  });
}

[].forEach.call(document.querySelectorAll('[data-lab]'), function (card) {
  var make = KINDS[card.dataset.lab];
  if (!make) return;
  var demo = make(card),
    run = $('[data-lab-run]', card),
    say = $('[data-lab-say]', card),
    busy = false;

  if (reduce) {
    demo.end();
    run.textContent = 'Replay';
  }

  run.addEventListener('click', async function () {
    if (busy) return;
    busy = true;
    run.setAttribute('aria-disabled', 'true');
    say.textContent = '';
    try {
      await demo.run();
    } finally {
      busy = false;
      run.removeAttribute('aria-disabled');
      run.textContent = 'Replay';
      say.textContent = demo.said;
    }
  });

  $$('[data-lab-turn]', card).forEach(function (b) {
    b.addEventListener('click', function () {
      turn(card, card.dataset.side !== 'back');
    });
  });
});
