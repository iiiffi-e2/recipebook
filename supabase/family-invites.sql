-- Family profiles and invite system
-- Run this in your Supabase SQL editor after schema.sql

-- User profiles (display info visible to family members)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Family invites
CREATE TABLE IF NOT EXISTS family_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role member_role DEFAULT 'viewer',
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_invites_token ON family_invites(token);
CREATE INDEX IF NOT EXISTS idx_family_invites_family ON family_invites(family_id);

-- Lookup invite by token (for signup page — no auth required)
CREATE OR REPLACE FUNCTION public.lookup_invite(invite_token TEXT)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT json_build_object(
    'familyName', f.name,
    'email', fi.email,
    'role', fi.role,
    'valid', fi.accepted_at IS NULL AND fi.expires_at > NOW()
  )
  FROM family_invites fi
  JOIN families f ON f.id = fi.family_id
  WHERE fi.token = invite_token
  LIMIT 1;
$$;

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view profiles of family members"
  ON profiles FOR SELECT
  USING (
    id IN (
      SELECT user_id FROM family_members
      WHERE family_id IN (SELECT public.user_family_ids())
    )
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Owners can view family invites"
  ON family_invites FOR SELECT
  USING (family_id IN (SELECT public.user_owner_family_ids()));

CREATE POLICY "Owners can create family invites"
  ON family_invites FOR INSERT
  WITH CHECK (
    family_id IN (SELECT public.user_owner_family_ids())
    AND invited_by = auth.uid()
  );

CREATE POLICY "Owners can delete family invites"
  ON family_invites FOR DELETE
  USING (family_id IN (SELECT public.user_owner_family_ids()));
