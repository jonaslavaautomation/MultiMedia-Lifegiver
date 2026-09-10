import { useCallback, useEffect, useState } from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import { BIBLE_BOOKS, type BibleBookMeta } from '@/data/bibleBooks';
import { fetchAndCacheChapter, type ChapterVerse } from '@/lib/bibleApi';
import { Alert } from '@/components/ui/Alert';

export interface SelectedVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

interface BibleVersePickerProps {
  isSelected: (book: string, chapter: number, verse: number) => boolean;
  onToggleVerse: (verse: SelectedVerse) => void;
}

/** Book grid -> chapter grid -> verse checklist. Reports selections upward; the caller owns what "Add to Slide" does. */
export function BibleVersePicker({ isSelected, onToggleVerse }: BibleVersePickerProps) {
  const [search, setSearch] = useState('');
  const [book, setBook] = useState<BibleBookMeta | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [verses, setVerses] = useState<ChapterVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChapter = useCallback(async (b: BibleBookMeta, c: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAndCacheChapter(b, c);
      setVerses(result);
    } catch (err) {
      console.error('Error loading chapter:', err);
      setError('Failed to load this chapter. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (book && chapter) loadChapter(book, chapter);
  }, [book, chapter, loadChapter]);

  const filteredBooks = BIBLE_BOOKS.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));
  const oldTestament = filteredBooks.filter((b) => b.testament === 'old');
  const newTestament = filteredBooks.filter((b) => b.testament === 'new');

  if (!book) {
    return (
      <div className="flex flex-col gap-5">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search books…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 pl-11 pr-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-maroon-500/40 focus:border-maroon-600/60"
          />
        </div>
        <BookSection title="Old Testament" books={oldTestament} onPick={setBook} />
        <BookSection title="New Testament" books={newTestament} onPick={setBook} />
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => setBook(null)}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Books
        </button>
        <h3 className="text-lg font-semibold text-zinc-100">{book.name}</h3>
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              onClick={() => setChapter(num)}
              className="aspect-square rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-sm text-zinc-300 hover:border-maroon-600/60 hover:text-maroon-400 transition-all"
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => setChapter(null)}
        className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> {book.name}
      </button>
      <h3 className="text-lg font-semibold text-zinc-100">
        {book.name} {chapter}
      </h3>

      {error ? (
        <Alert message={error} onRetry={() => loadChapter(book, chapter)} />
      ) : loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-zinc-900/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1 max-h-[420px] overflow-y-auto pr-1">
          {verses.map((v) => (
            <label
              key={v.verse}
              className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-zinc-900/50 cursor-pointer text-sm transition-colors"
            >
              <input
                type="checkbox"
                checked={isSelected(book.name, chapter, v.verse)}
                onChange={() => onToggleVerse({ book: book.name, chapter, verse: v.verse, text: v.text })}
                className="mt-0.5 w-4 h-4 rounded border-zinc-600 bg-zinc-900 text-maroon-600 focus:ring-maroon-500/40 shrink-0"
              />
              <span className="text-zinc-300 leading-relaxed">
                <span className="text-zinc-500 mr-1.5">{v.verse}</span>
                {v.text}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function BookSection({
  title,
  books,
  onPick,
}: {
  title: string;
  books: BibleBookMeta[];
  onPick: (book: BibleBookMeta) => void;
}) {
  if (books.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">{title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {books.map((b) => (
          <button
            key={b.id}
            onClick={() => onPick(b)}
            className="text-left px-3 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-sm text-zinc-300 hover:border-maroon-600/60 hover:text-zinc-100 transition-all truncate"
          >
            {b.name}
          </button>
        ))}
      </div>
    </div>
  );
}
