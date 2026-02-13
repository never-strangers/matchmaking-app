-- Backfill all existing users to Singapore if city is null or empty.
-- Safe to run multiple times.

UPDATE profiles
SET city = 'Singapore'
WHERE city IS NULL OR TRIM(city) = '';

-- Ensure invited_users has city column (from 004)
ALTER TABLE invited_users ADD COLUMN IF NOT EXISTS city TEXT;

UPDATE invited_users
SET city = 'Singapore'
WHERE city IS NULL OR TRIM(city) = '';
