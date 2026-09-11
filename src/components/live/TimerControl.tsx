import { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  getDisplayMs,
  formatDuration,
  startTimer,
  pauseTimer,
  resetTimer,
  setTimerMode,
  setCountdownDuration,
} from '@/lib/liveTimer';
import type { TimerMode, TimerState } from '@/types/live';

interface TimerControlProps {
  timer: TimerState;
  onChange: (next: TimerState) => void;
}

/** Operator's timer widget: mode toggle, duration input, start/pause/reset. */
export function TimerControl({ timer, onChange }: TimerControlProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timer.running) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [timer.running]);

  const displayMs = getDisplayMs(timer, now);
  const isCountingDown = timer.mode === 'countdown';
  const isLow = isCountingDown && displayMs <= 60_000 && displayMs > 0;
  const isDone = isCountingDown && displayMs === 0;

  function handleSetMode(mode: TimerMode) {
    if (timer.running) return;
    onChange(setTimerMode(timer, mode));
  }

  function handleSetDurationMinutes(minutes: number) {
    onChange(setCountdownDuration(timer, minutes));
  }

  function handleStart() {
    onChange(startTimer(timer));
  }

  function handlePause() {
    onChange(pauseTimer(timer));
  }

  function handleReset() {
    onChange(resetTimer(timer));
  }

  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Button variant={timer.mode === 'stopwatch' ? 'primary' : 'outline'} size="sm" onClick={() => handleSetMode('stopwatch')} disabled={timer.running}>
          Stopwatch
        </Button>
        <Button variant={timer.mode === 'countdown' ? 'primary' : 'outline'} size="sm" onClick={() => handleSetMode('countdown')} disabled={timer.running}>
          Countdown
        </Button>
      </div>

      {isCountingDown && (
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs text-zinc-500">Minutes</label>
          <input
            type="number"
            min={0}
            disabled={timer.running}
            value={Math.round((timer.durationMs ?? 0) / 60_000)}
            onChange={(e) => handleSetDurationMinutes(Number(e.target.value) || 0)}
            className="w-16 rounded-lg bg-zinc-950/80 border border-zinc-700/80 text-zinc-100 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
      )}

      <p
        className={`text-4xl font-bold font-display tabular-nums mb-3 ${
          isDone ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-zinc-100'
        }`}
      >
        {formatDuration(displayMs)}
      </p>

      <div className="flex items-center gap-2">
        {timer.running ? (
          <Button variant="secondary" size="sm" onClick={handlePause}>
            <Pause className="w-3.5 h-3.5" /> Pause
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={handleStart}>
            <Play className="w-3.5 h-3.5" /> {timer.accumulatedMs > 0 ? 'Resume' : 'Start'}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </Button>
      </div>
    </div>
  );
}
