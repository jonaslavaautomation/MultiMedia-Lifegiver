import { LayoutTemplate, BookOpen, Music4, Shapes, Type, Image as ImageIcon, Palette } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type EditorPanelKind = 'templates' | 'bible' | 'songs' | 'elements' | 'text' | 'media' | 'brand';

interface NavItem {
  kind: EditorPanelKind;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { kind: 'templates', label: 'Templates', icon: LayoutTemplate },
  { kind: 'bible', label: 'Bible', icon: BookOpen },
  { kind: 'songs', label: 'Songs', icon: Music4 },
  { kind: 'elements', label: 'Elements', icon: Shapes },
  { kind: 'text', label: 'Text', icon: Type },
  { kind: 'media', label: 'Media', icon: ImageIcon },
  { kind: 'brand', label: 'Brand', icon: Palette },
];

interface EditorNavRailProps {
  active: EditorPanelKind | null;
  onSelect: (kind: EditorPanelKind) => void;
}

/** Left icon dock — the primary switcher between the editor's asset drawers (Canva/Figma-style tool rail). */
export function EditorNavRail({ active, onSelect }: EditorNavRailProps) {
  return (
    <div className="flex lg:flex-col items-center gap-1.5 p-2 rounded-2xl bg-surface/60 border border-white/10 shrink-0">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.kind;
        return (
          <button
            key={item.kind}
            type="button"
            title={item.label}
            onClick={() => onSelect(item.kind)}
            className={`flex flex-col items-center gap-1 w-16 py-2.5 rounded-xl border transition-all ${
              isActive
                ? 'bg-lime-500/10 border-lime-500/60 text-lime-400 shadow-glow-lime'
                : 'border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/5 hover:border-white/10'
            }`}
          >
            <Icon className="w-5 h-5" strokeWidth={2} />
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
