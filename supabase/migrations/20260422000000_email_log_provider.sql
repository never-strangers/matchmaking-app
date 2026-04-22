-- Add provider column to email_log to track which email provider was used
ALTER TABLE public.email_log
  ADD COLUMN IF NOT EXISTS provider text;
