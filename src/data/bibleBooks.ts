export interface BibleBookMeta {
  /** URL-safe slug, e.g. 'genesis', '1-corinthians'. */
  id: string;
  /** Display name and the value stored in bible_verses.book. */
  name: string;
  /** Book name as bible-api.com expects it in the request path (spaces become '+'). */
  apiName: string;
  testament: 'old' | 'new';
  /** 1-66 canonical order. */
  order: number;
  chapters: number;
}

// Static structural manifest (book names + chapter counts never change), so
// no API call is needed just to render the book/chapter browsing UI.
export const BIBLE_BOOKS: BibleBookMeta[] = [
  { id: 'genesis', name: 'Genesis', apiName: 'Genesis', testament: 'old', order: 1, chapters: 50 },
  { id: 'exodus', name: 'Exodus', apiName: 'Exodus', testament: 'old', order: 2, chapters: 40 },
  { id: 'leviticus', name: 'Leviticus', apiName: 'Leviticus', testament: 'old', order: 3, chapters: 27 },
  { id: 'numbers', name: 'Numbers', apiName: 'Numbers', testament: 'old', order: 4, chapters: 36 },
  { id: 'deuteronomy', name: 'Deuteronomy', apiName: 'Deuteronomy', testament: 'old', order: 5, chapters: 34 },
  { id: 'joshua', name: 'Joshua', apiName: 'Joshua', testament: 'old', order: 6, chapters: 24 },
  { id: 'judges', name: 'Judges', apiName: 'Judges', testament: 'old', order: 7, chapters: 21 },
  { id: 'ruth', name: 'Ruth', apiName: 'Ruth', testament: 'old', order: 8, chapters: 4 },
  { id: '1-samuel', name: '1 Samuel', apiName: '1 Samuel', testament: 'old', order: 9, chapters: 31 },
  { id: '2-samuel', name: '2 Samuel', apiName: '2 Samuel', testament: 'old', order: 10, chapters: 24 },
  { id: '1-kings', name: '1 Kings', apiName: '1 Kings', testament: 'old', order: 11, chapters: 22 },
  { id: '2-kings', name: '2 Kings', apiName: '2 Kings', testament: 'old', order: 12, chapters: 25 },
  { id: '1-chronicles', name: '1 Chronicles', apiName: '1 Chronicles', testament: 'old', order: 13, chapters: 29 },
  { id: '2-chronicles', name: '2 Chronicles', apiName: '2 Chronicles', testament: 'old', order: 14, chapters: 36 },
  { id: 'ezra', name: 'Ezra', apiName: 'Ezra', testament: 'old', order: 15, chapters: 10 },
  { id: 'nehemiah', name: 'Nehemiah', apiName: 'Nehemiah', testament: 'old', order: 16, chapters: 13 },
  { id: 'esther', name: 'Esther', apiName: 'Esther', testament: 'old', order: 17, chapters: 10 },
  { id: 'job', name: 'Job', apiName: 'Job', testament: 'old', order: 18, chapters: 42 },
  { id: 'psalms', name: 'Psalms', apiName: 'Psalms', testament: 'old', order: 19, chapters: 150 },
  { id: 'proverbs', name: 'Proverbs', apiName: 'Proverbs', testament: 'old', order: 20, chapters: 31 },
  { id: 'ecclesiastes', name: 'Ecclesiastes', apiName: 'Ecclesiastes', testament: 'old', order: 21, chapters: 12 },
  { id: 'song-of-solomon', name: 'Song of Solomon', apiName: 'Song of Solomon', testament: 'old', order: 22, chapters: 8 },
  { id: 'isaiah', name: 'Isaiah', apiName: 'Isaiah', testament: 'old', order: 23, chapters: 66 },
  { id: 'jeremiah', name: 'Jeremiah', apiName: 'Jeremiah', testament: 'old', order: 24, chapters: 52 },
  { id: 'lamentations', name: 'Lamentations', apiName: 'Lamentations', testament: 'old', order: 25, chapters: 5 },
  { id: 'ezekiel', name: 'Ezekiel', apiName: 'Ezekiel', testament: 'old', order: 26, chapters: 48 },
  { id: 'daniel', name: 'Daniel', apiName: 'Daniel', testament: 'old', order: 27, chapters: 12 },
  { id: 'hosea', name: 'Hosea', apiName: 'Hosea', testament: 'old', order: 28, chapters: 14 },
  { id: 'joel', name: 'Joel', apiName: 'Joel', testament: 'old', order: 29, chapters: 3 },
  { id: 'amos', name: 'Amos', apiName: 'Amos', testament: 'old', order: 30, chapters: 9 },
  { id: 'obadiah', name: 'Obadiah', apiName: 'Obadiah', testament: 'old', order: 31, chapters: 1 },
  { id: 'jonah', name: 'Jonah', apiName: 'Jonah', testament: 'old', order: 32, chapters: 4 },
  { id: 'micah', name: 'Micah', apiName: 'Micah', testament: 'old', order: 33, chapters: 7 },
  { id: 'nahum', name: 'Nahum', apiName: 'Nahum', testament: 'old', order: 34, chapters: 3 },
  { id: 'habakkuk', name: 'Habakkuk', apiName: 'Habakkuk', testament: 'old', order: 35, chapters: 3 },
  { id: 'zephaniah', name: 'Zephaniah', apiName: 'Zephaniah', testament: 'old', order: 36, chapters: 3 },
  { id: 'haggai', name: 'Haggai', apiName: 'Haggai', testament: 'old', order: 37, chapters: 2 },
  { id: 'zechariah', name: 'Zechariah', apiName: 'Zechariah', testament: 'old', order: 38, chapters: 14 },
  { id: 'malachi', name: 'Malachi', apiName: 'Malachi', testament: 'old', order: 39, chapters: 4 },

  { id: 'matthew', name: 'Matthew', apiName: 'Matthew', testament: 'new', order: 40, chapters: 28 },
  { id: 'mark', name: 'Mark', apiName: 'Mark', testament: 'new', order: 41, chapters: 16 },
  { id: 'luke', name: 'Luke', apiName: 'Luke', testament: 'new', order: 42, chapters: 24 },
  { id: 'john', name: 'John', apiName: 'John', testament: 'new', order: 43, chapters: 21 },
  { id: 'acts', name: 'Acts', apiName: 'Acts', testament: 'new', order: 44, chapters: 28 },
  { id: 'romans', name: 'Romans', apiName: 'Romans', testament: 'new', order: 45, chapters: 16 },
  { id: '1-corinthians', name: '1 Corinthians', apiName: '1 Corinthians', testament: 'new', order: 46, chapters: 16 },
  { id: '2-corinthians', name: '2 Corinthians', apiName: '2 Corinthians', testament: 'new', order: 47, chapters: 13 },
  { id: 'galatians', name: 'Galatians', apiName: 'Galatians', testament: 'new', order: 48, chapters: 6 },
  { id: 'ephesians', name: 'Ephesians', apiName: 'Ephesians', testament: 'new', order: 49, chapters: 6 },
  { id: 'philippians', name: 'Philippians', apiName: 'Philippians', testament: 'new', order: 50, chapters: 4 },
  { id: 'colossians', name: 'Colossians', apiName: 'Colossians', testament: 'new', order: 51, chapters: 4 },
  { id: '1-thessalonians', name: '1 Thessalonians', apiName: '1 Thessalonians', testament: 'new', order: 52, chapters: 5 },
  { id: '2-thessalonians', name: '2 Thessalonians', apiName: '2 Thessalonians', testament: 'new', order: 53, chapters: 3 },
  { id: '1-timothy', name: '1 Timothy', apiName: '1 Timothy', testament: 'new', order: 54, chapters: 6 },
  { id: '2-timothy', name: '2 Timothy', apiName: '2 Timothy', testament: 'new', order: 55, chapters: 4 },
  { id: 'titus', name: 'Titus', apiName: 'Titus', testament: 'new', order: 56, chapters: 3 },
  { id: 'philemon', name: 'Philemon', apiName: 'Philemon', testament: 'new', order: 57, chapters: 1 },
  { id: 'hebrews', name: 'Hebrews', apiName: 'Hebrews', testament: 'new', order: 58, chapters: 13 },
  { id: 'james', name: 'James', apiName: 'James', testament: 'new', order: 59, chapters: 5 },
  { id: '1-peter', name: '1 Peter', apiName: '1 Peter', testament: 'new', order: 60, chapters: 5 },
  { id: '2-peter', name: '2 Peter', apiName: '2 Peter', testament: 'new', order: 61, chapters: 3 },
  { id: '1-john', name: '1 John', apiName: '1 John', testament: 'new', order: 62, chapters: 5 },
  { id: '2-john', name: '2 John', apiName: '2 John', testament: 'new', order: 63, chapters: 1 },
  { id: '3-john', name: '3 John', apiName: '3 John', testament: 'new', order: 64, chapters: 1 },
  { id: 'jude', name: 'Jude', apiName: 'Jude', testament: 'new', order: 65, chapters: 1 },
  { id: 'revelation', name: 'Revelation', apiName: 'Revelation', testament: 'new', order: 66, chapters: 22 },
];

export function findBibleBook(id: string): BibleBookMeta | undefined {
  return BIBLE_BOOKS.find((b) => b.id === id);
}
