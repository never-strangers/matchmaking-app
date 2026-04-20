-- WP users backup table
CREATE TABLE IF NOT EXISTS public.wp_users_backup (
  id bigserial PRIMARY KEY,
  first_name text,
  last_name text,
  user_email text,
  account_status text,
  country text,
  gender text,
  attracted text,
  looking text,
  birth_date text,
  imported_at timestamptz DEFAULT now()
);
