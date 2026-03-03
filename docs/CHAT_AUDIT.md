# Chat / Messaging Audit (Phase 0)

## Current state (pre–Chat Now CTA)

### Routes
- **`/messages`** – List of conversations (demo: from demoStore by user email). No nav link in production NavBar.
- **`/messages/[id]`** – Thread view (demo: demoStore conversation id = `eventId:emailA:emailB`). Sending gated by **mutual like**.
- No `/chat/*` routes in App Router.

### Data sources
1. **demoStore** (`lib/demo/demoStore.ts`): Used by `app/messages` pages only.
   - `conversations`: keyed by `eventId:emailA:emailB` (emails sorted).
   - `messages`: `Record<conversationId, Message[]>`; `Message.sender` is email.
   - `getOrCreateConversation`, `getConversation`, `getConversationsForUser`, `getMessages`, `addMessage`.
   - **Mutual like required**: conversation thread checks `hasMutualLike(eventId, user, other)` before allowing view/send.
2. **chatStore** (`lib/chatStore.ts`): localStorage (`ns_chat_*`) + BroadcastChannel.
   - Used only by `components/Chat/*` (MessageComposer, ConversationListItem, MessageBubble, ChatHeader).
   - **Not used** by `app/messages` (messages pages use inline UI + demoStore).
   - Demo user ids: mikhail, anna, james, sarah.

### Feature flags
- **`NEXT_PUBLIC_ENABLE_CHAT`** – Referenced in CLAUDE.md/README; not used in current messages flow (messages pages don’t check it).
- **`NEXT_PUBLIC_DEMO_MODE`** – Not used to switch messaging backend; production match flow already uses Supabase.

### Match flow (production)
- **Match page** (`/match`): Server component, Supabase (`match_runs`, `match_rounds`, `match_results`, `my-matches` API).
- **MatchRevealView**: Rounds 1–3, MatchCard per revealed match. MatchCard shows: **Send like** / **Like sent** / **Chat on WhatsApp** (when mutual). **No in-app “Message” or “Chat now” CTA.**

## Decisions

### A) What was kept
- **`/messages`** and **`/messages/[id]`** routes: Kept. Production path uses Supabase conversations/messages; demo path (when `NEXT_PUBLIC_DEMO_MODE=true`) can continue to use demoStore for backward compatibility.
- **Likes**: Kept. MatchCard still supports “Send like” / “Like sent” / “Chat on WhatsApp”; chat is **not** gated on mutual like for reveal-based matches.
- **components/Chat/** (chatStore-based): Left in codebase but **not** used by the new production messages UI. Can be removed in a later cleanup or kept behind a demo-only flag if needed for CEO demos with user switcher.

### B) What was changed / added
- **Production messaging**: New Supabase tables `conversations` and `messages`; RLS; APIs: `GET/POST /api/conversations/[id]/messages`, `POST /api/conversations/[id]/share`, `GET /api/conversations/[id]`. Conversations created at **reveal time** (admin reveal-round) for each pair in that round.
- **Match card**: Primary CTA **Chat now** (opens conversation); **Share Instagram** / **Share Phone** with confirm; optional “Add to profile” if missing.
- **Messages list**: Fetches from `GET /api/conversations` (user’s conversations); open by `?c=<id>` or `/messages/[id]`; Supabase Realtime on `messages` with 2s polling fallback.
- **Pending users**: Still gated (no access to `/match` or `/messages`); same as today.

### C) Removed / deprecated
- **Mutual-like gate for chat**: Removed for reveal-based matches. Users can chat as soon as a match is revealed. Mutual like and WhatsApp link remain for “express interest” flow.
- **chatStore** usage in app/messages: Replaced by Supabase in production. demoStore remains for demo mode only where applicable.

## Summary
- **Demo-only** messaging (demoStore + chatStore) is confined to demo mode and legacy Chat components; it does not drive the production match flow.
- **Production** messaging is Supabase-backed: conversations created on round reveal, “Chat now” on match card, share Instagram/Phone via system messages, RLS and server-side validation.
