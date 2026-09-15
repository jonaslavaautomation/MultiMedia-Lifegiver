import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFabricCanvas } from '@/hooks/useFabricCanvas';
import { useSelectedObject } from '@/hooks/useSelectedObject';
import { useEditorHistory } from '@/hooks/useEditorHistory';
import { useAlignmentGuides } from '@/hooks/useAlignmentGuides';
import {
  applyImageBackground,
  applySolidBackground,
  clearBackgroundForVideo,
  createImageObjectFromUrl,
  createTextObject,
  deleteActiveObjects,
  serializeSlide,
} from '@/lib/fabricObjects';
import { resolveAndRenderSlide } from '@/lib/renderSlide';
import { createBlankSlideContent, isEmptySlideContent } from '@/lib/slideContent';
import { getMediaSignedUrl } from '@/lib/mediaStorage';
import { getMotionPresetById } from '@/lib/motionLibrary';
import { saveSlideDraft, loadSlideDraft, clearSlideDraft } from '@/lib/offlineStore';
import type { MotionPreset } from '@/types/motion';
import { AUTOSAVE_DELAY_MS, HISTORY_DEBOUNCE_MS, DEFAULT_SLIDE_BACKGROUND_COLOR } from '@/lib/editorConstants';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { EditorCanvasStage } from '@/components/editor/EditorCanvasStage';
import { SlideFilmstrip } from '@/components/editor/SlideFilmstrip';
import { BackgroundPickerModal } from '@/components/editor/BackgroundPickerModal';
import { EditorNavRail, type EditorPanelKind } from '@/components/editor/EditorNavRail';
import { EditorAssetDrawer } from '@/components/editor/EditorAssetDrawer';
import { FloatingContextualToolbar } from '@/components/editor/FloatingContextualToolbar';
import { TemplatesPanel } from '@/components/editor/panels/TemplatesPanel';
import { BiblePanel } from '@/components/editor/panels/BiblePanel';
import { SongsPanel } from '@/components/editor/panels/SongsPanel';
import { ElementsPanel } from '@/components/editor/panels/ElementsPanel';
import { TextPanel } from '@/components/editor/panels/TextPanel';
import { MediaPanel } from '@/components/editor/panels/MediaPanel';
import { BrandPanel } from '@/components/editor/panels/BrandPanel';
import { Alert } from '@/components/ui/Alert';
import type { MediaItem, Slide, SlideCanvasData } from '@/types';
import type { SaveStatus } from '@/types/editor';

interface EditorWorkspaceProps {
  presentationId: string;
}

export function EditorWorkspace({ presentationId }: EditorWorkspaceProps) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentSlideId, setCurrentSlideId] = useState<string | null>(null);
  const [loadingSlide, setLoadingSlide] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [backgroundVideoUrl, setBackgroundVideoUrl] = useState<string | null>(null);
  const [backgroundMotion, setBackgroundMotion] = useState<MotionPreset | null>(null);
  const [activePanel, setActivePanel] = useState<EditorPanelKind | null>(null);

  const { containerRef, canvasElRef, canvas } = useFabricCanvas({ backgroundColor: DEFAULT_SLIDE_BACKGROUND_COLOR });
  const { selection, refreshSelection } = useSelectedObject(canvas);
  const { canUndo, canRedo, push: pushHistory, reset: resetHistory, undo: undoHistory, redo: redoHistory } = useEditorHistory();
  const alignmentGuides = useAlignmentGuides(canvas);

  const slidesRef = useRef<Slide[]>([]);
  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  const currentSlideIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentSlideIdRef.current = currentSlideId;
  }, [currentSlideId]);

  const isLoadingSlideRef = useRef(false);
  const switchingSlideRef = useRef(false);
  const dirtyRef = useRef(false);
  const backgroundMediaIdRef = useRef<string | null>(null);
  const backgroundVideoEmbedUrlRef = useRef<string | null>(null);
  const backgroundMotionIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True only while an undo/redo is itself applying a snapshot — suppresses
  // the object:added/etc. events that generates from being recorded as a
  // *new* history entry (which would otherwise corrupt the undo/redo stack).
  const isRestoringHistoryRef = useRef(false);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSlides = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from('slides')
      .select('*')
      .eq('presentation_id', presentationId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching slides:', error.message);
      setLoadError('Failed to load slides. Please try again.');
      setLoading(false);
      return;
    }

    const fetched = (data as Slide[]) ?? [];
    setSlides(fetched);
    setCurrentSlideId((prev) => prev ?? fetched[0]?.id ?? null);
    setLoading(false);
  }, [presentationId]);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  // --- Save --------------------------------------------------------------

  const flushSave = useCallback(async () => {
    if (!canvas || !currentSlideIdRef.current) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setSaveStatus('saving');
    const slideId = currentSlideIdRef.current;
    const content = serializeSlide(canvas, backgroundMediaIdRef.current, backgroundVideoEmbedUrlRef.current, backgroundMotionIdRef.current);

    const { error } = await supabase
      .from('slides')
      .update({ content, background_id: backgroundMediaIdRef.current })
      .eq('id', slideId);

    if (error) {
      console.error('Error saving slide:', error.message);
      setSaveStatus('error');
      setSaveError('Failed to save this slide.');
      return; // dirtyRef stays true — next autosave tick / explicit retry re-attempts
    }

    dirtyRef.current = false;
    setSaveStatus('saved');
    setSaveError(null);
    setSlides((prev) =>
      prev.map((s) => (s.id === slideId ? { ...s, content, background_id: backgroundMediaIdRef.current } : s))
    );
    // The local crash-safe draft (see markDirty below) is now redundant —
    // Supabase has this exact content confirmed saved.
    void clearSlideDraft(slideId);
  }, [canvas]);

  const flushSaveRef = useRef(flushSave);
  useEffect(() => {
    flushSaveRef.current = flushSave;
  }, [flushSave]);

  // The one place anything that mutates the current slide's content calls
  // into: schedules a debounced autosave AND a debounced undo/redo step.
  // Unifying both here (rather than pushing history only from a canvas
  // object:added/removed/modified/text:changed listener) matters because a
  // lot of edits never fire those Fabric events at all — the toolbar's
  // color/opacity/shadow/bold/font/etc. controls call `.set()` directly,
  // which markDirty already had to be called manually for anyway (see
  // FloatingContextualToolbar.tsx/BrandPanel.tsx) but Fabric's own
  // object:modified is only ever emitted by its interactive transform
  // controls, not by a plain property setter — so those edits would
  // otherwise be saved but silently NOT undoable.
  //
  // History is debounced (unlike the dirty flag/save-status, which flip
  // immediately) so a burst of keystrokes, or several toolbar clicks in a
  // row, collapses into one undo step instead of one per call — see
  // HISTORY_DEBOUNCE_MS.
  const markDirty = useCallback(() => {
    if (isLoadingSlideRef.current) return;
    dirtyRef.current = true;
    setSaveStatus('pending');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void flushSaveRef.current();
    }, AUTOSAVE_DELAY_MS);

    if (!canvas) return;
    // Serialized once and reused below for both the local draft (written
    // immediately) and the debounced history step — safe to share since
    // nothing else can mutate the canvas between now and either firing
    // (any further edit would itself call markDirty again first, replacing
    // this capture with a fresher one).
    const content = serializeSlide(canvas, backgroundMediaIdRef.current, backgroundVideoEmbedUrlRef.current, backgroundMotionIdRef.current);

    // Crash-safe local draft — written to IndexedDB right now, well before
    // the debounced Supabase autosave above actually fires AUTOSAVE_DELAY_MS
    // from now. If the browser closes/crashes/loses power in that window
    // (or Supabase is simply unreachable), the edit isn't lost: opening this
    // slide again finds this draft and restores + re-attempts saving it
    // (see the hydration effect below and offlineStore.ts).
    if (currentSlideIdRef.current) {
      void saveSlideDraft(currentSlideIdRef.current, content, backgroundMediaIdRef.current);
    }

    if (isRestoringHistoryRef.current) return;
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      pushHistory(content);
    }, HISTORY_DEBOUNCE_MS);
  }, [canvas, pushHistory]);

  // Only cleans up a pending history-commit timer on unmount — markDirty
  // above (not this effect) is what actually schedules/clears it.
  useEffect(() => {
    return () => {
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    };
  }, []);

  // Canvas mutation -> dirty + a debounced undo/redo step (both via
  // markDirty above). loadFromJSON also fires object:added, but the
  // isLoadingSlideRef guard (initial slide hydration) and
  // isRestoringHistoryRef guard (an undo/redo applying its own snapshot)
  // keep either of those from being recorded as a spurious autosave or a
  // new history entry that would corrupt the undo/redo stack.
  useEffect(() => {
    if (!canvas) return;
    const handler = () => markDirty();
    canvas.on('object:added', handler);
    canvas.on('object:removed', handler);
    canvas.on('object:modified', handler);
    canvas.on('text:changed', handler);
    return () => {
      canvas.off('object:added', handler);
      canvas.off('object:removed', handler);
      canvas.off('object:modified', handler);
      canvas.off('text:changed', handler);
    };
  }, [canvas, markDirty]);

  // Best-effort save on unmount and on tab close.
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (dirtyRef.current) void flushSaveRef.current();
    };
  }, []);

  // Global Delete/Backspace — guarded against text editing and other inputs on the page.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!canvas) return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;

      const active = canvas.getActiveObject();
      if (!active) return;
      if ('isEditing' in active && (active as { isEditing?: boolean }).isEditing) return;

      const tag = document.activeElement?.tagName.toLowerCase();
      // Also covers any contentEditable region generically (not just
      // <input>/<textarea> by tag name) — future-proofing against anything
      // that uses contenteditable instead, on top of the isEditing check
      // above already covering Fabric's own hidden-textarea text editing.
      if (tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement | null)?.isContentEditable) return;

      e.preventDefault();
      deleteActiveObjects(canvas);
      markDirty();
      refreshSelection();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvas, markDirty, refreshSelection]);

  // Arrow-key nudge — moves the current selection by roughly 1 on-screen
  // pixel per press (10 with Shift), computed from the current zoom so it
  // feels the same regardless of how zoomed in/out the editor view is,
  // rather than a fixed number of logical canvas units (which at this
  // canvas's fixed 1920-wide logical space would be imperceptibly small
  // on screen at typical zoom levels). Same guards as the Delete/Backspace
  // handler above: works on both a single object and a multi-selection
  // (Fabric's ActiveSelection supports the same left/top set() as one
  // object), but not while actually typing in a textbox or a page input.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!canvas) return;
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      const active = canvas.getActiveObject();
      if (!active) return;
      if ('isEditing' in active && (active as { isEditing?: boolean }).isEditing) return;

      const tag = document.activeElement?.tagName.toLowerCase();
      // Also covers any contentEditable region generically (not just
      // <input>/<textarea> by tag name) — future-proofing against anything
      // that uses contenteditable instead, on top of the isEditing check
      // above already covering Fabric's own hidden-textarea text editing.
      if (tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement | null)?.isContentEditable) return;

      e.preventDefault();
      const step = (e.shiftKey ? 10 : 1) / canvas.getZoom();
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      active.set({ left: (active.left ?? 0) + dx, top: (active.top ?? 0) + dy });
      active.setCoords();
      canvas.requestRenderAll();
      markDirty();
      refreshSelection();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvas, markDirty, refreshSelection]);

  // Canva-style click-to-add: clicking empty canvas (not an existing object,
  // and not a rubber-band drag-select) drops a new text box right there,
  // already in edit mode ready to type — instead of only being addable via
  // the "Text" toolbar button.
  useEffect(() => {
    if (!canvas) return;
    let downPoint: { x: number; y: number } | null = null;

    function handleMouseDown(opt: { target?: unknown; scenePoint: { x: number; y: number } }) {
      downPoint = opt.target ? null : { x: opt.scenePoint.x, y: opt.scenePoint.y };
    }

    function handleMouseUp(opt: { target?: unknown; scenePoint: { x: number; y: number } }) {
      const start = downPoint;
      downPoint = null;
      if (!start || opt.target) return;
      // Guard against a click landing between hydrate()'s canvas.clear() and
      // its loadFromJSON finishing — the loading overlay covers the canvas
      // for this in the common case, but this is a cheap, direct guard
      // against the underlying race (an object added here would otherwise
      // be silently wiped out the instant the new slide's JSON loads).
      if (isLoadingSlideRef.current) return;

      const dx = opt.scenePoint.x - start.x;
      const dy = opt.scenePoint.y - start.y;
      const isClick = Math.sqrt(dx * dx + dy * dy) < 6; // otherwise it was a rubber-band drag-select
      if (!isClick) return;

      const textbox = createTextObject(canvas!, undefined, { centerAt: { x: start.x, y: start.y } });
      markDirty();
      refreshSelection();
      textbox.enterEditing();
      textbox.selectAll();
    }

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:up', handleMouseUp);
    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [canvas, markDirty, refreshSelection]);

  // --- Slide hydration on switch ------------------------------------------

  // Populates the canvas (objects + background) from a slide-content
  // snapshot — shared by the slide-switch hydration effect below AND by
  // undo/redo (applyHistorySnapshot), so restoring a history step can never
  // behave differently from loading a slide fresh. `shouldAbort` lets a
  // caller bail after the async background-resolution gap (only the slide
  // switch effect needs this, to avoid a stale/superseded hydration writing
  // state after a fast slide-to-slide switch); undo/redo has nothing to race
  // against, so it just omits it.
  async function applySnapshotToCanvas(content: SlideCanvasData, shouldAbort: () => boolean = () => false) {
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.clear();

    if (isEmptySlideContent(content)) {
      applySolidBackground(canvas, DEFAULT_SLIDE_BACKGROUND_COLOR);
      backgroundMediaIdRef.current = null;
      backgroundVideoEmbedUrlRef.current = null;
      backgroundMotionIdRef.current = null;
      setBackgroundVideoUrl(null);
      setBackgroundMotion(null);
      return;
    }

    // Shared with the read-only Present-mode renderer (src/lib/renderSlide.ts)
    // so the two never render a slide differently from each other.
    const { videoBackgroundUrl, motionBackground } = await resolveAndRenderSlide(canvas, content);
    if (shouldAbort()) return;

    backgroundMediaIdRef.current = content.meta?.backgroundMediaId ?? null;
    backgroundVideoEmbedUrlRef.current = content.meta?.backgroundVideoEmbedUrl ?? null;
    backgroundMotionIdRef.current = content.meta?.backgroundMotionId ?? null;
    setBackgroundVideoUrl(videoBackgroundUrl);
    setBackgroundMotion(motionBackground);
    canvas.requestRenderAll();
  }

  useEffect(() => {
    if (!canvas || !currentSlideId) return;
    const slide = slidesRef.current.find((s) => s.id === currentSlideId);
    if (!slide) return;

    let cancelled = false;

    async function hydrate() {
      isLoadingSlideRef.current = true;
      setLoadingSlide(true);

      // A local draft only ever exists here because the last edit to this
      // slide was never confirmed saved to Supabase (flushSave clears it on
      // every success) — a crash, a closed tab, or an offline gap. Prefer
      // it over Supabase's copy rather than silently discarding it.
      const draft = await loadSlideDraft(slide!.id);
      if (cancelled) return;
      const contentToLoad = draft?.content ?? slide!.content;

      await applySnapshotToCanvas(contentToLoad, () => cancelled);
      if (cancelled) return;

      if (draft) {
        // Still genuinely unsaved — let the existing autosave path pick it
        // back up and retry sending it to Supabase, same as any other edit.
        dirtyRef.current = true;
        setSaveStatus('pending');
        setSaveError(null);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          void flushSaveRef.current();
        }, AUTOSAVE_DELAY_MS);
      } else {
        dirtyRef.current = false;
        setSaveStatus('idle');
        setSaveError(null);
      }
      isLoadingSlideRef.current = false;
      setLoadingSlide(false);
      refreshSelection();
      resetHistory(contentToLoad); // fresh, independent undo/redo stack per slide
    }

    hydrate();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlideId, canvas]);

  // --- Undo / redo -----------------------------------------------------------

  async function applyHistorySnapshot(content: SlideCanvasData) {
    isRestoringHistoryRef.current = true;
    try {
      await applySnapshotToCanvas(content);
      refreshSelection();
      markDirty(); // undo/redo is itself an edit — it still needs to be (auto)saved
    } finally {
      isRestoringHistoryRef.current = false;
    }
  }

  function handleUndo() {
    const target = undoHistory();
    if (target) void applyHistorySnapshot(target);
  }

  function handleRedo() {
    const target = redoHistory();
    if (target) void applyHistorySnapshot(target);
  }

  // --- Templates ---------------------------------------------------------

  // Applying a template is just a big ordinary edit — unlike undo/redo it's
  // deliberately NOT wrapped in isRestoringHistoryRef, so the normal
  // debounced history-commit effect picks it up like any other mutation
  // and it's undoable via Ctrl/Cmd+Z same as anything else.
  async function handleApplyTemplate(content: SlideCanvasData) {
    await applySnapshotToCanvas(content);
    markDirty();
    refreshSelection();
  }

  function getCurrentSlideContent(): SlideCanvasData | null {
    if (!canvas) return null;
    return serializeSlide(canvas, backgroundMediaIdRef.current, backgroundVideoEmbedUrlRef.current, backgroundMotionIdRef.current);
  }

  // Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z (or Ctrl+Y) to redo — mirrors the
  // Delete/Backspace handler's guards: skip while actively typing in a
  // Fabric textbox (its own in-progress edit should use the browser's native
  // undo) or while focus is in a plain input/textarea elsewhere on the page.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!canvas) return;
      const isUndoKey = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
      const isRedoKey = (e.metaKey || e.ctrlKey) && ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y');
      if (!isUndoKey && !isRedoKey) return;

      const active = canvas.getActiveObject();
      if (active && 'isEditing' in active && (active as { isEditing?: boolean }).isEditing) return;

      const tag = document.activeElement?.tagName.toLowerCase();
      // Also covers any contentEditable region generically (not just
      // <input>/<textarea> by tag name) — future-proofing against anything
      // that uses contenteditable instead, on top of the isEditing check
      // above already covering Fabric's own hidden-textarea text editing.
      if (tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement | null)?.isContentEditable) return;

      e.preventDefault();
      if (isUndoKey) handleUndo();
      else handleRedo();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, undoHistory, redoHistory, markDirty, refreshSelection]);

  // --- Slide navigation / CRUD ---------------------------------------------

  async function switchToSlide(nextId: string) {
    // Re-entrancy guard: without it, two quick clicks on different filmstrip
    // thumbnails could both read the same stale dirtyRef.current === true and
    // both call flushSave() concurrently (duplicate writes to the same slide
    // row), with the final currentSlideId decided by whichever finishes last
    // rather than the user's actual last click.
    if (nextId === currentSlideId || switchingSlideRef.current) return;
    switchingSlideRef.current = true;
    try {
      if (dirtyRef.current) await flushSave();
      setCurrentSlideId(nextId);
    } finally {
      switchingSlideRef.current = false;
    }
  }

  async function handleAddSlide() {
    if (dirtyRef.current) await flushSave();
    const maxOrder = slides.reduce((max, s) => Math.max(max, s.sort_order), -1);

    // Carries over the current slide's background (color/image/video/motion)
    // onto the new slide instead of always starting from the plain default —
    // Duplicate already exists for copying everything including
    // text/shapes; Add Slide should still start empty, but not force
    // re-picking the same background for every slide in a run (e.g. several
    // verse or lyric slides meant to share one look).
    const newSlideContent: SlideCanvasData = canvas
      ? { ...serializeSlide(canvas, backgroundMediaIdRef.current, backgroundVideoEmbedUrlRef.current, backgroundMotionIdRef.current), objects: [] }
      : createBlankSlideContent();

    const { data, error } = await supabase
      .from('slides')
      .insert({
        presentation_id: presentationId,
        title: `Slide ${slides.length + 1}`,
        content: newSlideContent,
        background_id: backgroundMediaIdRef.current,
        sort_order: maxOrder + 1,
      })
      .select('*')
      .maybeSingle();

    if (error || !data) throw new Error(error?.message ?? 'Failed to add slide');

    const newSlide = data as Slide;
    setSlides((prev) => [...prev, newSlide]);
    setCurrentSlideId(newSlide.id);
  }

  async function handleDuplicateSlide(id: string) {
    const source = slides.find((s) => s.id === id);
    if (!source) return;

    let latestSource = source;
    if (id === currentSlideId) {
      if (dirtyRef.current) await flushSave();
      // Read straight off the live canvas rather than slidesRef.current —
      // that ref is only kept in sync by a separate effect, which may not
      // have committed yet by the time this awaited flushSave() resolves,
      // so it can serve stale (pre-edit) content. Serializing directly here
      // can never be stale.
      if (canvas) {
        latestSource = {
          ...source,
          content: serializeSlide(canvas, backgroundMediaIdRef.current, backgroundVideoEmbedUrlRef.current, backgroundMotionIdRef.current),
          background_id: backgroundMediaIdRef.current,
        };
      }
    }

    const maxOrder = slides.reduce((max, s) => Math.max(max, s.sort_order), -1);

    const { data, error } = await supabase
      .from('slides')
      .insert({
        presentation_id: presentationId,
        title: `${latestSource.title} (Copy)`,
        content: latestSource.content,
        background_id: latestSource.background_id,
        sort_order: maxOrder + 1,
      })
      .select('*')
      .maybeSingle();

    if (error || !data) throw new Error(error?.message ?? 'Failed to duplicate slide');

    const newSlide = data as Slide;
    setSlides((prev) => [...prev, newSlide]);
    setCurrentSlideId(newSlide.id);
  }

  async function handleDeleteSlide(id: string) {
    if (slides.length <= 1) return;

    const { error } = await supabase.from('slides').delete().eq('id', id);
    if (error) throw new Error(error.message);

    const remaining = slides.filter((s) => s.id !== id);
    setSlides(remaining);

    if (id === currentSlideId) {
      dirtyRef.current = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setCurrentSlideId(remaining[0]?.id ?? null);
    }
  }

  // --- Toolbar actions that need Supabase/media resolution -----------------

  async function handleInsertImage(url: string, mediaId?: string) {
    if (!canvas) return;
    await createImageObjectFromUrl(canvas, url, { mediaId });
    markDirty();
    refreshSelection();
  }

  async function handleInsertMediaItem(item: MediaItem) {
    const signedUrl = await getMediaSignedUrl(item.url);
    if (!signedUrl) {
      setSaveError('Failed to load that image.');
      setSaveStatus('error');
      return;
    }
    await handleInsertImage(signedUrl, item.id);
  }

  function handleBackgroundColor(hex: string) {
    if (!canvas) return;
    applySolidBackground(canvas, hex);
    backgroundMediaIdRef.current = null;
    backgroundVideoEmbedUrlRef.current = null;
    backgroundMotionIdRef.current = null;
    setBackgroundVideoUrl(null);
    setBackgroundMotion(null);
    markDirty();
  }

  async function handleBackgroundMedia(item: MediaItem) {
    if (!canvas) return;
    const signedUrl = await getMediaSignedUrl(item.url);
    if (!signedUrl) {
      setSaveError(`Failed to load that ${item.type}.`);
      setSaveStatus('error');
      return;
    }

    if (item.type === 'video') {
      clearBackgroundForVideo(canvas);
      setBackgroundVideoUrl(signedUrl);
    } else {
      await applyImageBackground(canvas, signedUrl);
      setBackgroundVideoUrl(null);
    }

    backgroundMediaIdRef.current = item.id;
    backgroundVideoEmbedUrlRef.current = null;
    backgroundMotionIdRef.current = null;
    setBackgroundMotion(null);
    markDirty();
  }

  function handleBackgroundEmbedUrl(url: string) {
    if (!canvas) return;
    clearBackgroundForVideo(canvas);
    setBackgroundVideoUrl(url);
    backgroundMediaIdRef.current = null;
    backgroundVideoEmbedUrlRef.current = url;
    backgroundMotionIdRef.current = null;
    setBackgroundMotion(null);
    markDirty();
  }

  function handleBackgroundMotion(motionId: string) {
    if (!canvas) return;
    const preset = getMotionPresetById(motionId);
    if (!preset) return;

    clearBackgroundForVideo(canvas); // same "transparent canvas" treatment as video/embed backgrounds
    setBackgroundMotion(preset);
    setBackgroundVideoUrl(null);

    backgroundMediaIdRef.current = null;
    backgroundVideoEmbedUrlRef.current = null;
    backgroundMotionIdRef.current = motionId;
    markDirty();
  }

  // --- Render ---------------------------------------------------------------

  if (loading) {
    return (
      <div className="mt-2">
        <div className="h-12 rounded-2xl bg-zinc-200 animate-pulse mb-3" />
        <div className="aspect-video rounded-2xl bg-zinc-200 animate-pulse" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mt-2">
        <Alert message={loadError} onRetry={fetchSlides} />
      </div>
    );
  }

  function togglePanel(kind: EditorPanelKind) {
    setActivePanel((current) => (current === kind ? null : kind));
  }

  function renderActivePanel() {
    switch (activePanel) {
      case 'templates':
        return <TemplatesPanel onApply={(content) => void handleApplyTemplate(content)} getCurrentSlideContent={getCurrentSlideContent} />;
      case 'bible':
        return <BiblePanel canvas={canvas} markDirty={markDirty} refreshSelection={refreshSelection} />;
      case 'songs':
        return <SongsPanel canvas={canvas} markDirty={markDirty} refreshSelection={refreshSelection} />;
      case 'elements':
        return <ElementsPanel canvas={canvas} markDirty={markDirty} refreshSelection={refreshSelection} />;
      case 'text':
        return <TextPanel canvas={canvas} markDirty={markDirty} refreshSelection={refreshSelection} />;
      case 'media':
        return <MediaPanel onInsertItem={(item) => void handleInsertMediaItem(item)} onInsertUrl={(url) => void handleInsertImage(url)} />;
      case 'brand':
        return <BrandPanel canvas={canvas} selection={selection} markDirty={markDirty} refreshSelection={refreshSelection} />;
      default:
        return null;
    }
  }

  return (
    <div className="mt-2 w-full flex flex-col gap-4">
      <EditorToolbar
        onOpenBackground={() => setBackgroundOpen(true)}
        onSave={() => void flushSave()}
        saving={saveStatus === 'saving'}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {saveStatus === 'error' && <Alert message={saveError ?? 'Failed to save.'} onRetry={() => void flushSave()} />}

      <div className="flex-1 flex gap-4 min-h-[560px]">
        <EditorNavRail active={activePanel} onSelect={togglePanel} />
        <EditorAssetDrawer activePanel={activePanel} onClose={() => setActivePanel(null)} loadingSlide={loadingSlide}>
          {renderActivePanel()}
        </EditorAssetDrawer>

        <div className="flex-1 flex flex-col min-w-0">
          <FloatingContextualToolbar canvas={canvas} selection={selection} refreshSelection={refreshSelection} markDirty={markDirty} />
          <EditorCanvasStage
            containerRef={containerRef}
            canvasElRef={canvasElRef}
            saveStatus={saveStatus}
            loadingSlide={loadingSlide}
            backgroundVideoUrl={backgroundVideoUrl}
            backgroundMotion={backgroundMotion}
            guides={alignmentGuides}
          />
        </div>
      </div>

      <SlideFilmstrip
        slides={slides}
        currentSlideId={currentSlideId}
        onSelect={switchToSlide}
        onAdd={handleAddSlide}
        onDuplicate={handleDuplicateSlide}
        onDelete={handleDeleteSlide}
      />

      <BackgroundPickerModal
        open={backgroundOpen}
        onClose={() => setBackgroundOpen(false)}
        onPickColor={handleBackgroundColor}
        onPickMedia={handleBackgroundMedia}
        onPickEmbedUrl={handleBackgroundEmbedUrl}
        onPickMotion={handleBackgroundMotion}
      />
    </div>
  );
}
