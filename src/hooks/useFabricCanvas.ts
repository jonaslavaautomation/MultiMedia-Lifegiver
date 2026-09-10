import { useEffect, useRef, useState } from 'react';
import { Canvas } from 'fabric';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/lib/editorConstants';

interface UseFabricCanvasParams {
  backgroundColor: string;
}

interface UseFabricCanvasResult {
  containerRef: React.RefObject<HTMLDivElement>;
  canvasElRef: React.RefObject<HTMLCanvasElement>;
  canvas: Canvas | null;
}

/**
 * Owns the Fabric.js canvas lifecycle. The canvas is created once per mount
 * and never put in React state as "the thing that changes" — only a single
 * non-null reference is published via state once, so consumers re-render
 * exactly once when it becomes available.
 *
 * Objects are always authored in a fixed SLIDE_WIDTH x SLIDE_HEIGHT logical
 * space; a ResizeObserver only adjusts on-screen zoom/dimensions, so stored
 * JSON stays resolution-independent regardless of the viewer's screen size.
 */
export function useFabricCanvas({ backgroundColor }: UseFabricCanvasParams): UseFabricCanvasResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasInstanceRef = useRef<Canvas | null>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);

  useEffect(() => {
    if (!canvasElRef.current) return;

    const instance = new Canvas(canvasElRef.current, {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      backgroundColor,
      preserveObjectStacking: true,
    });
    canvasInstanceRef.current = instance;
    setCanvas(instance);

    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const containerWidth = entry.contentRect.width;
        if (containerWidth <= 0) return;
        const scale = containerWidth / SLIDE_WIDTH;
        instance.setDimensions({ width: SLIDE_WIDTH * scale, height: SLIDE_HEIGHT * scale });
        instance.setZoom(scale);
      });
      resizeObserver.observe(containerRef.current);
    }

    // Defensive repaint once curated fonts finish loading (guards against
    // text drawn before an async font load completes).
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => {
        instance.requestRenderAll();
      });
    }

    return () => {
      resizeObserver?.disconnect();
      canvasInstanceRef.current = null;
      setCanvas(null);
      void instance.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { containerRef, canvasElRef, canvas };
}
