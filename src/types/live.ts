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
  /**
   * The audience-facing OUTPUT position — what Projector/Overlay/Remote
   * should actually render. Equal to the operator's live position normally,
   * but pinned to the slide that was live when Freeze was engaged for as
   * long as freeze stays true, so those surfaces keep showing that frozen
   * frame regardless of where the operator has since navigated.
   */
  slideIndex: number;
  totalSlides: number;
  currentContent: SlideCanvasData | null;
  nextContent: SlideCanvasData | null;
  blackout: boolean;
  /** True while Freeze is engaged — see slideIndex/currentContent above. */
  freeze: boolean;
  /**
   * True while the Safe Slide (church logo) is being shown on audience-
   * facing outputs instead of the current slide — a calmer alternative to
   * Blackout for a planned pause (e.g. between services). Mutually
   * exclusive with blackout; turning one on turns the other off.
   */
  safeSlide: boolean;
  /**
   * The operator's real, ever-current position — never pinned by Freeze.
   * Exists purely for the Stage Display confidence monitor, which by design
   * must keep showing the team what's actually happening regardless of
   * Blackout OR Freeze (see StageDisplayPage.tsx) — everything else should
   * use slideIndex/currentContent/nextContent above instead.
   */
  liveSlideIndex: number;
  liveContent: SlideCanvasData | null;
  liveNextContent: SlideCanvasData | null;
  timer: TimerState;
}

/**
 * Commands a Remote Control page (a phone/tablet on the Realtime channel),
 * or a same-computer Projector/Stage Display window (on the local
 * BroadcastChannel), sends to the operator, which is the only one that
 * actually mutates slide/blackout/timer state — the operator applies these
 * via the exact same functions its own UI buttons and keyboard shortcuts
 * use, then broadcasts the resulting LiveState back out on both channels
 * (see PresentLivePage.tsx).
 */
export type RemoteCommand =
  | { type: 'command'; action: 'next' }
  | { type: 'command'; action: 'previous' }
  | { type: 'command'; action: 'goto'; slideIndex: number }
  | { type: 'command'; action: 'toggle-blackout' }
  | { type: 'command'; action: 'toggle-freeze' }
  | { type: 'command'; action: 'toggle-safe-slide' }
  | { type: 'command'; action: 'timer-start' }
  | { type: 'command'; action: 'timer-pause' }
  | { type: 'command'; action: 'timer-reset' }
  | { type: 'command'; action: 'timer-set-mode'; mode: TimerMode }
  | { type: 'command'; action: 'timer-set-duration'; minutes: number };

/**
 * A PresentLivePage instance announcing/acknowledging itself to any OTHER
 * operator console open for the same presentation — same-computer only
 * (BroadcastChannel, never sent over Realtime), purely to warn about the
 * "two operator tabs open at once, each an independent authoritative
 * broadcaster racing the other's commands" hazard. Not meaningful to
 * Projector/Stage/Overlay/Remote, which safely ignore any message type
 * they don't recognize.
 */
export type OperatorPresenceMessage =
  | { type: 'operator-announce'; instanceId: string }
  | { type: 'operator-ack'; instanceId: string };

/**
 * Everything that can travel over the local (same-computer BroadcastChannel)
 * channel — includes RemoteCommand so a Projector/Stage Display window can
 * post Next/Previous back to the operator, the same way the phone Remote
 * Control page already does over Realtime.
 */
export type LiveMessage =
  | { type: 'state'; state: LiveState }
  | { type: 'request-state' }
  | RemoteCommand
  | OperatorPresenceMessage;

/** Everything that can travel over the Realtime (cross-device) channel. */
export type RealtimeLiveMessage = LiveMessage | RemoteCommand;
