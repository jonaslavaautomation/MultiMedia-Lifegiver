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
 * - NIV is copyrighted by Biblica. There is no free public API for it — real
 *   access (e.g. via api.bible) requires Biblica's separate approval on top
 *   of an API key. It's listed here so the UI/data model is ready, but
 *   `available: false` until that license and integration exist — do not
 *   flip this to true without a real licensed source wired up in
 *   bibleApi.ts.
 */
export const BIBLE_TRANSLATIONS: BibleTranslationMeta[] = [
  { code: 'KJV', name: 'King James Version', note: 'Public domain', available: true },
  { code: 'NLT', name: 'New Living Translation', note: 'Used by permission of Tyndale House Publishers', available: true },
  { code: 'NIV', name: 'New International Version', note: 'Requires a Biblica license — not yet connected', available: false },
];

export const DEFAULT_TRANSLATION = BIBLE_TRANSLATIONS[0].code;
