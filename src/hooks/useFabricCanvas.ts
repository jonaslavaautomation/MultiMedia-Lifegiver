import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from 'fabric';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/lib/editorConstants';

interface UseFabricCanvasParams {
  backgroundColor: string;
}

interface UseFabricCanvasResult {
  containerRef: (node: HTMLDivElement | null) => void;
  canvasElRef: (node: HTMLCanvasElement | null) => void;
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
 *
 * containerRef/canvasElRef are CALLBACK refs, not plain useRef objects —
 * deliberately. A caller that only renders its canvas element behind a
 * conditional (e.g. EditorWorkspace's own `if (loading) return <skeleton>`
 * before it ever reaches the real markup with the canvas in it) means the
 * DOM node isn't attached yet on this hook's very first effect run. A plain
 * `useRef` + effect-with-empty-deps would see `.current === null` on that
 * first run and then never run again, permanently leaving the canvas
 * uninitialized. Callback refs fire exactly when the node actually mounts,
 * however late that is, so initialization is never missed.
 */
export function useFabricCanvas({ backgroundColor }: UseFabricCanvasParams): UseFabricCanvasResult {
  const canvasInstanceRef = useRef<Canvas | null>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);

  const canvasElRef = useCallback((node: HTMLCanvasElement | null) => setCanvasEl(node), []);
  const containerRef = useCallback((node: HTMLDivElement | null) => setContainerEl(node), []);

  useEffect(() => {
    if (!canvasEl) return;

    const instance = new Canvas(canvasEl, {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      backgroundColor,
      preserveObjectStacking: true,
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
  }, [canvasEl, containerEl, backgroundColor]);

  return { containerRef, canvasElRef, canvas };
}
