import { supabase } from '@/lib/supabase';
import type { BibleBookMeta } from '@/data/bibleBooks';
import { BIBLE_TRANSLATIONS, DEFAULT_TRANSLATION } from '@/data/bibleTranslations';

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

/** Required by Tyndale's NLT API terms wherever NLT verse text is displayed. */
export const NLT_ATTRIBUTION =
  'Scripture quotations are taken from the Holy Bible, New Living Translation, copyright ©1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Inc., Carol Stream, Illinois 60188. All rights reserved.';

/** Required by Biblica's NIV terms wherever NIV verse text is displayed — matches the `copyright` field api.bible returns alongside NIV text. */
export const NIV_ATTRIBUTION =
  'The Holy Bible, New International Version® NIV® Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by Permission of Biblica, Inc.® All rights reserved worldwide.';

/** api.bible's Bible ID for the NIV (2011 text) — confirmed against the live API. */
const NIV_BIBLE_ID = '78a9f6124f344018-01';

/** Checks the bible_verses cache table for a previously-fetched chapter. */
export async function getCachedChapter(
  book: string,
  chapter: number,
  translation = DEFAULT_TRANSLATION
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

async function fetchChapterFromKjvApi(book: BibleBookMeta, chapter: number): Promise<ChapterVerse[]> {
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

/** Matches a verse's opening `<verse_export ... vn="N" ...>` tag, capturing the verse number. */
const VERSE_EXPORT_OPEN_TAG = /<verse_export\b[^>]*\bvn="(\d+)"[^>]*>/g;

/**
 * Tyndale's NLT API (https://api.nlt.to) returns an HTML fragment where each
 * verse is wrapped in a `<verse_export vn="N">` element carrying the verse
 * number as an attribute — confirmed against the live API. Its markup is
 * occasionally malformed (a dangling, unclosed `<p>` at a verse's end); if
 * parsed as one whole document, standard HTML error-recovery nests the
 * *next* verse_export inside that dangling tag, merging verse text across
 * boundaries. To avoid that, each verse's HTML is sliced out by the string
 * position of its (always well-formed) opening tag *before* parsing, so each
 * verse is parsed in isolation. Only then are the duplicated verse-number
 * text, footnote markers/text, and headings stripped out.
 */
async function fetchChapterFromNltApi(book: BibleBookMeta, chapter: number): Promise<ChapterVerse[]> {
  const key = import.meta.env.VITE_NLT_API_KEY as string | undefined;
  const params = new URLSearchParams({ ref: `${book.apiName}.${chapter}`, version: 'NLT' });
  if (key) params.set('key', key);

  const response = await fetch(`https://api.nlt.to/api/passages?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`NLT API request failed (${response.status})`);
  }

  const html = await response.text();
  const openTags = Array.from(html.matchAll(VERSE_EXPORT_OPEN_TAG));
  if (openTags.length === 0) {
    throw new Error('No verses returned for that chapter.');
  }

  const verses = openTags
    .map((match, i) => {
      const verse = Number(match[1]);
      const start = (match.index ?? 0) + match[0].length;
      const end = i + 1 < openTags.length ? (openTags[i + 1].index ?? html.length) : html.length;
      const chunk = html.slice(start, end);

      const doc = new DOMParser().parseFromString(`<div id="root">${chunk}</div>`, 'text/html');
      const root = doc.getElementById('root');
      root?.querySelectorAll('.vn, .a-tn, .tn, h2, h3').forEach((el) => el.remove());
      const text = (root?.textContent ?? '').replace(/\s+/g, ' ').trim();
      return { verse, text };
    })
    .filter((v) => Number.isFinite(v.verse) && v.text.length > 0);

  if (verses.length === 0) {
    throw new Error('No verses returned for that chapter.');
  }
  return verses;
}

interface ApiBibleContentNode {
  type?: string;
  name?: string;
  text?: string;
  attrs?: { verseId?: string; number?: string };
  items?: ApiBibleContentNode[];
}

/**
 * api.bible (rest.api.bible) returns a chapter as a JSON content tree —
 * confirmed against the live API. Text nodes carry the verse they belong to
 * directly as `attrs.verseId` (e.g. "JHN.3.16"), so verses are bucketed by
 * that id rather than by document structure — this sidesteps the kind of
 * malformed-markup corruption fetchChapterFromNltApi has to work around.
 * Section-heading text and the verse-number marker's own text carry no
 * verseId and are naturally skipped; footnote ("note") nodes are skipped
 * explicitly in case a given Bible/chapter includes them.
 */
async function fetchChapterFromApiBible(
  book: BibleBookMeta,
  chapter: number,
  bibleId: string
): Promise<ChapterVerse[]> {
  const key = import.meta.env.VITE_API_BIBLE_KEY as string | undefined;
  if (!key) {
    throw new Error('NIV requires an api.bible API key — set VITE_API_BIBLE_KEY.');
  }

  const chapterId = `${book.usfmId}.${chapter}`;
  const response = await fetch(
    `https://api.scripture.api.bible/v1/bibles/${bibleId}/chapters/${chapterId}?content-type=json`,
    { headers: { 'api-key': key } }
  );
  if (!response.ok) {
    throw new Error(`api.bible request failed (${response.status})`);
  }

  const data = (await response.json()) as { data?: { content?: ApiBibleContentNode[] } };
  const content = data.data?.content;
  if (!content) {
    throw new Error('No verses returned for that chapter.');
  }

  const buffers = new Map<number, string>();
  function walk(nodes: ApiBibleContentNode[]) {
    for (const node of nodes) {
      if (node.name === 'note') continue;
      if (node.type === 'text' && node.attrs?.verseId) {
        const verse = Number(node.attrs.verseId.split('.').pop());
        buffers.set(verse, (buffers.get(verse) ?? '') + (node.text ?? ''));
      }
      if (node.items) walk(node.items);
    }
  }
  walk(content);

  const verses = Array.from(buffers.entries())
    .map(([verse, text]) => ({ verse, text: text.replace(/\s+/g, ' ').trim() }))
    .filter((v) => Number.isFinite(v.verse) && v.text.length > 0)
    .sort((a, b) => a.verse - b.verse);

  if (verses.length === 0) {
    throw new Error('No verses returned for that chapter.');
  }
  return verses;
}

async function fetchChapterFromApi(
  book: BibleBookMeta,
  chapter: number,
  translation: string
): Promise<ChapterVerse[]> {
  switch (translation) {
    case 'KJV':
      return fetchChapterFromKjvApi(book, chapter);
    case 'NLT':
      return fetchChapterFromNltApi(book, chapter);
    case 'NIV':
      return fetchChapterFromApiBible(book, chapter, NIV_BIBLE_ID);
    default: {
      const meta = BIBLE_TRANSLATIONS.find((t) => t.code === translation);
      throw new Error(
        meta && !meta.available
          ? `${meta.name} (${meta.code}) isn't connected to a licensed text source yet.`
          : `Unknown translation "${translation}".`
      );
    }
  }
}

/** Fire-and-forget cache write — a failure here doesn't affect the read that already succeeded. */
async function cacheChapter(
  book: BibleBookMeta,
  chapter: number,
  verses: ChapterVerse[],
  translation: string
): Promise<void> {
  const rows = verses.map((v) => ({
    book: book.name,
    chapter,
    verse_start: v.verse,
    verse_end: null,
    text: v.text,
    translation,
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
 * translation's source API on a miss, renders immediately, then caches in
 * the background so future lookups of the same chapter are instant/offline.
 */
export async function fetchAndCacheChapter(
  book: BibleBookMeta,
  chapter: number,
  translation: string = DEFAULT_TRANSLATION
): Promise<ChapterVerse[]> {
  const cached = await getCachedChapter(book.name, chapter, translation);
  if (cached && cached.length > 0) return cached;

  const verses = await fetchChapterFromApi(book, chapter, translation);
  void cacheChapter(book, chapter, verses, translation);
  return verses;
}
