import type { SlideCanvasData } from '@/types';

export interface OverlayText {
  primary: string;
  caption?: string;
}

interface RawTextObject {
  type?: string;
  text?: string;
  fontSize?: number;
}

/**
 * Extracts just the text content of a slide's Textbox objects, for the
 * transparent NDI/OBS overlay — which keys text over a live camera feed and
 * never shows the slide's own background (color/image/video). The
 * largest-fontSize Textbox becomes the primary line; a second, smaller one
 * (the shape createVerseSlideContent produces for a Bible reference
 * caption) becomes the caption underneath. Returns null when the slide has
 * no text (a pure image/video background slide) — the overlay then shows
 * nothing, staying fully transparent.
 */
export function extractOverlayText(content: SlideCanvasData | null | undefined): OverlayText | null {
  const objects = Array.isArray(content?.objects) ? (content!.objects as RawTextObject[]) : [];
  const textboxes = objects.filter(
    (o): o is RawTextObject & { text: string } =>
      typeof o.text === 'string' && o.text.trim().length > 0 && (o.type === 'Textbox' || o.type === 'textbox')
  );
  if (textboxes.length === 0) return null;

  const sorted = [...textboxes].sort((a, b) => (b.fontSize ?? 0) - (a.fontSize ?? 0));
  return { primary: sorted[0].text, caption: sorted[1]?.text };
}
