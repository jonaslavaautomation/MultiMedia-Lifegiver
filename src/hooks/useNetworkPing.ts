import { useConnectionStatus } from '@/hooks/useConnectionStatus';

/**
 * Real round-trip latency to Supabase, for the Broadcast Telemetry Bar.
 * Thin wrapper over useConnectionStatus (which owns the actual ping loop —
 * kept as one shared poller rather than two independent 5s interval pings
 * on the same page). Returns null until the first sample lands, AND
 * whenever the connection isn't currently 'online' — this used to keep
 * displaying the last successful latency forever even while offline, which
 * was misleading (a stale "42ms" reading while actually disconnected).
 */
export function useNetworkPing(): number | null {
  const { latencyMs } = useConnectionStatus();
  return latencyMs;
}
