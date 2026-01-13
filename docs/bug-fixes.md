# Bug Fixes & Centralized Initialization

## Problem
Multiple auto-seed functions across different stores were causing:
- Race conditions
- Inconsistent data
- Conflicts when stores initialized at different times
- Missing or duplicate data

## Solution: Centralized Initialization

### What Changed

1. **Created `lib/demo/initDemoData.ts`**
   - Single source of truth for all demo data
   - Initializes all stores atomically
   - Uses a version flag to prevent re-initialization

2. **Added `components/DemoDataInit.tsx`**
   - Runs once on app load
   - Ensures data is initialized before any store access

3. **Updated All Stores**
   - Stores now check for central init flag first
   - Fall back to individual seed only if needed
   - Prevents duplicate seeding

### How It Works

1. App loads → `DemoDataInit` component mounts
2. `initializeDemoData()` runs once
3. Sets `ns_demo_initialized_v2` flag
4. All stores check this flag before seeding
5. Data is consistent across all stores

### Benefits

✅ **No race conditions** - Single initialization point  
✅ **Consistent data** - All stores use same seed  
✅ **Predictable** - Always initialized in same order  
✅ **Easy to reset** - One function clears and re-seeds everything  
✅ **Versioned** - Can update seed data by changing version flag  

### Usage

**Automatic**: Data initializes on app load

**Manual Reset**:
```typescript
import { resetDemoData, initializeDemoData } from "@/lib/demo/initDemoData";

resetDemoData(); // Clear all
initializeDemoData(); // Re-seed
```

**Admin Panel**: "Reset & Re-seed" button does this automatically

### What's Fixed

- ✅ Match data now seeds correctly (Anna's match appears)
- ✅ RSVP states are consistent
- ✅ Questionnaire answers are properly linked
- ✅ Check-in data initializes correctly
- ✅ No more duplicate or missing data

### Testing

1. Clear browser localStorage
2. Refresh page
3. All demo data should initialize automatically
4. Check:
   - Anna has match with Alex
   - Chris has hold on Running event
   - All users have correct statuses
   - RSVPs are properly linked

### If Issues Persist

1. Click "Reset & Re-seed" in admin panel
2. Or manually clear localStorage and refresh
3. Check browser console for initialization logs
