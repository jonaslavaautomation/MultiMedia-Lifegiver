import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { RealtimeLiveMessage } from '@/types/live';

const BROADCAST_EVENT = 'live';

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
 */
export function useRealtimeLiveChannel(presentationId: string): UseRealtimeLiveChannelResult {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [lastMessage, setLastMessage] = useState<RealtimeLiveMessage | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!presentationId) return;

    const channel = supabase.channel(`presentation-live-${presentationId}`, {
      config: { broadcast: { self: false }, private: true },
    });
    channelRef.current = channel;

    channel.on('broadcast', { event: BROADCAST_EVENT }, (message) => {
      setLastMessage(message.payload as RealtimeLiveMessage);
    });

    channel.subscribe((status) => {
      setConnected(status === 'SUBSCRIBED');
    });

    return () => {
      setConnected(false);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [presentationId]);

  const post = useCallback((message: RealtimeLiveMessage) => {
    void channelRef.current?.send({ type: 'broadcast', event: BROADCAST_EVENT, payload: message });
  }, []);

  return { post, lastMessage, connected };
}
