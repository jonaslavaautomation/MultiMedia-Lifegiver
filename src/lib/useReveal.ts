import { useEffect, useRef, useState } from 'react';

interface UseRevealOptions {
  /** Fraction of the element that must be visible to trigger the reveal. */
  threshold?: number;
  /** Shrinks/grows the effective viewport box used for the intersection check. */
  rootMargin?: string;
}

/**
 * Reveals an element once, the first time it enters the viewport (or is
 * already in it at mount — e.g. above-the-fold content on page load).
 * Pairs with the ".reveal" / ".reveal-visible" CSS classes in index.css;
 * see the <Reveal> wrapper component (src/components/ui/Reveal.tsx) for
 * the usual way to consume this.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options: UseRevealOptions = {}) {
  const { threshold = 0.15, rootMargin = '0px 0px -10% 0px' } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // No IntersectionObserver support — just show the content rather than hide it forever.
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // reveal once, then stop watching
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, isVisible };
}
