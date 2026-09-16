import { itunesProvider } from '@/lib/songSearch/itunesProvider';
import type { SongSearchProvider } from '@/lib/songSearch/types';

export type { SongSearchProvider, SongSearchResultItem, SongSearchFilter, SongSearchOptions } from '@/lib/songSearch/types';

const PROVIDERS: Record<string, SongSearchProvider> = {
  itunes: itunesProvider,
};

/**
 * The active provider — swappable later via VITE_SONG_LYRICS_PROVIDER
 * without touching OnlineSongSearchModal.tsx or SmartImportModal.tsx at
 * all, once a licensed lyrics source is actually available (see
 * itunesProvider.ts's header for why none is configured today).
 */
export function getActiveSongSearchProvider(): SongSearchProvider {
  const configured = (import.meta.env.VITE_SONG_LYRICS_PROVIDER as string | undefined)?.trim();
  return (configured && PROVIDERS[configured]) || itunesProvider;
}
