-- Optional: events by city, invited_users city for prepopulation
-- Safe to run multiple times.

ALTER TABLE events ADD COLUMN IF NOT EXISTS city TEXT;
UPDATE events SET city = 'Singapore' WHERE id = '00000000-0000-0000-0000-000000000001' AND city IS NULL;

ALTER TABLE invited_users ADD COLUMN IF NOT EXISTS city TEXT;
UPDATE invited_users SET city = 'Singapore' WHERE city IS NULL;
