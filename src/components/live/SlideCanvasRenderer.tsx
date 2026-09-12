import { useEffect, useState } from 'react';
import { useStaticFabricCanvas } from '@/hooks/useStaticFabricCanvas';
import { applySolidBackground } from '@/lib/fabricObjects';
import { resolveAndRenderSlide } from '@/lib/renderSlide';
import { isEmptySlideContent } from '@/lib/slideContent';
import { DEFAULT_SLIDE_BACKGROUND_COLOR } from '@/lib/editorConstants';
import { MotionBackgroundPlayer } from '@/components/motion/MotionBackgroundPlayer';
import type { SlideCanvasData } from '@/types';
import type { MotionPreset } from '@/types/motion';

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
  const [videoBackgroundUrl, setVideoBackgroundUrl] = useState<string | null>(null);
  const [motionBackground, setMotionBackground] = useState<MotionPreset | null>(null);

  useEffect(() => {
    if (!canvas) return;
    let cancelled = false;

    async function render() {
      canvas!.clear();

      if (!content || isEmptySlideContent(content)) {
        applySolidBackground(canvas!, DEFAULT_SLIDE_BACKGROUND_COLOR);
        if (!cancelled) {
          setVideoBackgroundUrl(null);
          setMotionBackground(null);
        }
        return;
      }

      const { videoBackgroundUrl: videoUrl, motionBackground: motion } = await resolveAndRenderSlide(canvas!, content);
      if (cancelled) return;
      setVideoBackgroundUrl(videoUrl);
      setMotionBackground(motion);
      canvas!.requestRenderAll();
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [canvas, content]);

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ aspectRatio: '16 / 9' }}>
      {motionBackground && (
        <MotionBackgroundPlayer key={motionBackground.id} preset={motionBackground} className="absolute inset-0" />
      )}
      {videoBackgroundUrl && (
        <video
          key={videoBackgroundUrl}
          src={videoBackgroundUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {/* Isolated, structurally-static parent for the canvas — see the matching comment in EditorCanvasStage.tsx for why this can't just be a plain sibling of the motion/video layers. */}
      <div className="absolute inset-0">
        <canvas ref={canvasElRef} className="relative" />
      </div>
    </div>
  );
}
