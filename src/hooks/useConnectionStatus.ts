import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type ConnectionStatus = 'online' | 'offline' | 'reconnecting';

interface UseConnectionStatusResult {
  status: ConnectionStatus;
  /** Round-trip latency of the last successful ping — null whenever status isn't 'online' (never a stale/misleading number). */
  latencyMs: number | null;
}

const PING_INTERVAL_MS = 5000;
// Require 2 consecutive failed pings before declaring OFFLINE — a single
// dropped packet shouldn't flip the whole UI into "local mode" and back.
const OFFLINE_AFTER_MISSES = 2;
// How long the RECONNECTING flash shows once a ping succeeds again after
// being offline, before settling to a plain ONLINE — enough to notice,
// short enough not to feel stuck.
const RECONNECTED_FLASH_MS = 1500;

/**
 * Church-presentation-appropriate connection awareness: the internet is an
 * enhancement (sync, remote control), never a requirement for the local
 * presentation engine — so this reports state for a small, honest status
 * indicator, not as a gate on anything. "Local Mode" (offline) is a valid,
 * expected state, not an error.
 *
 * A real, lightweight Supabase round trip (not just `navigator.onLine`,
 * which only reflects whether the OS thinks a network interface is up, not
 * whether Supabase is actually reachable) — but the browser's `online`/
 * `offline` events are still used for an immediate signal between poll
 * cycles rather than waiting up to PING_INTERVAL_MS to notice.
 */
export function useConnectionStatus(): UseConnectionStatusResult {
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const consecutiveFailuresRef = useRef(0);
  const wasOfflineRef = useRef(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let reconnectFlashTimer: ReturnType<typeof setTimeout> | null = null;

    async function ping() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      const start = performance.now();
      const { error } = await supabase.from('presentations').select('id', { head: true, count: 'exact' }).limit(1);
      inFlightRef.current = false;
      if (cancelled) return;

      if (error) {
        consecutiveFailuresRef.current += 1;
        if (consecutiveFailuresRef.current >= OFFLINE_AFTER_MISSES) {
          wasOfflineRef.current = true;
          setStatus('offline');
          setLatencyMs(null);
        }
        return;
      }

      consecutiveFailuresRef.current = 0;
      setLatencyMs(Math.round(performance.now() - start));

      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setStatus('reconnecting');
        reconnectFlashTimer = setTimeout(() => {
          if (!cancelled) setStatus('online');
        }, RECONNECTED_FLASH_MS);
      } else {
        setStatus('online');
      }
    }

    function handleBrowserOffline() {
      // Immediate signal — don't wait for the next poll cycle to notice.
      consecutiveFailuresRef.current = OFFLINE_AFTER_MISSES;
      wasOfflineRef.current = true;
      setStatus('offline');
      setLatencyMs(null);
    }

    function handleBrowserOnline() {
      // The OS thinks connectivity is back — confirm it can actually reach
      // Supabase rather than trusting navigator.onLine blindly (it can be
      // true even when a captive portal or DNS failure blocks real access).
      void ping();
    }

    window.addEventListener('offline', handleBrowserOffline);
    window.addEventListener('online', handleBrowserOnline);

    void ping();
    const intervalId = setInterval(ping, PING_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      if (reconnectFlashTimer) clearTimeout(reconnectFlashTimer);
      window.removeEventListener('offline', handleBrowserOffline);
      window.removeEventListener('online', handleBrowserOnline);
    };
  }, []);

  return { status, latencyMs };
}
