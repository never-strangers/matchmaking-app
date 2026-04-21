#!/usr/bin/env node
/**
 * import-amelia-bookings-hk-dating-129.cjs
 * 32 approved Amelia bookings for Dating Mixer (20s to 30s) – Hong Kong
 * Amelia event ID: 129  |  Supabase event ID: 3293f805-3dec-424c-a61c-c4a0a1732c20
 *
 * Ticket IDs:
 *   319: [Early Bird] Male  → male
 *   320: [Early Bird] Female → female
 *   321: Male               → male
 *   322: Female             → female
 *
 * Payment handling:
 *   stripe paid   → payment_status: "paid",   ticket_status: "paid"
 *   onSite pending → payment_status: "unpaid", ticket_status: "reserved"
 *
 * Usage:
 *   node scripts/import-amelia-bookings-hk-dating-129.cjs           # dry-run
 *   CONFIRM=true node scripts/import-amelia-bookings-hk-dating-129.cjs   # execute
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
const EVENT_ID = "3293f805-3dec-424c-a61c-c4a0a1732c20";

function genderFromTickets(tickets) {
  for (const t of tickets) {
    if (t.ticketId === 319 || t.ticketId === 321) return "male";
    if (t.ticketId === 320 || t.ticketId === 322) return "female";
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

const BOOKINGS = [
  { id: 7153, firstName: "Laura Elian", lastName: "Bosma",       email: "lauraelianbosma@gmail.com",    tickets: [{ ticketId: 320 }], payment: { status: "paid",    dateTime: "2026-03-31 11:35:28" } },
  { id: 7155, firstName: "Tammy",       lastName: "Lam",          email: "tammylam3288@yahoo.com.hk",   tickets: [{ ticketId: 320 }], payment: { status: "paid",    dateTime: "2026-03-31 13:26:03" } },
  { id: 7164, firstName: "Yuen Yee",    lastName: "Lam",          email: "lyy9742@gmail.com",            tickets: [{ ticketId: 320 }], payment: { status: "paid",    dateTime: "2026-03-31 22:51:22" } },
  { id: 7168, firstName: "Sun Qian",    lastName: "Wang",         email: "lyrousws@gmail.com",           tickets: [{ ticketId: 320 }], payment: { status: "paid",    dateTime: "2026-04-01 04:54:46" } },
  { id: 7171, firstName: "Isis",        lastName: "Wong",         email: "isis705730@gmail.com",         tickets: [{ ticketId: 320 }], payment: { status: "paid",    dateTime: "2026-04-01 06:34:24" } },
  { id: 7193, firstName: "Nestor",      lastName: "San Valentin", email: "nestor.sanvalentin@gmail.com", tickets: [{ ticketId: 319 }], payment: { status: "paid",    dateTime: "2026-04-02 06:58:08" } },
  { id: 7197, firstName: "Ryan",        lastName: "Lee",          email: "leeryan824@gmail.com",         tickets: [{ ticketId: 319 }], payment: { status: "paid",    dateTime: "2026-04-02 08:18:00" } },
  { id: 7198, firstName: "Kerrie",      lastName: "Chiu",         email: "kerriechiu@hotmail.com",       tickets: [{ ticketId: 320 }], payment: { status: "pending", dateTime: "2026-04-02 08:33:43" } },
  { id: 7199, firstName: "Harry",       lastName: "Kwan",         email: "harryk417@hotmail.com",        tickets: [{ ticketId: 319 }], payment: { status: "paid",    dateTime: "2026-04-02 08:42:31" } },
  { id: 7201, firstName: "Kylie",       lastName: "Yip",          email: "yippy.yip96@gmail.com",        tickets: [{ ticketId: 322 }], payment: { status: "pending", dateTime: "2026-04-02 08:47:34" } },
  { id: 7209, firstName: "TungTung",    lastName: "Cheung",       email: "tungtungc0307@gmail.com",      tickets: [{ ticketId: 322 }], payment: { status: "paid",    dateTime: "2026-04-02 11:57:33" } },
  { id: 7210, firstName: "Kevin",       lastName: "Ho",           email: "tjendanokevin@gmail.com",      tickets: [{ ticketId: 319 }], payment: { status: "paid",    dateTime: "2026-04-02 13:43:29" } },
  { id: 7220, firstName: "Jane",        lastName: "Yeo",          email: "jane.y.0404@gmail.com",        tickets: [{ ticketId: 322 }], payment: { status: "paid",    dateTime: "2026-04-03 06:44:55" } },
  { id: 7224, firstName: "Jeonghyo",    lastName: "Song",         email: "jeonghyo1028@gmail.com",       tickets: [{ ticketId: 322 }], payment: { status: "paid",    dateTime: "2026-04-03 08:58:50" } },
  { id: 7232, firstName: "Hua",         lastName: "Lai",          email: "laiminhua126@outlook.com",     tickets: [{ ticketId: 322 }], payment: { status: "paid",    dateTime: "2026-04-03 14:40:22" } },
  { id: 7260, firstName: "Kristy",      lastName: "Yuen",         email: "xxkrispyxx@hotmail.com",       tickets: [{ ticketId: 322 }], payment: { status: "paid",    dateTime: "2026-04-04 16:56:06" } },
  { id: 7262, firstName: "Kev",         lastName: "Poon",         email: "Kevinpoon10@gmail.com",        tickets: [{ ticketId: 319 }], payment: { status: "paid",    dateTime: "2026-04-05 00:14:48" } },
  { id: 7269, firstName: "Ernest",      lastName: "Chan",         email: "ernestchan156@gmail.com",      tickets: [{ ticketId: 321 }], payment: { status: "paid",    dateTime: "2026-04-05 03:38:17" } },
  { id: 7273, firstName: "Marcus",      lastName: "Wong",         email: "show_mw@live.hk",              tickets: [{ ticketId: 321 }], payment: { status: "paid",    dateTime: "2026-04-05 05:09:45" } },
  { id: 7287, firstName: "Venera",      lastName: "Shakirova",    email: "venerashakirova18@gmail.com",  tickets: [{ ticketId: 322 }], payment: { status: "pending", dateTime: "2026-04-06 02:51:43" } },
  { id: 7288, firstName: "Shannon",     lastName: "So",           email: "so.shannon@yahoo.com",         tickets: [{ ticketId: 322 }], payment: { status: "paid",    dateTime: "2026-04-06 03:36:24" } },
  { id: 7291, firstName: "Justin",      lastName: "Au",           email: "justinau0108@gmail.com",       tickets: [{ ticketId: 321 }], payment: { status: "paid",    dateTime: "2026-04-06 04:19:16" } },
  { id: 7298, firstName: "Arienna",     lastName: "Lui",          email: "ariennalui@gmail.com",         tickets: [{ ticketId: 322 }], payment: { status: "paid",    dateTime: "2026-04-06 10:09:35" } },
  { id: 7299, firstName: "Eunice",      lastName: "AY",           email: "auyeungheiyuen@gmail.com",     tickets: [{ ticketId: 322 }], payment: { status: "paid",    dateTime: "2026-04-06 10:16:51" } },
  { id: 7300, firstName: "Hon Tin",     lastName: "DY",           email: "hontin1994520@gmail.com",      tickets: [{ ticketId: 321 }], payment: { status: "paid",    dateTime: "2026-04-06 11:35:11" } },
  { id: 7314, firstName: "Jenny",       lastName: "Lau",          email: "cutiegoth@gmail.com",          tickets: [{ ticketId: 322 }], payment: { status: "paid",    dateTime: "2026-04-07 02:51:53" } },
  { id: 7323, firstName: "Yan Tung",    lastName: "Ho",           email: "tristaho46@gmail.com",         tickets: [{ ticketId: 322 }], payment: { status: "paid",    dateTime: "2026-04-07 12:46:26" } },
  { id: 7324, firstName: "Rick",        lastName: "Law",          email: "ricklaw339@gmail.com",         tickets: [{ ticketId: 321 }], payment: { status: "paid",    dateTime: "2026-04-07 12:51:16" } },
  { id: 7330, firstName: "Kim",         lastName: "Li",           email: "nicoleli0627@gmail.com",       tickets: [{ ticketId: 322 }], payment: { status: "paid",    dateTime: "2026-04-08 02:59:44" } },
  { id: 7341, firstName: "Toby",        lastName: "Hung",         email: "tobyhung829@gmail.com",        tickets: [{ ticketId: 321 }], payment: { status: "paid",    dateTime: "2026-04-08 07:57:12" } },
  { id: 7342, firstName: "Hoey",        lastName: "Lee",          email: "hoeylee1118@gmail.com",        tickets: [{ ticketId: 322 }], payment: { status: "paid",    dateTime: "2026-04-08 07:58:21" } },
  { id: 7347, firstName: "Grace",       lastName: "Cho",          email: "gayeong08@hotmail.com",        tickets: [{ ticketId: 322 }], payment: { status: "paid",    dateTime: "2026-04-08 11:39:26" } },
];

function hkToUtc(str) {
  return new Date(str.replace(" ", "T") + "+08:00").toISOString();
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
    gender, city: "hk", status: "approved", role: "user", wp_source: "amelia_import",
  });
  if (profileErr) throw new Error("Profile insert failed for " + email + ": " + profileErr.message);
  return { profileId: authUserId, action: "created" };
}

async function ensureAttendee(profileId, booking) {
  const isPaid = booking.payment.status === "paid";
  const paidAt = isPaid ? hkToUtc(booking.payment.dateTime) : null;
  const { error } = await supabase.from("event_attendees").upsert(
    {
      event_id: EVENT_ID,
      profile_id: profileId,
      payment_status: isPaid ? "paid" : "unpaid",
      ticket_status: isPaid ? "paid" : "reserved",
      ...(paidAt ? { paid_at: paidAt } : {}),
    },
    { onConflict: "event_id,profile_id" }
  );
  if (error) throw new Error("Attendee upsert failed for " + profileId + ": " + error.message);
  return isPaid ? "paid" : "unpaid";
}

async function run() {
  console.log(DRY_RUN ? "DRY RUN - no writes" : "LIVE RUN - writing to Supabase");
  console.log("Processing " + BOOKINGS.length + " bookings for HK Dating Mixer " + EVENT_ID + "\n");
  const results = { created: 0, approved: 0, existing: 0, attendees: 0, errors: [] };

  for (const booking of BOOKINGS) {
    const email = booking.email.toLowerCase().trim();
    const displayName = [booking.firstName, booking.lastName].filter(Boolean).join(" ").trim();
    const gender = genderFromTickets(booking.tickets);
    const payTag = booking.payment.status === "paid" ? "paid" : "onSite/pending";
    console.log("  -> " + displayName + " <" + email + "> [" + (gender || "unknown") + "] [" + payTag + "]");

    if (DRY_RUN) { console.log("     [DRY RUN] would ensure profile + add as attendee"); continue; }

    try {
      const { profileId, action } = await ensureProfile(booking);
      console.log("     profile: " + action + " (" + profileId + ")");
      if (action === "created") results.created++;
      else if (action === "approved_existing") results.approved++;
      else results.existing++;
      const payStatus = await ensureAttendee(profileId, booking);
      console.log("     attendee: upserted OK [" + payStatus + "]");
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
