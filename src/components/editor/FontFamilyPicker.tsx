import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { EDITOR_FONTS } from '@/lib/editorConstants';

interface FontFamilyPickerProps {
  value: string;
  onChange: (font: string) => void;
}

export function FontFamilyPicker({ value, onChange }: FontFamilyPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-800 transition-all min-w-[110px] justify-between"
        style={{ fontFamily: value }}
      >
        <span className="truncate">{value}</span>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
            {EDITOR_FONTS.map((font) => (
              <button
                key={font}
                type="button"
                onClick={() => {
                  onChange(font);
                  setOpen(false);
                }}
                style={{ fontFamily: font }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  font === value ? 'text-maroon-400 bg-maroon-950/30' : 'text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {font}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
