import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { SongSection } from '@/types';

interface SongSectionEditorProps {
  section: SongSection;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<Pick<SongSection, 'label' | 'text'>>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

const TYPE_BADGE_VARIANT: Record<SongSection['type'], 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  intro: 'default',
  verse: 'info',
  'pre-chorus': 'warning',
  chorus: 'success',
  bridge: 'danger',
  tag: 'default',
  outro: 'default',
};

export function SongSectionEditor({ section, isFirst, isLast, onChange, onMoveUp, onMoveDown, onDelete }: SongSectionEditorProps) {
  return (
    <div className="rounded-2xl bg-white/60 border border-zinc-200/80 p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Badge variant={TYPE_BADGE_VARIANT[section.type]}>{section.type}</Badge>
          <input
            type="text"
            value={section.label}
            onChange={(e) => onChange({ label: e.target.value })}
            className="flex-1 min-w-0 bg-transparent text-sm font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-brand-500/40 rounded px-1.5 py-0.5"
          />
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            title="Move up"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-all disabled:opacity-30 disabled:hover:text-zinc-800 disabled:hover:bg-transparent"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Move down"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-all disabled:opacity-30 disabled:hover:text-zinc-800 disabled:hover:bg-transparent"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Delete section"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-600 hover:bg-zinc-100 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <textarea
        value={section.text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Lyrics for this section…"
        rows={4}
        className="w-full rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 px-3 py-2.5 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
      />
    </div>
  );
}
