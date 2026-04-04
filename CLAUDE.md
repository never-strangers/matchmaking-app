---
description: 
alwaysApply: true
---

## Reality Check (Source of Truth)

The codebase supports two modes:

- **Demo Mode** (`NEXT_PUBLIC_DEMO_MODE=true`): localStorage + mock data for fast demos/E2E.
- **Production Mode** (`NEXT_PUBLIC_DEMO_MODE=false`): Supabase Auth (email/password), Supabase DB, RLS.

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
│   └── invite/                 # Invite links & QR codes (generate 1–50, copy URLs, printable)
├── api/
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
└── layout.tsx                 # Root layout with role-based navigation

lib/
├── demo/                      # Demo mode localStorage stores (kept for E2E/demos)
│   ├── demoStore.ts           # Main demo state (events, registrations, matches)
│   ├── userStore.ts           # User profiles & approval workflow
│   ├── registrationStore.ts   # RSVP, payment, questionnaire tracking
│   ├── matchingStore.ts       # Match generation & mutual likes
│   ├── authStore.ts           # Demo auth (mock OTP)
│   ├── eventStore.ts          # Event management
│   ├── notificationStore.ts   # In-app notifications
│   └── checkInStore.ts        # Attendance tracking
├── matching/
│   ├── questionnaireMatch.ts  # Core scoring algorithm (weighted similarity)
│   ├── roundPairing.ts        # computeSingleRound — production round pairing
│   └── demoUsers.ts           # 25 demo users with varied answers
├── auth/
│   ├── sessionToken.ts        # HMAC-signed session tokens
│   ├── useSession.ts          # Session management hook
│   └── useInviteSession.ts    # Invite link session handling
├── questionnaire/
│   └── questions.ts           # 17-question library (4 categories)
└── supabase/
    ├── client.ts              # Supabase client (browser)
    └── serverClient.ts        # Supabase client (server)

scripts/
├── migrate-wp-users.cjs              # Import WP users → Supabase auth + profiles
├── import-amelia-events.cjs          # Import WP Amelia events → events table
├── import-amelia-bookings-event125.cjs  # Import 35 Call a Cupid bookings
└── send-reset-passwords.cjs          # Send password reset emails

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

**Other tables:**
```
invited_users, admins, conversations, messages, email_log,
event_ticket_types, payment_events, active_events (view),
v_event_1_id, v_event_2_id (views), seed_runs, wp-users
```

**Note:** Tables named `matches` and `event_registrations` do NOT exist in the public schema.
The correct tables are `match_results` and `answers` respectively.

### Key Architectural Patterns

#### 1. Demo Mode vs Production Mode
- **Demo Mode** (`NEXT_PUBLIC_DEMO_MODE=true`): All data in localStorage with `ns_*` prefix. Used for E2E tests and offline demos.
- **Production Mode** (`NEXT_PUBLIC_DEMO_MODE=false`): Full Supabase integration. **This is what runs on app.thisisneverstrangers.com.**

Demo stores are kept intentionally — do not delete them.

#### 2. Role-Based Access Control
Four user roles:

| Role | Access | Key Pages |
|------|--------|-----------|
| **Guest** | Registration only | `/register` |
| **User** | Events, matching, messages | `/events`, `/match`, `/messages` |
| **Host** | Event management (own city only) | `/host/*` |
| **Admin** | Full access | `/admin/*` |

#### 3. Per-Event Questionnaire Flow

**RSVP → Questions → Matching flow (production):**
1. User RSVPs → `event_attendees` row created
2. User pays (or free event) → `payment_status` updated
3. User submits questionnaire answers → written to `answers` table (`event_question_id` keyed)
4. Admin marks check-in → `event_attendees.checked_in = true`
5. Admin runs matching → `POST /api/admin/events/[id]/run-matching`
6. Admin reveals round → `POST /api/admin/events/[id]/reveal-round`
7. Users see their matches in `/match` or event page

#### 4. Production Matching Algorithm

**Entry point:** `POST /api/admin/events/[id]/run-matching` (admin only)

**Core logic:** `lib/matching/roundPairing.ts` → `computeSingleRound()`

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

#### 5. Realtime Chat
- Production: Supabase-backed (`NEXT_PUBLIC_CHAT_MODE=supabase`)
- Demo: BroadcastChannel API (`NEXT_PUBLIC_CHAT_MODE=mock`)
- Feature flag: `NEXT_PUBLIC_ENABLE_CHAT=true`

#### 6. Session Management
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
2. Add to `QUESTIONNAIRE_QUESTIONS` array with category, weight, `isDealbreaker`
3. Update `lib/matching/demoUsers.ts` with answers for new question

### Seeding Demo Data
```bash
npm run seed:demo          # Server-side Supabase seed
# Or client-side (in browser console):
# import { seedAllStores } from "@/lib/demo/seedAllStores"; seedAllStores();
```

### Importing Users / Events
```bash
node scripts/migrate-wp-users.cjs --dry-run        # Preview WP user import
CONFIRM=true node scripts/migrate-wp-users.cjs     # Execute

node scripts/import-amelia-events.cjs              # Preview Amelia events
CONFIRM=true node scripts/import-amelia-events.cjs # Execute

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
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=

# Feature Flags
NEXT_PUBLIC_ENABLE_CHAT=false
NEXT_PUBLIC_CHAT_MODE=mock          # "mock" or "supabase"
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_PILOT_PRESEED=false
NEXT_PUBLIC_DEMO_OTP=123456
APP_SESSION_SECRET=
```

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

**Demo stores (keep — used for E2E/demos):**
- `lib/demo/` — all localStorage stores
- `lib/matching/demoUsers.ts` — 25 demo users

**Config:**
- `.env.example`, `playwright.config.ts`, `next.config.ts`, `tailwind.config.ts`
