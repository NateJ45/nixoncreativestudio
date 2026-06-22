/* ============================================================================
   HeroCanvas  (deferred, desktop-only loader)
   ============================================================================
   Foundation, edit with care.

   A tiny wrapper that decides WHETHER and WHEN to load the WebGL hero
   background. The heavy Three.js shader lives in HeroCanvasInner.tsx and is
   pulled in with a dynamic import, so its ~235KB chunk is code-split out of the
   initial bundle. The CSS .bg-aurora in Hero.astro (a drifting layered gradient
   of the same brand colors) is always present underneath, so whenever the WebGL
   is skipped or still loading, the background still reads as the same on-brand
   flow, just lighter.

   It only ever loads the heavy chunk when ALL of these hold, otherwise the
   aurora carries the hero on its own:
     - viewport >= 1024px (desktop)    -> phones/tablets get the aurora. Mobile
       is where the performance score is measured and where the GPU + main-thread
       cost hurts most, and the shader's cursor bloom needs a fine pointer
       anyway. This matches the `lg` breakpoint where the device showcase appears.
     - prefers-reduced-motion: no      -> the static aurora shows
     - WebGL supported                 -> the aurora shows otherwise

   When it does load, it waits for the browser to be idle (requestIdleCallback)
   so the chunk lands AFTER the hero headline has painted, keeping ~235KB and
   the Three.js startup off the LCP path.
   ============================================================================ */

import { lazy, Suspense, useEffect, useState } from 'react';

// Code-split: this import becomes its own chunk, fetched only when <Inner /> is
// actually rendered (i.e. after the idle defer below), never on first paint and
// never on mobile.
const Inner = lazy(() => import('./HeroCanvasInner'));

export default function HeroCanvas() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Respect reduced motion: never load Three.js, let the CSS aurora carry it.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Bail (and skip the download) if WebGL is not available.
    try {
      const probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return;
    } catch {
      return;
    }

    // Desktop only. Below 1024px the aurora is the whole background.
    const desktop = window.matchMedia('(min-width: 1024px)');

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let scheduled = false;

    // Defer the heavy chunk until the browser is idle, so it lands after the
    // hero has painted. requestIdleCallback where available, a short timeout as
    // the fallback (Safari). The timeout option caps the wait on a busy thread.
    const scheduleLoad = () => {
      if (scheduled) return;
      scheduled = true;
      const start = () => setShow(true);
      if ('requestIdleCallback' in window) {
        idleId = (window as Window & {
          requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
        }).requestIdleCallback(start, { timeout: 2500 });
      } else {
        timeoutId = setTimeout(start, 1200);
      }
    };

    // Load if it grows to desktop width later (rotation, window resize).
    const onChange = () => {
      if (desktop.matches) {
        scheduleLoad();
        desktop.removeEventListener('change', onChange);
      }
    };

    if (desktop.matches) {
      scheduleLoad();
    } else {
      desktop.addEventListener('change', onChange);
    }

    return () => {
      desktop.removeEventListener('change', onChange);
      if (idleId !== undefined && 'cancelIdleCallback' in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  if (!show) return null;

  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
