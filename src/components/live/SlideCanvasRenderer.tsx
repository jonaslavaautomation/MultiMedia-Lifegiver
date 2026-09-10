import { useEffect } from 'react';
import { useStaticFabricCanvas } from '@/hooks/useStaticFabricCanvas';
import { applySolidBackground } from '@/lib/fabricObjects';
import { resolveAndRenderSlide } from '@/lib/renderSlide';
import { isEmptySlideContent } from '@/lib/slideContent';
import { DEFAULT_SLIDE_BACKGROUND_COLOR } from '@/lib/editorConstants';
import type { SlideCanvasData } from '@/types';

interface SlideCanvasRendererProps {
  content: SlideCanvasData | null;
  className?: string;
}

/**
 * Read-only slide renderer for Present mode — the operator's preview
 * thumbnails, the Projector screen, and the Stage Display all use this
 * instead of the interactive editor canvas.
 */
export function SlideCanvasRenderer({ content, className = '' }: SlideCanvasRendererProps) {
  const { containerRef, canvasElRef, canvas } = useStaticFabricCanvas({
    backgroundColor: DEFAULT_SLIDE_BACKGROUND_COLOR,
  });

  useEffect(() => {
    if (!canvas) return;
    let cancelled = false;

    async function render() {
      canvas!.clear();

      if (!content || isEmptySlideContent(content)) {
        applySolidBackground(canvas!, DEFAULT_SLIDE_BACKGROUND_COLOR);
        return;
      }

      await resolveAndRenderSlide(canvas!, content);
      if (!cancelled) canvas!.requestRenderAll();
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [canvas, content]);

  return (
    <div ref={containerRef} className={className} style={{ aspectRatio: '16 / 9' }}>
      <canvas ref={canvasElRef} />
    </div>
  );
}
