import { splitTextIntoChunks, createTextSlideContent } from '@/lib/slideContent';
import { getSongThemeById } from '@/lib/songThemes';
import { getMotionPresetById } from '@/lib/motionLibrary';
import { supabase } from '@/lib/supabase';
import type { SlideCanvasData } from '@/types';

/**
 * Pure, deterministic — no AI/LLM involved anywhere in this file. Turns a
 * song's labeled sections (Verse/Chorus/Bridge/etc., already detected by
 * lyricsParser.ts or hand-edited in SongSectionEditor.tsx) into slide rows,
 * one call site both SongDetailPage's "Generate Slides" and
 * SmartImportModal's "Save & Generate Slides" now share — previously two
 * near-identical copies of this same logic.
 *
 * The chunking rules (max N non-empty lines per slide, a section's lines
 * split across multiple slides in original order with none dropped or
 * duplicated, empty lines ignored) live in splitTextIntoChunks
 * (slideContent.ts) and haven't changed — this file is just where the
 * per-chunk slide *content* (theme font/color/background, optional motion
 * background) gets attached, shared between both generation entry points.
 */

export interface SlideRowInput {
  title: string;
  content: SlideCanvasData;
  sort_order: number;
}

/** The minimal shape needed from a section — both SongSection (types/index.ts) and ParsedSection (lyricsParser.ts) already satisfy this. */
export interface SectionLike {
  label: string;
  text: string;
}

export interface SlideGenerationOptions {
  linesPerSlide: number;
  themeId: string;
  motionId: string | null;
}

export function buildSlideRowsFromSections(sections: SectionLike[], options: SlideGenerationOptions): SlideRowInput[] {
  const theme = getSongThemeById(options.themeId);
  const motion = options.motionId ? getMotionPresetById(options.motionId) : undefined;
  const textOptions = {
    fontFamily: theme?.fontFamily,
    fontSize: theme?.fontSize,
    fill: theme?.fill,
    textAlign: theme?.textAlign,
    backgroundColor: theme?.backgroundColor,
    backgroundMotionId: motion?.id ?? null,
  };

  const rows: SlideRowInput[] = [];

  for (const section of sections) {
    const chunks = splitTextIntoChunks(section.text, options.linesPerSlide);

    if (chunks.length === 0) {
      // A section with no lyrics yet (e.g. a placeholder "Bridge" the user added but hasn't
      // written) still becomes a real slide, titled with the section label — never silently dropped.
      rows.push({ title: section.label, content: createTextSlideContent(section.label, textOptions), sort_order: rows.length });
      continue;
    }

    chunks.forEach((chunkText, chunkIndex) => {
      rows.push({
        title: chunks.length > 1 ? `${section.label} (${chunkIndex + 1}/${chunks.length})` : section.label,
        content: createTextSlideContent(chunkText, textOptions),
        sort_order: rows.length,
      });
    });
  }

  return rows;
}

export interface GeneratePresentationParams {
  title: string;
  status: 'draft' | 'ready';
  sourceSongId: string;
  slideRows: SlideRowInput[];
}

/**
 * Calls the `create_presentation_with_slides` Postgres function (see
 * supabase/migrations/20260917010000_add_create_presentation_with_slides_function.sql)
 * so the presentation row and every slide row are created in one real
 * database transaction — a crash/network-drop between "create the
 * presentation" and "insert its slides" can no longer leave an orphaned
 * empty presentation behind, unlike the old two-step insert (+ a manual
 * compensating delete that a hard crash could never actually run) this
 * replaces at both call sites (SongDetailPage, SmartImportModal).
 *
 * Returns the new presentation id, or throws with a message safe to show
 * directly to the user.
 */
export async function generatePresentationWithSlides(params: GeneratePresentationParams): Promise<string> {
  const { data, error } = await supabase.rpc('create_presentation_with_slides', {
    p_title: params.title,
    p_status: params.status,
    p_source_song_id: params.sourceSongId,
    p_slides: params.slideRows,
  });

  if (error) {
    console.error('Error calling create_presentation_with_slides:', error.message);
    throw new Error('Failed to generate slides. Please try again.');
  }
  if (!data) {
    throw new Error('Failed to generate slides. Please try again.');
  }

  return data as string;
}
