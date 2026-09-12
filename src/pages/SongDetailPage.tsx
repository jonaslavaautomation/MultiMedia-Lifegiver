import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Music4, Play, Plus, Presentation as PresentationIcon, Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { SongSectionEditor } from '@/components/songs/SongSectionEditor';
import { AddSectionModal } from '@/components/songs/AddSectionModal';
import { createTextSlideContent, splitTextIntoChunks } from '@/lib/slideContent';
import { SONG_THEMES, getSongThemeById, DEFAULT_SONG_THEME_ID } from '@/lib/songThemes';
import { getMotionPresetById } from '@/lib/motionLibrary';
import { MotionLibraryPanel } from '@/components/motion/MotionLibraryPanel';
import type { Presentation, Song, SongSection, SongSectionType } from '@/types';

function labelForNewSection(type: SongSectionType, existing: SongSection[]): string {
  const countOfType = existing.filter((s) => s.type === type).length;
  const base = type
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-');
  return countOfType > 0 ? `${base} ${countOfType + 1}` : base;
}

export function SongDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [song, setSong] = useState<Song | null>(null);
  const [sections, setSections] = useState<SongSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lyricsError, setLyricsError] = useState<string | null>(null);

  const [titleValue, setTitleValue] = useState('');
  const [authorValue, setAuthorValue] = useState('');
  const [categoryValue, setCategoryValue] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [tempoValue, setTempoValue] = useState('');

  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [presentationTitle, setPresentationTitle] = useState('');
  const [linesPerSlide, setLinesPerSlide] = useState(4);
  const [themeId, setThemeId] = useState(DEFAULT_SONG_THEME_ID);
  const [motionId, setMotionId] = useState<string | null>(null);
  const [motionPickerOpen, setMotionPickerOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [linkedPresentations, setLinkedPresentations] = useState<Presentation[]>([]);

  const fetchSong = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase.from('songs').select('*').eq('id', id).maybeSingle();

    if (fetchError) {
      console.error('Error fetching song:', fetchError.message);
      setError('Failed to load this song. Please try again.');
      setLoading(false);
      return;
    }

    const fetched = data as Song | null;
    setSong(fetched);
    if (fetched) {
      const fetchedSections = fetched.lyrics?.sections ?? [];
      setSections(fetchedSections);
      setTitleValue(fetched.title);
      setAuthorValue(fetched.author ?? '');
      setCategoryValue(fetched.category ?? '');
      setKeyValue(fetched.key ?? '');
      setTempoValue(fetched.tempo ?? '');
      setPresentationTitle(fetched.title);
      setSelectedIds(new Set(fetchedSections.map((s) => s.id)));

      const { data: presData, error: presError } = await supabase
        .from('presentations')
        .select('*')
        .eq('source_song_id', fetched.id)
        .order('created_at', { ascending: false });
      if (presError) {
        console.error('Error fetching linked presentations:', presError.message);
      } else {
        setLinkedPresentations((presData as Presentation[]) ?? []);
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchSong();
  }, [fetchSong]);

  async function persistLyrics(nextSections: SongSection[]) {
    setSections(nextSections);
    if (!song) return;
    const { error: saveError } = await supabase
      .from('songs')
      .update({ lyrics: { sections: nextSections } })
      .eq('id', song.id);

    if (saveError) {
      console.error('Error saving lyrics:', saveError.message);
      setLyricsError('Failed to save your changes. Please try again.');
    } else {
      setLyricsError(null);
    }
  }

  async function handleFieldBlur(field: 'title' | 'author' | 'category' | 'key' | 'tempo', value: string) {
    if (!song) return;
    const cleaned = value.trim();
    if (field === 'title' && !cleaned) {
      setTitleValue(song.title); // don't allow clearing the title
      return;
    }

    const { error: saveError } = await supabase
      .from('songs')
      .update({ [field]: field === 'title' ? cleaned : cleaned || null })
      .eq('id', song.id);

    if (saveError) {
      console.error(`Error saving ${field}:`, saveError.message);
      setLyricsError('Failed to save your changes. Please try again.');
      return;
    }
    setSong((prev) => (prev ? { ...prev, [field]: field === 'title' ? cleaned : cleaned || null } : prev));
  }

  function handleAddSection(type: SongSectionType) {
    const newSection: SongSection = {
      id: crypto.randomUUID(),
      type,
      label: labelForNewSection(type, sections),
      text: '',
      order: sections.length,
    };
    setSelectedIds((prev) => new Set(prev).add(newSection.id));
    persistLyrics([...sections, newSection]);
  }

  function handleSectionChange(sectionId: string, patch: Partial<Pick<SongSection, 'label' | 'text'>>) {
    persistLyrics(sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)));
  }

  function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const next = [...sections];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    persistLyrics(next.map((s, i) => ({ ...s, order: i })));
  }

  function handleDeleteSection(sectionId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
    persistLyrics(
      sections.filter((s) => s.id !== sectionId).map((s, i) => ({ ...s, order: i }))
    );
  }

  function toggleSelected(sectionId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  async function handleGenerateSlides() {
    const chosen = sections.filter((s) => selectedIds.has(s.id)).sort((a, b) => a.order - b.order);
    if (chosen.length === 0) {
      setGenerateError('Select at least one section to generate slides.');
      return;
    }

    setGenerating(true);
    setGenerateError(null);

    const { data: presentation, error: presError } = await supabase
      .from('presentations')
      .insert({
        title: presentationTitle.trim() || song!.title,
        status: 'ready', // generated slides are immediately Go-Live-ready, no manual status flip needed
        source_song_id: song!.id,
      })
      .select('id')
      .maybeSingle();

    if (presError || !presentation) {
      console.error('Error creating presentation:', presError?.message);
      setGenerateError('Failed to create the presentation. Please try again.');
      setGenerating(false);
      return;
    }

    const theme = getSongThemeById(themeId);
    const motion = motionId ? getMotionPresetById(motionId) : undefined;
    const textOptions = {
      fontFamily: theme?.fontFamily,
      fontSize: theme?.fontSize,
      fill: theme?.fill,
      textAlign: theme?.textAlign,
      backgroundColor: theme?.backgroundColor,
      backgroundMotionId: motion?.id ?? null,
    };

    const slideRows: { presentation_id: string; title: string; content: ReturnType<typeof createTextSlideContent>; sort_order: number }[] = [];
    chosen.forEach((section) => {
      const chunks = splitTextIntoChunks(section.text, linesPerSlide);
      if (chunks.length === 0) {
        // Section has no lyrics yet — still add a placeholder slide so it's not silently dropped.
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
      setGenerateError('Failed to generate slides. Please try again.');
      setGenerating(false);
      return;
    }

    navigate(`/presentations/${presentation.id}/edit`);
  }

  if (loading) {
    return (
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-zinc-200 rounded-lg animate-pulse mb-6" />
        <div className="h-64 bg-zinc-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-4xl mx-auto">
        <Button variant="ghost" size="icon" onClick={() => navigate('/songs')} className="mb-6">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Alert message={error} onRetry={fetchSong} />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Music4 className="w-12 h-12 text-zinc-300 mb-4" />
          <h2 className="text-lg font-semibold text-zinc-700 mb-1">Song not found</h2>
          <p className="text-sm text-zinc-500 mb-4">This song may have been deleted.</p>
          <Button variant="secondary" onClick={() => navigate('/songs')}>
            <ArrowLeft className="w-4 h-4" /> Back to Songs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/songs')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold font-display text-zinc-900">Edit Song</h1>
      </div>

      {lyricsError && (
        <div className="mb-4">
          <Alert message={lyricsError} />
        </div>
      )}

      {/* Metadata */}
      <Card className="p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Input
            label="Title"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={() => handleFieldBlur('title', titleValue)}
          />
          <Input
            label="Author"
            value={authorValue}
            onChange={(e) => setAuthorValue(e.target.value)}
            onBlur={() => handleFieldBlur('author', authorValue)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Category"
            placeholder="e.g. Worship, Hymn, Christmas"
            value={categoryValue}
            onChange={(e) => setCategoryValue(e.target.value)}
            onBlur={() => handleFieldBlur('category', categoryValue)}
          />
          <Input
            label="Key"
            placeholder="e.g. G"
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
            onBlur={() => handleFieldBlur('key', keyValue)}
          />
          <Input
            label="Tempo"
            placeholder="e.g. 72 BPM"
            value={tempoValue}
            onChange={(e) => setTempoValue(e.target.value)}
            onBlur={() => handleFieldBlur('tempo', tempoValue)}
          />
        </div>
      </Card>

      {/* Lyrics sections */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-zinc-900">Lyrics</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleAddSection('verse')}>
            <Plus className="w-3.5 h-3.5" /> Add Verse
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAddSection('chorus')}>
            <Plus className="w-3.5 h-3.5" /> Add Chorus
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAddSectionOpen(true)}>
            More…
          </Button>
        </div>
      </div>

      {sections.length === 0 ? (
        <Card className="mb-6">
          <EmptyState
            icon={Music4}
            title="No lyrics yet"
            description="Add a verse or chorus to start building this song."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3 mb-6">
          {sections.map((section, index) => (
            <SongSectionEditor
              key={section.id}
              section={section}
              isFirst={index === 0}
              isLast={index === sections.length - 1}
              onChange={(patch) => handleSectionChange(section.id, patch)}
              onMoveUp={() => handleMove(index, -1)}
              onMoveDown={() => handleMove(index, 1)}
              onDelete={() => handleDeleteSection(section.id)}
            />
          ))}
        </div>
      )}

      {/* Generate Slides */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <h2 className="text-base font-semibold text-zinc-900">Generate Slides</h2>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Pick which sections to include, then generate a new presentation. Long sections are automatically
          split across multiple slides.
        </p>

        {generateError && (
          <div className="mb-4">
            <Alert message={generateError} />
          </div>
        )}

        <div className="flex flex-col gap-2 mb-4">
          {sections.map((section) => (
            <label
              key={section.id}
              className="flex items-center gap-2.5 text-sm text-zinc-700 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(section.id)}
                onChange={() => toggleSelected(section.id)}
                className="w-4 h-4 rounded border-zinc-400 bg-white text-brand-600 focus:ring-brand-500/40"
              />
              {section.label}
            </label>
          ))}
        </div>

        <div className="mb-4">
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
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Motion background (optional)</p>
            {motionId && (
              <button
                type="button"
                onClick={() => setMotionId(null)}
                className="text-[11px] text-zinc-500 hover:text-red-600 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            )}
          </div>
          {motionId ? (
            <button
              type="button"
              onClick={() => setMotionPickerOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-lime-500/10 border border-lime-500/40 text-sm text-zinc-800"
            >
              <Sparkles className="w-3.5 h-3.5 text-lime-700 shrink-0" /> {getMotionPresetById(motionId)?.name}
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="flex-1">
            <Input
              label="Presentation title"
              value={presentationTitle}
              onChange={(e) => setPresentationTitle(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-32">
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Lines per slide</label>
            <input
              type="number"
              min={1}
              value={linesPerSlide}
              onChange={(e) => setLinesPerSlide(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-xl bg-white/80 border border-zinc-300/80 text-zinc-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
            />
          </div>
          <Button
            variant="primary"
            onClick={handleGenerateSlides}
            disabled={generating || sections.length === 0}
          >
            {generating ? (
              <>
                <span className="w-4 h-4 border-2 border-obsidian/30 border-t-obsidian rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Slides
              </>
            )}
          </Button>
        </div>
      </Card>

      {linkedPresentations.length > 0 && (
        <Card className="p-5 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <PresentationIcon className="w-4 h-4 text-brand-400" />
            <h2 className="text-base font-semibold text-zinc-900">Presentations from this song</h2>
          </div>
          <div className="flex flex-col gap-2">
            {linkedPresentations.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/60 border border-zinc-200/80">
                <div className="min-w-0 flex items-center gap-2">
                  <Badge variant={p.status === 'ready' ? 'success' : 'warning'}>{p.status}</Badge>
                  <Link to={`/presentations/${p.id}/edit`} className="text-sm text-zinc-800 hover:text-brand-700 truncate">
                    {p.title}
                  </Link>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/presentations/${p.id}/present`)} className="shrink-0">
                  <Play className="w-3.5 h-3.5" /> Go Live
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <AddSectionModal open={addSectionOpen} onClose={() => setAddSectionOpen(false)} onAdd={handleAddSection} />
    </div>
  );
}
