/* ============================================================================
   Motion controller (overhaul package 1.7)
   ============================================================================
   One shared place that decides whether anything on the page may move. It
   handles three jobs:

   1. Loops. Anything that repeats (the hero reel, the ticker, the footer's
      status dot, the About status dot) opts in with data-motion="loop". A loop
      may only run when ALL of these hold:
        - it is on screen (an IntersectionObserver sets data-motion-offscreen
          on the element while it is out of view),
        - the tab is visible (data-motion-hidden on <html> while it is not),
        - the visitor has not asked for reduced motion,
        - the visitor has not pressed Pause motion (html[data-motion-paused]).
      CSS loops are stopped by one rule in globals.css (section 6) that sets
      animation-play-state: paused for those states. Script loops (the hero
      ticker) ask loopMayRun(el) on every tick instead.

   2. The Pause motion state. A persisted switch (WCAG 2.2.2), saved in
      localStorage under MOTION_KEY. The BaseLayout bootstrap reads the same key
      before first paint and sets html[data-motion-paused], so a visitor who
      paused never sees a frame of motion on the next page or the next visit.
      Every [data-motion-toggle] button (the footer switch, the hero's Pause
      button) sets and reflects the same state through aria-pressed.

   3. Reveals. They are scroll-driven CSS where the browser supports
      animation-timeline: view() (globals.css section 6); this file only marks
      the ones already on screen at load as done (.is-visible), so nothing
      waits part-faded for a scroll. Where scroll-driven CSS is unsupported it
      adds .is-visible with an IntersectionObserver instead.

   Registered on astro:page-load (fires on the first load and after every
   ClientRouter navigation), with per-element guards so nothing binds twice.
   Window-level listeners are added once.
   ============================================================================ */

/** localStorage key for the Pause motion switch. "paused" or absent. Keep in
    step with the inline bootstrap in BaseLayout.astro. */
export const MOTION_KEY = 'ncs-motion';

/** Fired on document whenever the paused state changes. */
export const MOTION_EVENT = 'ncs:motion';

const root = (): HTMLElement => document.documentElement;
const reduceQuery = (): MediaQueryList => window.matchMedia('(prefers-reduced-motion: reduce)');

/** True while the visitor has pressed Pause motion. */
export function isMotionPaused(): boolean {
  return root().hasAttribute('data-motion-paused');
}

/** True when the visitor's system asks for reduced motion. */
export function prefersReducedMotion(): boolean {
  return reduceQuery().matches;
}

/** Whether a loop may move right now. Script-driven loops call this on every
    tick; CSS loops get the same answer from the globals.css rule. */
export function loopMayRun(el: Element): boolean {
  return (
    !isMotionPaused() &&
    !prefersReducedMotion() &&
    !document.hidden &&
    !el.hasAttribute('data-motion-offscreen')
  );
}

/** Mirror the paused state onto every toggle on the page. */
function syncToggles(): void {
  const paused = String(isMotionPaused());
  document.querySelectorAll<HTMLElement>('[data-motion-toggle]').forEach((button) => {
    button.setAttribute('aria-pressed', paused);
  });
}

/** Set (and remember) the site-wide Pause motion state. */
export function setMotionPaused(paused: boolean): void {
  root().toggleAttribute('data-motion-paused', paused);
  try {
    if (paused) localStorage.setItem(MOTION_KEY, 'paused');
    else localStorage.removeItem(MOTION_KEY);
  } catch {
    /* Storage blocked (private mode): the state still holds for this page. */
  }
  syncToggles();
  document.dispatchEvent(new CustomEvent(MOTION_EVENT, { detail: { paused } }));
}

/** Re-apply the saved state. The BaseLayout bootstrap already does this before
    paint; this is a second line in case a swap dropped the attribute. */
function applySavedState(): void {
  let saved = false;
  try {
    saved = localStorage.getItem(MOTION_KEY) === 'paused';
  } catch {
    saved = isMotionPaused();
  }
  root().toggleAttribute('data-motion-paused', saved);
}

/* ---- Loops ----------------------------------------------------------------- */
let loopObserver: IntersectionObserver | null = null;

function initLoops(): void {
  const loops = document.querySelectorAll<HTMLElement>(
    '[data-motion="loop"]:not([data-motion-bound])',
  );
  if (!loops.length) return;
  if (!('IntersectionObserver' in window)) return;
  loopObserver ??= new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.toggleAttribute('data-motion-offscreen', !entry.isIntersecting);
    });
  });
  loops.forEach((el) => {
    el.dataset.motionBound = 'true';
    loopObserver!.observe(el);
  });
}

function syncTabVisibility(): void {
  root().toggleAttribute('data-motion-hidden', document.hidden);
}

/* ---- Toggles --------------------------------------------------------------- */
function initToggles(): void {
  document
    .querySelectorAll<HTMLButtonElement>('[data-motion-toggle]:not([data-motion-toggle-bound])')
    .forEach((button) => {
      button.dataset.motionToggleBound = 'true';
      button.addEventListener('click', () => setMotionPaused(!isMotionPaused()));
    });
  syncToggles();
}

/* ---- Reveal fallback ------------------------------------------------------- */
function initReveals(): void {
  const els = Array.from(document.querySelectorAll('[data-reveal]:not(.is-visible)'));
  if (!els.length) return;
  // Scroll-driven CSS handles reveals on its own where it is supported, with
  // one exception: an element already on screen when the page loads (one that
  // straddles the fold, or everything above it after a mid-page reload) would
  // sit part-faded until the visitor scrolled. That reads as a broken page and
  // fails colour contrast in Lighthouse (it did, on /photography, 2026-10-31).
  // So those are marked .is-visible at once, which globals.css shows in full.
  if (window.CSS?.supports?.('animation-timeline: view()')) {
    const fold = window.innerHeight;
    els.forEach((el) => {
      if (el.getBoundingClientRect().top < fold) el.classList.add('is-visible');
    });
    return;
  }
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  els.forEach((el) => io.observe(el));
}

/* ---- Boot ------------------------------------------------------------------ */
function onPageLoad(): void {
  applySavedState();
  syncTabVisibility();
  initLoops();
  initToggles();
  initReveals();
}

const flagged = window as unknown as { __ncsMotionBound?: boolean };
if (!flagged.__ncsMotionBound) {
  flagged.__ncsMotionBound = true;
  document.addEventListener('astro:page-load', onPageLoad);
  // ClientRouter copies the new page's <html> attributes over the old ones.
  // The inline bootstrap re-runs on swap too; this is the backstop.
  document.addEventListener('astro:after-swap', () => {
    applySavedState();
    syncTabVisibility();
  });
  document.addEventListener('visibilitychange', syncTabVisibility);
  // A system setting change mid-visit: tell script loops to re-check.
  reduceQuery().addEventListener?.('change', () =>
    document.dispatchEvent(new CustomEvent(MOTION_EVENT, { detail: { paused: isMotionPaused() } })),
  );
}
