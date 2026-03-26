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

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Never Strangers** is an invite-only social-matching platform connecting people through curated events across Asia. This is the **Matching Core v1** — a lightweight, AI-powered system built with Next.js 15, Supabase, and TypeScript.

**Current State**: The app is fully functional in **demo mode** using localStorage for all data persistence. Supabase schema and migrations exist but are not yet fully integrated for production.

### Workspace: avoid duplicate folders (iCloud / paths with spaces)

On macOS with iCloud Drive you may see two similar paths (e.g. two "Documents - Mikhail's MacBook Pro" with a `neverstrangers` folder each). Only **one** of them is the real Git repo (has a `.git` directory). Paths with spaces can also cause tools (and AI assistants) to resolve the wrong folder or create duplicate references.

**CRITICAL — Apostrophe bug:** The real folder name contains a **curly/smart apostrophe** (Unicode U+2019 ‘’’) in "Mikhail’s". Some tools (AI agents, shell scripts, editors) write files using the **straight ASCII apostrophe** (U+0027 ‘\'’) instead, which silently creates a *second* folder that iCloud treats as a stub. This stub has no `.git`, so changes made there are invisible to version control.

**Rules for AI agents and scripts:**
- **NEVER** hard-code the path with a straight apostrophe (‘\'’). Always use the curly apostrophe (‘’’) or, better yet, resolve the path with a glob: `~/Documents/Documents*/neverstrangers`.
- The `check-repo` script (`scripts/check-git-repo.cjs`) runs before `npm run dev` and `npm run build`. It auto-detects and **deletes** the stub folder if one appears.
- If you must reference the Documents path, copy it from `pwd` output — never type the apostrophe manually.

- **Recommended:** Use a path **without spaces or special characters**. Clone or move the repo to e.g. `~/Projects/neverstrangers` or `~/dev/neverstrangers`, then open that folder in Cursor. This avoids iCloud duplicate confusion entirely.
  ```bash
  mkdir -p ~/Projects
  cp -R ~/Documents/Documents*/neverstrangers ~/Projects/neverstrangers
  # Or: git clone <your-repo-url> ~/Projects/neverstrangers
  cd ~/Projects/neverstrangers
  ```
  Then in Cursor: **File > Open Folder >** `~/Projects/neverstrangers`.
- **If you stay in Documents:** Always open this project in Cursor/IDE from the folder where `git status` works (the one that contains `.git`). If you open the other path, edits won't be in the repo and you'll see "nothing to commit."
- **Single source of truth**: use one canonical path. In Terminal, run `pwd` when you're in the correct neverstrangers folder and use that path when opening the project.
- **Check**: from project root, `ls -la .git` should list the `.git` directory. If it fails, you're in the duplicate; close and open the other folder.
- Running `npm run dev` (or `npm run build`) will fail with a clear message if you're not in the Git repo.

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

# E2E Test Examples
npx playwright test happy-path.spec.ts          # Run happy path flow
npx playwright test 05_chat_realtime.spec.ts    # Test realtime chat
npx playwright test --ui                         # Interactive mode
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS
- **State Management**: Zustand (with localStorage persistence for demo mode)
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Matching**: Questionnaire-based algorithm (17 questions, weighted scoring)
- **Testing**: Playwright E2E tests
- **Deployment**: Vercel (frontend) + Supabase (backend)

### Project Structure

```
app/                           # Next.js 15 App Router
├── admin/                     # Admin dashboard & matches management
│   └── invite/                 # Invite links & QR codes (generate 1–50, copy URLs, printable)
├── api/
│   └── admin/
│       └── invite/             # POST generate, GET list
├── host/                      # Host dashboard for event management
├── events/                    # Events listing & creation flow
│   ├── [id]/questions/        # Per-event questionnaire (after RSVP)
│   └── new/                   # Event creation wizard (setup + questions)
├── match/                     # Match feed with scores & explanations
├── messages/                  # Mock realtime chat (BroadcastChannel)
├── pilot/                     # Pilot matching demo (preseed users)
├── register/                  # User registration + OTP verification
├── login/                     # Login flow
├── invite/[token]/            # Invite link handler
├── notifications/             # Notification center
└── layout.tsx                 # Root layout with role-based navigation

lib/
├── demo/                      # Demo mode localStorage stores
│   ├── demoStore.ts           # Main demo state (events, registrations, matches)
│   ├── userStore.ts           # User profiles & approval workflow
│   ├── registrationStore.ts   # RSVP, payment, questionnaire tracking
│   ├── matchingStore.ts       # Match generation & mutual likes
│   ├── authStore.ts           # Demo auth (mock OTP)
│   ├── eventStore.ts          # Event management
│   ├── notificationStore.ts   # In-app notifications
│   └── checkInStore.ts        # Attendance tracking
├── matching/
│   ├── questionnaireMatch.ts  # Matching algorithm (weighted scores)
│   └── demoUsers.ts           # 25 demo users with varied answers
├── auth/
│   ├── sessionToken.ts        # HMAC-signed session tokens
│   ├── useSession.ts          # Session management hook
│   └── useInviteSession.ts    # Invite link session handling
├── questionnaire/
│   └── questions.ts           # 17-question library (4 categories)
├── supabase/
│   ├── client.ts              # Supabase client (browser)
│   └── serverClient.ts        # Supabase client (server)
└── pilot/
    └── preseedUsers.ts        # Pilot demo preseed profiles

components/
├── ui/                        # Reusable UI components
│   ├── Button.tsx, Card.tsx, Badge.tsx
│   ├── PageHeader.tsx, EmptyState.tsx
└── Chat/                      # Chat components (mock realtime)

supabase/
└── migrations/                # Database schema migrations (ready but not active)

tests/
└── e2e/                       # Playwright E2E tests (00-07 + happy-path)
```

### Key Architectural Patterns

#### 1. Demo Mode vs Production Mode
The app currently operates in **demo mode** where all data lives in localStorage with `ns_*` prefixed keys. This enables:
- Offline-first development and demos
- No backend dependencies for testing
- Deterministic E2E tests
- Easy CEO/stakeholder demos

**Demo Stores Architecture**:
- Each store (user, event, registration, matching) uses Zustand with `persist` middleware
- All stores use `ns_` prefix for localStorage keys
- BroadcastChannel API syncs state across browser tabs
- Window storage events provide Safari fallback

**Production Transition Path**: Replace localStorage stores with Supabase queries using the existing schema in `supabase/migrations/`.

#### 2. Role-Based Access Control
Four user roles with different permissions:

| Role | Access | Key Pages |
|------|--------|-----------|
| **Guest** | Registration only | `/register` |
| **User** | Events, matching, messages | `/events`, `/match`, `/messages` |
| **Host** | Event management (own city only) | `/host/*` |
| **Admin** | Full access | `/admin/*` |

**Route Guards**: Implemented in page components - unauthorized users are redirected to their default route.

**Role Switching (Demo)**: Dropdown in navigation allows switching roles for testing.

#### 3. Per-Event Questionnaire Flow
**IMPORTANT**: There is NO global onboarding questionnaire. Questionnaires are per-event.

**RSVP → Questionnaire → Matching Flow**:
1. User clicks "RSVP" → Creates HOLD registration (10min expiry)
2. User clicks "Pay Now" → Mock payment → Status: CONFIRMED
3. **After payment confirmed**: Questionnaire section appears on event page
4. User answers exactly 10 questions (all pre-filled with default value 3)
5. Save answers → `questionnaireCompleted = true`
6. Only users with completed questionnaire + checked-in status are eligible for matching

**Data Model** (in demo stores):
```typescript
Registration = {
  eventId, userEmail,
  rsvpStatus: "hold" | "confirmed" | "waitlisted",
  paymentStatus: "pending" | "paid",
  attendanceStatus: "none" | "checked_in" | "missing",
  questionnaireCompleted: boolean,
  answers: Record<questionId, 1-4>
}
```

#### 4. Matching Algorithm
**Questionnaire-based** (not AI embeddings yet):

**Algorithm Steps**:
1. Calculate per-question similarity: `sim = 1 - abs(answerA - answerB) / 3`
2. Apply question weights (default: 1, important: 2-3)
3. Compute weighted average: `score = Σ(weight × sim) / Σ(weight)`
4. Scale to 0-100: `finalScore = round(score × 100)`
5. Handle dealbreakers: Exclude if `diff >= 2` on dealbreaker questions
6. Generate explanations:
   - **Aligned**: Top 3 questions with highest similarity
   - **Mismatched**: Top 1-2 questions with lowest similarity

**Question Categories** (17 total):
- Lifestyle (5): Social preferences, work-life balance, dining
- Social (4): Strangers, networking, friendship values
- Values (4): Authenticity, growth, experiences, community
- Communication (3): Texting vs calls, directness, personal topics

**Match Eligibility Requirements**:
- RSVP confirmed + payment confirmed
- Attendance status = "checked_in"
- Questionnaire completed = true
- Event city matches user's city

#### 5. Mock Realtime Chat
**Feature Flag**: `NEXT_PUBLIC_ENABLE_CHAT=true` (disabled in prod by default)

**Implementation**:
- Uses **BroadcastChannel API** for tab-to-tab sync
- Persists messages in localStorage
- Window storage events for Safari fallback
- User switching via dropdown (for demo)
- Conversations created from match page "Message" button
- Works across multiple browser tabs without backend

**File**: `lib/chatStore.ts` (Zustand store with BroadcastChannel sync)

#### 6. Session Management
**Demo Mode**: localStorage-based sessions (`ns_session`)

**Production-Ready**: HMAC-signed tokens (`lib/auth/sessionToken.ts`)
- Tokens: `{payload}.{signature}` (base64url encoded)
- Payload: `{profile_id, invited_user_id, role, phone_e164, display_name, exp}`
- TTL: 7 days
- Secret: `APP_SESSION_SECRET` env var

**Invite Links**: QR codes with tokens (`/invite/[token]`) that create city-locked sessions. Claim is **button-based** ("Claim my invite →"), not auto-claim. Admins use `/admin/invite` to generate 1–50 tokens, view QR codes, copy URLs, and download a printable QR sheet.

## Important Patterns & Conventions

### When Adding Features

1. **Always check role requirements** - Use conditional rendering based on session role
2. **Demo mode first** - Build features with localStorage before Supabase integration
3. **Test with E2E** - Add Playwright tests with stable `data-testid` attributes
4. **Feature flags** - Use `NEXT_PUBLIC_*` env vars for experimental features
5. **Per-event questionnaires** - Never assume global questionnaire answers

### Database Integration Notes

**Current State**: Demo mode uses localStorage stores. Supabase schema exists but isn't active.

**When transitioning to production**:
1. **DO NOT delete demo stores** - They're useful for testing/demos
2. **Keep both modes** - Use feature flag `NEXT_PUBLIC_DEMO_MODE` to toggle
3. **Migration path**:
   - Replace `lib/demo/*Store.ts` reads with Supabase queries
   - Keep localStorage as fallback for offline demo mode
   - Use Supabase migrations in `supabase/migrations/`

**Supabase Schema** (ready in migrations):
- `profiles` - User profiles (auth.users reference)
- `invited_users` - Invite system
- `events` - Event details
- `event_questions` - Per-event questionnaire config
- `questions` - Question library
- `event_registrations` - RSVP + questionnaire answers
- `matches` - Match results
- `user_embeddings` - Future AI embeddings (pgvector)

### Testing Guidelines

**E2E Test Structure**:
- **00_smoke.spec.ts** - All pages load
- **01_navigation.spec.ts** - Nav links work
- **02_onboarding.spec.ts** - Registration flow (deprecated, use happy-path)
- **03_events.spec.ts** - Events RSVP flow
- **04_match.spec.ts** - Match feed, like/skip
- **05_chat_realtime.spec.ts** - Realtime chat (two tabs)
- **06_feature_flags.spec.ts** - Feature flag behavior
- **07_api_routes.spec.ts** - API endpoint validation
- **happy-path.spec.ts** - Full CEO demo flow (register → RSVP → match → chat)

**Test Selectors** (always use `data-testid`):
```typescript
// Navigation
"nav-home", "nav-events", "nav-match", "nav-admin", "nav-messages"

// Events
"event-card-{eventId}", "event-join-{eventId}"

// Match
"match-card-{userId}", "match-like-{userId}", "match-skip-{userId}"

// Chat
"conversation-{conversationId}", "message-input", "message-send"
```

**Test Helpers** (`tests/e2e/utils.ts`):
- `clearNsLocalStorage(page)` - Clear all `ns_*` keys
- `setChatUser(page, userId)` - Switch chat user
- `waitForMessage(page, text)` - Poll for message
- `isChatEnabled(page)` - Check feature flag

### Environment Variables

**Required**:
```bash
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=          # Supabase service role key
NEXT_PUBLIC_APP_URL=                # App URL (for invite links)
```

**Optional Feature Flags**:
```bash
NEXT_PUBLIC_ENABLE_CHAT=false       # Enable chat (default: disabled)
NEXT_PUBLIC_CHAT_MODE=mock          # "mock" or "supabase"
NEXT_PUBLIC_DEMO_MODE=true          # Enable demo mode features
NEXT_PUBLIC_PILOT_PRESEED=false     # Enable pilot preseed matching
NEXT_PUBLIC_DEMO_OTP=123456         # Override OTP for demos
APP_SESSION_SECRET=                 # HMAC secret for session tokens
```

## Common Tasks

### Adding a New Page
1. Create page in `app/[route]/page.tsx`
2. Add role check if needed:
   ```typescript
   const session = useSession();
   if (session.role !== "admin") redirect("/events");
   ```
3. Add nav link in `app/layout.tsx` (with role visibility check)
4. Add `data-testid` attributes for E2E tests
5. Add E2E test in `tests/e2e/`

### Adding a New Question
1. Edit `lib/questionnaire/questions.ts`
2. Add question to `QUESTIONNAIRE_QUESTIONS` array
3. Specify category, weight, and `isDealbreaker` if applicable
4. Demo users in `lib/matching/demoUsers.ts` need answers for new questions

### Running Matching Algorithm
**For a single event** (demo mode):
```typescript
import { runMatchingForEvent } from "@/lib/demo/matchingStore";
const matches = runMatchingForEvent(eventId);
```

**Manual calculation** (for testing):
```typescript
import { getMatchesForUser } from "@/lib/matching/questionnaireMatch";
const matches = getMatchesForUser(currentUser, candidateUsers);
```

### Seeding Demo Data
**Client-side** (localStorage):
```typescript
import { seedAllStores } from "@/lib/demo/seedAllStores";
seedAllStores(); // Creates demo users, events, registrations
```

**Server-side** (Supabase):
```bash
npm run seed:demo  # Runs scripts/seed-demo.cjs
```

### Debugging E2E Tests
```bash
# Run with browser visible
npx playwright test --headed

# Run in debug mode (step through)
npx playwright test --debug

# Run specific test
npx playwright test happy-path.spec.ts

# View trace
npx playwright show-trace trace.zip
```

## Deployment

**Vercel** (frontend):
1. Push to GitHub
2. Import repo in Vercel
3. Set environment variables (see above)
4. Deploy → Auto-build on push to `main`

**Supabase** (backend):
1. Create project at supabase.com
2. Run migrations: `supabase db push`
3. Configure RLS policies (when ready for production)
4. Set environment variables in Vercel

**Custom Domain**:
- Add CNAME: `app` → `cname.vercel-dns.com`
- Vercel auto-provisions SSL

## Production Readiness

**Currently Demo-Ready**:
- ✅ Full UI flows (registration → matching → chat)
- ✅ Questionnaire-based matching algorithm
- ✅ Role-based access control
- ✅ Mock realtime chat (BroadcastChannel)
- ✅ E2E test coverage
- ✅ Deterministic demo data

**Not Production-Ready** (requires Supabase integration):
- ❌ Real authentication (currently mock OTP)
- ❌ Database persistence (currently localStorage)
- ❌ Real-time sync (currently BroadcastChannel)
- ❌ Email notifications (logged to console)
- ❌ Payment processing (currently mock)
- ❌ AI embeddings (using questionnaire scores only)

**Migration Path**: See `README.md` "Production Implementation Plan" for detailed roadmap.

## Important Files

**Don't delete without checking**:
- `lib/demo/` - All demo stores (needed for testing/demos)
- `lib/matching/demoUsers.ts` - 25 demo users with varied answers
- `lib/questionnaire/questions.ts` - 17-question library (core matching logic)
- `supabase/migrations/` - Database schema (production-ready)
- `tests/e2e/` - E2E test suite (product validation)

**Frequently modified**:
- `app/layout.tsx` - Navigation and role-based visibility
- `lib/demo/demoStore.ts` - Main demo state (events, matches, likes)
- `lib/matching/questionnaireMatch.ts` - Matching algorithm

**Config files**:
- `.env.example` - Environment variable template
- `playwright.config.ts` - E2E test configuration
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
