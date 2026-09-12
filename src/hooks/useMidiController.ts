import { useEffect, useRef, useState } from 'react';

export interface MidiDeviceInfo {
  id: string;
  name: string;
}

interface UseMidiControllerParams {
  /** Called on a MIDI note-on (velocity > 0) from any connected input. */
  onNoteOn?: (note: number, velocity: number) => void;
}

interface UseMidiControllerResult {
  /** False in browsers without the Web MIDI API (e.g. Safari) — callers should hide MIDI UI entirely. */
  supported: boolean;
  /** True once permission is granted and access is live. */
  ready: boolean;
  /** Currently connected MIDI input devices (e.g. a Launchpad, a Stream Deck's MIDI mode). */
  devices: MidiDeviceInfo[];
  error: string | null;
}

/**
 * Thin Web MIDI API wrapper: requests access once, listens to every
 * connected input (and any that connect later) for note-on messages, and
 * reports them through onNoteOn. Callers bind specific note numbers to
 * actions (see hotkeyBindings.ts) — this hook only surfaces the raw events
 * and device list.
 */
export function useMidiController({ onNoteOn }: UseMidiControllerParams = {}): UseMidiControllerResult {
  const [supported] = useState(() => typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator);
  const [ready, setReady] = useState(false);
  const [devices, setDevices] = useState<MidiDeviceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const onNoteOnRef = useRef(onNoteOn);
  onNoteOnRef.current = onNoteOn;

  useEffect(() => {
    if (!supported) return;
    let access: MIDIAccess | null = null;
    let cancelled = false;

    function handleMidiMessage(event: MIDIMessageEvent) {
      const data = event.data;
      if (!data || data.length < 3) return;
      const status = data[0] & 0xf0;
      const note = data[1];
      const velocity = data[2];
      // Note-on with velocity 0 is conventionally a note-off — only real presses trigger an action.
      if (status === 0x90 && velocity > 0) {
        onNoteOnRef.current?.(note, velocity);
      }
    }

    const attachedInputs = new Set<MIDIInput>();

    function attachToInputs(midiAccess: MIDIAccess) {
      const list: MidiDeviceInfo[] = [];
      midiAccess.inputs.forEach((input) => {
        // addEventListener (not the single-slot `.onmidimessage =`) so this hook
        // can be used in more than one place at once (e.g. a live-trigger
        // listener on the Operator page and a "press a pad to bind" listener
        // in the bindings modal, both mounted at the same time) without one
        // silently overwriting the other's handler on the same input.
        if (!attachedInputs.has(input)) {
          input.addEventListener('midimessage', handleMidiMessage);
          attachedInputs.add(input);
        }
        list.push({ id: input.id, name: input.name ?? 'MIDI Device' });
      });
      if (!cancelled) setDevices(list);
    }

    navigator
      .requestMIDIAccess()
      .then((midiAccess) => {
        if (cancelled) return;
        access = midiAccess;
        attachToInputs(midiAccess);
        setReady(true);
        midiAccess.onstatechange = () => attachToInputs(midiAccess);
      })
      .catch(() => {
        if (!cancelled) setError('MIDI access was denied or is unavailable.');
      });

    return () => {
      cancelled = true;
      attachedInputs.forEach((input) => input.removeEventListener('midimessage', handleMidiMessage));
      attachedInputs.clear();
      if (access) {
        access.onstatechange = null;
      }
    };
  }, [supported]);

  return { supported, ready, devices, error };
}
