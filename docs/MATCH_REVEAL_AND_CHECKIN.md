# Match reveal (one-by-one) and admin check-in

## Match reveal (one-by-one, admin-controlled)

Matches are revealed sequentially on the user **Matches** view (`/match`), **but the trigger lives on the Admin event page**, not with users.

### Behaviour

- Admin clicks **Reveal next match** on the Admin event detail page.
- Eligible attendees in that event who are part of the next pair see a **full-screen countdown overlay 3 → 2 → 1** (~1s each).
- After the countdown, the match card is shown to both people in the pair, with score + explanations and a CTA to start chat (when enabled).
- Unmatched attendees (not in that pair) see nothing new.
- Revealed matches persist across refresh: only matches whose pair has been revealed by admin are shown; unrevealed pairs stay hidden until the host reveals them.
- **Reset event** (admin) clears match results and the reveal queue for that event.

### Data model

- **`match_results`** (existing):  
  - `event_id`, `a_profile_id`, `b_profile_id`, `score`, `id` (PK, see migration `019_match_reveals_and_checkin.sql`).
  - One row per unique pair in an event.
- **`match_reveal_queue`** (see migration `20260227000000_match_reveal_queue.sql`):  
  - `event_id` – event the match belongs to  
  - `match_result_id` – FK to `match_results(id)`  
  - `reveal_order` – integer ordering for this event (highest score first by default)  
  - `revealed_at` – `NULL` until revealed by admin  
  - `revealed_by` – admin profile id who triggered the reveal  
  - Unique per `(event_id, match_result_id)`; indexed by `(event_id, reveal_order)` and `(event_id, revealed_at)`.
- When admin runs matching, `match_results` are (upserted) and `match_reveal_queue` is **fully regenerated** for that event (old queue rows for the event are deleted and re-inserted in score order).

### APIs

**Admin**

- **`POST /api/admin/events/[eventId]/reveal-next-match`**  
  - Auth: admin only (checked via `getAuthUser()` + `role === "admin"`).  
  - Behaviour:
    - Uses PostgreSQL function `public.reveal_next_match_for_event(event_id, admin_profile_id)` to:
      - Lock the reveal queue for that event (`FOR UPDATE SKIP LOCKED` + advisory lock).
      - Select the next unrevealed row (`revealed_at IS NULL`, smallest `reveal_order`).
      - Mark it revealed (`revealed_at = now()`, `revealed_by = admin_profile_id`).
      - Return the pair (`a_profile_id`, `b_profile_id`, `score`, `reveal_order`).
  - Response:
    - `{ revealed: { matchResultId, aProfileId, bProfileId, revealOrder, score } }` when a match is revealed.
    - `{ revealed: null, message: "No more matches to reveal for this event" }` when queue is exhausted.

**User**

- **`GET /api/events/[eventId]/revealed-matches`**  
  - Auth: approved user; must be an attendee of this event.  
  - Behaviour:
    - Returns all matches from the reveal queue that:
      - Have `revealed_at IS NOT NULL`, and
      - Involve the current user (they are either `a_profile_id` or `b_profile_id`).
    - Includes aligned/mismatched explanation text based on questionnaire answers.  
  - Response shape:
    - `{ matches: RevealMatchPayload[], lastSeenOrder: number }`  
    - When called **without** `?since`, `matches` contains **all** already-revealed matches for this user in that event, ordered by `reveal_order` ascending.

- **`GET /api/events/[eventId]/revealed-matches?since=<order>`**  
  - Same auth as above.  
  - Behaviour:
    - Only returns matches for this user where `reveal_order > since`.  
    - `lastSeenOrder` reflects the highest `reveal_order` seen for this user (regardless of filter).  
  - Used by the `/match` page to **poll** every few seconds for new reveals in a simple, RLS-safe way (all filtering happens in a server-side API using the service role client).

### UI test ids

- `match-countdown-overlay` – countdown overlay
- `match-card` – wrapper for an individual revealed match card
- `matches-list-container` – container for matches list on `/match`
- `admin-reveal-next-match` – **Admin** “Reveal next match” button on event detail page

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

To quickly get 10 approved users joined to two events (so you can run matching from the admin UI):

1. Run the SQL script in **Supabase SQL Editor** (Dashboard → SQL Editor → New query):
   - **File:** `supabase/scripts/seed_10_approved_users_for_matching.sql`
2. The script creates/updates 10 profiles (`status = 'approved'`), joins them to the **first two live events** (by `created_at`) with `payment_status = 'paid'`, `checked_in = true`, and fills in **answers** for every event question.
3. In **Admin → Events → [event]**, use **Run Matching**; the 10 users will be included.

To target specific events instead of the first two, edit the script and replace the two `SELECT id INTO v_event_*_id FROM events ...` lines with e.g. `v_event_1_id := 'your-uuid-1'::uuid;` and `v_event_2_id := 'your-uuid-2'::uuid;`.

---

## Compatibility

- Pending verification gating, questionnaire completion, and payment flow are unchanged.
- Run Matching and Reset event semantics are unchanged except: Run Matching now filters by checked-in (and paid, questionnaire complete) and populates `match_reveals`; Reset clears reveal state via CASCADE.
