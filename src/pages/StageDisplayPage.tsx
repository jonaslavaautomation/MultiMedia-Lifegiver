import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Maximize, Clock as ClockIcon } from 'lucide-react';
import { useLiveChannel } from '@/hooks/useLiveChannel';
import { SlideCanvasRenderer } from '@/components/live/SlideCanvasRenderer';
import { getDisplayMs, formatDuration } from '@/lib/liveTimer';
import type { LiveState } from '@/types/live';

/**
 * Worship-team-facing confidence monitor: current slide (large), next
 * slide (small preview), a timer, and the time of day. Never goes black
 * during blackout — the audience-facing Projector does, this doesn't.
 */
export function StageDisplayPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<LiveState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { post, lastMessage } = useLiveChannel(id ?? '');

  useEffect(() => {
    post({ type: 'request-state' });
  }, [post]);

  useEffect(() => {
    if (lastMessage?.type === 'state') setState(lastMessage.state);
  }, [lastMessage]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  function handleFullscreen() {
    document.documentElement.requestFullscreen().catch(() => {});
  }

  const timerMs = state ? getDisplayMs(state.timer, now) : 0;
  const isLow = state?.timer.mode === 'countdown' && timerMs <= 60_000 && timerMs > 0;
  const isDone = state?.timer.mode === 'countdown' && timerMs === 0;

  const clockLabel = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-zinc-400 truncate">{state?.presentationTitle ?? ''}</p>
        <div className="flex items-center gap-2 text-zinc-300">
          <ClockIcon className="w-4 h-4" />
          <span className="text-sm tabular-nums">{clockLabel}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        <div className="flex-1 min-h-0">
          <SlideCanvasRenderer content={state?.currentContent ?? null} className="w-full h-full rounded-2xl border border-zinc-800 overflow-hidden" />
        </div>

        <div className="lg:w-72 shrink-0 flex flex-col gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Next</p>
            <SlideCanvasRenderer content={state?.nextContent ?? null} className="w-full rounded-xl border border-zinc-800 overflow-hidden" />
          </div>

          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              {state?.timer.mode === 'countdown' ? 'Countdown' : 'Elapsed'}
            </p>
            <p className={`text-4xl font-bold font-display tabular-nums ${isDone ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-zinc-100'}`}>
              {formatDuration(timerMs)}
            </p>
          </div>

          {state && state.totalSlides > 0 && (
            <p className="text-center text-xs text-zinc-500">
              Slide {state.slideIndex + 1} of {state.totalSlides}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleFullscreen}
        title="Fullscreen"
        className="absolute bottom-4 right-4 p-2.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all"
      >
        <Maximize className="w-4 h-4" />
      </button>
    </div>
  );
}
