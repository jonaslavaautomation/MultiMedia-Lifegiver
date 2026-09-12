import { AnimatePresence, motion } from 'framer-motion';
import { Bold, Italic, Underline, Copy, Trash2, BringToFront, SendToBack } from 'lucide-react';
import type { Canvas, Textbox } from 'fabric';
import { Button } from '@/components/ui/Button';
import { ColorPickerPopover } from '@/components/editor/ColorPickerPopover';
import { FontFamilyPicker } from '@/components/editor/FontFamilyPicker';
import { AlignmentButtonGroup } from '@/components/editor/AlignmentButtonGroup';
import { reorderActiveObject } from '@/lib/fabricObjects';
import type { SelectedObjectSnapshot, TextAlign } from '@/types/editor';

interface FloatingContextualToolbarProps {
  canvas: Canvas | null;
  selection: SelectedObjectSnapshot | null;
  refreshSelection: () => void;
  markDirty: () => void;
}

/**
 * Canva-style floating toolbar that appears directly above the canvas only
 * while something is selected — text formatting, shape fill, layer
 * ordering, duplicate/delete. Pinned to a fixed spot above the artboard
 * rather than tracking the selected object's exact bounding box (which
 * would need continuous position recalculation on every move/scale/zoom —
 * a fragile, higher-risk feature left for a future pass if wanted).
 */
export function FloatingContextualToolbar({ canvas, selection, refreshSelection, markDirty }: FloatingContextualToolbarProps) {
  function withActiveTextbox(fn: (textbox: Textbox) => void) {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.type !== 'textbox') return;
    fn(active as Textbox);
    canvas.requestRenderAll();
    markDirty();
    refreshSelection();
  }

  function applyShapeFill(hex: string) {
    if (!canvas || selection?.kind !== 'shape') return;
    const active = canvas.getActiveObject();
    if (!active) return;
    if (active.type === 'line') active.set({ stroke: hex });
    else active.set({ fill: hex });
    canvas.requestRenderAll();
    markDirty();
    refreshSelection();
  }

  async function handleDuplicate() {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    const clone = await active.clone();
    clone.set({ left: (active.left ?? 0) + 40, top: (active.top ?? 0) + 40 });
    clone.set('id', crypto.randomUUID());
    canvas.add(clone);
    canvas.setActiveObject(clone);
    canvas.requestRenderAll();
    markDirty();
    refreshSelection();
  }

  function handleDelete() {
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length === 0) return;
    active.forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    markDirty();
    refreshSelection();
  }

  function handleReorder(direction: 'forward' | 'backward') {
    if (!canvas) return;
    reorderActiveObject(canvas, direction);
    markDirty();
  }

  const visible = selection !== null;

  return (
    <div className="flex justify-center mb-2 min-h-[46px]">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-2xl bg-zinc-900/90 backdrop-blur-md border border-zinc-800 shadow-xl shadow-black/30"
          >
            {selection?.kind === 'textbox' && (
              <>
                <FontFamilyPicker
                  value={selection.fontFamily}
                  onChange={(font) => withActiveTextbox((tb) => tb.set({ fontFamily: font }))}
                />
                <input
                  type="number"
                  min={8}
                  max={400}
                  value={selection.fontSize}
                  onChange={(e) => {
                    const size = Number(e.target.value);
                    if (!Number.isFinite(size) || size <= 0) return;
                    withActiveTextbox((tb) => tb.set({ fontSize: size }));
                  }}
                  className="w-14 rounded-lg bg-zinc-950/80 border border-zinc-700/80 text-zinc-100 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
                <ColorPickerPopover
                  value={selection.fill}
                  onChange={(hex) => withActiveTextbox((tb) => tb.set({ fill: hex }))}
                  label="Text Color"
                />
                <AlignmentButtonGroup
                  value={selection.textAlign}
                  onChange={(align: TextAlign) => withActiveTextbox((tb) => tb.set({ textAlign: align }))}
                />
                <div className="flex items-center gap-0.5">
                  <Button
                    variant={selection.bold ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => withActiveTextbox((tb) => tb.set({ fontWeight: selection.bold ? 'normal' : 'bold' }))}
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant={selection.italic ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => withActiveTextbox((tb) => tb.set({ fontStyle: selection.italic ? 'normal' : 'italic' }))}
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant={selection.underline ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => withActiveTextbox((tb) => tb.set({ underline: !selection.underline }))}
                    title="Underline"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="w-px h-6 bg-zinc-800 mx-0.5" />
              </>
            )}

            {selection?.kind === 'shape' && (
              <>
                <ColorPickerPopover value={selection.fill} onChange={applyShapeFill} label="Fill Color" />
                <div className="w-px h-6 bg-zinc-800 mx-0.5" />
              </>
            )}

            {(selection?.kind === 'textbox' || selection?.kind === 'image' || selection?.kind === 'shape') && (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleReorder('forward')} title="Bring Forward">
                  <BringToFront className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleReorder('backward')} title="Send Backward">
                  <SendToBack className="w-3.5 h-3.5" />
                </Button>
                <div className="w-px h-6 bg-zinc-800 mx-0.5" />
                <Button variant="ghost" size="sm" onClick={handleDuplicate} title="Duplicate">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </>
            )}

            <Button variant="ghost" size="sm" onClick={handleDelete} title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
              {selection?.kind === 'multiple' && ` (${selection.count})`}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
