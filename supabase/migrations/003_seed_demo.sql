-- Seed data for a single live demo event and invited users
-- Safe to run multiple times: uses fixed IDs/tokens with ON CONFLICT DO NOTHING.

-----------------------------
-- Demo event
-----------------------------
INSERT INTO events (id, title, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Never Strangers Live Demo',
  'live'
)
ON CONFLICT (id) DO NOTHING;

-----------------------------
-- Demo profiles + attendees + answers (3 users)
-----------------------------

-- Create three simple profiles if they don't exist yet
INSERT INTO profiles (id, name, email, city, city_locked, questionnaire_answers, status, email_verified, role, created_at)
VALUES
  ('demo_profile_1', 'Demo Guest 1', 'demo1@example.com', 'Singapore', false, '{}'::jsonb, 'approved', true, 'user', NOW()),
  ('demo_profile_2', 'Demo Guest 2', 'demo2@example.com', 'Singapore', false, '{}'::jsonb, 'approved', true, 'user', NOW()),
  ('demo_profile_3', 'Demo Guest 3', 'demo3@example.com', 'Singapore', false, '{}'::jsonb, 'approved', true, 'user', NOW())
ON CONFLICT (id) DO NOTHING;

-- Ensure they are attendees of the demo event
INSERT INTO event_attendees (event_id, profile_id, joined_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'demo_profile_1', NOW()),
  ('00000000-0000-0000-0000-000000000001', 'demo_profile_2', NOW()),
  ('00000000-0000-0000-0000-000000000001', 'demo_profile_3', NOW())
ON CONFLICT (event_id, profile_id) DO NOTHING;

-- Seed answers for these three profiles across the event's questions with varied patterns
WITH qs AS (
  SELECT id, order_index
  FROM questions
  WHERE event_id = '00000000-0000-0000-0000-000000000001'
  ORDER BY order_index
),
existing AS (
  SELECT event_id, question_id, profile_id
  FROM answers
  WHERE event_id = '00000000-0000-0000-0000-000000000001'
    AND profile_id IN ('demo_profile_1', 'demo_profile_2', 'demo_profile_3')
)
INSERT INTO answers (event_id, question_id, profile_id, answer, updated_at)
SELECT
  '00000000-0000-0000-0000-000000000001' AS event_id,
  qs.id AS question_id,
  p.profile_id,
  CASE p.profile_id
    WHEN 'demo_profile_1' THEN jsonb_build_object('value', ((qs.order_index % 4) + 1))  -- 1,2,3,4 pattern
    WHEN 'demo_profile_2' THEN jsonb_build_object('value', (((qs.order_index + 1) % 4) + 1)) -- shifted
    ELSE jsonb_build_object('value', (((qs.order_index + 2) % 4) + 1))
  END AS answer,
  NOW() AS updated_at
FROM qs
CROSS JOIN (
  VALUES ('demo_profile_1'), ('demo_profile_2'), ('demo_profile_3')
) AS p(profile_id)
LEFT JOIN existing e
  ON e.event_id = '00000000-0000-0000-0000-000000000001'
 AND e.question_id = qs.id
 AND e.profile_id = p.profile_id
WHERE e.event_id IS NULL;


-----------------------------
-- Demo questions (10 scale questions)
-----------------------------
WITH event_row AS (
  SELECT id FROM events WHERE id = '00000000-0000-0000-0000-000000000001'
)
INSERT INTO questions (event_id, prompt, type, options, weight, order_index)
SELECT
  event_row.id,
  q.prompt,
  'scale',
  q.options,
  q.weight,
  q.order_index
FROM event_row,
LATERAL (
  VALUES
    ('I enjoy large social gatherings and parties', NULL::jsonb, 2::numeric, 1),
    ('I prefer deep one-on-one conversations over group settings', NULL::jsonb, 2::numeric, 2),
    ('I value work-life balance and prioritize personal time', NULL::jsonb, 1::numeric, 3),
    ('I enjoy trying new restaurants and cuisines regularly', NULL::jsonb, 1::numeric, 4),
    ('I prefer staying in over going out on weekends', NULL::jsonb, 1::numeric, 5),
    ('I am comfortable initiating conversations with strangers', NULL::jsonb, 2::numeric, 6),
    ('I value quality friendships over having many acquaintances', NULL::jsonb, 2::numeric, 7),
    ('I prioritize personal growth and self-improvement', NULL::jsonb, 2::numeric, 8),
    ('I value experiences over material possessions', NULL::jsonb, 2::numeric, 9),
    ('I appreciate direct and straightforward communication', NULL::jsonb, 2::numeric, 10)
) AS q(prompt, options, weight, order_index)
ON CONFLICT DO NOTHING;

-----------------------------
-- Demo invited users (30 guests + 1 admin)
-----------------------------
-- Phone numbers are +65 8100 0001 .. +65 8100 0030, admin is +65 8199 9999

INSERT INTO invited_users (id, phone_e164, display_name, role, invite_token)
VALUES
  ('00000000-0000-0000-0000-000000001001', '+6581000001', 'Guest 1', 'user', 'demo_invite_token_000000000000000000000000000001'),
  ('00000000-0000-0000-0000-000000001002', '+6581000002', 'Guest 2', 'user', 'demo_invite_token_000000000000000000000000000002'),
  ('00000000-0000-0000-0000-000000001003', '+6581000003', 'Guest 3', 'user', 'demo_invite_token_000000000000000000000000000003'),
  ('00000000-0000-0000-0000-000000001004', '+6581000004', 'Guest 4', 'user', 'demo_invite_token_000000000000000000000000000004'),
  ('00000000-0000-0000-0000-000000001005', '+6581000005', 'Guest 5', 'user', 'demo_invite_token_000000000000000000000000000005'),
  ('00000000-0000-0000-0000-000000001006', '+6581000006', 'Guest 6', 'user', 'demo_invite_token_000000000000000000000000000006'),
  ('00000000-0000-0000-0000-000000001007', '+6581000007', 'Guest 7', 'user', 'demo_invite_token_000000000000000000000000000007'),
  ('00000000-0000-0000-0000-000000001008', '+6581000008', 'Guest 8', 'user', 'demo_invite_token_000000000000000000000000000008'),
  ('00000000-0000-0000-0000-000000001009', '+6581000009', 'Guest 9', 'user', 'demo_invite_token_000000000000000000000000000009'),
  ('00000000-0000-0000-0000-000000001010', '+6581000010', 'Guest 10', 'user', 'demo_invite_token_000000000000000000000000000010'),
  ('00000000-0000-0000-0000-000000001011', '+6581000011', 'Guest 11', 'user', 'demo_invite_token_000000000000000000000000000011'),
  ('00000000-0000-0000-0000-000000001012', '+6581000012', 'Guest 12', 'user', 'demo_invite_token_000000000000000000000000000012'),
  ('00000000-0000-0000-0000-000000001013', '+6581000013', 'Guest 13', 'user', 'demo_invite_token_000000000000000000000000000013'),
  ('00000000-0000-0000-0000-000000001014', '+6581000014', 'Guest 14', 'user', 'demo_invite_token_000000000000000000000000000014'),
  ('00000000-0000-0000-0000-000000001015', '+6581000015', 'Guest 15', 'user', 'demo_invite_token_000000000000000000000000000015'),
  ('00000000-0000-0000-0000-000000001016', '+6581000016', 'Guest 16', 'user', 'demo_invite_token_000000000000000000000000000016'),
  ('00000000-0000-0000-0000-000000001017', '+6581000017', 'Guest 17', 'user', 'demo_invite_token_000000000000000000000000000017'),
  ('00000000-0000-0000-0000-000000001018', '+6581000018', 'Guest 18', 'user', 'demo_invite_token_000000000000000000000000000018'),
  ('00000000-0000-0000-0000-000000001019', '+6581000019', 'Guest 19', 'user', 'demo_invite_token_000000000000000000000000000019'),
  ('00000000-0000-0000-0000-000000001020', '+6581000020', 'Guest 20', 'user', 'demo_invite_token_000000000000000000000000000020'),
  ('00000000-0000-0000-0000-000000001021', '+6581000021', 'Guest 21', 'user', 'demo_invite_token_000000000000000000000000000021'),
  ('00000000-0000-0000-0000-000000001022', '+6581000022', 'Guest 22', 'user', 'demo_invite_token_000000000000000000000000000022'),
  ('00000000-0000-0000-0000-000000001023', '+6581000023', 'Guest 23', 'user', 'demo_invite_token_000000000000000000000000000023'),
  ('00000000-0000-0000-0000-000000001024', '+6581000024', 'Guest 24', 'user', 'demo_invite_token_000000000000000000000000000024'),
  ('00000000-0000-0000-0000-000000001025', '+6581000025', 'Guest 25', 'user', 'demo_invite_token_000000000000000000000000000025'),
  ('00000000-0000-0000-0000-000000001026', '+6581000026', 'Guest 26', 'user', 'demo_invite_token_000000000000000000000000000026'),
  ('00000000-0000-0000-0000-000000001027', '+6581000027', 'Guest 27', 'user', 'demo_invite_token_000000000000000000000000000027'),
  ('00000000-0000-0000-0000-000000001028', '+6581000028', 'Guest 28', 'user', 'demo_invite_token_000000000000000000000000000028'),
  ('00000000-0000-0000-0000-000000001029', '+6581000029', 'Guest 29', 'user', 'demo_invite_token_000000000000000000000000000029'),
  ('00000000-0000-0000-0000-000000001030', '+6581000030', 'Guest 30', 'user', 'demo_invite_token_000000000000000000000000000030'),
  ('00000000-0000-0000-0000-000000002000', '+6581999999', 'Demo Admin', 'admin', 'demo_invite_token_admin_ffffffffffffffffffffffffffffff')
ON CONFLICT (id) DO NOTHING;

