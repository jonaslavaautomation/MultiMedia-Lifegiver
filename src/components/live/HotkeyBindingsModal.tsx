import { useEffect, useState } from 'react';
import { Keyboard, Piano, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useMidiController } from '@/hooks/useMidiController';
import {
  describeBinding,
  HOTKEY_ACTION_LABELS,
  type BindingSource,
  type HotkeyAction,
  type HotkeyBindings,
} from '@/lib/hotkeyBindings';

const ACTIONS: HotkeyAction[] = ['next', 'previous', 'clear', 'freeze', 'safe-slide'];

interface HotkeyBindingsModalProps {
  open: boolean;
  onClose: () => void;
  bindings: HotkeyBindings;
  onChange: (bindings: HotkeyBindings) => void;
}

/**
 * Lets the operator bind a keyboard key and/or a MIDI pad (Launchpad,
 * Stream Deck's MIDI mode, any class-compliant controller) to Next/
 * Previous/Blackout. Bindings persist to localStorage (see
 * hotkeyBindings.ts) — deliberately per-browser/device, since physical
 * hardware is plugged into one specific computer, not synced.
 */
export function HotkeyBindingsModal({ open, onClose, bindings, onChange }: HotkeyBindingsModalProps) {
  const [learning, setLearning] = useState<HotkeyAction | null>(null);

  const { supported, devices } = useMidiController({
    onNoteOn: (note) => {
      if (!learning) return;
      applyBinding(learning, { type: 'midi', note });
    },
  });

  // While "learning" a key, capture the next keydown as that action's binding.
  useEffect(() => {
    if (!learning) return;
    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      // Stop this keypress from also reaching the operator page's own
      // shortcut listener — otherwise binding a key (e.g. "N" to Next)
      // would also immediately fire that action on this same keypress.
      e.stopPropagation();
      if (e.key === 'Escape') {
        setLearning(null);
        return;
      }
      applyBinding(learning!, { type: 'keyboard', key: e.key });
    }
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learning]);

  function applyBinding(action: HotkeyAction, source: BindingSource) {
    onChange({ ...bindings, [action]: source });
    setLearning(null);
  }

  function clearBinding(action: HotkeyAction) {
    const next = { ...bindings };
    delete next[action];
    onChange(next);
  }

  return (
    <Modal open={open} onClose={onClose} title="MIDI & Hotkeys">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-400 leading-relaxed">
          Bind a keyboard key or a MIDI pad to control the show — the arrow keys, B for blackout, F for freeze, and L
          for the safe slide always work too, these are extra bindings on top (handy for a Stream Deck in MIDI mode,
          or a Launchpad).
        </p>

        <div
          className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs ${
            supported ? 'border-hud-border bg-hud-panel/60 text-zinc-400' : 'border-amber-900/50 bg-amber-950/20 text-amber-300'
          }`}
        >
          <Piano className="w-3.5 h-3.5 shrink-0" />
          {!supported
            ? "This browser doesn't support Web MIDI (try Chrome or Edge) — keyboard bindings still work."
            : devices.length === 0
              ? 'No MIDI devices detected. Connect one and it will show up here automatically.'
              : `Connected: ${devices.map((d) => d.name).join(', ')}`}
        </div>

        <div className="flex flex-col gap-2">
          {ACTIONS.map((action) => (
            <div
              key={action}
              className="flex items-center justify-between gap-3 rounded-xl bg-hud-panel/60 border border-hud-border px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm text-zinc-200">{HOTKEY_ACTION_LABELS[action]}</p>
                <p className="text-xs text-zinc-500">{describeBinding(bindings[action])}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {bindings[action] && (
                  <Button variant="ghost" size="sm" onClick={() => clearBinding(action)} title="Clear binding">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  variant={learning === action ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setLearning(learning === action ? null : action)}
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  {learning === action ? 'Press a key or MIDI pad…' : 'Set'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
