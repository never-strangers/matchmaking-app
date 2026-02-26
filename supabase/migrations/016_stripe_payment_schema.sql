-- Stripe payment per event: events pricing, event_attendees payment fields, payment_events idempotency
-- Run after 002, 009, 014

-----------------------------
-- 1. events: pricing and payment_required
-----------------------------
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS price_cents INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'sgd',
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_required BOOLEAN NOT NULL DEFAULT true;

-----------------------------
-- 2. event_attendees: payment status and Stripe ids
-----------------------------
ALTER TABLE event_attendees
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- payment_status: unpaid | checkout_created | paid | canceled | refunded
ALTER TABLE event_attendees DROP CONSTRAINT IF EXISTS event_attendees_payment_status_check;
ALTER TABLE event_attendees ADD CONSTRAINT event_attendees_payment_status_check
  CHECK (payment_status IN ('unpaid', 'checkout_created', 'paid', 'canceled', 'refunded'));

CREATE INDEX IF NOT EXISTS idx_event_attendees_stripe_checkout_session
  ON event_attendees(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-----------------------------
-- 3. payment_events: webhook idempotency and audit
-----------------------------
CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_events_created ON payment_events(created_at);

-----------------------------
-- 4. RLS: payment_events (service role only for insert; no direct client access)
-----------------------------
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT for anon/authenticated; only service role (bypasses RLS) can insert/read
DROP POLICY IF EXISTS "Service role only payment_events" ON payment_events;
CREATE POLICY "Service role only payment_events" ON payment_events
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- event_attendees: users can read their own row (including payment_status). Updates to
-- payment_status/stripe_*/paid_at must only happen via service role (API/webhook).
-- Existing policy "Approved users can manage event_attendees" allows UPDATE; we rely on
-- the app never exposing an API that lets the client set payment_status to 'paid'.
-- Restrict UPDATE so that authenticated users cannot change payment-related columns:
CREATE OR REPLACE FUNCTION public.event_attendees_allow_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If payment-related fields changed, only allow when no JWT (e.g. service role) or role is service_role
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status
     OR OLD.stripe_checkout_session_id IS DISTINCT FROM NEW.stripe_checkout_session_id
     OR OLD.stripe_payment_intent_id IS DISTINCT FROM NEW.stripe_payment_intent_id
     OR OLD.paid_at IS DISTINCT FROM NEW.paid_at
  THEN
    -- Supabase service role requests do not send a JWT in the same way; allow if we're in a context
    -- that doesn't have auth.uid() set (e.g. service role). When using anon key, auth.uid() is set.
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot update payment fields directly; use checkout and webhook';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS event_attendees_block_payment_update ON event_attendees;
CREATE TRIGGER event_attendees_block_payment_update
  BEFORE UPDATE ON event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION public.event_attendees_allow_update();

-----------------------------
-- 5. Extend create_event_with_default_questions for price (optional params)
-----------------------------
CREATE OR REPLACE FUNCTION public.create_event_with_default_questions(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_start_at TIMESTAMPTZ DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_price_cents INT DEFAULT 0,
  p_payment_required BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_template RECORD;
BEGIN
  INSERT INTO events (title, description, start_at, city, status, price_cents, currency, payment_required)
  VALUES (
    NULLIF(TRIM(p_name), ''),
    p_description,
    p_start_at,
    p_city,
    'live',
    COALESCE(NULLIF(p_price_cents, 0), 0),
    'sgd',
    COALESCE(p_payment_required, true)
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
