// Shared constants for the Fabric.js slide editor and the slide-content
// generators (Songs/Bible/Media). Object coordinates are always authored in
// this fixed logical space — on-screen zoom scales the view, never the
// stored coordinates — so slide JSON stays resolution-independent.
export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;

export const DEFAULT_SLIDE_BACKGROUND_COLOR = '#09090b'; // zinc-950, matches app theme

// Debounce delay before an in-progress edit triggers an autosave.
export const AUTOSAVE_DELAY_MS = 1500;

// Curated font list. All of these are requested up front via the Google
// Fonts @import in src/index.css (alongside Inter/Poppins) so they're
// virtually always loaded before a user opens the font picker — Fabric
// renders with whatever's loaded *now*, so lazily injecting fonts per
// selection risks text drawn before the font finishes loading.
export const EDITOR_FONTS = [
  'Inter',
  'Poppins',
  'Merriweather',
  'Playfair Display',
  'Montserrat',
  'Oswald',
  'Lora',
  'Roboto Mono',
] as const;

export type EditorFont = (typeof EDITOR_FONTS)[number];

// Curated color swatches for the color picker popover, in addition to a
// free-form hex input.
export const COLOR_SWATCHES = [
  '#ffffff',
  '#09090b',
  '#dc4262', // brand-500
  '#a31f3e', // brand-700
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#0ea5e9', // sky-500
  '#ef4444', // red-500
  '#a855f7', // purple-500
  '#71717a', // zinc-500
];

// Default properties for a newly-created text object, shared between the
// live-canvas helpers (src/lib/fabricObjects.ts) and the pure JSON builders
// used by Songs/Bible/Media (src/lib/slideContent.ts) — so a text slide
// generated from a song verse looks identical to one added by hand.
export const DEFAULT_TEXT_PROPS = {
  fontFamily: 'Poppins',
  fontSize: 72,
  fill: '#ffffff',
  textAlign: 'center' as const,
  width: SLIDE_WIDTH - 320,
};
