# 🎬 Never Strangers - Demo Flow Guide

This document provides a step-by-step guide to demonstrate all features implemented in the Never Strangers Matching Core v1.

---

## 🚀 Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open the app:** Navigate to `http://localhost:3000`

3. **Open two browser tabs** (for chat demo)

---

## 📋 Demo Flow Overview

### Part 1: User Registration & Verification
### Part 2: Onboarding Flow
### Part 3: Event Creation
### Part 4: Match & Chat System
### Part 5: Admin Dashboard

---

## Part 1: User Registration & Verification

### Step 1.1: Registration Form

1. **Navigate to Homepage** (`/`)
   - See the "never Strangers" logo in the header
   - Click **"Sign Up"** button

2. **Fill Registration Form** (`/register`)
   - **Email:** Pre-filled with `mihailzlochevskiy@gmail.com` (can change)
   - **First Name:** Enter your first name
   - **Last Name:** Enter your last name
   - **Password:** Pre-filled with masked characters
   - **City:** Select from dropdown (Singapore, Kuala Lumpur, Manila, etc.)
   - **Birth Date:** Select a date
   - **Gender:** Select (Male, Female, Other)
   - **Attracted To:** Check Men/Women
   - **Looking For:** Check Friends/A Date
   - **Why Never Strangers:** Write a brief message
   - **Instagram:** Enter username (optional)
   - **Profile Photo:** Click "Upload" to select an image
   - **Check Terms & Privacy boxes**
   - Click **"Register"**

3. **Verification Page** (`/register/verification`)
   - See "Your Profile is Under Verification" message
   - View next steps explanation
   - See your email displayed
   - Options to go back home or login

**Demo Points:**
- ✅ Complete registration form with all fields
- ✅ Profile photo upload (preview shown)
- ✅ Form validation
- ✅ Verification flow

---

## Part 2: Onboarding Flow

### Step 2.1: Basic Onboarding

1. **Navigate to Onboarding** (`/onboarding`)
   - Click "Onboarding" in header or "Book Your Slot" on homepage

2. **Fill Basic Profile**
   - **Name:** Enter name
   - **Email:** Enter email
   - **City:** Enter city
   - **Interests:** Select multiple (Running, Books, Coffee, Tech, Fitness, Cinema)
   - Click **"Submit"**

### Step 2.2: Matching Customization

1. **Setup Page** (`/onboarding/setup`)
   - **Matching Experience:** Select Platonic, Romantic, or Professional
   - **Consider Ages:** Select Ignore or Consider
   - **Event Title:** Enter event name (e.g., "Coffee Meetup")
   - **Host Name:** Enter host name
   - **Date:** Enter date (dd/mm/yyyy)
   - **Tier:** Select Free, Basic ($4/guest), Premium ($8/guest), or Elite ($15/guest)
   - **Guest Count:** Use slider (0-500 guests)
   - Click **"Next"**

### Step 2.3: Question Builder

1. **Questions Page** (`/onboarding/questions`)
   - **Left Panel:** Shows selected questions
   - **Right Panel:** Browse question library
   - **Categories:** Switch between Suggested, Popular, Important, Spicy, Queer, Random
   - **Search:** Type to filter questions
   - **Select Questions:** Click question chips to add/remove
   - **Start with Suggested:** Button to auto-select 10 suggested questions
   - Select 20-30 questions
   - Click **"Next"**

### Step 2.4: Event Review

1. **Review Page** (`/onboarding/review`)
   - **Left Column:**
     - Event name and URL (`app.domain.com/eventname`)
     - Summary: questions count, participants, matching type
     - "What's Next?" steps
   - **Right Column:**
     - **First Name, Last Name, Email:** Fill in account details
     - Click **"Confirm Account"** → Shows green "Account confirmed" box
     - Billing information displayed
     - Click **"Create Event"**

2. **Events Page** (`/events`)
   - See your newly created event in the list
   - Event shows title, city, date, and URL
   - Other mock events also visible

**Demo Points:**
- ✅ Multi-step onboarding wizard
- ✅ Question library with 6 categories
- ✅ Event configuration
- ✅ Review and confirmation
- ✅ Event appears in events list

---

## Part 3: Event Creation (Alternative Flow)

### Step 3.1: Create Event from Events Page

1. **Navigate to Events** (`/events`)
   - Click **"Create Event"** button

2. **Follow same flow as Part 2** (Setup → Questions → Review)

**Demo Points:**
- ✅ Event creation from multiple entry points
- ✅ Consistent flow across the app

---

## Part 4: Match & Chat System

### Step 4.1: View Matches

1. **Navigate to Match** (`/match`)
   - See list of potential matches
   - Each match shows: Name, Age, City, Interests
   - Each match has a **"Message"** button

### Step 4.2: Start a Chat (Two-Tab Demo)

**Tab 1 Setup:**
1. Open first browser tab
2. Navigate to `/messages`
3. In the header dropdown, select **"Mikhail"** as current user
4. Go to `/match`
5. Click **"Message"** on **Anna's** profile
6. This opens the chat thread

**Tab 2 Setup:**
1. Open second browser tab
2. Navigate to `/messages`
3. In the header dropdown, select **"Anna"** as current user
4. You should see the conversation with Mikhail in the list
5. Click on the conversation to open it

### Step 4.3: Realtime Chat Demo

1. **Send Messages:**
   - In Tab 1 (Mikhail): Type a message and click "Send"
   - **Watch:** Message instantly appears in Tab 2 (Anna)
   - In Tab 2 (Anna): Type a reply and send
   - **Watch:** Reply instantly appears in Tab 1

2. **Test Features:**
   - **Typing Indicator:** Start typing (see "Typing..." appear)
   - **Message Bubbles:** Your messages on right (red), theirs on left (white)
   - **Timestamps:** See time for each message
   - **Auto-scroll:** New messages automatically scroll into view
   - **Conversation List:** See last message preview and timestamp
   - **Unread Badges:** See unread count (fake, for demo)

3. **Persistence:**
   - Refresh either tab → Messages still there (localStorage)
   - Close and reopen → Data persists

**Demo Points:**
- ✅ Realtime sync between tabs (BroadcastChannel)
- ✅ Message persistence (localStorage)
- ✅ User switching via dropdown
- ✅ Clean chat UI with bubbles, timestamps, avatars
- ✅ Match page integration

---

## Part 5: Admin Dashboard

### Step 5.1: Main Dashboard

1. **Navigate to Admin** (`/admin`)
   - **KPIs:** See Total Events, Active Users, This Month
   - **Community Card:** See recent community members with dates
   - **Past Events:** See timeline of past events

### Step 5.2: Followers Management

1. **View Followers** (`/admin/followers`)
   - Click **"ALL FOLLOWERS →"** in Community section
   - See full list of followers
   - **Search:** Type to filter followers
   - **Download Icon:** (Placeholder for export)
   - **Ellipsis Menu:** (Placeholder for actions)
   - Each follower shows name and follow date

### Step 5.3: Matches Management

1. **Navigate to Matches** (`/admin/matches`)
   - **Step 1: Signups**
     - See list of event signups
     - View signup dates
     - "Manage X guests" link
   
   - **Step 2: Matching Algorithm**
     - See Romantic vs Friend matching breakdown
     - View match score visualization
     - See top matches preview
     - "Recalculate" and "Options" buttons
     - Match grouping system
   
   - **Step 3: Finalization**
     - "List event & notify followers" button
   
   - **Right Sidebar:**
     - Full list of all matches
     - Search functionality
     - Match pairs with scores and groups

**Demo Points:**
- ✅ KPI dashboard
- ✅ Community management
- ✅ Followers list with search
- ✅ Matches management workflow
- ✅ Match algorithm visualization

---

## 🎯 Key Features to Highlight

### ✨ User Experience
- **Smooth Multi-step Flows:** Onboarding, event creation, registration
- **Real-time Updates:** Chat syncs instantly between tabs
- **Persistent Data:** Everything saved in localStorage (demo-ready)
- **Responsive Design:** Works on mobile and desktop

### 🔧 Technical Highlights
- **No Backend Required:** All demo features work with localStorage
- **BroadcastChannel API:** Real-time sync without external services
- **Feature Flags:** Easy to enable/disable chat via env variables
- **Clean Architecture:** Easy to replace mock data with Supabase

### 📱 Pages & Routes
- `/` - Homepage
- `/register` - Registration form
- `/register/verification` - Verification page
- `/onboarding` - Basic onboarding
- `/onboarding/setup` - Matching customization
- `/onboarding/questions` - Question builder
- `/onboarding/review` - Event review
- `/events` - Events listing
- `/events/new/setup` - Event setup
- `/events/new/questions` - Event questions
- `/match` - Match preview
- `/messages` - Conversation list
- `/messages/[id]` - Chat thread
- `/admin` - Admin dashboard
- `/admin/followers` - Followers list
- `/admin/matches` - Matches management

---

## 🎬 Demo Script (5 Minutes)

### Opening (30 seconds)
1. Show homepage with logo
2. Highlight navigation: Onboarding, Match, Events, Messages, Admin
3. Mention: "All features are demo-ready with mocked data"

### Registration Flow (1 minute)
1. Click "Sign Up" → Show registration form
2. Fill form quickly → Show verification page
3. "User profile is now under verification"

### Event Creation (1.5 minutes)
1. Click "Book Your Slot" → Show onboarding flow
2. Quick setup → Select questions → Review page
3. Create event → Show it appears in events list

### Chat Demo (2 minutes)
1. Open two tabs
2. Select different users in each tab
3. Go to Match → Click "Message" on a match
4. Send messages back and forth
5. "Watch messages appear instantly in both tabs"
6. Refresh one tab → "Messages persist"

### Admin Dashboard (30 seconds)
1. Show KPIs and community
2. Click "ALL FOLLOWERS" → Show followers list
3. Show matches management

---

## 🐛 Troubleshooting

### Chat not syncing?
- Make sure both tabs are on the same domain (localhost:3000)
- Check browser console for errors
- Try refreshing both tabs

### Messages not persisting?
- Check browser localStorage (DevTools → Application → Local Storage)
- Look for keys starting with `ns_chat_`

### Feature flag not working?
- Make sure `.env.local` exists (not just `.env.example`)
- Restart dev server after changing env variables
- Check `NEXT_PUBLIC_ENABLE_CHAT=false` is set correctly

---

## 📝 Notes for Demo

- **All data is mocked:** No database required
- **localStorage persistence:** Data survives page refreshes
- **Two-tab requirement:** Chat demo needs two browser tabs
- **User switching:** Use dropdown in chat header to switch users
- **Deterministic IDs:** Conversation IDs are deterministic (same users = same conversation)

---

## 🚀 Next Steps (Production)

After demo, mention:
- All features ready for Supabase integration
- Database schema already planned (see README)
- Feature flags allow easy rollback
- No breaking changes needed for production migration

---

**Happy Demo! 🎉**




