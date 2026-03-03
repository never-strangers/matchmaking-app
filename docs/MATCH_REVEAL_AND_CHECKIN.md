# Match reveal (3 rounds) and admin check-in

## Match reveal (exactly 3 rounds, admin-controlled)

Matches are revealed in **exactly 3 rounds** on the user **Matches** view (`/match`). Each round gives every eligible attendee **at most one match** (no repeat partners across rounds). The **trigger is on the Admin event page**: Reveal Round 1, then Round 2, then Round 3.

### Behaviour

- **Run Matching** (admin, incremental): Each click computes **the next round only** (Round 1, then 2, then 3). Uses a greedy disjoint matching (highest score first; no attendee paired twice in the same round; no pair repeated across rounds). Does **not** reset reveal state or delete existing `match_results`. Late check-ins are included in the next computed round. Tooltip: "Computes the next round only. Late check-ins will be included going forward."
- Admin clicks **Reveal Round 1** (then **Reveal Round 2**, then **Reveal Round 3**). Reveal requires that round to be computed first; otherwise the API returns "Compute round first". Each action is idempotent (already revealed returns 200).
- When a round is revealed, attendees who have a match in that round see a **full-screen countdown 3 → 2 → 1**, then their match card (score, aligned/mismatched reasons).
- Users have **no reveal buttons**; they only see “Waiting for host to reveal Round N” until the admin reveals.
- **Reset event** clears `match_results`, `match_rounds`, and `match_reveal_queue` for that event.

### Data model

- **`match_results`** (migration `20260227100000_match_rounds.sql` + `20260303000000_incremental_matching.sql`):  
  - `event_id`, `a_profile_id`, `b_profile_id`, `score`, **`round`** (1, 2, or 3).  
  - Unique constraint: one pair per event across all rounds (`event_id`, LEAST(a,b), GREATEST(a,b)), so the same pair never appears in two rounds.
- **`match_rounds`** (same migration + `20260303000000_incremental_matching.sql`):  
  - `event_id` (PK), `round1_revealed_at`, `round2_revealed_at`, `round3_revealed_at`, `last_revealed_round` (0–3), `last_computed_round` (0–3), `round1_computed_at`, `round2_computed_at`, `round3_computed_at`, `updated_at`.  
  - Tracks which rounds have been revealed and which have been computed. Reveal state is never reset by Run Matching.

### APIs

**Admin**

- **`POST /api/admin/events/[eventId]/run-matching`**  
  - **Incremental**: Computes the **next** round only (`last_computed_round + 1`). Does not delete existing `match_results` or reset reveal state. Eligible users: checked_in, payment ok, questionnaire complete. Excludes users who already have a match in this round; excludes pairs that exist in any prior round. Inserts only new rows for this round. Idempotent: if the round already has results, returns without duplicating.  
  - Response: `{ ok, roundComputed?, pairsCount?, allRoundsComputed?, message? }`. When all three rounds are computed: `{ ok, allRoundsComputed: true, message: "All rounds computed." }`.

- **`POST /api/admin/events/[eventId]/reveal-round`**  
  - Body: `{ round: 1 | 2 | 3 }`. Admin only. Round must be computed first (match_results exist for that round); otherwise 400 with "Compute round first. Run matching to compute this round."  
  - Idempotent: if that round already revealed, returns 200 with `alreadyRevealed: true`.  
  - Otherwise sets `match_rounds.round{N}_revealed_at = now()` and `last_revealed_round = max(last, N)`. Does **not** change `last_computed_round`.  
  - **Creates a `conversations` row** for each pair in that round (if not already present) and inserts a system message “You’ve been matched. Say hi 👋”.  
  - Response: `{ ok, round, alreadyRevealed?, pairsInRound, lastRevealedRound }`.

**User**

- **`GET /api/events/[eventId]/my-matches`**  
  - Auth: approved user; must be an attendee.  
  - Returns matches for the current user **only for rounds that have been revealed** (`round <= last_revealed_round`).  
  - Response: `{ rounds: { 1?: RevealMatchPayload, 2?: RevealMatchPayload, 3?: RevealMatchPayload }, lastRevealedRound, nextRoundToWaitFor }`.  
  - Each round payload includes **`conversationId`** (uuid or null) for the in-app chat.  
  - Used by `/match` with polling to show Round 1/2/3 sections and to trigger the countdown when a new round is revealed.

### Chat after reveal

When a round is revealed, a **conversation** is created for each pair (see migration `20260302000000_conversations_messages.sql`). The match card shows **Chat now** (primary) and **Share Instagram** (secondary). Sharing is Instagram-only; phone sharing is not exposed. If the user has no Instagram on profile, the card shows “Add your Instagram in Profile” (link to `/profile`). After sharing, the card shows “Instagram shared ✓”. On the **chat screen**, the header has “Share Instagram” (or the shared handle chip with copy); the receiver sees a contact card “&lt;Name&gt; shared Instagram: @handle” with a link to `https://instagram.com/&lt;handle&gt;`.

**APIs:** `GET/POST /api/conversations`, `GET /api/conversations/[id]`, `GET/POST /api/conversations/[id]/messages`, `POST /api/conversations/[id]/share-instagram` (Instagram only; handle from profile, idempotent), `POST /api/conversations/ensure-for-match`. The old `POST /api/conversations/[id]/share` returns 404; use `share-instagram` instead.  
**RLS:** Participants can read/write only their own conversations and messages. See **docs/CHAT_AUDIT.md** for what was kept vs production path.

### UI test ids

- `match-countdown-overlay` – countdown overlay
- `match-card` – first revealed match card (Round 1)
- `match-card-round-2`, `match-card-round-3` – round-specific cards
- `matches-list-container` – container for matches list
- `admin-reveal-round-1`, `admin-reveal-round-2`, `admin-reveal-round-3` – admin reveal buttons
- `match-chat-now` – Chat now button on match card
- `match-share-instagram` – Share Instagram button on match card
- `match-add-instagram-link` – “Add your Instagram in Profile” link when profile has no Instagram
- `match-instagram-shared` – “Instagram shared ✓” state on match card
- `chat-share-instagram`, `chat-add-instagram-link`, `chat-instagram-shared-chip` – Share Instagram / add link / shared handle on chat screen

---

## Admin check-in gating

Only **checked-in** attendees are included in the matching algorithm (in addition to paid + questionnaire-complete rules).

### Data model

- **`event_attendees`** (extended in migration 019):
  - `checked_in` (boolean, default false)
  - `checked_in_at` (timestamptz, null)
  - `checked_in_by` (uuid, admin profile id)
- Indexes: `(event_id, checked_in)`, `(event_id, payment_status, checked_in)`.

### Admin UI

On the **Admin event** page (where “Run Matching” lives):

- **Guest list** table: Name, Phone, Payment, Ticket, Questions, Check-in status, **Check-in** / **Undo check-in** per row.
- **Run Matching** uses only attendees with `checked_in = true` and (if payment required) `payment_status = 'paid'`, and questionnaire complete.
- Warning shown if fewer than 4 guests are checked in.

### API

- **`POST /api/admin/events/[eventId]/checkin`**  
  Body: `{ attendee_id: string, checked_in: boolean }`.  
  Admin only; updates `checked_in`, `checked_in_at`, `checked_in_by`.

### Reset event

- **Reset event** continues to delete match_results (and related data).  
- `match_reveals` are deleted via FK CASCADE when `match_results` are deleted.

---

## Seeding data for matching

Use the **seed scripts** (no match data or conversations are created; admin runs matching from the UI):

- **Events only:** `SEED_CONFIRM=true npm run seed:events` — creates past/future, free/paid/tiered events with no match_results or match_rounds.
- **Test/demo world:** `SEED_CONFIRM=true SEED_USER_PASSWORD="…" npm run seed:test-data` — creates 10 approved + 2 pending + 2 rejected users per city, events per city, and **attendees for upcoming events only** with:
  - Free events: `payment_status = 'not_required'`; paid: mix of paid and checkout_created.
  - **8 checked in, 2 unchecked** (late arrivals) so you can run Round 1, then check in 1–2 late and run matching again for Round 2 (incremental matching).
  - Full questionnaire for 8 attendees, 2 with no answers (gating).
- **Full reset:** `npm run reset:test-data` (cleanup with default label `test-seed` then seed).

See **README** “Supabase test/demo user + event seeding” and “Cleanup seeded test data” for details and cleanup order (messages → conversations → match_* → …).

---

## Compatibility

- Pending verification gating, questionnaire completion, and payment flow are unchanged.
- Run Matching is incremental: each run computes one round (1, then 2, then 3) and never resets reveal state. Reset event deletes `match_results`, `match_rounds`, and `match_reveal_queue` for the event.

### Late arrivals

- Guests can be checked in after Round 1 is already revealed. **Run Matching** again to compute the next round (e.g. Round 2); newly checked-in users are included and get matches in that round only (they do not receive a Round 1 match). No pair is repeated across rounds.
