import { useState } from 'react';
import { Plus, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { SlideCanvasRenderer } from '@/components/live/SlideCanvasRenderer';
import type { Slide } from '@/types';

interface SlideFilmstripProps {
  slides: Slide[];
  currentSlideId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void | Promise<void>;
  onDuplicate: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

export function SlideFilmstrip({ slides, currentSlideId, onSelect, onAdd, onDuplicate, onDelete }: SlideFilmstripProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Slide | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function run(action: () => void | Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      console.error('Slide action failed:', err);
      setError('That action failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete slide failed:', err);
      setError('Failed to delete slide. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 lg:w-44 lg:shrink-0">
      {error && <Alert message={error} />}

      <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto lg:max-h-[560px] pb-1 lg:pb-0">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`group relative shrink-0 w-28 lg:w-full rounded-xl border cursor-pointer transition-all overflow-hidden ${
              slide.id === currentSlideId
                ? 'border-brand-500 ring-2 ring-brand-500/30'
                : 'border-zinc-800/80 hover:border-zinc-700'
            }`}
            onClick={() => onSelect(slide.id)}
          >
            <div className="relative min-w-0">
              <SlideCanvasRenderer content={slide.content} className="bg-zinc-900/60" />
              <span className="absolute top-1 left-1.5 text-[10px] text-zinc-400 bg-zinc-950/70 rounded px-1 py-0.5 pointer-events-none">
                {index + 1}
              </span>
            </div>
            <div className="px-2 py-1 bg-zinc-950/80 flex items-center justify-between gap-1">
              <p className="text-[10px] text-zinc-400 truncate flex-1">{slide.title}</p>
              <div className="hidden group-hover:flex items-center gap-0.5">
                <button
                  type="button"
                  title="Duplicate slide"
                  onClick={(e) => {
                    e.stopPropagation();
                    run(() => onDuplicate(slide.id));
                  }}
                  disabled={busy}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-200"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Delete slide"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (slides.length > 1) setDeleteTarget(slide);
                  }}
                  disabled={busy || slides.length <= 1}
                  className="p-1 rounded text-zinc-500 hover:text-red-400 disabled:opacity-30 disabled:hover:text-zinc-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={() => run(onAdd)} disabled={busy} className="justify-center">
        <Plus className="w-3.5 h-3.5" /> Add Slide
      </Button>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Slide"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-400 leading-relaxed">
          Are you sure you want to delete <span className="font-semibold text-zinc-200">{deleteTarget?.title}</span>?
          This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
