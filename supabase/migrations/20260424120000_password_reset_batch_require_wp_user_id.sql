-- Batch 1/2: only WordPress-imported profiles (profiles.wp_user_id IS NOT NULL).
-- Native platform signups keep wp_user_id NULL and are excluded.

CREATE OR REPLACE FUNCTION public.list_approved_password_reset_batch(
  p_limit int,
  p_cursor timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id text,
  email text,
  registered_at timestamptz,
  name text,
  full_name text,
  display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.email,
    COALESCE(p.wp_registered_at, p.created_at) AS registered_at,
    p.name,
    p.full_name,
    p.display_name
  FROM public.profiles p
  WHERE p.status = 'approved'
    AND p.email IS NOT NULL
    AND btrim(p.email) <> ''
    AND p.wp_user_id IS NOT NULL
    AND (
      p_cursor IS NULL
      OR COALESCE(p.wp_registered_at, p.created_at) < p_cursor
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.password_reset_sends s
      WHERE s.profile_id = p.id
        AND s.status = 'sent'
    )
  ORDER BY COALESCE(p.wp_registered_at, p.created_at) DESC NULLS LAST
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.list_approved_password_reset_batch(int, timestamptz) IS
  'Approved users for batched password resets: WordPress imports only (wp_user_id set).';

REVOKE ALL ON FUNCTION public.list_approved_password_reset_batch(int, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_approved_password_reset_batch(int, timestamptz) TO service_role;
