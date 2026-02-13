-- Ensure phone columns exist for registration and profile (backward compatibility)
-- Run after 001_create_profiles.sql and 002_demo_core.sql

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_e164 TEXT;
