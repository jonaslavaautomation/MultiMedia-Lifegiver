import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFabricCanvas } from '@/hooks/useFabricCanvas';
import { useSelectedObject } from '@/hooks/useSelectedObject';
import {
  applyImageBackground,
  applySolidBackground,
  createImageObjectFromUrl,
  createTextObject,
  serializeSlide,
} from '@/lib/fabricObjects';
import { resolveAndRenderSlide } from '@/lib/renderSlide';
import { createBlankSlideContent, isEmptySlideContent } from '@/lib/slideContent';
import { getMediaSignedUrl } from '@/lib/mediaStorage';
import { AUTOSAVE_DELAY_MS, DEFAULT_SLIDE_BACKGROUND_COLOR } from '@/lib/editorConstants';
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
import type { MediaItem, Slide } from '@/types';
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
  const [activePanel, setActivePanel] = useState<EditorPanelKind | null>(null);

  const { containerRef, canvasElRef, canvas } = useFabricCanvas({ backgroundColor: DEFAULT_SLIDE_BACKGROUND_COLOR });
  const { selection, refreshSelection } = useSelectedObject(canvas);

  const slidesRef = useRef<Slide[]>([]);
  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  const currentSlideIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentSlideIdRef.current = currentSlideId;
  }, [currentSlideId]);

  const isLoadingSlideRef = useRef(false);
  const dirtyRef = useRef(false);
  const backgroundMediaIdRef = useRef<string | null>(null);
  const backgroundVideoEmbedUrlRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const content = serializeSlide(canvas, backgroundMediaIdRef.current, backgroundVideoEmbedUrlRef.current);

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
  }, [canvas]);

  const flushSaveRef = useRef(flushSave);
  useEffect(() => {
    flushSaveRef.current = flushSave;
  }, [flushSave]);

  const markDirty = useCallback(() => {
    if (isLoadingSlideRef.current) return;
    dirtyRef.current = true;
    setSaveStatus('pending');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void flushSaveRef.current();
    }, AUTOSAVE_DELAY_MS);
  }, []);

  // Canvas mutation -> dirty. loadFromJSON also fires object:added, but the
  // isLoadingSlideRef guard inside markDirty prevents that from triggering
  // a spurious autosave while hydrating a slide.
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
      if (tag === 'input' || tag === 'textarea') return;

      e.preventDefault();
      canvas.getActiveObjects().forEach((obj) => canvas.remove(obj));
      canvas.discardActiveObject();
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

  useEffect(() => {
    if (!canvas || !currentSlideId) return;
    const slide = slidesRef.current.find((s) => s.id === currentSlideId);
    if (!slide) return;

    let cancelled = false;

    async function hydrate() {
      isLoadingSlideRef.current = true;
      setLoadingSlide(true);
      canvas!.discardActiveObject();
      canvas!.clear();

      const content = slide!.content;

      if (isEmptySlideContent(content)) {
        applySolidBackground(canvas!, DEFAULT_SLIDE_BACKGROUND_COLOR);
        backgroundMediaIdRef.current = null;
        backgroundVideoEmbedUrlRef.current = null;
        setBackgroundVideoUrl(null);
      } else {
        // Shared with the read-only Present-mode renderer (src/lib/renderSlide.ts)
        // so the two never render a slide differently from each other.
        const { videoBackgroundUrl } = await resolveAndRenderSlide(canvas!, content);
        if (cancelled) return;

        backgroundMediaIdRef.current = content.meta?.backgroundMediaId ?? null;
        backgroundVideoEmbedUrlRef.current = content.meta?.backgroundVideoEmbedUrl ?? null;
        setBackgroundVideoUrl(videoBackgroundUrl);
        canvas!.requestRenderAll();
      }

      if (!cancelled) {
        dirtyRef.current = false;
        setSaveStatus('idle');
        setSaveError(null);
        isLoadingSlideRef.current = false;
        setLoadingSlide(false);
        refreshSelection();
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlideId, canvas]);

  // --- Slide navigation / CRUD ---------------------------------------------

  async function switchToSlide(nextId: string) {
    if (nextId === currentSlideId) return;
    if (dirtyRef.current) await flushSave();
    setCurrentSlideId(nextId);
  }

  async function handleAddSlide() {
    if (dirtyRef.current) await flushSave();
    const maxOrder = slides.reduce((max, s) => Math.max(max, s.sort_order), -1);

    const { data, error } = await supabase
      .from('slides')
      .insert({
        presentation_id: presentationId,
        title: `Slide ${slides.length + 1}`,
        content: createBlankSlideContent(),
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
    if (id === currentSlideId && dirtyRef.current) await flushSave();

    const maxOrder = slides.reduce((max, s) => Math.max(max, s.sort_order), -1);
    const latestSource = id === currentSlideId ? slidesRef.current.find((s) => s.id === id) ?? source : source;

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
    setBackgroundVideoUrl(null);
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
      canvas.backgroundImage = undefined;
      canvas.backgroundColor = 'transparent';
      canvas.requestRenderAll();
      setBackgroundVideoUrl(signedUrl);
    } else {
      await applyImageBackground(canvas, signedUrl);
      setBackgroundVideoUrl(null);
    }

    backgroundMediaIdRef.current = item.id;
    backgroundVideoEmbedUrlRef.current = null;
    markDirty();
  }

  function handleBackgroundEmbedUrl(url: string) {
    if (!canvas) return;
    canvas.backgroundImage = undefined;
    canvas.backgroundColor = 'transparent';
    canvas.requestRenderAll();
    setBackgroundVideoUrl(url);
    backgroundMediaIdRef.current = null;
    backgroundVideoEmbedUrlRef.current = url;
    markDirty();
  }

  // --- Render ---------------------------------------------------------------

  if (loading) {
    return (
      <div className="mt-2">
        <div className="h-12 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 animate-pulse mb-3" />
        <div className="aspect-video rounded-2xl bg-zinc-900/40 border border-zinc-800/50 animate-pulse" />
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
        return <TemplatesPanel />;
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
      <EditorToolbar onOpenBackground={() => setBackgroundOpen(true)} onSave={() => void flushSave()} saving={saveStatus === 'saving'} />

      {saveStatus === 'error' && <Alert message={saveError ?? 'Failed to save.'} onRetry={() => void flushSave()} />}

      <div className="flex-1 flex gap-4 min-h-[560px]">
        <EditorNavRail active={activePanel} onSelect={togglePanel} />
        <EditorAssetDrawer activePanel={activePanel} onClose={() => setActivePanel(null)}>
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
      />
    </div>
  );
}
