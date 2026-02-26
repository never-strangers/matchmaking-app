-- Seed 10 approved users and join them to 2 events so you can run matching from the admin UI.
-- Requirements for matching: profiles (status=approved), event_attendees (payment_status=paid, checked_in=true),
-- and answers for every event question.
--
-- Usage: Run in Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run).
--
-- Option A (default): use first two live events from the DB.
-- Option B: use specific events — in the BEGIN block below, COMMENT OUT the two "SELECT id INTO..."
--   lines and UNCOMMENT the two "v_event_1_id := ..." lines, then put your event UUIDs there.

DO $$
DECLARE
  v_event_1_id UUID;
  v_event_2_id UUID;
  v_profile_id TEXT;
  v_profiles TEXT[] := ARRAY[
    'seed_match_01', 'seed_match_02', 'seed_match_03', 'seed_match_04', 'seed_match_05',
    'seed_match_06', 'seed_match_07', 'seed_match_08', 'seed_match_09', 'seed_match_10'
  ];
  v_names TEXT[] := ARRAY[
    'Alex Chen', 'Jordan Lee', 'Sam Kim', 'Morgan Tan', 'Riley Wong',
    'Casey Ng', 'Jamie Lim', 'Quinn Koh', 'Taylor Goh', 'Eden Chua'
  ];
  v_emails TEXT[] := ARRAY[
    'seed01@example.com', 'seed02@example.com', 'seed03@example.com', 'seed04@example.com', 'seed05@example.com',
    'seed06@example.com', 'seed07@example.com', 'seed08@example.com', 'seed09@example.com', 'seed10@example.com'
  ];
  v_cities TEXT[] := ARRAY['sg', 'sg', 'hk', 'hk', 'sg', 'hk', 'sg', 'hk', 'sg', 'hk'];
  i INT;
  q RECORD;
BEGIN
  -- Resolve event IDs: use first two live events (by created_at)
  SELECT id INTO v_event_1_id FROM events WHERE status = 'live' ORDER BY created_at DESC NULLS LAST LIMIT 1 OFFSET 0;
  SELECT id INTO v_event_2_id FROM events WHERE status = 'live' ORDER BY created_at DESC NULLS LAST LIMIT 1 OFFSET 1;

  IF v_event_1_id IS NULL THEN
    RAISE EXCEPTION 'No live events found. Create at least one event first.';
  END IF;
  IF v_event_2_id IS NULL THEN
    RAISE NOTICE 'Only one live event found. Seeding users for that event only.';
    v_event_2_id := v_event_1_id; -- same event twice so we still join both "slots" - no, we only join one event then
    -- Actually: join only to v_event_1_id when there's one event; for two events join to both.
  END IF;

  -- 1) Insert 10 approved profiles
  FOR i IN 1..10 LOOP
    INSERT INTO profiles (
      id, name, email, city, city_locked, status, email_verified, role,
      display_name, created_at, updated_at, dob, instagram, reason
    )
    VALUES (
      v_profiles[i],
      v_names[i],
      v_emails[i],
      v_cities[i],
      false,
      'approved',
      true,
      'user',
      v_names[i],
      NOW(),
      NOW(),
      (DATE '1990-01-01' + (i || ' days')::interval)::date,
      'seed_insta_' || i,
      'Seed user for matching demo'
    )
    ON CONFLICT (id) DO UPDATE SET
      status = 'approved',
      display_name = EXCLUDED.display_name,
      updated_at = NOW();
  END LOOP;

  -- 2) Join all 10 to event 1: paid + checked in
  FOR i IN 1..10 LOOP
    INSERT INTO event_attendees (event_id, profile_id, joined_at, payment_status, ticket_status, checked_in, checked_in_at)
    VALUES (v_event_1_id, v_profiles[i], NOW(), 'paid', 'paid', true, NOW())
    ON CONFLICT (event_id, profile_id) DO UPDATE SET
      payment_status = 'paid',
      ticket_status = 'paid',
      checked_in = true,
      checked_in_at = NOW();
  END LOOP;

  -- Join all 10 to event 2 (if different from event 1)
  IF v_event_2_id IS DISTINCT FROM v_event_1_id THEN
    FOR i IN 1..10 LOOP
      INSERT INTO event_attendees (event_id, profile_id, joined_at, payment_status, ticket_status, checked_in, checked_in_at)
      VALUES (v_event_2_id, v_profiles[i], NOW(), 'paid', 'paid', true, NOW())
      ON CONFLICT (event_id, profile_id) DO UPDATE SET
        payment_status = 'paid',
        ticket_status = 'paid',
        checked_in = true,
        checked_in_at = NOW();
    END LOOP;
  END IF;

  -- 3) Insert answers for every event question for every profile (so matching can run)
  FOR v_profile_id IN SELECT unnest(v_profiles) LOOP
    FOR q IN (SELECT id AS question_id, order_index FROM questions WHERE event_id = v_event_1_id ORDER BY order_index) LOOP
      INSERT INTO answers (event_id, question_id, profile_id, answer, updated_at)
      VALUES (v_event_1_id, q.question_id, v_profile_id, jsonb_build_object('value', (1 + (q.order_index % 4))), NOW())
      ON CONFLICT (event_id, question_id, profile_id) DO UPDATE SET answer = EXCLUDED.answer, updated_at = NOW();
    END LOOP;

    IF v_event_2_id IS DISTINCT FROM v_event_1_id THEN
      FOR q IN (SELECT id AS question_id, order_index FROM questions WHERE event_id = v_event_2_id ORDER BY order_index) LOOP
        INSERT INTO answers (event_id, question_id, profile_id, answer, updated_at)
        VALUES (v_event_2_id, q.question_id, v_profile_id, jsonb_build_object('value', (1 + (q.order_index % 4))), NOW())
        ON CONFLICT (event_id, question_id, profile_id) DO UPDATE SET answer = EXCLUDED.answer, updated_at = NOW();
      END LOOP;
    END IF;
  END LOOP;

  RAISE NOTICE 'Done: 10 approved users created/updated and joined to 2 events (event_1=%, event_2=%). Run matching from admin UI.', v_event_1_id, v_event_2_id;
END;
$$;
