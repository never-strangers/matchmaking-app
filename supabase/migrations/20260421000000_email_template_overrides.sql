-- Email template overrides: allows admins to edit subject + body HTML
-- without a code deploy. Falls back to code defaults if no row exists.

CREATE TABLE IF NOT EXISTS email_template_overrides (
  key          text PRIMARY KEY,
  subject      text NOT NULL,
  body_html    text NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   text REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE email_template_overrides ENABLE ROW LEVEL SECURITY;

-- Only admins can read or write
CREATE POLICY "admin_all" ON email_template_overrides
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (auth.uid())::text
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (auth.uid())::text
        AND profiles.role = 'admin'
    )
  );
