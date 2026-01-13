# 🧪 Manual E2E Testing Guide

**Purpose:** Complete manual testing guide for all user flows with bug highlights  
**Last Updated:** January 2026

---

## 🚨 Known Bugs & Issues to Watch For

### Critical Issues
1. **Input field visibility on mobile** - May require scrolling (recently fixed, verify)
2. **Duplicate matches** - Fixed but verify no duplicates appear
3. **Match page shows events from other cities** - Should only show attended events in user's city
4. **Messages page header hidden** - Main app header is hidden on messages pages

### Potential Issues
- **Auto-seeding conflicts** - If localStorage has partial data, seeding might fail
- **OTP verification timing** - User must be created before OTP verification
- **Questionnaire pre-filling** - Event questionnaires should pre-fill from global answers
- **RSVP hold expiry** - Holds expire after 10 minutes, verify cleanup works
- **Matching constraints** - Verify gender/orientation filtering works correctly

---

## 📋 Pre-Testing Setup

### 1. Clear Demo Data
```bash
# Option 1: Use Admin Panel
1. Go to /admin
2. Click "Reset & Re-seed" button

# Option 2: Browser Console
1. Open DevTools (F12)
2. Application tab → Local Storage
3. Delete all keys starting with "ns_"
4. Refresh page
```

### 2. Verify Environment
- ✅ App running on `http://localhost:3000`
- ✅ Chat enabled: `NEXT_PUBLIC_ENABLE_CHAT=true`
- ✅ Demo mode: Data persists in localStorage

---

## 🔄 Complete User Flow Testing

### Flow 1: New User Registration → Approval → RSVP → Match

#### Step 1: User Registration
**Path:** `/register`

**Actions:**
1. Fill registration form:
   - Name: "Test User"
   - Email: "test@example.com"
   - City: "Singapore"
   - Gender: "male"
   - Age: 25
   - Orientation: Select preferences
2. Click "Register"
3. **Expected:** Redirects to `/register/verification`

**⚠️ Bug Check:**
- [ ] OTP page loads correctly
- [ ] Mock OTP code `123456` is displayed
- [ ] User can enter OTP
- [ ] Verification succeeds

**Actions (OTP Page):**
4. Enter OTP: `123456`
5. Click "Verify"
6. **Expected:** User created with status `unverified` → `pending_approval`

**⚠️ Bug Check:**
- [ ] User status is `pending_approval` (not `unverified`)
- [ ] Email verified flag is set
- [ ] User can see pending approval message

---

#### Step 2: Admin Approval
**Path:** `/admin` (switch to Admin role)

**Actions:**
1. Switch role to "Admin" (top right)
2. Go to `/admin` → "User Approvals" tab
3. Find "Test User" in pending list
4. Click "Approve"
5. **Expected:** 
   - User status → `approved`
   - City locked
   - Notification sent

**⚠️ Bug Check:**
- [ ] User appears in approved list
- [ ] City is locked (cannot change)
- [ ] Notification appears in user's notification center
- [ ] User can now see events in their city

**Switch back to user:**
6. Switch user to "Test User" (top right)
7. Go to `/notifications`
8. **Expected:** See approval notification

---

#### Step 3: Answer Event Questions
**Path:** `/events` → Click event → "Answer Questions"

**Actions:**
1. Go to `/events`
2. **Expected:** Only see events in "Singapore" (user's city)
3. Click on an event (e.g., "Coffee & Conversation")
4. Click "Answer Questions" button/badge
5. **Expected:** Navigate to `/events/[eventId]/questions`

**⚠️ Bug Check:**
- [ ] Page shows exactly 10 questions (not 14+)
- [ ] All 10 questions are pre-filled with default values (3 = Agree)
- [ ] Counter shows "10/10 answered ✓"
- [ ] Can change answers
- [ ] Can save answers

**Actions (Questions Page):**
6. Verify all 10 questions are pre-filled
7. Optionally change some answers
8. Click "Save Answers"
9. **Expected:** Redirects to `/events` with success message

**⚠️ Bug Check:**
- [ ] Answers are saved
- [ ] Questionnaire is marked as `completed: true`
- [ ] RSVP button is now enabled

---

#### Step 4: RSVP to Event
**Path:** `/events`

**Actions:**
1. Go to `/events`
2. Find event with completed questionnaire
3. Click "RSVP" button
4. **Expected:** 
   - RSVP status → `hold`
   - "Pay Now" button appears
   - Hold expires in 10 minutes

**⚠️ Bug Check:**
- [ ] RSVP button changes to "Hold" or "Pay Now"
- [ ] Hold expiry time is set (10 minutes from now)
- [ ] Cannot RSVP to overlapping events

**Actions (Payment):**
5. Click "Pay Now"
6. **Expected:** Mock payment dialog appears
7. Click "Confirm Payment"
8. **Expected:**
   - RSVP status → `confirmed`
   - Payment status → `paid`
   - Questionnaire locked (cannot edit)

**⚠️ Bug Check:**
- [ ] Payment dialog appears
- [ ] After payment, RSVP is confirmed
- [ ] Questionnaire is locked
- [ ] Cannot edit answers anymore

---

#### Step 5: Check-in (Admin)
**Path:** `/admin` → "Events" tab

**Actions:**
1. Switch to Admin role
2. Go to `/admin` → "Events" tab
3. Find event with confirmed RSVPs
4. **Expected:** See list of confirmed attendees
5. Click "Check In" for each attendee
6. **Expected:** 
   - Check-in status → `checked_in`
   - Counter updates (e.g., "1/3 checked in")

**⚠️ Bug Check:**
- [ ] All confirmed attendees are listed
- [ ] Check-in button works
- [ ] Counter updates correctly
- [ ] "Run Matching" button appears when all checked in

---

#### Step 6: Run Matching (Admin)
**Path:** `/admin` → "Events" tab

**Actions:**
1. After all attendees checked in
2. Click "Run Matching Now" button
3. **Expected:**
   - Matches created
   - Matching run recorded
   - Users receive match notifications

**⚠️ Bug Check:**
- [ ] Matching runs successfully
- [ ] No duplicate matches (each pair appears once)
- [ ] Matches respect gender/orientation constraints
- [ ] Max 3 matches per person enforced
- [ ] Historical matches excluded

**Verify matches:**
4. Switch to user account
5. Go to `/notifications`
6. **Expected:** See match notification

---

#### Step 7: View Matches & Like
**Path:** `/match`

**Actions:**
1. Go to `/match`
2. **Expected:** 
   - Only see events user attended (confirmed RSVP)
   - Only events in user's city
   - If no events attended, see "You haven't attended any events yet"

**⚠️ Bug Check:**
- [ ] Event selector only shows attended events
- [ ] No events from other cities
- [ ] Correct message if no events

**Actions:**
3. Select event from dropdown
4. **Expected:** See match cards for that event
5. Click "Like" on a match
6. **Expected:**
   - Match action recorded
   - If mutual like → notification + "Message" button appears

**⚠️ Bug Check:**
- [ ] No duplicate match cards (same person twice)
- [ ] Like button works
- [ ] Mutual like detection works
- [ ] Message button appears after mutual like

---

#### Step 8: Chat (Mutual Like Required)
**Path:** `/match` → Click "Message" → `/messages/[id]`

**Actions:**
1. After mutual like, click "Message" button
2. **Expected:** Navigate to `/messages/conv_[userId1]_[userId2]`
3. **Expected:** 
   - Input field visible at bottom (no scrolling needed)
   - Can type message
   - Can send message

**⚠️ Bug Check:**
- [ ] Input field is visible without scrolling
- [ ] Input stays fixed at bottom
- [ ] Can type and send messages
- [ ] Messages appear in real-time (test with 2 tabs)

**Test Realtime (2 tabs):**
4. Open same conversation in 2 tabs
5. Set different users in each tab (via dropdown)
6. Send message from Tab 1
7. **Expected:** Message appears in Tab 2 without refresh

**⚠️ Bug Check:**
- [ ] Realtime sync works
- [ ] No duplicate messages
- [ ] Messages persist after refresh

---

### Flow 2: Edge Cases & Error Handling

#### Test 1: Rejected User Cooldown
**Path:** `/admin` → Reject user → Try to reapply

**Actions:**
1. Admin rejects a user
2. User tries to register again
3. **Expected:** 
   - 24-hour cooldown enforced
   - Cannot register until cooldown expires

**⚠️ Bug Check:**
- [ ] Cooldown message appears
- [ ] Cannot bypass cooldown
- [ ] Cooldown timer is accurate

---

#### Test 2: City Change Request
**Path:** User profile → Request city change → Admin approval

**Actions:**
1. Approved user tries to change city
2. **Expected:** 
   - City is locked
   - Change request created
   - Admin sees request in "City Changes" tab
3. Admin approves/rejects
4. **Expected:** User receives notification

**⚠️ Bug Check:**
- [ ] City change request works
- [ ] Admin sees pending requests
- [ ] Approval/rejection works
- [ ] Notification sent

---

#### Test 3: RSVP Hold Expiry
**Path:** Create hold → Wait 10 minutes → Verify cleanup

**Actions:**
1. Create RSVP hold
2. Wait 10 minutes (or manually expire in localStorage)
3. **Expected:** 
   - Hold expires
   - Seat released
   - RSVP status changes

**⚠️ Bug Check:**
- [ ] Expired holds are cleaned up
- [ ] Capacity is freed
- [ ] Waitlist promotion works

---

#### Test 4: Event Capacity & Waitlist
**Path:** Fill event to capacity → Next RSVP → Waitlist

**Actions:**
1. RSVP multiple users to fill event capacity
2. Next user tries to RSVP
3. **Expected:** 
   - RSVP → `waitlisted`
   - When capacity frees → Waitlist promoted to `hold`

**⚠️ Bug Check:**
- [ ] Capacity enforcement works
- [ ] Waitlist created correctly
- [ ] FIFO promotion works
- [ ] Notification sent on promotion

---

#### Test 5: Overlapping Events
**Path:** RSVP to event → Try RSVP to overlapping event

**Actions:**
1. User has confirmed RSVP to Event A (Jan 20, 2pm-4pm)
2. Try to RSVP to Event B (Jan 20, 3pm-5pm)
3. **Expected:** 
   - Overlap detected
   - RSVP blocked
   - Error message shown

**⚠️ Bug Check:**
- [ ] Overlap detection works
- [ ] Cannot RSVP to overlapping events
- [ ] Clear error message

---

#### Test 6: Questionnaire Locking
**Path:** RSVP confirmed → Try to edit questions

**Actions:**
1. User has confirmed RSVP
2. Try to edit event questionnaire
3. **Expected:** 
   - Questions are locked
   - Cannot edit answers
   - Locked indicator shown

**⚠️ Bug Check:**
- [ ] Locking works after RSVP confirmed
- [ ] Cannot edit locked questions
- [ ] UI shows locked state

---

### Flow 3: Mobile Responsiveness

#### Test Mobile Views
**Actions:**
1. Open app on mobile device (or Chrome DevTools mobile view)
2. Test all pages:
   - `/register`
   - `/events`
   - `/match`
   - `/messages`
   - `/admin`

**⚠️ Bug Check:**
- [ ] All pages are responsive
- [ ] Input fields are visible without scrolling
- [ ] Touch targets are large enough (44px minimum)
- [ ] Navigation works on mobile
- [ ] Messages input stays at bottom

---

## 🐛 Bug Reporting Template

When you find a bug, document it:

```markdown
### Bug: [Short Description]

**Location:** `/path/to/page`
**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected:** What should happen
**Actual:** What actually happens
**Screenshot:** (if applicable)
**Browser:** Chrome/Firefox/Safari
**Device:** Desktop/Mobile
```

---

## ✅ Testing Checklist

### Registration & Verification
- [ ] User can register
- [ ] OTP verification works (code: 123456)
- [ ] User status set to `pending_approval`
- [ ] Rejected users have 24h cooldown

### Admin Functions
- [ ] Can approve users
- [ ] Can reject users
- [ ] Can manage city change requests
- [ ] Can check in attendees
- [ ] Can run matching
- [ ] Reset & Re-seed works

### Events & RSVP
- [ ] Only see events in user's city
- [ ] Can answer event questions (10 questions, pre-filled)
- [ ] Can RSVP (creates hold)
- [ ] Can pay (mock payment)
- [ ] RSVP becomes confirmed
- [ ] Overlapping events blocked
- [ ] Capacity enforcement works
- [ ] Waitlist promotion works

### Matching
- [ ] Only see matches for attended events
- [ ] Only see events in user's city
- [ ] Can like matches
- [ ] Mutual like detection works
- [ ] No duplicate matches
- [ ] Matching constraints work (gender, orientation, max 3)

### Chat
- [ ] Chat unlocked after mutual like
- [ ] Can send messages
- [ ] Input visible without scrolling
- [ ] Realtime sync works (2 tabs)
- [ ] Back button works on messages page

### Notifications
- [ ] Approval notifications
- [ ] Rejection notifications
- [ ] Match notifications
- [ ] Mutual like notifications
- [ ] City change notifications
- [ ] Waitlist promotion notifications

---

## 🎯 Quick Test Scenarios

### Scenario 1: Happy Path (5 minutes)
1. Register → Verify OTP
2. Admin approves
3. Answer questions → RSVP → Pay
4. Admin checks in → Runs matching
5. View matches → Like → Mutual like → Chat

### Scenario 2: Edge Cases (10 minutes)
1. Reject user → Test cooldown
2. Fill event capacity → Test waitlist
3. RSVP to overlapping events → Should fail
4. Test hold expiry
5. Test city change request

### Scenario 3: Mobile (5 minutes)
1. Test all pages on mobile
2. Verify input visibility
3. Test touch interactions
4. Test navigation

---

## 📝 Notes

- **Demo Data:** All data persists in localStorage
- **Reset:** Use "Reset & Re-seed" in admin panel to start fresh
- **Users:** Pre-seeded users available (Anna, Alex, James, Sarah, Mike, etc.)
- **Events:** Pre-seeded events (Coffee & Conversation, Running Club Meetup)
- **OTP Code:** Always `123456` for demo

---

**Last Updated:** January 2026  
**Version:** 1.0
