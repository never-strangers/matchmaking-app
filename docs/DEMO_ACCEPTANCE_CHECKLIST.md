# Production Demo Acceptance Checklist

**Purpose:** Manual acceptance criteria for the invite-only, real-time, persistent demo (~30 people).  
**Auth:** Invite links / QR only. No OTP. No typing. Session via HttpOnly cookie.

---

## Pre-requisites

- [ ] Supabase project has migrations applied (`002_demo_core.sql`, `003_seed_demo.sql`)
- [ ] `.env.local` has `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `APP_SESSION_SECRET`
- [ ] Invite links generated (e.g. `npm run seed:demo` and use printed URLs)

---

## 1. Invite-link auth

- [ ] Visiting `/invite/[token]` with a valid token sets session cookie and redirects to `/events`
- [ ] Invalid or inactive token returns 401 / error
- [ ] Nav shows “Get Invite” when not logged in (desktop and mobile)
- [ ] After login via invite, nav shows Events, Match, (Messages if enabled), Admin (if admin), and user pill
- [ ] Logout clears session and redirects; nav shows “Get Invite” again
- [ ] Unauthenticated access to `/events`, `/match`, `/admin` redirects to `/` or shows appropriate gate

---

## 2. Events & questionnaire

- [ ] `/events` lists the live demo event; joined status and “Questionnaire complete” reflect DB state
- [ ] Clicking into event questions loads questions from Supabase; answers load and prefill
- [ ] Saving answers persists to Supabase and “Save Answers” reflects success
- [ ] Joining an event (e.g. on first open of questions) upserts `event_attendees`; no duplicate joins

---

## 3. Admin & matching

- [ ] Admin user (via admin invite token) can open `/admin`; non-admin redirects to `/events`
- [ ] Admin sees event list with match counts from `match_results`
- [ ] “Run Matching” runs server-side matching, creates `match_runs` and upserts `match_results`
- [ ] After run, match count updates (and/or page refreshes via realtime)

---

## 4. Match page & likes

- [ ] `/match` shows introductions for the current user with compatibility score and aligned/mismatch reasons
- [ ] Display names come from `profiles.display_name` (or fallback)
- [ ] “Express Interest” records a like; button state updates (e.g. “Interest sent” or UI refresh)
- [ ] When the other user has already liked the current user, mutual like is detected
- [ ] For mutual likes, “Chat on WhatsApp” CTA is shown with correct `wa.me` link using the other profile’s `phone_e164`

---

## 5. Realtime (optional but desired)

- [ ] After admin runs matching, match page updates without full reload (realtime on `match_results` / `match_runs`)
- [ ] When another user likes the current user, match page updates to show mutual / WhatsApp CTA (realtime on `likes`)

---

## 6. Hardening & navigation

- [ ] No nav link to old phone/OTP register flow from main nav (mobile shows “Get Invite” → `/`)
- [ ] Unauthenticated visit to `/messages` redirects to `/` (invite flow)
- [ ] Internal chat can be hidden/disabled for demo (e.g. `NEXT_PUBLIC_CHAT_MODE` off)

---

## Quick smoke

1. Open invite link → land on `/events`.
2. Complete event questions → save answers.
3. As admin: run matching.
4. As user: open `/match` → express interest on one match.
5. As the other user (second invite): open `/match` → express interest back → see “Chat on WhatsApp” and open link.

---

*Last updated: Jan 2026*
