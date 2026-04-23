-- Batch 1/2: only approved profiles whose email exists in public."wp-users" (WP export).
-- If that table does not exist yet, keep previous behavior (all eligible approved users).
-- Native signups without a WP row are excluded when "wp-users" is present.

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
    AND (
      NOT EXISTS (
        SELECT 1
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
          AND t.table_name = 'wp-users'
      )
      OR EXISTS (
        SELECT 1
        FROM public."wp-users" w
        WHERE w.user_email IS NOT NULL
          AND btrim(w.user_email::text) <> ''
          AND lower(btrim(w.user_email::text)) = lower(btrim(p.email::text))
      )
    )
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
  'Approved users for password-reset batches: optional filter to emails present in public."wp-users" when that table exists.';

REVOKE ALL ON FUNCTION public.list_approved_password_reset_batch(int, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_approved_password_reset_batch(int, timestamptz) TO service_role;
