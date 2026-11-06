(function () {
  var N = window.NCS, ui = N.ui, reduce = ui.reduce, doc = document;
  var $ = function (a, r) { return (r || doc).querySelector(a); };
  ui.words($('#ah'), 120);

  /* The quotes sit beside the window they are about. */
  [].forEach.call(doc.querySelectorAll('[data-say]'), function (el) {
    $('[data-t]', el).innerHTML = ui.tile(ui.bySlug(el.dataset.say), { lazy: true });
    ui.wireFootage(el);
  });

  /* A hand of clients behind the portrait: partly open at rest, wide under the pointer or a press. */
  var REST = .5, READ = .2;
  var slugs = ['stone-steps-50k', 'mas-monograms', 'first-baptist-muncie', 'theology-matters', 'presbyterian-academy'];
  var wins = $('[data-wins]'), stage = $('[data-stage]'), card = $('[data-card]'), slot = $('[data-slot]'), story = $('[data-story]');
  wins.innerHTML = slugs.map(function (s) { return ui.tile(ui.bySlug(s)); }).join('');
  var tiles = [].slice.call(wins.querySelectorAll('.tile'));
  var C = (tiles.length - 1) / 2;
  var st = tiles.map(function (el, i) {
    return { el: el, d: i - C, v: reduce ? REST : -.1 - Math.abs(i - C) * .12, vv: 0, hov: 0, lift: 0, liftv: 0 };
  });
  var W = 0, H = 0, pw = 400, tw = 200, stageW = 600, wide = true, storyEnd = 1;
  function layout() {
    W = innerWidth; H = innerHeight;
    wide = W > 960;
    /* On narrow screens the stage sits over a reserved slot in the text column. */
    if (!wide) stage.style.top = (slot.getBoundingClientRect().top - stage.parentNode.getBoundingClientRect().top) + 'px';
    else stage.style.top = '';
    pw = card.offsetWidth; tw = tiles[0].offsetWidth; stageW = stage.offsetWidth;
    storyEnd = story.getBoundingClientRect().bottom + scrollY;
    tiles.forEach(function (t, i) { t.style.zIndex = 10 - Math.round(Math.abs(st[i].d) * 2); });
    wake();
  }
  /* The spread stops inside the stage, so a window never reaches the text. */
  function pose(s, v) {
    var th = tw * 2.02, ad = Math.abs(s.d), rot = s.d * (2 + 9 * v);
    var r = 22 * Math.PI / 180, halfW = (tw / 2) * Math.cos(r) + (th / 2) * Math.sin(r);
    /* Ten spare pixels each side, for the spring's overshoot. */
    var base = pw * .06, per = Math.min(pw * .3, Math.max(base, (stageW / 2 - halfW - 10) / 2));
    return {
      x: s.d * (base + (per - base) * v),
      y: -pw * (.05 + .33 * v) * (1 - ad * ad * .11) + ad * pw * .02,
      r: rot,
    };
  }

  /* The portrait: tilts with the pointer, comes up when held, and springs home when let go. */
  var mk = function (v) { return { x: v, v: 0 }; };
  var c = { x: mk(0), y: mk(0), rx: mk(0), ry: mk(0), rz: mk(0), s: mk(1) };
  var held = false, hover = false, inStage = false, pressed = false, grab = null, gx = 0, gy = 0, tRx = 0, tRy = 0, vx = 0, lastX = 0, lastT = 0, focusOpen = 0;
  var band = function (d, max) { var a = Math.abs(d); return (d < 0 ? -1 : 1) * max * (1 - Math.exp(-a / max)); };

  var raf = 0, last = performance.now();
  function wake() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function go(sp, to, k, d, dt) {
    sp.v += (k * (to - sp.x) - d * sp.v) * dt; sp.x += sp.v * dt;
    if (Math.abs(to - sp.x) < .002 && Math.abs(sp.v) < .01) { sp.x = to; sp.v = 0; return false; }
    return true;
  }
  function frame(now) {
    raf = 0;
    var dt = Math.min(.033, (now - last) / 1000 || .016); last = now;
    var live = false, p;
    if (wide) p = scrollY / Math.max(240, (storyEnd - H) * .72);
    else p = (H * .86 - slot.getBoundingClientRect().top) / Math.max(200, H * .68);
    p = Math.min(1, Math.max(0, p));
    var open = focusOpen || (!reduce && (inStage || pressed || held));
    st.forEach(function (s) {
      var tgt = open ? 1 : reduce ? REST : REST + READ * Math.min(1, Math.max(0, (p - (C - Math.abs(s.d)) * .05) / .9));
      if (reduce) { s.v = tgt; s.vv = 0; }
      else {
        s.vv += (140 * (tgt - s.v) - 14 * s.vv) * dt; s.v += s.vv * dt;
        if (Math.abs(tgt - s.v) < .0006 && Math.abs(s.vv) < .004) { s.v = tgt; s.vv = 0; } else live = true;
      }
      var lt = s.hov ? 1 : 0;
      if (reduce) { s.lift = lt; s.liftv = 0; }
      else {
        s.liftv += (260 * (lt - s.lift) - 20 * s.liftv) * dt; s.lift += s.liftv * dt;
        if (Math.abs(lt - s.lift) > .001 || Math.abs(s.liftv) > .01) live = true; else { s.lift = lt; s.liftv = 0; }
      }
      var q = pose(s, s.v);
      s.el.style.zIndex = s.hov ? 15 : 10 - Math.round(Math.abs(s.d) * 2);
      s.el.style.transform = 'translate3d(' + q.x.toFixed(2) + 'px,' + (q.y - s.lift * pw * .05).toFixed(2) + 'px,0) rotate(' + q.r.toFixed(3) + 'deg) scale(' + (1 + s.lift * .02).toFixed(4) + ')';
    });
    if (!reduce) {
      /* Tight in the hand, soft when let go. */
      var k = held ? 420 : 105, d = held ? 34 : 9.5;
      var a = go(c.x, held ? gx : 0, k, d, dt), b = go(c.y, held ? gy : 0, k, d, dt);
      var e = go(c.rx, tRx, 170, 15, dt), f = go(c.ry, tRy, 170, 15, dt);
      vx *= Math.pow(.02, dt);
      var g = go(c.rz, held ? Math.max(-9, Math.min(9, vx * .012)) + c.x.x / pw * 6 : 0, 150, 11, dt);
      var h = go(c.s, held ? 1.045 : hover ? 1.012 : 1, 300, 20, dt);
      live = live || a || b || e || f || g || h || held;
      card.style.setProperty('--lift', Math.max(0, Math.min(1, (c.s.x - 1) / .045)).toFixed(3));
      card.style.transform = 'perspective(1100px) translate3d(' + c.x.x.toFixed(2) + 'px,' + c.y.x.toFixed(2) + 'px,0) rotateX(' + c.rx.x.toFixed(3) + 'deg) rotateY(' + c.ry.x.toFixed(3) + 'deg) rotate(' + c.rz.x.toFixed(3) + 'deg) scale(' + c.s.x.toFixed(4) + ')';
    }
    if (live) raf = requestAnimationFrame(frame);
  }

  if (!reduce) {
    /* The stage box stays put while the windows move, so the pointer can't make it flicker. */
    stage.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { inStage = true; wake(); } });
    stage.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { inStage = false; wake(); } });
    stage.addEventListener('pointerdown', function (e) { if (!e.button) { pressed = true; wake(); } });
    var letGo = function () { if (pressed) { pressed = false; wake(); } };
    addEventListener('pointerup', letGo);
    addEventListener('pointercancel', letGo);
    var tilt = function (e) {
      var r = card.getBoundingClientRect();
      var nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)), ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      tRy = nx * 9; tRx = -ny * 7;
    };
    card.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hover = true; wake(); } });
    card.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hover = false; if (!held) { tRx = tRy = 0; } wake(); } });
    card.addEventListener('pointermove', function (e) {
      if (held && e.pointerId === grab.id) {
        gx = band(e.clientX - grab.x, pw * .62); gy = band(e.clientY - grab.y, pw * .5);
        var t = performance.now();
        if (t > lastT) { vx = vx * .6 + ((e.clientX - lastX) / (t - lastT) * 1000) * .4; lastX = e.clientX; lastT = t; }
        tilt(e); wake();
      } else if (e.pointerType === 'mouse') { tilt(e); wake(); }
    });
    card.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      grab = { id: e.pointerId, x: e.clientX, y: e.clientY }; held = true; gx = gy = 0; lastX = e.clientX; lastT = performance.now(); vx = 0;
      card.classList.add('held');
      try { card.setPointerCapture(e.pointerId); } catch (err) {}
      if (e.pointerType === 'mouse') e.preventDefault();
      wake();
    });
    var drop = function (e) {
      if (!held || (grab && e.pointerId !== grab.id)) return;
      held = false; grab = null; card.classList.remove('held');
      if (!hover) { tRx = tRy = 0; }
      wake();
    };
    card.addEventListener('pointerup', drop);
    card.addEventListener('pointercancel', drop);
    card.addEventListener('lostpointercapture', drop);
  }

  st.forEach(function (s) {
    s.el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { s.hov = 1; ui.play(s.el, true); wake(); } });
    s.el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { s.hov = 0; ui.play(s.el, false); wake(); } });
    /* A window reached by keyboard opens the hand, so focus is never hidden behind the portrait. */
    s.el.addEventListener('focus', function () { if (s.el.matches(':focus-visible')) { s.hov = 1; focusOpen = 1; wake(); } });
    s.el.addEventListener('blur', function () { s.hov = 0; focusOpen = 0; wake(); });
  });

  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', layout);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(layout);
  addEventListener('load', layout);
  layout();
})();
