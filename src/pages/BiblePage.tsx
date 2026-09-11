import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Sparkles, X, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { BibleVersePicker, type SelectedVerse } from '@/components/bible/BibleVersePicker';
import { createTextSlideContent } from '@/lib/slideContent';
import { BIBLE_BOOKS } from '@/data/bibleBooks';
import { parseReference, type ParsedReference } from '@/lib/bibleReference';

function verseKey(book: string, chapter: number, verse: number): string {
  return `${book}|${chapter}|${verse}`;
}

export function BiblePage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<SelectedVerse[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [searchRef, setSearchRef] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [jumpTo, setJumpTo] = useState<ParsedReference | null>(null);

  function handleReferenceSearch() {
    const parsed = parseReference(searchRef, BIBLE_BOOKS);
    if (!parsed) {
      setSearchError('Could not understand that reference. Try something like "John 3:16".');
      return;
    }
    setSearchError(null);
    setJumpTo(parsed);
  }

  function isSelected(book: string, chapter: number, verse: number): boolean {
    const key = verseKey(book, chapter, verse);
    return selected.some((v) => verseKey(v.book, v.chapter, v.verse) === key);
  }

  function toggleVerse(v: SelectedVerse) {
    const key = verseKey(v.book, v.chapter, v.verse);
    setSelected((prev) => {
      const exists = prev.some((p) => verseKey(p.book, p.chapter, p.verse) === key);
      if (exists) return prev.filter((p) => verseKey(p.book, p.chapter, p.verse) !== key);
      return [...prev, v];
    });
  }

  function referenceLabel(): string {
    if (selected.length === 0) return '';
    const first = selected[0];
    if (selected.length === 1) return `${first.book} ${first.chapter}:${first.verse}`;
    const sameChapter = selected.every((v) => v.book === first.book && v.chapter === first.chapter);
    if (sameChapter) {
      const verseNums = selected.map((v) => v.verse).sort((a, b) => a - b);
      return `${first.book} ${first.chapter}:${verseNums[0]}-${verseNums[verseNums.length - 1]}`;
    }
    return `${first.book} ${first.chapter} +${selected.length - 1} more`;
  }

  async function handleAddToSlide() {
    if (selected.length === 0) return;
    setGenerating(true);
    setGenerateError(null);

    const { data: presentation, error: presError } = await supabase
      .from('presentations')
      .insert({ title: referenceLabel() })
      .select('id')
      .maybeSingle();

    if (presError || !presentation) {
      console.error('Error creating presentation:', presError?.message);
      setGenerateError('Failed to create the presentation. Please try again.');
      setGenerating(false);
      return;
    }

    const slideRows = selected.map((v, index) => ({
      presentation_id: presentation.id,
      title: `${v.book} ${v.chapter}:${v.verse}`,
      content: createTextSlideContent(v.text),
      sort_order: index,
    }));

    const { error: slidesError } = await supabase.from('slides').insert(slideRows);

    if (slidesError) {
      console.error('Error generating verse slides:', slidesError.message);
      await supabase.from('presentations').delete().eq('id', presentation.id);
      setGenerateError('Failed to generate slides. Please try again.');
      setGenerating(false);
      return;
    }

    navigate(`/presentations/${presentation.id}/edit`);
  }

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-4xl mx-auto pb-28">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-zinc-100 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-maroon-400" />
          Bible
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Browse a book and chapter, then add verses to a presentation.</p>
      </div>

      {generateError && (
        <div className="mb-4">
          <Alert message={generateError} />
        </div>
      )}

      {/* Quick reference search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder='Jump to a reference, e.g. "John 3:16"'
            value={searchRef}
            onChange={(e) => setSearchRef(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleReferenceSearch();
            }}
            className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 pl-11 pr-24 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-maroon-500/40 focus:border-maroon-600/60"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReferenceSearch}
            className="absolute right-1.5 top-1/2 -translate-y-1/2"
          >
            Go
          </Button>
        </div>
        {searchError && (
          <p className="text-xs text-red-400 mt-1.5">{searchError}</p>
        )}
      </div>

      <Card className="p-5">
        <BibleVersePicker
          isSelected={isSelected}
          onToggleVerse={toggleVerse}
          jumpTo={jumpTo}
          onJumped={() => setJumpTo(null)}
        />
      </Card>

      {selected.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md px-4 lg:px-8 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">{referenceLabel()}</p>
              <p className="text-xs text-zinc-500">{selected.length} verse{selected.length === 1 ? '' : 's'} selected</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
              <Button variant="primary" onClick={handleAddToSlide} disabled={generating}>
                {generating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Add to Slide
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
