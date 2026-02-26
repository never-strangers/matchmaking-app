# Match reveal (one-by-one) and admin check-in

## Match reveal (one-by-one)

Matches are revealed sequentially on the user **Matches** view (`/match`), not all at once.

### Behaviour

- Before each reveal: full-screen countdown overlay **3 → 2 → 1** (~1s each).
- After countdown: the match card is shown with a **Next match** button (or “You’re all caught up” when none left).
- Progress persists across refresh: only revealed matches are shown; unrevealed stay hidden until the user clicks **Next match** again.
- **Reset event** (admin) clears match results and reveal state for that event.

### Data model

- **`match_reveals`** (see migration `019_match_reveals_and_checkin.sql`):
  - `event_id`, `viewer_user_id`, `match_result_id`, `reveal_order`, `revealed_at` (null until revealed).
  - One row per (viewer, match pair); `reveal_order` defines sequence (by score).
- When admin runs matching, `match_reveals` are populated (and any previous reveal state for that event is cleared).

### APIs

- **`GET /api/events/[eventId]/matches/reveal-state`**  
  Returns: `{ revealedCount, totalCount, nextMatch?, revealedMatches[] }`.  
  Requires: approved user, attendee of the event, matching run done.

- **`POST /api/events/[eventId]/matches/reveal-next`**  
  Marks the next unrevealed match as revealed (`revealed_at = now()`) and returns that match.  
  Same auth/attendee/matching checks as above.

### UI test ids

- `match-countdown-overlay` – countdown overlay
- `match-reveal-next` – “Reveal first match” / “Next match” button
- `match-card` – wrapper of the currently revealed match card

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
