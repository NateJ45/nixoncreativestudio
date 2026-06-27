/* ============================================================================
   Progressive enhancements  [revamp]
   ============================================================================
   A tiny, dependency-free interaction layer that sits on top of the static
   markup. Every effect is declarative (driven by a data-* attribute) and
   degrades safely, so the page works with this script absent or blocked.

   Attributes:
     [data-spotlight]  sets --mx / --my (px, relative to the element) on
                       pointer move so a CSS radial glow can track the cursor.
                       See .spotlight-card in globals.css.
     [data-countup]    animates a number up to data-countup-to when it scrolls
                       into view. Optional data-countup-prefix / -suffix /
                       -duration. Under reduced motion the final value is set
                       immediately.
     [data-header]     toggles data-scrolled on itself once the page scrolls,
                       driving the sticky frosted-header treatment.
     [data-prose]      marks a long-form content container (case study /
                       journal body); each id'd heading inside gets a
                       hover-revealed "copy link" anchor.

   Runs on every astro:page-load, which fires on the initial load and after
   each View Transitions navigation, so freshly swapped DOM gets wired too.
   Per-element guards keep it idempotent; the window-level scroll listener is
   registered exactly once.
   ============================================================================ */

const prefersReduced = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const finePointer = (): boolean => window.matchMedia('(pointer: fine)').matches;

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
                      header's over-hero treatment, which takes the hero's own
                      surface colour (theme-aware: light in light mode, navy
                      with white text in dark). Pages without a hero never get
                      this state, so their header is the frosted bar from first
                      paint. */
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

/* ---- Heading anchors ------------------------------------------------------
   On long-form pages (case studies, journal), give every body heading a
   hover-revealed "copy link" control so a section can be deep-linked. Astro
   already slugs MD/MDX headings, so each carries an id; this appends a real
   <a href="#id"> (so keyboard nav and open-in-new-tab work) and, on click,
   also copies the absolute URL to the clipboard with a brief confirmation.
   Scoped to [data-prose] so it never touches the section headings on marketing
   pages. Progressive: without this script the headings are still anchorable by
   id, there's just no visible control. */
let liveRegion: HTMLElement | null = null;
function announce(message: string): void {
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
  }
  // Clear first so the same message announced twice still fires.
  liveRegion.textContent = '';
  window.setTimeout(() => {
    if (liveRegion) liveRegion.textContent = message;
  }, 30);
}

// Build the link glyph with DOM methods (no innerHTML), matching the project's
// Lightbox pattern. A two-path chain-link icon.
const SVG_NS = 'http://www.w3.org/2000/svg';
function makeLinkIcon(): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  for (const d of [
    'M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.71 1.71',
    'M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  ]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

function initHeadingAnchors(): void {
  document
    .querySelectorAll<HTMLElement>('[data-prose] :is(h2, h3)[id]:not([data-anchored])')
    .forEach((h) => {
      h.dataset.anchored = 'true';
      const id = h.id;
      const label = (h.textContent || 'this section').trim();
      const a = document.createElement('a');
      a.className = 'heading-anchor';
      a.href = `#${id}`;
      a.setAttribute('aria-label', `Copy link to the “${label}” section`);
      a.appendChild(makeLinkIcon());
      a.addEventListener('click', (event) => {
        // Without the async clipboard API, let the plain anchor set the hash.
        if (!navigator.clipboard?.writeText) return;
        event.preventDefault();
        const url = `${location.origin}${location.pathname}#${id}`;
        navigator.clipboard
          .writeText(url)
          .then(() => {
            history.replaceState(null, '', `#${id}`);
            a.dataset.copied = 'true';
            announce('Link copied');
            window.setTimeout(() => {
              delete a.dataset.copied;
            }, 1500);
          })
          .catch(() => {
            location.hash = id;
          });
      });
      h.appendChild(a);
    });
}

/* ---- Boot ----------------------------------------------------------------- */
function enhance(): void {
  initSpotlight();
  initCountUp();
  initHeader();
  initHeadingAnchors();
}

document.addEventListener('astro:page-load', enhance);
