/* ============================================================================
   Step into the reel (overhaul 3.1, Part B section B)
   ============================================================================
   Clicking a card in the homepage hero reel turns that exact frame into the
   case study's stage: the frame untilts and lands as /work/{slug}/'s cover,
   while the rest of the reel lays down flat and fades.

   How it works:
   - The reel renders every card twice (the seamless loop), so the cards carry
     no view-transition-name in the markup. At click time the ONE clicked
     `.reel-frame` gets `cover-{slug}`, the name the study's `.cs-stage`
     carries through `transition:name` (src/pages/work/[slug].astro).
   - SelectedWork, further down the homepage, holds the same `cover-{slug}`
     name statically (for its own morph). Two elements with one name would
     abort the whole transition, so that holder is set to `none` for this
     navigation. The old page is thrown away by the swap anyway.
   - The reel stage gets `hero-reel`, so it leaves the page as its own layer.
     The lay-down and the slower morph timing are applied with the Web
     Animations API once the transition is ready, because the CSS for the
     pseudo-elements comes from the NEW page (the study), which knows nothing
     about the reel.
   - Names are cleared on astro:after-swap.

   Fallbacks: no View Transitions support means the router does a normal
   navigation and none of this runs. Under prefers-reduced-motion or while
   the visitor has paused motion (html[data-motion-paused]) no name is set
   and nothing animates: the study simply appears.
   ============================================================================ */

import { isMotionPaused, prefersReducedMotion } from './motion';

const REEL_NAME = 'hero-reel';

/** Elements this script named for the current navigation, with the value
    to restore (an empty string drops the inline style). */
let touched: Array<[HTMLElement, string]> = [];
/** The slug of the study the visitor stepped into, until the swap is done. */
let pendingSlug: string | null = null;

function clearNames(): void {
  touched.forEach(([el, previous]) => (el.style.viewTransitionName = previous));
  touched = [];
}

function setName(el: HTMLElement, name: string): void {
  touched.push([el, el.style.viewTransitionName]);
  el.style.viewTransitionName = name;
}

/** A motion token from globals.css in milliseconds, with a fallback. */
function token(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const ms = raw.endsWith('ms')
    ? parseFloat(raw)
    : raw.endsWith('s')
      ? parseFloat(raw) * 1000
      : NaN;
  return Number.isFinite(ms) ? ms : fallback;
}

function onClick(event: MouseEvent): void {
  // Only a plain left click becomes a soft navigation; let the browser have
  // new-tab and download clicks.
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  const card = (event.target as Element | null)?.closest?.<HTMLAnchorElement>('.reel-card');
  const slug = card?.dataset.slug;
  const frame = card?.querySelector<HTMLElement>('.reel-frame');
  const stage = card?.closest<HTMLElement>('.reel-stage');
  if (!card || !slug || !frame || !stage) return;
  if (!('startViewTransition' in document)) return;
  if (prefersReducedMotion() || isMotionPaused()) return;

  clearNames();
  const name = `cover-${slug}`;
  // Free the name from any other holder on this page (SelectedWork's frame).
  document.querySelectorAll<HTMLElement>('[data-astro-transition-scope]').forEach((el) => {
    if (getComputedStyle(el).viewTransitionName === name) setName(el, 'none');
  });
  setName(frame, name);
  setName(stage, REEL_NAME);
  pendingSlug = slug;
}

/** Once the pseudo-elements exist: slow the cover morph to a scene and lay
    the old reel down. Both are plain Web Animations on the pseudo-elements. */
function choreograph(transition: ViewTransition, slug: string): void {
  transition.ready
    .then(() => {
      // The visitor may have paused motion between click and swap.
      if (prefersReducedMotion() || isMotionPaused()) return;
      const root = document.documentElement;
      const scene = token('--dur-scene', 640);
      const settle = token('--dur-settle', 420);
      const easeSettle = 'cubic-bezier(0.22, 1, 0.36, 1)';
      const easeExit = 'cubic-bezier(0.55, 0, 1, 0.45)';

      const cover = `(cover-${slug})`;
      document.getAnimations().forEach((animation) => {
        const pseudo = (animation.effect as KeyframeEffect | null)?.pseudoElement ?? '';
        if (pseudo.endsWith(cover)) {
          animation.effect?.updateTiming({ duration: scene, easing: easeSettle });
        }
      });

      root.animate(
        [
          { transform: 'perspective(1400px) rotateX(0deg)', opacity: 1 },
          { transform: 'perspective(1400px) rotateX(62deg) translateY(12%)', opacity: 0 },
        ],
        {
          pseudoElement: `::view-transition-old(${REEL_NAME})`,
          duration: settle,
          easing: easeExit,
          fill: 'both',
        },
      );
    })
    .catch(() => {
      /* The transition was skipped (for example a duplicate name): the
         navigation still completes, just without the morph. */
    });
}

function onBeforeSwap(event: Event): void {
  const slug = pendingSlug;
  if (!slug) return;
  const transition = (event as Event & { viewTransition?: ViewTransition }).viewTransition;
  if (transition) choreograph(transition, slug);
}

function onAfterSwap(): void {
  clearNames();
  pendingSlug = null;
}

let bound = false;
export function initReelMorph(): void {
  if (bound) return;
  bound = true;
  // Capture phase, so the names are on before the router starts its work.
  document.addEventListener('click', onClick, true);
  document.addEventListener('astro:before-swap', onBeforeSwap);
  document.addEventListener('astro:after-swap', onAfterSwap);
}
