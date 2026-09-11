import type { RefObject } from 'react';
import { Loader2 } from 'lucide-react';
import type { SaveStatus } from '@/types/editor';

interface EditorCanvasStageProps {
  containerRef: RefObject<HTMLDivElement>;
  canvasElRef: RefObject<HTMLCanvasElement>;
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
              ? 'bg-red-950/40 border-red-900/50 text-red-300'
              : saveStatus === 'pending' || saveStatus === 'saving'
                ? 'bg-amber-950/40 border-amber-900/50 text-amber-300'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-500'
          }`}
        >
          {saveStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
          {STATUS_LABEL[saveStatus]}
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden"
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
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
