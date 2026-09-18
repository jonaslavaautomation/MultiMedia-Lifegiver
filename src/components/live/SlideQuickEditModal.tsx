import { useEffect, useRef, useState } from 'react';
import type { Textbox } from 'fabric';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MotionBackgroundPlayer } from '@/components/motion/MotionBackgroundPlayer';
import { FloatingContextualToolbar } from '@/components/editor/FloatingContextualToolbar';
import { useFabricCanvas } from '@/hooks/useFabricCanvas';
import { useSelectedObject } from '@/hooks/useSelectedObject';
import {
  applySolidBackground,
  createTextObject,
  deleteActiveObjects,
  serializeSlide,
  toggleInlineTextStyle,
} from '@/lib/fabricObjects';
import { resolveAndRenderSlide } from '@/lib/renderSlide';
import { isEmptySlideContent } from '@/lib/slideContent';
import { DEFAULT_SLIDE_BACKGROUND_COLOR } from '@/lib/editorConstants';
import { supabase } from '@/lib/supabase';
import type { Slide } from '@/types';
import type { MotionPreset } from '@/types/motion';

interface SlideQuickEditModalProps {
  /** The slide being edited. Rendered as `null` (closed) when there is none. */
  slide: Slide | null;
  onClose: () => void;
  /** Fired right after a successful save — caller merges the updated slide into its own list. */
  onSaved: (slide: Slide) => void;
}

/**
 * A lighter-weight sibling of the full slide editor (EditorWorkspace), meant
 * to be opened as an overlay from the Live Presentation operator console —
 * lets the operator fix a typo or nudge a text box on a slide without
 * leaving the live session. Deliberately narrower than the full editor: no
 * slide switching, no undo history, no asset panels — just the one slide's
 * canvas, the same contextual formatting toolbar, and Save/Cancel.
 *
 * Reuses the exact same rendering pipeline (resolveAndRenderSlide) and save
 * shape (serializeSlide + `slides` table update) as the full editor, so a
 * slide edited here is indistinguishable from one edited there.
 */
export function SlideQuickEditModal({ slide, onClose, onSaved }: SlideQuickEditModalProps) {
  const { containerRef, canvasElRef, canvas } = useFabricCanvas({ backgroundColor: DEFAULT_SLIDE_BACKGROUND_COLOR });
  const { selection, refreshSelection } = useSelectedObject(canvas);

  const [loadingContent, setLoadingContent] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [videoBackgroundUrl, setVideoBackgroundUrl] = useState<string | null>(null);
  const [backgroundMotion, setBackgroundMotion] = useState<MotionPreset | null>(null);

  const backgroundMediaIdRef = useRef<string | null>(null);
  const backgroundVideoEmbedUrlRef = useRef<string | null>(null);
  const backgroundMotionIdRef = useRef<string | null>(null);

  function markDirty() {
    setDirty(true);
  }

  // Hydrate the canvas from this slide's saved content every time a
  // (different) slide is opened for editing.
  useEffect(() => {
    if (!canvas || !slide) return;
    let cancelled = false;
    setLoadingContent(true);
    setDirty(false);
    setSaveError(null);
    canvas.discardActiveObject();
    canvas.clear();

    async function hydrate() {
      const content = slide!.content;
      if (isEmptySlideContent(content)) {
        applySolidBackground(canvas!, DEFAULT_SLIDE_BACKGROUND_COLOR);
        backgroundMediaIdRef.current = null;
        backgroundVideoEmbedUrlRef.current = null;
        backgroundMotionIdRef.current = null;
        if (cancelled) return;
        setVideoBackgroundUrl(null);
        setBackgroundMotion(null);
        setLoadingContent(false);
        return;
      }

      const { videoBackgroundUrl: videoUrl, motionBackground } = await resolveAndRenderSlide(canvas!, content);
      if (cancelled) return;
      backgroundMediaIdRef.current = content.meta?.backgroundMediaId ?? null;
      backgroundVideoEmbedUrlRef.current = content.meta?.backgroundVideoEmbedUrl ?? null;
      backgroundMotionIdRef.current = content.meta?.backgroundMotionId ?? null;
      setVideoBackgroundUrl(videoUrl);
      setBackgroundMotion(motionBackground);
      canvas!.requestRenderAll();
      setLoadingContent(false);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, slide?.id]);

  // Track edits made via dragging/resizing/typing so Cancel can warn before discarding them.
  useEffect(() => {
    if (!canvas) return;
    canvas.on('object:modified', markDirty);
    canvas.on('text:changed', markDirty);
    canvas.on('object:added', markDirty);
    canvas.on('object:removed', markDirty);
    return () => {
      canvas.off('object:modified', markDirty);
      canvas.off('text:changed', markDirty);
      canvas.off('object:added', markDirty);
      canvas.off('object:removed', markDirty);
    };
  }, [canvas]);

  // Delete/Backspace — same guards as the full editor's shortcut (skip while
  // typing in a textbox, or in any input/textarea/contentEditable).
  useEffect(() => {
    if (!canvas) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const active = canvas!.getActiveObject();
      if (!active) return;
      if ('isEditing' in active && (active as { isEditing?: boolean }).isEditing) return;
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement | null)?.isContentEditable) return;

      e.preventDefault();
      deleteActiveObjects(canvas!);
      markDirty();
      refreshSelection();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvas, refreshSelection]);

  // Arrow-key nudge — mirrors EditorWorkspace's version.
  useEffect(() => {
    if (!canvas) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const active = canvas!.getActiveObject();
      if (!active) return;
      if ('isEditing' in active && (active as { isEditing?: boolean }).isEditing) return;
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement | null)?.isContentEditable) return;

      e.preventDefault();
      const step = (e.shiftKey ? 10 : 1) / canvas!.getZoom();
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      active.set({ left: (active.left ?? 0) + dx, top: (active.top ?? 0) + dy });
      active.setCoords();
      canvas!.requestRenderAll();
      markDirty();
      refreshSelection();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvas, refreshSelection]);

  // Ctrl/Cmd+B/I/U — see the matching handler + comment in EditorWorkspace.tsx.
  useEffect(() => {
    if (!canvas) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key !== 'b' && key !== 'i' && key !== 'u') return;

      const active = canvas!.getActiveObject();
      if (!active || active.type !== 'textbox') return;
      const isEditingTextbox = 'isEditing' in active && (active as { isEditing?: boolean }).isEditing;

      if (!isEditingTextbox) {
        const tag = document.activeElement?.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement | null)?.isContentEditable) return;
      }

      e.preventDefault();
      const kind = key === 'b' ? 'bold' : key === 'i' ? 'italic' : 'underline';
      toggleInlineTextStyle(active as Textbox, kind);
      canvas!.requestRenderAll();
      markDirty();
      refreshSelection();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvas, refreshSelection]);

  function handleAddText() {
    if (!canvas) return;
    const textbox = createTextObject(canvas);
    markDirty();
    refreshSelection();
    textbox.enterEditing();
    textbox.selectAll();
  }

  function requestClose() {
    if (dirty && !window.confirm('Discard unsaved changes to this slide?')) return;
    onClose();
  }

  // Escape closes the modal — unless a textbox is actively being edited, in
  // which case the first Escape should just exit text-editing (Fabric's own
  // default behavior), matching how Escape behaves in the full editor.
  useEffect(() => {
    if (!slide) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      const active = canvas?.getActiveObject();
      if (active && 'isEditing' in active && (active as { isEditing?: boolean }).isEditing) return;
      requestClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide, canvas, dirty]);

  async function handleSave() {
    if (!canvas || !slide) return;
    setSaving(true);
    setSaveError(null);
    try {
      const content = serializeSlide(canvas, backgroundMediaIdRef.current, backgroundVideoEmbedUrlRef.current, backgroundMotionIdRef.current);
      const { error } = await supabase.from('slides').update({ content }).eq('id', slide.id);
      if (error) throw error;
      onSaved({ ...slide, content });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save this slide.');
    } finally {
      setSaving(false);
    }
  }

  if (!slide) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-3 border-b border-hud-border bg-hud-panel/95">
        <div className="min-w-0">
          <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">Quick Edit</p>
          <h2 className="text-sm font-semibold text-zinc-100 truncate">{slide.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {saveError && <span className="text-xs text-red-400">{saveError}</span>}
          {dirty && !saving && <span className="text-xs text-amber-400">Unsaved changes</span>}
          <Button variant="outline" size="sm" onClick={handleAddText} disabled={loadingContent}>
            + Text
          </Button>
          <Button variant="ghost" size="sm" onClick={requestClose}>
            <X className="w-4 h-4" /> Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || loadingContent}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 p-4 lg:p-6 overflow-auto">
        <div className="w-full max-w-4xl">
          <FloatingContextualToolbar canvas={canvas} selection={selection} refreshSelection={refreshSelection} markDirty={markDirty} />
        </div>
        <div className="relative w-full max-w-4xl" style={{ aspectRatio: '16 / 9' }}>
          <div ref={containerRef} className="relative w-full h-full rounded-2xl border border-zinc-700 bg-black overflow-hidden shadow-2xl">
            {backgroundMotion && <MotionBackgroundPlayer key={backgroundMotion.id} preset={backgroundMotion} className="absolute inset-0" />}
            {videoBackgroundUrl && (
              <video
                key={videoBackgroundUrl}
                src={videoBackgroundUrl}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {/* Isolated, structurally-static parent for the canvas — see the matching comment in EditorCanvasStage.tsx for why this can't just be a plain sibling of the motion/video layers. */}
            <div className="absolute inset-0">
              <canvas ref={canvasElRef} className="relative" />
            </div>
            {loadingContent && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="w-6 h-6 text-zinc-300 animate-spin" />
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Double-click a text box to edit its wording · Delete to remove the selected object · Esc to close
        </p>
      </div>
    </div>
  );
}
