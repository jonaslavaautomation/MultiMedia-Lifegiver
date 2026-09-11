import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Real round-trip latency to Supabase, sampled periodically with a minimal
 * head-only query. Not a literal WebSocket ping, but an honest measurement
 * of "how fast is this operator's connection to the backend right now" —
 * used by the Broadcast Telemetry Bar. Returns null until the first sample
 * lands.
 */
export function useNetworkPing(intervalMs = 5000): number | null {
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      const start = performance.now();
      const { error } = await supabase
        .from('presentations')
        .select('id', { head: true, count: 'exact' })
        .limit(1);
      inFlightRef.current = false;
      if (cancelled || error) return;
      setLatencyMs(Math.round(performance.now() - start));
    }

    ping();
    const id = setInterval(ping, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return latencyMs;
}
