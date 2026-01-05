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

### 🔄 Using Mock Data
Currently, the following features use mock data and need database integration:
- User profiles and onboarding submissions
- Events listing and creation
- Match calculations and results
- Admin KPIs and community data
- Signups and match pairs

### 🔌 Next Steps for Database Integration
1. Set up Supabase database schema (profiles, events, matches, signups tables)
2. Connect onboarding form submissions to Supabase
3. Implement event creation persistence
4. Build matching algorithm with Supabase queries
5. Connect admin dashboard to real data
6. Add authentication flow (Supabase Auth)

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
