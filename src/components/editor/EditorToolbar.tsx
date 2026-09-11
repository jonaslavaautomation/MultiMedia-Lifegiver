import { Type, ImagePlus, Palette, Copy, Trash2, Save } from 'lucide-react';
import type { Canvas, Textbox } from 'fabric';
import { Button } from '@/components/ui/Button';
import { ColorPickerPopover } from '@/components/editor/ColorPickerPopover';
import { FontFamilyPicker } from '@/components/editor/FontFamilyPicker';
import { AlignmentButtonGroup } from '@/components/editor/AlignmentButtonGroup';
import { createTextObject } from '@/lib/fabricObjects';
import type { SelectedObjectSnapshot, TextAlign } from '@/types/editor';

interface EditorToolbarProps {
  canvas: Canvas | null;
  selection: SelectedObjectSnapshot | null;
  refreshSelection: () => void;
  markDirty: () => void;
  onOpenAddImage: () => void;
  onOpenBackground: () => void;
  onSave: () => void;
  saving: boolean;
}

export function EditorToolbar({
  canvas,
  selection,
  refreshSelection,
  markDirty,
  onOpenAddImage,
  onOpenBackground,
  onSave,
  saving,
}: EditorToolbarProps) {
  function withActiveTextbox(fn: (textbox: Textbox) => void) {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.type !== 'textbox') return;
    fn(active as Textbox);
    canvas.requestRenderAll();
    markDirty();
    refreshSelection();
  }

  function handleAddText() {
    if (!canvas) return;
    createTextObject(canvas);
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

  const showTextControls = selection?.kind === 'textbox';
  const showObjectControls = selection?.kind === 'textbox' || selection?.kind === 'image';
  const showBulkDelete = selection?.kind === 'multiple';

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3 p-2 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={handleAddText} title="Add Text">
          <Type className="w-3.5 h-3.5" /> Text
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenAddImage} title="Add Image">
          <ImagePlus className="w-3.5 h-3.5" /> Image
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenBackground} title="Slide Background">
          <Palette className="w-3.5 h-3.5" /> Background
        </Button>
      </div>

      {(showTextControls || showObjectControls || showBulkDelete) && (
        <div className="w-px h-6 bg-zinc-800 mx-1" />
      )}

      {showTextControls && selection.kind === 'textbox' && (
        <div className="flex items-center gap-1.5">
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
        </div>
      )}

      {showObjectControls && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleDuplicate} title="Duplicate">
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete} title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {showBulkDelete && (
        <Button variant="ghost" size="sm" onClick={handleDelete} title="Delete selected">
          <Trash2 className="w-3.5 h-3.5" /> Delete ({selection.count})
        </Button>
      )}

      <div className="flex-1" />

      <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>
        {saving ? (
          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Save className="w-3.5 h-3.5" />
        )}
        Save
      </Button>
    </div>
  );
}
