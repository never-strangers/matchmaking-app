-- Expand question_templates with default_rank for deterministic ordering
ALTER TABLE public.question_templates
  ADD COLUMN IF NOT EXISTS default_rank INT DEFAULT 0;

-- Update existing is_default rows to have ordered rank (by existing "order" col)
UPDATE public.question_templates
SET default_rank = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "order" ASC, created_at ASC) AS rn
  FROM public.question_templates
  WHERE is_default = true
) sub
WHERE question_templates.id = sub.id;

CREATE INDEX IF NOT EXISTS idx_question_templates_default
  ON public.question_templates(is_default, default_rank)
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_question_templates_tags
  ON public.question_templates USING GIN(tags);
