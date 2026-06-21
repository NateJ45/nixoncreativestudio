/* ============================================================================
   Progressive enhancements  [revamp]
   ============================================================================
   A tiny, dependency-free interaction layer that sits on top of the static
   markup. Every effect is declarative (driven by a data-* attribute) and
   degrades safely, so the page works with this script absent or blocked.

   Attributes:
     [data-magnetic]   pointer-follow translate toward the cursor. Optional
                       numeric value = strength (default 0.3). Fine pointer +
                       motion only.
     [data-spotlight]  sets --mx / --my (px, relative to the element) on
                       pointer move so a CSS radial glow can track the cursor.
                       See .spotlight-card in globals.css.
     [data-countup]    animates a number up to data-countup-to when it scrolls
                       into view. Optional data-countup-prefix / -suffix /
                       -duration. Under reduced motion the final value is set
                       immediately.
     [data-header]     toggles data-scrolled on itself once the page scrolls,
                       driving the sticky frosted-header treatment.

   Runs on every astro:page-load, which fires on the initial load and after
   each View Transitions navigation, so freshly swapped DOM gets wired too.
   Per-element guards keep it idempotent; the window-level scroll listener is
   registered exactly once.
   ============================================================================ */

const prefersReduced = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const finePointer = (): boolean => window.matchMedia('(pointer: fine)').matches;

/* ---- Magnetic ------------------------------------------------------------- */
function initMagnetic(): void {
  if (prefersReduced() || !finePointer()) return;
  document
    .querySelectorAll<HTMLElement>('[data-magnetic]:not([data-magnetic-bound])')
    .forEach((el) => {
      el.dataset.magneticBound = 'true';
      const strength = Number(el.dataset.magnetic) || 0.3;
      el.addEventListener('pointermove', (event) => {
        const rect = el.getBoundingClientRect();
        const mx = event.clientX - (rect.left + rect.width / 2);
        const my = event.clientY - (rect.top + rect.height / 2);
        el.style.transform = `translate(${mx * strength}px, ${my * strength}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transform = '';
      });
    });
}

/* ---- Spotlight ------------------------------------------------------------ */
function initSpotlight(): void {
  if (prefersReduced() || !finePointer()) return;
  document
    .querySelectorAll<HTMLElement>('[data-spotlight]:not([data-spotlight-bound])')
    .forEach((el) => {
      el.dataset.spotlightBound = 'true';
      el.addEventListener('pointermove', (event) => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        el.style.setProperty('--my', `${event.clientY - rect.top}px`);
      });
    });
}

/* ---- Count-up ------------------------------------------------------------- */
function formatCount(el: HTMLElement, value: number): string {
  const prefix = el.dataset.countupPrefix ?? '';
  const suffix = el.dataset.countupSuffix ?? '';
  return prefix + Math.round(value).toLocaleString() + suffix;
}

function runCount(el: HTMLElement, to: number): void {
  const duration = Number(el.dataset.countupDuration) || 1400;
  const start = performance.now();
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    el.textContent = formatCount(el, to * eased);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initCountUp(): void {
  const els = Array.from(
    document.querySelectorAll<HTMLElement>('[data-countup]:not([data-countup-bound])')
  );
  if (!els.length) return;

  if (prefersReduced() || !('IntersectionObserver' in window)) {
    els.forEach((el) => {
      el.dataset.countupBound = 'true';
      const to = Number(el.dataset.countupTo ?? '0');
      if (Number.isFinite(to)) el.textContent = formatCount(el, to);
    });
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        el.dataset.countupBound = 'true';
        io.unobserve(el);
        const to = Number(el.dataset.countupTo ?? '0');
        if (Number.isFinite(to)) runCount(el, to);
      });
    },
    { threshold: 0.6 }
  );
  els.forEach((el) => io.observe(el));
}

/* ---- Scroll-aware header --------------------------------------------------
   The header element is replaced on each View Transitions navigation, so the
   scroll listener re-queries the current header rather than closing over a
   stale node. The listener itself is registered once via a window flag.

   Two states:
     data-scrolled  : the page has scrolled past 8px (frost + condense).
     data-over-hero : a [data-hero-dark] element exists AND still covers the
                      bar (its bottom is below the header height). Drives the
                      transparent, white-text treatment over the navy hero.
                      Pages without a dark hero never get this state, so their
                      header is the frosted bar from first paint. */
const HEADER_HEIGHT = 72; // approx; the threshold the hero must clear to "pass"

function setHeaderState(): void {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  header.toggleAttribute('data-scrolled', window.scrollY > 8);

  const heroDark = document.querySelector('[data-hero-dark]');
  const overHero =
    !!heroDark && heroDark.getBoundingClientRect().bottom > HEADER_HEIGHT;
  header.toggleAttribute('data-over-hero', overHero);
}

function initHeader(): void {
  setHeaderState();
  if (!(window as unknown as { __ncsHeaderBound?: boolean }).__ncsHeaderBound) {
    (window as unknown as { __ncsHeaderBound?: boolean }).__ncsHeaderBound = true;
    window.addEventListener('scroll', setHeaderState, { passive: true });
  }
}

/* ---- Boot ----------------------------------------------------------------- */
function enhance(): void {
  initMagnetic();
  initSpotlight();
  initCountUp();
  initHeader();
}

document.addEventListener('astro:page-load', enhance);
