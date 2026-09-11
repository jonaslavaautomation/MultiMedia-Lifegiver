import type { BibleBookMeta } from '@/data/bibleBooks';

export interface ParsedReference {
  book: BibleBookMeta;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\./g, '').trim();
}

/**
 * Parses a typed reference like "John 3:16", "1 Corinthians 13:4-7", or
 * "Psalm 23" (chapter only) into a book + chapter + optional verse range.
 * Returns null if the reference can't be understood — the caller shows an
 * inline error in that case rather than silently doing nothing.
 */
export function parseReference(input: string, books: BibleBookMeta[]): ParsedReference | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Trailing "chapter[:verseStart[-verseEnd]]", everything before it is the book name.
  const match = trimmed.match(/^(.*?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
  if (!match) return null;

  const [, bookPart, chapterStr, verseStartStr, verseEndStr] = match;
  const chapter = parseInt(chapterStr, 10);
  if (!Number.isFinite(chapter) || chapter < 1) return null;

  const normalizedBookPart = normalize(bookPart);
  if (!normalizedBookPart) return null;
  const slug = normalizedBookPart.replace(/\s+/g, '-');

  const book =
    books.find((b) => normalize(b.name) === normalizedBookPart) ??
    books.find((b) => normalize(b.name).startsWith(normalizedBookPart)) ??
    books.find((b) => b.id === slug) ??
    null;

  if (!book) return null;
  if (chapter > book.chapters) return null;

  const verseStart = verseStartStr ? parseInt(verseStartStr, 10) : undefined;
  const verseEnd = verseEndStr ? parseInt(verseEndStr, 10) : undefined;

  return { book, chapter, verseStart, verseEnd };
}
