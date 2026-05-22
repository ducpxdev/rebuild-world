import { useState, useEffect } from 'react';

/**
 * Tracks the user's scroll direction and exposes a `hidden` flag that becomes
 * `true` when the user scrolls down (past a minimum offset) and `false` again
 * when they scroll up or touch the screen.
 *
 * Intended use: auto-hide navigation toolbars on mobile while reading.
 *
 * @param hideAfterPx   – Minimum scroll distance from the top before hiding kicks in.
 * @param deltaThreshold – Minimum scroll delta per frame before a direction change
 *                         is registered (prevents micro-jitter from triggering the bar).
 */
export function useScrollDirection(hideAfterPx = 80, deltaThreshold = 6) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let rafId: number;

    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY;

        if (y < hideAfterPx) {
          // Always show when near the top of the page
          setHidden(false);
        } else if (y - lastY > deltaThreshold) {
          // Scrolling down
          setHidden(true);
        } else if (lastY - y > deltaThreshold) {
          // Scrolling up
          setHidden(false);
        }

        lastY = y;
      });
    };

    // Any touch interaction immediately restores the toolbars
    const handleTouch = () => setHidden(false);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouch, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouch);
    };
  }, [hideAfterPx, deltaThreshold]);

  return { hidden };
}
