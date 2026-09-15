import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
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
  Layers,
  Snowflake,
  Church,
  PackageCheck,
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
import { ConnectionStatusBadge } from '@/components/live/ConnectionStatusBadge';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { HotkeyBindingsModal } from '@/components/live/HotkeyBindingsModal';
import { ServicePackModal } from '@/components/live/ServicePackModal';
import { startTimer, pauseTimer, resetTimer, setTimerMode, setCountdownDuration } from '@/lib/liveTimer';
import { findActionForKey, findActionForMidiNote, loadHotkeyBindings, saveHotkeyBindings, type HotkeyBindings } from '@/lib/hotkeyBindings';
import { cachePresentationSnapshot, loadPresentationSnapshot } from '@/lib/offlineStore';
import { INITIAL_TIMER_STATE, type LiveState, type TimerState, type RemoteCommand } from '@/types/live';
import type { Slide } from '@/types';

interface StoredLiveState {
  slideIndex: number;
  blackout: boolean;
  freeze: { active: boolean; index: number };
  safeSlide: boolean;
  timer: TimerState;
}

export function PresentLivePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Set when this load came from the local IndexedDB copy (see
  // offlineStore.ts) because Supabase itself was unreachable — a cold
  // start (fresh page load, not just a mid-service reconnect) with no
  // internet at all. Shown as a calm banner, not an error: the presentation
  // still works, it just might be missing edits made since it was last
  // cached.
  const [offlineSnapshotCachedAt, setOfflineSnapshotCachedAt] = useState<number | null>(null);

  const [slideIndex, setSlideIndex] = useState(0);
  const [blackout, setBlackout] = useState(false);
  // { active, index } rather than a plain boolean — index is the slide that
  // was live the moment Freeze was engaged, so the audience-facing outputs
  // keep showing exactly that frame while the operator is free to keep
  // navigating slideIndex locally to prep ahead, unseen, until Unfreeze.
  const [freeze, setFreezeState] = useState<{ active: boolean; index: number }>({ active: false, index: 0 });
  const [safeSlide, setSafeSlide] = useState(false);
  const [timer, setTimer] = useState<TimerState>(INITIAL_TIMER_STATE);
  // Kept in sync every render (not via an effect) purely so toggleFreeze
  // below can read "what slide is live right now" without needing
  // slideIndex in its own dependency array — same reasoning as the
  // buildStateRef/applyCommandRef pattern a bit further down: a callback
  // used inside the command-handling effects must never change identity as
  // a side effect of the state it just changed, or that effect re-fires and
  // reapplies the same stale command forever (see the Blackout loop this
  // exact bug caused previously).
  const slideIndexRef = useRef(slideIndex);
  slideIndexRef.current = slideIndex;

  const [programBgUnavailable, setProgramBgUnavailable] = useState(false);
  const [previewBgUnavailable, setPreviewBgUnavailable] = useState(false);
  const [remoteModalOpen, setRemoteModalOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [hotkeyModalOpen, setHotkeyModalOpen] = useState(false);
  const [servicePackModalOpen, setServicePackModalOpen] = useState(false);
  const [hotkeyBindings, setHotkeyBindings] = useState<HotkeyBindings>(() => loadHotkeyBindings());

  // Identifies this specific PresentLivePage instance to any OTHER operator
  // console open for the same presentation (same computer, another tab or
  // window) — see the operator-announce/operator-ack handling below.
  const [instanceId] = useState(() => crypto.randomUUID());
  const [otherOperatorDetected, setOtherOperatorDetected] = useState(false);
  const [multiOperatorWarningDismissed, setMultiOperatorWarningDismissed] = useState(false);

  const restoredRef = useRef(false);
  const { post, lastMessage } = useLiveChannel(id ?? '');
  const { post: postRemote, lastMessage: lastRemoteMessage, connected: remoteConnected } = useRealtimeLiveChannel(id ?? '');

  // Two operator consoles open for the same presentation at once would each
  // be an independent authoritative broadcaster racing the other's
  // commands — a real hazard, not just a leak. Announce this instance once
  // on mount; any other operator tab replies with its own ack, and either
  // side seeing the other's message means there IS another one open. Local
  // (BroadcastChannel) only — this is a same-computer, multiple-tabs
  // concern, never sent over Realtime.
  useEffect(() => {
    if (!id) return;
    post({ type: 'operator-announce', instanceId });
  }, [id, post, instanceId]);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const [presRes, slidesRes] = await Promise.all([
      supabase.from('presentations').select('title').eq('id', id).maybeSingle(),
      supabase.from('slides').select('*').eq('presentation_id', id).order('sort_order', { ascending: true }),
    ]);

    if (presRes.error || slidesRes.error) {
      console.error('Error loading live presentation (offline?):', presRes.error?.message ?? slidesRes.error?.message);

      // Cold-start offline fallback — the live presentation must never
      // depend on the internet, including a fresh page load. If this
      // presentation was ever successfully opened before, fall back to
      // that last-known copy rather than blocking with a hard error.
      const cached = await loadPresentationSnapshot(id);
      if (cached) {
        setTitle(cached.title);
        setSlides(cached.slides);
        setOfflineSnapshotCachedAt(cached.cachedAt);
        setLoading(false);
        return;
      }

      setError('Failed to load this presentation. Please try again.');
      setLoading(false);
      return;
    }

    const loadedTitle = presRes.data?.title ?? 'Untitled Presentation';
    const loadedSlides = (slidesRes.data as Slide[]) ?? [];
    setTitle(loadedTitle);
    setSlides(loadedSlides);
    setOfflineSnapshotCachedAt(null);
    setLoading(false);
    void cachePresentationSnapshot(id, loadedTitle, loadedSlides);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Once we're back online after having fallen back to the offline
  // snapshot, quietly retry the real fetch so the presentation picks up
  // whatever was edited since — no user action needed.
  const { status: connectionStatus } = useConnectionStatus();
  const showingOfflineSnapshotRef = useRef(false);
  useEffect(() => {
    showingOfflineSnapshotRef.current = offlineSnapshotCachedAt !== null;
  }, [offlineSnapshotCachedAt]);
  useEffect(() => {
    if (connectionStatus === 'online' && showingOfflineSnapshotRef.current) {
      void fetchData();
    }
  }, [connectionStatus, fetchData]);

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
        if (parsed.freeze && typeof parsed.freeze.active === 'boolean' && typeof parsed.freeze.index === 'number') {
          setFreezeState({
            active: parsed.freeze.active,
            index: Math.min(Math.max(0, parsed.freeze.index), slides.length - 1),
          });
        }
        if (typeof parsed.safeSlide === 'boolean') setSafeSlide(parsed.safeSlide);
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
      const toStore: StoredLiveState = { slideIndex, blackout, freeze, safeSlide, timer };
      sessionStorage.setItem(`live-state-${id}`, JSON.stringify(toStore));
    } catch {
      // ignore (private browsing / quota)
    }
  }, [id, slideIndex, blackout, freeze, safeSlide, timer]);

  const buildState = useCallback((): LiveState => {
    // While frozen, report the slide that was live when Freeze was engaged
    // — not wherever the operator has since navigated locally — so every
    // audience-facing output (Projector/Stage/Overlay/Remote) keeps showing
    // that frozen frame until Unfreeze.
    const outputIndex = freeze.active ? freeze.index : slideIndex;
    return {
      presentationTitle: title,
      slideIndex: outputIndex,
      totalSlides: slides.length,
      currentContent: slides[outputIndex]?.content ?? null,
      nextContent: slides[outputIndex + 1]?.content ?? null,
      blackout,
      freeze: freeze.active,
      safeSlide,
      liveSlideIndex: slideIndex,
      liveContent: slides[slideIndex]?.content ?? null,
      liveNextContent: slides[slideIndex + 1]?.content ?? null,
      timer,
    };
  }, [title, slideIndex, slides, blackout, freeze, safeSlide, timer]);

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
  // Blackout and Safe Slide are mutually exclusive audience-facing states —
  // turning one on turns the other off, since showing pure black and the
  // logo card at the same time makes no sense. Freeze is independent of
  // both (it just holds whichever frame was live when it engaged).
  const toggleBlackout = useCallback(() => {
    setBlackout((b) => !b);
    setSafeSlide(false);
  }, []);
  const toggleSafeSlide = useCallback(() => {
    setSafeSlide((s) => !s);
    setBlackout(false);
  }, []);
  const toggleFreeze = useCallback(() => {
    setFreezeState((f) => (f.active ? { active: false, index: f.index } : { active: true, index: slideIndexRef.current }));
  }, []);

  // Applies a RemoteCommand via the exact same functions the local UI
  // buttons/keyboard shortcuts use, so a phone tapping "Next" — or a
  // Projector/Stage Display window's own Next button — behaves identically
  // to clicking Next here. Shared by both channels below so they can never
  // diverge in behavior.
  const applyCommand = useCallback(
    (command: RemoteCommand) => {
      switch (command.action) {
        case 'next':
          goNext();
          break;
        case 'previous':
          goPrev();
          break;
        case 'goto':
          goToSlide(command.slideIndex);
          break;
        case 'toggle-blackout':
          toggleBlackout();
          break;
        case 'toggle-freeze':
          toggleFreeze();
          break;
        case 'toggle-safe-slide':
          toggleSafeSlide();
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
          setTimer((t) => setTimerMode(t, command.mode));
          break;
        case 'timer-set-duration':
          setTimer((t) => setCountdownDuration(t, command.minutes));
          break;
      }
    },
    [goNext, goPrev, goToSlide, toggleBlackout, toggleFreeze, toggleSafeSlide]
  );

  // buildState/applyCommand change identity on every slideIndex/blackout/
  // timer update — including the very update a command just caused. Kept
  // behind refs (instead of listed directly in the two effects below) so
  // handling an incoming message reacts only to a genuinely NEW message
  // arriving, not to those callbacks' identity changing as a side effect of
  // the previous message being handled. Without this, the two effects
  // re-fire the instant state changes — since lastMessage/lastRemoteMessage
  // themselves haven't changed, they'd re-apply the *same stale command*
  // again, and again, forever. next/previous partially mask this by
  // clamping at the first/last slide (a fixed point where slideIndex stops
  // changing), but toggle-blackout has no fixed point — it was flipping
  // on/off in a tight infinite loop, visible as the remote's Blackout
  // button (and the live output) flickering nonstop after a single tap.
  const buildStateRef = useRef(buildState);
  useEffect(() => {
    buildStateRef.current = buildState;
  }, [buildState]);
  const applyCommandRef = useRef(applyCommand);
  useEffect(() => {
    applyCommandRef.current = applyCommand;
  }, [applyCommand]);

  // Answer late-joining Projector/Stage windows (same-computer,
  // BroadcastChannel) — request-state, or a command one of their own
  // Next/Previous buttons sent. Also where another operator console
  // announcing/acking itself is detected (see the mount effect above).
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'request-state') {
      post({ type: 'state', state: buildStateRef.current() });
      return;
    }

    if (lastMessage.type === 'command') {
      applyCommandRef.current(lastMessage);
      return;
    }

    if (lastMessage.type === 'operator-announce') {
      if (lastMessage.instanceId !== instanceId) {
        setOtherOperatorDetected(true);
        post({ type: 'operator-ack', instanceId }); // let it know this one is here too
      }
      return;
    }

    if (lastMessage.type === 'operator-ack') {
      if (lastMessage.instanceId !== instanceId) {
        setOtherOperatorDetected(true);
      }
    }
  }, [lastMessage, post, instanceId]);

  // Handle Realtime traffic: request-state from a newly-opened remote, or a
  // command it sent.
  useEffect(() => {
    if (!lastRemoteMessage) return;

    if (lastRemoteMessage.type === 'request-state') {
      postRemote({ type: 'state', state: buildStateRef.current() });
      return;
    }

    if (lastRemoteMessage.type === 'command') {
      applyCommandRef.current(lastRemoteMessage);
    }
  }, [lastRemoteMessage, postRemote]);

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
      // Also covers any contentEditable region generically, not just
      // <input>/<textarea> by tag name — the timer duration field is a
      // real <input>, but this stays correct even if a future control uses
      // contenteditable instead.
      if (tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement | null)?.isContentEditable) return;

      const customAction = findActionForKey(hotkeyBindings, e.key);
      if (customAction) {
        e.preventDefault();
        if (customAction === 'next') goNext();
        else if (customAction === 'previous') goPrev();
        else if (customAction === 'freeze') toggleFreeze();
        else if (customAction === 'safe-slide') toggleSafeSlide();
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
      } else if (e.key.toLowerCase() === 'f') {
        toggleFreeze();
      } else if (e.key.toLowerCase() === 'l') {
        toggleSafeSlide();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, toggleBlackout, toggleFreeze, toggleSafeSlide, hotkeyBindings]);

  // MIDI: a bound pad/note triggers the same shared callbacks as the UI
  // buttons, keyboard shortcuts, and remote commands. Suppressed while the
  // MIDI & Hotkeys modal is open — same class of bug as the keyboard
  // double-fire fixed earlier (pressing a pad to *bind* it would also
  // immediately trigger the action), but MIDI messages have no DOM event
  // to stopPropagation on, so this listener just stands down entirely
  // while the modal's own "learning" listener is the one that should react.
  useMidiController({
    onNoteOn: (note) => {
      if (hotkeyModalOpen) return;
      const action = findActionForMidiNote(hotkeyBindings, note);
      if (action === 'next') goNext();
      else if (action === 'previous') goPrev();
      else if (action === 'clear') toggleBlackout();
      else if (action === 'freeze') toggleFreeze();
      else if (action === 'safe-slide') toggleSafeSlide();
    },
  });

  function handleHotkeyBindingsChange(next: HotkeyBindings) {
    setHotkeyBindings(next);
    saveHotkeyBindings(next);
  }

  function openWindow(kind: 'projector' | 'stage' | 'overlay') {
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

      {offlineSnapshotCachedAt !== null && (
        <div className="px-4 lg:px-6 py-2 bg-amber-950/30 border-b border-amber-900/40 text-center text-xs text-amber-300">
          Showing the last downloaded copy of this presentation (saved{' '}
          {new Date(offlineSnapshotCachedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}) —
          Supabase isn't reachable right now. Everything still works locally; it'll pick up any newer edits
          automatically once it's back online.
        </div>
      )}

      {otherOperatorDetected && !multiOperatorWarningDismissed && (
        <div className="flex items-center justify-center gap-3 px-4 lg:px-6 py-2 bg-red-950/40 border-b border-red-900/50 text-center text-xs text-red-300">
          <span>
            Another Operator Console for this presentation appears to be open in a different tab or window on this
            computer — having two open at once can send conflicting commands. Close one of them.
          </span>
          <button
            onClick={() => setMultiOperatorWarningDismissed(true)}
            className="shrink-0 text-red-400/80 hover:text-red-200 underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}

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
          <ConnectionStatusBadge />
        </div>
        <div className="flex items-center gap-2">
          <Button variant={blackout ? 'danger' : 'outline'} size="sm" onClick={toggleBlackout} title="Toggle blackout (B)">
            {blackout ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {blackout ? 'Blacked Out' : 'Blackout'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFreeze}
            title="Freeze the output on this frame — you can keep navigating locally without the audience seeing it (F)"
            className={freeze.active ? 'bg-sky-600 border-sky-600 text-white hover:bg-sky-700' : ''}
          >
            <Snowflake className="w-3.5 h-3.5" /> {freeze.active ? 'Frozen' : 'Freeze'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSafeSlide}
            title="Show the Safe Slide (church logo) on audience-facing outputs (L)"
            className={safeSlide ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700' : ''}
          >
            <Church className="w-3.5 h-3.5" /> {safeSlide ? 'Safe Slide On' : 'Safe Slide'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => openWindow('projector')}>
            <Monitor className="w-3.5 h-3.5" /> Open Projector
          </Button>
          <Button variant="outline" size="sm" onClick={() => openWindow('stage')}>
            <Tv className="w-3.5 h-3.5" /> Open Stage Display
          </Button>
          <Button variant="outline" size="sm" onClick={() => openWindow('overlay')} title="Transparent overlay for OBS/vMix/NDI">
            <Layers className="w-3.5 h-3.5" /> Open Overlay
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRemoteModalOpen(true)}>
            <Smartphone className="w-3.5 h-3.5" /> Remote Control
          </Button>
          <Button variant="outline" size="sm" onClick={() => setHotkeyModalOpen(true)}>
            <Piano className="w-3.5 h-3.5" /> MIDI & Hotkeys
          </Button>
          <Button variant="outline" size="sm" onClick={() => setServicePackModalOpen(true)} title="Check readiness for offline use, or download media backgrounds for it">
            <PackageCheck className="w-3.5 h-3.5" /> Service Pack
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
                {programBgUnavailable && (
                  <span className="text-[10px] text-amber-400/90" title="This slide's background couldn't be loaded — likely a brief connection blip. The slide is still showing; it'll pick up the background automatically once it's reachable again.">
                    ⚠ Background unavailable
                  </span>
                )}
              </div>
              <SlideCanvasRenderer
                content={slides[slideIndex]?.content ?? null}
                onBackgroundStatus={setProgramBgUnavailable}
                className="rounded-2xl border-2 border-red-600/60 overflow-hidden bg-hud-panel shadow-[0_0_24px_-6px_rgba(239,68,68,0.35)]"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Preview — Next</p>
                {previewBgUnavailable && (
                  <span className="text-[10px] text-amber-400/90" title="This slide's background couldn't be loaded — likely a brief connection blip.">
                    ⚠ Background unavailable
                  </span>
                )}
              </div>
              <SlideCanvasRenderer
                content={slides[slideIndex + 1]?.content ?? null}
                onBackgroundStatus={setPreviewBgUnavailable}
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
            Scan this on a phone or tablet to control this presentation remotely — next/previous, blackout, and the
            timer all sync back here in real time. Requires signing in with the same account.
          </p>
          {remoteUrl && (
            <div className="flex justify-center p-4 bg-white rounded-xl">
              <QRCodeSVG value={remoteUrl} size={180} marginSize={2} />
            </div>
          )}
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

      <ServicePackModal open={servicePackModalOpen} onClose={() => setServicePackModalOpen(false)} slides={slides} />
    </div>
  );
}
