/**
 * Song search provider abstraction (see songSearch/index.ts for the
 * registry, itunesProvider.ts for the one real implementation today).
 *
 * Deliberately an interface, not a single hard-coded API call from the UI:
 * this app has no licensed lyrics source right now, so today's only
 * provider returns metadata + a link back to the source, never lyrics
 * text — but a future licensed provider (CCLI SongSelect, a paid lyrics
 * API, etc.) only has to implement this same shape to slot in, with zero
 * changes to OnlineSongSearchModal or SmartImportModal.
 */

export interface SongSearchResultItem {
  /** Provider-specific id — not a LifeGiver song id. */
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  artworkUrl: string | null;
  /** A short audio preview URL, if the provider offers one (e.g. iTunes' 30s clip) — never full playback. */
  previewUrl: string | null;
  /** Where to view/hear this on the provider's own site — "Open Source". */
  sourceUrl: string | null;
  /** Which provider produced this result, e.g. 'itunes' — persisted onto the Song record if imported. */
  provider: string;
  /** A copyright/attribution line to show alongside the result, if the provider supplies one. */
  copyrightNotice: string | null;
}

export type SongSearchFilter = 'all' | 'song' | 'artist';

export interface SongSearchOptions {
  filter?: SongSearchFilter;
  signal?: AbortSignal;
  limit?: number;
}

export interface SongSearchProvider {
  id: string;
  /** Shown in the UI, e.g. "iTunes (Apple)". */
  label: string;
  searchSongs(query: string, options?: SongSearchOptions): Promise<SongSearchResultItem[]>;
  /**
   * Returns lyrics text this provider is actually licensed to hand back, or
   * null to mean "not available — paste lyrics you're authorized to use."
   * Every provider shipped today returns null unconditionally; this exists
   * so a future authorized provider can return real text without any
   * caller needing to change.
   */
  getLyrics(item: SongSearchResultItem): Promise<string | null>;
}
