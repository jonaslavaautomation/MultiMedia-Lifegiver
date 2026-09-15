import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Maximize, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLiveChannel } from '@/hooks/useLiveChannel';
import { SlideCanvasRenderer } from '@/components/live/SlideCanvasRenderer';
import { SafeSlideDisplay } from '@/components/live/SafeSlideDisplay';
import type { LiveState } from '@/types/live';

/**
 * Audience-facing output. Full-bleed, letterboxed to 16:9, chrome-less.
 * Meant to be dragged to the screen wired to a projector/TV and put into
 * real fullscreen via the corner button (browsers require a user gesture
 * inside this window to grant fullscreen).
 *
 * The corner Previous/Next buttons post commands back to the operator
 * (src/pages/PresentLivePage.tsx) over the same local BroadcastChannel used
 * for state — handy if this window ends up being the one someone's actually
 * looking at. They're deliberately small and low-opacity, matching the
 * existing Fullscreen button, since this output can be visible to the
 * audience.
 */
export function ProjectorScreenPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<LiveState | null>(null);
  const { post, lastMessage } = useLiveChannel(id ?? '');

  useEffect(() => {
    post({ type: 'request-state' });
  }, [post]);

  useEffect(() => {
    if (lastMessage?.type === 'state') setState(lastMessage.state);
  }, [lastMessage]);

  function handleFullscreen() {
    document.documentElement.requestFullscreen().catch(() => {
      // Fullscreen can be denied (e.g. no user gesture, browser policy) — fail silently.
    });
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      {!state?.blackout && state?.safeSlide && (
        <div style={{ width: 'min(100vw, 177.78vh)', aspectRatio: '16 / 9' }}>
          <SafeSlideDisplay className="w-full h-full" />
        </div>
      )}
      {!state?.blackout && !state?.safeSlide && (
        <div style={{ width: 'min(100vw, 177.78vh)', aspectRatio: '16 / 9' }}>
          <SlideCanvasRenderer content={state?.currentContent ?? null} className="w-full h-full" />
        </div>
      )}

      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <button
          onClick={() => post({ type: 'command', action: 'previous' })}
          title="Previous slide"
          className="p-2.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => post({ type: 'command', action: 'next' })}
          title="Next slide"
          className="p-2.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleFullscreen}
          title="Fullscreen"
          className="p-2.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
