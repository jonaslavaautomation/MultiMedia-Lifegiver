/**
 * Autosave cache for an in-progress Smart Import (src/components/songs/SmartImportModal.tsx).
 *
 * This is the "caching" piece of the Smart Song Search feature — not a
 * network-response cache (there's no lyrics API being called; see
 * lyricsParser.ts's header for why), but protection against losing a
 * half-finished paste-and-parse if the browser reloads, the tab is
 * accidentally closed, or the user navigates away mid-import. Every
 * keystroke in the modal writes here (debounced by the caller); reopening
 * the modal offers to restore it.
 */

const STORAGE_KEY = 'lifegiver-smart-import-draft';

export interface ImportDraft {
  title: string;
  author: string;
  category: string;
  rawText: string;
  savedAt: number;
}

export function saveImportDraft(draft: Omit<ImportDraft, 'savedAt'>): void {
  try {
    // An entirely empty draft is not worth restoring later — clear instead of writing noise.
    if (!draft.title.trim() && !draft.rawText.trim()) {
      clearImportDraft();
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Private browsing / storage quota — losing the autosave is a minor inconvenience, not worth surfacing.
  }
}

export function loadImportDraft(): ImportDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImportDraft;
    if (typeof parsed.rawText !== 'string' || typeof parsed.title !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearImportDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Remembers the last theme/motion picked so repeat imports default to what was used last time. */
const PREFS_KEY = 'lifegiver-smart-import-prefs';

export interface ImportPrefs {
  themeId: string;
  motionId: string | null;
  linesPerSlide: number;
}

export function saveImportPrefs(prefs: ImportPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function loadImportPrefs(): Partial<ImportPrefs> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as Partial<ImportPrefs>) : {};
  } catch {
    return {};
  }
}
