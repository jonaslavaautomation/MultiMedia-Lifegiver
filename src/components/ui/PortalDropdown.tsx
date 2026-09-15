import { useLayoutEffect, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

interface PortalDropdownProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  /** 'left' (default) aligns the dropdown's left edge to the anchor's; 'right' aligns its right edge instead — useful near the right side of the screen. */
  align?: 'left' | 'right';
}

/**
 * Renders dropdown content into a portal at document.body, positioned
 * under the given anchor element via a fixed box computed from its live
 * bounding rect, instead of rendering in-place with `position: absolute`.
 *
 * This matters for any dropdown trigger that lives inside a
 * framer-motion-animated ancestor (e.g. FloatingContextualToolbar's
 * `motion.div`) — Framer Motion keeps an inline `transform` on that
 * ancestor for as long as it's mounted, and CSS `transform` on an ancestor
 * creates a new containing block/stacking context for `position: absolute`
 * (or even `fixed`) descendants. That traps an in-tree dropdown's z-index
 * inside the ancestor's own local stacking context, so it can never
 * out-rank a *later sibling* elsewhere on the page (e.g. the slide canvas
 * stage, which sits right after the toolbar in the DOM) no matter how high
 * its z-index is set — the canvas simply paints on top of it wherever they
 * visually overlap. Rendering through a portal to document.body sidesteps
 * that entirely, the same way Modal.tsx's top-level `fixed inset-0` already
 * does for dialogs.
 */
export function PortalDropdown({ open, onClose, anchorRef, children, className = '', align = 'left' }: PortalDropdownProps) {
  const [rect, setRect] = useState<{ top: number; left: number; right: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      setRect({ top: r.bottom + 4, left: r.left, right: window.innerWidth - r.right, width: r.width });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, anchorRef]);

  if (!open || !rect) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} />
      <div
        className={`fixed z-[101] ${className}`}
        style={{ top: rect.top, ...(align === 'right' ? { right: rect.right } : { left: rect.left }), minWidth: rect.width }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}
