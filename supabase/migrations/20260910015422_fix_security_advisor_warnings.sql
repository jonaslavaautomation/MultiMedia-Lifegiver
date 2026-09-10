/*
# Fix security advisor warnings on helper functions

1. Security Changes
- `update_updated_at()`: Set a fixed `search_path` to eliminate mutable search path warning.
- `handle_new_user()`: Revoke EXECUTE from `anon` and `authenticated` — this function
  should only be called by the database trigger, not via the REST API.
- `is_admin()`: Revoke EXECUTE from `anon` — only authenticated users should call this.
  Retain EXECUTE for `authenticated` since it's used in RLS policy checks.
*/

-- Fix update_updated_at search path
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Revoke EXECUTE on handle_new_user from anon and authenticated
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM anon, authenticated;

-- Revoke EXECUTE on is_admin from anon only
REVOKE EXECUTE ON FUNCTION is_admin() FROM anon;
