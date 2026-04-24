-- Add gender capacity caps to events table
-- max_males / max_females: null means no cap enforced
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS max_males INT,
  ADD COLUMN IF NOT EXISTS max_females INT;
