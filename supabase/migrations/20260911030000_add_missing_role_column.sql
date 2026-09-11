/*
# Add missing `role` column to profiles

## Problem
The live `profiles` table predates this project's migrations and only has
an `admin` text column, not `role`. Because the original schema migration
used `CREATE TABLE IF NOT EXISTS profiles (...)`, and `profiles` already
existed, that statement was a complete no-op for column structure — it
silently never added `role`.

This broke `is_admin()` (a SECURITY DEFINER function referencing
`profiles.role`) whenever it was actually evaluated for a row other than
the querying user's own. The RLS policy `auth.uid() = id OR is_admin()`
short-circuits and never calls `is_admin()` for a user's own profile row
(which is why login and simple profile lookups always worked), but any
query joining to `profiles` for *other* users' rows — Presentations,
Songs, and Media list pages — forces `is_admin()` to actually run, which
then fails on the missing column.

## Fix
Add the `role` column with the definition the app has always assumed,
defaulting every existing row to 'media' (the least-privileged role) so
nobody is silently granted admin access by this migration. The old
`admin` column is left in place, unused, in case anything else still
depends on it — safe to drop later once confirmed unused.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'media';

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'media', 'pastor'));

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

NOTIFY pgrst, 'reload schema';
