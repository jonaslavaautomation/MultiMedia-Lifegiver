import { useEffect, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import type { Canvas } from 'fabric';
import { supabase } from '@/lib/supabase';
import { createTextObject } from '@/lib/fabricObjects';
import type { Song } from '@/types';

interface SongsPanelProps {
  canvas: Canvas | null;
  markDirty: () => void;
  refreshSelection: () => void;
}

/** Nav rail "Songs" drawer — search your worship song library and drop a section's lyrics onto the current slide. */
export function SongsPanel({ canvas, markDirty, refreshSelection }: SongsPanelProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openSong, setOpenSong] = useState<Song | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase.from('songs').select('*').order('title', { ascending: true });
      if (!cancelled) {
        if (error) console.error('Error loading songs for panel:', error.message);
        setSongs((data as Song[]) ?? []);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function insertSection(text: string) {
    if (!canvas) return;
    createTextObject(canvas, text);
    markDirty();
    refreshSelection();
  }

  if (openSong) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setOpenSong(null)}
          className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to songs
        </button>
        <p className="text-sm font-semibold text-zinc-900">{openSong.title}</p>
        {openSong.lyrics.sections.length === 0 ? (
          <p className="text-xs text-zinc-500">This song has no lyric sections yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {[...openSong.lyrics.sections]
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => insertSection(section.text)}
                  className="text-left px-3 py-2.5 rounded-xl bg-white/60 border border-zinc-200/80 hover:border-brand-600/60 hover:bg-brand-50 transition-all"
                >
                  <span className="block text-xs font-semibold uppercase tracking-wide text-brand-400 mb-1">{section.label}</span>
                  <span className="block text-xs text-zinc-600 line-clamp-2">{section.text}</span>
                </button>
              ))}
          </div>
        )}
      </div>
    );
  }

  const filtered = songs.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search songs…"
          className="w-full rounded-xl bg-white/80 border border-zinc-300/80 text-zinc-900 placeholder-zinc-500 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      {loading ? (
        <p className="text-xs text-zinc-500">Loading songs…</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-zinc-500">No songs found.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {filtered.map((song) => (
            <button
              key={song.id}
              type="button"
              onClick={() => setOpenSong(song)}
              className="text-left px-3 py-2.5 rounded-xl bg-white/60 border border-zinc-200/80 hover:border-brand-600/60 transition-all"
            >
              <span className="block text-sm text-zinc-800 truncate">{song.title}</span>
              {song.author && <span className="block text-xs text-zinc-500 truncate">{song.author}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
