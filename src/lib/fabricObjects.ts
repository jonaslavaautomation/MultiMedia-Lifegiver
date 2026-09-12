import { Canvas, Circle, FabricImage, Line, Rect, StaticCanvas, Textbox, type FabricObject } from 'fabric';
import type { SlideCanvasData } from '@/types';
import { DEFAULT_SLIDE_BACKGROUND_COLOR, DEFAULT_TEXT_PROPS, SLIDE_HEIGHT, SLIDE_WIDTH } from '@/lib/editorConstants';

/**
 * Live-canvas operations for the Fabric.js editor. Kept in sync with
 * src/lib/slideContent.ts, which builds the equivalent plain-JSON shapes
 * for Songs/Bible/Media without a live canvas — both share
 * DEFAULT_TEXT_PROPS from editorConstants.ts.
 */

/** Every object we create gets a stable id so selection tracking survives serialize/reload. */
function assignId(object: FabricObject): string {
  const id = crypto.randomUUID();
  object.set('id', id);
  return id;
}

interface CreateTextOptions {
  /** Center the new text box at this point (canvas logical coordinates) instead of the slide's center — used for click-to-add. */
  centerAt?: { x: number; y: number };
}

export function createTextObject(canvas: Canvas, text = 'Add your text', options: CreateTextOptions = {}): Textbox {
  const left = options.centerAt
    ? options.centerAt.x - DEFAULT_TEXT_PROPS.width / 2
    : (SLIDE_WIDTH - DEFAULT_TEXT_PROPS.width) / 2;
  const top = options.centerAt ? options.centerAt.y - DEFAULT_TEXT_PROPS.fontSize / 2 : SLIDE_HEIGHT / 2 - 150;

  const textbox = new Textbox(text, {
    left,
    top,
    width: DEFAULT_TEXT_PROPS.width,
    fontFamily: DEFAULT_TEXT_PROPS.fontFamily,
    fontSize: DEFAULT_TEXT_PROPS.fontSize,
    fill: DEFAULT_TEXT_PROPS.fill,
    textAlign: DEFAULT_TEXT_PROPS.textAlign,
  });
  assignId(textbox);
  canvas.add(textbox);
  canvas.setActiveObject(textbox);
  canvas.requestRenderAll();
  return textbox;
}

interface CreateImageOptions {
  mediaId?: string;
}

/** Inserts an image as a regular, movable/resizable canvas object (not a background). */
export async function createImageObjectFromUrl(
  canvas: Canvas,
  url: string,
  options: CreateImageOptions = {}
): Promise<FabricImage> {
  const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });

  // Scale to fit comfortably within the slide while preserving aspect ratio.
  const maxWidth = SLIDE_WIDTH * 0.6;
  const maxHeight = SLIDE_HEIGHT * 0.6;
  const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

  img.set({
    left: (SLIDE_WIDTH - img.width * scale) / 2,
    top: (SLIDE_HEIGHT - img.height * scale) / 2,
    scaleX: scale,
    scaleY: scale,
  });

  assignId(img);
  if (options.mediaId) {
    img.set('data', { mediaId: options.mediaId });
  }

  canvas.add(img);
  canvas.setActiveObject(img);
  canvas.requestRenderAll();
  return img;
}

export type ShapeKind = 'rectangle' | 'circle' | 'line';

/** Inserts a basic shape (Elements panel) centered on the slide, in the current brand accent color. */
export function createShapeObject(canvas: Canvas, kind: ShapeKind): FabricObject {
  let shape: FabricObject;

  if (kind === 'rectangle') {
    shape = new Rect({
      left: SLIDE_WIDTH / 2 - 200,
      top: SLIDE_HEIGHT / 2 - 120,
      width: 400,
      height: 240,
      fill: '#2f8271',
      rx: 12,
      ry: 12,
    });
  } else if (kind === 'circle') {
    shape = new Circle({
      left: SLIDE_WIDTH / 2 - 150,
      top: SLIDE_HEIGHT / 2 - 150,
      radius: 150,
      fill: '#2f8271',
    });
  } else {
    shape = new Line([SLIDE_WIDTH / 2 - 250, SLIDE_HEIGHT / 2, SLIDE_WIDTH / 2 + 250, SLIDE_HEIGHT / 2], {
      stroke: '#82b354',
      strokeWidth: 8,
    });
  }

  assignId(shape);
  canvas.add(shape);
  canvas.setActiveObject(shape);
  canvas.requestRenderAll();
  return shape;
}

/** Layer ordering for the currently-selected object(s) — Bring Forward / Send Backward / Front / Back. */
export function reorderActiveObject(canvas: Canvas, direction: 'forward' | 'backward' | 'front' | 'back'): void {
  const active = canvas.getActiveObject();
  if (!active) return;

  if (direction === 'forward') canvas.bringObjectForward(active);
  else if (direction === 'backward') canvas.sendObjectBackwards(active);
  else if (direction === 'front') canvas.bringObjectToFront(active);
  else canvas.sendObjectToBack(active);

  canvas.requestRenderAll();
}

// The next three operate on StaticCanvas (Fabric's non-interactive base
// class that Canvas extends) so they're reusable by the read-only
// Present-mode slide renderer, not just the interactive editor.

export function applySolidBackground(canvas: StaticCanvas, hex: string): void {
  canvas.backgroundImage = undefined;
  canvas.backgroundColor = hex;
  canvas.requestRenderAll();
}

/** Sets a full-bleed background image (covers the slide, not a movable object). */
export async function applyImageBackground(canvas: StaticCanvas, url: string): Promise<void> {
  const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });

  const scale = Math.max(SLIDE_WIDTH / img.width, SLIDE_HEIGHT / img.height);
  img.set({
    left: 0,
    top: 0,
    scaleX: scale,
    scaleY: scale,
    selectable: false,
    evented: false,
  });

  canvas.backgroundImage = img;
  canvas.requestRenderAll();
}

export function clearBackgroundImage(canvas: StaticCanvas): void {
  canvas.backgroundImage = undefined;
  canvas.backgroundColor = DEFAULT_SLIDE_BACKGROUND_COLOR;
  canvas.requestRenderAll();
}

/**
 * Serializes the current canvas state into `slides.content`. Uses
 * `toObject` (not the argument-less `toJSON`) so our custom `id`/`data`
 * object properties are preserved across reload.
 */
export function serializeSlide(
  canvas: Canvas,
  backgroundMediaId: string | null,
  backgroundVideoEmbedUrl: string | null = null
): SlideCanvasData {
  const base = canvas.toObject(['id', 'data']) as SlideCanvasData;
  return {
    ...base,
    meta: { schemaVersion: 1, backgroundMediaId, backgroundVideoEmbedUrl },
  };
}
