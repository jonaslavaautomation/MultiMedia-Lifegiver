export interface BibleTranslationMeta {
  code: string;
  name: string;
  note: string;
  /**
   * false = listed for the UI/data model but not wired to a real text source
   * yet — selecting it should show why instead of silently fetching nothing
   * (or someone else's translation). See src/lib/bibleApi.ts.
   */
  available: boolean;
}

/**
 * Only public-domain (or clearly-licensed-for-this-use) translations belong
 * here — never scrape/import a copyrighted translation without a license.
 *
 * - KJV is public domain — fetched from bible-api.com (src/lib/bibleApi.ts).
 * - NLT is copyrighted by Tyndale House. It's wired up via Tyndale's own free
 *   developer API (api.nlt.to) — sign up for a key at
 *   https://api.nlt.to/Account/Register and set VITE_NLT_API_KEY (see
 *   .env.example). That free key is for NON-COMMERCIAL use only; if this app
 *   is sold/monetized, Tyndale requires a separate commercial license — see
 *   https://api.nlt.to. Any screen that displays NLT text must show
 *   NLT_ATTRIBUTION (exported from bibleApi.ts) per Tyndale's terms.
 * - NIV is copyrighted by Biblica. It's wired up via api.bible
 *   (rest.api.bible / api.scripture.api.bible), which requires an account
 *   whose plan has NIV specifically approved — set VITE_API_BIBLE_KEY (see
 *   .env.example) to your api.bible API key. Check that account's Plan page
 *   for usage limits and whether its terms cover your intended use (a
 *   commercial/production church app may need a paid plan, not just a free
 *   developer key). Any screen that displays NIV text must show
 *   NIV_ATTRIBUTION (exported from bibleApi.ts) per Biblica's terms.
 */
export const BIBLE_TRANSLATIONS: BibleTranslationMeta[] = [
  { code: 'KJV', name: 'King James Version', note: 'Public domain', available: true },
  { code: 'NLT', name: 'New Living Translation', note: 'Used by permission of Tyndale House Publishers', available: true },
  { code: 'NIV', name: 'New International Version', note: 'Used by permission of Biblica, via api.bible', available: true },
];

export const DEFAULT_TRANSLATION = BIBLE_TRANSLATIONS[0].code;
