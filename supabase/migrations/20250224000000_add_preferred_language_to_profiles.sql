-- Add preferred_language to public.profiles for event & communications language.
-- Safe to run if column already exists (no-op in that case).
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_language text;

COMMENT ON COLUMN public.profiles.preferred_language IS 'Preferred language for events and communications (e.g. en, th, vi).';
