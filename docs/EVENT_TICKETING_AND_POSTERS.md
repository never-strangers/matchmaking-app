# Event posters & ticketing

## Storage: event-posters bucket

Migration `018_event_rich_setup_and_ticketing.sql` creates the bucket and policies.

- **Bucket**: `event-posters`
- **Public read**: yes (SELECT policy for all)
- **Upload**: service role only (admin API `POST /api/admin/events/[id]/poster`)
- **Limits**: 10MB, MIME types `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
- **Path format**: `{eventId}/{uuid}.{ext}`

No extra setup required if migrations are applied. If you create the bucket manually:

1. In Supabase Dashboard → Storage, create bucket `event-posters`, public.
2. Set file size limit to 10MB and allowed MIME types to image/jpeg, image/png, image/webp.
3. Add policy: SELECT for all (public read). Do not add INSERT for anon/authenticated; admin uses service role.

## Verification steps

1. **Migrations**
   - Run `018_event_rich_setup_and_ticketing.sql` (after 016, 014).
   - Confirm: `events` has `poster_path`, `whats_included`, `end_at`, `category`; `event_ticket_types` exists; `event_attendees` has `ticket_type_id`, `ticket_status`, `reserved_at`, `id`; RPCs `reserve_ticket`, `release_ticket` exist.

2. **Admin: create event**
   - Create event with end date, category (Friends/Dating), What’s Included (multiline).
   - Confirm event appears with new fields.

3. **Admin: poster**
   - On event **create or edit**, use the Poster section to upload a poster (JPG/PNG/WebP, &lt; 10MB). During creation, the poster is uploaded immediately after the event is created via `POST /api/admin/events/[id]/poster`. Confirm it appears in the edit form and in Storage under `event-posters/{eventId}/...`.

4. **Events list preview modal**
   - On `/events`, click **Enter Event** on a card. A modal opens with full event details (poster, title, city, category, start/end, location, price, description, What’s Included).
   - If the event requires payment and the attendee has not yet paid, the modal shows “Payment required — confirm your spot before answering questions” with a **Continue to payment** button that takes the user into the event page to select a ticket / pay.
   - After payment is confirmed, the modal (or event page) will highlight “Questionnaire required — please complete before the event starts.” with progress (answered/total) and a **Complete Questions** button. Once all questions are answered, it switches to “Questionnaire complete” and **Continue to Event**.
   - **Close** dismisses the modal. Data is loaded via `GET /api/events/[id]/preview` (event + attendee questionnaire + payment state).

5. **Public event page**
   - Open `/events/{id}`. Confirm poster (or placeholder), start/end time, category badge, “What’s Included” section.

6. **Admin: ticket types**
   - On event edit, click “Apply default template”. Confirm four types (Early Bird, Male, Female, VIP) with caps and prices.
   - Add/edit/remove a type, toggle active. Confirm sold/cap shown.

7. **User: ticket selection & reserve**
   - Join event, complete questions. If event has ticket types, confirm “Select a ticket” with radio list (name, price, “X left”).
   - Select one, click “Reserve ticket”. Confirm success and “Reserved” state (and pay step if payment required).

8. **Cap enforcement**
   - Set a ticket type cap to 1. As user A, reserve that type. As user B (other browser/session), try to reserve the same type; confirm error (e.g. “Ticket type sold out” or “sold out”).

## Concurrency test (cap enforcement)

To verify race-safe cap enforcement:

1. Create an event with one ticket type, `cap = 2`.
2. Use two sessions (two browsers or one incognito): User A and User B, both approved.
3. Both complete questions and open the ticket selection step.
4. At the same time, both click “Reserve ticket” for the same type (or run two parallel `POST /api/events/{id}/reserve-ticket` with the same `ticket_type_id`).
5. Exactly one request should succeed (200, `attendee_id`); the other should fail (400, e.g. “Ticket type sold out” or “sold out”).
6. Query `event_ticket_types`: `sold` should be 1 (not 2). Query `event_attendees`: exactly one row for that event should have that `ticket_type_id`.

Optional: script with `curl` or Playwright to run N concurrent reserve requests for the same type with cap = 1; expect one success and N−1 failures.
