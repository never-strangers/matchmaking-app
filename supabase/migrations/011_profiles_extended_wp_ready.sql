-- Extend profiles table for User Profile page and WordPress migration readiness
-- Run after 001_create_profiles.sql and 002_demo_core.sql

-- Add profile page fields (user-editable)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS attracted_to TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reason TEXT;

-- Migration helpers for WordPress linkage (do NOT store WP password)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wp_user_id BIGINT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wp_user_login TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wp_registered_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wp_source JSONB;

-- Ensure updated_at exists and has default
ALTER TABLE profiles ALTER COLUMN updated_at SET DEFAULT now();

-- Trigger to auto-update updated_at on row change
CREATE OR REPLACE FUNCTION profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at_trigger ON profiles;
CREATE TRIGGER profiles_updated_at_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION profiles_updated_at();

-- Index for WP migration lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_wp_user_id ON profiles(wp_user_id) WHERE wp_user_id IS NOT NULL;

-- RLS: Users can select/update only their own profile
-- When using Supabase Auth: auth.uid() = id (profiles.id stores UUID string)
-- Service role bypasses RLS; anon key will use these policies when auth is enabled
DROP POLICY IF EXISTS "Allow anonymous read" ON profiles;
DROP POLICY IF EXISTS "Allow anonymous insert" ON profiles;
DROP POLICY IF EXISTS "Allow anonymous update" ON profiles;
DROP POLICY IF EXISTS "Allow anonymous delete" ON profiles;

-- Own profile: select and update
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT
  USING ((auth.uid())::text = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING ((auth.uid())::text = id)
  WITH CHECK ((auth.uid())::text = id);

-- Insert: allow for registration (invite flow creates profiles)
-- When using session-based auth without auth.users, service role is used for inserts
CREATE POLICY "Allow profile insert for registration" ON profiles
  FOR INSERT
  WITH CHECK (true);
