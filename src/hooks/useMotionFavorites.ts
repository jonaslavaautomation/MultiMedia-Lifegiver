import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addFavoriteMotion, getFavoriteMotionIds, removeFavoriteMotion } from '@/lib/motionFavorites';

/** Loads the signed-in user's favorited motion preset ids once, and exposes an optimistic toggle. */
export function useMotionFavorites() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setFavoriteIds(new Set());
      setLoaded(true);
      return;
    }
    getFavoriteMotionIds(user.id).then((ids) => {
      if (!cancelled) {
        setFavoriteIds(ids);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleFavorite = useCallback(
    async (motionId: string) => {
      if (!user) return;
      const wasFavorite = favoriteIds.has(motionId);

      // Optimistic update — reverted if the write fails.
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(motionId);
        else next.add(motionId);
        return next;
      });

      const ok = wasFavorite ? await removeFavoriteMotion(user.id, motionId) : await addFavoriteMotion(user.id, motionId);

      if (!ok) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorite) next.add(motionId);
          else next.delete(motionId);
          return next;
        });
      }
    },
    [user, favoriteIds]
  );

  return { favoriteIds, loaded, toggleFavorite, isFavorite: (id: string) => favoriteIds.has(id) };
}
