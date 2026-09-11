import { useCallback, useEffect, useRef, useState } from 'react';
import { StaticCanvas } from 'fabric';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/lib/editorConstants';

interface UseStaticFabricCanvasParams {
  backgroundColor: string;
}

interface UseStaticFabricCanvasResult {
  containerRef: (node: HTMLDivElement | null) => void;
  canvasElRef: (node: HTMLCanvasElement | null) => void;
  canvas: StaticCanvas | null;
}

/**
 * Read-only counterpart to useFabricCanvas.ts — same lifecycle and
 * responsive-zoom behavior, but instantiates Fabric's non-interactive
 * StaticCanvas (no selection/controls) since Present-mode output is
 * display-only. Kept as a separate hook rather than a flag on the editor's
 * hook to keep the already-shipped interactive editor untouched.
 *
 * containerRef/canvasElRef are CALLBACK refs (see useFabricCanvas.ts for
 * why) — kept in sync with that hook even though this one's current
 * callers all render their canvas unconditionally on mount, so a future
 * caller that renders it behind a loading gate doesn't quietly break.
 */
export function useStaticFabricCanvas({ backgroundColor }: UseStaticFabricCanvasParams): UseStaticFabricCanvasResult {
  const canvasInstanceRef = useRef<StaticCanvas | null>(null);
  const [canvas, setCanvas] = useState<StaticCanvas | null>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);

  const canvasElRef = useCallback((node: HTMLCanvasElement | null) => setCanvasEl(node), []);
  const containerRef = useCallback((node: HTMLDivElement | null) => setContainerEl(node), []);

  useEffect(() => {
    if (!canvasEl) return;

    const instance = new StaticCanvas(canvasEl, {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      backgroundColor,
    });
    canvasInstanceRef.current = instance;
    setCanvas(instance);

    let resizeObserver: ResizeObserver | null = null;
    if (containerEl) {
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const containerWidth = entry.contentRect.width;
        if (containerWidth <= 0) return;
        const scale = containerWidth / SLIDE_WIDTH;
        instance.setDimensions({ width: SLIDE_WIDTH * scale, height: SLIDE_HEIGHT * scale });
        instance.setZoom(scale);
      });
      resizeObserver.observe(containerEl);
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
  }, [canvasEl, containerEl, backgroundColor]);

  return { containerRef, canvasElRef, canvas };
}
