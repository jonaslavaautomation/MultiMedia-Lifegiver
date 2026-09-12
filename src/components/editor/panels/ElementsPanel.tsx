import { Square, Circle as CircleIcon, Minus } from 'lucide-react';
import type { Canvas } from 'fabric';
import { createShapeObject, type ShapeKind } from '@/lib/fabricObjects';

interface ElementsPanelProps {
  canvas: Canvas | null;
  markDirty: () => void;
  refreshSelection: () => void;
}

const SHAPES: { kind: ShapeKind; label: string; icon: typeof Square }[] = [
  { kind: 'rectangle', label: 'Rectangle', icon: Square },
  { kind: 'circle', label: 'Circle', icon: CircleIcon },
  { kind: 'line', label: 'Line', icon: Minus },
];

/** Nav rail "Elements" drawer — basic shapes to drop onto the slide. */
export function ElementsPanel({ canvas, markDirty, refreshSelection }: ElementsPanelProps) {
  function addShape(kind: ShapeKind) {
    if (!canvas) return;
    createShapeObject(canvas, kind);
    markDirty();
    refreshSelection();
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {SHAPES.map((shape) => {
        const Icon = shape.icon;
        return (
          <button
            key={shape.kind}
            type="button"
            onClick={() => addShape(shape.kind)}
            className="flex flex-col items-center gap-2 py-5 rounded-xl bg-white/60 border border-zinc-200/80 hover:border-brand-600/60 hover:bg-brand-50 transition-all"
          >
            <Icon className="w-6 h-6 text-brand-400" strokeWidth={1.75} />
            <span className="text-xs text-zinc-600">{shape.label}</span>
          </button>
        );
      })}
    </div>
  );
}
