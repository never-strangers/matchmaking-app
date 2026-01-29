-- Replace demo event questions with Unfiltered/SG + Dunbar-style bonding set (20 questions).
-- A. Unfiltered / SG Company & Nightlife Culture (Q1–Q10)
-- B. Dunbar-Style Bonding + Gen Z Dating Signals (Q11–Q20)
-- Existing answers for this event are removed so users re-answer with the new questions.

-----------------------------
-- Remove old questions and answers for demo event
-----------------------------
DELETE FROM answers
WHERE event_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM questions
WHERE event_id = '00000000-0000-0000-0000-000000000001';

-----------------------------
-- Insert 20 new scale questions for demo event
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
    -- A. Unfiltered / SG Company & Nightlife Culture (Q1–Q10)
    ('I enjoy socialising with colleagues outside of work.', NULL::jsonb, 2::numeric, 1),
    ('Work culture in Singapore often blurs personal identity with career success.', NULL::jsonb, 2::numeric, 2),
    ('Music and nightlife help me disconnect from work stress.', NULL::jsonb, 2::numeric, 3),
    ('I prefer social events where "no work talk" is encouraged.', NULL::jsonb, 2::numeric, 4),
    ('I feel pressure in Singapore to keep up professionally or financially.', NULL::jsonb, 2::numeric, 5),
    ('I''m comfortable meeting new people through parties or nightlife events.', NULL::jsonb, 2::numeric, 6),
    ('I value experiences (music, memories, vibes) more than status or titles.', NULL::jsonb, 2::numeric, 7),
    ('I enjoy themed events (e.g. throwbacks, Y2K, nostalgia) more than generic clubbing.', NULL::jsonb, 2::numeric, 8),
    ('I feel more myself in social settings than in professional ones.', NULL::jsonb, 2::numeric, 9),
    ('I would trade some career growth for better balance and freedom in life.', NULL::jsonb, 2::numeric, 10),
    -- B. Dunbar-Style Bonding + Gen Z Dating Signals (Q11–Q20)
    ('I feel closer to people after spending time together in person.', NULL::jsonb, 2::numeric, 11),
    ('I prefer a small circle of close connections over many casual ones.', NULL::jsonb, 2::numeric, 12),
    ('Shared experiences are more important to me than constant online communication.', NULL::jsonb, 2::numeric, 13),
    ('Emotional safety matters more to me than instant chemistry.', NULL::jsonb, 2::numeric, 14),
    ('I enjoy deep conversations more than surface-level small talk.', NULL::jsonb, 2::numeric, 15),
    ('Consistency is important to me in relationships.', NULL::jsonb, 2::numeric, 16),
    ('I feel comfortable being myself around people I trust.', NULL::jsonb, 2::numeric, 17),
    ('I value people who show up and keep their word.', NULL::jsonb, 2::numeric, 18),
    ('I''m open to building meaningful connections, not just having fun.', NULL::jsonb, 2::numeric, 19),
    ('I believe strong relationships are built over time, not instantly.', NULL::jsonb, 2::numeric, 20)
) AS q(prompt, options, weight, order_index);
