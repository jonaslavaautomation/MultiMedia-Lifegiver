import { useState } from 'react';
import { COLOR_SWATCHES } from '@/lib/editorConstants';

interface ColorPickerPopoverProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}

/** Button trigger + absolutely-positioned popover, matching the app's existing dropdown-menu pattern. */
export function ColorPickerPopover({ value, onChange, label = 'Color' }: ColorPickerPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        title={label}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-all"
      >
        <span
          className="w-5 h-5 rounded-full border border-zinc-600 shrink-0"
          style={{ backgroundColor: value }}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-1 w-52 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">{label}</p>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => {
                    onChange(swatch);
                    setOpen(false);
                  }}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    value.toLowerCase() === swatch.toLowerCase() ? 'border-brand-500' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: swatch }}
                  title={swatch}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-8 h-8 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 rounded-lg bg-zinc-950/80 border border-zinc-700/80 text-zinc-100 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
