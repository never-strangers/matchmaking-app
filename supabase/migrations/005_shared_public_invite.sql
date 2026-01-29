-- One shared invite link for everyone (same URL, no per-user tokens required)
-- Safe to run multiple times.

INSERT INTO invited_users (id, phone_e164, display_name, role, invite_token, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000099',
  '+6500000000',
  'Event Guest',
  'user',
  'public',
  true
)
ON CONFLICT (invite_token) DO NOTHING;
