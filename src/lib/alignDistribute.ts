import type { Canvas, FabricObject } from 'fabric';

export type AlignEdge = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';
export type DistributeAxis = 'horizontal' | 'vertical';

/**
 * Aligns every object in the current multi-selection to a shared edge (or
 * center) of the *selection's own* bounding box — e.g. "left" moves every
 * object so its left edge matches the leftmost object's left edge.
 *
 * The tricky part: while objects are part of an ActiveSelection, Fabric
 * rewrites their `.left`/`.top` to be relative to the *selection's* own
 * center, not absolute canvas coordinates (confirmed by directly
 * inspecting real Fabric objects before writing this) — so this can't set
 * an absolute target left/top directly. Instead it reads each object's true
 * absolute position via `getBoundingRect()` (which does stay correct
 * regardless of grouping), computes the delta needed to reach the target,
 * and *shifts* `.left`/`.top` by that delta — a relative shift lands
 * correctly regardless of which coordinate system `.left` currently means,
 * and was verified to produce the right absolute position both while still
 * selected and after deselecting.
 */
export function alignSelection(canvas: Canvas, edge: AlignEdge): void {
  const objects = canvas.getActiveObjects();
  if (objects.length < 2) return;

  const boxes = objects.map((o) => o.getBoundingRect());
  const lefts = boxes.map((b) => b.left);
  const rights = boxes.map((b) => b.left + b.width);
  const tops = boxes.map((b) => b.top);
  const bottoms = boxes.map((b) => b.top + b.height);

  let target: number;
  switch (edge) {
    case 'left':
      target = Math.min(...lefts);
      break;
    case 'right':
      target = Math.max(...rights);
      break;
    case 'center-h':
      target = (Math.min(...lefts) + Math.max(...rights)) / 2;
      break;
    case 'top':
      target = Math.min(...tops);
      break;
    case 'bottom':
      target = Math.max(...bottoms);
      break;
    case 'center-v':
      target = (Math.min(...tops) + Math.max(...bottoms)) / 2;
      break;
  }

  objects.forEach((obj, i) => {
    const box = boxes[i];
    let delta = 0;
    let axis: 'left' | 'top' = 'left';

    if (edge === 'left') delta = target - box.left;
    else if (edge === 'right') delta = target - box.width - box.left;
    else if (edge === 'center-h') delta = target - box.width / 2 - box.left;
    else {
      axis = 'top';
      if (edge === 'top') delta = target - box.top;
      else if (edge === 'bottom') delta = target - box.height - box.top;
      else delta = target - box.height / 2 - box.top;
    }

    obj.set({ [axis]: (obj[axis] ?? 0) + delta });
    obj.setCoords();
  });

  finishTransform(canvas);
}

/**
 * Evenly spaces the *gaps* between selected objects along one axis,
 * keeping the two extreme objects (leftmost/rightmost, or topmost/
 * bottommost) fixed and repositioning the ones between them — the
 * standard "distribute" behavior in design tools. Needs at least 3
 * objects; with 2 there's only one gap, nothing to make "even".
 */
export function distributeSelection(canvas: Canvas, axis: DistributeAxis): void {
  const objects = canvas.getActiveObjects();
  if (objects.length < 3) return;

  const boxes = objects.map((o) => o.getBoundingRect());
  const sizeKey = axis === 'horizontal' ? 'width' : 'height';
  const posKey = axis === 'horizontal' ? 'left' : 'top';
  const setKey = axis === 'horizontal' ? 'left' : 'top';

  const order = objects.map((_, i) => i).sort((a, b) => boxes[a][posKey] - boxes[b][posKey]);
  const first = boxes[order[0]];
  const last = boxes[order[order.length - 1]];
  const totalSize = order.reduce((sum, i) => sum + boxes[i][sizeKey], 0);
  const span = last[posKey] + last[sizeKey] - first[posKey];
  const gap = (span - totalSize) / (order.length - 1);

  let cursor = first[posKey];
  for (const i of order) {
    const box = boxes[i];
    const delta = cursor - box[posKey];
    const obj = objects[i];
    obj.set({ [setKey]: (obj[setKey] ?? 0) + delta });
    obj.setCoords();
    cursor += box[sizeKey] + gap;
  }

  finishTransform(canvas);
}

/** Refreshes the active selection's own bounding box and repaints — shared by align/distribute so neither forgets it. */
function finishTransform(canvas: Canvas): void {
  const active = canvas.getActiveObject();
  if (active && typeof (active as unknown as { setCoords?: () => void }).setCoords === 'function') {
    (active as FabricObject).setCoords();
  }
  canvas.requestRenderAll();
}
