export interface BibleTranslationMeta {
  code: string;
  name: string;
  note: string;
}

/**
 * Only public-domain (or clearly-licensed-for-this-use) translations belong
 * here — never scrape/import a copyrighted translation without a license.
 * KJV is the only one wired up end-to-end right now (src/lib/bibleApi.ts
 * fetches it from bible-api.com, a free public-domain source); this list
 * exists so the UI and data model are ready to add more later without
 * changing the calling code — just add an entry here and extend
 * bibleApi.ts's fetch/cache functions to branch on `translation`.
 */
export const BIBLE_TRANSLATIONS: BibleTranslationMeta[] = [
  { code: 'KJV', name: 'King James Version', note: 'Public domain' },
];

export const DEFAULT_TRANSLATION = BIBLE_TRANSLATIONS[0].code;
