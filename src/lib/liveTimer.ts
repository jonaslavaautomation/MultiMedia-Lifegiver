import type { TimerState } from '@/types/live';

/** Elapsed ms since the timer was (re)started, independent of stopwatch/countdown mode. */
export function getElapsedMs(timer: TimerState, now: number = Date.now()): number {
  if (!timer.running || timer.startedAt == null) return timer.accumulatedMs;
  return timer.accumulatedMs + (now - timer.startedAt);
}

/** The value that should actually be displayed — counts down for countdown mode, up otherwise. */
export function getDisplayMs(timer: TimerState, now: number = Date.now()): number {
  const elapsed = getElapsedMs(timer, now);
  if (timer.mode === 'countdown' && timer.durationMs != null) {
    return Math.max(0, timer.durationMs - elapsed);
  }
  return elapsed;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}
