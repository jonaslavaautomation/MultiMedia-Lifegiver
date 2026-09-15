import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  label: string;
  children: ReactNode;
  /** Delay before showing, in ms — much shorter than the browser's native `title` delay (~1s+). */
  delay?: number;
}

/**
 * Fast, styled hover tooltip — for icon-only buttons where a native `title`
 * attribute is the only thing explaining what they do today (Undo, Lock,
 * Bring to Front, Align, etc.), which is slow to appear and looks like
 * every other browser's default tooltip rather than part of this app.
 *
 * Renders through a portal to document.body, positioned from the trigger's
 * live bounding rect, for the same reason PortalDropdown.tsx does: several
 * of these buttons live inside FloatingContextualToolbar's Framer Motion
 * `motion.div`, whose inline `transform` traps a normal in-tree
 * `position: absolute`/`fixed` element in a local stacking context — it
 * could never paint above the canvas sitting right below the toolbar
 * otherwise, the exact bug already fixed once for the font/color
 * dropdowns. Unlike PortalDropdown, there's no click-catching backdrop
 * here — a tooltip must never block interaction with anything underneath
 * it, and `pointer-events-none` keeps the tooltip itself out of the way of
 * the cursor too.
 */
export function Tooltip({ label, children, delay = 300 }: TooltipProps) {
  const [rect, setRect] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    timerRef.current = setTimeout(() => {
      const el = wrapperRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 6, left: r.left + r.width / 2 });
    }, delay);
  }

  function hide() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setRect(null);
  }

  return (
    <span ref={wrapperRef} className="inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {rect &&
        createPortal(
          <div
            role="tooltip"
            className="fixed z-[200] -translate-x-1/2 px-2 py-1 rounded-md bg-zinc-900 text-white text-[11px] leading-none whitespace-nowrap shadow-lg pointer-events-none"
            style={{ top: rect.top, left: rect.left }}
          >
            {label}
          </div>,
          document.body
        )}
    </span>
  );
}
