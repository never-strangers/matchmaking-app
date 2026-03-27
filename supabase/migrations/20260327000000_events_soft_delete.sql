-- Soft-delete for events: recoverable for 30 days
-- Adds deleted_at column; hard-delete via cron after 30 days

ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at) WHERE deleted_at IS NOT NULL;

-- View: only active (non-deleted) events -- optional convenience
CREATE OR REPLACE VIEW active_events AS
  SELECT * FROM events WHERE deleted_at IS NULL;

COMMENT ON COLUMN events.deleted_at IS
  'Soft-delete timestamp. NULL = active. Set to recover within 30 days. Hard-delete scheduled after 30 days.';
