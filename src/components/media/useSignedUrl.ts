import { useEffect, useState } from 'react';
import { getMediaSignedUrl } from '@/lib/mediaStorage';

// Per-path in-memory cache so a grid of media cards doesn't re-request a
// signed URL for the same path every time it re-renders.
const signedUrlCache = new Map<string, string>();

/**
 * Resolves a private-bucket storage path into a short-lived signed URL for
 * display. Returns null while resolving or if the path has no value yet.
 */
export function useSignedUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(path ? (signedUrlCache.get(path) ?? null) : null);

  useEffect(() => {
    let cancelled = false;

    if (!path) {
      setUrl(null);
      return;
    }

    const cached = signedUrlCache.get(path);
    if (cached) {
      setUrl(cached);
      return;
    }

    setUrl(null);
    getMediaSignedUrl(path).then((signedUrl) => {
      if (cancelled) return;
      if (signedUrl) {
        signedUrlCache.set(path, signedUrl);
        setUrl(signedUrl);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return url;
}
