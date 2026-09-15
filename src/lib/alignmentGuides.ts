import type { FabricObject } from 'fabric';

/** Desired on-screen snap tolerance, in physical pixels — converted to logical canvas units via the current zoom, so it feels the same regardless of how zoomed in/out the editor view is. */
const SNAP_THRESHOLD_SCREEN_PX = 8;

export interface GuideLine {
  orientation: 'vertical' | 'horizontal';
  /** Logical canvas coordinate (x for vertical, y for horizontal) — the caller renders this as a CSS percentage of the always-16:9 canvas, not a screen pixel, so it's correct at any zoom. */
  position: number;
}

export interface SnapResult {
  /** New `left` to apply, only set if the X axis actually snapped. */
  left?: number;
  /** New `top` to apply, only set if the Y axis actually snapped. */
  top?: number;
  guides: GuideLine[];
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

// Objects in this app are always created with Fabric's default top-left
// origin (nothing in fabricObjects.ts sets originX/originY), so `.left`/
// `.top` are the top-left corner directly — no origin-offset math needed.
// Rotation isn't exposed anywhere in the editor's UI yet, so this
// deliberately doesn't account for it (an axis-aligned box is exactly
// right for the common case, and a reasonable approximation otherwise).
function boxFor(obj: FabricObject): Box {
  const left = obj.left ?? 0;
  const top = obj.top ?? 0;
  const width = obj.getScaledWidth();
  const height = obj.getScaledHeight();
  return { left, top, right: left + width, bottom: top + height, centerX: left + width / 2, centerY: top + height / 2 };
}

/** Finds the target (from `targets`) closest to `edges`, if within `threshold` — used independently for X and Y. */
function findBestSnap(edges: number[], targets: number[], threshold: number): { delta: number; guide: number } | null {
  let best: { delta: number; guide: number } | null = null;
  for (const target of targets) {
    for (const edge of edges) {
      const delta = target - edge;
      if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
        best = { delta, guide: target };
      }
    }
  }
  return best;
}

/**
 * Canva/Figma-style smart snap for the object currently being dragged:
 * the canvas's own center/edges, plus every other object's left/center/
 * right (and top/center/bottom), are candidate alignment targets. X and Y
 * are snapped independently, since a drag can align on one axis without
 * the other.
 */
export function computeAlignmentSnap(
  moving: FabricObject,
  others: FabricObject[],
  canvasWidth: number,
  canvasHeight: number,
  zoom: number
): SnapResult {
  const threshold = SNAP_THRESHOLD_SCREEN_PX / Math.max(zoom, 0.01);
  const box = boxFor(moving);

  const xTargets = [0, canvasWidth / 2, canvasWidth];
  const yTargets = [0, canvasHeight / 2, canvasHeight];
  for (const other of others) {
    const b = boxFor(other);
    xTargets.push(b.left, b.centerX, b.right);
    yTargets.push(b.top, b.centerY, b.bottom);
  }

  const bestX = findBestSnap([box.left, box.centerX, box.right], xTargets, threshold);
  const bestY = findBestSnap([box.top, box.centerY, box.bottom], yTargets, threshold);

  const guides: GuideLine[] = [];
  const result: SnapResult = { guides };

  if (bestX) {
    result.left = box.left + bestX.delta;
    guides.push({ orientation: 'vertical', position: bestX.guide });
  }
  if (bestY) {
    result.top = box.top + bestY.delta;
    guides.push({ orientation: 'horizontal', position: bestY.guide });
  }

  return result;
}
