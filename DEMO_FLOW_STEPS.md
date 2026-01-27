# Demo Flow Steps - Never Strangers

Complete step-by-step guide for the UI-only demo flow.

## 🚀 Quick Start

1. **Start the app**: `npm run dev`
2. **Open**: `http://localhost:3000`
3. **Login**: Click "Login" → Select a demo user

---

## 📋 Complete Demo Flow

### Step 1: Login
- Navigate to `/login` (or click "Login" in nav)
- You'll see 8 predefined demo users with avatars:
  - Alice Johnson (alice@demo.com)
  - Bob Smith (bob@demo.com)
  - Charlie Brown (charlie@demo.com)
  - Diana Prince (diana@demo.com)
  - Eve Williams (eve@demo.com)
  - Frank Miller (frank@demo.com)
  - Grace Lee (grace@demo.com)
  - Henry Davis (henry@demo.com)
- **Click any user** to log in instantly
- You'll be redirected to `/events`

### Step 2: Join an Event
- On `/events`, you'll see default events:
  - **Singapore Social Mixer** (Singapore - January 29, 2026)
  - **Bangkok Networking Night** (Bangkok - February 5, 2026)
- **Click "Join"** on any event
- Status changes to "✓ Joined"

### Step 3: Answer Questions
- After joining, click **"Answer Questions"** button
- You'll be taken to `/events/[eventId]/questions`
- **All 10 questions are automatically prefilled** with "Agree" (value 3)
- You can change any answer using the radio buttons:
  - 1 = Strongly Disagree
  - 2 = Disagree
  - 3 = Agree (default)
  - 4 = Strongly Agree
- Answers save automatically as you change them
- Once all 10 are answered, you'll see "✓ Questionnaire Completed"
- Click "Return to Events" or navigate back

### Step 4: Admin - Run Matching
- Navigate to `/admin?demo_admin=1`
- Select an event from the dropdown
- **Optional**: Click **"Seed 30 Demo Participants"** to add fake users with random answers (helpful for testing)
- Click **"Run Matching"** button
- Matching algorithm computes scores for all users who:
  - Have joined the event
  - Have answered all 10 questions
- You'll see an alert: "Matching completed for X users!"

### Step 5: View Matches
- Navigate to `/match` (or click "Match" in nav)
- Select an event from the dropdown
- You'll see a list of matches with:
  - User name and email
  - Match percentage (0-100%)
  - "Like" button for each match
- **Click "Like"** on users you're interested in
- If both users like each other, you'll see:
  - "💬 Mutual Like - Can Message" badge
  - "Message" button appears

### Step 6: Message (Mutual Like Required)
- Go to `/messages` (or click "Messages" in nav)
- You'll see all conversations where you have mutual likes
- **Click on a conversation** to open it
- Type a message and click "Send"
- Messages persist in localStorage and survive page refreshes

### Step 7: Switch Users (Testing Multiple Accounts)
- Click your avatar in the top right
- Click **"Switch User / Logout"**
- Select a different demo user
- All data persists - you'll see:
  - Your own joined events
  - Your own answers
  - Your own matches
  - Your own likes and messages
- Switch back to the original user to see their data again

---

## 🎯 Key Features

### ✅ What Works
- **Predefined users**: No Google OAuth setup needed
- **Instant login**: Click and go
- **Auto-prefilled questions**: All 10 questions start with "Agree"
- **Deterministic matching**: Same answers = same match %
- **Multi-account support**: Switch users without losing data
- **Mutual like requirement**: Both users must like each other to message
- **Persistent storage**: Everything saved in localStorage

### 📊 Data Storage
- **Session**: `ns_session_v1` - Current user and all logged-in users
- **Demo Data**: `ns_demo_v1` - Events, registrations, answers, matches, likes, conversations, messages

### 🔧 Admin Features
- Access at `/admin?demo_admin=1`
- Run matching for any event
- Seed demo participants for testing
- View participant status and answer counts

---

## 🧪 Testing Scenarios

### Scenario 1: Single User Flow
1. Login as Alice
2. Join Singapore event
3. Answer questions (or use prefilled)
4. Go to admin, run matching
5. Go to match page, see results
6. Like a user (if seeded participants exist)

### Scenario 2: Mutual Like Flow
1. Login as Alice
2. Join event, answer questions
3. Go to admin, seed 30 participants, run matching
4. Go to match, like Bob
5. Logout, login as Bob
6. Go to match, like Alice back
7. Login as Alice again
8. Go to messages, see conversation, send message

### Scenario 3: Multiple Accounts
1. Login as Alice → Join event → Answer questions
2. Logout, login as Bob → Join same event → Answer questions
3. Logout, login as Alice → See only Alice's data
4. Logout, login as Bob → See only Bob's data
5. All data persists independently

---

## 🐛 Troubleshooting

### No matches showing?
- Make sure admin has run matching for the event
- Verify you've answered all 10 questions
- Check that at least 2 users have completed the questionnaire

### Can't message?
- Both users must like each other (mutual like)
- Check that matching has been run
- Verify you're logged in with the correct account

### Redirect loops?
- Clear localStorage: `localStorage.clear()`
- Refresh the page
- Try logging in again

### Questions not prefilled?
- Refresh the page
- Questions auto-prefill on first visit to the questions page

---

## 📁 File Structure

```
lib/auth/
  ├── demoUsers.ts          # Predefined demo users
  ├── googleClientAuth.ts   # Session management (localStorage)
  └── useSession.ts         # React hook for session

lib/demo/
  └── demoStore.ts          # Zustand store with localStorage persistence

app/
  ├── login/                # Login page with user selection
  ├── events/               # Events listing and joining
  ├── events/[id]/questions/ # Answer 10 questions
  ├── admin/                # Admin dashboard with matching
  ├── match/                # View matches and like users
  └── messages/             # Conversations and messaging
```

---

## 🎬 Quick Demo Script

**For a 5-minute demo:**

1. **Login** → Select "Alice Johnson"
2. **Join Event** → Click "Join" on Singapore event
3. **Answer Questions** → Click "Answer Questions" (already prefilled, just click through)
4. **Admin** → Go to `/admin?demo_admin=1` → Seed 30 participants → Run Matching
5. **View Matches** → Go to `/match` → See match percentages → Like a user
6. **Switch User** → Logout → Login as "Bob Smith" → Like Alice back
7. **Message** → Login as Alice → Go to `/messages` → Open conversation → Send message

**Done!** 🎉
