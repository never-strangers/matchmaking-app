-- Optional guard for idempotent CSV imports into public."wp-users".
-- Skips rows when lower(email) already exists; fails if duplicate emails are already in the table.
-- If this errors, dedupe public."wp-users" on lower(btrim(user_email)) first, then re-run.

CREATE UNIQUE INDEX IF NOT EXISTS wp_users_user_email_lower_unique
  ON public."wp-users" (lower(btrim(user_email::text)))
  WHERE user_email IS NOT NULL AND btrim(user_email::text) <> '';
