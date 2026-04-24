-- Add waitlisted status to event_attendees.ticket_status
-- Add waitlist_position to track queue order per event+gender

ALTER TABLE event_attendees DROP CONSTRAINT IF EXISTS event_attendees_ticket_status_check;
ALTER TABLE event_attendees ADD CONSTRAINT event_attendees_ticket_status_check
  CHECK (ticket_status IN ('reserved', 'paid', 'canceled', 'expired', 'waitlisted'));

ALTER TABLE event_attendees
  ADD COLUMN IF NOT EXISTS waitlist_position INT,
  ADD COLUMN IF NOT EXISTS waitlist_gender TEXT;

-- Index for efficient waitlist queue lookups
CREATE INDEX IF NOT EXISTS idx_event_attendees_waitlist
  ON event_attendees(event_id, waitlist_gender, waitlist_position)
  WHERE ticket_status = 'waitlisted';
