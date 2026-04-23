-- Add enabled toggle to email_template_overrides.
-- Defaults to true so all existing templates remain active.
ALTER TABLE public.email_template_overrides
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;
