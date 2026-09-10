import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Monitor, Tv, Eye, EyeOff, ChevronLeft, ChevronRight, Presentation as PresentationIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useLiveChannel } from '@/hooks/useLiveChannel';
import { SlideCanvasRenderer } from '@/components/live/SlideCanvasRenderer';
import { TimerControl } from '@/components/live/TimerControl';
import { INITIAL_TIMER_STATE, type LiveState, type TimerState } from '@/types/live';
import type { Slide } from '@/types';

interface StoredLiveState {
  slideIndex: number;
  blackout: boolean;
  timer: TimerState;
}

export function PresentLivePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [slideIndex, setSlideIndex] = useState(0);
  const [blackout, setBlackout] = useState(false);
  const [timer, setTimer] = useState<TimerState>(INITIAL_TIMER_STATE);

  const restoredRef = useRef(false);
  const { post, lastMessage } = useLiveChannel(id ?? '');

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const [presRes, slidesRes] = await Promise.all([
      supabase.from('presentations').select('title').eq('id', id).maybeSingle(),
      supabase.from('slides').select('*').eq('presentation_id', id).order('sort_order', { ascending: true }),
    ]);

    if (presRes.error || slidesRes.error) {
      console.error('Error loading live presentation:', presRes.error?.message ?? slidesRes.error?.message);
      setError('Failed to load this presentation. Please try again.');
      setLoading(false);
      return;
    }

    setTitle(presRes.data?.title ?? 'Untitled Presentation');
    setSlides((slidesRes.data as Slide[]) ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Restore operator state from a previous session (survives an accidental refresh mid-service).
  useEffect(() => {
    if (restoredRef.current || !id || slides.length === 0) return;
    restoredRef.current = true;
    try {
      const raw = sessionStorage.getItem(`live-state-${id}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredLiveState>;
        if (typeof parsed.slideIndex === 'number') {
          setSlideIndex(Math.min(Math.max(0, parsed.slideIndex), slides.length - 1));
        }
        if (typeof parsed.blackout === 'boolean') setBlackout(parsed.blackout);
        if (parsed.timer) setTimer(parsed.timer);
      }
    } catch {
      // ignore malformed/unavailable storage
    }
  }, [id, slides.length]);

  // Persist on every change.
  useEffect(() => {
    if (!id) return;
    try {
      const toStore: StoredLiveState = { slideIndex, blackout, timer };
      sessionStorage.setItem(`live-state-${id}`, JSON.stringify(toStore));
    } catch {
      // ignore (private browsing / quota)
    }
  }, [id, slideIndex, blackout, timer]);

  const buildState = useCallback(
    (): LiveState => ({
      presentationTitle: title,
      slideIndex,
      totalSlides: slides.length,
      currentContent: slides[slideIndex]?.content ?? null,
      nextContent: slides[slideIndex + 1]?.content ?? null,
      blackout,
      timer,
    }),
    [title, slideIndex, slides, blackout, timer]
  );

  // Answer late-joining Projector/Stage windows.
  useEffect(() => {
    if (lastMessage?.type === 'request-state') {
      post({ type: 'state', state: buildState() });
    }
  }, [lastMessage, post, buildState]);

  // Broadcast on every state change.
  useEffect(() => {
    post({ type: 'state', state: buildState() });
  }, [post, buildState]);

  // Keyboard shortcuts: -> / Space next, <- previous, B blackout.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setSlideIndex((i) => Math.min(i + 1, Math.max(slides.length - 1, 0)));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSlideIndex((i) => Math.max(i - 1, 0));
      } else if (e.key.toLowerCase() === 'b') {
        setBlackout((b) => !b);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length]);

  function openWindow(kind: 'projector' | 'stage') {
    if (!id) return;
    const url = `${window.location.origin}/presentations/${id}/present/${kind}`;
    window.open(url, `lifegiver-${kind}-${id}`, 'popup=yes,width=1280,height=720');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 px-4 py-6">
        <div className="h-10 w-64 bg-zinc-900/60 rounded-lg animate-pulse mb-6" />
        <div className="aspect-video max-w-3xl bg-zinc-900/40 border border-zinc-800/50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 px-4 py-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/presentations/${id}/edit`)} className="mb-6">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Alert message={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6 py-3 border-b border-zinc-900">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/presentations/${id}/edit`)} title="Back to editor">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-xs text-maroon-400 font-semibold uppercase tracking-wider">Live</p>
            <h1 className="text-sm font-semibold text-zinc-100 truncate">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={blackout ? 'danger' : 'outline'} size="sm" onClick={() => setBlackout((b) => !b)} title="Toggle blackout (B)">
            {blackout ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {blackout ? 'Blacked Out' : 'Blackout'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => openWindow('projector')}>
            <Monitor className="w-3.5 h-3.5" /> Open Projector
          </Button>
          <Button variant="outline" size="sm" onClick={() => openWindow('stage')}>
            <Tv className="w-3.5 h-3.5" /> Open Stage Display
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:p-6 min-h-0">
        {/* Slide list */}
        <div className="lg:w-64 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[calc(100vh-96px)]">
          {slides.length === 0 ? (
            <p className="text-sm text-zinc-500">No slides in this presentation.</p>
          ) : (
            slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => setSlideIndex(index)}
                className={`shrink-0 w-40 lg:w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                  index === slideIndex
                    ? 'border-maroon-500 bg-maroon-950/30 text-maroon-200'
                    : 'border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="text-[10px] text-zinc-500 mr-1.5">{index + 1}</span>
                <span className="text-xs truncate">{slide.title}</span>
              </button>
            ))
          )}
        </div>

        {/* Previews + controls */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Current</p>
              <SlideCanvasRenderer content={slides[slideIndex]?.content ?? null} className="rounded-2xl border border-maroon-700/50 overflow-hidden bg-zinc-900/40" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Next</p>
              <SlideCanvasRenderer content={slides[slideIndex + 1]?.content ?? null} className="rounded-2xl border border-zinc-800/80 overflow-hidden bg-zinc-900/40" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setSlideIndex((i) => Math.max(i - 1, 0))} disabled={slideIndex === 0}>
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setSlideIndex((i) => Math.min(i + 1, slides.length - 1))}
              disabled={slideIndex >= slides.length - 1}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-xs text-zinc-500 ml-2">
              Slide {slides.length === 0 ? 0 : slideIndex + 1} of {slides.length}
            </span>
          </div>

          {slides.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-zinc-500 mt-2">
              <PresentationIcon className="w-4 h-4" /> Add slides in the editor before going live.
            </div>
          )}

          <TimerControl timer={timer} onChange={setTimer} />
        </div>
      </div>
    </div>
  );
}
