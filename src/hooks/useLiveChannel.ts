import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveMessage } from '@/types/live';

interface UseLiveChannelResult {
  post: (message: LiveMessage) => void;
  /** The most recently received message (not counting ones this window posted itself). */
  lastMessage: LiveMessage | null;
}

/**
 * Thin BroadcastChannel wrapper scoped to one presentation's live session.
 * Exposes the latest received message as state (rather than an onMessage
 * callback prop) so consumers react to it in their own effect — avoids a
 * circular "handler needs post, post comes from this same hook call" wiring
 * problem.
 */
export function useLiveChannel(presentationId: string): UseLiveChannelResult {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [lastMessage, setLastMessage] = useState<LiveMessage | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel(`lifegiver-live-${presentationId}`);
    channelRef.current = channel;

    function handleMessage(event: MessageEvent<LiveMessage>) {
      setLastMessage(event.data);
    }

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
      channelRef.current = null;
    };
  }, [presentationId]);

  const post = useCallback((message: LiveMessage) => {
    channelRef.current?.postMessage(message);
  }, []);

  return { post, lastMessage };
}
