-- Security Advisor fixes
-- 1. Fix SECURITY DEFINER view: active_events
-- 2. Enable RLS on all public tables that were missing it

-----------------------------
-- 1. Recreate active_events with SECURITY INVOKER
-----------------------------
-- Drop and recreate with security_invoker so the view runs as the calling role,
-- not as the view owner. This respects RLS on the underlying events table.
DROP VIEW IF EXISTS public.active_events;
CREATE VIEW public.active_events
  WITH (security_invoker = true)
AS
  SELECT * FROM public.events WHERE deleted_at IS NULL;

COMMENT ON VIEW public.active_events IS
  'Active (non-deleted) events. SECURITY INVOKER so caller RLS applies.';

-----------------------------
-- 2. Enable RLS on tables that were missing it
-----------------------------

-- match_rounds: admin-managed, users read own event rounds
ALTER TABLE public.match_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage match_rounds"
  ON public.match_rounds
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (auth.uid())::text
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users read match_rounds for their events"
  ON public.match_rounds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_attendees ea
      WHERE ea.event_id = match_rounds.event_id
        AND ea.profile_id = (auth.uid())::text
    )
  );

-- seed_runs: internal tooling table, only admins
ALTER TABLE public.seed_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins only - seed_runs"
  ON public.seed_runs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (auth.uid())::text
        AND profiles.role = 'admin'
    )
  );

-- question_templates: admins write, authenticated users read
ALTER TABLE public.question_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage question_templates"
  ON public.question_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (auth.uid())::text
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users read question_templates"
  ON public.question_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- email_log: admins only
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins only - email_log"
  ON public.email_log
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (auth.uid())::text
        AND profiles.role = 'admin'
    )
  );

-- event_questions: admins write, attendees read their event's questions
ALTER TABLE public.event_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage event_questions"
  ON public.event_questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (auth.uid())::text
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Attendees read event_questions for their events"
  ON public.event_questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_attendees ea
      WHERE ea.event_id = event_questions.event_id
        AND ea.profile_id = (auth.uid())::text
    )
  );

-- wp_users_backup: admins only (raw WP import data)
ALTER TABLE public.wp_users_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins only - wp_users_backup"
  ON public.wp_users_backup
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (auth.uid())::text
        AND profiles.role = 'admin'
    )
  );

-----------------------------
-- 3. Views v_event_1_id / v_event_2_id
-- These are views, not tables — RLS cannot be enabled on views directly.
-- The "RLS Disabled" linter warning for views is resolved by recreating them
-- with security_invoker=true so underlying table RLS applies.
-----------------------------
-- Recreate with security_invoker (structure preserved from existing definition)
DO $$
DECLARE
  v1_def text;
  v2_def text;
BEGIN
  SELECT definition INTO v1_def FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_event_1_id';
  SELECT definition INTO v2_def FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_event_2_id';

  IF v1_def IS NOT NULL THEN
    EXECUTE 'DROP VIEW IF EXISTS public.v_event_1_id';
    EXECUTE 'CREATE VIEW public.v_event_1_id WITH (security_invoker = true) AS ' || v1_def;
  END IF;

  IF v2_def IS NOT NULL THEN
    EXECUTE 'DROP VIEW IF EXISTS public.v_event_2_id';
    EXECUTE 'CREATE VIEW public.v_event_2_id WITH (security_invoker = true) AS ' || v2_def;
  END IF;
END $$;
