-- Create profiles table for user data
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Create profiles table (using TEXT for enums for simplicity)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  city TEXT NOT NULL,
  city_locked BOOLEAN DEFAULT false,
  city_change_requested TEXT,
  orientation JSONB, -- { attractedTo: string[], lookingFor: string[] }
  profile_photo_url TEXT,
  questionnaire_answers JSONB DEFAULT '{}', -- { questionId: 1|2|3|4 }
  status TEXT DEFAULT 'unverified' CHECK (status IN ('pending_approval', 'approved', 'rejected', 'unverified')),
  email_verified BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'guest' CHECK (role IN ('guest', 'user', 'host', 'admin')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent: drop if exists then create)
DROP POLICY IF EXISTS "Allow anonymous read" ON profiles;
CREATE POLICY "Allow anonymous read" ON profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert" ON profiles;
CREATE POLICY "Allow anonymous insert" ON profiles
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous update" ON profiles;
CREATE POLICY "Allow anonymous update" ON profiles
  FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous delete" ON profiles;
CREATE POLICY "Allow anonymous delete" ON profiles
  FOR DELETE
  USING (true);
