/* Sound, off until asked. Tiny synthesised cues for the moments that already move: a card dealt, the
   dock's puck landing, a card turning over, the receipt printing, the stamp. Web Audio only, no
   files and no library, so sound costs a page nothing until someone switches it on.

   The rules:
   - OFF by default. The switch (src/components/SoundSwitch.astro) says "Sound off" or "Sound on",
     and the choice is kept on the device (localStorage, `ncs-sound`).
   - The AudioContext is made on the click that turns sound on. On a later page, with sound already
     chosen, it is made on that page's first press or key, never before: a browser will not let a
     page make noise until then anyway.
   - Sound only ever plays because the visitor switched it on themselves, so reduced motion needs
     no second rule for it. Haptics are different: they can fire with sound off (a touch on
     Android), so they never run under reduced motion.
   - Every cue is quiet and short (under 150ms; `print` is a run of ticks under 500ms), goes
     through one shared gain capped low, and is detuned a few percent at random so a repeat does
     not grate.

   `cue(name)` is always safe to call: with sound off it does nothing. It is also installed as
   `ui.cue`, which is how page scripts reach it. An optional second argument delays the cue by so
   many seconds, for a thing that lands a moment after the call that starts it moving. */
import { ui } from './kit.js';

var KEY = 'ncs-sound';
/* The whole site's volume. Each cue sets its own level under this. */
var MASTER = 0.16;
var reduce = matchMedia('(prefers-reduced-motion: reduce)');
var android = /Android/i.test(navigator.userAgent) && typeof navigator.vibrate === 'function';
var Ctx = window.AudioContext || window.webkitAudioContext;

var on = false;
try {
  on = localStorage.getItem(KEY) === 'on';
} catch (e) {
  /* Private mode or storage blocked: sound simply starts off on every page. */
}

var ctx = null,
  out = null,
  noiseBuf = null;

/* Was the last press a finger? A haptic is only right for a touch, or for someone who asked for
   sound. Listening for presses costs nothing and makes no noise. */
var lastTouch = 0;
addEventListener(
  'pointerdown',
  function (e) {
    if (e.pointerType === 'touch') lastTouch = performance.now();
    wake();
  },
  { capture: true, passive: true },
);
addEventListener('keydown', wake, { capture: true, passive: true });

/* Make the context, if sound is on and there is not one yet. Called from a press, a key, or the
   switch itself, so the browser allows it. */
function wake() {
  if (!on || !Ctx) return;
  if (!ctx) {
    try {
      ctx = new Ctx();
    } catch (e) {
      ctx = null;
      return;
    }
    out = ctx.createGain();
    out.gain.value = MASTER;
    out.connect(ctx.destination);
    /* Half a second of white noise, made once: the paper in a flick, a turn and a thud. */
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(function () {});
}

/* A few percent either way, so the same cue twice is never the same sound twice. */
function near(v, by) {
  return v * (1 + (Math.random() * 2 - 1) * (by || 0.04));
}

/* A short tone: from `f0` to `f1` hertz over `len` seconds, at `vol`, starting at `t`. */
function tone(t, type, f0, f1, len, vol) {
  var o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(near(f0), t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(near(f1), t + len);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + len + 0.02);
}

/* A short breath of filtered noise: a band around `f0` sliding to `f1`. */
function hiss(t, kind, f0, f1, q, len, vol) {
  var s = ctx.createBufferSource(),
    f = ctx.createBiquadFilter(),
    g = ctx.createGain();
  s.buffer = noiseBuf;
  f.type = kind;
  f.Q.value = q;
  f.frequency.setValueAtTime(near(f0, 0.08), t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(near(f1, 0.08), t + len);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(f).connect(g).connect(out);
  /* Start somewhere different in the noise each time. */
  s.start(t, Math.random() * 0.3, len + 0.02);
}

/* The cues. Each takes the time it should start at. */
var CUES = {
  /* A soft card flick: paper sliding off the deck. */
  deal: function (t) {
    hiss(t, 'bandpass', 2600, 900, 0.9, 0.07, 0.5);
  },
  /* The dock's puck, a chip: one small click. */
  tick: function (t) {
    tone(t, 'triangle', 1500, 1100, 0.03, 0.22);
    hiss(t, 'highpass', 4200, 4200, 0.7, 0.014, 0.18);
  },
  /* A card turning over: the air it moves, then it lands. */
  turn: function (t) {
    hiss(t, 'bandpass', 500, 1900, 1.1, 0.1, 0.34);
    tone(t + 0.1, 'triangle', 320, 210, 0.035, 0.2);
  },
  /* The receipt feeding out: a short run of ticks, like a till. */
  print: function (t) {
    for (var i = 0; i < 7; i++) {
      hiss(t + i * 0.058, 'bandpass', 3100, 2500, 3, 0.022, i % 2 ? 0.26 : 0.36);
    }
  },
  /* The rubber stamp: a low thud with a little paper in it. */
  stamp: function (t) {
    tone(t, 'sine', 120, 46, 0.13, 0.95);
    hiss(t, 'lowpass', 700, 240, 0.7, 0.07, 0.4);
  },
  /* A switch: two small notes, up. */
  toggle: function (t) {
    tone(t, 'sine', 620, 620, 0.045, 0.2);
    tone(t + 0.05, 'sine', 930, 930, 0.06, 0.2);
  },
  /* Something opening: a soft rise. Closing is the same, falling. */
  open: function (t) {
    tone(t, 'sine', 380, 640, 0.11, 0.2);
    hiss(t, 'bandpass', 1200, 2400, 1, 0.08, 0.1);
  },
  close: function (t) {
    tone(t, 'sine', 600, 340, 0.11, 0.18);
    hiss(t, 'bandpass', 2200, 1000, 1, 0.08, 0.09);
  },
};
/* The cues a hand can feel, and for how many milliseconds. */
var BUZZ = { tick: 6, turn: 10, stamp: 16 };

/* The same cue twice within a breath plays once: two springs landing together, or a hover racing
   along the dock. */
var lastAt = {};

export function cue(name, delay) {
  var now = performance.now();
  if (lastAt[name] && now - lastAt[name] < 45) return;
  lastAt[name] = now;
  /* A short buzz on Android: only for someone who has sound on, or whose finger just did this,
     and never under reduced motion. */
  if (android && BUZZ[name] && !reduce.matches && (on || now - lastTouch < 900)) {
    var ms = BUZZ[name];
    setTimeout(
      function () {
        try {
          navigator.vibrate(ms);
        } catch (e) {
          /* Not allowed here (an iframe, a browser setting): nothing to do. */
        }
      },
      (delay || 0) * 1000,
    );
  }
  /* No context yet means no press or key yet on this page: stay silent rather than ask the
     browser for one it would refuse (a hover along the dock is not a gesture). */
  if (!on || !CUES[name] || !ctx || ctx.state !== 'running') return;
  CUES[name](ctx.currentTime + (delay || 0) + 0.005);
}

/* Is sound on? The palette reads this for its row. */
export function soundOn() {
  return on;
}

/* Turn sound on or off. Called from a click, so the context can be made here. Every switch on the
   page is told, and turning it on plays one cue so the visitor hears what they asked for. */
export function setSound(next) {
  on = !!next && !!Ctx;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch (e) {
    /* Not kept: it still works for this page. */
  }
  paint();
  if (on) {
    wake();
    /* resume() is a promise, so the first cue waits a moment for the context to be running. */
    setTimeout(function () {
      lastAt.toggle = 0;
      cue('toggle');
    }, 60);
  } else if (ctx) {
    ctx.suspend().catch(function () {});
  }
}

/* Every switch says the same thing: aria-pressed for a screen reader, and CSS shows "Sound on" or
   "Sound off" from it (both labels are in the markup, like the light and dark switch). */
var switches = [].slice.call(document.querySelectorAll('[data-sound]'));
function paint() {
  switches.forEach(function (b) {
    b.setAttribute('aria-pressed', String(on));
  });
}
switches.forEach(function (b) {
  /* A browser with no Web Audio gets no switch. */
  if (!Ctx) {
    b.hidden = true;
    return;
  }
  b.addEventListener('click', function () {
    setSound(!on);
  });
});
paint();

/* Page scripts call ui.cue(). kit.js may define a do-nothing one first; this is the real one. */
if (ui) ui.cue = cue;
