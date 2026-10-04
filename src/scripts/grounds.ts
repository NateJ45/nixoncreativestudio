/* ============================================================================
   Grounds: deferred textures and offscreen pause
   ============================================================================
   Foundation, edit with care. Imported once by BaseLayout. Two jobs, both for
   the <Band> grounds in src/styles/globals.css (section 7):

   1. Deferred textures. A ground paints its colour token at once; its texture
      images (wall, window light, contours, ink board) attach only when <html>
      carries .grounds-ready. This adds that class after the window load event
      plus an idle beat, so the textures never compete with the LCP request on
      a slow phone (the d9 study measured about +0.2 s LCP when they loaded
      with the page). After a View Transitions navigation the load event has
      long fired, so the class goes straight back on (ClientRouter replaces the
      <html> attributes on every swap).

   2. Offscreen pause. Every Band with moving layers carries
      [data-ground-motion]. An IntersectionObserver adds .is-off while it is
      out of view, which pauses its animations (CSS: animation-play-state), so
      a ground only costs compositor time while someone can see it.

   Reduced motion needs nothing here: the animations are only declared inside
   prefers-reduced-motion: no-preference. Without JavaScript the grounds stay
   flat colour and never move, which is the designed fallback.
   ============================================================================ */

const READY = 'grounds-ready';

function whenIdle(fn: () => void): void {
  // Safari shipped requestIdleCallback late; fall back to a short timeout.
  if (typeof window.requestIdleCallback === 'function')
    window.requestIdleCallback(fn, { timeout: 1500 });
  else setTimeout(fn, 200);
}

function markReady(): void {
  document.documentElement.classList.add(READY);
}

function initTextures(): void {
  if (document.documentElement.classList.contains(READY)) return;
  if (document.readyState === 'complete') whenIdle(markReady);
  else window.addEventListener('load', () => whenIdle(markReady), { once: true });
}

let observer: IntersectionObserver | null = null;

function initPause(): void {
  if (!('IntersectionObserver' in window)) return;
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) entry.target.classList.toggle('is-off', !entry.isIntersecting);
    },
    { rootMargin: '80px 0px' },
  );
  document
    .querySelectorAll<HTMLElement>('[data-ground-motion]:not([data-ground-bound])')
    .forEach((el) => {
      el.dataset.groundBound = 'true';
      observer?.observe(el);
    });
}

document.addEventListener('astro:page-load', () => {
  initTextures();
  initPause();
});
