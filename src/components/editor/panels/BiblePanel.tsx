import { useState } from 'react';
import { Search } from 'lucide-react';
import type { Canvas } from 'fabric';
import { Button } from '@/components/ui/Button';
import { createTextObject } from '@/lib/fabricObjects';
import { BIBLE_BOOKS } from '@/data/bibleBooks';
import { parseReference } from '@/lib/bibleReference';
import { fetchAndCacheChapter } from '@/lib/bibleApi';

interface BiblePanelProps {
  canvas: Canvas | null;
  markDirty: () => void;
  refreshSelection: () => void;
}

/** Nav rail "Bible" drawer — quick-search a reference and drop it onto the slide as a styled text block. */
export function BiblePanel({ canvas, markDirty, refreshSelection }: BiblePanelProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    const parsed = parseReference(query, BIBLE_BOOKS);
    if (!parsed) {
      setError('Try a reference like "John 3:16" or "Psalm 23".');
      return;
    }
    if (!canvas) return;

    setLoading(true);
    setError(null);
    try {
      const verses = await fetchAndCacheChapter(parsed.book, parsed.chapter);
      const verseStart = parsed.verseStart ?? verses[0]?.verse ?? 1;
      const verseEnd = parsed.verseEnd ?? verseStart;
      const matched = verses.filter((v) => v.verse >= verseStart && v.verse <= verseEnd);

      if (matched.length === 0) {
        setError("Couldn't find that verse in this chapter.");
        return;
      }

      const text = matched.map((v) => v.text).join(' ');
      const reference =
        verseStart === verseEnd
          ? `${parsed.book.name} ${parsed.chapter}:${verseStart}`
          : `${parsed.book.name} ${parsed.chapter}:${verseStart}-${verseEnd}`;

      const textbox = createTextObject(canvas, text);
      textbox.set({ fontSize: 64 });
      canvas.requestRenderAll();
      markDirty();
      refreshSelection();

      // Small reference caption underneath, matching the Bible page's own generated slides.
      const caption = createTextObject(canvas, reference, { centerAt: { x: 960, y: 920 } });
      caption.set({ fontSize: 28, fontStyle: 'italic' });
      canvas.requestRenderAll();
      markDirty();

      setQuery('');
    } catch (err) {
      console.error('Bible panel search failed:', err);
      setError('Failed to load that passage. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSearch();
          }}
          placeholder='e.g. "John 3:16"'
          className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>
      <Button variant="primary" size="sm" className="justify-center" onClick={() => void handleSearch()} disabled={loading || !query.trim()}>
        {loading ? 'Loading…' : 'Add to Slide'}
      </Button>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-xs text-zinc-500">
        Drops the verse text onto the current slide, with a reference caption underneath — separate from the full Bible browser on the Bible page.
      </p>
    </div>
  );
}
