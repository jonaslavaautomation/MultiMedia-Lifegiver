import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Play, Pause, RotateCcw } from 'lucide-react';
import { useRealtimeLiveChannel } from '@/hooks/useRealtimeLiveChannel';
import { Button } from '@/components/ui/Button';
import { SlideCanvasRenderer } from '@/components/live/SlideCanvasRenderer';
import { ConnectionStatusBadge } from '@/components/live/ConnectionStatusBadge';
import { getDisplayMs, formatDuration } from '@/lib/liveTimer';
import type { LiveState, RemoteCommand } from '@/types/live';

/**
 * Mobile-first remote for controlling a live presentation from a separate
 * device (phone/tablet). Never holds truth locally — every action posts a
 * RemoteCommand over Realtime and waits for the resulting state broadcast
 * from the operator (src/pages/PresentLivePage.tsx) to reflect back, same
 * request-state pattern Projector/Stage already use.
 */
export function RemoteControlPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<LiveState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { post, lastMessage, connected } = useRealtimeLiveChannel(id ?? '');

  useEffect(() => {
    post({ type: 'request-state' });
  }, [post]);

  useEffect(() => {
    if (lastMessage?.type === 'state') setState(lastMessage.state);
  }, [lastMessage]);

  useEffect(() => {
    if (!state?.timer.running) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [state?.timer.running]);

  function send(command: RemoteCommand) {
    post(command);
  }

  const timerMs = state ? getDisplayMs(state.timer, now) : 0;
  const isCountingDown = state?.timer.mode === 'countdown';
  const isLow = isCountingDown && timerMs <= 60_000 && timerMs > 0;
  const isDone = isCountingDown && timerMs === 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col gap-4 p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold truncate">{state?.presentationTitle ?? 'Connecting…'}</p>
        <div className="shrink-0 flex items-center gap-2">
          <ConnectionStatusBadge />
          <span className={`text-xs flex items-center gap-1 ${connected ? 'text-emerald-400' : 'text-zinc-500'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" /> {connected ? 'Connected' : 'Connecting…'}
          </span>
        </div>
      </div>

      {!connected && (
        <p className="text-[11px] text-amber-400/90 text-center -mt-2">
          Remote disconnected — the booth computer's own controls (keyboard, mouse, MIDI) keep working regardless.
        </p>
      )}

      {state && state.totalSlides > 0 && (
        <p className="text-xs text-zinc-500 text-center">
          Slide {state.slideIndex + 1} of {state.totalSlides}
        </p>
      )}

      {/* Mirrors the audience-facing Projector exactly, blackout included —
          this is meant to show what's actually live, not a confidence
          monitor (that's Stage Display, which deliberately never blacks
          out). */}
      <div className="rounded-xl overflow-hidden border border-zinc-800 bg-black aspect-video">
        {state?.blackout ? (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-xs text-zinc-600 uppercase tracking-wider">Blacked Out</p>
          </div>
        ) : (
          <SlideCanvasRenderer content={state?.currentContent ?? null} className="w-full h-full" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={() => send({ type: 'command', action: 'previous' })}
          className="h-16 justify-center"
        >
          <ChevronLeft className="w-5 h-5" /> Prev
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => send({ type: 'command', action: 'next' })}
          className="h-16 justify-center"
        >
          Next <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <Button
        variant={state?.blackout ? 'danger' : 'outline'}
        onClick={() => send({ type: 'command', action: 'toggle-blackout' })}
        className="h-14 justify-center"
      >
        {state?.blackout ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        {state?.blackout ? 'Blacked Out' : 'Blackout'}
      </Button>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 text-center mt-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          {isCountingDown ? 'Countdown' : 'Elapsed'}
        </p>
        <p
          className={`text-4xl font-bold font-display tabular-nums mb-3 ${
            isDone ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-zinc-100'
          }`}
        >
          {formatDuration(timerMs)}
        </p>
        <div className="flex items-center justify-center gap-2">
          {state?.timer.running ? (
            <Button variant="secondary" size="sm" onClick={() => send({ type: 'command', action: 'timer-pause' })}>
              <Pause className="w-3.5 h-3.5" /> Pause
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={() => send({ type: 'command', action: 'timer-start' })}>
              <Play className="w-3.5 h-3.5" /> Start
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => send({ type: 'command', action: 'timer-reset' })}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-600 text-center mt-auto pt-4">
        Requires the operator's control page to stay open on the booth computer.
      </p>
    </div>
  );
}
