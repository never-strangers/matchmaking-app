-- Ensure the demo event has exactly 10 questions with no duplicates.
-- Removes extra rows if migration 003 was run multiple times.

-- Remove questions with order_index > 10
DELETE FROM questions
WHERE event_id = '00000000-0000-0000-0000-000000000001'
  AND order_index > 10;

-- Remove duplicate questions (same event_id, same order_index), keep one per order_index
DELETE FROM questions a
USING questions b
WHERE a.event_id = '00000000-0000-0000-0000-000000000001'
  AND b.event_id = '00000000-0000-0000-0000-000000000001'
  AND a.order_index = b.order_index
  AND a.id > b.id;

-- Prevent future duplicate (event_id, order_index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_event_order ON questions(event_id, order_index);
