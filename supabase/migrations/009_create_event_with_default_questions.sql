-- Create Event with Default Questions
-- 1. Create question_templates table
-- 2. Add optional columns to events (description, start_at, end_at, location)
-- 3. Seed question_templates from the 20 Unfiltered Farewell questions
-- 4. Create RPC: create_event_with_default_questions

-----------------------------
-- 1. question_templates
-----------------------------
CREATE TABLE IF NOT EXISTS public.question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'scale',
  options JSONB,
  weight NUMERIC DEFAULT 1,
  "order" INT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_templates_default ON question_templates(is_default) WHERE is_default = true;

-----------------------------
-- 2. Add optional columns to events
-----------------------------
ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS location TEXT;
-- Ensure status default is draft for new events (per requirements)
-- Schema already has status; we use 'draft' as default in RPC

-----------------------------
-- 3. Seed question_templates (20 default questions)
-----------------------------
-- Use a single INSERT that only runs when table is empty (idempotent)
INSERT INTO question_templates (prompt, type, options, weight, "order")
SELECT * FROM (VALUES
  ('I enjoy socialising with colleagues outside of work.', 'scale', NULL::jsonb, 2::numeric, 1),
  ('Work culture in Singapore often blurs personal identity with career success.', 'scale', NULL::jsonb, 2::numeric, 2),
  ('Music and nightlife help me disconnect from work stress.', 'scale', NULL::jsonb, 2::numeric, 3),
  ('I prefer social events where "no work talk" is encouraged.', 'scale', NULL::jsonb, 2::numeric, 4),
  ('I feel pressure in Singapore to keep up professionally or financially.', 'scale', NULL::jsonb, 2::numeric, 5),
  ('I''m comfortable meeting new people through parties or nightlife events.', 'scale', NULL::jsonb, 2::numeric, 6),
  ('I value experiences (music, memories, vibes) more than status or titles.', 'scale', NULL::jsonb, 2::numeric, 7),
  ('I enjoy themed events (e.g. throwbacks, Y2K, nostalgia) more than generic clubbing.', 'scale', NULL::jsonb, 2::numeric, 8),
  ('I feel more myself in social settings than in professional ones.', 'scale', NULL::jsonb, 2::numeric, 9),
  ('I would trade some career growth for better balance and freedom in life.', 'scale', NULL::jsonb, 2::numeric, 10),
  ('I feel closer to people after spending time together in person.', 'scale', NULL::jsonb, 2::numeric, 11),
  ('I prefer a small circle of close connections over many casual ones.', 'scale', NULL::jsonb, 2::numeric, 12),
  ('Shared experiences are more important to me than constant online communication.', 'scale', NULL::jsonb, 2::numeric, 13),
  ('Emotional safety matters more to me than instant chemistry.', 'scale', NULL::jsonb, 2::numeric, 14),
  ('I enjoy deep conversations more than surface-level small talk.', 'scale', NULL::jsonb, 2::numeric, 15),
  ('Consistency is important to me in relationships.', 'scale', NULL::jsonb, 2::numeric, 16),
  ('I feel comfortable being myself around people I trust.', 'scale', NULL::jsonb, 2::numeric, 17),
  ('I value people who show up and keep their word.', 'scale', NULL::jsonb, 2::numeric, 18),
  ('I''m open to building meaningful connections, not just having fun.', 'scale', NULL::jsonb, 2::numeric, 19),
  ('I believe strong relationships are built over time, not instantly.', 'scale', NULL::jsonb, 2::numeric, 20)
) AS t(prompt, type, options, weight, "order")
WHERE NOT EXISTS (SELECT 1 FROM question_templates LIMIT 1);

-----------------------------
-- 4. RPC: create_event_with_default_questions
-----------------------------
CREATE OR REPLACE FUNCTION public.create_event_with_default_questions(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_start_at TIMESTAMPTZ DEFAULT NULL,
  p_city TEXT DEFAULT NULL
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
  -- Insert event
  INSERT INTO events (title, description, start_at, city, status)
  VALUES (
    NULLIF(TRIM(p_name), ''),
    p_description,
    p_start_at,
    p_city,
    'draft'
  )
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create event';
  END IF;

  -- Copy default templates into questions
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
