/* ============================================================================
   BackToTop
   ============================================================================
   Safe to edit.

   Floating button bottom-right that fades in once the visitor has scrolled
   past 600px and scrolls smoothly back to the top when clicked. Hidden by
   default so it doesn't take up screen real estate on short pages or above
   the fold.

   Respects prefers-reduced-motion: the smooth-scroll behavior falls back
   to an instant jump, and the fade transition becomes a 1ms swap because
   the global CSS rule kills transitions under reduced-motion.

   Rendered once in BaseLayout so it shows up on every page. Uses
   client:idle so the page can finish hydrating critical islands first.
   ============================================================================ */

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

import { Button } from './ui/button';

/** Pixel threshold from top before the button appears. Tuned so it
    shows up after the visitor has clearly committed to reading a page,
    not on the hero. */
const SHOW_AFTER_PX = 600;

export default function BackToTop() {

  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    // Use scroll position from documentElement (works under Lenis, which
    // proxies scroll but keeps document.scrollTop in sync).
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollToTop(): void {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top:      0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }

  return (
    <Button
      variant="brand"
      size="icon-lg"
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
      className={
        // size-11 (44px) is the comfortable touch target; icon-lg alone is 36px.
        // The bottom/right offsets hold a 1.5rem gap but grow to clear the home
        // indicator / notch when the page runs under viewport-fit=cover. env() is
        // 0 on non-notched devices, so this reads as a flat 1.5rem there.
        'fixed z-40 size-11 rounded-full shadow-lg transition-opacity duration-200 ' +
        'bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))] ' +
        (visible ? 'opacity-100' : 'pointer-events-none opacity-0')
      }
    >
      <ArrowUp className="size-5" />
    </Button>
  );
}
