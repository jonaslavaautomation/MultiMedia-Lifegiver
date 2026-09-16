import { supabase } from '@/lib/supabase';

/**
 * Client wrapper for the `generate-song-lyrics` Supabase Edge Function —
 * see its own header for why this can't be a direct client-side API call
 * (it needs a real Anthropic API key, which is a secret, unlike the
 * keyless iTunes Search integration in src/lib/songSearch/).
 */

export interface GenerateLyricsRequest {
  topic: string;
  style: string;
  mood: string;
  verseCount: number;
  includeChorus: boolean;
  includePreChorus: boolean;
  includeBridge: boolean;
}

export interface GenerateLyricsResult {
  title: string;
  lyrics: string;
}

export const LYRIC_STYLES = ['Modern Worship', 'Hymn / Traditional', 'Gospel', 'Acoustic / Folk', 'Contemporary CCM'] as const;
export const LYRIC_MOODS = ['Upbeat / Celebratory', 'Reflective / Peaceful', 'Reverent / Solemn', 'Hopeful / Encouraging'] as const;

export async function generateSongLyrics(request: GenerateLyricsRequest): Promise<GenerateLyricsResult> {
  const { data, error } = await supabase.functions.invoke('generate-song-lyrics', { body: request });

  if (error) {
    // A function that was never deployed shows up here as a generic network/invoke
    // failure, not a clean 503 — so this is the one place worth a specific hint.
    console.error('Error calling generate-song-lyrics:', error);
    throw new Error(
      'AI lyric writing isn’t set up yet on this project — the generate-song-lyrics Edge Function needs to be deployed with an ANTHROPIC_API_KEY secret configured. See README.md.'
    );
  }

  if (data?.error) {
    throw new Error(data.error as string);
  }

  if (!data?.lyrics) {
    throw new Error('The AI did not return any lyrics. Please try again.');
  }

  return { title: data.title ?? '', lyrics: data.lyrics };
}
