-- Three-round match reveal: add round to match_results and add match_rounds table.
-- Run after 20260227000000_match_reveal_queue (or 019 if queue migration not applied).

-----------------------------
-- 1. match_results: add round column (1, 2, or 3)
-----------------------------
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS round INT NOT NULL DEFAULT 1;
UPDATE match_results SET round = 1 WHERE round IS NULL OR round < 1 OR round > 3;
ALTER TABLE match_results DROP CONSTRAINT IF EXISTS chk_match_results_round;
ALTER TABLE match_results ADD CONSTRAINT chk_match_results_round CHECK (round >= 1 AND round <= 3);

CREATE INDEX IF NOT EXISTS idx_match_results_event_round ON match_results(event_id, round);

-----------------------------
-- 2. match_rounds: one row per event, tracks which rounds are revealed
-----------------------------
CREATE TABLE IF NOT EXISTS public.match_rounds (
  event_id UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  round1_revealed_at TIMESTAMPTZ NULL,
  round2_revealed_at TIMESTAMPTZ NULL,
  round3_revealed_at TIMESTAMPTZ NULL,
  last_revealed_round INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE match_rounds IS 'Tracks which of the 3 match reveal rounds have been revealed per event.';
