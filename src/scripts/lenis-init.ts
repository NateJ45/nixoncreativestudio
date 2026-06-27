/* ============================================================================
   Lenis smooth scroll
   ============================================================================
   Foundation, edit with care.

   Replaces the browser's native scroll with Lenis's velocity-based smooth
   scroll. This is the "buttery scroll" effect that ties marketing sites
   together with their motion design.

   Three guardrails:

     1. Honor prefers-reduced-motion. If the visitor has set the OS-level
        reduce-motion preference, Lenis never initializes; native scroll
        runs untouched. The listener at the bottom of the file picks up
        runtime preference changes too (e.g. system settings toggled in
        another window).

     2. Single instance. If the script is loaded twice (during View
        Transitions for example, or in the dev server during HMR), we
        early-return rather than spinning up two competing scroll
        controllers.

     3. requestAnimationFrame loop. Lenis needs a host loop to tick its
        easing; we run one rAF that calls lenis.raf(time) each frame.

   This file is loaded by BaseLayout.astro via a bare <script> tag that
   Astro bundles. Astro runs the script once on initial page load. View
   Transitions in Astro reuse the loaded modules, so the Lenis instance
   carries across client-side navigations without restart.
   ============================================================================ */

import Lenis from 'lenis';

// Augment the window type so __lenis can be set without any.
declare global {
  interface Window {
    __lenis?: Lenis;
    __lenisNavBound?: boolean;
  }
}


/**
 * Initialize Lenis with brand-friendly defaults.
 *
 * - lerp 0.1 gives a noticeable easing without feeling sluggish.
 * - smoothWheel true is what makes desktop wheel events ease through
 *   the rAF loop instead of jumping per-tick.
 * - duration 1.2s is the catch-up time the scroll easing takes to
 *   settle after a wheel event stops. Default is fine; stated for
 *   discoverability.
 *
 * Returns the new instance so the caller can attach the rAF loop.
 */
function startLenis(): Lenis {
  const lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
    duration: 1.2,
  });

  // rAF loop. Lenis's docs recommend this exact pattern. Each frame
  // hands the current high-resolution timestamp to lenis.raf, which
  // updates the scroll position based on velocity and easing.
  const tick = (time: number) => {
    lenis.raf(time);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  return lenis;
}


/**
 * Tear down a running Lenis instance.
 *
 * Lenis exposes .destroy() which cleans up its event listeners and
 * leaves the page scrolling natively again. We zero out the global
 * reference so the next start can recreate it cleanly.
 */
function stopLenis() {
  if (window.__lenis) {
    window.__lenis.destroy();
    window.__lenis = undefined;
  }
}


/**
 * Apply the right state based on the current prefers-reduced-motion
 * setting. Called on initial load AND when the preference changes.
 */
function applyMotionPreference() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    // User wants less motion; if Lenis is running, stop it.
    stopLenis();
    return;
  }

  // User is fine with motion. Start Lenis if not already running.
  if (!window.__lenis) {
    window.__lenis = startLenis();
  }
}


/* ----------------------------------------------------------------------------
   Navigation scroll behavior (Astro View Transitions + Lenis)
   ----------------------------------------------------------------------------
   Astro's ClientRouter sets the window scroll on each client-side navigation
   (the top for a new page, the saved position for back/forward), but Lenis keeps
   its own scroll target and only catches up a frame later, it resyncs to
   external scroll changes. Under real wheel momentum that one-frame gap lets
   Lenis re-apply the OLD target and fight the reset, so a forward navigation can
   fail to land at the top. And for back/forward Astro restores the position only
   AFTER the transition settles, so the page would otherwise flash the top first.

   So reset Lenis explicitly on each swap, deterministically:
     - back / forward (navigationType "traverse"): the saved position, read from
       Astro's own history.state.scrollY (already populated by astro:after-swap,
       whereas window.scrollY is not restored until later).
     - any other new navigation: the very top.

   A new navigation to a #hash is left alone, so Astro's own anchor handling
   lands on the target element (forcing a position at swap-time would be wrong
   anyway, since lazy images below the fold reflow the page afterward).

   Only acts when Lenis is running; under reduced motion (no Lenis) Astro's
   native scroll handling is left untouched. Registered once and survives View
   Transitions because this module is reused across client-side navigations. */
let lastNavType = 'push';

function initNavigationScroll(): void {
  if (window.__lenisNavBound) return;
  window.__lenisNavBound = true;

  // Captured before each swap so the after-swap handler knows the direction.
  document.addEventListener('astro:before-preparation', (event) => {
    lastNavType = (event as Event & { navigationType?: string }).navigationType ?? 'push';
  });

  document.addEventListener('astro:after-swap', () => {
    const lenis = window.__lenis;
    if (!lenis) return; // reduced motion: native scroll, Astro handles it

    if (lastNavType === 'traverse') {
      const saved =
        history.state && typeof history.state.scrollY === 'number' ? history.state.scrollY : 0;
      lenis.scrollTo(saved, { immediate: true, force: true });
      return;
    }

    // New navigation: a #hash keeps Astro's own anchor scroll; everything else
    // lands at the very top.
    if (location.hash) return;
    lenis.scrollTo(0, { immediate: true, force: true });
  });
}

// Initial application on script load.
applyMotionPreference();
initNavigationScroll();

// Listen for preference changes. Most users won't toggle this mid-session,
// but it's free coverage for anyone who does.
const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
motionMediaQuery.addEventListener('change', applyMotionPreference);

export {};
