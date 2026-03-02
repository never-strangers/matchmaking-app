-- Match reveal queue controlled by admin (one pair per click)
-- Depends on: events, match_results, profiles, public.is_admin()

-----------------------------
-- 1. match_reveal_queue: event-level reveal queue
-----------------------------
CREATE TABLE IF NOT EXISTS public.match_reveal_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  match_result_id UUID NOT NULL REFERENCES match_results(id) ON DELETE CASCADE,
  reveal_order INT NOT NULL,
  revealed_at TIMESTAMPTZ NULL,
  revealed_by TEXT NULL REFERENCES profiles(id),
  UNIQUE (event_id, match_result_id)
);

CREATE INDEX IF NOT EXISTS idx_match_reveal_queue_event_order
  ON match_reveal_queue(event_id, reveal_order);

CREATE INDEX IF NOT EXISTS idx_match_reveal_queue_event_revealed
  ON match_reveal_queue(event_id, revealed_at);

-----------------------------
-- 2. RLS: protect queue; only admins can mutate
-----------------------------
ALTER TABLE match_reveal_queue ENABLE ROW LEVEL SECURITY;

-- Read access:
--  - For safety we don't expose this table directly to end-users.
--  - All reads are done via service role in Next.js API routes.
DROP POLICY IF EXISTS "Public cannot select match_reveal_queue" ON match_reveal_queue;
CREATE POLICY "Public cannot select match_reveal_queue" ON match_reveal_queue
  FOR SELECT
  TO authenticated, anon
  USING (false);

-- Only admins (when not using service role) may update revealed_at/revealed_by.
DROP POLICY IF EXISTS "Admins can update match_reveal_queue" ON match_reveal_queue;
CREATE POLICY "Admins can update match_reveal_queue" ON match_reveal_queue
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-----------------------------
-- 3. Function: reveal_next_match_for_event
--    - Selects next unrevealed queue row for event
--    - Marks it revealed with admin profile id
--    - Returns match result pair + score
-----------------------------
CREATE OR REPLACE FUNCTION public.reveal_next_match_for_event(
  p_event_id UUID,
  p_admin_profile_id TEXT
)
RETURNS TABLE (
  queue_id UUID,
  match_result_id UUID,
  reveal_order INT,
  a_profile_id TEXT,
  b_profile_id TEXT,
  score NUMERIC
) AS $$
DECLARE
  v_queue_row match_reveal_queue%ROWTYPE;
  v_result_row match_results%ROWTYPE;
BEGIN
  -- Use an advisory lock scoped by event_id to avoid double reveals.
  -- hashtextextended gives us a stable BIGINT key without relying on UUID hex parsing.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_event_id::text, 0));

  SELECT *
  INTO v_queue_row
  FROM match_reveal_queue
  WHERE event_id = p_event_id
    AND revealed_at IS NULL
  ORDER BY reveal_order
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE match_reveal_queue
  SET revealed_at = now(),
      revealed_by = p_admin_profile_id
  WHERE id = v_queue_row.id;

  SELECT *
  INTO v_result_row
  FROM match_results
  WHERE id = v_queue_row.match_result_id;

  queue_id := v_queue_row.id;
  match_result_id := v_queue_row.match_result_id;
  reveal_order := v_queue_row.reveal_order;
  a_profile_id := v_result_row.a_profile_id::text;
  b_profile_id := v_result_row.b_profile_id::text;
  score := v_result_row.score;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

