-- Core demo schema for invite-link based matchmaking
-- Run this in Supabase SQL Editor or via supabase migrations.

-----------------------------
-- invited_users
-----------------------------
CREATE TABLE IF NOT EXISTS invited_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user', -- 'user' | 'admin'
  invite_token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invited_users_token ON invited_users(invite_token);
CREATE INDEX IF NOT EXISTS idx_invited_users_phone ON invited_users(phone_e164);

-----------------------------
-- profiles alignment
-----------------------------
-- Extend existing demo profiles table to support invited-user based login.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS invited_user_id UUID REFERENCES invited_users(id),
ADD COLUMN IF NOT EXISTS phone_e164 TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Backfill helper: copy existing phone/name into new columns when missing.
UPDATE profiles
SET
  phone_e164 = COALESCE(phone_e164, phone),
  display_name = COALESCE(display_name, name)
WHERE phone IS NOT NULL
  AND (phone_e164 IS NULL OR display_name IS NULL);

-----------------------------
-- events
-----------------------------
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'live', -- draft | live | closed
  created_at TIMESTAMPTZ DEFAULT now()
);

-----------------------------
-- event_attendees
-----------------------------
CREATE TABLE IF NOT EXISTS event_attendees (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (event_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_profile ON event_attendees(profile_id);

-----------------------------
-- questions
-----------------------------
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  prompt TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'scale',
  options JSONB,
  weight NUMERIC DEFAULT 1,
  order_index INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_event ON questions(event_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(event_id, order_index);

-----------------------------
-- answers
-----------------------------
CREATE TABLE IF NOT EXISTS answers (
  event_id UUID NOT NULL,
  question_id UUID NOT NULL,
  profile_id TEXT NOT NULL,
  answer JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (event_id, question_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_answers_event ON answers(event_id);
CREATE INDEX IF NOT EXISTS idx_answers_profile ON answers(profile_id);

-----------------------------
-- match_runs
-----------------------------
CREATE TABLE IF NOT EXISTS match_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  status TEXT DEFAULT 'running', -- running | done | failed
  created_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_match_runs_event ON match_runs(event_id);

-----------------------------
-- match_results
-----------------------------
CREATE TABLE IF NOT EXISTS match_results (
  event_id UUID NOT NULL,
  a_profile_id TEXT NOT NULL,
  b_profile_id TEXT NOT NULL,
  score NUMERIC NOT NULL,
  PRIMARY KEY (event_id, a_profile_id, b_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_match_results_event ON match_results(event_id);
CREATE INDEX IF NOT EXISTS idx_match_results_profile_a ON match_results(a_profile_id);
CREATE INDEX IF NOT EXISTS idx_match_results_profile_b ON match_results(b_profile_id);

-----------------------------
-- likes
-----------------------------
CREATE TABLE IF NOT EXISTS likes (
  event_id UUID NOT NULL,
  from_profile_id TEXT NOT NULL,
  to_profile_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (event_id, from_profile_id, to_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_event ON likes(event_id);
CREATE INDEX IF NOT EXISTS idx_likes_from ON likes(from_profile_id);
CREATE INDEX IF NOT EXISTS idx_likes_to ON likes(to_profile_id);

-----------------------------
-- Realtime configuration
-----------------------------
-- Add core tables to the supabase_realtime publication so clients can
-- subscribe to changes. This assumes the default publication exists.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime
    ADD TABLE event_attendees;

    ALTER PUBLICATION supabase_realtime
    ADD TABLE answers;

    ALTER PUBLICATION supabase_realtime
    ADD TABLE match_runs;

    ALTER PUBLICATION supabase_realtime
    ADD TABLE match_results;

    ALTER PUBLICATION supabase_realtime
    ADD TABLE likes;
  END IF;
END
$$;

