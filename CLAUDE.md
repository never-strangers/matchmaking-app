---
description: 
alwaysApply: true
---

<!-- Last audited: 2026-04-04 — all file paths, scripts, commands, env vars, and architectural claims verified against actual codebase. -->

## Reality Check (Source of Truth)

The codebase runs in **Production Mode**: Supabase Auth (email/password), Supabase DB, RLS. This is what runs at app.thisisneverstrangers.com.

### Auth (Production Mode)
- Users register/login with **email + password**
- New users start with `profiles.status = 'pending_verification'`
- Pending users can log in but are gated to `/profile` and `/pending` only
- Admins review and approve/reject users in `/admin/users`

### ⚠️ Production Matching Is LIVE — Do Not Assume It Is Missing

The production matching system is **fully implemented and actively used** on real events.

**DO NOT claim any of the following — they are FALSE:**
- "There is no production matching runner"
- "The matches table doesn't exist in the public schema"
- "Matching only works in demo/localStorage mode"
- "There is no Supabase-backed API route for matching"

**Actual production matching infrastructure (all exist in Supabase):**

| Table | Purpose |
|---|---|
| `match_results` | Stores pairs — `event_id, a_profile_id, b_profile_id, score, round` |
| `match_runs` | Tracks each run — `event_id, status, created_at, finished_at` |
| `match_rounds` | Per-event round state — tracks computed/revealed rounds 1–3 |
| `match_reveals` | Per-user reveal queue |
| `match_reveal_queue` | Reveal queue |
| `likes` | Mutual likes — `event_id, from_profile_id, to_profile_id` |

**Matching runner:** `POST /api/admin/events/[id]/run-matching`
- Admin-only endpoint, fully implemented
- Reads checked-in + paid attendees from `event_attendees`
- Reads per-event questions from `event_questions` (falls back to `questions` table)
- Reads answers from `answers` table (`event_id, profile_id, event_question_id, answer`)
- Uses `computeSingleRound` from `lib/matching/roundPairing.ts`
- For dating events: pairs male↔female only
- Supports 3 rounds — each POST call advances one round
- Writes to `match_results`, `match_runs`, `match_rounds`
- Returns 400 if `event_questions` has 0 rows for the event

**Requirements for matching to run on an event:**
1. `event_questions` — at least 1 row configured for the event
2. `answers` — attendees must have submitted answers (keyed by `event_question_id`)
3. `event_attendees` — attendees must be `checked_in=true` (and `payment_status='paid'` for paid events)

**Bootstrap questions:** `POST /api/admin/events/[id]/questions/bootstrap-defaults`

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Never Strangers** is an invite-only social-matching platform connecting people through curated events across Asia. Built with Next.js 15, Supabase, and TypeScript.

**Current State**: Production is live at `app.thisisneverstrangers.com`. The app runs in production mode with real Supabase Auth, real DB, and real matching. Demo mode (localStorage) is retained for E2E testing and stakeholder demos.

### Workspace: avoid duplicate folders (iCloud / paths with spaces)

On macOS with iCloud Drive you may see two similar paths (e.g. two "Documents - Mikhail's MacBook Pro" with a `neverstrangers` folder each). Only **one** of them is the real Git repo (has a `.git` directory). Paths with spaces can also cause tools (and AI assistants) to resolve the wrong folder or create duplicate references.

**CRITICAL — Apostrophe bug:** The real folder name contains a **curly/smart apostrophe** (Unicode U+2019 ’) in "Mikhail's". Some tools (AI agents, shell scripts, editors) write files using the **straight ASCII apostrophe** (U+0027) instead, which silently creates a *second* folder that iCloud treats as a stub. This stub has no `.git`, so changes made there are invisible to version control.

**Rules for AI agents and scripts:**
- **NEVER** hard-code the path with a straight apostrophe. Always use the curly apostrophe or, better yet, resolve the path with a glob: `~/Documents/Documents*/neverstrangers`.
- The `check-repo` script (`scripts/check-git-repo.cjs`) runs before `npm run dev` and `npm run build`. It auto-detects and **deletes** the stub folder if one appears.
- If you must reference the Documents path, copy it from `pwd` output — never type the apostrophe manually.
- **Recommended:** Use a path **without spaces or special characters**. Clone or move the repo to e.g. `~/Projects/neverstrangers`.
- **Check**: from project root, `ls -la .git` should list the `.git` directory. If it fails, you're in the duplicate.

## Common Development Commands

```bash
# Development
npm run dev                    # Start Next.js dev server (localhost:3000)
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run ESLint

# Testing
npm run test:e2e               # Run all Playwright E2E tests
npm run test:e2e:ui            # Run Playwright tests with UI (interactive)
npm run test:e2e:report        # View last test report

# Demo Data
npm run seed:demo              # Seed Supabase with demo data
npm run download-media         # Download media assets
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS
- **State Management**: Zustand (with localStorage persistence for demo mode)
- **Database**: Supabase (PostgreSQL + Auth + Storage) — **actively used in production**
- **Matching**: Questionnaire-based algorithm (per-event questions, weighted scoring, up to 3 rounds)
- **Testing**: Playwright E2E tests
- **Deployment**: Vercel (frontend) + Supabase (backend)

### Project Structure

```
app/                           # Next.js 15 App Router
├── admin/                     # Admin dashboard & matches management
│   ├── invite/                 # Invite links & QR codes (generate 1–50, copy URLs, printable)
│   └── cities/                 # Toggle cities Live ↔ Coming soon (no redeploy needed)
├── api/
│   ├── cities/                # GET — public city list {live, comingSoon} from city_config table
│   ├── admin/cities/[value]/  # PATCH — toggle city status/sort_order (admin only)
│   ├── admin/events/[id]/
│   │   ├── run-matching/      # POST — triggers matching for one round
│   │   ├── reveal-round/      # POST — reveals next match round to users
│   │   ├── delete-matches/    # DELETE — clears match_results for event
│   │   ├── questions/         # GET/POST — manage event_questions
│   │   ├── questions/bootstrap-defaults/  # POST — seed default questions
│   │   ├── attendees/add/     # POST — admin adds attendee manually
│   │   ├── export-emails/     # GET — CSV/TXT export of attendee emails
│   │   ├── checkin/           # POST — check in an attendee
│   │   └── ticket-types/      # GET/POST — manage ticket types
│   ├── events/[id]/
│   │   ├── answers/           # POST — submit questionnaire answers
│   │   ├── my-matches/        # GET — user's revealed matches
│   │   ├── revealed-matches/  # GET — all revealed matches for event
│   │   └── matches/reveal-state/  # GET — reveal state for event
│   └── match/events/          # GET — events with match activity
├── events/                    # Events listing & creation flow
│   ├── [id]/questions/        # Per-event questionnaire (after RSVP)
│   └── new/                   # Event creation wizard (setup + questions)
├── match/                     # Match feed with scores & reveals
├── messages/                  # Realtime chat
├── register/                  # User registration
├── login/                     # Login flow
├── invite/[token]/            # Invite link handler
├── pending/                   # Holding page for pending_verification users
├── profile/                   # User profile edit
├── admin/
│   ├── emails/                # Admin email management
│   └── events/[id]/           # Per-event admin (edit, questions, attendees, matching)
└── layout.tsx                 # Root layout with role-based navigation

lib/
├── matching/
│   ├── questionnaireMatch.ts  # Core scoring algorithm (weighted similarity)
│   └── roundPairing.ts        # computeSingleRound — production round pairing
├── auth/
│   ├── sessionToken.ts        # HMAC-signed session tokens
│   ├── useSession.ts          # Session management hook
│   └── useInviteSession.ts    # Invite link session handling
├── questionnaire/
│   └── questions.ts           # 10-question library (4 categories: lifestyle, social, values, comm)
└── supabase/
    ├── client.ts              # Supabase client (browser)
    ├── serverClient.ts        # Supabase client (server, service role — admin ops)
    ├── adminClient.ts         # Admin Supabase client helper
    ├── server.ts              # SSR Supabase client (cookies)
    ├── middleware.ts           # Supabase auth middleware helper
    ├── fetchAll.ts            # Paginated fetch helper (works around 1000-row default limit)
    └── userService.ts         # User lookup helpers
# Other lib modules (not exhaustive):
# lib/email/            — transactional email (send.ts, provider.ts, templates.ts)
# lib/geo/cities.ts     — supported cities list
# lib/realtime/         — useEventRealtime hook
# lib/constants/        — profileOptions etc.
# lib/auth/             — also: getAuthUser.ts, requireApprovedUser.ts, getPostLoginRedirect.ts

scripts/
├── migrate-wp-users.cjs              # Import WP users → Supabase auth + profiles
├── import-amelia-events.cjs          # Import WP Amelia events → events table
├── import-amelia-bookings-event125.cjs  # Import 35 Call a Cupid bookings
├── send-reset-passwords.cjs          # Send password reset emails
├── check-git-repo.cjs                # Detects/deletes iCloud stub duplicate (runs before dev/build)
├── generate-invite-tokens.ts         # Bulk invite token generation
├── generate-qr.cjs                   # QR code generation
├── seed-e2e-users.cjs                # Seed users for E2E tests
├── verify-dating-matching.ts         # Debug/validate matching output
└── (many other seed/cleanup/migration scripts in scripts/)

supabase/
└── migrations/                # Database schema migrations
```

### Actual Supabase Schema (Production)

**Core tables (confirmed live):**
```
profiles          — id, email, display_name, name, gender, city, status, role,
                    questionnaire_answers (JSONB), wp_source, wp_user_id, ...
events            — id, title, city, status, start_at, end_at, category,
                    payment_required, price_cents, location, ...
event_attendees   — event_id, profile_id, payment_status, ticket_status,
                    checked_in, checked_in_at, paid_at, ...
event_questions   — id, event_id, template_id, prompt, type, options, weight, sort_order
answers           — event_id, question_id, event_question_id, profile_id, answer, updated_at
questions         — id, event_id, prompt, type, options, weight, order_index
```

**Matching tables (confirmed live, actively used):**
```
match_results     — id, event_id, a_profile_id, b_profile_id, score, round
match_runs        — id, event_id, status, created_at, finished_at
match_rounds      — event_id, last_computed_round, last_revealed_round,
                    round1/2/3_computed_at, round1/2/3_revealed_at
match_reveals     — per-user reveal records
match_reveal_queue — reveal queue
likes             — event_id, from_profile_id, to_profile_id, created_at
```

**City config table:**
```
city_config       — value (PK, code e.g. "sg"), label, status ("live"|"coming_soon"),
                    sort_order, created_at, updated_at
```
Managed by admins at `/admin/cities`. Drives the grouped city dropdown on registration,
profile edit, and admin event forms. Single source of truth: `lib/constants/cities.ts`
(static seed/fallback) + `lib/cities/getCityConfig.ts` (server DB reader).

**Other tables:**
```
invited_users, admins, conversations, messages, email_log,
event_ticket_types, payment_events, active_events (view),
v_event_1_id, v_event_2_id (views), seed_runs, wp-users
```

**Note:** Tables named `matches` and `event_registrations` do NOT exist in the public schema.
The correct tables are `match_results` and `answers` respectively.

### ⚠️ Supabase 1000-Row Default Limit

Supabase JS `.select()` returns **max 1000 rows** by default — silently, with no error. Any query that can return >1000 rows **MUST** use `fetchAllRows()` from `lib/supabase/fetchAll.ts`:

```typescript
import { fetchAllRows } from "@/lib/supabase/fetchAll";

const rows = await fetchAllRows<MyType>(
  (offset, limit) =>
    supabase.from("answers").select("profile_id, answer")
      .eq("event_id", eventId)
      .range(offset, offset + limit - 1)
);
```

**High-risk table:** `answers` — scales as attendees × questions (e.g. 80 users × 23 questions = 1,840 rows). Already caused production bugs where users were silently excluded from matching.

**Safe patterns (no pagination needed):**
- `{ count: "exact", head: true }` — server-side count, no rows transferred
- `.maybeSingle()` / `.single()` — single row
- Tables bounded by design (event_questions, event_attendees, match_results)

### Key Architectural Patterns

#### 1. Role-Based Access Control
Four user roles:

| Role | Access | Key Pages |
|------|--------|-----------|
| **Guest** | Registration only | `/register` |
| **User** | Events, matching, messages | `/events`, `/match`, `/messages` |
| **Host** | Event management (own city only) | `/host/*` |
| **Admin** | Full access | `/admin/*` |

#### 2. Per-Event Questionnaire Flow

**RSVP → Questions → Matching flow (production):**
1. User RSVPs → `event_attendees` row created
2. User pays (or free event) → `payment_status` updated
3. User submits questionnaire answers → written to `answers` table (`event_question_id` keyed)
4. Admin marks check-in → `event_attendees.checked_in = true`
5. Admin runs matching → `POST /api/admin/events/[id]/run-matching`
6. Admin reveals round → `POST /api/admin/events/[id]/reveal-round`
7. Users see their matches in `/match` or event page

#### 3. Production Matching Algorithm

**Entry point:** `POST /api/admin/events/[id]/run-matching` (admin only)

**Core logic:** `lib/matching/roundPairing.ts` → `computeSingleRound()`
**Data loader:** `lib/matching/loadEventQuestions.ts` → loads questions + answers (uses paginated fetch)

**Scoring** (from `lib/matching/questionnaireMatch.ts`):
1. Per-question similarity: `sim = 1 - abs(answerA - answerB) / 3`
2. Weighted average: `score = Σ(weight × sim) / Σ(weight)`
3. Scale to 0–100: `finalScore = round(score × 100)`

**Pairing modes:**
- `dating`: only pairs male↔female
- `friends`: any gender combination

**Round system:**
- Up to 3 rounds per event
- Each POST to run-matching advances by one round
- Already-paired users are excluded from subsequent rounds
- State tracked in `match_rounds` table

**Requirements to run:**
1. `event_questions` must have ≥ 1 row for the event
2. Attendees must have `checked_in = true`
3. Paid events: attendees need `payment_status = 'paid'`
4. Attendees must have submitted answers (rows in `answers` table)

#### 4. Realtime Chat
- Production: Supabase-backed (`NEXT_PUBLIC_CHAT_MODE=supabase`)
- Demo: BroadcastChannel API (`NEXT_PUBLIC_CHAT_MODE=mock`)
- Feature flag: `NEXT_PUBLIC_ENABLE_CHAT=true`

#### 5. Session Management
**Production**: HMAC-signed tokens (`lib/auth/sessionToken.ts`)
- Tokens: `{payload}.{signature}` (base64url encoded)
- TTL: 7 days; Secret: `APP_SESSION_SECRET` env var

**Invite Links**: QR codes → `/invite/[token]` → city-locked sessions. Generated at `/admin/invite`.

## Common Tasks

### Running Matching for an Event
```
POST /api/admin/events/{eventId}/run-matching
# Requires: admin session cookie
# Call once per round (up to 3 rounds)
# Prerequisites: event_questions configured, attendees checked in with answers
```

To bootstrap default questions for an event:
```
POST /api/admin/events/{eventId}/questions/bootstrap-defaults
```

### Adding a New Page
1. Create `app/[route]/page.tsx`
2. Add role check: `if (session.role !== "admin") redirect("/events")`
3. Add nav link in `app/layout.tsx`
4. Add `data-testid` attributes
5. Add E2E test

### Adding a New Question
1. Edit `lib/questionnaire/questions.ts`
2. Add to `QUESTIONS` array (exported from `lib/questionnaire/questions.ts`) with category, weight, `isDealbreaker`

### Importing Users / Events
```bash
node scripts/migrate-wp-users.cjs --dry-run        # Preview WP user import
CONFIRM=true node scripts/migrate-wp-users.cjs     # Execute
# Migration unserializes PHP `meta:gender` / `meta:attracted` / `meta:Looking` and `meta:submitted` where present.

node scripts/import-amelia-events.cjs              # Preview (embedded snapshot)
node scripts/import-amelia-events.cjs --from-json path/to/amelia-events.json  # Preview from API export
CONFIRM=true node scripts/import-amelia-events.cjs --from-json path/to/amelia-events.json  # Insert
CONFIRM=true node scripts/import-amelia-events.cjs # Execute embedded snapshot only

node scripts/import-amelia-bookings-event125.cjs              # Preview
CONFIRM=true node scripts/import-amelia-bookings-event125.cjs # Execute (35 bookings)
```

### Debugging E2E Tests
```bash
npx playwright test --headed          # Run with browser visible
npx playwright test --debug           # Step through
npx playwright test happy-path.spec.ts
npx playwright show-trace trace.zip
```

## Environment Variables

```bash
# Required (must be set — app will throw without these)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
APP_SESSION_SECRET=               # HMAC secret for session tokens — throws if missing

# Feature Flags
NEXT_PUBLIC_ENABLE_CHAT=false
NEXT_PUBLIC_CHAT_MODE=mock          # "mock" or "supabase"

# Email
EMAIL_PROVIDER=mock               # "mock" (console log) | "resend" (live sends)
RESEND_API_KEY=

```
> **Note**: `APP_SESSION_SECRET` must be set in production or all session operations will throw.

## Production Status

**Live in production (app.thisisneverstrangers.com):**
- ✅ Real Supabase Auth (email/password)
- ✅ Real database persistence
- ✅ Matching runner with 3-round system
- ✅ Match reveal flow
- ✅ Role-based access control
- ✅ Admin: check-in, guest list, email export, add attendees
- ✅ Invite links with QR codes
- ✅ WP/Amelia user + event import scripts

**Still demo/mock:**
- ⚠️ Payment processing (Stripe partially integrated)
- ⚠️ AI embeddings (using questionnaire scores only)

## Important Files

**Matching (production):**
- `app/api/admin/events/[id]/run-matching/route.ts` — matching runner
- `app/api/admin/events/[id]/reveal-round/route.ts` — reveal next round
- `lib/matching/roundPairing.ts` — `computeSingleRound()` pairing logic
- `lib/matching/questionnaireMatch.ts` — scoring algorithm

**Config:**
- `.env.example`, `playwright.config.ts`, `next.config.ts`, `tailwind.config.ts`

## ⚠️ Data Safety: Always Backup Before DELETE or UPDATE

**Never run a DELETE or UPDATE on any Supabase table containing user or admin data without first dumping the affected rows to a local JSON backup.**

This rule exists because `email_template_overrides` rows (CEO-edited email templates) were deleted in a session without backup, causing permanent data loss.

**Required workflow:**
1. SELECT all rows that will be affected → write to `scripts/backups/[table]-[timestamp].json`
2. Only then proceed with the DELETE or UPDATE

**Use the backup helper script:**
```bash
node scripts/backup-table.cjs <table> [--filter "column=value"]
# Examples:
node scripts/backup-table.cjs email_template_overrides
node scripts/backup-table.cjs profiles --filter "status=pending_verification"
```

Backup files are written to `scripts/backups/` (gitignored). Verify the file exists and is non-empty before proceeding with the destructive operation.

**Tables that require backup without exception:**
- `profiles` — user accounts
- `email_template_overrides` — admin-edited email templates
- `admins` — admin grants
- `event_attendees` — attendee records
- `answers` — questionnaire answers
- `match_results`, `match_runs`, `match_rounds` — matching state
- Any table touched by a one-off migration or cleanup script
