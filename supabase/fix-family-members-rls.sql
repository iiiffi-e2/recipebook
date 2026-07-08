-- Fix infinite recursion in family_members RLS policies.
-- Run this in the Supabase SQL editor for production.

CREATE OR REPLACE FUNCTION public.user_family_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT family_id
  FROM family_members
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_editor_family_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT family_id
  FROM family_members
  WHERE user_id = auth.uid()
    AND role IN ('owner', 'editor');
$$;

CREATE OR REPLACE FUNCTION public.user_owner_family_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT family_id
  FROM family_members
  WHERE user_id = auth.uid()
    AND role = 'owner';
$$;

CREATE OR REPLACE FUNCTION public.family_has_no_members(family_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM family_members
    WHERE family_id = family_uuid
  );
$$;

DROP POLICY IF EXISTS "Creators can add themselves as first owner" ON family_members;

CREATE POLICY "Creators can add themselves as first owner"
  ON family_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND public.family_has_no_members(family_id)
  );
