-- Admin Users / Pending Verification
-- Run after 001, 002, 011, 014
--
-- 1) admins table (Option B): profile_id references profiles
-- 2) is_admin() function for RLS
-- 3) Admin RLS policies on profiles (select/update all)
-- 4) RPC admin_set_profile_status
-- 5) Index on profiles.status for filtering

-- 1) Create admins table
-- profile_id = profiles.id (TEXT). No auth.users in this app; admins are identified by profile.
CREATE TABLE IF NOT EXISTS public.admins (
  profile_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admins_profile ON public.admins(profile_id);

-- 2) is_admin() function for RLS
-- Uses auth.uid() when Supabase Auth is active. With session-based auth + service role, RLS is bypassed.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = (auth.uid())::text
  );
$$;

-- 3) Admin RLS policies on profiles
-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT
  USING (public.is_admin());

-- Admins can update any profile (status changes, etc.)
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4) RPC admin_set_profile_status
-- SECURITY DEFINER: runs with definer privileges. Validates status and updates.
-- When called via service role (API), auth.uid() may be null; API route enforces admin.
-- When called via anon+auth, is_admin() would apply.
CREATE OR REPLACE FUNCTION public.admin_set_profile_status(
  p_profile_id TEXT,
  p_new_status TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.profiles;
BEGIN
  -- Validate status
  IF p_new_status NOT IN ('approved', 'rejected', 'pending_verification') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;

  -- Optional: enforce admin check when auth.uid() is set (e.g. Supabase Auth)
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change profile status';
  END IF;

  -- Bypass trigger so we can update status (API enforces admin via session)
  PERFORM set_config('app.bypass_status_check', '1', true);

  UPDATE public.profiles
  SET status = p_new_status, updated_at = now()
  WHERE id = p_profile_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Profile not found: %', p_profile_id;
  END IF;

  RETURN v_row;
END;
$$;

-- 5) Prevent non-admins from changing status (users can update own profile but not status)
-- RPC admin_set_profile_status sets app.bypass_status_check to bypass this
CREATE OR REPLACE FUNCTION public.profiles_block_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS profiles_block_status_change_trigger ON public.profiles;
CREATE TRIGGER profiles_block_status_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_block_status_change();

-- 6) Index on profiles.status (may already exist from 001)
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- 7) Backfill admins from profiles where invited_user has role admin
INSERT INTO public.admins (profile_id)
SELECT p.id
FROM public.profiles p
JOIN public.invited_users iu ON iu.id = p.invited_user_id
WHERE iu.role = 'admin'
ON CONFLICT (profile_id) DO NOTHING;
