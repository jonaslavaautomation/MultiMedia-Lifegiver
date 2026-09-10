import { useEffect, useRef, useState } from 'react';
import { StaticCanvas } from 'fabric';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/lib/editorConstants';

interface UseStaticFabricCanvasParams {
  backgroundColor: string;
}

interface UseStaticFabricCanvasResult {
  containerRef: React.RefObject<HTMLDivElement>;
  canvasElRef: React.RefObject<HTMLCanvasElement>;
  canvas: StaticCanvas | null;
}

/**
 * Read-only counterpart to useFabricCanvas.ts — same lifecycle and
 * responsive-zoom behavior, but instantiates Fabric's non-interactive
 * StaticCanvas (no selection/controls) since Present-mode output is
 * display-only. Kept as a separate hook rather than a flag on the editor's
 * hook to keep the already-shipped interactive editor untouched.
 */
export function useStaticFabricCanvas({ backgroundColor }: UseStaticFabricCanvasParams): UseStaticFabricCanvasResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasInstanceRef = useRef<StaticCanvas | null>(null);
  const [canvas, setCanvas] = useState<StaticCanvas | null>(null);

  useEffect(() => {
    if (!canvasElRef.current) return;

    const instance = new StaticCanvas(canvasElRef.current, {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      backgroundColor,
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
