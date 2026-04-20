-- Fix "Function Search Path Mutable" warnings for all 5 flagged functions.
-- Adds SET search_path = public to prevent search_path hijacking.

-----------------------------
-- 1. public.is_approved
-----------------------------
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (auth.uid())::text
    AND p.status = 'approved'
  );
$$;

-----------------------------
-- 2. public.is_admin
-----------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = (auth.uid())::text
  );
$$;

-----------------------------
-- 3. public.profiles_block_status_change (trigger function)
-----------------------------
CREATE OR REPLACE FUNCTION public.profiles_block_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF current_setting('app.bypass_status_check', true) = '1' OR public.is_admin() THEN
      NULL; -- allow
    ELSE
      RAISE EXCEPTION 'Only admins can change profile status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-----------------------------
-- 4. public.profiles_updated_at (trigger function)
-----------------------------
CREATE OR REPLACE FUNCTION public.profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-----------------------------
-- 5. analytics.get_join_reason_segments
-- Definition not in local migrations — alter in place using full signature from catalog.
-----------------------------
DO $$
DECLARE
  fn_signature text;
BEGIN
  SELECT 'analytics.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
    INTO fn_signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'analytics' AND p.proname = 'get_join_reason_segments'
    LIMIT 1;

  IF fn_signature IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION ' || fn_signature || ' SET search_path = analytics, public';
  END IF;
END $$;
