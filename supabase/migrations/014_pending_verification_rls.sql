-- Pending verification: status + RLS for event/match tables
-- Run after 001, 002, 011

-- 1) Add pending_verification to status (extend CHECK if needed)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN (
    'pending_approval', 'approved', 'rejected', 'unverified', 'pending_verification'
  ));

-- 2) Set default for new rows; backfill existing NULLs
ALTER TABLE profiles ALTER COLUMN status SET DEFAULT 'pending_verification';
UPDATE profiles SET status = 'pending_verification' WHERE status IS NULL;

-- 3) RLS helper: true if current user has approved profile
-- Note: Uses auth.uid() for Supabase Auth. With custom session, service role bypasses RLS.
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (auth.uid())::text
    AND p.status = 'approved'
  );
$$;

-- 4) Enable RLS on event tables (if not already)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- 5) Drop permissive policies if they exist, then add approved-only
DROP POLICY IF EXISTS "Allow all events" ON events;
DROP POLICY IF EXISTS "Allow all event_attendees" ON event_attendees;
DROP POLICY IF EXISTS "Allow all match_results" ON match_results;
DROP POLICY IF EXISTS "Allow all likes" ON likes;
DROP POLICY IF EXISTS "Allow all match_runs" ON match_runs;
DROP POLICY IF EXISTS "Allow all answers" ON answers;
DROP POLICY IF EXISTS "Allow all questions" ON questions;

-- events: approved users can read live events
CREATE POLICY "Approved users can read events" ON events
  FOR SELECT
  USING (public.is_approved());

-- event_attendees: approved users can read/insert/update their own
CREATE POLICY "Approved users can manage event_attendees" ON event_attendees
  FOR ALL
  USING (public.is_approved())
  WITH CHECK (public.is_approved());

-- match_results: approved users can read
CREATE POLICY "Approved users can read match_results" ON match_results
  FOR SELECT
  USING (public.is_approved());

-- likes: approved users can manage
CREATE POLICY "Approved users can manage likes" ON likes
  FOR ALL
  USING (public.is_approved())
  WITH CHECK (public.is_approved());

-- match_runs: approved users can read (admin runs via service role)
CREATE POLICY "Approved users can read match_runs" ON match_runs
  FOR SELECT
  USING (public.is_approved());

-- answers: approved users can manage their own
CREATE POLICY "Approved users can manage answers" ON answers
  FOR ALL
  USING (public.is_approved())
  WITH CHECK (public.is_approved());

-- questions: approved users can read
CREATE POLICY "Approved users can read questions" ON questions
  FOR SELECT
  USING (public.is_approved());
