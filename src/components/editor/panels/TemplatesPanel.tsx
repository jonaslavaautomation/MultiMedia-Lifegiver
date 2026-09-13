import { useEffect, useState } from 'react';
import { LayoutTemplate, Save, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { TEMPLATE_CATEGORIES } from '@/lib/editorConstants';
import type { Template, SlideCanvasData } from '@/types';

interface TemplatesPanelProps {
  /** Replaces the current slide's content with a template's saved design. */
  onApply: (content: SlideCanvasData) => void;
  /** Serializes the current slide right now — used when saving it as a new template. */
  getCurrentSlideContent: () => SlideCanvasData | null;
}

/**
 * Nav rail "Templates" drawer — browse the shared template library and
 * apply a saved design straight onto the current slide, or save the current
 * slide as a new reusable template. `config` holds the same SlideCanvasData
 * shape `slides.content` does (see TemplatesPage.tsx), so applying one is
 * just handing it to the same hydration path a slide switch already uses.
 */
export function TemplatesPanel({ onApply, getCurrentSlideContent }: TemplatesPanelProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const [pendingApply, setPendingApply] = useState<Template | null>(null);

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function fetchTemplates(cancelledRef?: { current: boolean }) {
    const { data, error } = await supabase.from('templates').select('*').order('name', { ascending: true });
    if (cancelledRef?.current) return;
    if (error) console.error('Error loading templates for panel:', error.message);
    setTemplates((data as Template[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const cancelledRef = { current: false };
    void fetchTemplates(cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  function confirmApply() {
    if (!pendingApply) return;
    onApply(pendingApply.config as unknown as SlideCanvasData);
    setPendingApply(null);
  }

  function openSave() {
    setSaveName('');
    setSaveCategory('');
    setSaveError(null);
    setSaveOpen(true);
  }

  async function handleSaveAsTemplate() {
    if (!saveName.trim()) return;
    const content = getCurrentSlideContent();
    if (!content) {
      setSaveError('Nothing to save — the slide editor isn’t ready yet.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    const { error } = await supabase.from('templates').insert({
      name: saveName.trim(),
      category: saveCategory || null,
      config: content,
    });

    setSaving(false);
    if (error) {
      console.error('Error saving template:', error.message);
      setSaveError('Failed to save this template. Please try again.');
      return;
    }

    setSaveOpen(false);
    void fetchTemplates();
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" className="justify-center" onClick={openSave}>
        <Save className="w-4 h-4" /> Save Current Slide as Template
      </Button>

      <p className="text-xs text-zinc-500">
        Click a template to replace the current slide's design with it — your edit history still has Undo if it wasn't what you meant to do.
      </p>

      {loading ? (
        <p className="text-xs text-zinc-500">Loading templates…</p>
      ) : templates.length === 0 ? (
        <p className="text-xs text-zinc-500">No templates yet — add some from the Templates page, or save this slide as one above.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPendingApply(t)}
              title={`Apply "${t.name}" to this slide`}
              className="flex flex-col items-center gap-2 py-4 rounded-xl bg-white/60 border border-zinc-200/80 hover:border-brand-600/60 hover:bg-white transition-all"
            >
              <LayoutTemplate className="w-5 h-5 text-zinc-500" />
              <span className="text-[11px] text-zinc-600 text-center px-1 truncate w-full">{t.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Apply confirmation — this replaces the whole slide, so a quick guard against an accidental click. */}
      <Modal
        open={!!pendingApply}
        onClose={() => setPendingApply(null)}
        title="Apply Template"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingApply(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmApply}>
              <Sparkles className="w-4 h-4" /> Apply
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-600 leading-relaxed">
          Replace this slide's content with <span className="font-semibold text-zinc-800">{pendingApply?.name}</span>? This
          replaces everything currently on the slide — Undo (Ctrl/Cmd+Z) still works right after, if needed.
        </p>
      </Modal>

      {/* Save current slide as a new template */}
      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save as Template"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void handleSaveAsTemplate()} disabled={!saveName.trim() || saving}>
              {saving ? 'Saving…' : 'Save Template'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {saveError && <Alert message={saveError} />}
          <Input
            label="Template name"
            placeholder="e.g. Sunday Worship Title Slide"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSaveAsTemplate();
            }}
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Category</label>
            <select
              value={saveCategory}
              onChange={(e) => setSaveCategory(e.target.value)}
              className="w-full rounded-xl bg-white/80 border border-zinc-300/80 text-zinc-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
            >
              <option value="">No category</option>
              {TEMPLATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
