-- Match reveals (one-by-one reveal state per attendee) and admin check-in gating
-- Run after 018

-----------------------------
-- 1. match_results: add id for FK from match_reveals
-----------------------------
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
UPDATE match_results SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE match_results ALTER COLUMN id SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_results_id ON match_results(id);

-----------------------------
-- 2. match_reveals: per-viewer, per-match reveal state
-----------------------------
CREATE TABLE IF NOT EXISTS public.match_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  viewer_user_id TEXT NOT NULL,
  match_result_id UUID NOT NULL REFERENCES match_results(id) ON DELETE CASCADE,
  revealed_at TIMESTAMPTZ,
  reveal_order INT NOT NULL,
  UNIQUE (viewer_user_id, match_result_id)
);

CREATE INDEX IF NOT EXISTS idx_match_reveals_viewer_event_order
  ON match_reveals(viewer_user_id, event_id, reveal_order);

CREATE INDEX IF NOT EXISTS idx_match_reveals_event ON match_reveals(event_id);

-- RLS: users can only read/update their own reveal rows (viewer_user_id = auth.uid()::text)
ALTER TABLE match_reveals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own match_reveals" ON match_reveals;
CREATE POLICY "Users can read own match_reveals" ON match_reveals
  FOR SELECT
  USING (
    public.is_approved()
    AND (viewer_user_id = (auth.uid())::text)
  );

DROP POLICY IF EXISTS "Users can update own match_reveals revealed_at" ON match_reveals;
CREATE POLICY "Users can update own match_reveals revealed_at" ON match_reveals
  FOR UPDATE
  USING (viewer_user_id = (auth.uid())::text)
  WITH CHECK (viewer_user_id = (auth.uid())::text);

-- Insert into match_reveals is done by service role when admin runs matching (no policy = no client insert)

-----------------------------
-- 3. event_attendees: check-in fields for admin gating
-----------------------------
ALTER TABLE event_attendees
  ADD COLUMN IF NOT EXISTS checked_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID;

CREATE INDEX IF NOT EXISTS idx_event_attendees_event_checked_in
  ON event_attendees(event_id, checked_in);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event_payment_checked_in
  ON event_attendees(event_id, payment_status, checked_in)
  WHERE payment_status = 'paid';

-- Allow admins to update check-in fields via service role. Client updates to checked_in* blocked for non-admins
-- by not granting UPDATE for authenticated on these columns; we use API with service role for check-in toggle.
-- Extend event_attendees_allow_update to allow checked_in* only when not from regular auth (service role / admin API).
CREATE OR REPLACE FUNCTION public.event_attendees_allow_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status
     OR OLD.stripe_checkout_session_id IS DISTINCT FROM NEW.stripe_checkout_session_id
     OR OLD.stripe_payment_intent_id IS DISTINCT FROM NEW.stripe_payment_intent_id
     OR OLD.paid_at IS DISTINCT FROM NEW.paid_at
  THEN
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot update payment fields directly; use checkout and webhook';
    END IF;
  END IF;
  IF OLD.ticket_type_id IS DISTINCT FROM NEW.ticket_type_id
     OR OLD.ticket_status IS DISTINCT FROM NEW.ticket_status
     OR (OLD.reserved_at IS DISTINCT FROM NEW.reserved_at AND (NEW.ticket_type_id IS NOT NULL OR NEW.ticket_status IN ('reserved','paid')))
  THEN
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot update ticket fields directly; use reserve_ticket or release_ticket';
    END IF;
  END IF;
  -- Check-in fields: only allow when caller is admin (we use is_admin() which checks public.admins or JWT)
  IF OLD.checked_in IS DISTINCT FROM NEW.checked_in
     OR OLD.checked_in_at IS DISTINCT FROM NEW.checked_in_at
     OR OLD.checked_in_by IS DISTINCT FROM NEW.checked_in_by
  THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only admins can update check-in status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
