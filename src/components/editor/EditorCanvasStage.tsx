import { Loader2 } from 'lucide-react';
import type { SaveStatus } from '@/types/editor';

interface EditorCanvasStageProps {
  containerRef: (node: HTMLDivElement | null) => void;
  canvasElRef: (node: HTMLCanvasElement | null) => void;
  saveStatus: SaveStatus;
  loadingSlide: boolean;
  backgroundVideoUrl?: string | null;
}

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: 'All changes saved',
  pending: 'Unsaved changes',
  saving: 'Saving…',
  saved: 'All changes saved',
  error: 'Failed to save',
};

export function EditorCanvasStage({ containerRef, canvasElRef, saveStatus, loadingSlide, backgroundVideoUrl }: EditorCanvasStageProps) {
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
          <canvas ref={canvasElRef} className="relative" />
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
