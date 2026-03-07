-- question_templates: create if not exists, then add missing columns idempotently
CREATE TABLE IF NOT EXISTS public.question_templates (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt     TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add all columns idempotently so this is safe whether or not the table pre-existed
ALTER TABLE public.question_templates
  ADD COLUMN IF NOT EXISTS type       TEXT        NOT NULL DEFAULT 'scale',
  ADD COLUMN IF NOT EXISTS options    JSONB       NULL,
  ADD COLUMN IF NOT EXISTS tags       TEXT[]      NULL,
  ADD COLUMN IF NOT EXISTS weight     NUMERIC     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "order"    INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN     NOT NULL DEFAULT true;

-- event_questions: selected question snapshot per event
CREATE TABLE IF NOT EXISTS public.event_questions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  template_id UUID        REFERENCES question_templates(id),
  prompt      TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'scale',
  options     JSONB       NULL,
  weight      NUMERIC     NOT NULL DEFAULT 1,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_event_questions_event
  ON public.event_questions(event_id, sort_order);

-- Backward compat: add event_question_id to answers (nullable, old rows keep question_id)
ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS event_question_id UUID REFERENCES event_questions(id);

-- Populate question_templates from existing questions table (deduplicated by prompt)
INSERT INTO public.question_templates (prompt, type, weight, is_default, is_active, "order")
SELECT DISTINCT ON (prompt)
  prompt,
  COALESCE(type, 'scale'),
  COALESCE(weight, 1),
  true,
  true,
  COALESCE(order_index, 0)
FROM public.questions
ORDER BY prompt, order_index ASC
ON CONFLICT DO NOTHING;
