import { AnimatePresence, motion } from 'framer-motion';
import {
  Bold,
  Italic,
  Underline,
  Copy,
  Trash2,
  BringToFront,
  SendToBack,
  ChevronsUp,
  ChevronsDown,
  SquareStack,
  Lock,
  Unlock,
  Group as GroupIcon,
  Ungroup as UngroupIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
} from 'lucide-react';
import type { Canvas, Textbox } from 'fabric';
import { Button } from '@/components/ui/Button';
import { ColorPickerPopover } from '@/components/editor/ColorPickerPopover';
import { FontFamilyPicker } from '@/components/editor/FontFamilyPicker';
import { AlignmentButtonGroup } from '@/components/editor/AlignmentButtonGroup';
import { TextSpacingPopover } from '@/components/editor/TextSpacingPopover';
import {
  applyShapeColor,
  applyOpacity,
  toggleShadow,
  toggleLock,
  groupActiveSelection,
  ungroupActiveObject,
  assignId,
  deleteActiveObjects,
  reorderActiveObject,
} from '@/lib/fabricObjects';
import { alignSelection, distributeSelection, type AlignEdge } from '@/lib/alignDistribute';
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
    applyShapeColor(canvas, hex);
    markDirty();
    refreshSelection();
  }

  async function handleDuplicate() {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    const clone = await active.clone();
    clone.set({ left: (active.left ?? 0) + 40, top: (active.top ?? 0) + 40 });
    assignId(clone);
    canvas.add(clone);
    canvas.setActiveObject(clone);
    canvas.requestRenderAll();
    markDirty();
    refreshSelection();
  }

  function handleDelete() {
    if (!canvas) return;
    deleteActiveObjects(canvas);
    markDirty();
    refreshSelection();
  }

  function handleReorder(direction: 'forward' | 'backward' | 'front' | 'back') {
    if (!canvas) return;
    reorderActiveObject(canvas, direction);
    markDirty();
  }

  function handleOpacityChange(value: number) {
    if (!canvas) return;
    applyOpacity(canvas, value);
    markDirty();
    refreshSelection();
  }

  function handleToggleShadow(enabled: boolean) {
    if (!canvas) return;
    toggleShadow(canvas, enabled);
    markDirty();
    refreshSelection();
  }

  function handleToggleLock(locked: boolean) {
    if (!canvas) return;
    toggleLock(canvas, locked);
    canvas.requestRenderAll();
    refreshSelection();
    markDirty();
  }

  function handleGroup() {
    if (!canvas) return;
    groupActiveSelection(canvas);
    markDirty();
    refreshSelection();
  }

  function handleUngroup() {
    if (!canvas) return;
    ungroupActiveObject(canvas);
    markDirty();
    refreshSelection();
  }

  function handleAlign(edge: AlignEdge) {
    if (!canvas) return;
    alignSelection(canvas, edge);
    markDirty();
    refreshSelection();
  }

  function handleDistribute(axis: 'horizontal' | 'vertical') {
    if (!canvas) return;
    distributeSelection(canvas, axis);
    markDirty();
    refreshSelection();
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
            className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/90 backdrop-blur-md border border-zinc-200 shadow-xl shadow-black/30"
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
                  className="w-14 rounded-lg bg-zinc-50 border border-zinc-300/80 text-zinc-900 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40"
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
                <TextSpacingPopover
                  lineHeight={selection.lineHeight}
                  charSpacing={selection.charSpacing}
                  onLineHeightChange={(value) => withActiveTextbox((tb) => tb.set({ lineHeight: value }))}
                  onCharSpacingChange={(value) => withActiveTextbox((tb) => tb.set({ charSpacing: value }))}
                />
                <div className="w-px h-6 bg-zinc-100 mx-0.5" />
              </>
            )}

            {selection?.kind === 'shape' && (
              <>
                <ColorPickerPopover value={selection.fill} onChange={applyShapeFill} label="Fill Color" />
                <div className="w-px h-6 bg-zinc-100 mx-0.5" />
              </>
            )}

            {(selection?.kind === 'textbox' || selection?.kind === 'image' || selection?.kind === 'shape' || selection?.kind === 'group') && (
              <>
                <div className="flex items-center gap-1.5 px-1" title="Opacity">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selection.opacity}
                    onChange={(e) => handleOpacityChange(Number(e.target.value))}
                    className="w-16 accent-brand-600"
                  />
                  <span className="text-[10px] text-zinc-500 tabular-nums w-7">{Math.round(selection.opacity * 100)}%</span>
                </div>
                <Button
                  variant={selection.hasShadow ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleToggleShadow(!selection.hasShadow)}
                  title="Toggle Shadow"
                >
                  <SquareStack className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={selection.locked ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleToggleLock(!selection.locked)}
                  title={selection.locked ? 'Unlock' : 'Lock in place'}
                >
                  {selection.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </Button>
                <div className="w-px h-6 bg-zinc-100 mx-0.5" />
                <Button variant="ghost" size="sm" onClick={() => handleReorder('front')} title="Bring to Front">
                  <ChevronsUp className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleReorder('forward')} title="Bring Forward">
                  <BringToFront className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleReorder('backward')} title="Send Backward">
                  <SendToBack className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleReorder('back')} title="Send to Back">
                  <ChevronsDown className="w-3.5 h-3.5" />
                </Button>
                <div className="w-px h-6 bg-zinc-100 mx-0.5" />
                {selection.kind === 'group' && (
                  <Button variant="ghost" size="sm" onClick={handleUngroup} title="Ungroup">
                    <UngroupIcon className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleDuplicate} title="Duplicate">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </>
            )}

            {selection?.kind === 'multiple' && (
              <>
                <div className="flex items-center gap-0.5" title="Align relative to each other">
                  <Button variant="ghost" size="sm" onClick={() => handleAlign('left')} title="Align Left">
                    <AlignLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleAlign('center-h')} title="Align Center">
                    <AlignCenter className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleAlign('right')} title="Align Right">
                    <AlignRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleAlign('top')} title="Align Top">
                    <AlignStartVertical className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleAlign('center-v')} title="Align Middle">
                    <AlignCenterVertical className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleAlign('bottom')} title="Align Bottom">
                    <AlignEndVertical className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {selection.count >= 3 && (
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="sm" onClick={() => handleDistribute('horizontal')} title="Distribute Horizontally">
                      <AlignHorizontalDistributeCenter className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDistribute('vertical')} title="Distribute Vertically">
                      <AlignVerticalDistributeCenter className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
                <div className="w-px h-6 bg-zinc-100 mx-0.5" />
                <Button variant="ghost" size="sm" onClick={handleGroup} title="Group">
                  <GroupIcon className="w-3.5 h-3.5" />
                </Button>
                <div className="w-px h-6 bg-zinc-100 mx-0.5" />
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
