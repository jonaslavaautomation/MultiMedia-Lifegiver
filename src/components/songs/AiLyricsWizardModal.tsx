import { useState } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { generateSongLyrics, LYRIC_STYLES, LYRIC_MOODS, type GenerateLyricsResult } from '@/lib/aiLyrics';

interface AiLyricsWizardModalProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (result: GenerateLyricsResult) => void;
}

/**
 * "Write with AI" — generates completely original worship-song lyrics
 * (never an existing copyrighted song's text) from a topic/style/mood/
 * structure, via the generate-song-lyrics Edge Function. The output hands
 * straight into SmartImportModal's existing paste-and-parse flow — same
 * review, edit, and Go-Live-ready slide generation as any other import,
 * since AI-written lyrics deserve the same human review before saving as
 * lyrics pasted from anywhere else.
 */
export function AiLyricsWizardModal({ open, onClose, onGenerated }: AiLyricsWizardModalProps) {
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState<string>(LYRIC_STYLES[0]);
  const [mood, setMood] = useState<string>(LYRIC_MOODS[0]);
  const [verseCount, setVerseCount] = useState(2);
  const [includePreChorus, setIncludePreChorus] = useState(false);
  const [includeChorus, setIncludeChorus] = useState(true);
  const [includeBridge, setIncludeBridge] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTopic('');
    setStyle(LYRIC_STYLES[0]);
    setMood(LYRIC_MOODS[0]);
    setVerseCount(2);
    setIncludePreChorus(false);
    setIncludeChorus(true);
    setIncludeBridge(false);
    setError(null);
  }

  function handleClose() {
    if (generating) return;
    reset();
    onClose();
  }

  async function handleGenerate() {
    if (!topic.trim()) {
      setError('Give the song a topic first — e.g. "God\'s faithfulness through hard seasons".');
      return;
    }
    setGenerating(true);
    setError(null);

    try {
      const result = await generateSongLyrics({
        topic: topic.trim(),
        style,
        mood,
        verseCount,
        includeChorus,
        includePreChorus,
        includeBridge,
      });
      reset();
      onGenerated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate lyrics. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Write Lyrics with AI"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={generating}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleGenerate()} disabled={generating || !topic.trim()}>
            {generating ? (
              <>
                <span className="w-4 h-4 border-2 border-obsidian/30 border-t-obsidian rounded-full animate-spin" />
                Writing…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate Lyrics
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert message={error} />}

        <Input
          label="Topic"
          placeholder='e.g. "God&#39;s faithfulness through hard seasons"'
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full rounded-xl bg-white/80 border border-zinc-300/80 text-zinc-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
            >
              {LYRIC_STYLES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Mood</label>
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="w-full rounded-xl bg-white/80 border border-zinc-300/80 text-zinc-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
            >
              {LYRIC_MOODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">Structure</label>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              Verses
              <select
                value={verseCount}
                onChange={(e) => setVerseCount(Number(e.target.value))}
                className="rounded-lg bg-white/80 border border-zinc-300/80 text-zinc-900 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-sm text-zinc-700 cursor-pointer select-none">
              <input type="checkbox" checked={includePreChorus} onChange={(e) => setIncludePreChorus(e.target.checked)} className="w-4 h-4 rounded border-zinc-400 text-brand-600 focus:ring-brand-500/40" />
              Pre-Chorus
            </label>
            <label className="flex items-center gap-1.5 text-sm text-zinc-700 cursor-pointer select-none">
              <input type="checkbox" checked={includeChorus} onChange={(e) => setIncludeChorus(e.target.checked)} className="w-4 h-4 rounded border-zinc-400 text-brand-600 focus:ring-brand-500/40" />
              Chorus
            </label>
            <label className="flex items-center gap-1.5 text-sm text-zinc-700 cursor-pointer select-none">
              <input type="checkbox" checked={includeBridge} onChange={(e) => setIncludeBridge(e.target.checked)} className="w-4 h-4 rounded border-zinc-400 text-brand-600 focus:ring-brand-500/40" />
              Bridge
            </label>
          </div>
        </div>

        <p className="text-[11px] text-zinc-500 flex items-start gap-1.5 leading-relaxed">
          <Wand2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Writes entirely original lyrics for you to review and edit — never a copy of an existing song. You'll get a chance
          to tweak everything before saving.
        </p>
      </div>
    </Modal>
  );
}
