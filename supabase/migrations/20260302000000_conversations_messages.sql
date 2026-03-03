-- Conversations and messages for match-reveal chat (Chat Now CTA)
-- Depends on: events, match_results, profiles (id TEXT), is_approved()

-----------------------------
-- 1. conversations: one per revealed match pair
-----------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  match_result_id UUID NOT NULL REFERENCES match_results(id) ON DELETE CASCADE,
  user_a_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_result_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_event ON conversations(event_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_a ON conversations(user_a_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_b ON conversations(user_b_id);

COMMENT ON TABLE conversations IS 'One conversation per match result; created when admin reveals a round.';

-----------------------------
-- 2. messages: text, system, contact_share
-----------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'system', 'contact_share')),
  body TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(conversation_id, created_at);

COMMENT ON TABLE messages IS 'Chat messages; kind=contact_share uses payload: { type: instagram|phone, value } from sender profile.';
COMMENT ON COLUMN messages.sender_id IS 'Null for system messages.';
COMMENT ON COLUMN messages.payload IS 'For contact_share: { "type": "instagram"|"phone", "value": "..." }.';

-----------------------------
-- 3. RLS: conversations
-----------------------------
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read conversation"
  ON conversations FOR SELECT
  USING (
    public.is_approved()
    AND (
      user_a_id = (auth.uid())::text
      OR user_b_id = (auth.uid())::text
    )
  );

-- Insert/update/delete only via service role (admin reveal creates conversations)

-----------------------------
-- 4. RLS: messages
-----------------------------
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read messages"
  ON messages FOR SELECT
  USING (
    public.is_approved()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user_a_id = (auth.uid())::text OR c.user_b_id = (auth.uid())::text)
    )
  );

CREATE POLICY "Participants can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (
    public.is_approved()
    AND sender_id = (auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user_a_id = (auth.uid())::text OR c.user_b_id = (auth.uid())::text)
    )
  );

-- No UPDATE/DELETE for messages (append-only)

-----------------------------
-- 5. Realtime: messages
-----------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;
