import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ExternalLink, Music4, Pause, Play, Search, Wand2, WifiOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { getActiveSongSearchProvider, type SongSearchFilter, type SongSearchResultItem } from '@/lib/songSearch';

interface OnlineSongSearchModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (item: SongSearchResultItem) => void;
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 400;

const FILTERS: { value: SongSearchFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'song', label: 'Song' },
  { value: 'artist', label: 'Artist' },
];

/**
 * "Search Online" — real song/artist metadata (title, artist, album,
 * artwork, a short audio preview) from the active SongSearchProvider
 * (iTunes today; see songSearch/index.ts). Never fetches or displays
 * lyrics text itself — Import hands the result to SmartImportModal, which
 * always requires the user to paste lyrics they're authorized to use (see
 * that modal, and itunesProvider.ts's header, for why).
 */
export function OnlineSongSearchModal({ open, onClose, onImport }: OnlineSongSearchModalProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SongSearchFilter>('all');
  const [results, setResults] = useState<SongSearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const { status: connectionStatus } = useConnectionStatus();
  const isOffline = connectionStatus === 'offline';

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setError(null);
  }, [open]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    abortRef.current?.abort();

    if (!open || trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    if (isOffline) {
      setResults([]);
      setLoading(false);
      setError(null); // the offline banner below already explains this — no need to duplicate it as an "error"
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    getActiveSongSearchProvider()
      .searchSongs(trimmed, { filter, signal: controller.signal })
      .then((items) => {
        if (controller.signal.aborted) return;
        setResults(items);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.error('Song search failed:', err);
        setError(err instanceof Error ? err.message : 'Song search is temporarily unavailable.');
        setResults([]);
        setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, filter, open, isOffline]);

  function togglePreview(item: SongSearchResultItem) {
    if (!item.previewUrl) return;
    if (playingId === item.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(item.previewUrl);
    audio.addEventListener('ended', () => setPlayingId(null));
    audioRef.current = audio;
    setPlayingId(item.id);
    void audio.play().catch(() => setPlayingId(null));
  }

  useEffect(() => {
    // Stop any preview clip the instant the modal closes — nothing should keep playing behind a closed dialog.
    if (!open) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Search Songs Online">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            autoFocus
            placeholder="Search song title or artist… (e.g. “Goodness of God”)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl bg-white/80 border border-zinc-300/80 text-zinc-900 placeholder-zinc-500 pl-10 pr-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f.value ? 'bg-brand-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isOffline ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-700">
            <WifiOff className="w-4 h-4 shrink-0" />
            Online search unavailable right now. Your saved songs are still fully available — this only affects finding new ones online.
          </div>
        ) : error ? (
          <Alert message={error} />
        ) : null}

        <div className="min-h-[280px]">
          {query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH ? (
            <p className="text-xs text-zinc-500 text-center py-10">Keep typing — at least {MIN_QUERY_LENGTH} characters to search.</p>
          ) : loading ? (
            <div className="flex flex-col gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-zinc-100 animate-pulse" />
              ))}
            </div>
          ) : results.length === 0 && debouncedQuery.trim().length >= MIN_QUERY_LENGTH && !isOffline && !error ? (
            <EmptyState icon={Music4} title="No matches" description="Try a different title or artist spelling." />
          ) : results.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Search for a song"
              description="Find a song by title or artist. You'll still paste in the lyrics yourself — this just finds the right one fast and links back to its source."
            />
          ) : (
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
              {results.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white/60 p-3">
                  <div className="w-12 h-12 rounded-lg bg-zinc-100 border border-zinc-200 shrink-0 overflow-hidden flex items-center justify-center">
                    {item.artworkUrl ? (
                      <img src={item.artworkUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Music4 className="w-5 h-5 text-zinc-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 truncate">{item.title}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {item.artist ?? 'Unknown artist'}
                      {item.album ? ` · ${item.album}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.previewUrl && (
                      <button
                        type="button"
                        title={playingId === item.id ? 'Pause preview' : 'Play preview'}
                        onClick={() => togglePreview(item)}
                        className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                      >
                        {playingId === item.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    )}
                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open source"
                        className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <Button variant="primary" size="sm" onClick={() => onImport(item)}>
                      <Wand2 className="w-3.5 h-3.5" /> Import
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-[11px] text-zinc-500 flex items-start gap-1.5 leading-relaxed">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Search results are metadata and a short preview only — never lyrics. Importing opens the lyrics editor where you paste in
          text you have the rights to use.
        </p>
      </div>
    </Modal>
  );
}
