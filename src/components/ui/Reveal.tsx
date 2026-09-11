import { type ReactNode } from 'react';
import { useReveal } from '@/lib/useReveal';

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in ms — e.g. 90, 180, 270 for successive siblings. */
  delay?: number;
  /** 'lg' (700ms, default) for hero/headline elements, 'sm' (500ms) for cards and smaller UI. */
  size?: 'lg' | 'sm';
  className?: string;
}

/**
 * Fade-up-and-settle reveal wrapper: opacity 0->1, translateY(24px)->0, and
 * scale(0.98)->1, on a slow decelerate easing with no bounce. Reveals once,
 * either on mount (for above-the-fold content, e.g. the login page) or the
 * first time it scrolls into view (e.g. dashboard cards) — both are the
 * same underlying IntersectionObserver behavior in useReveal().
 *
 * Respects prefers-reduced-motion automatically via the ".reveal" CSS rules
 * in src/index.css — no extra handling needed here.
 *
 * Usage: wrap any element and stagger siblings by ~90ms.
 *   <Reveal><h1>Headline</h1></Reveal>
 *   <Reveal delay={90}><p>Subtext</p></Reveal>
 *   <Reveal delay={180} size="sm"><Button>Go</Button></Reveal>
 */
export function Reveal({ children, delay = 0, size = 'lg', className = '' }: RevealProps) {
  const { ref, isVisible } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`reveal ${size === 'sm' ? 'reveal-sm' : ''} ${isVisible ? 'reveal-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
