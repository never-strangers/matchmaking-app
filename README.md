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

### 👤 User
- Invite-only sign-up (magic link or social)
- Profile → photo, bio, city, interests
- Automatic AI embedding for similarity
- Visibility & privacy controls

### 🎯 Matching
- AI-based similarity via cosine distance
- Rule filters (gender, city, intent)
- Like / Skip flow → auto-match on mutual likes
- Match list view (pre-chat integration)

### 🎟️ Events
- City-based event feed & RSVPs
- Capacity logic & status tracking
- Organizer panel to create / edit events
- Shareable event links

### 🧮 Admin
- View / approve users and events
- Export data (CSV / JSON)
- Basic analytics (Daily Active Users, matches, retention)

---

## ⚙️ Quick Start

```bash
# 1. Clone repo
git clone https://github.com/neverstrangers/matching-core.git
cd matching-core

# 2. Install dependencies
npm install

# 3. Add environment variables
cp .env.example .env.local

# 4. Run locally
npm run dev
