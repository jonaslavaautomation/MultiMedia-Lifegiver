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
      bold: boolean;
      italic: boolean;
      underline: boolean;
      opacity: number;
      hasShadow: boolean;
      locked: boolean;
      /** Fabric's line-height multiplier (default 1.16). */
      lineHeight: number;
      /** Fabric's charSpacing, in 1/1000 em (default 0). */
      charSpacing: number;
    }
  | {
      kind: 'image';
      id: string;
      opacity: number;
      hasShadow: boolean;
      locked: boolean;
    }
  | {
      kind: 'shape';
      id: string;
      fill: string;
      opacity: number;
      hasShadow: boolean;
      locked: boolean;
    }
  | {
      kind: 'group';
      id: string;
      opacity: number;
      hasShadow: boolean;
      locked: boolean;
    }
  | {
      kind: 'multiple';
      count: number;
    };

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export type SlideBackgroundChoice =
  | { type: 'color'; value: string }
  | { type: 'image'; mediaId: string; url: string };
