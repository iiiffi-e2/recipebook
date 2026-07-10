-- Fix profile bootstrap RLS: allow users to read their own profile.
-- Run in Supabase SQL editor if family creation fails with:
--   new row violates row-level security policy for table "profiles"

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());
