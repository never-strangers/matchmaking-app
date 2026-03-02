# 🪩 Never Strangers — Matching Core v1

**Never Strangers** is an invite-only social-matching platform connecting people through curated events across Asia.  
This repo hosts the new **Matching Core** — a lightweight, AI-powered system replacing MatchBox, designed for scalability, ownership, and expansion.

---

## 🚀 Overview

**Goal:** Build a self-owned backend and web app for onboarding, event management, and AI-driven social matching.

| Layer | Tech | Purpose |
|-------|------|----------|
| Frontend | Next.js 15 + Tailwind CSS + TypeScript | Dynamic UI & routes |
| Backend | Supabase (PostgreSQL + Auth + Storage) | Database & authentication |
| AI Engine | OpenAI Embeddings + pgvector | User similarity matching |
| Hosting | Vercel (frontend) + Supabase (DB/API) | CI/CD and infra |
| Analytics | PostHog / Plausible | Behavior & retention tracking |

---

## 💡 Core Functionality

### 👤 User Onboarding
- **Basic Profile Setup** (`/onboarding`)
  - Name, email, city collection
  - Interest selection (Running, Books, Coffee, Tech, Fitness, Cinema)
- **Matching Customization** (`/onboarding/setup`)
  - Matching experience selection: Platonic, Romantic, or Professional
  - Age consideration preferences (Ignore or Consider)
  - Event details: title, host name, date
  - Tier selection: Free, Basic ($4/guest), Premium ($8/guest), Elite ($15/guest)
  - Guest count slider (0-500 guests)
- **Question Builder** (`/onboarding/questions`)
  - Question library with 6 categories: Suggested, Popular, Important, Spicy, Queer, Random
  - Search and filter functionality
  - Selected questions management (20-30 recommended)
  - Category-based question browsing

### 🎟️ Events Management
- **Events Feed** (`/events`)
  - Event listing with city and date information
  - Only **upcoming** events are shown; events whose start date/time is in the past are hidden from users (they remain visible to admins in `/admin/events`)
  - **Enter Event** opens a preview modal (poster, details, questionnaire status) with CTAs: Complete Questions or Continue to Event
  - Create new event button (admin)
- **Event Creation Flow** (`/events/new`)
  - **Setup Step** (`/events/new/setup`): Configure matching preferences, event details, tier, and guest count
  - **Questions Step** (`/events/new/questions`): Build custom questionnaire for event participants
  - Multi-step wizard interface with modern UI components

### 🎯 Matching System
- **Match Preview** (`/match`)
  - Matches revealed in **exactly 3 rounds** (Round 1, 2, 3); full-screen 3→2→1 countdown when each round is revealed, **triggered by the admin** (Reveal Round 1 / 2 / 3).
  - Display potential matches with profile information (name, score, aligned/mismatched reasons).
  - Card-based match presentation; attendees passively receive one match per round when the host reveals each round. See `docs/MATCH_REVEAL_AND_CHECKIN.md`.

### 🧮 Admin Dashboard
- **Main Dashboard** (`/admin`)
  - KPI metrics: Total Events, Active Users, This Month's events
  - Community members list with join dates
  - Past events timeline
- **Event detail** (`/admin/events/[id]`): **Guest list** with Payment, Ticket, **Check-in** / **Undo check-in** per attendee; **Run Matching** includes only checked-in (and paid, questionnaire-complete) attendees. See `docs/MATCH_REVEAL_AND_CHECKIN.md`.
- **Users** (`/admin/users`): Search and filter users by keyword (name, email, username, Instagram, phone), status (Pending/Approved/Rejected), city, gender, attracted_to; sort by registered date, status, or city; server-side pagination (25 per page). Approve/Reject/View per row without losing filters. API: `GET /api/admin/users` (query params: `q`, `status`, `city`, `gender`, `attracted_to`, `sort`, `page`, `page_size`). Admin-only; phone/email are never exposed to non-admin.
- **Matches Management** (`/admin/matches`)
  - **Step 1: Signups**
    - View and manage event signups
    - Track signup dates
  - **Step 2: Matching Algorithm**
    - Calculate optimal matches among guests
    - Romantic vs. Friend matching breakdown
    - Match score visualization (0-100%)
    - Match grouping system
    - Recalculate and options controls
    - Top matches preview
  - **Step 3: Finalization**
    - Finalize and publish event results
    - Notify followers functionality
  - Sidebar with comprehensive match pairs list

---

## 📊 Implementation Status

### ✅ Currently Implemented
- **UI Components**: Complete set of reusable components for flows, forms, cards, and admin panels
- **Onboarding Flow**: Full multi-step onboarding with profile setup, matching customization, and question builder
- **Event Creation**: Complete event setup wizard with matching preferences and questionnaire builder
- **Admin Dashboard**: KPI tracking, community management, and matches management interface
- **Routing**: All pages and navigation structure in place
- **Supabase Client**: Configured and ready for database integration (`lib/supabase/client.ts`)
- **API Route**: Test endpoint available at `/api/test` for Supabase connection verification

### 🔄 Currently Mocked Features

The following features are currently using mock data or localStorage and need database integration:

#### 📝 User Registration & Authentication
- **Phone Login (Demo)** (`/register`)
  - Name + Singapore phone only (`+65xxxxxxxx`)
  - Creates a local demo user profile in `localStorage` (`ns_users`)
  - Creates a local demo session in `localStorage` (`ns_session`)
  - No OTP verification (intentionally skipped for internal demos)

## Phone Login (Current) and Future Infra

**Current (internal demo):** Auth is client-only and stored in browser `localStorage`.
- **Session**: `ns_session` (current userId/phone/name/role)
- **Users**: `ns_users` (demo user profiles)
- **Security note**: This is not secure and is for demos only.

**Next steps (production-ready):**
1) Supabase Auth (Phone OTP) **or** Twilio/MessageBird/WhatsApp OTP  
2) Store users in Supabase Postgres (`profiles` table)  
3) Rate limiting + bot protection  
4) Normalize phone numbers (E.164) + expand beyond SG  
5) Session cookies (httpOnly) instead of `localStorage`  
6) Audit logs for host/admin actions  

#### 👤 User Profiles & Onboarding
- **Basic Onboarding** (`/onboarding`)
  - Form data stored in `localStorage`
  - No profile persistence
- **Matching Customization** (`/onboarding/setup`)
  - Event preferences stored in `localStorage`
  - No user profile linking
- **Question Selection** (`/onboarding/questions`)
  - Selected questions stored in `localStorage`
  - No question library database

#### 🎟️ Events Management
- **Events Listing** (`/events`)
  - Events stored in `localStorage`
  - No database persistence
  - No event status tracking
- **Event Creation** (`/events/new`)
  - Event data stored in `localStorage`
  - No event ownership/user association
  - No event slug generation/validation
- **Event Review** (`/onboarding/review`)
  - Account info stored in `localStorage`
  - No billing integration
  - No email notifications

#### 🎯 Matching System
- **Match Preview** (`/match`)
  - Uses hardcoded `mockMatches` array
  - No real matching algorithm
  - No user similarity calculations
- **Matching Algorithm** (`/admin/matches`)
  - Mock match pairs from `lib/admin/matches.mock.ts`
  - No AI embeddings (OpenAI + pgvector)
  - No cosine similarity calculations
  - No match score computation

#### 🧮 Admin Dashboard
- **KPIs** (`/admin`)
  - Hardcoded values from `lib/admin/mock.ts`
  - No real-time analytics
- **Community Members** (`/admin`)
  - Mock data from `lib/admin/mock.ts`
  - No follower relationship tracking
- **Followers List** (`/admin/followers`)
  - Mock data from `lib/admin/mock.ts`
  - No follower management
- **Past Events** (`/admin`)
  - Mock data from `lib/admin/mock.ts`
  - No event history tracking
- **Signups Management** (`/admin/matches`)
  - Mock signups from `lib/admin/matches.mock.ts`
  - No event signup tracking
  - No user-event relationships

#### 📚 Question Library
- **Question Database** (`lib/events/new/mock.ts`)
  - Hardcoded 72 questions
  - No database storage
  - No question management (CRUD)
  - No question categories management

---

## 🎭 Demo Version - Enforced Rules

The demo version now enforces all business rules end-to-end using localStorage and in-memory stores. See [docs/production-todos.md](./docs/production-todos.md) for what remains for production.

### ✅ Demo Features Implemented

- **Registration & OTP**: Mock email OTP verification (code: `123456`)
- **User Status**: PENDING → APPROVED/REJECTED workflow with 24h cooldown. In the Supabase-backed flows, rejected users see an explicit rejected state (not “pending”) and cannot reapply with the same email or Instagram handle.
- **City Locking**: City locked after approval; change requires admin approval
- **Event Filtering**: Approved users only see events in their city
- **Per-Event Questionnaire**: Answers stored per event; >=10 answers required for RSVP
- **RSVP State Machine**: HOLD (10min) → CONFIRMED (after payment) → WAITLIST
- **Capacity Enforcement**: Hard capacity limits with waitlist promotion
- **Overlap Prevention**: Users cannot RSVP to overlapping events
- **Check-in System**: Check-in required before matching
- **Matching Constraints**: Gender/orientation, historical exclusion, max 3 matches
- **Mutual Like**: Chat unlocked only after mutual like
- **Notifications**: In-app notification center with email logging

### 🎬 CEO Demo Script

**Step 1: Create Users**
1. Navigate to `/register`
2. Fill out registration form (email, name, city, gender, etc.)
3. Submit → OTP page appears
4. Enter OTP: `123456` → Account created with status `PENDING`

**Step 2: Admin Approval**
1. Switch to Admin role (top right)
2. Go to `/admin` → "User Approvals" tab
3. Click "Approve" on pending user
4. User receives notification (check `/notifications`)
5. User's city is now locked

**Step 3: Answer Questions & RSVP**
1. Switch back to approved user
2. Go to `/events` → See events in user's city only
3. Click on event → Answer at least 10 questions (if not done)
4. Click "RSVP" → Creates HOLD (10 min expiry)
5. Click "Pay Now" → Mock payment → RSVP becomes CONFIRMED

**Step 4: Check-in & Matching**
1. Switch to Admin → `/admin` → "Events" tab
2. Find event → Check in all confirmed attendees
3. When all checked in → "Run Matching" button appears
4. Click "Run Matching" → Matches created
5. Users receive match notifications

**Step 5: Mutual Like & Chat**
1. Switch to user → `/match` → Select event
2. See matches → Click "Like" on a match
3. If other user also likes → Mutual like notification
4. "Message" button appears → Click to open chat
5. Chat is gated: only works if mutual like exists

**Step 6: Test Edge Cases**
- Try RSVPing to overlapping events → Blocked
- Let RSVP hold expire → Seat released
- Fill event capacity → Next RSVP goes to waitlist
- Reject user → Try to reapply → 24h cooldown enforced

### 📋 Demo vs Production

| Feature | Demo | Production |
|---------|------|------------|
| Data Storage | localStorage | PostgreSQL |
| Authentication | Mock OTP | Real email OTP |
| Payments | Mock button | Stripe/PayPal |
| Notifications | In-app + console.log | Email + Push |
| Background Jobs | None | Job queue |
| Real-time | BroadcastChannel | WebSockets |
| Security | Minimal | Full hardening |

See [docs/production-todos.md](./docs/production-todos.md) for complete production checklist.

---

## 🏗️ Production Implementation Plan

### Phase 1: Database Schema & Authentication

#### 1.1 Supabase Database Schema

```sql
-- Users & Authentication
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  city TEXT,
  birth_date DATE,
  gender TEXT,
  profile_photo_url TEXT,
  instagram_username TEXT,
  bio TEXT,
  interests TEXT[],
  attracted_to TEXT[],
  looking_for TEXT[],
  verification_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  host_name TEXT,
  event_date DATE,
  city TEXT,
  matching_mode TEXT, -- 'Platonic', 'Romantic', 'Professional'
  age_mode TEXT, -- 'Ignore', 'Consider'
  tier_id TEXT, -- 'free', 'basic', 'premium', 'elite'
  max_guests INTEGER,
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Questions
CREATE TABLE event_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id),
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions Library
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  category TEXT, -- 'Suggested', 'Popular', 'Important', 'Spicy', 'Queer', 'Random'
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Signups
CREATE TABLE event_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  answers JSONB, -- Store question answers
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_a_id UUID REFERENCES profiles(id),
  user_b_id UUID REFERENCES profiles(id),
  match_type TEXT, -- 'romantic', 'friend'
  compatibility_score DECIMAL(5,2),
  group_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Embeddings (for AI matching)
CREATE TABLE user_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  embedding vector(1536), -- OpenAI embedding dimension
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Followers
CREATE TABLE followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Create indexes
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_signups_event ON event_signups(event_id);
CREATE INDEX idx_signups_user ON event_signups(user_id);
CREATE INDEX idx_matches_event ON matches(event_id);
CREATE INDEX idx_user_embeddings_user ON user_embeddings(user_id);
CREATE INDEX idx_followers_follower ON followers(follower_id);
CREATE INDEX idx_followers_following ON followers(following_id);
```

#### 1.2 Authentication Flow
- **Supabase Auth Integration**
  - Email/password authentication
  - Magic link authentication
  - Social OAuth (Google, Instagram)
  - Session management with cookies
  - Protected routes with middleware
  - Role-based access control (admin, organizer, user)

#### 1.3 File Storage
- **Supabase Storage**
  - Profile photos: `profiles/{user_id}/photo.jpg`
  - Event images: `events/{event_id}/images/`
  - RLS policies for access control

---

### Phase 2: Core Features Implementation

#### 2.1 User Registration & Profiles
- Replace `localStorage` with Supabase `profiles` table
- Implement profile photo upload to Supabase Storage
- Add email verification workflow
- Create profile management API routes
- Implement profile completion tracking

#### 2.2 Events Management
- Replace `localStorage` with Supabase `events` table
- Implement event CRUD operations
- Add event slug generation and validation
- Create event ownership/permissions system
- Implement event status workflow (draft → active → completed)

#### 2.3 Question Library
- Migrate questions from `lib/events/new/mock.ts` to `questions` table
- Create question management API
- Add question categories management
- Implement question search and filtering

#### 2.4 Event Signups
- Replace mock signups with `event_signups` table
- Implement signup form with question answers
- Add signup approval workflow
- Create signup management for organizers

---

### Phase 3: Matching Algorithm

#### 3.1 AI Embeddings Generation
- **OpenAI Integration**
  - Generate embeddings for user profiles
  - Combine: bio, interests, answers, preferences
  - Store in `user_embeddings` table with pgvector
  - Update embeddings when profile changes

#### 3.2 Matching Algorithm
- **Similarity Calculation**
  - Use pgvector cosine similarity
  - Calculate compatibility scores (0-100)
  - Apply filters (gender, age, city, preferences)
  - Group matches by type (romantic vs friend)

#### 3.3 Match Generation API
- Create `/api/events/[id]/matches` endpoint
- Run matching algorithm for event signups
- Store results in `matches` table
- Support recalculation and options

---

### Phase 4: Admin Dashboard

#### 4.1 Real-time KPIs
- Query Supabase for:
  - Total events count
  - Active users (last 30 days)
  - Events this month
  - Total matches created
  - Signup conversion rates

#### 4.2 Community Management
- Replace mock data with `followers` table queries
- Implement follower search and filtering
- Add follower export functionality
- Create follower analytics

#### 4.3 Event Management
- Load real events from database
- Implement event filtering and search
- Add event status management
- Create event analytics dashboard

---

### Phase 5: Additional Features

#### 5.1 Email Notifications
- **Email Service Integration** (SendGrid/Resend)
  - Registration confirmation
  - Profile verification status
  - Event creation confirmation
  - Match notifications
  - Event reminders

#### 5.2 Billing Integration
- **Payment Processing** (Stripe)
  - Tier-based pricing
  - Per-guest billing
  - Payment webhooks
  - Invoice generation

#### 5.3 Analytics
- **PostHog/Plausible Integration**
  - User behavior tracking
  - Event conversion funnels
  - Match success rates
  - Retention metrics

---

### Phase 6: Performance & Security

#### 6.1 Database Optimization
- Add database indexes for common queries
- Implement query optimization
- Set up connection pooling
- Add caching layer (Redis)

#### 6.2 Security
- Implement Row Level Security (RLS) policies
- Add rate limiting
- Input validation and sanitization
- CSRF protection
- XSS prevention

#### 6.3 Monitoring
- Error tracking (Sentry)
- Performance monitoring
- Database query monitoring
- Uptime monitoring

---

## 📁 Project Structure

```
neverstrangers/
├── app/                    # Next.js 15 App Router
│   ├── admin/              # Admin dashboard pages
│   │   ├── matches/        # Matches management
│   │   └── page.tsx        # Admin main dashboard
│   ├── api/                # API routes
│   │   └── test/           # Supabase test endpoint
│   ├── events/             # Events pages
│   │   ├── new/            # Event creation flow
│   │   │   ├── setup/      # Event setup step
│   │   │   └── questions/  # Question builder step
│   │   └── page.tsx        # Events listing
│   ├── match/              # Matching pages
│   ├── onboarding/         # User onboarding flow
│   │   ├── setup/          # Matching customization
│   │   └── questions/       # Question selection
│   ├── layout.tsx          # Root layout with navigation
│   └── page.tsx            # Homepage
├── components/             # React components
│   ├── admin/              # Admin-specific components
│   └── events/             # Event-related components
│       └── new/            # Event creation components
├── lib/                    # Utilities and helpers
│   ├── admin/              # Admin mock data
│   ├── events/             # Event mock data
│   └── supabase/           # Supabase client setup
└── public/                 # Static assets
```

---

## ⚙️ Quick Start

```bash
# 1. Clone repo
git clone https://github.com/neverstrangers/matching-core.git
cd matching-core

# 2. Install dependencies
npm install

# 3. Add environment variables
# Create .env.local file with:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# Optional for Stripe payment: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL

# 4. Run locally
npm run dev

# 5. Test Supabase connection
# Visit http://localhost:3000/api/test
```

> 📖 **For a complete demo walkthrough, see [DEMO_FLOW.md](./DEMO_FLOW.md)**

### Stripe payment (local)

To test per-event payment locally:

1. Use **test** keys in `.env.local`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
2. In a separate terminal: `stripe listen --forward-to localhost:3000/api/stripe/webhook` (use the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET`).
3. Run the app, create a paid event (admin), complete questions, then use **Pay now**; pay with test card `4242 4242 4242 4242`.

See **[docs/STRIPE_LOCAL_TESTING.md](./docs/STRIPE_LOCAL_TESTING.md)** for full steps and webhook simulation.

### Error handling

- A generic server error page is available at `/500` for unexpected failures during runtime and export.

### Supabase event cleanup + seeding (dev/local)

For deterministic event data in dev/local (and staging, if explicitly confirmed), you can reset events using Supabase directly:

```bash
# Cleanup all events except a keep-list (example keeps the original seeded event)
npm run cleanup:events -- --keep 00000000-0000-0000-0000-000000000001

# Seed a fixed set of demo events (past/future/free/paid/tiered)
SEED_CONFIRM=true npm run seed:events

# One-shot reset: cleanup (delete all) + seed
npm run reset:events
```

Safety:
- `cleanup:events` and `seed:events` **require** `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- `seed:events` and `reset:events` require `SEED_CONFIRM=true` and will refuse to run when `NODE_ENV="production"` unless `SEED_CONFIRM=true` is set.
- `cleanup:events --dry-run` shows how many rows per table *would* be deleted without changing data.

The seeding script creates:
- Past Friends Mixer (Free)
- Future Friends Mixer (Free)
- Dating Night (Paid Single Price)
- Friends Mixer (Paid Single Price)
- Big Event (Tiered Tickets) with Early Bird/Wave 1/Wave 2/VIP ticket types

### Supabase test/demo user + event seeding (multi-city QA)

For QA and manual E2E against the **Supabase-backed flows**, you can seed realistic users, profiles, events, attendees, and questionnaire answers that respect the existing gating rules (pending/approved/rejected, payment, check-in, questionnaire-complete).

```bash
# Seed multi-city test data (default cities: Singapore, Bangkok, Manila)
# NOTE: requires:
#   - NEXT_PUBLIC_SUPABASE_URL
#   - SUPABASE_SERVICE_ROLE_KEY
#   - SEED_USER_PASSWORD (password for all seeded auth users)
SEED_CONFIRM=true SEED_USER_PASSWORD="ChangeMe123!" npm run seed:test-data

# Examples:
# - Custom label (shows up in seed_runs.label + output JSON filename)
SEED_CONFIRM=true SEED_USER_PASSWORD="ChangeMe123!" npm run seed:test-data -- --label "e2e-demo-2026-02-27"

# - Custom cities + users per city (10 approved is the default)
SEED_CONFIRM=true SEED_USER_PASSWORD="ChangeMe123!" npm run seed:test-data -- --cities "Singapore,Bangkok,Manila" --users-per-city 12

# Dry-run (no DB writes, prints what would happen)
npm run seed:test-data -- --dry-run --cities "Singapore,Bangkok"
```

What this script does (per seed run):

- Creates a `seed_runs` row (`public.seed_runs`) and tags data via `seed_run_id`.
- Per city:
  - 10 **approved** users (eligible for matching)
  - 2 **pending_approval** users (can log in but remain gated)
  - 2 **rejected** users (remain blocked)
- Users have realistic profile fields filled (full name, dob ≥ 21, gender, attracted_to, instagram, reason text, phone, `preferred_language`).
- Events:
  - A past free **friends** mixer (primary city, e.g. Singapore)
  - A future **tiered paid** flagship event with Early Bird/Wave1/Wave2/VIP tiers (primary city)
  - For **each city**:
    - 1 upcoming free **friends** mixer
    - 1 upcoming **paid** dating event
- Attendees (per upcoming event in each city):
  - 8–10 approved users from that city
  - Payment:
    - Free events: treated as paid/bypass
    - Paid events: ~70–80% `payment_status='paid'`, remaining `unpaid` to exercise gating
  - Check-in:
    - ~70% `checked_in = true`, ~30% `false` (matching only ever uses checked-in + paid + questionnaire-complete)
  - Questionnaire:
    - Answers inserted for **all event questions** so questionnaire is complete and matching-ready
    - Answer patterns use 2–3 clusters per city (extrovert / introvert / balanced) with small noise so match scores look realistic instead of random.

Importantly:

- The script **does NOT** create any `match_results` / `match_reveals` rows.
- Matching still only happens when an **admin clicks “Run Matching”** on the existing `/admin/events/[id]` page.
- Pending/rejected users remain fully gated; only approved users are joined as attendees.

All created data is tagged by `seed_run_id` for safe cleanup later.

### Cleanup seeded test data

You can clean up seeded data by `seed_run_id` using:

```bash
# Dry-run cleanup (recommended first) – shows how many rows would be removed per table
npm run cleanup:test-data -- --label "e2e-demo-2026-02-27" --dry-run

# Actual cleanup by label (ILike match on seed_runs.label)
SEED_CONFIRM=true npm run cleanup:test-data -- --label "e2e-demo-2026-02-27"

# Or cleanup by explicit seed_run id
SEED_CONFIRM=true npm run cleanup:test-data -- --run-id "<uuid-from-seed_runs>"
```

Safety and behaviour:

- Refuses to run destructive cleanup unless `SEED_CONFIRM=true`.
- Refuses to run in `NODE_ENV=production` without `SEED_CONFIRM=true`.
- Uses `public.seed_runs` + `seed_run_id` tags on:
  - `profiles`, `invited_users`, `events`, `event_attendees`, `answers`
- Cleanup script removes, in a safe order:
  - `answers`, `event_attendees`, `events`, `invited_users` tagged with the run
  - Per-event data for those events: `match_reveal_queue`, `match_reveals`, `match_results`, `likes`, `match_runs`, `event_ticket_types`
  - `profiles` tagged with the run
  - Supabase **auth users** corresponding to those profiles (via `auth.admin.deleteUser`)
  - Finally, the `seed_runs` rows themselves
- A JSON summary is written to `scripts/.seed-output/cleanup-test-data-*.json` for audit trails when not in dry-run mode.

---

## 🚀 Deployment to Vercel

### Step 1: Push to GitHub

First, make sure your code is in a Git repository:

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create a repository on GitHub, then push
git remote add origin https://github.com/yourusername/your-repo-name.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Vercel

1. **Go to [Vercel](https://vercel.com)** and sign in (or create an account)

2. **Import your GitHub repository:**
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

3. **Configure Environment Variables:**
   - In the project settings, go to "Environment Variables"
   - Add the following variables:
     - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - Make sure to add them for **Production**, **Preview**, and **Development** environments

4. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy your app automatically
   - You'll get a URL like `your-app.vercel.app`

### Step 3: Configure Custom Domain (app.domain.com)

1. **In Vercel Dashboard:**
   - Go to your project → "Settings" → "Domains"
   - Click "Add Domain"
   - Enter `app.domain.com` (replace `domain.com` with your actual domain)

2. **Configure DNS:**
   - Vercel will show you DNS records to add
   - Go to your domain registrar (where you bought the domain)
   - Add a **CNAME record**:
     - **Name/Host:** `app`
     - **Value/Target:** `cname.vercel-dns.com` (or the specific value Vercel provides)
     - **TTL:** 3600 (or default)

3. **Wait for DNS Propagation:**
   - DNS changes can take a few minutes to 48 hours
   - Vercel will automatically detect when DNS is configured correctly
   - Once verified, your app will be live at `app.domain.com`

### Alternative: Using Vercel CLI

You can also deploy using the Vercel CLI:

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

### Environment Variables in Vercel

After deployment, you can add/update environment variables:
- Via Dashboard: Project → Settings → Environment Variables
- Via CLI: `vercel env add VARIABLE_NAME`

---

## 📝 Notes

- Vercel automatically builds on every push to your main branch
- Preview deployments are created for pull requests
- Environment variables are encrypted and secure
- Custom domains support HTTPS automatically via Vercel's SSL certificates

---

## Internal Pilot (Preseed Matching Demo)

Enable a fast matching demo that skips event RSVP/payment/check-in and uses preseed profiles + questionnaire answers.

### How to run

1. Set the feature flag:

```bash
NEXT_PUBLIC_PILOT_PRESEED=true
```

2. Start the app:

```bash
npm run dev
```

3. Sign in (Supabase Auth if configured) or use the existing demo flow.
   - If the signed-in email matches an entry in `lib/pilot/preseedUsers.ts`, you’ll be mapped to that preseed profile.
   - If there’s no match, a new deterministic pilot profile is created with default answers \(= 3\).

### Using the dashboard

- Visit `/match` (it will redirect to `/pilot` when the flag is enabled)
- The Pilot dashboard shows:
  - Top matches + score \(0–100\)
  - Why you matched (top aligned questions + top mismatch)
  - Optional: edit 10 answers and re-run instantly

---

## 💬 Demo Chat (Mock Realtime)

The app includes a **demo-ready mocked realtime chat** system for CEO demonstrations. This is a fully functional chat UI that works across multiple browser tabs/windows without requiring any backend infrastructure.

### How It Works

The chat system uses:
- **BroadcastChannel API** for realtime synchronization between tabs
- **localStorage** for message persistence
- **Window Storage Events** as a fallback for Safari compatibility

### Demo Instructions

1. **Open Two Browser Tabs**:
   - Navigate to the app in both tabs
   - Go to `/messages` in both tabs

2. **Select Different Users**:
   - In Tab 1: Click the user dropdown in the header → Select "Mikhail"
   - In Tab 2: Click the user dropdown in the header → Select "Anna"

3. **Start a Conversation**:
   - In Tab 1: Go to `/match` → Click "Message" on Anna's profile
   - This creates a conversation and opens the chat thread

4. **Send Messages**:
   - Type a message in Tab 1 and click "Send"
   - The message will instantly appear in Tab 2
   - Messages persist in localStorage, so refreshing won't lose data

5. **Test Realtime Sync**:
   - Send messages from either tab
   - Watch them appear instantly in the other tab
   - Try typing (you'll see "Typing..." indicator)

### Features

- ✅ **Realtime sync** between tabs using BroadcastChannel
- ✅ **Message persistence** in localStorage
- ✅ **User switching** via dropdown in chat header
- ✅ **Conversation list** with last message preview and timestamps
- ✅ **Unread badges** (fake, based on message count)
- ✅ **Message bubbles** aligned left/right based on sender
- ✅ **Typing indicators** (local only)
- ✅ **Auto-scroll** to latest message
- ✅ **Match page integration** - "Message" button creates conversations

### File Structure

```
app/
  messages/
    page.tsx              # Conversation list
    [id]/
      page.tsx            # Chat thread view
components/
  Chat/
    ChatHeader.tsx        # User dropdown + conversation title
    ConversationListItem.tsx
    MessageBubble.tsx
    MessageComposer.tsx
lib/
  chatStore.ts            # Mock store with BroadcastChannel
types/
  chat.ts                 # TypeScript types
```

### Environment Variables

Add to `.env.local`:

```bash
# Enable chat (default: enabled in dev, disabled in prod)
NEXT_PUBLIC_ENABLE_CHAT=true

# Chat mode (default: "mock")
NEXT_PUBLIC_CHAT_MODE=mock
```

### Feature Flags

The chat system respects feature flags:

- **`NEXT_PUBLIC_ENABLE_CHAT`**: 
  - Set to `"false"` to completely disable chat
  - Default behavior: enabled in dev, disabled in prod (fail-safe)
  - When disabled: "Messages" nav link is hidden, routes show "Chat Disabled"

- **`NEXT_PUBLIC_CHAT_MODE`**:
  - `"mock"` (default): Uses BroadcastChannel + localStorage
  - `"supabase"`: Future production mode (not implemented yet)

---

## 🔄 Rollback to Production

### Removing Demo Chat

The demo chat is designed to be easily removable when transitioning to production:

#### Option 1: Disable via Environment Variable (Recommended)

Set in Vercel environment variables:
```bash
NEXT_PUBLIC_ENABLE_CHAT=false
```

This will:
- Hide the "Messages" nav link
- Show "Chat Disabled" message on chat routes
- Keep code intact for future use

#### Option 2: Complete Removal

Delete the following files/folders:

```bash
# Routes
rm -rf app/messages

# Components
rm -rf components/Chat

# Library
rm lib/chatStore.ts

# Types
rm types/chat.ts
```

Then remove the Messages nav link from `app/layout.tsx`:

```tsx
// Remove this block:
{process.env.NEXT_PUBLIC_ENABLE_CHAT !== "false" && (
  <Link href="/messages">Messages</Link>
)}
```

And remove the Message button from `app/match/page.tsx`.

#### Database Migration

**No database migration required** - the mock chat uses localStorage only and doesn't create any database tables.

#### Cleanup Checklist

- [ ] Remove chat routes (`app/messages/*`)
- [ ] Remove chat components (`components/Chat/*`)
- [ ] Remove chat store (`lib/chatStore.ts`)
- [ ] Remove chat types (`types/chat.ts`)
- [ ] Remove Messages nav link from layout
- [ ] Remove Message buttons from match page
- [ ] Remove chat-related environment variables from `.env.example`
- [ ] Update README to remove chat documentation

---

## 📝 Notes

- Vercel automatically builds on every push to your main branch
- Preview deployments are created for pull requests
- Environment variables are encrypted and secure
- Custom domains support HTTPS automatically via Vercel's SSL certificates

---

## 🎯 Demo Happy Path (Fully Automated)

The app includes a complete, deterministic demo flow that works entirely with localStorage and BroadcastChannel (no external dependencies). This is perfect for CEO demos and testing.

### Running the Demo

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Run the full happy path E2E test:**
   ```bash
   npm run test:e2e -- happy-path.spec.ts
   ```

### Happy Path Flow

The automated test validates this complete flow:

1. **Registration** → `/register`
   - Fill name, email, city (Singapore)
   - Enter OTP: `123456`
   - Redirects to `/events` with "Pending admin approval" banner

2. **Admin Approval** → `/admin`
   - Switch to Admin role
   - Approve user → City locked + notification sent

3. **Answer Questions** → `/events/[eventId]/questions`
   - Shows exactly 10 questions
   - All pre-filled with default value 3 (Agree)
   - Save answers → Questionnaire completed

4. **RSVP** → `/events`
   - Click "RSVP" → Creates HOLD registration
   - Click "Pay Now" → Mock payment → CONFIRMED status

5. **Check-in & Matching** → `/admin`
   - Check in attendee
   - "Check In All" button
   - "Run Matching Now" appears after all checked in
   - Creates matches + sends notifications

6. **View Matches** → `/match`
   - Shows matches for attended events in user's city
   - Displays match score and alignment highlights

7. **Like Match** → Mutual Like
   - Like a match
   - Switch to other user → Like back
   - "Message" button appears on mutual like

8. **Chat** → `/messages/[conversationId]`
   - Message input visible at bottom
   - Send messages
   - Realtime sync works across two tabs (BroadcastChannel)

### Feature Flags

Set these environment variables (or use `.env.local`):

```bash
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_CHAT_MODE=mock
NEXT_PUBLIC_DEMO_OTP=123456
```

### Deterministic Data

The demo uses fixed IDs and data:
- Event ID: `event_coffee` (Singapore)
- Admin ID: `admin_001`
- Demo users: `usr_mikhail`, `usr_anna`, etc.
- Default city: Singapore

All data persists in localStorage with `ns_*` keys and can be reset by clearing localStorage or running the test (which auto-resets).

---

## 🧪 E2E Test Suite & Demo

The project includes a **comprehensive Playwright E2E test suite** that validates all existing functionality and doubles as a product demo script. The suite covers every page and key interaction in the application.

### Quick Start

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# View test report
npm run test:e2e:report
```

### Test Organization

The test suite is organized into focused spec files:

- **`00_smoke.spec.ts`** - Basic page load validation
- **`01_navigation.spec.ts`** - Navigation and routing
- **`02_onboarding.spec.ts`** - Onboarding form and validation
- **`03_events.spec.ts`** - Events listing and joining
- **`04_match.spec.ts`** - Match feed, like/skip, match creation
- **`05_chat_realtime.spec.ts`** - Realtime chat in two tabs
- **`06_feature_flags.spec.ts`** - Feature flag behavior
- **`07_api_routes.spec.ts`** - API endpoint validation
- **`happy-path.spec.ts`** - Complete CEO demo flow (registration → matching → chat)

### Test Coverage

The suite validates:

1. **Smoke Tests** - All pages load without crash
2. **Navigation** - Nav links work, Messages link visibility based on feature flag
3. **Onboarding** - Form submission, validation, persistence
4. **Events** - Event listing, joining, persistence across refresh
5. **Matching** - Match feed, like/skip actions, match creation, state persistence
6. **Chat Realtime** - Two-tab realtime messaging (if chat enabled)
7. **Feature Flags** - Chat disabled behavior
8. **API Routes** - `/api/test` and `/api/demo/reset` endpoints

### Demo Mode

The E2E tests run in **demo mode** using localStorage:

- All data persists in browser localStorage (prefix: `ns_*`)
- Tests automatically clear localStorage before each run (via `clearNsLocalStorage()`)
- No database required - perfect for demos
- Feature flag: `NEXT_PUBLIC_DEMO_MODE=true` (optional)

### Running Against Different Environments

**Local Development:**
```bash
npm run test:e2e
# Uses http://localhost:3000 (auto-starts dev server)
```

**Deployed Preview (Vercel):**
```bash
PLAYWRIGHT_BASE_URL=https://your-preview-url.vercel.app npm run test:e2e
```

### Test Selectors

All UI elements use stable `data-testid` attributes (never fragile CSS selectors):

**Navigation:**
- `nav-home`, `nav-onboarding`, `nav-events`, `nav-match`, `nav-admin`, `nav-messages`

**Home:**
- `home-title`, `home-cta-onboarding`, `home-cta-match`

**Onboarding:**
- `onboarding-name`, `onboarding-email`, `onboarding-city`
- `onboarding-interest-{name}` (e.g., `onboarding-interest-running`)
- `onboarding-submit`, `onboarding-success`

**Events:**
- `events-title`, `event-card-{eventId}`, `event-join-{eventId}`, `event-joined-{eventId}`

**Match:**
- `match-title`, `match-card-{userId}`, `match-like-{userId}`, `match-skip-{userId}`
- `match-created`, `match-message-{userId}`

**Admin:**
- `admin-title`, `admin-users-table`, `admin-events-table`, `admin-matches-table`

**Chat:**
- `messages-title`, `conversation-{conversationId}`, `chat-user-switcher`
- `chat-thread-title`, `message-input`, `message-send`, `message-bubble-{messageId}`

**Disabled States:**
- `chat-disabled`

### Test Helpers

The `tests/e2e/utils.ts` module provides:

- `clearNsLocalStorage(page)` - Clears all localStorage keys starting with "ns_"
- `setChatUser(page, userId)` - Sets chat user via dropdown
- `gotoAndAssertTitle(page, url, testId)` - Navigates and asserts page title
- `safeExpectVisible(page, testId)` - Safe visibility check with retry
- `isChatEnabled(page)` - Checks if chat is enabled
- `waitForMessage(page, messageText)` - Waits for message with polling

### Demo Store

The `lib/demoStore.ts` module provides:

- `setDemoUser()` / `getDemoUser()` - User profile management
- `markEventJoined()` / `isEventJoined()` - Event participation
- `markLiked()` / `isLiked()` - Match likes
- `createMatch()` / `listMatches()` - Match creation
- `resetDemoData()` - Clear all demo data

### CEO Demo Script

For a **shareable, step-by-step demo script** for CEO/stakeholder presentations, see:

📖 **[docs/CEO_DEMO_SCRIPT.md](./docs/CEO_DEMO_SCRIPT.md)**

This script includes:
- 5-minute narrative structure
- Step-by-step click path
- "What's mocked vs real" section
- Q&A cheat sheet
- Rollback/safety instructions

### CI Integration

The E2E tests can run in CI/CD pipelines:

- GitHub Actions workflow included (`.github/workflows/e2e.yml`)
- Runs on pull requests
- Generates HTML reports
- Screenshots and videos on failure
- Trace files for debugging

### Test Performance

- **Total Duration:** <2-3 minutes for full suite
- **Deterministic:** Tests are repeatable and stable
- **Fast:** Uses `expect.poll()` for realtime checks (no arbitrary timeouts)
- **Reliable:** All tests use `data-testid` selectors (no fragile CSS)

### Notes

- **No Backend Required:** All functionality uses localStorage for demo
- **Production Ready:** Tests validate production-ready UI
- **Demo Script:** The test flow doubles as a product demonstration script
- **Coverage:** 100% of core user flows validated

---

## 🎯 Matching Algorithm (Questionnaire-based Demo)

The app includes a **demo-ready questionnaire-based matching algorithm** that provides deterministic, explainable match scores based on user responses to a 17-question survey.

### How It Works

#### Answer Scale

Users answer questions on a 1-4 scale:
- **1 = Strongly Disagree**
- **2 = Disagree**
- **3 = Agree**
- **4 = Strongly Agree**

#### Question Categories

The questionnaire includes 17 questions across 4 categories:

- **Lifestyle** (5 questions): Social preferences, work-life balance, dining habits
- **Social** (4 questions): Comfort with strangers, networking preferences, friendship values
- **Values** (4 questions): Authenticity, personal growth, experiences vs. possessions, community
- **Communication** (3 questions): Texting vs. calls, directness, personal topics

#### Matching Algorithm

1. **Similarity Calculation per Question**
   - Difference: `diff = abs(answerA - answerB)` (range: 0-3)
   - Similarity: `sim = 1 - diff/3` (range: 0-1)
     - Identical answers (diff=0) → sim=1.0
     - One point difference (diff=1) → sim=0.67
     - Two point difference (diff=2) → sim=0.33
     - Maximum difference (diff=3) → sim=0.0

2. **Weighted Score Calculation**
   - Each question has a weight (default: 1, important questions: 2-3)
   - Weighted average: `score = sum(weight_i × sim_i) / sum(weight_i)`
   - Final score: `round(score × 100)` → 0-100 scale

3. **Dealbreakers**
   - Questions marked as `isDealbreaker: true` enforce strict matching
   - If `diff >= 2` on a dealbreaker question → candidate is **excluded** (score = null)
   - Example dealbreakers:
     - "I enjoy large social gatherings" vs "I prefer deep 1:1 conversations"
     - These represent fundamental lifestyle incompatibilities

4. **Match Explanations**
   - **Aligned Reasons** (top 3):
     - Questions with highest similarity scores
     - Prefers perfect matches (sim=1.0)
     - Format: "You both agree: [question text]"
   - **Mismatched Reasons** (top 1-2):
     - Questions with lowest similarity scores
     - Highlights areas of difference
     - Format: "You differ on: [question text]"

### Demo Users Dataset

The system includes **25 demo users** with realistic answer patterns:
- Varied cities: Singapore, Hong Kong, Bangkok, Tokyo
- Different genders and intents (Romantic, Platonic, Professional)
- Diverse answer patterns to ensure varied match scores
- Default fallback user: "Mikhail" (if no onboarding answers exist)

### Feature Flag

The matching algorithm is gated behind `NEXT_PUBLIC_DEMO_MODE`:

- **Enabled** (`NEXT_PUBLIC_DEMO_MODE=true`):
  - Questionnaire appears in onboarding
  - Match page uses algorithm to rank candidates
  - Shows match scores, alignment reasons, and differences

- **Disabled** (not set or `false`):
  - Questionnaire hidden in onboarding
  - Match page shows placeholder message

### Data Storage

- **Questionnaire Answers**: Stored in `localStorage` under `ns_demo_answers`
- **User Profile**: Stored in `localStorage` under `ns_demo_user`
- **Skipped Users**: Stored in `localStorage` under `ns_demo_skipped_users`
- All data persists across page refreshes

### Why This Is a Strong MVP

1. **Deterministic**: Same answers always produce same matches
2. **Explainable**: Users see exactly why they matched (aligned questions)
3. **Transparent**: Differences are clearly shown
4. **Fast**: No API calls, pure client-side calculation
5. **Demo-Ready**: Works offline, no backend required

### Future Upgrade Path

This questionnaire-based approach can be upgraded to AI embeddings:

1. **Phase 1 (Current)**: Questionnaire-based matching
   - Fast, explainable, deterministic
   - Perfect for MVP and demos

2. **Phase 2 (Future)**: Hybrid approach
   - Combine questionnaire scores with embedding similarity
   - Weighted combination: `final_score = 0.6 × questionnaire + 0.4 × embedding`

3. **Phase 3 (Future)**: Full AI embeddings
   - Generate embeddings from user profiles + questionnaire answers
   - Use pgvector cosine similarity for matching
   - Keep questionnaire for explainability

### File Structure

```
types/
  questionnaire.ts              # Type definitions
lib/
  questionnaire/
    questions.ts                # 17 question definitions
  matching/
    demoUsers.ts                # 25 demo users with answers
    questionnaireMatch.ts      # Matching algorithm implementation
app/
  onboarding/
    page.tsx                    # Questionnaire UI (gated by DEMO_MODE)
  match/
    page.tsx                    # Match results with scores & explanations
```

### Usage Example

```typescript
import { getMatchesForUser } from "@/lib/matching/questionnaireMatch";
import { DEMO_USERS } from "@/lib/matching/demoUsers";

const currentUser: MatchUser = {
  id: "user1",
  name: "John",
  city: "Singapore",
  answers: {
    q_lifestyle_1: 4,
    q_lifestyle_2: 1,
    // ... all 17 questions
  },
};

const matches = getMatchesForUser(currentUser, DEMO_USERS);
// Returns: MatchResult[] sorted by score (highest first)
// Each result includes: user, score (0-100), aligned[], mismatched[]
```

### Testing

The matching algorithm is deterministic and can be tested by:
1. Completing onboarding with specific answers
2. Checking match scores on `/match` page
3. Verifying alignment/mismatch reasons match expectations
4. Testing dealbreakers (users with incompatible answers should be excluded)

---

## 👥 Roles (Demo)

The app now supports four distinct user roles with different access levels:

### Guest
- **Access**: Only `/register` page
- **Behavior**: 
  - All other tabs/routes hidden in navigation
  - If guest tries to access any other route directly: redirects to `/register`
  - Default role for new users

### User
- **Access**: `/events`, `/match`, `/messages` (if enabled)
- **Behavior**:
  - Can view events in their city
  - Can RSVP to events
  - After RSVP, must answer event questionnaire (10 questions) to be eligible for matching
  - No global "onboarding" anymore - questionnaires are per-event

### Host
- **Access**: `/host` (Host Dashboard), `/events` (read-only)
- **Behavior**:
  - Can create/manage events ONLY in their own city
  - Can view attendee list for events in their city
  - Can check in attendees / mark missing attendees
  - Cannot approve users globally (admin can still do approvals)
  - Host dashboard shows events in host's city only

### Admin
- **Access**: Full access to all routes
- **Behavior**:
  - Can do everything host can, plus global management
  - Can approve/reject users
  - Can manage events across all cities
  - Can run matching for any event

### Role Switching (Demo Mode)

In demo mode, users can switch roles using the role switcher in the navigation bar:
- Click "Role: [Current Role]" dropdown
- Select: Guest, User, Host, or Admin
- Page refreshes to apply role changes

---

## 🔄 Updated Flow

### No Global Onboarding

The global onboarding flow has been **removed**. Questionnaires are now **per-event** and collected **after RSVP + payment**.

### Per-Event Questionnaire After RSVP

**New RSVP Flow:**
1. User clicks "RSVP" → Creates HOLD (registration.status="hold")
2. User clicks "Pay Now" → Confirmed payment (paymentStatus="paid", rsvpStatus="confirmed")
3. **After payment confirmed**: Questionnaire section appears
4. User must answer exactly 10 questions (prefilled with default value 3)
5. After completing questionnaire: `registration.questionnaireCompleted=true`
6. Only questionnaire-completed attendees can appear in matching for that event

**Matching Eligibility:**
- User must have:
  - `rsvpStatus = "confirmed"` (payment confirmed)
  - `attendanceStatus = "checked_in"` (checked in by host)
  - `questionnaireCompleted = true` (completed questionnaire)
  - Event must be in user's city

**Questionnaire Behavior:**
- Appears only after RSVP + payment confirmed
- Exactly 10 questions required
- All questions pre-filled with default value 3 (Agree)
- Can be saved and edited until RSVP is confirmed
- Once questionnaire is completed, user is eligible for matching

### Host Workflow

**Creating Events:**
- Host can only create events in their own city
- If host tries to create event in another city: blocked
- Host dashboard shows only events in host's city

**Managing Attendees:**
- Host can view list of registrations with confirmed payment
- Host can:
  - "Check In" - marks attendee as checked in
  - "Mark Missing" - marks attendee as missing
- Missing state stored on registration: `attendanceStatus: "checked_in" | "missing" | "none"`

**Running Matching:**
- Only admin can run matching (hosts cannot)
- Matching only includes attendees who:
  - Payment confirmed
  - Attendance status = checked_in
  - Questionnaire completed = true
  - City matches event city

### Route Guards

The app implements role-based route guards:
- **Guest**: Can only access `/register` and `/` (home)
- **User**: Can access `/events`, `/match`, `/messages` (if enabled)
- **Host**: Can access `/host/*` and `/events` (read-only)
- **Admin**: Can access all routes

If a user tries to access a route they don't have permission for, they are automatically redirected to an allowed route.

---

## 🧪 Testing the New Roles

### Test Guest Flow
1. Set role to "Guest" (default)
2. Try to navigate to `/events` → Should redirect to `/register`
3. Only "Register" tab visible in navigation

### Test User Flow
1. Set role to "User"
2. Register and get approved (or use existing approved user)
3. Navigate to `/events` → See events in user's city
4. RSVP to event → Creates HOLD
5. Pay Now → Payment confirmed
6. Questionnaire section appears
7. Answer 10 questions → Save
8. Navigate to `/match` → See matches from attended events

### Test Host Flow
1. Set role to "Host"
2. Navigate to `/host` → See Host Dashboard
3. Create event in host's city → Success
4. Try to create event in another city → Blocked
5. View event → See attendee list
6. Check in attendees → Mark attendance status
7. Mark missing attendees → Update attendance status

### Test Admin Flow
1. Set role to "Admin"
2. Navigate to `/admin` → See Admin Dashboard
3. Approve/reject users
4. Create events in any city
5. Run matching for events
6. All features accessible

---

## 📝 Notes

- Vercel automatically builds on every push to your main branch
- Preview deployments are created for pull requests
- Environment variables are encrypted and secure
- Custom domains support HTTPS automatically via Vercel's SSL certificates
