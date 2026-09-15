import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { getMediaInfoById } from '@/lib/mediaStorage';
import type { MediaType, Slide } from '@/types';

const DB_NAME = 'lifegiver-service-pack';
const DB_VERSION = 1;

interface CachedAsset {
  mediaId: string;
  blob: Blob;
  type: MediaType;
  cachedAt: number;
}

interface ServicePackSchema extends DBSchema {
  assets: {
    key: string; // media row id
    value: CachedAsset;
  };
}

let dbPromise: Promise<IDBPDatabase<ServicePackSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<ServicePackSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<ServicePackSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('assets')) {
          db.createObjectStore('assets', { keyPath: 'mediaId' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Every distinct uploaded-media background referenced across a
 * presentation's slides, with which slide(s) reference it — the "shopping
 * list" both Download and Check Service work from. Deliberately only
 * meta.backgroundMediaId: a Motion Background preset and a pasted embed URL
 * are never candidates (see renderSlide.ts) — the preset is bundled with
 * the app already, and an embed URL is a live external stream this app has
 * no ability to snapshot for offline use.
 */
export function collectReferencedMedia(slides: Slide[]): Map<string, string[]> {
  const bySlideTitle = new Map<string, string[]>();
  for (const slide of slides) {
    const mediaId = slide.content?.meta?.backgroundMediaId;
    if (!mediaId) continue;
    const titles = bySlideTitle.get(mediaId) ?? [];
    titles.push(slide.title || 'Untitled slide');
    bySlideTitle.set(mediaId, titles);
  }
  return bySlideTitle;
}

// Object URLs never expire the way signed URLs do, so — unlike
// mediaStorage.ts's mediaInfoCache — there's no TTL here, only a
// create-once memoization. Revoked explicitly on clearServicePack() and
// whenever a re-download replaces an asset, so a stale blob's URL is never
// left dangling (the exact "blob URL leak" class of bug the offline-
// resilience audit specifically checked for and found nothing pre-existing).
const objectUrlCache = new Map<string, { url: string; type: MediaType }>();

function revokeCachedObjectUrl(mediaId: string): void {
  const entry = objectUrlCache.get(mediaId);
  if (entry) {
    URL.revokeObjectURL(entry.url);
    objectUrlCache.delete(mediaId);
  }
}

/**
 * The offline-playback fast path — consulted by mediaStorage.ts's
 * getMediaInfoById before it ever touches Supabase. Returns null (not an
 * error) when this asset was never downloaded into the Service Pack, which
 * is the normal case for a presentation that hasn't been prepared for
 * offline use.
 */
export async function getCachedAssetInfo(mediaId: string): Promise<{ url: string; type: MediaType } | null> {
  const cached = objectUrlCache.get(mediaId);
  if (cached) return cached;

  try {
    const db = await getDb();
    const asset = await db.get('assets', mediaId);
    if (!asset) return null;
    const info = { url: URL.createObjectURL(asset.blob), type: asset.type };
    objectUrlCache.set(mediaId, info);
    return info;
  } catch (err) {
    console.error('Failed to read local Service Pack asset:', err);
    return null;
  }
}

export async function isAssetDownloaded(mediaId: string): Promise<boolean> {
  try {
    const db = await getDb();
    return (await db.getKey('assets', mediaId)) !== undefined;
  } catch (err) {
    console.error('Failed to check Service Pack asset:', err);
    return false;
  }
}

export interface ServiceReadiness {
  ready: boolean;
  totalAssets: number;
  readyAssets: number;
  /** Never falsely reported empty when something is actually missing — see checkServiceReadiness. */
  missing: { mediaId: string; slideTitles: string[] }[];
}

/**
 * "CHECK SERVICE" — reports exactly what's missing rather than a vague
 * pass/fail, and never claims READY unless every referenced asset is
 * actually present locally right now (re-verified against IndexedDB on
 * every call, not cached optimistically).
 */
export async function checkServiceReadiness(slides: Slide[]): Promise<ServiceReadiness> {
  const referenced = collectReferencedMedia(slides);
  const missing: { mediaId: string; slideTitles: string[] }[] = [];
  let readyAssets = 0;

  for (const [mediaId, slideTitles] of referenced) {
    if (await isAssetDownloaded(mediaId)) {
      readyAssets++;
    } else {
      missing.push({ mediaId, slideTitles });
    }
  }

  return {
    ready: missing.length === 0,
    totalAssets: referenced.size,
    readyAssets,
    missing,
  };
}

export interface DownloadProgress {
  total: number;
  completed: number;
  /** mediaIds that failed to download this run — already-cached assets are left untouched, so a partial failure never regresses a previously-working offline setup. */
  failed: string[];
}

/**
 * "Download for Offline Use" — walks every media background this
 * presentation's slides reference and pulls the actual bytes into
 * IndexedDB, not just the metadata Phase 1 already mirrors. This requires
 * being online right now (fetching what isn't fetched yet is unavoidably a
 * network operation) — the entire point is doing that ahead of time, once,
 * while there IS a connection, so the live presentation later needs none.
 *
 * A single asset failing (one broken link, one timeout) does not abort the
 * whole run — every other asset still gets attempted, and the failure is
 * reported by mediaId in the result rather than thrown, so the caller can
 * show exactly what to retry instead of an all-or-nothing error.
 */
export async function downloadServicePack(
  slides: Slide[],
  onProgress?: (progress: DownloadProgress) => void
): Promise<DownloadProgress> {
  const referenced = collectReferencedMedia(slides);
  const mediaIds = [...referenced.keys()];
  const progress: DownloadProgress = { total: mediaIds.length, completed: 0, failed: [] };
  onProgress?.({ ...progress });

  const db = await getDb();

  for (const mediaId of mediaIds) {
    try {
      const info = await getMediaInfoById(mediaId);
      if (!info) throw new Error('Media metadata unavailable');

      const response = await fetch(info.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();

      revokeCachedObjectUrl(mediaId); // drop any stale object URL from a previous download of this same asset
      await db.put('assets', { mediaId, blob, type: info.type, cachedAt: Date.now() });
      progress.completed++;
    } catch (err) {
      console.error(`Failed to download Service Pack asset ${mediaId}:`, err);
      progress.failed.push(mediaId);
    }
    onProgress?.({ ...progress, failed: [...progress.failed] });
  }

  return progress;
}

/** Frees all locally downloaded assets (e.g. to reclaim storage, or force a clean re-download). */
export async function clearServicePack(): Promise<void> {
  try {
    const db = await getDb();
    const keys = await db.getAllKeys('assets');
    for (const key of keys) revokeCachedObjectUrl(key);
    await db.clear('assets');
  } catch (err) {
    console.error('Failed to clear Service Pack:', err);
  }
}

/** Total bytes currently held in the Service Pack — for a "X MB downloaded" readout. */
export async function getServicePackSize(): Promise<number> {
  try {
    const db = await getDb();
    const assets = await db.getAll('assets');
    return assets.reduce((sum, a) => sum + a.blob.size, 0);
  } catch (err) {
    console.error('Failed to compute Service Pack size:', err);
    return 0;
  }
}
