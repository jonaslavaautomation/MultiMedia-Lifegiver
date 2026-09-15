import { useEffect, useState } from 'react';
import type { Canvas, FabricObject } from 'fabric';
import { computeAlignmentSnap, type GuideLine } from '@/lib/alignmentGuides';

/**
 * Canva/Figma-style smart alignment guides: while dragging an object, snaps
 * it to the canvas center/edges or another object's edges/center once
 * within a small on-screen threshold, and returns which guide lines to
 * draw for visual feedback.
 *
 * Deliberately does NOT draw on the Fabric canvas itself (e.g. via
 * contextTop) — that needs replicating Fabric's own viewport-transform/
 * retina-scaling handling to position things correctly, which only Fabric's
 * own render cycle is guaranteed to get right. Instead the caller (see
 * EditorCanvasStage.tsx) renders guides as plain positioned overlay
 * elements: a guide at logical position X is simply `left: X/SLIDE_WIDTH *
 * 100%` of the always-16:9 canvas container — correct at any zoom level by
 * construction, no transform math needed at all.
 *
 * Doesn't call markDirty()/push undo history itself — the existing
 * object:modified listener already does that once the drag ends with the
 * final (possibly snapped) position.
 */
export function useAlignmentGuides(canvas: Canvas | null): GuideLine[] {
  const [guides, setGuides] = useState<GuideLine[]>([]);

  useEffect(() => {
    if (!canvas) return;

    function handleMoving(e: { target?: FabricObject }) {
      const target = e.target;
      if (!target || !canvas) return;

      const others = canvas.getObjects().filter((o) => o !== target);
      const result = computeAlignmentSnap(target, others, canvas.width ?? 0, canvas.height ?? 0, canvas.getZoom());

      if (result.left !== undefined || result.top !== undefined) {
        target.set({
          ...(result.left !== undefined ? { left: result.left } : {}),
          ...(result.top !== undefined ? { top: result.top } : {}),
        });
        target.setCoords();
      }
      setGuides(result.guides);
    }

    function clearGuides() {
      setGuides([]);
    }

    canvas.on('object:moving', handleMoving);
    canvas.on('object:modified', clearGuides);
    canvas.on('mouse:up', clearGuides);
    canvas.on('selection:cleared', clearGuides);

    return () => {
      canvas.off('object:moving', handleMoving);
      canvas.off('object:modified', clearGuides);
      canvas.off('mouse:up', clearGuides);
      canvas.off('selection:cleared', clearGuides);
    };
  }, [canvas]);

  return guides;
}
