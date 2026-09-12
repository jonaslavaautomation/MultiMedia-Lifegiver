import { Sparkles, Type } from 'lucide-react';
import type { Canvas } from 'fabric';
import { Button } from '@/components/ui/Button';
import { createTextObject } from '@/lib/fabricObjects';

interface TextPanelProps {
  canvas: Canvas | null;
  markDirty: () => void;
  refreshSelection: () => void;
}

const PRESETS = [
  { label: 'Heading', text: 'Add a heading', fontSize: 96, fontWeight: 'bold' as const },
  { label: 'Subheading', text: 'Add a subheading', fontSize: 56, fontWeight: 'normal' as const },
  { label: 'Body text', text: 'Add body text', fontSize: 36, fontWeight: 'normal' as const },
];

/** Nav rail "Text" drawer — quick text insertion and typography presets. */
export function TextPanel({ canvas, markDirty, refreshSelection }: TextPanelProps) {
  function addPreset(preset: (typeof PRESETS)[number]) {
    if (!canvas) return;
    const textbox = createTextObject(canvas, preset.text);
    textbox.set({ fontSize: preset.fontSize, fontWeight: preset.fontWeight });
    canvas.requestRenderAll();
    markDirty();
    refreshSelection();
  }

  return (
    <div className="flex flex-col gap-4">
      <Button variant="primary" className="justify-center" onClick={() => addPreset({ label: 'Body text', text: 'Add your text', fontSize: 72, fontWeight: 'normal' })}>
        <Type className="w-4 h-4" /> Add a Text Box
      </Button>

      <button
        type="button"
        disabled
        title="AI text generation is coming soon — needs an AI provider connected first."
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed border-zinc-300/80 text-zinc-500 text-sm cursor-not-allowed opacity-70"
      >
        <Sparkles className="w-4 h-4 text-leaf-500" />
        <span className="flex-1 text-left">AI Auto-Generate lyric/scripture</span>
        <span className="text-[10px] uppercase tracking-wide bg-zinc-100 rounded px-1.5 py-0.5">Soon</span>
      </button>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Typography presets</p>
        <div className="flex flex-col gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => addPreset(preset)}
              className="text-left px-3 py-2.5 rounded-xl bg-white/60 border border-zinc-200/80 hover:border-brand-600/60 hover:bg-brand-50 transition-all"
            >
              <span
                className="block text-zinc-900 truncate"
                style={{ fontSize: Math.min(preset.fontSize / 3, 22), fontWeight: preset.fontWeight === 'bold' ? 700 : 500 }}
              >
                {preset.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
