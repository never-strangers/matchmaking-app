#!/usr/bin/env node
/**
 * import-amelia-bookings-hcm-friends-124.cjs
 * 13 approved Amelia bookings for Friends Mixer (20s to 30s) – Ho Chi Minh City
 * Amelia event ID: 124  |  Supabase event ID: cbb016f7-3a11-4007-818d-1d1c4ffa5b07
 *
 * Usage:
 *   node scripts/import-amelia-bookings-hcm-friends-124.cjs           # dry-run
 *   CONFIRM=true node scripts/import-amelia-bookings-hcm-friends-124.cjs   # execute
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const DRY_RUN = process.env.CONFIRM !== "true";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const EVENT_ID = "cbb016f7-3a11-4007-818d-1d1c4ffa5b07";

// Ticket ID → gender
// 300: Female, 301: Early Bird Male, 302: Early Bird Female
function genderFromTickets(tickets) {
  for (const t of tickets) {
    if (t.ticketId === 300 || t.ticketId === 302) return "female";
    if (t.ticketId === 301) return "male";
  }
  return null;
}

function randomPassword() {
  return "Ns!" + crypto.randomBytes(16).toString("hex");
}

let _authUsersCache = null;
async function getAuthUserByEmail(email) {
  if (!_authUsersCache) {
    _authUsersCache = [];
    let page = 1;
    while (true) {
      const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (!data || data.users.length === 0) break;
      _authUsersCache.push(...data.users);
      if (data.users.length < 1000) break;
      page++;
    }
  }
  return _authUsersCache.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

// 13 approved bookings (canceled booking 6997 excluded)
const BOOKINGS = [
  { id: 7033, firstName: "Charlotte",   lastName: "Vo",           email: "vophuonganh2712@gmail.com",     tickets: [{ ticketId: 302 }], payment: { dateTime: "2026-03-23 12:46:04" } },
  { id: 7158, firstName: "Jenny",       lastName: "Pham",         email: "jennypham00222@gmail.com",      tickets: [{ ticketId: 302 }], payment: { dateTime: "2026-03-31 15:24:49" } },
  { id: 7161, firstName: "Cathy",       lastName: "Le",           email: "cathyle024@gmail.com",          tickets: [{ ticketId: 302 }], payment: { dateTime: "2026-03-31 15:27:59" } },
  { id: 7167, firstName: "Mei",         lastName: "Ho",           email: "lisnhinhi@gmail.com",           tickets: [{ ticketId: 302 }], payment: { dateTime: "2026-04-01 04:48:32" } },
  { id: 7212, firstName: "My Tam",      lastName: "Luu",          email: "luumytam0613@gmail.com",        tickets: [{ ticketId: 300 }], payment: { dateTime: "2026-04-02 15:06:18" } },
  { id: 7253, firstName: "Thủy Trang", lastName: "Dương",        email: "Duongthuytrang2209@gmail.com",  tickets: [{ ticketId: 300 }], payment: { dateTime: "2026-04-04 13:59:41" } },
  { id: 7274, firstName: "Minh Chau",   lastName: "Tran",         email: "minhchautran32@gmail.com",      tickets: [{ ticketId: 300 }], payment: { dateTime: "2026-04-05 06:11:24" } },
  { id: 7309, firstName: "Dũng",       lastName: "Nguyễn",       email: "dungnguyen.bill@gmail.com",     tickets: [{ ticketId: 301 }], payment: { dateTime: "2026-04-06 16:07:17" } },
  { id: 7313, firstName: "Linh",        lastName: "Nguyen",       email: "thuyliinhh@gmail.com",          tickets: [{ ticketId: 302 }], payment: { dateTime: "2026-04-07 02:36:53" } },
  { id: 7348, firstName: "Chi",         lastName: "Tran",         email: "daphnetvu@gmail.com",           tickets: [{ ticketId: 300 }], payment: { dateTime: "2026-04-08 12:20:06" } },
  { id: 7360, firstName: "Duyên",      lastName: "Nguyễn",       email: "Nguyenduyenhou98@gmail.com",    tickets: [{ ticketId: 300 }], payment: { dateTime: "2026-04-09 03:57:53" } },
  { id: 7361, firstName: "Amy",         lastName: "Nguyen",       email: "amy.nk.nguyen@gmail.com",       tickets: [{ ticketId: 300 }], payment: { dateTime: "2026-04-09 04:08:19" } },
  { id: 7366, firstName: "Jean Charles",lastName: "Ly",           email: "ly_jeancharles@yahoo.fr",       tickets: [{ ticketId: 301 }], payment: { dateTime: "2026-04-09 10:33:41" } },
];

function sgToUtc(str) {
  // Amelia stores in UTC+7 (Vietnam time)
  return new Date(str.replace(" ", "T") + "+07:00").toISOString();
}

async function ensureProfile(booking) {
  const email = booking.email.toLowerCase().trim();
  const gender = genderFromTickets(booking.tickets);
  const displayName = [booking.firstName, booking.lastName].filter(Boolean).join(" ").trim();

  const { data: existing } = await supabase.from("profiles").select("id,status").ilike("email", email).maybeSingle();
  if (existing) {
    if (existing.status !== "approved") {
      await supabase.from("profiles").update({ status: "approved" }).eq("id", existing.id);
      return { profileId: existing.id, action: "approved_existing" };
    }
    return { profileId: existing.id, action: "existing_profile" };
  }

  let authUserId = null;
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email, password: randomPassword(), email_confirm: true,
    user_metadata: { display_name: displayName, name: displayName },
  });
  if (authErr) {
    if (authErr.message.toLowerCase().includes("already") || authErr.status === 422) {
      const u = await getAuthUserByEmail(email);
      if (!u) throw new Error("Auth user exists but not found: " + email);
      authUserId = u.id;
    } else {
      throw new Error("Auth creation failed for " + email + ": " + authErr.message);
    }
  } else {
    authUserId = authData.user.id;
  }

  const { error: profileErr } = await supabase.from("profiles").insert({
    id: authUserId, email, display_name: displayName, name: displayName,
    gender, city: "hcm", status: "approved", role: "user", wp_source: "amelia_import",
  });
  if (profileErr) throw new Error("Profile insert failed for " + email + ": " + profileErr.message);
  return { profileId: authUserId, action: "created" };
}

async function ensureAttendee(profileId, booking) {
  const paidAt = sgToUtc(booking.payment.dateTime);
  const { error } = await supabase.from("event_attendees").upsert(
    { event_id: EVENT_ID, profile_id: profileId, payment_status: "paid", ticket_status: "paid", paid_at: paidAt },
    { onConflict: "event_id,profile_id" }
  );
  if (error) throw new Error("Attendee upsert failed for " + profileId + ": " + error.message);
}

async function run() {
  console.log(DRY_RUN ? "DRY RUN - no writes" : "LIVE RUN - writing to Supabase");
  console.log("Processing " + BOOKINGS.length + " bookings for HCM Friends Mixer " + EVENT_ID + "\n");
  const results = { created: 0, approved: 0, existing: 0, attendees: 0, errors: [] };

  for (const booking of BOOKINGS) {
    const email = booking.email.toLowerCase().trim();
    const displayName = [booking.firstName, booking.lastName].filter(Boolean).join(" ").trim();
    const gender = genderFromTickets(booking.tickets);
    console.log("  -> " + displayName + " <" + email + "> [" + (gender || "unknown") + "]");

    if (DRY_RUN) { console.log("     [DRY RUN] would ensure profile + add as paid attendee"); continue; }

    try {
      const { profileId, action } = await ensureProfile(booking);
      console.log("     profile: " + action + " (" + profileId + ")");
      if (action === "created") results.created++;
      else if (action === "approved_existing") results.approved++;
      else results.existing++;
      await ensureAttendee(profileId, booking);
      console.log("     attendee: upserted OK");
      results.attendees++;
    } catch (err) {
      console.error("     ERROR: " + err.message);
      results.errors.push({ email, error: err.message });
    }
  }

  console.log("\n--- Summary ---");
  if (DRY_RUN) { console.log("Dry run complete. Run with CONFIRM=true to execute."); return; }
  console.log("Profiles created         : " + results.created);
  console.log("Profiles approved (fixed): " + results.approved);
  console.log("Profiles already OK      : " + results.existing);
  console.log("Attendees upserted       : " + results.attendees);
  if (results.errors.length) {
    console.log("Errors (" + results.errors.length + "):");
    results.errors.forEach(e => console.log("  " + e.email + ": " + e.error));
  }
}

run().catch(err => { console.error("Fatal:", err); process.exit(1); });
