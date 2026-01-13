# Demo Data States Coverage

This document lists all the app states covered by the seeded demo data.

## Users (10 users)

### User Status States:
1. **Anna** (Singapore) - `approved` ✓ - City locked, has matches
2. **Alex** (Singapore) - `approved` ✓ - City locked, has RSVP hold
3. **Daniel** (Singapore) - `approved` ✓ - City locked, waitlisted
4. **David** (Singapore) - `approved` ✓ - City locked, expired hold
5. **Chris** (Hong Kong) - `pending_approval` ⏳ - Waiting for admin
6. **Ethan** (Hong Kong) - `rejected` ✗ - Cooldown expired (can reapply)
7. **Isabella** (Bangkok) - `rejected` ✗ - Cooldown active (cannot reapply yet)
8. **Ava** (Tokyo) - `unverified` ❌ - Needs OTP verification
9. **Emma** (Tokyo) - `approved` ✓ - City locked, has city change request
10. **James** (Hong Kong) - `approved` ✓ - City locked, confirmed RSVP

### City States:
- **Locked**: Anna, Alex, Daniel, David, Emma, James
- **Unlocked**: Chris, Ethan, Isabella, Ava
- **Change Requested**: Emma (Tokyo → Singapore)

## RSVPs (6 RSVPs across 3 events)

### RSVP Status States:
1. **Anna** (Coffee event) - `confirmed` ✓ - Paid, checked in
2. **Alex** (Coffee event) - `hold` ⏱ - Active hold (5 min remaining)
3. **Daniel** (Coffee event) - `waitlisted` 📋 - Capacity full
4. **David** (Coffee event) - `hold` ⏱ - Expired hold (needs cleanup)
5. **James** (Running event) - `confirmed` ✓ - Paid, not checked in
6. **Emma** (Tech event) - `cancelled` ✗ - User cancelled

### Payment States:
- **Paid**: Anna, James
- **Unpaid**: Alex (hold), Daniel (waitlist), David (expired), Emma (cancelled)

## Per-Event Questionnaires (4 entries)

### Questionnaire States:
1. **Anna** (Coffee) - `completed` ✓ + `locked` 🔒 (RSVP confirmed)
2. **Alex** (Coffee) - `completed` ✓ + `unlocked` (RSVP hold)
3. **Daniel** (Coffee) - `incomplete` ❌ (only 5/10 answers)
4. **James** (Running) - `completed` ✓ + `locked` 🔒 (RSVP confirmed)

## Check-ins (2 entries)

### Check-in States:
1. **Anna** (Coffee event) - `checked_in` ✓
2. **James** (Running event) - `not_checked_in` ❌

## Matches (1 match)

### Match States:
1. **Anna ↔ Alex** (Coffee event) - Score: 85% - Both checked in, matched

## Mutual Likes (1 mutual like)

### Mutual Like States:
1. **Anna ↔ Alex** (Coffee event) - Chat unlocked ✓

## Match Actions (2 actions)

### Action States:
1. **Anna** → Liked Alex
2. **Alex** → Liked Anna (mutual)

## Events (3 events)

### Event States:
1. **Coffee & Conversation** (Singapore) - Capacity: 20, Payment required
   - 1 confirmed, 1 hold, 1 waitlisted, 1 expired hold
   - Matching already run
2. **Running Club Meetup** (Hong Kong) - Capacity: 15, No payment
   - 1 confirmed (not checked in)
3. **Tech Networking Night** (Bangkok) - Capacity: 30, Payment required
   - 1 cancelled

## Coverage Summary

✅ **User Statuses**: unverified, pending_approval, approved, rejected  
✅ **City States**: locked, unlocked, change requested  
✅ **RSVP Statuses**: none, hold (active), hold (expired), confirmed, waitlisted, cancelled  
✅ **Payment States**: unpaid, paid  
✅ **Questionnaire States**: incomplete, complete (unlocked), complete (locked)  
✅ **Check-in States**: not_checked_in, checked_in  
✅ **Match States**: matched, not matched  
✅ **Mutual Like States**: mutual like (chat unlocked)  
✅ **Match Actions**: like, pass  

## Demo Scenarios

### Scenario 1: New User Registration
- **User**: Ava (unverified)
- **Flow**: Register → OTP → Pending → Admin approve

### Scenario 2: RSVP Flow
- **User**: Alex
- **Flow**: Answer questions → RSVP → Hold → Pay → Confirmed

### Scenario 3: Capacity & Waitlist
- **User**: Daniel
- **Flow**: RSVP → Capacity full → Waitlisted → (Promote when seat frees)

### Scenario 4: Matching & Chat
- **Users**: Anna & Alex
- **Flow**: Check-in → Matching run → See matches → Like → Mutual like → Chat unlocked

### Scenario 5: Rejection & Cooldown
- **User**: Isabella (rejected, cooldown active)
- **User**: Ethan (rejected, cooldown expired - can reapply)

### Scenario 6: City Change Request
- **User**: Emma
- **Flow**: Approved user → Request city change → Admin approve/reject

### Scenario 7: Hold Expiry
- **User**: David
- **Flow**: RSVP → Hold → Expires → Seat released

### Scenario 8: Cancellation
- **User**: Emma
- **Flow**: RSVP → Cancel → Seat freed → Waitlist promoted
