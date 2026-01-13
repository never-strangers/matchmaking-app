# Chris Payment & Matching Flow

## Current State
- **Chris**: Approved user in Hong Kong
- **RSVP**: Hold status for "Running Club Meetup" event
- **Questionnaire**: Complete (12/12 answers)
- **Payment**: Unpaid (needs payment)

## Flow to Complete Payment & Enable Matching

### Step 1: Chris Pays (as Chris user)
1. Switch to **Chris** user (top right user switcher)
2. Go to `/events` page
3. See "Running Club Meetup" event
4. Click **"💳 Pay Now (Demo)"** button
5. Confirm payment in dialog
6. RSVP status changes to **CONFIRMED**

### Step 2: Admin Checks In Chris
1. Switch to **Admin** role
2. Go to `/admin` → **Events** tab
3. Find "Running Club Meetup" event
4. See Chris in "Check-in" section
5. Click **"Check In"** button for Chris
6. Status changes to "✓ Checked in"

### Step 3: Admin Runs Matching
1. Still in `/admin` → **Events** tab
2. When **all confirmed attendees are checked in**, the **"Run Matching"** button appears
3. Click **"Run Matching"** button
4. Matching algorithm runs
5. Matches are created and users are notified

## Alternative: Start from Pending Approval

If you want to test the full flow from pending:

1. **Admin approves Chris**:
   - Go to `/admin` → **User Approvals** tab
   - Click "Approve" for Chris
   - Chris becomes approved

2. **Chris RSVPs**:
   - Switch to Chris user
   - Go to `/events`
   - Click "Answer Questions" (if not done)
   - Answer at least 10 questions
   - Click "RSVP" → Creates hold
   - Click "Pay Now" → Confirms RSVP

3. **Admin checks in & runs matching** (same as above)

## Demo Data States

- **Chris**: Approved, has hold on Running event, ready to pay
- **James**: Approved, confirmed on Running event, not checked in
- **Anna**: Approved, confirmed on Coffee event, checked in, has matches
