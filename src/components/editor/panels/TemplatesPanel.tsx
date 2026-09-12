import { useEffect, useState } from 'react';
import { LayoutTemplate } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Template } from '@/types';

/**
 * Nav rail "Templates" drawer — browses the template library. Applying a
 * template's saved design onto a slide isn't wired up yet: today a
 * template only stores a name/category/thumbnail, not real canvas content
 * (see TemplatesPage — its config is always an empty placeholder, since
 * there's no template *design* editor yet, only metadata management).
 * Shown honestly here rather than pretending "apply" does something it
 * doesn't.
 */
export function TemplatesPanel() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase.from('templates').select('*').order('name', { ascending: true });
      if (!cancelled) {
        if (error) console.error('Error loading templates for panel:', error.message);
        setTemplates((data as Template[]) ?? []);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-zinc-500">
        Browsing your template library. Applying a saved design straight onto a slide needs a template design editor, which doesn't exist yet —
        this is metadata-only for now.
      </p>

      {loading ? (
        <p className="text-xs text-zinc-500">Loading templates…</p>
      ) : templates.length === 0 ? (
        <p className="text-xs text-zinc-500">No templates yet — add some from the Templates page.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {templates.map((t) => (
            <div
              key={t.id}
              title="Applying templates directly isn't available yet"
              className="flex flex-col items-center gap-2 py-4 rounded-xl bg-white/60 border border-zinc-200/80 opacity-70 cursor-not-allowed"
            >
              <LayoutTemplate className="w-5 h-5 text-zinc-500" />
              <span className="text-[11px] text-zinc-600 text-center px-1 truncate w-full">{t.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
