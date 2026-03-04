# E2E: Paid Event → Questions → Check-in → Matching → Reveal → Chat

This document describes how to run the **full paid-event-to-chat** Playwright E2E test, which validates the real flow using **seeded Supabase data** (no demo/localStorage).

## Scenario

1. Approved user (User A) logs in.
2. User A attends a **seeded paid event** ([SEED] Paid Dating Night).
3. Payment: either **Stripe test card** (Option A) or **test-only confirm endpoint** (Option B).
4. After payment, user is redirected to event questions; completes questionnaire.
5. Admin checks in User A in the admin guest list.
6. Admin runs matching (incremental round compute).
7. Admin reveals Round 1.
8. User A sees countdown and match card, clicks **Chat now**, sends a message.
9. User B (matched user) logs in and sees the message.

## Prerequisites

### 1. Seed data

Run the test-data seed so that `scripts/.seed-output/test-data.json` exists with an `e2e` block:

```bash
# Required: set a shared password for all seeded users (and E2E)
export SEED_USER_PASSWORD="YourSecurePassword123!"

# Reset and seed (creates [SEED] Paid Dating Night, admin, userA, userB, etc.)
npm run reset:test-data
```

This produces:

- **Paid event:** `[SEED] Paid Dating Night` in the first city (payment_required=true, price_cents=3900).
- **6–10 approved users** in that city; for the paid event: **1 unpaid attendee (User A)** and **8 paid, questionnaire-complete, checked-in** (including User B).
- **Admin:** first approved user in the first city (role=admin).
- **Output file:** `scripts/.seed-output/test-data.json` with `e2e.paidEventId`, `e2e.admin`, `e2e.userA`, `e2e.userB` (email, profileId, passwordHint). Password is **not** stored; use `SEED_USER_PASSWORD` when running the test.

### 2. Environment variables for the app

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- For **Option B (CI / no Stripe UI):**  
  - `E2E_TEST_MODE=true`  
  - `E2E_SHARED_SECRET=<secret>`  
  The test calls `POST /api/test/stripe/confirm-payment` with header `x-e2e-secret` to mark the attendee paid.
- For **Option A (real Stripe Checkout):**  
  - Stripe: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test mode).  
  - Local webhook: `stripe listen --forward-to localhost:3000/api/stripe/webhook` so the app receives `checkout.session.completed`.

### 3. Environment variables for the test

- **Password for seeded users:** `E2E_SEED_PASSWORD` or `SEED_USER_PASSWORD` (same value used at seed time).
- **Option B:** `E2E_TEST_MODE=true` and `E2E_SHARED_SECRET` (same as app).
- **Base URL (optional):** `PLAYWRIGHT_BASE_URL` or `PLAYWRIGHT_TEST_BASE_URL` (default `http://localhost:3000`).

## Running the test

### Option B (recommended for CI)

Deterministic, no Stripe UI:

```bash
# In .env.test or .env.local (for the Next.js app):
# E2E_TEST_MODE=true
# E2E_SHARED_SECRET=your-secret

# Run the test (password must match seed)
E2E_TEST_MODE=true E2E_SHARED_SECRET=your-secret E2E_SEED_PASSWORD="YourSecurePassword123!" npm run test:e2e -- paid-event-to-chat.spec.ts
```

The test will:

- Intercept `POST /api/stripe/create-checkout-session` and return a redirect URL to the questions page.
- Call `POST /api/test/stripe/confirm-payment` with `event_id` and `profile_id` (from seed) to set the attendee to paid.
- Then continue: questions → admin check-in → run matching → reveal → chat.

### Option A (local with real Stripe)

1. Start Stripe webhook forwarding:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

2. Run the test **without** `E2E_TEST_MODE` / `E2E_SHARED_SECRET`:

   ```bash
   E2E_SEED_PASSWORD="YourSecurePassword123!" npm run test:e2e -- paid-event-to-chat.spec.ts
   ```

   The test will open Stripe Checkout and fill card **4242 4242 4242 4242**, expiry **12/30**, CVC **123**, then wait for redirect to the success/questions page.

## Test file and contract

- **Spec:** `tests/e2e/paid-event-to-chat.spec.ts`
- **Seed contract:** `scripts/.seed-output/test-data.json` (or latest `test-data-*.json`) must contain `e2e.paidEventId`, `e2e.admin`, `e2e.userA`, `e2e.userB` with `email`, `profileId`, and `passwordHint`. The test reads the password from `E2E_SEED_PASSWORD` or `SEED_USER_PASSWORD`.

If the seed output has no `e2e` block (e.g. dry run or older seed), the test is skipped.

## Test-only API (Option B)

- **Endpoint:** `POST /api/test/stripe/confirm-payment`
- **Enabled when:** `E2E_TEST_MODE=true` and `E2E_SHARED_SECRET` is set.
- **Auth:** Header `x-e2e-secret` must equal `E2E_SHARED_SECRET`.
- **Body:** either `{ "attendee_id": "..." }` or `{ "event_id": "...", "profile_id": "..." }`.
- **Effect:** Sets `event_attendees.payment_status = 'paid'` and `paid_at = now()` for that attendee (simulates webhook success).

See `app/api/test/stripe/confirm-payment/route.ts`.

## Data-testid selectors used

- Events: `event-card-{id}`, `pay-to-confirm-button`, `event-enter-btn`, `event-preview-go-to-payment`
- Questions: `question-{id}`, `questions-submit`, `questions-complete-badge`
- Admin: `admin-guest-row-{profileId}`, `admin-checkin-cell-{profileId}`, `admin-checkin-btn`, `admin-run-matching`, `admin-reveal-round-1`
- Match: `match-countdown-overlay`, `match-card`, `match-chat-now`
- Messages: `message-input`, `message-send`, `message-item`, `conversation-{id}`

## Build and E2E

After changes, run:

```bash
npm run lint
npm run typecheck
npm run build
E2E_TEST_MODE=true E2E_SHARED_SECRET=xxx E2E_SEED_PASSWORD=xxx npm run test:e2e -- paid-event-to-chat.spec.ts
```

If seed data is not present, the test is skipped (no failure).
