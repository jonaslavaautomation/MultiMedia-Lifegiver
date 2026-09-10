import { supabase } from '@/lib/supabase';
import type { BibleBookMeta } from '@/data/bibleBooks';

export interface ChapterVerse {
  verse: number;
  text: string;
}

interface ApiVerse {
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

interface ApiChapterResponse {
  verses?: ApiVerse[];
}

/** Checks the bible_verses cache table for a previously-fetched chapter. */
export async function getCachedChapter(
  book: string,
  chapter: number,
  translation = 'KJV'
): Promise<ChapterVerse[] | null> {
  const { data, error } = await supabase
    .from('bible_verses')
    .select('verse_start, text')
    .eq('book', book)
    .eq('chapter', chapter)
    .eq('translation', translation)
    .order('verse_start', { ascending: true });

  if (error) {
    console.error('Error reading bible_verses cache:', error.message);
    return null;
  }
  if (!data || data.length === 0) return null;

  return (data as { verse_start: number; text: string }[]).map((row) => ({
    verse: row.verse_start,
    text: row.text,
  }));
}

async function fetchChapterFromApi(book: BibleBookMeta, chapter: number): Promise<ChapterVerse[]> {
  const reference = `${book.apiName} ${chapter}`;
  const response = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=kjv`);

  if (!response.ok) {
    throw new Error(`Bible API request failed (${response.status})`);
  }

  const data = (await response.json()) as ApiChapterResponse;
  if (!data.verses || data.verses.length === 0) {
    throw new Error('No verses returned for that chapter.');
  }

  return data.verses.map((v) => ({ verse: v.verse, text: v.text.trim() }));
}

/** Fire-and-forget cache write — a failure here doesn't affect the read that already succeeded. */
async function cacheChapter(book: BibleBookMeta, chapter: number, verses: ChapterVerse[]): Promise<void> {
  const rows = verses.map((v) => ({
    book: book.name,
    chapter,
    verse_start: v.verse,
    verse_end: null,
    text: v.text,
    translation: 'KJV',
  }));

  const { error } = await supabase
    .from('bible_verses')
    .upsert(rows, { onConflict: 'book,chapter,verse_start,translation', ignoreDuplicates: true });

  if (error) {
    console.error('Error caching Bible chapter:', error.message);
  }
}

/**
 * Cache-through chapter fetch: checks bible_verses first, falls back to the
 * public Bible API on a miss, renders immediately, then caches in the
 * background so future lookups of the same chapter are instant/offline.
 */
export async function fetchAndCacheChapter(book: BibleBookMeta, chapter: number): Promise<ChapterVerse[]> {
  const cached = await getCachedChapter(book.name, chapter);
  if (cached && cached.length > 0) return cached;

  const verses = await fetchChapterFromApi(book, chapter);
  void cacheChapter(book, chapter, verses);
  return verses;
}
