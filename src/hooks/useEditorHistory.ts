import { useCallback, useRef, useState } from 'react';
import type { SlideCanvasData } from '@/types';

const MAX_HISTORY_LENGTH = 50;

interface UseEditorHistoryResult {
  canUndo: boolean;
  canRedo: boolean;
  /** Call after every settled canvas mutation with the slide's current serialized content. */
  push: (content: SlideCanvasData) => void;
  /** Replaces the whole history with a single entry — call once right after a slide finishes hydrating. */
  reset: (content: SlideCanvasData) => void;
  /** Returns the content to restore, or null if there's nothing to undo to. Moves the internal pointer back. */
  undo: () => SlideCanvasData | null;
  /** Returns the content to restore, or null if there's nothing to redo to. Moves the internal pointer forward. */
  redo: () => SlideCanvasData | null;
}

/**
 * Per-slide undo/redo as a plain index into a stack of full slide-content
 * snapshots (the same shape slides.content is persisted as) — like a
 * browser's back/forward list. Doesn't touch the canvas itself:
 * EditorWorkspace calls `push` after a settled mutation and applies
 * whatever `undo`/`redo` hands back via the exact same hydration path a
 * slide switch already uses, so restoring a step can never behave
 * differently from loading a slide fresh.
 *
 * Snapshotting whole-canvas JSON (rather than diffing) keeps this simple
 * and correct at the cost of memory — capped at MAX_HISTORY_LENGTH entries,
 * comfortably enough for one editing session on one slide. A fresh
 * `useEditorHistory()` instance per slide (or a `reset()` on slide switch)
 * is what keeps one slide's undo history from bleeding into another's.
 */
export function useEditorHistory(): UseEditorHistoryResult {
  const stackRef = useRef<SlideCanvasData[]>([]);
  const indexRef = useRef(-1);
  // Forces a re-render when canUndo/canRedo's *answer* changes — nothing
  // reads this value itself, the booleans below are recomputed fresh from
  // the refs on every render it triggers.
  const [, forceRender] = useState(0);
  const notify = useCallback(() => forceRender((n) => n + 1), []);

  const push = useCallback(
    (content: SlideCanvasData) => {
      // Discard any redo-able future — a new edit after undoing invalidates it.
      const truncated = stackRef.current.slice(0, indexRef.current + 1);
      truncated.push(content);
      if (truncated.length > MAX_HISTORY_LENGTH) truncated.shift();
      stackRef.current = truncated;
      indexRef.current = truncated.length - 1;
      notify();
    },
    [notify]
  );

  const reset = useCallback(
    (content: SlideCanvasData) => {
      stackRef.current = [content];
      indexRef.current = 0;
      notify();
    },
    [notify]
  );

  const undo = useCallback((): SlideCanvasData | null => {
    if (indexRef.current <= 0) return null;
    indexRef.current -= 1;
    notify();
    return stackRef.current[indexRef.current];
  }, [notify]);

  const redo = useCallback((): SlideCanvasData | null => {
    if (indexRef.current >= stackRef.current.length - 1) return null;
    indexRef.current += 1;
    notify();
    return stackRef.current[indexRef.current];
  }, [notify]);

  return {
    canUndo: indexRef.current > 0,
    canRedo: indexRef.current < stackRef.current.length - 1,
    push,
    reset,
    undo,
    redo,
  };
}
