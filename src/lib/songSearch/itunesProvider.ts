import type { SongSearchOptions, SongSearchProvider, SongSearchResultItem } from '@/lib/songSearch/types';

/**
 * Apple's iTunes Search API (https://itunes.apple.com/search) — free, no
 * API key, no auth secret (so no Edge Function needed to hide anything),
 * and CORS-open for direct browser use. It returns song/artist/album
 * metadata, artwork, and a short preview clip — it has never provided
 * lyrics text, which is exactly why this provider is safe to call directly
 * from the client: there is no copyrighted lyric content in its response
 * to accidentally mishandle. `getLyrics` always returns null; see the
 * "Import Lyrics" flow in SmartImportModal.tsx for what happens next
 * (the user pastes lyrics they're authorized to use).
 */

interface ITunesTrack {
  trackId: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackViewUrl?: string;
}

interface ITunesSearchResponse {
  resultCount: number;
  results: ITunesTrack[];
}

const REQUEST_TIMEOUT_MS = 8000;

export const itunesProvider: SongSearchProvider = {
  id: 'itunes',
  label: 'iTunes (Apple)',

  async searchSongs(query: string, options: SongSearchOptions = {}): Promise<SongSearchResultItem[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const params = new URLSearchParams({
      term: trimmed,
      media: 'music',
      entity: 'song',
      limit: String(options.limit ?? 15),
    });
    if (options.filter === 'song') params.set('attribute', 'songTerm');
    else if (options.filter === 'artist') params.set('attribute', 'artistTerm');

    // iTunes doesn't honor an externally-passed AbortSignal directly on older
    // fetch polyfills, so combine our own timeout with the caller's signal
    // (e.g. a new search superseding this one) — whichever fires first wins.
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
    const onCallerAbort = () => timeoutController.abort();
    options.signal?.addEventListener('abort', onCallerAbort);

    let response: Response;
    try {
      response = await fetch(`https://itunes.apple.com/search?${params.toString()}`, {
        signal: timeoutController.signal,
      });
    } catch (err) {
      if (options.signal?.aborted) throw err; // superseded by a newer search — let the caller ignore this silently
      if (timeoutController.signal.aborted) throw new Error('Song search timed out. Please try again.');
      throw new Error('Song search is temporarily unavailable — check your connection and try again.');
    } finally {
      clearTimeout(timeoutId);
      options.signal?.removeEventListener('abort', onCallerAbort);
    }

    if (response.status === 403 || response.status === 429) {
      throw new Error('Song search is rate-limited right now. Please wait a moment and try again.');
    }
    if (!response.ok) {
      throw new Error(`Song search is temporarily unavailable (${response.status}).`);
    }

    let data: ITunesSearchResponse;
    try {
      data = (await response.json()) as ITunesSearchResponse;
    } catch {
      throw new Error('Song search returned an unexpected response. Please try again.');
    }

    if (!Array.isArray(data.results)) return [];

    return data.results
      .filter((track) => track.trackName)
      .map((track): SongSearchResultItem => ({
        id: String(track.trackId),
        title: track.trackName ?? 'Untitled',
        artist: track.artistName ?? null,
        album: track.collectionName ?? null,
        // iTunes' artwork URLs are served at a fixed 100x100 by default;
        // swapping the size segment gets a sharper thumbnail for the search grid.
        artworkUrl: track.artworkUrl100 ? track.artworkUrl100.replace('100x100', '300x300') : null,
        previewUrl: track.previewUrl ?? null,
        sourceUrl: track.trackViewUrl ?? null,
        provider: 'itunes',
        copyrightNotice: '© Apple Inc. and respective rights holders, via the iTunes Search API — metadata and preview only, no lyrics.',
      }));
  },

  async getLyrics(): Promise<string | null> {
    return null;
  },
};
