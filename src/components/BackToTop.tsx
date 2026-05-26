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
        'fixed bottom-6 right-6 z-40 rounded-full shadow-lg transition-opacity duration-200 ' +
        (visible ? 'opacity-100' : 'pointer-events-none opacity-0')
      }
    >
      <ArrowUp className="size-5" />
    </Button>
  );
}
