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
