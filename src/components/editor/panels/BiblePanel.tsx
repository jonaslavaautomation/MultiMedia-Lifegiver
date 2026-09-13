import { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import type { Canvas } from 'fabric';
import { Button } from '@/components/ui/Button';
import { createTextObject } from '@/lib/fabricObjects';
import { BIBLE_BOOKS } from '@/data/bibleBooks';
import { parseReference } from '@/lib/bibleReference';
import { fetchAndCacheChapter, NLT_ATTRIBUTION } from '@/lib/bibleApi';
import { BIBLE_TRANSLATIONS, DEFAULT_TRANSLATION } from '@/data/bibleTranslations';

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
  const [translation, setTranslation] = useState(DEFAULT_TRANSLATION);
  const [translationMenuOpen, setTranslationMenuOpen] = useState(false);

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
      const verses = await fetchAndCacheChapter(parsed.book, parsed.chapter, translation);
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
        <button
          type="button"
          onClick={() => setTranslationMenuOpen((o) => !o)}
          className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900"
        >
          {translation}
          <ChevronDown className="w-3 h-3" />
        </button>
        {translationMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setTranslationMenuOpen(false)} />
            <div className="absolute left-0 mt-1 w-52 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
              {BIBLE_TRANSLATIONS.map((t) => (
                <button
                  key={t.code}
                  type="button"
                  disabled={!t.available}
                  onClick={() => {
                    if (!t.available) return;
                    setTranslation(t.code);
                    setTranslationMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    !t.available
                      ? 'text-zinc-400 cursor-not-allowed'
                      : t.code === translation
                        ? 'text-brand-600 bg-brand-100'
                        : 'text-zinc-800 hover:bg-zinc-100'
                  }`}
                >
                  <span className="font-medium">{t.code}</span>
                  <span className="block text-[10px] text-zinc-500">{t.name} — {t.note}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
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
          className="w-full rounded-xl bg-white/80 border border-zinc-300/80 text-zinc-900 placeholder-zinc-500 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>
      <Button variant="primary" size="sm" className="justify-center" onClick={() => void handleSearch()} disabled={loading || !query.trim()}>
        {loading ? 'Loading…' : 'Add to Slide'}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-zinc-500">
        Drops the verse text onto the current slide, with a reference caption underneath — separate from the full Bible browser on the Bible page.
      </p>
      {translation === 'NLT' && <p className="text-[10px] text-zinc-400">{NLT_ATTRIBUTION}</p>}
    </div>
  );
}
