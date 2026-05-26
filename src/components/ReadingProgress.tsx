/* ============================================================================
   ReadingProgress
   ============================================================================
   Safe to edit.

   Thin horizontal bar fixed to the very top of the viewport that fills
   left-to-right as the visitor scrolls through a long page. Standard
   pattern on long-read articles (Medium, The Verge, etc.) and useful
   on case study detail pages where the prose can run several screens.

   Computes progress against (scrollHeight - viewport), so 0% is at the
   top of the page and 100% is when the bottom edge of the viewport hits
   the bottom of the document.

   Place inside BaseLayout's slot only on routes that benefit (case study
   detail). Renders at z-50, above the header.
   ============================================================================ */

import { useEffect, useState } from 'react';

export default function ReadingProgress() {

  // 0..1 progress value. Drives the bar's transform: scaleX().
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {

    function update(): void {
      const doc      = document.documentElement;
      const max      = doc.scrollHeight - doc.clientHeight;
      // Guard divide-by-zero on short pages where there's nothing to scroll.
      const value    = max > 0 ? window.scrollY / max : 0;
      setProgress(Math.min(1, Math.max(0, value)));
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      // role + aria-hidden together: the bar conveys progress visually
      // but isn't an actionable element, and screen readers shouldn't
      // announce it as they would a real progressbar that changes a
      // meaningful state.
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent"
    >
      <div
        className="h-full origin-left bg-accent"
        style={{
          // transform scaleX is GPU-accelerated; width-based updates
          // would trigger layout on every scroll tick.
          transform: `scaleX(${progress})`,
          transition: 'transform 80ms linear',
        }}
      />
    </div>
  );
}
