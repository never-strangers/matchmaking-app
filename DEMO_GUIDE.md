# Demo Flow Guide

This guide explains how to use the Never Strangers demo flow. Everything runs client-side with localStorage - no backend required.

## Setup

1. **Set Google Client ID** (optional - for real Google login):
   - Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to your `.env.local` file
   - If not set, Google login will show an error (but you can still test the flow)

2. **Start the app**:
   ```bash
   npm run dev
   ```

## Demo Flow Steps

### 1. Login

- Navigate to `/login`
- You'll see a list of 8 predefined demo users with avatars
- Click on any user to log in instantly
- You'll be redirected to `/events`

**Demo Users Available:**
- Alice Johnson (alice@demo.com)
- Bob Smith (bob@demo.com)
- Charlie Brown (charlie@demo.com)
- Diana Prince (diana@demo.com)
- Eve Williams (eve@demo.com)
- Frank Miller (frank@demo.com)
- Grace Lee (grace@demo.com)
- Henry Davis (henry@demo.com)

**Note**: All users are predefined - no Google authentication required. You can switch users anytime by clicking "Switch User / Logout" in the navigation.

### 2. Join an Event

- On `/events`, you'll see default events (Singapore Social Mixer, Bangkok Networking Night)
- Click "Join" on any event
- The event will show "Joined" status

### 3. Answer Questions

- After joining, click "Answer Questions" or go to `/events/[eventId]/questions`
- Answer all 10 questions (1-4 scale: Strongly Disagree to Strongly Agree)
- Answers are saved automatically as you select them
- Once all 10 are answered, you'll see "Questionnaire Completed"

### 4. Run Matching (Admin)

- Navigate to `/admin?demo_admin=1`
- Select an event from the dropdown
- Click "Seed 30 Demo Participants" to add fake users with random answers (optional but helpful)
- Click "Run Matching" to compute match scores for all users
- Matching requires at least 2 users with all answers

### 5. View Matches

- Go to `/match`
- Select an event from the dropdown
- You'll see a list of matches with percentages
- Click "Like" on users you're interested in
- If both users like each other, you'll see "Mutual Like - Can Message"

### 6. Message

- Go to `/messages` to see all your conversations
- Click on a conversation to open it
- Type a message and click "Send"
- Messages persist in localStorage

## Key Features

### Multi-Account Support

- All data is stored in `ns_demo_v1` localStorage key
- Switching Google accounts preserves all data
- Each user sees only their own joins, answers, likes, and messages

### Deterministic Matching

- Same answers = same match %
- Matching is computed when admin clicks "Run Matching"
- Results are stored and persist across sessions

### Data Persistence

- Everything is stored in localStorage:
  - `ns_session_v1`: Google session (current user, all users)
  - `ns_demo_v1`: All demo data (events, registrations, answers, matches, likes, conversations, messages)

### Admin Mode

- Access admin features at `/admin?demo_admin=1`
- Can run matching for any event
- Can seed demo participants for testing

## Troubleshooting

### No matches showing

- Make sure admin has run matching for the event
- Check that you've answered all 10 questions
- Verify at least 2 users have completed the questionnaire

### Can't message

- Both users must like each other (mutual like)
- Check that matching has been run
- Verify you're logged in with the correct account

### Data not persisting

- Check browser localStorage is enabled
- Clear localStorage and start fresh if needed:
  ```javascript
  localStorage.removeItem('ns_demo_v1');
  localStorage.removeItem('ns_session_v1');
  ```

## Testing Multiple Accounts

1. Login with Google account A
2. Join event, answer questions
3. Logout
4. Login with Google account B
5. Join same event, answer questions
6. Login as account A again
7. Go to admin, run matching
8. Both accounts can now see matches and message each other

## File Structure

- `lib/auth/`: Google client-side authentication
- `lib/demo/demoStore.ts`: Zustand store with localStorage persistence
- `app/login/`: Login page
- `app/events/`: Events listing and joining
- `app/events/[id]/questions/`: Question answering
- `app/admin/`: Admin dashboard with matching
- `app/match/`: Match viewing and liking
- `app/messages/`: Conversations and messaging
