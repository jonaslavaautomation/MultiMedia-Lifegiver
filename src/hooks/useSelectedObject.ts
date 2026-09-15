import { useCallback, useEffect, useState } from 'react';
import type { Canvas, FabricObject, Textbox } from 'fabric';
import type { SelectedObjectSnapshot } from '@/types/editor';

function snapshotFor(object: FabricObject | undefined): SelectedObjectSnapshot | null {
  if (!object) return null;

  const opacity = typeof object.opacity === 'number' ? object.opacity : 1;
  const hasShadow = !!object.shadow;
  const locked = object.lockMovementX === true;

  if (object.type === 'textbox') {
    const textbox = object as Textbox;
    return {
      kind: 'textbox',
      id: String(textbox.get('id') ?? ''),
      fontFamily: textbox.fontFamily ?? 'Poppins',
      fontSize: textbox.fontSize ?? 72,
      fill: typeof textbox.fill === 'string' ? textbox.fill : '#ffffff',
      textAlign: (textbox.textAlign as 'left' | 'center' | 'right') ?? 'center',
      bold: textbox.fontWeight === 'bold' || textbox.fontWeight === 700,
      italic: textbox.fontStyle === 'italic',
      underline: textbox.underline === true,
      opacity,
      hasShadow,
      locked,
      lineHeight: textbox.lineHeight ?? 1.16,
      charSpacing: textbox.charSpacing ?? 0,
    };
  }

  if (object.type === 'image') {
    return { kind: 'image', id: String(object.get('id') ?? ''), opacity, hasShadow, locked };
  }

  if (object.type === 'rect' || object.type === 'circle' || object.type === 'line' || object.type === 'triangle' || object.type === 'polygon') {
    const fill = 'stroke' in object && object.type === 'line' ? object.stroke : object.fill;
    return {
      kind: 'shape',
      id: String(object.get('id') ?? ''),
      fill: typeof fill === 'string' ? fill : '#2f8271',
      opacity,
      hasShadow,
      locked,
    };
  }

  if (object.type === 'group') {
    return { kind: 'group', id: String(object.get('id') ?? ''), opacity, hasShadow, locked };
  }

  return null;
}

/**
 * Subscribes to Fabric selection events and exposes a plain, serializable
 * snapshot of the current selection for the toolbar to render contextual
 * controls against — the toolbar never touches the live Fabric object
 * directly for reading state, only for issuing commands.
 */
export function useSelectedObject(canvas: Canvas | null): {
  selection: SelectedObjectSnapshot | null;
  refreshSelection: () => void;
} {
  const [selection, setSelection] = useState<SelectedObjectSnapshot | null>(null);

  const computeSnapshot = useCallback(() => {
    if (!canvas) {
      setSelection(null);
      return;
    }
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) {
      setSelection(null);
    } else if (activeObjects.length === 1) {
      setSelection(snapshotFor(activeObjects[0]));
    } else {
      setSelection({ kind: 'multiple', count: activeObjects.length });
    }
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;

    canvas.on('selection:created', computeSnapshot);
    canvas.on('selection:updated', computeSnapshot);
    canvas.on('selection:cleared', computeSnapshot);
    canvas.on('object:modified', computeSnapshot);
    canvas.on('text:changed', computeSnapshot);

    return () => {
      canvas.off('selection:created', computeSnapshot);
      canvas.off('selection:updated', computeSnapshot);
      canvas.off('selection:cleared', computeSnapshot);
      canvas.off('object:modified', computeSnapshot);
      canvas.off('text:changed', computeSnapshot);
    };
  }, [canvas, computeSnapshot]);

  return { selection, refreshSelection: computeSnapshot };
}
