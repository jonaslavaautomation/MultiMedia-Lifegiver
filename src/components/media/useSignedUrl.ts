import { useEffect, useState } from 'react';
import { getMediaSignedUrl } from '@/lib/mediaStorage';

const SIGNED_URL_TTL_MS = 3600 * 1000; // matches getMediaSignedUrl's default expiresIn
const SAFETY_MARGIN_MS = 60 * 1000; // refresh a minute before the URL actually expires

interface CacheEntry {
  url: string;
  expiresAt: number;
}

// Per-path in-memory cache so a grid of media cards doesn't re-request a
// signed URL for the same path every time it re-renders. Entries carry an
// expiry so a long-lived session (a live service can easily run over an
// hour) re-resolves the URL once it's actually about to expire, instead of
// serving an expired signed URL forever and silently breaking every image
// that was first resolved earlier in the session.
const signedUrlCache = new Map<string, CacheEntry>();

function freshCached(path: string): CacheEntry | null {
  const entry = signedUrlCache.get(path);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt - SAFETY_MARGIN_MS) return null;
  return entry;
}

/**
 * Resolves a private-bucket storage path into a short-lived signed URL for
 * display. Returns null while resolving or if the path has no value yet.
 * Proactively refreshes shortly before the URL expires — a component that
 * stays mounted with the same path for the whole length of a live service
 * (well over an hour) gets a fresh URL automatically instead of silently
 * ending up with a broken image once the original signed URL expires.
 */
export function useSignedUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(path ? (freshCached(path)?.url ?? null) : null);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    if (!path) {
      setUrl(null);
      return;
    }

    function scheduleRefresh(expiresAt: number) {
      const delay = Math.max(expiresAt - SAFETY_MARGIN_MS - Date.now(), 0);
      refreshTimer = setTimeout(() => void fetchFresh(), delay);
    }

    async function fetchFresh() {
      const signedUrl = await getMediaSignedUrl(path!);
      if (cancelled) return;
      if (signedUrl) {
        const expiresAt = Date.now() + SIGNED_URL_TTL_MS;
        signedUrlCache.set(path!, { url: signedUrl, expiresAt });
        setUrl(signedUrl);
        scheduleRefresh(expiresAt);
      }
    }

    const cached = freshCached(path);
    if (cached) {
      setUrl(cached.url);
      scheduleRefresh(cached.expiresAt);
    } else {
      setUrl(null);
      void fetchFresh();
    }

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [path]);

  return url;
}
