import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Maximize, Clock as ClockIcon, Radio } from 'lucide-react';
import { useLiveChannel } from '@/hooks/useLiveChannel';
import { SlideCanvasRenderer } from '@/components/live/SlideCanvasRenderer';
import { getDisplayMs, formatDuration } from '@/lib/liveTimer';
import type { LiveState } from '@/types/live';

/**
 * Worship-team-facing confidence monitor: current slide (large), next
 * slide (small preview), a timer, and the time of day. Never goes black
 * during blackout — the audience-facing Projector does, this doesn't.
 * Cyber-Broadcast HUD look, matching the Operator console (Phase 1) —
 * this is a broadcast surface, not the main admin UI.
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

  const connected = state !== null;
  const timerMs = state ? getDisplayMs(state.timer, now) : 0;
  const isLow = state?.timer.mode === 'countdown' && timerMs <= 60_000 && timerMs > 0;
  const isDone = state?.timer.mode === 'countdown' && timerMs === 0;
  const timerActive = state ? state.timer.mode === 'countdown' || state.timer.accumulatedMs > 0 || state.timer.running : false;

  const clockLabel = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 bg-hud-bg text-white flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-hud-panel/60 backdrop-blur-md border border-hud-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              connected ? 'bg-emerald-400 animate-pulse-glow' : 'bg-zinc-600'
            }`}
          />
          <p className="text-sm text-zinc-300 truncate">
            {connected ? state?.presentationTitle : 'Waiting for operator…'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-cyan-300/90 shrink-0">
          <ClockIcon className="w-4 h-4" />
          <span className="text-sm tabular-nums font-mono">{clockLabel}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        <div className="flex-1 min-h-0 min-w-0 flex flex-col">
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <Radio className="w-3 h-3 text-brand-400" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-400">Current</p>
          </div>
          <div className="flex-1 min-h-0">
            {connected ? (
              <SlideCanvasRenderer
                content={state?.currentContent ?? null}
                className="w-full h-full rounded-2xl border-2 border-brand-600/60 overflow-hidden bg-hud-panel shadow-[0_0_24px_-6px_rgba(47,130,113,0.4)]"
              />
            ) : (
              <div className="w-full h-full rounded-2xl border border-hud-border bg-hud-panel/40 flex items-center justify-center">
                <p className="text-sm text-zinc-600">No live session yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:w-72 shrink-0 flex flex-col gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1.5 px-1">Next</p>
            <SlideCanvasRenderer
              content={state?.nextContent ?? null}
              className="w-full rounded-xl border border-cyan-700/50 overflow-hidden bg-hud-panel"
            />
          </div>

          <div className="rounded-2xl bg-hud-panel/70 backdrop-blur-md border border-hud-border p-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              {state?.timer.mode === 'countdown' ? 'Countdown' : 'Elapsed'}
            </p>
            <p
              className={`text-4xl font-bold font-display tabular-nums ${
                isDone ? 'text-red-400' : isLow ? 'text-amber-400' : timerActive ? 'text-emerald-300' : 'text-zinc-600'
              }`}
            >
              {formatDuration(timerMs)}
            </p>
          </div>

          {state && state.totalSlides > 0 && (
            <p className="text-center text-xs text-zinc-500 font-mono">
              Slide {state.slideIndex + 1} of {state.totalSlides}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleFullscreen}
        title="Fullscreen"
        className="absolute bottom-4 right-4 p-2.5 rounded-lg bg-hud-panel/80 border border-hud-border text-zinc-500 hover:text-zinc-200 hover:border-zinc-600 transition-all"
      >
        <Maximize className="w-4 h-4" />
      </button>
    </div>
  );
}
