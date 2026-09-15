import { Loader2 } from 'lucide-react';
import { MotionBackgroundPlayer } from '@/components/motion/MotionBackgroundPlayer';
import { SLIDE_WIDTH, SLIDE_HEIGHT } from '@/lib/editorConstants';
import type { GuideLine } from '@/lib/alignmentGuides';
import type { SaveStatus } from '@/types/editor';
import type { MotionPreset } from '@/types/motion';

interface EditorCanvasStageProps {
  containerRef: (node: HTMLDivElement | null) => void;
  canvasElRef: (node: HTMLCanvasElement | null) => void;
  saveStatus: SaveStatus;
  loadingSlide: boolean;
  backgroundVideoUrl?: string | null;
  backgroundMotion?: MotionPreset | null;
  /** Smart alignment guides to draw while dragging an object — see useAlignmentGuides.ts. */
  guides?: GuideLine[];
}

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: 'All changes saved',
  pending: 'Unsaved changes',
  saving: 'Saving…',
  saved: 'All changes saved',
  error: 'Failed to save',
};

export function EditorCanvasStage({ containerRef, canvasElRef, saveStatus, loadingSlide, backgroundVideoUrl, backgroundMotion, guides = [] }: EditorCanvasStageProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-end px-1 pb-2">
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border ${
            saveStatus === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : saveStatus === 'pending' || saveStatus === 'saving'
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-zinc-100 border-zinc-200 text-zinc-500'
          }`}
        >
          {saveStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
          {STATUS_LABEL[saveStatus]}
        </span>
      </div>

      {/* Dotted-grid backdrop the 16:9 artboard sits on, Canva/Figma-style — gives the canvas a sense of "floating" on an infinite workspace. */}
      <div
        className="flex-1 min-h-0 rounded-2xl border border-zinc-200 bg-canvas/60 p-4 sm:p-8 flex items-center justify-center"
        style={{
          backgroundImage: 'radial-gradient(rgba(182, 215, 47, 0.3) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <div
          ref={containerRef}
          className="relative w-full max-w-full rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xl shadow-zinc-400/30"
          style={{ aspectRatio: '16 / 9' }}
        >
          {backgroundMotion && (
            <MotionBackgroundPlayer key={backgroundMotion.id} preset={backgroundMotion} className="absolute inset-0" />
          )}
          {backgroundVideoUrl && (
            <video
              key={backgroundVideoUrl}
              src={backgroundVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/*
            This inner div's child list is intentionally static (always
            exactly one `<canvas>`, never conditional) — Fabric.js takes
            over the canvas element's *direct parent*, silently replacing
            its child list with its own wrapper + upper-canvas outside
            React's knowledge. If a conditionally-rendered sibling (the
            motion/video backgrounds above, or the loading overlay below)
            lived in that same parent, React would eventually try to
            insertBefore/removeChild against a reference node Fabric had
            already moved, throwing "not a child of this node". Giving
            canvas an isolated, structurally-never-changing parent sidesteps
            that entirely — React never needs to reconcile siblings inside
            a subtree Fabric has silently rewritten.
          */}
          <div className="absolute inset-0">
            <canvas ref={canvasElRef} className="relative" />
          </div>
          {/* Smart alignment guides — plain positioned overlays, not drawn on
              the Fabric canvas itself (see useAlignmentGuides.ts for why).
              Percentage-based against the always-16:9 SLIDE_WIDTH x
              SLIDE_HEIGHT logical space, so they're correct at any zoom
              without any transform math. pointer-events-none so they never
              intercept the drag they're providing feedback for. */}
          {guides.map((guide, i) =>
            guide.orientation === 'vertical' ? (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-pink-500 pointer-events-none"
                style={{ left: `${(guide.position / SLIDE_WIDTH) * 100}%` }}
              />
            ) : (
              <div
                key={i}
                className="absolute left-0 right-0 h-px bg-pink-500 pointer-events-none"
                style={{ top: `${(guide.position / SLIDE_HEIGHT) * 100}%` }}
              />
            )
          )}
          {loadingSlide && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
