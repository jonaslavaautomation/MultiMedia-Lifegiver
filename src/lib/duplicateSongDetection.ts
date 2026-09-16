import type { SongWithCreator } from '@/types';

/** "Goodness Of God" / "goodness of god" / "  Goodness of God " all normalize the same. */
function normalize(text: string | null | undefined): string {
  return (text ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Finds an existing song that's very likely the same song, comparing
 * normalized title (required) and author (only when both sides have one —
 * an existing song with no author recorded shouldn't block matching by
 * title alone). Never used to silently overwrite anything — every caller
 * shows what it found and lets the user choose Open Existing / Create
 * Anyway / Cancel.
 */
export function findSimilarSong(title: string, author: string | null | undefined, existing: SongWithCreator[]): SongWithCreator | null {
  const normTitle = normalize(title);
  if (!normTitle) return null;
  const normAuthor = normalize(author);

  return (
    existing.find((song) => {
      if (normalize(song.title) !== normTitle) return false;
      const songAuthor = normalize(song.author);
      if (normAuthor && songAuthor) return songAuthor === normAuthor;
      return true; // one or both sides have no author on record — title match alone is still a strong signal
    }) ?? null
  );
}
