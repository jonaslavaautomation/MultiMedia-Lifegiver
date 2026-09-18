import { useEffect, useState } from 'react';
import { Search, Loader2, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { buildSlideRowsFromSections } from '@/lib/songSlideGeneration';
import { DEFAULT_SONG_THEME_ID } from '@/lib/songThemes';
import type { Song, Slide } from '@/types';

interface AddSongModalProps {
  open: boolean;
  onClose: () => void;
  presentationId: string;
  /** Slide count of the live presentation right now — new slides are appended after these (see sort_order below). */
  existingSlideCount: number;
  /** Fires with the newly-inserted slide rows (already saved to Supabase) right after a successful add. */
  onAdded: (slides: Slide[]) => void;
}

/**
 * "Add Song" for the Live Presentation Operator Console. Lets the operator
 * pull a song from the library and drop its slides straight into the
 * CURRENTLY live presentation — deliberately NOT the normal "Generate
 * Slides" flow (SongDetailPage.tsx / generatePresentationWithSlides), which
 * always spins up a brand-new, separate `presentations` row. A new
 * presentation means a new presentation id, which means the Projector/Stage
 * Display/Overlay windows already open (tied to THIS presentation's id via
 * their BroadcastChannel name) would go stale and have to be reopened
 * mid-service — exactly the disruption this feature exists to avoid.
 *
 * Uses buildSlideRowsFromSections (songSlideGeneration.ts) — the same pure
 * lyrics-to-slides chunking logic "Generate Slides" uses — but inserts the
 * resulting rows directly into the existing `slides` table for this
 * presentation instead of going through the presentation-creating RPC.
 */
export function AddSongModal({ open, onClose, presentationId, existingSlideCount, onAdded }: AddSongModalProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addingSongId, setAddingSongId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      const { data, error: fetchError } = await supabase.from('songs').select('*').order('title', { ascending: true });
      if (cancelled) return;
      if (fetchError) {
        console.error('Error loading songs for Add Song:', fetchError.message);
        setError('Failed to load songs.');
      } else {
        setSongs((data as Song[]) ?? []);
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handlePickSong(song: Song) {
    if (addingSongId) return;
    setAddingSongId(song.id);
    setError(null);

    try {
      const sections = [...song.lyrics.sections].sort((a, b) => a.order - b.order);
      if (sections.length === 0) {
        setError(`"${song.title}" has no lyrics yet — add some on its song page first.`);
        return;
      }

      const rows = buildSlideRowsFromSections(sections, {
        linesPerSlide: 4,
        themeId: DEFAULT_SONG_THEME_ID,
        motionId: null,
      });

      const toInsert = rows.map((row) => ({
        presentation_id: presentationId,
        title: row.title,
        content: row.content,
        background_id: null,
        sort_order: existingSlideCount + row.sort_order,
      }));

      const { data, error: insertError } = await supabase.from('slides').insert(toInsert).select('*');
      if (insertError) throw insertError;
      onAdded((data as Slide[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add this song.');
    } finally {
      setAddingSongId(null);
    }
  }

  const filtered = songs.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal open={open} onClose={onClose} title="Add Song to This Set">
      <div className="flex flex-col gap-3">
        <p className="text-xs text-zinc-500 leading-relaxed">
          Drops this song's slides straight into the presentation that's live right now — the Projector, Stage
          Display, and Overlay windows already open will pick it up automatically. No need to reopen them.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search songs…"
            className="w-full rounded-xl bg-zinc-50 border border-zinc-300/80 text-zinc-900 placeholder-zinc-500 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {loading ? (
          <p className="text-xs text-zinc-500">Loading songs…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-zinc-500">No songs found.</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {filtered.map((song) => (
              <button
                key={song.id}
                type="button"
                disabled={addingSongId !== null}
                onClick={() => handlePickSong(song)}
                className="flex items-center justify-between gap-2 text-left px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 hover:border-brand-500/60 hover:bg-brand-50 transition-all disabled:opacity-60"
              >
                <span className="min-w-0">
                  <span className="block text-sm text-zinc-800 truncate">{song.title}</span>
                  {song.author && <span className="block text-xs text-zinc-500 truncate">{song.author}</span>}
                </span>
                {addingSongId === song.id ? (
                  <Loader2 className="w-4 h-4 text-brand-600 animate-spin shrink-0" />
                ) : (
                  <Plus className="w-4 h-4 text-zinc-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
