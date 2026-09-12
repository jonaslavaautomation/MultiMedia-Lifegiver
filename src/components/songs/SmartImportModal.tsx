import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, Music4, Sparkles, Wand2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { parseLyrics, type ParsedSection } from '@/lib/lyricsParser';
import { splitTextIntoChunks, createTextSlideContent } from '@/lib/slideContent';
import { SONG_THEMES, getSongThemeById, DEFAULT_SONG_THEME_ID } from '@/lib/songThemes';
import { getMotionPresetById } from '@/lib/motionLibrary';
import { MotionLibraryPanel } from '@/components/motion/MotionLibraryPanel';
import { saveImportDraft, loadImportDraft, clearImportDraft, saveImportPrefs, loadImportPrefs } from '@/lib/importDraftCache';
import type { SongSectionType } from '@/types';

interface SmartImportModalProps {
  open: boolean;
  onClose: () => void;
  /** Existing song titles (case-insensitive check) — used only to warn about likely duplicates, never to block. */
  existingTitles: string[];
  onImported: (songId: string, presentationId: string | null) => void;
}

type Step = 'paste' | 'review';

const SECTION_TYPES: SongSectionType[] = ['intro', 'verse', 'pre-chorus', 'chorus', 'refrain', 'bridge', 'tag', 'outro'];

export function SmartImportModal({ open, onClose, existingTitles, onImported }: SmartImportModalProps) {
  const [step, setStep] = useState<Step>('paste');

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [rawText, setRawText] = useState('');

  const [sections, setSections] = useState<ParsedSection[]>([]);
  const [includedIndexes, setIncludedIndexes] = useState<Set<number>>(new Set());
  const [detectionMethod, setDetectionMethod] = useState<'labeled' | 'unlabeled-heuristic' | 'empty' | null>(null);
  const [chordLinesStripped, setChordLinesStripped] = useState(0);

  const [themeId, setThemeId] = useState(DEFAULT_SONG_THEME_ID);
  const [motionId, setMotionId] = useState<string | null>(null);
  const [motionPickerOpen, setMotionPickerOpen] = useState(false);
  const [linesPerSlide, setLinesPerSlide] = useState(4);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [restoredDraft, setRestoredDraft] = useState(false);

  // Restore an autosaved draft (and remembered theme/motion prefs) when the modal opens.
  useEffect(() => {
    if (!open) return;
    const draft = loadImportDraft();
    if (draft && (draft.title.trim() || draft.rawText.trim())) {
      setTitle(draft.title);
      setAuthor(draft.author);
      setCategory(draft.category);
      setRawText(draft.rawText);
      setRestoredDraft(true);
    }
    const prefs = loadImportPrefs();
    if (prefs.themeId) setThemeId(prefs.themeId);
    if (prefs.motionId !== undefined) setMotionId(prefs.motionId ?? null);
    if (prefs.linesPerSlide) setLinesPerSlide(prefs.linesPerSlide);
  }, [open]);

  // Autosave the draft on every change while the paste step is active.
  useEffect(() => {
    if (!open || step !== 'paste') return;
    const timer = setTimeout(() => {
      saveImportDraft({ title, author, category, rawText });
    }, 400);
    return () => clearTimeout(timer);
  }, [open, step, title, author, category, rawText]);

  const isDuplicateTitle = useMemo(
    () => !!title.trim() && existingTitles.some((t) => t.toLowerCase() === title.trim().toLowerCase()),
    [title, existingTitles]
  );

  function resetAll() {
    setStep('paste');
    setTitle('');
    setAuthor('');
    setCategory('');
    setRawText('');
    setSections([]);
    setIncludedIndexes(new Set());
    setDetectionMethod(null);
    setChordLinesStripped(0);
    setMotionId(null);
    setSaveError(null);
    setRestoredDraft(false);
  }

  function handleClose() {
    onClose();
  }

  function handleDetect() {
    const result = parseLyrics(rawText);
    setSections(result.sections);
    setIncludedIndexes(new Set(result.sections.map((_, i) => i)));
    setDetectionMethod(result.method);
    setChordLinesStripped(result.chordLinesStripped);
    setStep('review');
  }

  function updateSection(index: number, patch: Partial<ParsedSection>) {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function toggleIncluded(index: number) {
    setIncludedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleSave(generateSlides: boolean) {
    if (!title.trim()) {
      setSaveError('Give the song a title first.');
      return;
    }
    setSaving(true);
    setSaveError(null);

    const lyrics = {
      sections: sections.map((s, i) => ({
        id: crypto.randomUUID(),
        type: s.type,
        label: s.label,
        text: s.text,
        order: i,
      })),
    };

    const { data: song, error: songError } = await supabase
      .from('songs')
      .insert({
        title: title.trim(),
        author: author.trim() || null,
        category: category.trim() || null,
        lyrics,
      })
      .select('id')
      .maybeSingle();

    if (songError || !song) {
      console.error('Error creating song:', songError?.message);
      setSaveError('Failed to save this song. Please try again.');
      setSaving(false);
      return;
    }

    saveImportPrefs({ themeId, motionId, linesPerSlide });

    if (!generateSlides) {
      clearImportDraft();
      setSaving(false);
      resetAll();
      onImported(song.id, null);
      return;
    }

    const chosen = sections.filter((_, i) => includedIndexes.has(i));
    if (chosen.length === 0) {
      setSaveError('Song saved — but select at least one section to also generate slides.');
      setSaving(false);
      clearImportDraft();
      return;
    }

    const theme = getSongThemeById(themeId);
    const motion = motionId ? getMotionPresetById(motionId) : undefined;

    const { data: presentation, error: presError } = await supabase
      .from('presentations')
      .insert({
        title: title.trim(),
        status: 'ready', // Smart Import's whole point: the song is immediately ready for Go Live, no manual status flip needed.
        source_song_id: song.id,
      })
      .select('id')
      .maybeSingle();

    if (presError || !presentation) {
      console.error('Error creating presentation:', presError?.message);
      setSaveError('Song was saved, but creating the presentation failed. You can still generate slides from the song page.');
      setSaving(false);
      clearImportDraft();
      onImported(song.id, null);
      return;
    }

    const slideRows: { presentation_id: string; title: string; content: ReturnType<typeof createTextSlideContent>; sort_order: number }[] = [];
    chosen.forEach((section) => {
      const chunks = splitTextIntoChunks(section.text, linesPerSlide);
      const textOptions = {
        fontFamily: theme?.fontFamily,
        fontSize: theme?.fontSize,
        fill: theme?.fill,
        textAlign: theme?.textAlign,
        backgroundColor: theme?.backgroundColor,
        backgroundMotionId: motion?.id ?? null,
      };
      if (chunks.length === 0) {
        slideRows.push({
          presentation_id: presentation.id,
          title: section.label,
          content: createTextSlideContent(section.label, textOptions),
          sort_order: slideRows.length,
        });
        return;
      }
      chunks.forEach((chunkText, chunkIndex) => {
        slideRows.push({
          presentation_id: presentation.id,
          title: chunks.length > 1 ? `${section.label} (${chunkIndex + 1}/${chunks.length})` : section.label,
          content: createTextSlideContent(chunkText, textOptions),
          sort_order: slideRows.length,
        });
      });
    });

    const { error: slidesError } = await supabase.from('slides').insert(slideRows);

    if (slidesError) {
      console.error('Error generating slides:', slidesError.message);
      await supabase.from('presentations').delete().eq('id', presentation.id);
      setSaveError('Song was saved, but slide generation failed. You can try generating slides again from the song page.');
      setSaving(false);
      clearImportDraft();
      onImported(song.id, null);
      return;
    }

    clearImportDraft();
    setSaving(false);
    resetAll();
    onImported(song.id, presentation.id);
  }

  const selectedTheme = getSongThemeById(themeId);
  const selectedMotion = motionId ? getMotionPresetById(motionId) : null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={step === 'paste' ? 'Smart Import' : 'Review & Generate'}
      footer={
        step === 'paste' ? (
          <>
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" onClick={handleDetect} disabled={!title.trim() || !rawText.trim()}>
              <Wand2 className="w-4 h-4" /> Detect Sections
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setStep('paste')}>
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button variant="outline" onClick={() => void handleSave(false)} disabled={saving}>
              Save Song Only
            </Button>
            <Button variant="primary" onClick={() => void handleSave(true)} disabled={saving}>
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-obsidian/30 border-t-obsidian rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Save &amp; Generate Slides
                </>
              )}
            </Button>
          </>
        )
      }
    >
      {step === 'paste' ? (
        <div className="flex flex-col gap-4">
          {restoredDraft && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-vanilla/40 border border-vanilla/70 px-3 py-2 text-xs text-obsidian">
              <span>Restored your unfinished import from last time.</span>
              <button
                type="button"
                onClick={() => { clearImportDraft(); resetAll(); }}
                className="shrink-0 underline underline-offset-2"
              >
                Discard
              </button>
            </div>
          )}
          {saveError && <Alert message={saveError} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Song title" placeholder="e.g. Amazing Grace" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            <Input label="Author (optional)" placeholder="e.g. John Newton" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          {isDuplicateTitle && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              A song titled "{title.trim()}" already exists — you can still continue, or cancel and open the existing one instead.
            </div>
          )}
          <Input label="Category (optional)" placeholder="e.g. Worship, Hymn, Christmas" value={category} onChange={(e) => setCategory(e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Paste lyrics</label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={10}
              placeholder={'Paste lyrics here — with or without [Verse]/[Chorus] labels.\nChord lines (e.g. "G   D   Em   C") are detected and stripped automatically.'}
              className="w-full rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 px-4 py-3 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
            />
            <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
              Only paste lyrics you have the rights to use — your church's CCLI-licensed copy, a hymnal, or your
              own writing. This doesn't fetch lyrics from the internet.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {saveError && <Alert message={saveError} />}

          <div className="flex items-center gap-2 text-xs">
            {detectionMethod === 'labeled' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                <Check className="w-3 h-3" /> Detected from [Verse]/[Chorus] labels
              </span>
            )}
            {detectionMethod === 'unlabeled-heuristic' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                <AlertTriangle className="w-3 h-3" /> No labels found — guessed from repeated blocks. Please review below.
              </span>
            )}
            {chordLinesStripped > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-600">
                Stripped {chordLinesStripped} chord line{chordLinesStripped === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
            {sections.map((section, index) => (
              <div key={index} className="rounded-xl border border-zinc-200 bg-white/60 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={includedIndexes.has(index)}
                    onChange={() => toggleIncluded(index)}
                    className="w-4 h-4 rounded border-zinc-400 bg-white text-brand-600 focus:ring-brand-500/40 shrink-0"
                  />
                  <select
                    value={section.type}
                    onChange={(e) => updateSection(index, { type: e.target.value as SongSectionType })}
                    className="rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs px-2 py-1 capitalize focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  >
                    {SECTION_TYPES.map((t) => (
                      <option key={t} value={t} className="capitalize">{t}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={section.label}
                    onChange={(e) => updateSection(index, { label: e.target.value })}
                    className="flex-1 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                </div>
                <textarea
                  value={section.text}
                  onChange={(e) => updateSection(index, { text: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs px-2 py-1.5 resize-y focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Slide theme</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {SONG_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setThemeId(t.id)}
                  title={t.description}
                  className={`aspect-video rounded-lg border-2 flex items-center justify-center text-[10px] font-medium transition-all ${
                    themeId === t.id ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                  style={{ backgroundColor: t.backgroundColor, color: t.fill, fontFamily: t.fontFamily }}
                >
                  Aa
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">{selectedTheme?.name}: {selectedTheme?.description}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Motion background (optional)</p>
              {selectedMotion && (
                <button type="button" onClick={() => setMotionId(null)} className="text-[11px] text-zinc-500 hover:text-red-600 flex items-center gap-1">
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
            </div>
            {selectedMotion ? (
              <button
                type="button"
                onClick={() => setMotionPickerOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-lime-500/10 border border-lime-500/40 text-sm text-zinc-800"
              >
                <Sparkles className="w-3.5 h-3.5 text-lime-700 shrink-0" /> {selectedMotion.name}
              </button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setMotionPickerOpen((v) => !v)} className="w-full justify-center">
                <Sparkles className="w-3.5 h-3.5" /> Choose a motion background
              </Button>
            )}
            {motionPickerOpen && (
              <div className="mt-2 rounded-xl border border-zinc-200 p-3">
                <MotionLibraryPanel
                  onSelect={(id) => {
                    setMotionId(id);
                    setMotionPickerOpen(false);
                  }}
                />
              </div>
            )}
          </div>

          <div className="w-full sm:w-40">
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Lines per slide</label>
            <input
              type="number"
              min={1}
              value={linesPerSlide}
              onChange={(e) => setLinesPerSlide(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-xl bg-white/80 border border-zinc-300/80 text-zinc-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
            />
          </div>

          <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <Music4 className="w-3 h-3" /> "Save &amp; Generate Slides" creates a presentation marked <strong>ready</strong> — no extra step needed before Go Live.
          </p>
        </div>
      )}
    </Modal>
  );
}
