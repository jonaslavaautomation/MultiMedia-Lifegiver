import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { RealtimeLiveMessage } from '@/types/live';

const BROADCAST_EVENT = 'live';
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30_000;

interface UseRealtimeLiveChannelResult {
  post: (message: RealtimeLiveMessage) => void;
  /** The most recently received message. */
  lastMessage: RealtimeLiveMessage | null;
  /** Whether the channel is currently subscribed — network reliability matters more here than for the same-device BroadcastChannel. */
  connected: boolean;
}

/**
 * Cross-device counterpart to useLiveChannel.ts (which is same-computer
 * only, via BroadcastChannel). Backed by a private Supabase Realtime
 * broadcast channel — requires the "authenticated_can_use_live_channels"
 * RLS policy on realtime.messages (see the matching migration) to be
 * applied to the project.
 *
 * Auto-reconnects with exponential backoff on TIMED_OUT/CLOSED/
 * CHANNEL_ERROR — Realtime does not resubscribe a dropped channel on its
 * own, so without this, a phone remote that loses its connection mid-
 * service (a brief Wi-Fi drop, the tab backgrounding, etc.) would stay
 * disconnected forever until manually reloaded. This is purely the phone
 * remote's link to the operator, not the live presentation itself — the
 * operator's own local controls (keyboard, mouse, MIDI, Projector/Stage via
 * useLiveChannel.ts's same-device BroadcastChannel) never depend on this.
 */
export function useRealtimeLiveChannel(presentationId: string): UseRealtimeLiveChannelResult {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [lastMessage, setLastMessage] = useState<RealtimeLiveMessage | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!presentationId) return;

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    function connect() {
      const channel = supabase.channel(`presentation-live-${presentationId}`, {
        config: { broadcast: { self: false }, private: true },
      });
      channelRef.current = channel;

      channel.on('broadcast', { event: BROADCAST_EVENT }, (message) => {
        setLastMessage(message.payload as RealtimeLiveMessage);
      });

      channel.subscribe((status) => {
        // Ignore a stale callback from a channel we've already superseded
        // (e.g. a delayed CLOSED event arriving after a newer connect()
        // already replaced channelRef.current) — acting on it here would
        // double-schedule a reconnect.
        if (cancelled || channelRef.current !== channel) return;

        if (status === 'SUBSCRIBED') {
          attempt = 0;
          setConnected(true);
          return;
        }

        // TIMED_OUT / CLOSED / CHANNEL_ERROR.
        setConnected(false);
        void supabase.removeChannel(channel);
        const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** attempt, MAX_RECONNECT_DELAY_MS);
        attempt += 1;
        reconnectTimer = setTimeout(() => {
          if (!cancelled) connect();
        }, delay);
      });
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      setConnected(false);
      if (channelRef.current) void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [presentationId]);

  const post = useCallback((message: RealtimeLiveMessage) => {
    void channelRef.current?.send({ type: 'broadcast', event: BROADCAST_EVENT, payload: message });
  }, []);

  return { post, lastMessage, connected };
}
