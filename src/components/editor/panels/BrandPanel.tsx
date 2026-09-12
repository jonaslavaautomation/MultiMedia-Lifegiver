import { ImagePlus } from 'lucide-react';
import type { Canvas, FabricObject } from 'fabric';
import { Button } from '@/components/ui/Button';
import { COLOR_SWATCHES } from '@/lib/editorConstants';
import { createImageObjectFromUrl } from '@/lib/fabricObjects';
import type { SelectedObjectSnapshot } from '@/types/editor';

interface BrandPanelProps {
  canvas: Canvas | null;
  selection: SelectedObjectSnapshot | null;
  markDirty: () => void;
  refreshSelection: () => void;
}

/** Nav rail "Brand" drawer — brand color swatches applied to the current selection, and a quick logo insert. */
export function BrandPanel({ canvas, selection, markDirty, refreshSelection }: BrandPanelProps) {
  const colorable = selection?.kind === 'textbox' || selection?.kind === 'shape';

  function applyColor(hex: string) {
    if (!canvas || !colorable) return;
    const active = canvas.getActiveObject();
    if (!active) return;

    if (active.type === 'line') {
      active.set({ stroke: hex });
    } else {
      (active as FabricObject & { fill?: string }).set({ fill: hex });
    }
    canvas.requestRenderAll();
    markDirty();
    refreshSelection();
  }

  async function insertLogo() {
    if (!canvas) return;
    await createImageObjectFromUrl(canvas, '/lifegiver-logo.png');
    markDirty();
    refreshSelection();
  }

  return (
    <div className="flex flex-col gap-4">
      <Button variant="outline" className="justify-center" onClick={() => void insertLogo()}>
        <ImagePlus className="w-4 h-4" /> Insert Logo
      </Button>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Brand colors {!colorable && '— select text or a shape first'}
        </p>
        <div className="grid grid-cols-5 gap-2">
          {COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              disabled={!colorable}
              onClick={() => applyColor(swatch)}
              className="w-9 h-9 rounded-full border-2 border-transparent hover:border-brand-500 transition-all disabled:opacity-30 disabled:hover:border-transparent"
              style={{ backgroundColor: swatch }}
              title={swatch}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
