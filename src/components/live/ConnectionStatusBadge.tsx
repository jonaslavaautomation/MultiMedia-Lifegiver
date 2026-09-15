import { RefreshCw } from 'lucide-react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

/**
 * Small, calm connection-state indicator for live surfaces — "Local Mode"
 * is presented as a valid, expected production state (the presentation
 * keeps working without the internet), never as an error banner. Internet
 * connectivity is an enhancement (cloud sync, remote control) here, not a
 * requirement, and the UI should read that way.
 */
export function ConnectionStatusBadge() {
  const { status } = useConnectionStatus();

  if (status === 'offline') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border bg-amber-50 border-amber-200 text-amber-700"
        title="No cloud connection — the presentation, keyboard controls, and local displays keep working normally. Remote phone control and cloud sync are paused until it's back."
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Local Mode
      </span>
    );
  }

  if (status === 'reconnecting') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border bg-sky-50 border-sky-200 text-sky-700">
        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
        Reconnecting…
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Online
    </span>
  );
}
