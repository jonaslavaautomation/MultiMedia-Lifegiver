/**
 * Editor-only UI state types. These describe transient state inside the
 * Fabric.js slide editor and are never persisted directly — persisted
 * canvas data lives in `SlideCanvasData` (src/types/index.ts).
 */

export type TextAlign = 'left' | 'center' | 'right';

export type SelectedObjectSnapshot =
  | {
      kind: 'textbox';
      id: string;
      fontFamily: string;
      fontSize: number;
      fill: string;
      textAlign: TextAlign;
    }
  | {
      kind: 'image';
      id: string;
    }
  | {
      kind: 'multiple';
      count: number;
    };

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export type SlideBackgroundChoice =
  | { type: 'color'; value: string }
  | { type: 'image'; mediaId: string; url: string };
