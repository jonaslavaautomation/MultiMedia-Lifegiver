import { supabase } from '@/lib/supabase';

/**
 * Per-user favorites for the built-in Motion Background Library.
 * Backed by the `motion_favorites` table (see the migration SQL handed to
 * the user — this app has no direct database access in this environment,
 * so schema changes are applied by the user, not by a tool call here).
 */

export async function getFavoriteMotionIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('motion_favorites')
    .select('motion_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching motion favorites:', error.message);
    return new Set();
  }

  return new Set((data as { motion_id: string }[]).map((row) => row.motion_id));
}

export async function addFavoriteMotion(userId: string, motionId: string): Promise<boolean> {
  const { error } = await supabase.from('motion_favorites').insert({ user_id: userId, motion_id: motionId });
  if (error) {
    console.error('Error adding motion favorite:', error.message);
    return false;
  }
  return true;
}

export async function removeFavoriteMotion(userId: string, motionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('motion_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('motion_id', motionId);

  if (error) {
    console.error('Error removing motion favorite:', error.message);
    return false;
  }
  return true;
}
