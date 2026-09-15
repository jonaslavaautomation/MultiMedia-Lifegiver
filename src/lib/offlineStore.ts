import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Slide, SlideCanvasData } from '@/types';

const DB_NAME = 'lifegiver-offline';
const DB_VERSION = 1;

/**
 * What the operator console needs to survive a cold start (a fresh page
 * load, not just a mid-service reconnect — the media-cache fix in
 * mediaStorage.ts only helps once a presentation is already loaded in
 * memory) with no internet at all: just enough of the presentation plus
 * every slide, not the full Presentation row from Supabase — deliberately
 * lightweight rather than mirroring the whole schema.
 */
interface CachedPresentationMeta {
  id: string;
  title: string;
  cachedAt: number;
}

/** A not-yet-synced editor edit — see saveSlideDraft below. */
interface SlideDraft {
  slideId: string;
  content: SlideCanvasData;
  backgroundId: string | null;
  savedAt: number;
}

interface OfflineSchema extends DBSchema {
  presentations: {
    key: string;
    value: CachedPresentationMeta;
  };
  slides: {
    key: string;
    value: Slide & { cachedAt: number };
    indexes: { 'by-presentation': string };
  };
  slideDrafts: {
    key: string;
    value: SlideDraft;
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<OfflineSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<OfflineSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('presentations')) {
          db.createObjectStore('presentations', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('slides')) {
          const store = db.createObjectStore('slides', { keyPath: 'id' });
          store.createIndex('by-presentation', 'presentation_id');
        }
        if (!db.objectStoreNames.contains('slideDrafts')) {
          db.createObjectStore('slideDrafts', { keyPath: 'slideId' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Mirrors a presentation + its slides locally right after a successful
 * Supabase fetch, so the next load of this same presentation can fall back
 * to this copy if Supabase is unreachable (see loadPresentationSnapshot).
 * Best-effort: IndexedDB can be unavailable (private browsing, storage
 * disabled, quota) — never throws, never blocks the live path either way.
 */
export async function cachePresentationSnapshot(id: string, title: string, slides: Slide[]): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction(['presentations', 'slides'], 'readwrite');
    const slideStore = tx.objectStore('slides');

    await tx.objectStore('presentations').put({ id, title, cachedAt: Date.now() });

    // Replace the full set for this presentation (not just upsert each row)
    // so a slide deleted/reordered since the last cache doesn't linger.
    const existingKeys = await slideStore.index('by-presentation').getAllKeys(id);
    await Promise.all(existingKeys.map((key) => slideStore.delete(key)));
    await Promise.all(slides.map((slide) => slideStore.put({ ...slide, cachedAt: Date.now() })));

    await tx.done;
  } catch (err) {
    console.error('Failed to cache presentation for offline use:', err);
  }
}

/**
 * The offline fallback for a cold start with no internet — used only when
 * the live Supabase fetch fails. Returns null if nothing was ever cached
 * for this presentation (e.g. its very first time being opened) or if
 * IndexedDB itself is unavailable.
 */
export async function loadPresentationSnapshot(
  id: string
): Promise<{ title: string; slides: Slide[]; cachedAt: number } | null> {
  try {
    const db = await getDb();
    const meta = await db.get('presentations', id);
    if (!meta) return null;
    const slides = await db.getAllFromIndex('slides', 'by-presentation', id);
    slides.sort((a, b) => a.sort_order - b.sort_order);
    return { title: meta.title, slides, cachedAt: meta.cachedAt };
  } catch (err) {
    console.error('Failed to load offline presentation snapshot:', err);
    return null;
  }
}

/**
 * Writes an edit to IndexedDB immediately (not debounced) — crash-safe the
 * instant the editor calls this, well before the separate, debounced
 * Supabase autosave (AUTOSAVE_DELAY_MS later) actually runs. If the browser
 * closes/crashes/loses power in that window, the edit isn't lost: the next
 * time this slide is opened, the draft is newer than what Supabase has and
 * gets restored (see EditorWorkspace.tsx).
 */
export async function saveSlideDraft(slideId: string, content: SlideCanvasData, backgroundId: string | null): Promise<void> {
  try {
    const db = await getDb();
    await db.put('slideDrafts', { slideId, content, backgroundId, savedAt: Date.now() });
  } catch (err) {
    console.error('Failed to save local slide draft:', err);
  }
}

export async function loadSlideDraft(slideId: string): Promise<SlideDraft | null> {
  try {
    const db = await getDb();
    return (await db.get('slideDrafts', slideId)) ?? null;
  } catch (err) {
    console.error('Failed to load local slide draft:', err);
    return null;
  }
}

/** Called once a draft's edit has been confirmed saved to Supabase — it's redundant from that point on. */
export async function clearSlideDraft(slideId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('slideDrafts', slideId);
  } catch (err) {
    console.error('Failed to clear local slide draft:', err);
  }
}

/** For the admin System Health panel — every presentation currently mirrored locally, for a "N cached for offline use" readout. */
export async function listCachedPresentations(): Promise<{ id: string; title: string; cachedAt: number }[]> {
  try {
    const db = await getDb();
    return await db.getAll('presentations');
  } catch (err) {
    console.error('Failed to list cached presentations:', err);
    return [];
  }
}
