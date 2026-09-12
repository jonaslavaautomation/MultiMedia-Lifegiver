export type HotkeyAction = 'next' | 'previous' | 'clear';

export type BindingSource = { type: 'keyboard'; key: string } | { type: 'midi'; note: number };

export type HotkeyBindings = Partial<Record<HotkeyAction, BindingSource>>;

const STORAGE_KEY = 'lifegiver-hotkey-bindings';

export const HOTKEY_ACTION_LABELS: Record<HotkeyAction, string> = {
  next: 'Next Slide',
  previous: 'Previous Slide',
  clear: 'Toggle Blackout',
};

/** Human-readable label for a binding, e.g. "Key: B" or "MIDI note 60". */
export function describeBinding(binding: BindingSource | undefined): string {
  if (!binding) return 'Not set';
  if (binding.type === 'keyboard') return `Key: ${binding.key.length === 1 ? binding.key.toUpperCase() : binding.key}`;
  return `MIDI note ${binding.note}`;
}

export function loadHotkeyBindings(): HotkeyBindings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as HotkeyBindings;
  } catch {
    return {};
  }
}

export function saveHotkeyBindings(bindings: HotkeyBindings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // Private browsing / storage quota — bindings just won't persist across reloads.
  }
}

/** Finds which action (if any) a keyboard key is bound to. */
export function findActionForKey(bindings: HotkeyBindings, key: string): HotkeyAction | null {
  const normalized = key.toLowerCase();
  for (const action of Object.keys(bindings) as HotkeyAction[]) {
    const b = bindings[action];
    if (b?.type === 'keyboard' && b.key.toLowerCase() === normalized) return action;
  }
  return null;
}

/** Finds which action (if any) a MIDI note number is bound to. */
export function findActionForMidiNote(bindings: HotkeyBindings, note: number): HotkeyAction | null {
  for (const action of Object.keys(bindings) as HotkeyAction[]) {
    const b = bindings[action];
    if (b?.type === 'midi' && b.note === note) return action;
  }
  return null;
}
