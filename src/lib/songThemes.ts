import type { EditorFont } from '@/lib/editorConstants';

/**
 * Song slide themes — a font/color/alignment preset applied to
 * auto-generated lyric slides (Smart Import, and the Songs "Generate
 * Slides" panel). Independent of Motion Backgrounds: a theme sets how the
 * *text* looks, a motion background sets what's moving *behind* it — the
 * two compose freely (SmartImportModal lets you pick both).
 */
export interface SongTheme {
  id: string;
  name: string;
  description: string;
  fontFamily: EditorFont;
  fontSize: number;
  fill: string;
  textAlign: 'left' | 'center' | 'right';
  /** Solid background color used when no motion/media background is also chosen. */
  backgroundColor: string;
}

export const SONG_THEMES: SongTheme[] = [
  {
    id: 'classic-white',
    name: 'Classic White',
    description: 'Clean white text on near-black — the safest, most legible default for any room.',
    fontFamily: 'Poppins',
    fontSize: 72,
    fill: '#ffffff',
    textAlign: 'center',
    backgroundColor: '#09090b',
  },
  {
    id: 'modern-bold',
    name: 'Modern Bold',
    description: 'Large, heavy, high-contrast — built for big rooms and energetic worship sets.',
    fontFamily: 'Montserrat',
    fontSize: 84,
    fill: '#ffffff',
    textAlign: 'center',
    backgroundColor: '#000000',
  },
  {
    id: 'warm-amber',
    name: 'Warm Amber',
    description: 'Soft cream text on a deep warm base — gentle, worship-night feel.',
    fontFamily: 'Lora',
    fontSize: 68,
    fill: '#f2e3b8',
    textAlign: 'center',
    backgroundColor: '#1a1206',
  },
  {
    id: 'hymnal-ivory',
    name: 'Hymnal Ivory',
    description: 'Serif type on a deep sepia base — traditional, hymn-appropriate.',
    fontFamily: 'Merriweather',
    fontSize: 64,
    fill: '#f5ead2',
    textAlign: 'center',
    backgroundColor: '#241a0f',
  },
  {
    id: 'soft-pastel',
    name: 'Soft Pastel',
    description: 'Muted rose text on slate — quiet, reflective, prayer-adjacent tone.',
    fontFamily: 'Playfair Display',
    fontSize: 68,
    fill: '#e8d5d0',
    textAlign: 'center',
    backgroundColor: '#1c1a1e',
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Bright yellow on black — maximum legibility for outdoor/bright-venue services.',
    fontFamily: 'Oswald',
    fontSize: 76,
    fill: '#fef08a',
    textAlign: 'center',
    backgroundColor: '#000000',
  },
];

export function getSongThemeById(id: string): SongTheme | undefined {
  return SONG_THEMES.find((t) => t.id === id);
}

export const DEFAULT_SONG_THEME_ID = 'classic-white';
