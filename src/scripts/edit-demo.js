/* Home, "Your team edits it. Try it." (src/components/home/EditDemo.astro, home.css).
   A made-up organization's home page in a phone, and a small editor that changes it. Nothing
   here is saved or sent: every control only rewrites the preview beside it.

   - Headline and hours: the preview's words follow each keystroke, with a small spring on the
     line that changed.
   - Photo: the three pictures are already stacked in the preview; the chosen one comes forward.
   - Events band: a real switch folds the band away (CSS grid rows, home.css).
   - Publish presses the rubber stamp onto the preview (stamp.css, the same press as /contact)
     and plays ui.cue('stamp') as it lands. Any change after that lifts the stamp again.
   - Reset puts every field back to what the HTML shipped with.

   A polite live region says "Preview updated" a moment after the typing stops, so a screen
   reader hears that something changed without hearing every letter. Under reduced motion
   nothing springs: the words, the picture and the stamp are simply set. */
import { ui } from './kit.js';

var reduce = ui.reduce;

[].forEach.call(document.querySelectorAll('[data-edit]'), function (root) {
  var q = function (s) {
      return root.querySelector(s);
    },
    form = q('[data-ed-form]'),
    fields = q('[data-ed-fields]'),
    headline = q('[data-ed-headline]'),
    hours = q('[data-ed-hours]'),
    radios = [].slice.call(root.querySelectorAll('[data-ed-photo]')),
    events = q('[data-ed-events]'),
    reset = q('[data-ed-reset]'),
    state = q('[data-ed-state]'),
    note = q('[data-ed-note]'),
    outHeadline = q('[data-ed-out-headline]'),
    outHours = q('[data-ed-out-hours]'),
    shots = [].slice.call(root.querySelectorAll('[data-ed-shots] img')),
    band = q('[data-ed-band]'),
    stamp = q('[data-ed-stamp]');
  if (!form || !fields || !headline || !hours || !events || !stamp) return;

  var START = { headline: root.dataset.headline || '', hours: root.dataset.hours || '' };

  /* The controls ship disabled so that, with no script, nobody presses a button that does
     nothing. This is the script, so they are live now. */
  fields.disabled = false;
  root.classList.add('ed-live');

  /* A small spring on the thing that just changed: it dips to `from` and comes back to rest. One
     loop an element, restarted if it is hit again while still moving. */
  var pops = new Map();
  function pop(el, from) {
    if (reduce || !el) return;
    var p = pops.get(el);
    if (!p) {
      p = { s: ui.spring(260, 15, 1), raf: 0, last: 0 };
      pops.set(el, p);
    }
    p.s.x = from;
    p.s.v = 0;
    if (p.raf) return;
    p.last = 0;
    p.raf = requestAnimationFrame(function frame(now) {
      var dt = Math.min(0.033, p.last ? (now - p.last) / 1000 : 0.016);
      p.last = now;
      if (p.s.step(1, dt)) {
        el.style.transform =
          'translateY(' + ((1 - p.s.x) * 14).toFixed(2) + 'px) scale(' + p.s.x.toFixed(4) + ')';
        p.raf = requestAnimationFrame(frame);
      } else {
        el.style.transform = '';
        p.raf = 0;
      }
    });
  }

  /* The live region. Cleared first, so the same words are read out again the next time. */
  var noteT = 0;
  function say(text, wait) {
    clearTimeout(noteT);
    noteT = setTimeout(function () {
      note.textContent = '';
      requestAnimationFrame(function () {
        note.textContent = text;
      });
    }, wait || 0);
  }

  /* Draft or Published. A change after Publish makes it a draft again and lifts the stamp. */
  var published = false;
  function setState(pub) {
    published = pub;
    state.textContent = pub ? 'Published' : 'Draft';
    root.classList.toggle('ed-pub', pub);
    if (!pub) {
      stamp.hidden = true;
      stamp.classList.remove('inked');
      stamp.style.transform = '';
      stamp.style.opacity = '';
    }
  }
  function touched() {
    if (published) setState(false);
    say('Preview updated', 650);
  }

  /* An empty field leaves a blank line, not a collapsed one, so the page does not jump. */
  function text(el, v) {
    el.textContent = v.trim() ? v : ' ';
  }
  function showPhoto(i, spring) {
    shots.forEach(function (img, n) {
      var on = n === i;
      img.classList.toggle('on', on);
      /* Only the picture you can see is described. */
      img.alt = on ? img.dataset.alt || '' : '';
      if (on && spring) pop(img, 1.07);
    });
  }
  function showBand(on) {
    band.classList.toggle('off', !on);
    band.setAttribute('aria-hidden', String(!on));
  }

  /* The text fields are one-line textareas (so a long line can wrap on a phone). Enter publishes,
     as it would in a one-line field, and a pasted line break becomes a space. */
  [headline, hours].forEach(function (f) {
    f.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.isComposing) return;
      e.preventDefault();
      if (form.requestSubmit) form.requestSubmit();
      else form.dispatchEvent(new Event('submit', { cancelable: true }));
    });
    f.addEventListener('input', function () {
      if (/[\r\n]/.test(f.value)) f.value = f.value.replace(/[\r\n]+/g, ' ');
    });
  });

  headline.addEventListener('input', function () {
    text(outHeadline, headline.value);
    pop(outHeadline, 0.96);
    touched();
  });
  hours.addEventListener('input', function () {
    text(outHours, hours.value);
    pop(outHours.parentNode, 0.96);
    touched();
  });
  radios.forEach(function (r, i) {
    r.addEventListener('change', function () {
      if (!r.checked) return;
      showPhoto(i, true);
      ui.cue('tick');
      touched();
    });
  });
  events.addEventListener('change', function () {
    showBand(events.checked);
    ui.cue('toggle');
    touched();
  });

  /* Publish: the stamp comes down onto the preview. The same press as the "Received" stamp on
     /contact: it starts large and turned, lands on a spring, and the ink spreads once. */
  function press() {
    stamp.hidden = false;
    stamp.classList.remove('inked');
    if (reduce) return;
    var s = ui.spring(230, 13, 0),
      last = 0,
      landed = false;
    stamp.style.opacity = '0';
    requestAnimationFrame(function frame(now) {
      /* Reset or an edit took the stamp away mid-press. */
      if (stamp.hidden) return;
      var dt = Math.min(0.033, last ? (now - last) / 1000 : 0.016);
      last = now;
      var going = s.step(1, dt),
        p = s.x;
      stamp.style.transform =
        'rotate(' + (-16 + 8 * p).toFixed(2) + 'deg) scale(' + (1.6 - 0.6 * p).toFixed(3) + ')';
      stamp.style.opacity = String(Math.min(1, 0.15 + p * 1.7));
      if (!landed && p >= 0.98) {
        landed = true;
        ui.cue('stamp');
        stamp.classList.add('inked');
      }
      if (going) requestAnimationFrame(frame);
      else {
        stamp.style.transform = '';
        stamp.style.opacity = '';
      }
    });
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearTimeout(noteT);
    setState(true);
    press();
    if (reduce) ui.cue('stamp');
    say('Published. This is a demo, so nothing was saved.');
  });

  reset.addEventListener('click', function () {
    headline.value = START.headline;
    hours.value = START.hours;
    radios.forEach(function (r, i) {
      r.checked = i === 0;
    });
    events.checked = true;
    text(outHeadline, START.headline);
    text(outHours, START.hours);
    showPhoto(0, false);
    showBand(true);
    setState(false);
    say('Reset. The demo is back to how it started.');
  });

  /* A reload or Back can restore what was typed into the fields. Start from the fields, so the
     preview never disagrees with the editor. */
  text(outHeadline, headline.value);
  text(outHours, hours.value);
  var picked = radios.findIndex(function (r) {
    return r.checked;
  });
  showPhoto(picked < 0 ? 0 : picked, false);
  showBand(events.checked);
});
