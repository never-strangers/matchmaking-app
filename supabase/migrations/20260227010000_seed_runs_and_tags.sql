-- Seed runs tracking for test/demo data
-- Creates public.seed_runs and seed_run_id tags on core tables used by seeding.
-- Safe to run multiple times (IF NOT EXISTS everywhere).

-----------------------------
-- 1. seed_runs table
-----------------------------
CREATE TABLE IF NOT EXISTS public.seed_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional index to quickly find by label
CREATE INDEX IF NOT EXISTS idx_seed_runs_label ON public.seed_runs(label);

-----------------------------
-- 2. Taggable tables: add seed_run_id
-----------------------------
-- NOTE:
--  - We only add a simple nullable UUID column that points back to seed_runs.id.
--  - Existing rows are left NULL and untouched.
--  - RLS / business logic are unchanged; seed_run_id is used only for tooling/cleanup.

-- profiles: demo + Supabase-auth backed profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seed_run_id UUID REFERENCES public.seed_runs(id);

-- invited_users: optional, but useful when seeding invite-based auth users
ALTER TABLE public.invited_users
  ADD COLUMN IF NOT EXISTS seed_run_id UUID REFERENCES public.seed_runs(id);

-- events: core event objects
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS seed_run_id UUID REFERENCES public.seed_runs(id);

-- event_attendees: per-event participation + payment/check-in state
ALTER TABLE public.event_attendees
  ADD COLUMN IF NOT EXISTS seed_run_id UUID REFERENCES public.seed_runs(id);

-- answers: per-question responses for an event
ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS seed_run_id UUID REFERENCES public.seed_runs(id);

