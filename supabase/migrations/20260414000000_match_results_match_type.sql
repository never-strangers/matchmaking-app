-- Add match_type column to match_results to distinguish date vs friend-fallback pairs.
-- Existing rows default to 'date' (the historical behaviour for Dating events).
ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS match_type text NOT NULL DEFAULT 'date'
  CONSTRAINT match_results_match_type_check CHECK (match_type IN ('date', 'friend'));
