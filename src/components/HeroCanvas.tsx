/* ============================================================================
   HeroCanvas  (deferred loader)
   ============================================================================
   Foundation, edit with care.

   A tiny wrapper that decides WHETHER and WHEN to load the WebGL hero
   background. The heavy Three.js shader lives in HeroCanvasInner.tsx and is
   pulled in with a dynamic import, so its ~235KB chunk is code-split out of the
   initial bundle and only fetched once the browser is idle (after the hero has
   painted). The CSS .bg-aurora in Hero.astro shows until then, so the deferral
   is invisible: the flow simply fades in a beat after the headline.

   Why this matters: hydrated with client:only="react", the OLD single-file
   HeroCanvas shipped all of Three.js on first load, where it competed with the
   LCP headline for the main thread. Splitting it and waiting for idle pulls it
   off the critical path entirely.

   It never loads the heavy chunk at all when it would not be used:
     - prefers-reduced-motion: reduce  -> nothing loads (the static aurora shows)
     - no WebGL support                -> nothing loads (aurora shows)
   ============================================================================ */

import { lazy, Suspense, useEffect, useState } from 'react';

// Code-split: this import becomes its own chunk, fetched only when <Inner /> is
// actually rendered (i.e. after the idle defer below), never on first paint.
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

    // Defer the heavy chunk until the browser is idle, so it lands after the
    // hero has painted. requestIdleCallback where available, a short timeout as
    // the fallback (Safari). The timeout option caps the wait on a busy thread.
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const start = () => setShow(true);

    if ('requestIdleCallback' in window) {
      idleId = (window as Window & {
        requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
      }).requestIdleCallback(start, { timeout: 2500 });
    } else {
      timeoutId = setTimeout(start, 1200);
    }

    return () => {
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
