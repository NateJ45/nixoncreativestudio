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


// Initial application on script load.
applyMotionPreference();

// Listen for preference changes. Most users won't toggle this mid-session,
// but it's free coverage for anyone who does.
const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
motionMediaQuery.addEventListener('change', applyMotionPreference);

export {};
