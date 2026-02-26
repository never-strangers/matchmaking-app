-- Event rich setup: poster, whats_included, end_at, category
-- Ticketing: event_ticket_types, event_attendees ticket fields, reserve_ticket/release_ticket RPCs, RLS
-- Run after 016 (Stripe), 014 (RLS)

-----------------------------
-- 1. events: new columns
-----------------------------
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS poster_path TEXT,
  ADD COLUMN IF NOT EXISTS whats_included TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'friends';

-- end_at already added in 009
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_category_check;
ALTER TABLE events ADD CONSTRAINT events_category_check
  CHECK (category IN ('friends', 'dating'));

-----------------------------
-- 2. event_ticket_types
-----------------------------
CREATE TABLE IF NOT EXISTS public.event_ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  price_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'sgd',
  cap INT NOT NULL,
  sold INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id, code)
);

CREATE INDEX IF NOT EXISTS idx_event_ticket_types_event ON event_ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_event_ticket_types_event_active ON event_ticket_types(event_id) WHERE is_active = true;

-----------------------------
-- 3. event_attendees: ticket fields
-----------------------------
ALTER TABLE event_attendees
  ADD COLUMN IF NOT EXISTS ticket_type_id UUID REFERENCES event_ticket_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ticket_status TEXT NOT NULL DEFAULT 'reserved',
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ DEFAULT now();

-- ticket_status: reserved | paid | canceled | expired
ALTER TABLE event_attendees DROP CONSTRAINT IF EXISTS event_attendees_ticket_status_check;
ALTER TABLE event_attendees ADD CONSTRAINT event_attendees_ticket_status_check
  CHECK (ticket_status IN ('reserved', 'paid', 'canceled', 'expired'));

CREATE INDEX IF NOT EXISTS idx_event_attendees_ticket_type ON event_attendees(ticket_type_id)
  WHERE ticket_type_id IS NOT NULL;

-- Add event_attendees.id so we can return attendee_id from reserve_ticket
-- Use a new migration step: add column id if not exists, backfill, then use in RPC.
ALTER TABLE event_attendees ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
-- Ensure unique id for existing rows
UPDATE event_attendees SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE event_attendees ALTER COLUMN id SET DEFAULT gen_random_uuid();
-- Make it primary key would require dropping existing PK; keep composite PK and add unique on id
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_attendees_id ON event_attendees(id);
-- Now RPC can return the id after upsert.

-----------------------------
-- 4. reserve_ticket RPC (race-safe)
-----------------------------
CREATE OR REPLACE FUNCTION public.reserve_ticket(
  p_event_id UUID,
  p_ticket_type_id UUID,
  p_profile_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id TEXT;
  v_attendee_id UUID;
  v_cap INT;
  v_sold INT;
  v_event_id UUID;
  v_existing RECORD;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    v_profile_id := (auth.uid())::text;
    IF p_profile_id IS NOT NULL AND p_profile_id <> v_profile_id THEN
      RAISE EXCEPTION 'Cannot reserve ticket for another user';
    END IF;
  ELSIF p_profile_id IS NOT NULL AND p_profile_id <> '' THEN
    v_profile_id := p_profile_id;
  ELSE
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT tt.cap, tt.sold, tt.event_id
    INTO v_cap, v_sold, v_event_id
    FROM event_ticket_types tt
    WHERE tt.id = p_ticket_type_id
    FOR UPDATE;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Ticket type not found';
  END IF;
  IF v_event_id <> p_event_id THEN
    RAISE EXCEPTION 'Ticket type does not belong to this event';
  END IF;
  IF v_sold >= v_cap THEN
    RAISE EXCEPTION 'Ticket type sold out';
  END IF;
  IF NOT (SELECT is_active FROM event_ticket_types WHERE id = p_ticket_type_id) THEN
    RAISE EXCEPTION 'Ticket type is not available';
  END IF;

  SELECT ea.id, ea.ticket_type_id, ea.ticket_status
    INTO v_existing
    FROM event_attendees ea
    WHERE ea.event_id = p_event_id AND ea.profile_id = v_profile_id
    FOR UPDATE;

  IF FOUND THEN
    IF v_existing.ticket_type_id IS NOT NULL AND v_existing.ticket_status IN ('reserved', 'paid') THEN
      RAISE EXCEPTION 'You already have a ticket for this event';
    END IF;
    UPDATE event_attendees
    SET ticket_type_id = p_ticket_type_id,
        ticket_status = 'reserved',
        reserved_at = now()
    WHERE event_id = p_event_id AND profile_id = v_profile_id;
    v_attendee_id := v_existing.id;
  ELSE
    INSERT INTO event_attendees (event_id, profile_id, ticket_type_id, ticket_status, reserved_at, joined_at)
    VALUES (p_event_id, v_profile_id, p_ticket_type_id, 'reserved', now(), now())
    RETURNING id INTO v_attendee_id;
  END IF;

  UPDATE event_ticket_types SET sold = sold + 1, updated_at = now() WHERE id = p_ticket_type_id;

  RETURN v_attendee_id;
END;
$$;

-----------------------------
-- 5. release_ticket RPC (optional)
-----------------------------
CREATE OR REPLACE FUNCTION public.release_ticket(p_attendee_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_type_id UUID;
  v_profile_id TEXT;
  v_event_id UUID;
  v_ticket_status TEXT;
BEGIN
  SELECT ticket_type_id, profile_id, event_id, ticket_status
  INTO v_ticket_type_id, v_profile_id, v_event_id, v_ticket_status
  FROM event_attendees
  WHERE id = p_attendee_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attendee not found';
  END IF;

  IF auth.uid() IS NOT NULL AND (auth.uid())::text <> v_profile_id THEN
    RAISE EXCEPTION 'Not your reservation';
  END IF;

  UPDATE event_attendees
  SET ticket_type_id = NULL,
      ticket_status = 'canceled',
      reserved_at = NULL
  WHERE id = p_attendee_id;

  IF v_ticket_type_id IS NOT NULL AND v_ticket_status IN ('reserved') THEN
    UPDATE event_ticket_types SET sold = GREATEST(0, sold - 1), updated_at = now() WHERE id = v_ticket_type_id;
  END IF;
END;
$$;

-----------------------------
-- 6. RLS: event_ticket_types
-----------------------------
ALTER TABLE event_ticket_types ENABLE ROW LEVEL SECURITY;

-- Approved users can read active ticket types for events they can access (events read is already gated by is_approved)
CREATE POLICY "Approved users can read active ticket types" ON event_ticket_types
  FOR SELECT
  USING (
    public.is_approved()
    AND is_active = true
    AND EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'live')
  );

-- Only admins can insert/update/delete (via service role in API). No policy = no direct client write.

-----------------------------
-- 7. event_attendees: block direct ticket_type_id / ticket_status / sold updates by client
-----------------------------
-- Extend trigger so users cannot set ticket_type_id, ticket_status, reserved_at (only RPC can)
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
  RETURN NEW;
END;
$$;

-- event_ticket_types: no direct sold updates (only RPC)
-- We don't allow client to update event_ticket_types at all except via admin (service role). So no policy for authenticated write. Done.

-- Extend create_event_with_default_questions to accept end_at, category, whats_included (optional)
CREATE OR REPLACE FUNCTION public.create_event_with_default_questions(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_start_at TIMESTAMPTZ DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_price_cents INT DEFAULT 0,
  p_payment_required BOOLEAN DEFAULT true,
  p_end_at TIMESTAMPTZ DEFAULT NULL,
  p_category TEXT DEFAULT 'friends',
  p_whats_included TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_template RECORD;
  v_category TEXT := COALESCE(NULLIF(TRIM(p_category), ''), 'friends');
BEGIN
  IF v_category NOT IN ('friends', 'dating') THEN
    v_category := 'friends';
  END IF;
  INSERT INTO events (title, description, start_at, end_at, city, status, price_cents, currency, payment_required, category, whats_included)
  VALUES (
    NULLIF(TRIM(p_name), ''),
    p_description,
    p_start_at,
    p_end_at,
    p_city,
    'live',
    COALESCE(NULLIF(p_price_cents, 0), 0),
    'sgd',
    COALESCE(p_payment_required, true),
    v_category,
    NULLIF(TRIM(p_whats_included), '')
  )
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create event';
  END IF;

  FOR v_template IN
    SELECT prompt, type, options, weight, "order"
    FROM question_templates
    WHERE is_default = true
    ORDER BY "order"
  LOOP
    INSERT INTO questions (event_id, prompt, type, options, weight, order_index)
    VALUES (v_event_id, v_template.prompt, v_template.type, v_template.options, v_template.weight, v_template."order");
  END LOOP;

  RETURN v_event_id;
END;
$$;

-- Grant execute to authenticated and anon (RPC will check auth inside)
GRANT EXECUTE ON FUNCTION public.reserve_ticket(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ticket(uuid, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.release_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_ticket(uuid) TO anon;

-----------------------------
-- 8. Storage: event-posters bucket (admin upload; public read)
-----------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'event-posters') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'event-posters',
      'event-posters',
      true,
      10485760,
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    );
  END IF;
END
$$;

-- Public read for event posters
DROP POLICY IF EXISTS "Public read event-posters" ON storage.objects;
CREATE POLICY "Public read event-posters" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'event-posters');

-- Upload/update only via service role (admin API). No INSERT/UPDATE policy for authenticated = client cannot upload; admin uses service role.
