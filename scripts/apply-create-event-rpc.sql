-- Run this in Supabase SQL Editor if create_event_with_default_questions RPC is missing.
-- Apply migration 009 first, or run this to create just the function (requires question_templates to exist).

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
