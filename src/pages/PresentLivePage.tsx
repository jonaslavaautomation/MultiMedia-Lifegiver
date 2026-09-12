import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Monitor,
  Tv,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Presentation as PresentationIcon,
  Smartphone,
  Copy,
  Check,
  Piano,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { useLiveChannel } from '@/hooks/useLiveChannel';
import { useRealtimeLiveChannel } from '@/hooks/useRealtimeLiveChannel';
import { useMidiController } from '@/hooks/useMidiController';
import { SlideCanvasRenderer } from '@/components/live/SlideCanvasRenderer';
import { TimerControl } from '@/components/live/TimerControl';
import { BroadcastTelemetryBar } from '@/components/live/BroadcastTelemetryBar';
import { HotkeyBindingsModal } from '@/components/live/HotkeyBindingsModal';
import { startTimer, pauseTimer, resetTimer, setTimerMode, setCountdownDuration } from '@/lib/liveTimer';
import { findActionForKey, findActionForMidiNote, loadHotkeyBindings, saveHotkeyBindings, type HotkeyBindings } from '@/lib/hotkeyBindings';
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

  const [remoteModalOpen, setRemoteModalOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [hotkeyModalOpen, setHotkeyModalOpen] = useState(false);
  const [hotkeyBindings, setHotkeyBindings] = useState<HotkeyBindings>(() => loadHotkeyBindings());

  const restoredRef = useRef(false);
  const { post, lastMessage } = useLiveChannel(id ?? '');
  const { post: postRemote, lastMessage: lastRemoteMessage, connected: remoteConnected } = useRealtimeLiveChannel(id ?? '');

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

  // Shared slide-navigation / blackout callbacks — the UI buttons, keyboard
  // shortcuts, and remote commands (from a phone) all funnel through these
  // so they can never diverge in behavior.
  const goNext = useCallback(() => {
    setSlideIndex((i) => Math.min(i + 1, Math.max(slides.length - 1, 0)));
  }, [slides.length]);
  const goPrev = useCallback(() => {
    setSlideIndex((i) => Math.max(i - 1, 0));
  }, []);
  const goToSlide = useCallback(
    (index: number) => {
      setSlideIndex(Math.min(Math.max(index, 0), Math.max(slides.length - 1, 0)));
    },
    [slides.length]
  );
  const toggleBlackout = useCallback(() => setBlackout((b) => !b), []);

  // Answer late-joining Projector/Stage windows (same-computer, BroadcastChannel).
  useEffect(() => {
    if (lastMessage?.type === 'request-state') {
      post({ type: 'state', state: buildState() });
    }
  }, [lastMessage, post, buildState]);

  // Handle Realtime traffic: request-state from a newly-opened remote, or a
  // command it sent. Commands are applied via the exact same functions the
  // local UI uses, so a phone tapping "Next" behaves identically to
  // clicking Next here.
  useEffect(() => {
    if (!lastRemoteMessage) return;

    if (lastRemoteMessage.type === 'request-state') {
      postRemote({ type: 'state', state: buildState() });
      return;
    }

    if (lastRemoteMessage.type === 'command') {
      switch (lastRemoteMessage.action) {
        case 'next':
          goNext();
          break;
        case 'previous':
          goPrev();
          break;
        case 'goto':
          goToSlide(lastRemoteMessage.slideIndex);
          break;
        case 'toggle-blackout':
          toggleBlackout();
          break;
        case 'timer-start':
          setTimer((t) => startTimer(t));
          break;
        case 'timer-pause':
          setTimer((t) => pauseTimer(t));
          break;
        case 'timer-reset':
          setTimer((t) => resetTimer(t));
          break;
        case 'timer-set-mode':
          setTimer((t) => setTimerMode(t, lastRemoteMessage.mode));
          break;
        case 'timer-set-duration':
          setTimer((t) => setCountdownDuration(t, lastRemoteMessage.minutes));
          break;
      }
    }
  }, [lastRemoteMessage, postRemote, buildState, goNext, goPrev, goToSlide, toggleBlackout]);

  // Broadcast on every state change — over both the local BroadcastChannel
  // (Projector/Stage on this computer) and Realtime (a connected remote).
  useEffect(() => {
    const state = buildState();
    post({ type: 'state', state });
    postRemote({ type: 'state', state });
  }, [post, postRemote, buildState]);

  // Keyboard shortcuts: -> / Space next, <- previous, B blackout — always
  // on, plus any custom key a user has bound in MIDI & Hotkeys (checked
  // first, so a custom binding never double-fires alongside a default).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      const customAction = findActionForKey(hotkeyBindings, e.key);
      if (customAction) {
        e.preventDefault();
        if (customAction === 'next') goNext();
        else if (customAction === 'previous') goPrev();
        else toggleBlackout();
        return;
      }

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key.toLowerCase() === 'b') {
        toggleBlackout();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, toggleBlackout, hotkeyBindings]);

  // MIDI: a bound pad/note triggers the same shared callbacks as the UI
  // buttons, keyboard shortcuts, and remote commands.
  useMidiController({
    onNoteOn: (note) => {
      const action = findActionForMidiNote(hotkeyBindings, note);
      if (action === 'next') goNext();
      else if (action === 'previous') goPrev();
      else if (action === 'clear') toggleBlackout();
    },
  });

  function handleHotkeyBindingsChange(next: HotkeyBindings) {
    setHotkeyBindings(next);
    saveHotkeyBindings(next);
  }

  function openWindow(kind: 'projector' | 'stage') {
    if (!id) return;
    const url = `${window.location.origin}/presentations/${id}/present/${kind}`;
    window.open(url, `lifegiver-${kind}-${id}`, 'popup=yes,width=1280,height=720');
  }

  const remoteUrl = id ? `${window.location.origin}/presentations/${id}/present/remote` : '';

  function handleCopyRemoteLink() {
    navigator.clipboard
      .writeText(remoteUrl)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch(() => {
        // Clipboard access can be denied — the link is still visible/selectable in the modal.
      });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-hud-bg px-4 py-6">
        <div className="h-10 w-64 bg-hud-panel/60 rounded-lg animate-pulse mb-6" />
        <div className="aspect-video max-w-3xl bg-hud-panel/40 border border-hud-border rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-hud-bg px-4 py-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/presentations/${id}/edit`)} className="mb-6">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Alert message={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hud-bg flex flex-col">
      {/* Broadcast Telemetry Bar */}
      <BroadcastTelemetryBar onAir={!blackout} timer={timer} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6 py-3 border-b border-hud-border bg-hud-panel/40">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/presentations/${id}/edit`)} title="Back to editor">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">Operator Console</p>
            <h1 className="text-sm font-semibold text-zinc-100 truncate">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={blackout ? 'danger' : 'outline'} size="sm" onClick={toggleBlackout} title="Toggle blackout (B)">
            {blackout ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {blackout ? 'Blacked Out' : 'Blackout'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => openWindow('projector')}>
            <Monitor className="w-3.5 h-3.5" /> Open Projector
          </Button>
          <Button variant="outline" size="sm" onClick={() => openWindow('stage')}>
            <Tv className="w-3.5 h-3.5" /> Open Stage Display
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRemoteModalOpen(true)}>
            <Smartphone className="w-3.5 h-3.5" /> Remote Control
          </Button>
          <Button variant="outline" size="sm" onClick={() => setHotkeyModalOpen(true)}>
            <Piano className="w-3.5 h-3.5" /> MIDI & Hotkeys
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:p-6 min-h-0">
        {/* Slide list */}
        <div className="lg:w-64 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[calc(100vh-136px)]">
          {slides.length === 0 ? (
            <p className="text-sm text-zinc-500">No slides in this presentation.</p>
          ) : (
            slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => goToSlide(index)}
                className={`shrink-0 w-40 lg:w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                  index === slideIndex
                    ? 'border-cyan-500/70 bg-cyan-950/20 text-cyan-200 shadow-[0_0_0_1px_rgba(6,182,212,0.25)]'
                    : 'border-hud-border bg-hud-panel/60 text-zinc-400 hover:border-zinc-600'
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
            <div className="sm:col-span-2 min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-glow-red" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Program — On Air</p>
              </div>
              <SlideCanvasRenderer
                content={slides[slideIndex]?.content ?? null}
                className="rounded-2xl border-2 border-red-600/60 overflow-hidden bg-hud-panel shadow-[0_0_24px_-6px_rgba(239,68,68,0.35)]"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Preview — Next</p>
              </div>
              <SlideCanvasRenderer
                content={slides[slideIndex + 1]?.content ?? null}
                className="rounded-2xl border border-cyan-700/50 overflow-hidden bg-hud-panel shadow-[0_0_16px_-6px_rgba(6,182,212,0.3)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={goPrev} disabled={slideIndex === 0}>
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <Button variant="outline" onClick={goNext} disabled={slideIndex >= slides.length - 1}>
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

      {/* Remote Control share link */}
      <Modal open={remoteModalOpen} onClose={() => setRemoteModalOpen(false)} title="Remote Control">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-400 leading-relaxed">
            Open this link on a phone or tablet to control this presentation remotely — next/previous, blackout, and
            the timer all sync back here in real time.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={remoteUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 rounded-lg bg-zinc-950/80 border border-zinc-700/80 text-zinc-300 px-3 py-2 text-xs"
            />
            <Button variant="secondary" size="sm" onClick={handleCopyRemoteLink}>
              {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {linkCopied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className={`text-xs ${remoteConnected ? 'text-emerald-400' : 'text-zinc-500'}`}>
            ● Remote sync {remoteConnected ? 'active' : 'connecting…'}
          </p>
        </div>
      </Modal>

      <HotkeyBindingsModal
        open={hotkeyModalOpen}
        onClose={() => setHotkeyModalOpen(false)}
        bindings={hotkeyBindings}
        onChange={handleHotkeyBindingsChange}
      />
    </div>
  );
}
