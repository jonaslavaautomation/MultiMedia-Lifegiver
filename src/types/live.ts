import type { SlideCanvasData } from '@/types';

export type TimerMode = 'stopwatch' | 'countdown';

export interface TimerState {
  mode: TimerMode;
  running: boolean;
  /** Epoch ms when the current run segment started/resumed; null while paused/stopped. */
  startedAt: number | null;
  /** Elapsed ms accumulated before the current run segment (for pause/resume). */
  accumulatedMs: number;
  /** Target duration for countdown mode; unused in stopwatch mode. */
  durationMs: number | null;
}

export const INITIAL_TIMER_STATE: TimerState = {
  mode: 'stopwatch',
  running: false,
  startedAt: null,
  accumulatedMs: 0,
  durationMs: null,
};

export interface LiveState {
  presentationTitle: string;
  slideIndex: number;
  totalSlides: number;
  currentContent: SlideCanvasData | null;
  nextContent: SlideCanvasData | null;
  blackout: boolean;
  timer: TimerState;
}

export type LiveMessage = { type: 'state'; state: LiveState } | { type: 'request-state' };

/**
 * Commands a Remote Control page (a phone/tablet on the Realtime channel)
 * sends to the operator, which is the only one that actually mutates
 * slide/blackout/timer state — the operator applies these via the exact
 * same functions its own UI buttons and keyboard shortcuts use, then
 * broadcasts the resulting LiveState back out (see PresentLivePage.tsx).
 */
export type RemoteCommand =
  | { type: 'command'; action: 'next' }
  | { type: 'command'; action: 'previous' }
  | { type: 'command'; action: 'goto'; slideIndex: number }
  | { type: 'command'; action: 'toggle-blackout' }
  | { type: 'command'; action: 'timer-start' }
  | { type: 'command'; action: 'timer-pause' }
  | { type: 'command'; action: 'timer-reset' }
  | { type: 'command'; action: 'timer-set-mode'; mode: TimerMode }
  | { type: 'command'; action: 'timer-set-duration'; minutes: number };

/** Everything that can travel over the Realtime (cross-device) channel. */
export type RealtimeLiveMessage = LiveMessage | RemoteCommand;
