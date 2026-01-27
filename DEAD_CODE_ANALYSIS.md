# Dead Code Analysis Report
**Generated:** January 27, 2026  
**Codebase:** Never Strangers - Matching Core v1  
**Analysis Type:** Comprehensive Dead Code Detection

---

## Executive Summary

- **Total Files Analyzed:** 114 TypeScript/TSX files
- **Estimated Dead Code:** ~5-8% of codebase
- **High Confidence Removals:** 15+ items
- **Medium Confidence:** 8+ items requiring review
- **Low Confidence (Keep):** All public API routes, test files, and configuration files

---

## Phase 1: Discovery & Analysis

### 1. Unused Exports

#### High Confidence - Safe to Remove

##### `lib/matching/demoUsers.ts`
- **`getDefaultDemoUser()`** (line 606)
  - **Status:** Exported but never imported
  - **Usage Check:** No imports found in codebase
  - **Confidence:** High
  - **Action:** Remove function

##### `lib/chatStore.ts`
- **`subscribe()`** (line 155)
  - **Status:** Exported but never imported
  - **Usage Check:** No imports found
  - **Confidence:** High
  - **Note:** This function provides realtime subscription capability but is not currently used
  - **Action:** Remove or keep if planned for future realtime features

##### `lib/demoStore.ts` - Multiple Unused Functions
The following functions are exported but appear to be legacy code from an older demo system. They're not imported anywhere:

- **`setDemoUser()`** (line 25)
  - **Status:** Not imported
  - **Note:** Replaced by `lib/demo/userStore.ts`
  
- **`getDemoUser()`** (line 30)
  - **Status:** Not imported
  - **Note:** Replaced by `lib/demo/userStore.ts`
  - **Exception:** Used internally in same file (line 34)
  
- **`markEventJoined()`** (line 59)
  - **Status:** Not imported
  
- **`isEventJoined()`** (line 68)
  - **Status:** Not imported
  
- **`markLiked()`** (line 85)
  - **Status:** Not imported
  - **Note:** Different from `isLiked()` used in `lib/demo/demoStore.ts`
  
- **`isLiked()`** (line 94)
  - **Status:** Not imported
  - **Note:** Different from `isLiked()` used in `lib/demo/demoStore.ts`
  
- **`createMatch()`** (line 111)
  - **Status:** Not imported
  
- **`listMatches()`** (line 127)
  - **Status:** Not imported
  
- **`hasMatch()`** (line 138)
  - **Status:** Not imported
  
- **`setQuestionnaireAnswers()`** (line 144)
  - **Status:** Not imported
  
- **`getQuestionnaireAnswers()`** (line 149)
  - **Status:** Not imported
  
- **`markSkipped()`** (line 161)
  - **Status:** Not imported
  
- **`isSkipped()`** (line 170)
  - **Status:** Not imported

**Analysis:** `lib/demoStore.ts` appears to be legacy code. Only these functions are actually used:
- `setEventData()` - Used in onboarding flow
- `getEventData()` - Used in onboarding flow
- `clearEventData()` - Used in onboarding review
- `addEvent()` - Used in onboarding review
- `listEvents()` - Used in onboarding review (but also exists in `lib/demo/eventStore.ts`)
- `setRegistrationData()` - Used in register flow
- `getRegistrationData()` - Used in register/verification flows
- `resetDemoData()` - Used in API route

**Recommendation:** Consider consolidating remaining used functions into `lib/demo/` stores and removing the legacy file.

### 2. Unused Files

#### High Confidence - Safe to Remove

##### `lib/homepage.html`
- **Size:** 3.2MB (3,201,389 characters)
- **Type:** WordPress HTML export / Debug file
- **Usage:** Only referenced in `scripts/download-media.js` for media extraction
- **Status:** Not imported in any TypeScript/TSX files
- **Confidence:** High
- **Action:** 
  - If media extraction is complete, remove file
  - If still needed, move to `scripts/` or `docs/` directory
  - Consider adding to `.gitignore` if it's a generated file

### 3. Unreachable/Incomplete Code

#### Medium Confidence - Review Recommended

##### `app/events/new/questions/page.tsx`
- **`handleNext()` function** (line 61-64)
  - **Status:** Contains TODO comment, no actual implementation
  - **Code:**
    ```typescript
    const handleNext = () => {
      // TODO: Implement event creation flow
      // router.push("/events/new/review");
    };
    ```
  - **Action:** Either implement or remove if route is not needed

##### `app/onboarding/page.tsx`
- **Status:** Deprecated page that redirects to `/events`
- **Note:** Still accessible but marked as deprecated
- **Action:** Consider removing if onboarding flow is fully deprecated

### 4. Unused Dependencies

#### Package.json Analysis

All dependencies appear to be used:
- **`@supabase/supabase-js`**: Used in `app/api/test/route.ts` and `lib/supabase/client.ts` ✅
- **`next`**: Framework dependency ✅
- **`react`** & **`react-dom`**: Framework dependencies ✅
- **`zustand`**: Used in `lib/demo/demoStore.ts` ✅

All devDependencies appear to be used:
- **`@playwright/test`**: Used in test scripts ✅
- **`@types/*`**: TypeScript type definitions ✅
- **`autoprefixer`**, **`postcss`**, **`tailwindcss`**: Build tools ✅
- **`eslint`**, **`eslint-config-next`**: Linting ✅
- **`typescript`**: Compiler ✅

**Result:** No unused dependencies found.

### 5. Dead CSS/Styles

**Analysis:** Using Tailwind CSS with utility classes. No custom CSS files found that could contain dead styles. All styles appear to be in use.

### 6. Unused Imports

#### Files with Potential Unused Imports

Need manual review for:
- Check each file for imports that are declared but never used
- TypeScript compiler should catch these, but worth verifying

---

## Phase 2: Safety Checks

### ✅ Verified Safe

1. **API Routes:**
   - `/api/test` - Used in E2E tests and documentation ✅
   - `/api/demo/reset` - Used in E2E tests ✅

2. **Public Routes:**
   - All page components are Next.js routes and should be kept ✅

3. **Type Definitions:**
   - All type exports are used for type checking ✅

4. **Test Files:**
   - All test files are in `tests/e2e/` and should be kept ✅

### ⚠️ Requires Review

1. **Onboarding Flow:**
   - `/onboarding` redirects to `/events` (deprecated)
   - `/onboarding/setup`, `/onboarding/questions`, `/onboarding/review` may still be used
   - **Action:** Verify if these routes are still needed or can be removed

2. **Legacy Demo Store:**
   - `lib/demoStore.ts` has many unused functions but some are still used
   - **Action:** Refactor to remove unused functions while keeping used ones

---

## Phase 3: Detailed Report

### High Confidence (Safe to Remove)

#### Files
1. **`lib/homepage.html`** (3.2MB)
   - **Reason:** Not imported, only used by script
   - **Lines:** Entire file
   - **Action:** Delete or move to scripts/docs

#### Functions
1. **`lib/matching/demoUsers.ts::getDefaultDemoUser()`**
   - **Lines:** 606-608
   - **Reason:** Never imported
   - **Action:** Delete

2. **`lib/chatStore.ts::subscribe()`**
   - **Lines:** 155-179
   - **Reason:** Never imported
   - **Action:** Delete or keep if planned for future

3. **`lib/demoStore.ts` - Multiple functions:**
   - `setDemoUser()` - Lines 25-28
   - `getDemoUser()` - Lines 30-56 (used internally, but export unused)
   - `markEventJoined()` - Lines 59-66
   - `isEventJoined()` - Lines 68-71
   - `markLiked()` - Lines 85-92
   - `isLiked()` - Lines 94-97
   - `createMatch()` - Lines 111-125
   - `listMatches()` - Lines 127-136
   - `hasMatch()` - Lines 138-141
   - `setQuestionnaireAnswers()` - Lines 144-147
   - `getQuestionnaireAnswers()` - Lines 149-158
   - `markSkipped()` - Lines 161-168
   - `isSkipped()` - Lines 170-173
   - **Action:** Remove unused exports (keep if used internally)

### Medium Confidence (Review Recommended)

1. **`app/events/new/questions/page.tsx::handleNext()`**
   - **Lines:** 61-64
   - **Reason:** TODO comment, incomplete implementation
   - **Action:** Implement or remove route

2. **Onboarding routes:**
   - `/onboarding` - Deprecated redirect
   - `/onboarding/setup`, `/onboarding/questions`, `/onboarding/review`
   - **Action:** Verify if still needed or remove entire flow

3. **`lib/demoStore.ts` consolidation**
   - **Action:** Consider moving remaining used functions to appropriate `lib/demo/` stores

### Low Confidence (Keep)

1. All public API routes (`/api/*`)
2. All page components (Next.js routes)
3. All type definitions
4. All test files
5. Configuration files (next.config.ts, tsconfig.json, etc.)

---

## Phase 4: Removal Strategy

### Recommended Approach

#### Step 1: Remove High Confidence Items (Separate Commits)

**Commit 1: Remove unused function exports**
```bash
# Remove getDefaultDemoUser
# Remove subscribe from chatStore
# Remove unused exports from demoStore.ts
```

**Commit 2: Remove or relocate homepage.html**
```bash
# Delete lib/homepage.html (if media extraction complete)
# OR move to scripts/ or docs/ directory
# Update scripts/download-media.js if path changes
```

**Commit 3: Clean up incomplete code**
```bash
# Implement or remove handleNext in events/new/questions/page.tsx
# Review and potentially remove deprecated onboarding routes
```

#### Step 2: Refactor Legacy Code (Separate PR)

**Refactor lib/demoStore.ts:**
1. Move `setEventData`, `getEventData`, `clearEventData` to `lib/demo/eventStore.ts`
2. Move `setRegistrationData`, `getRegistrationData` to `lib/demo/registrationStore.ts`
3. Move `addEvent`, `listEvents` (if different from eventStore) or consolidate
4. Keep `resetDemoData` in a utility file
5. Delete `lib/demoStore.ts` after migration

### Git Operations

```bash
# Create feature branch
git checkout -b cleanup/dead-code-removal

# Commit 1: Remove unused exports
git add lib/matching/demoUsers.ts lib/chatStore.ts lib/demoStore.ts
git commit -m "refactor: remove unused function exports"

# Commit 2: Remove homepage.html
git rm lib/homepage.html
git commit -m "chore: remove unused homepage.html file"

# Commit 3: Clean up incomplete code
git add app/events/new/questions/page.tsx
git commit -m "fix: implement or remove incomplete handleNext function"

# Push and create PR
git push origin cleanup/dead-code-removal
```

### Testing Checklist

After removal, verify:
- [ ] All tests pass (`npm run test:e2e`)
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] Application runs without errors
- [ ] All routes still accessible
- [ ] No console errors in browser

---

## Statistics

### Code Reduction Estimate

- **Files to Remove:** 1 (`lib/homepage.html` - 3.2MB)
- **Functions to Remove:** ~15 unused exports
- **Estimated Lines:** ~200-300 lines of code
- **Estimated Size Reduction:** ~3.2MB (mostly from homepage.html)

### Files Analyzed

- **Total TypeScript/TSX Files:** 114
- **Total Exports Found:** 278
- **Unused Exports:** ~15
- **Unused Export Rate:** ~5.4%

---

## Additional Notes

### Framework-Specific Considerations

- **Next.js 15:** All page components in `app/` directory are routes
- **TypeScript:** Type-only imports are valid even if not used in runtime
- **React:** Component exports are used by Next.js routing system

### Recommendations

1. **Enable ESLint unused import detection** to catch these automatically
2. **Set up pre-commit hooks** to prevent unused code
3. **Regular dead code audits** (quarterly recommended)
4. **Consider using tools like `ts-prune`** for automated detection

---

## Conclusion

The codebase is relatively clean with minimal dead code. The main issues are:
1. A large unused HTML file (3.2MB)
2. Legacy demo store functions that should be consolidated
3. A few unused utility functions

Most dead code appears to be from migration/refactoring efforts where old code wasn't fully removed. The removal process should be straightforward and low-risk.

---

**Report Generated By:** AI Code Analysis  
**Next Steps:** Review findings, create removal plan, execute removals in separate commits
