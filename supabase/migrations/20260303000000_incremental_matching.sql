-- Incremental matching: last_computed_round, optional computed timestamps, unique pair per event.
-- Run after 20260227100000_match_rounds.sql

-----------------------------
-- 1. match_rounds: add last_computed_round and per-round computed timestamps
-----------------------------
ALTER TABLE match_rounds
  ADD COLUMN IF NOT EXISTS last_computed_round INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round1_computed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS round2_computed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS round3_computed_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN match_rounds.last_computed_round IS 'Highest round (1-3) for which match_results have been computed. Incremental run computes last_computed_round + 1 only.';

-----------------------------
-- 2. match_results: unique pair per event (any round) to prevent rematching
--    Normalize (a,b) so (A,B) and (B,A) count as the same pair.
-----------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_results_event_pair_uniq
  ON match_results (event_id, LEAST(a_profile_id, b_profile_id), GREATEST(a_profile_id, b_profile_id));

COMMENT ON INDEX idx_match_results_event_pair_uniq IS 'One pair per event across all rounds; prevents same pair in multiple rounds.';
