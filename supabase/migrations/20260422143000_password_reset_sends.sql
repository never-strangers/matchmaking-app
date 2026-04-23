-- Track password-reset batch sends (WP → Supabase migration tooling).
-- At most one successful send per profile (partial unique when status = 'sent').

CREATE TABLE IF NOT EXISTS public.password_reset_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id text NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  email text NOT NULL,
  batch_label text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  provider text NOT NULL,
  provider_message_id text NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  error text NULL
);

CREATE INDEX IF NOT EXISTS password_reset_sends_sent_at_idx
  ON public.password_reset_sends (sent_at DESC);

CREATE INDEX IF NOT EXISTS password_reset_sends_batch_label_idx
  ON public.password_reset_sends (batch_label);

CREATE INDEX IF NOT EXISTS password_reset_sends_profile_id_idx
  ON public.password_reset_sends (profile_id);

-- Prevent duplicate successful sends per profile; allow multiple failed rows for retries.
CREATE UNIQUE INDEX IF NOT EXISTS password_reset_sends_profile_sent_unique
  ON public.password_reset_sends (profile_id)
  WHERE status = 'sent';

ALTER TABLE public.password_reset_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read password_reset_sends"
  ON public.password_reset_sends
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins insert password_reset_sends"
  ON public.password_reset_sends
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Service role bypasses RLS; CLI/scripts use service role.

COMMENT ON TABLE public.password_reset_sends IS
  'Audit log for batched password-reset emails after migration.';

-- Newest-first approved users not yet successfully sent; cursor = registered_at upper bound (exclusive).
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

REVOKE ALL ON FUNCTION public.list_approved_password_reset_batch(int, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_approved_password_reset_batch(int, timestamptz) TO service_role;

-- Minimum registered_at among batch1 successful sends (for batch2 auto-cursor).
CREATE OR REPLACE FUNCTION public.min_registered_at_batch1_password_resets()
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT MIN(COALESCE(p.wp_registered_at, p.created_at))
  FROM public.password_reset_sends prs
  INNER JOIN public.profiles p ON p.id = prs.profile_id
  WHERE prs.batch_label = 'batch1'
    AND prs.status = 'sent';
$$;

REVOKE ALL ON FUNCTION public.min_registered_at_batch1_password_resets() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.min_registered_at_batch1_password_resets() TO service_role;
