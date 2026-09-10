import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import type { TextAlign } from '@/types/editor';

interface AlignmentButtonGroupProps {
  value: TextAlign;
  onChange: (align: TextAlign) => void;
}

const OPTIONS: { value: TextAlign; icon: typeof AlignLeft }[] = [
  { value: 'left', icon: AlignLeft },
  { value: 'center', icon: AlignCenter },
  { value: 'right', icon: AlignRight },
];

export function AlignmentButtonGroup({ value, onChange }: AlignmentButtonGroupProps) {
  return (
    <div className="flex items-center rounded-lg border border-zinc-800 overflow-hidden">
      {OPTIONS.map(({ value: align, icon: Icon }) => (
        <button
          key={align}
          type="button"
          title={`Align ${align}`}
          onClick={() => onChange(align)}
          className={`p-1.5 transition-all ${
            value === align ? 'bg-maroon-900/50 text-maroon-400' : 'text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}
