/*
# Fix infinite recursion in the profiles RLS policy

## Problem
`profiles_select_own_or_admin` checked admin status with an inline
subquery:

  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')

That subquery selects from the very table the policy protects, so
evaluating it re-invokes the same policy, which evaluates the subquery
again, and so on. Postgres reports this as "infinite recursion detected
in policy for relation profiles" (error 42P17). This breaks every read of
`profiles` — including the app's own profile lookup right after login —
and cascades into confusing errors on anything that joins to `profiles`
(e.g. the Presentations and Songs list pages showing
"column profiles_1.role does not exist").

## Fix
Use the existing `is_admin()` helper instead of the inline subquery.
`is_admin()` is `SECURITY DEFINER`, so its internal query bypasses RLS
and never re-triggers this policy. It was already defined for exactly
this purpose in the original schema migration — it just was never wired
into this specific policy.
*/

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR is_admin());
