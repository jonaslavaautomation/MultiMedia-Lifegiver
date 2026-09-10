import type { TimerMode, TimerState } from '@/types/live';

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

/**
 * Pure state-transition functions for the timer. Used both by the
 * on-screen TimerControl buttons and by the operator's remote-command
 * handler (src/pages/PresentLivePage.tsx), so a "pause" triggered from a
 * phone behaves identically to clicking Pause locally.
 */

export function startTimer(timer: TimerState): TimerState {
  return { ...timer, running: true, startedAt: Date.now() };
}

export function pauseTimer(timer: TimerState): TimerState {
  const elapsedSinceStart = timer.startedAt != null ? Date.now() - timer.startedAt : 0;
  return { ...timer, running: false, startedAt: null, accumulatedMs: timer.accumulatedMs + elapsedSinceStart };
}

export function resetTimer(timer: TimerState): TimerState {
  return { ...timer, running: false, startedAt: null, accumulatedMs: 0 };
}

export function setTimerMode(timer: TimerState, mode: TimerMode): TimerState {
  return { ...timer, mode, startedAt: null, accumulatedMs: 0 };
}

export function setCountdownDuration(timer: TimerState, minutes: number): TimerState {
  return { ...timer, durationMs: Math.max(0, minutes) * 60_000 };
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
