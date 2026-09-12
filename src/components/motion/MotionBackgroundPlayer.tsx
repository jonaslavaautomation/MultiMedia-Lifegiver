import { useEffect, useRef } from 'react';
import { drawMotionFrame } from '@/lib/motionEngines';
import type { MotionPreset } from '@/types/motion';

interface MotionBackgroundPlayerProps {
  preset: MotionPreset;
  className?: string;
  /** false freezes on the first frame — used for grid thumbnails until hovered. */
  animate?: boolean;
}

/**
 * The single component that actually paints a motion background. Used
 * behind the Fabric canvas in the editor, in the read-only Present-mode
 * renderer (Projector/Stage/Confidence Monitor/audience screen all share
 * that one renderer — see SlideCanvasRenderer.tsx), AND at thumbnail size
 * in the library picker grid — same code path everywhere, so a motion
 * background can never look different in the picker than it does live.
 *
 * Perf/battery notes, since this is meant to loop unattended for a whole
 * service:
 *  - The backing canvas is sized to its CSS box × devicePixelRatio (capped
 *    at 2) via ResizeObserver, matching the pattern used elsewhere in this
 *    app for canvases (useFabricCanvas.ts) — crisp without over-rendering.
 *  - The rAF loop pauses whenever the document tab is hidden
 *    (visibilitychange) and resumes with a corrected clock offset so the
 *    animation doesn't jump.
 *  - `animate=false` paints exactly one real frame and then stops ticking
 *    — but it keeps ticking *until* that first real paint lands, since a
 *    canvas's on-screen size isn't known synchronously (ResizeObserver's
 *    first callback is always asynchronous), so the very first
 *    animation-frame tick can easily see a 0×0 box. Stopping unconditionally
 *    there would mean some fraction of `animate=false` callers simply never
 *    seeing anything painted at all.
 *
 * Deliberately NOT auto-honoring the OS `prefers-reduced-motion` setting:
 * a motion background is broadcast content the operator explicitly chose
 * for the congregation to see on Projector/Stage — editorial content, like
 * a video background (which this app already autoplays unconditionally,
 * with no such gating) — not app-chrome UI motion (drawer slides, hover
 * transitions) that accessibility guidance is actually about. Auto-freezing
 * it to a still frame because *some machine's* OS toggle happens to be on
 * would silently override that choice for everyone watching, which is
 * exactly the "Go Live and the background doesn't move" bug this was.
 * Callers that DO want it to respect that preference (or freeze for any
 * other reason, e.g. the picker grid's at-rest thumbnails) pass
 * `animate={false}` explicitly instead.
 */
export function MotionBackgroundPlayer({ preset, className = '', animate = true }: MotionBackgroundPlayerProps) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvasEl = canvasElRef.current;
    const container = canvasEl?.parentElement;
    if (!canvasEl || !container) return;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cssW = 0;
    let cssH = 0;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      cssW = entry.contentRect.width;
      cssH = entry.contentRect.height;
      if (cssW <= 0 || cssH <= 0) return;
      canvasEl.width = Math.round(cssW * dpr);
      canvasEl.height = Math.round(cssH * dpr);
    });
    resizeObserver.observe(container);

    const shouldAnimate = animate; // the only thing that decides continuous vs. one-shot — see file header for why prefers-reduced-motion isn't consulted here

    let startPerfMs = performance.now();
    let pausedAtSeconds = 0;

    let paintedOnce = false;

    function render(nowMs: number) {
      if (cssW > 0 && cssH > 0) {
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        const t = pausedAtSeconds + (nowMs - startPerfMs) / 1000;
        drawMotionFrame(ctx!, cssW, cssH, t, preset.params);
        paintedOnce = true;
      }
      // Keep ticking if we're meant to animate continuously, OR if we
      // haven't managed a single real paint yet. That second condition
      // matters: ResizeObserver's very first callback is asynchronous by
      // spec, never synchronous with `.observe()` — so on the *very first*
      // rAF tick, cssW/cssH can still legitimately be 0. Stopping here
      // whenever `!shouldAnimate` (the reduced-motion / thumbnail-at-rest
      // case) would mean losing that race permanently freezes the canvas
      // fully transparent, forever, with nothing ever painted.
      if (shouldAnimate || !paintedOnce) rafRef.current = requestAnimationFrame(render);
    }

    function handleVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(rafRef.current);
      } else if (shouldAnimate) {
        // Freeze the animation clock at whatever "t" it was showing, then
        // resume from there — otherwise a tab hidden for 10 minutes would
        // cause the loop to leap forward that whole gap on the next frame.
        pausedAtSeconds += (performance.now() - startPerfMs) / 1000;
        startPerfMs = performance.now();
        rafRef.current = requestAnimationFrame(render);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      resizeObserver.disconnect();
    };
    // `preset` intentionally not deep-compared — swapping the preset prop
    // remounts via `key` at call sites instead, so this effect only needs
    // to re-run when animate toggles or the preset identity changes.
  }, [preset, animate]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <canvas ref={canvasElRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
