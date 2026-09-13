import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Sparkles, X, Search, Copy, Check, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { BibleVersePicker, type SelectedVerse } from '@/components/bible/BibleVersePicker';
import { createVerseSlideContent } from '@/lib/slideContent';
import { BIBLE_BOOKS } from '@/data/bibleBooks';
import { parseReference, type ParsedReference } from '@/lib/bibleReference';
import { BIBLE_TRANSLATIONS, DEFAULT_TRANSLATION } from '@/data/bibleTranslations';
import { NLT_ATTRIBUTION } from '@/lib/bibleApi';
import { PageHeaderIcon } from '@/components/ui/PageHeaderIcon';

function verseKey(book: string, chapter: number, verse: number): string {
  return `${book}|${chapter}|${verse}`;
}

export function BiblePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selected, setSelected] = useState<SelectedVerse[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [searchRef, setSearchRef] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [jumpTo, setJumpTo] = useState<ParsedReference | null>(null);
  const [translation, setTranslation] = useState(DEFAULT_TRANSLATION);
  const [translationMenuOpen, setTranslationMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleReferenceSearch(raw: string = searchRef) {
    const parsed = parseReference(raw, BIBLE_BOOKS);
    if (!parsed) {
      setSearchError('Could not understand that reference. Try something like "John 3:16".');
      return;
    }
    setSearchError(null);
    setJumpTo(parsed);
  }

  // Arriving from the Command Palette (Cmd/Ctrl+K) with a reference already
  // typed there — jump straight to it instead of making the user retype it.
  useEffect(() => {
    const incoming = (location.state as { query?: string } | null)?.query;
    if (!incoming) return;
    setSearchRef(incoming);
    handleReferenceSearch(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function handleCopy() {
    const text = selected
      .slice()
      .sort((a, b) => a.verse - b.verse)
      .map((v) => `${v.text} (${v.book} ${v.chapter}:${v.verse})`)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied — nothing more we can do here.
    }
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
      content: createVerseSlideContent(`${v.book} ${v.chapter}:${v.verse}`, v.text),
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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <PageHeaderIcon icon={BookOpen} />
          <div>
            <h1 className="text-2xl font-bold font-display text-zinc-900">Bible</h1>
            <p className="text-sm text-zinc-500 mt-1">Browse a book and chapter, then add verses to a presentation.</p>
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setTranslationMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/80 border border-zinc-300/80 text-sm text-zinc-800 hover:border-zinc-400 transition-all"
          >
            {translation}
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          </button>
          {translationMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setTranslationMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-56 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                {BIBLE_TRANSLATIONS.map((t) => (
                  <button
                    key={t.code}
                    disabled={!t.available}
                    onClick={() => {
                      if (!t.available) return;
                      setTranslation(t.code);
                      setTranslationMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      !t.available
                        ? 'text-zinc-400 cursor-not-allowed'
                        : t.code === translation
                          ? 'text-brand-600 bg-brand-100'
                          : 'text-zinc-800 hover:bg-zinc-100'
                    }`}
                  >
                    <span className="font-medium">{t.code}</span>
                    <span className="block text-[11px] text-zinc-500">{t.name} — {t.note}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
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
            className="w-full rounded-xl bg-white/80 border border-zinc-300/80 text-zinc-900 placeholder-zinc-500 pl-11 pr-24 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleReferenceSearch()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2"
          >
            Go
          </Button>
        </div>
        {searchError && (
          <p className="text-xs text-red-600 mt-1.5">{searchError}</p>
        )}
      </div>

      <Card className="p-5">
        <BibleVersePicker
          isSelected={isSelected}
          onToggleVerse={toggleVerse}
          jumpTo={jumpTo}
          onJumped={() => setJumpTo(null)}
          translation={translation}
        />
      </Card>

      {translation === 'NLT' && (
        <p className="text-[11px] text-zinc-500 mt-3 max-w-4xl">{NLT_ATTRIBUTION}</p>
      )}

      {selected.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur-md px-4 lg:px-8 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-800 truncate">{referenceLabel()}</p>
              <p className="text-xs text-zinc-500">{selected.length} verse{selected.length === 1 ? '' : 's'} selected</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="primary" onClick={handleAddToSlide} disabled={generating}>
                {generating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-obsidian/30 border-t-obsidian rounded-full animate-spin" />
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
