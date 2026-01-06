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
  - Create new event button
- **Event Creation Flow** (`/events/new`)
  - **Setup Step** (`/events/new/setup`): Configure matching preferences, event details, tier, and guest count
  - **Questions Step** (`/events/new/questions`): Build custom questionnaire for event participants
  - Multi-step wizard interface with modern UI components

### 🎯 Matching System
- **Match Preview** (`/match`)
  - Display potential matches with profile information
  - Shows name, age, city, and interests
  - Card-based match presentation

### 🧮 Admin Dashboard
- **Main Dashboard** (`/admin`)
  - KPI metrics: Total Events, Active Users, This Month's events
  - Community members list with join dates
  - Past events timeline
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
- **Registration Form** (`/register`)
  - Form submissions stored in `localStorage`
  - Profile photo upload (not persisted)
  - Email verification flow (mocked)
- **User Authentication**
  - No login/logout functionality
  - No session management
  - No password hashing/validation

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

# 4. Run locally
npm run dev

# 5. Test Supabase connection
# Visit http://localhost:3000/api/test
```

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
