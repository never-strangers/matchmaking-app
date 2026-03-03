-- Add payment_status values for free events: 'free' and 'not_required'
-- Run after 016 (stripe), 019 (checkin)

ALTER TABLE event_attendees DROP CONSTRAINT IF EXISTS event_attendees_payment_status_check;
ALTER TABLE event_attendees ADD CONSTRAINT event_attendees_payment_status_check
  CHECK (payment_status IN ('unpaid', 'checkout_created', 'paid', 'canceled', 'refunded', 'free', 'not_required'));
