/* ============================================================================
   factDemo.ts | the "change one fact" demo on the homepage (FactDemo.astro)
   ============================================================================
   Safe to edit. Vanilla, no dependencies, about 1.8 KB gzipped. The pure parts
   (reading a typed time, printing it, the derived coffee time) live in
   src/lib/factDemo.ts with unit tests; this file only wires them to the band.

   The server HTML is already the before state (10:30 AM everywhere), so if
   this never runs the band still reads correctly; the controls are shown only
   under html.js, which BaseLayout sets in the head before the first paint.

   - Typing publishes once the typing pauses (650 ms for a time, 1.2 s for
     something that is not one yet), so "10:45" never flashes 1:00 PM.
     Enter, Update, a quick pick and leaving the field publish at once.
   - Not a time: the alert says nothing changed; every place keeps its time.
   - "Edit page by page": only the visit page's worship time changes, so the
     other places (and the visit page's own coffee time) keep the old one,
     struck through, and their wires are drawn cut.

   Registered on astro:page-load with a dataset re-bind guard (CLAUDE.md
   rule 11), so it survives view transitions and binds each band once.
   ============================================================================ */
import { START_MINUTES, coffeeFrom, formatTime, nudgedTime, parseTime } from '../lib/factDemo';

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

function bind(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>('[data-fd-form]');
  const input = root.querySelector<HTMLInputElement>('[data-fd-input]');
  const mode = root.querySelector<HTMLInputElement>('[data-fd-mode]');
  const hint = root.querySelector<HTMLElement>('[data-fd-hint]');
  const err = root.querySelector<HTMLElement>('[data-fd-err]');
  const status = root.querySelector<HTMLElement>('[data-fd-status]');
  const board = root.querySelector<HTMLElement>('[data-fd-places]');
  if (!form || !input || !mode || !hint || !err || !status || !board) return;

  const places = [...board.querySelectorAll<HTMLElement>('[data-fd-place]')];
  // A visually hidden note after each time, so a screen reader browsing the places hears
  // "(out of date)" where the eye sees a strike. Positioned out of the flow: no shift.
  board.querySelectorAll<HTMLElement>('[data-fd-v]').forEach((v) => {
    const sr = document.createElement('span');
    sr.className = 'fd-sr';
    v.after(sr);
  });
  const hintText = hint.textContent ?? '';
  const narrow = matchMedia('(max-width: 47.99rem)');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let current = START_MINUTES;
  let timer = 0;

  /** What a value should say now: the service time, or the coffee time worked out from it. */
  const wanted = (v: HTMLElement) =>
    formatTime(v.dataset.fdV === 'coffee' ? coffeeFrom(current) : current);

  /** Restart an element's one-shot animation (the marker swipe, the wire pulse). */
  function replay(el: Element, cls: string, delay: number): void {
    el.classList.remove(cls);
    (el as HTMLElement).style.setProperty('--fd-delay', `${delay}s`);
    void (el as HTMLElement).getBoundingClientRect();
    el.classList.add(cls);
  }

  function render(animate: boolean): void {
    const byPage = mode!.checked;
    let others = 0;
    let oldTime = '';
    board!.classList.toggle('is-cut', byPage);
    places.forEach((place, i) => {
      const isEdited = place.hasAttribute('data-fd-edit');
      const delay = 0.1 + i * 0.09;
      let stale = false;
      let changed = false;
      place.querySelectorAll<HTMLElement>('[data-fd-v]').forEach((v) => {
        const want = wanted(v);
        // One source: everything follows. Page by page: you typed into the visit page's
        // worship time, and nothing else.
        const reaches = !byPage || (isEdited && v.dataset.fdV === 'service');
        if (reaches && v.textContent !== want) {
          v.textContent = want;
          changed = true;
          if (animate) replay(v, 'is-fresh', byPage ? 0 : delay);
        }
        const wrong = v.textContent !== want;
        v.classList.toggle('is-stale', wrong);
        const sr = v.nextElementSibling;
        if (sr?.classList.contains('fd-sr')) sr.textContent = wrong ? ' (out of date)' : '';
        if (wrong) {
          v.classList.remove('is-fresh');
          stale = true;
        }
      });
      place.classList.toggle('is-stale', stale);
      if (stale && !isEdited) {
        others++;
        oldTime ||= place.querySelector('[data-fd-v="service"]')?.textContent ?? '';
      }
      board!.querySelectorAll(`[data-fd-wire="${place.dataset.fdPlace}"]`).forEach((w) => {
        w.classList.toggle('is-cut', byPage);
        if (animate && changed && !byPage) replay(w, 'is-live', delay);
      });
    });

    if (!byPage) {
      status!.textContent = `All six places say ${formatTime(current)}, and coffee moved to ${formatTime(coffeeFrom(current))} on its own.`;
    } else if (others) {
      const bad = document.createElement('span');
      bad.className = 'fd-bad';
      bad.textContent = `${NUMBER_WORDS[others] ?? others} other places still say ${oldTime}.`;
      status!.replaceChildren(
        'Only the visit page changed, and its coffee time is now wrong. ',
        bad,
      );
    } else {
      status!.textContent = 'Page by page: change the time and see what gets missed.';
    }
  }

  function clearError(): void {
    err!.textContent = '';
    err!.parentElement?.classList.remove('has-error');
    input!.removeAttribute('aria-invalid');
  }

  /** Publish what is in the field, or refuse it. Returns whether it was a time. */
  function publish(): boolean {
    const typed = input!.value.trim();
    const minutes = parseTime(typed);
    if (minutes === null) {
      const shown = typed.length > 18 ? `${typed.slice(0, 18)}...` : typed;
      err!.textContent = typed
        ? `“${shown}” isn’t a time, so nothing changed. Try 9:30 or 11 AM.`
        : 'The field is empty, so nothing changed. Try 9:30 or 11 AM.';
      err!.parentElement?.classList.add('has-error');
      input!.setAttribute('aria-invalid', 'true');
      return false;
    }
    clearError();
    if (minutes !== current) {
      current = minutes;
      render(true);
    }
    return true;
  }

  /** Publish now, tidy the field, and on a phone bring the places into view. */
  function commit(): void {
    window.clearTimeout(timer);
    if (!publish()) return;
    input!.value = formatTime(current);
    if (narrow.matches && document.activeElement !== input) {
      board!.scrollIntoView({ block: 'nearest', behavior: still.matches ? 'auto' : 'smooth' });
    }
  }

  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    const delay = parseTime(input.value) === null ? 1200 : 650;
    timer = window.setTimeout(publish, delay);
  });
  input.addEventListener('blur', () => {
    if (parseTime(input.value) !== null) commit();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    commit();
  });
  root.querySelectorAll<HTMLButtonElement>('[data-fd-pick]').forEach((b) =>
    b.addEventListener('click', () => {
      input.value = b.dataset.fdPick ?? '';
      commit();
    }),
  );
  mode.addEventListener('change', () => {
    window.clearTimeout(timer);
    clearError();
    if (mode.checked) {
      hint.textContent = 'Page by page: this changes the visit page only.';
      // Make one edit straight away, so the drift is visible the moment you switch.
      current = nudgedTime(current);
      input.value = formatTime(current);
    } else {
      hint.textContent = hintText;
    }
    render(true);
    if (narrow.matches) {
      board.scrollIntoView({ block: 'nearest', behavior: still.matches ? 'auto' : 'smooth' });
    }
  });
}

function init(): void {
  document
    .querySelectorAll<HTMLElement>('[data-fact-demo]:not([data-fd-bound])')
    .forEach((root) => {
      root.dataset.fdBound = 'true';
      bind(root);
    });
}

document.addEventListener('astro:page-load', init);
