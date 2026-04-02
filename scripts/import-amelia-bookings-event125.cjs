#!/usr/bin/env node
/**
 * import-amelia-bookings-event125.cjs
 *
 * Imports 35 Amelia bookings for WP event #125 "Call a Cupid – Live Matchmaking"
 * into Supabase:
 *
 *  1. For each attendee – create Supabase auth user + profile if not already present
 *     (status=approved, city=sg, gender inferred from Amelia ticket type)
 *  2. Add as event_attendee to "Call a Cupid – Live Matchmaking" event
 *     payment_status=paid, ticket_status=paid, paid_at from booking date
 *
 * Usage:
 *   node scripts/import-amelia-bookings-event125.cjs           # dry-run
 *   CONFIRM=true node scripts/import-amelia-bookings-event125.cjs   # execute
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const DRY_RUN = process.env.CONFIRM !== "true";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// Target event UUID in our app
const EVENT_ID = "2a898049-e9b2-425f-bb2f-375092ec4aa1";

// Amelia ticket IDs → gender
// 303 = Male, 304 = Female, 305 = Early Bird Male, 306 = Early Bird Female
function genderFromTickets(tickets) {
  for (const t of tickets) {
    if (t.ticketId === 304 || t.ticketId === 306) return "female";
    if (t.ticketId === 303 || t.ticketId === 305) return "male";
  }
  return null;
}

function randomPassword() {
  return "Ns!" + crypto.randomBytes(16).toString("hex");
}

// Cache of auth users (loaded once)
let _authUsersCache = null;
async function getAuthUserByEmail(email) {
  if (!_authUsersCache) {
    // Load all auth users (paginate if needed)
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

// ── Raw Amelia bookings data ──────────────────────────────────────────────────
const BOOKINGS = [
  { id: 1449, firstName: "Preethy", lastName: "Janarthanan", email: "preethyjana@gmail.com", tickets: [{ ticketId: 304 }], payment: { dateTime: "2025-01-16 11:42:40" } },
  { id: 1451, firstName: "Anna", lastName: "Lipscomb", email: "annalipscomb@icloud.com", tickets: [{ ticketId: 304 }], payment: { dateTime: "2025-01-16 12:08:41" } },
  { id: 1452, firstName: "Huining", lastName: "", email: "bitbityang@gmail.com", tickets: [{ ticketId: 304 }], payment: { dateTime: "2025-01-16 14:16:07" } },
  { id: 1453, firstName: "Jun Han", lastName: "Tham", email: "yoyojunhan@gmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-16 14:31:35" } },
  { id: 1455, firstName: "Joie", lastName: "Ho", email: "joieho@live.com", tickets: [{ ticketId: 304 }], payment: { dateTime: "2025-01-16 19:19:06" } },
  { id: 1456, firstName: "Shabeer bin", lastName: "Abubakar", email: "shabeerinc@gmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-16 20:22:24" } },
  { id: 1457, firstName: "Sheryl", lastName: "S", email: "Sherylx97@gmail.com", tickets: [{ ticketId: 304 }], payment: { dateTime: "2025-01-17 00:56:49" } },
  { id: 1458, firstName: "Lee Tseng", lastName: "Wee", email: "leetsengwee32@gmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-17 01:24:36" } },
  { id: 1459, firstName: "Joseph", lastName: "Ang", email: "josephangwk@gmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-17 05:35:11" } },
  { id: 1460, firstName: "Vishaalini", lastName: "", email: "vishaalini.vv@gmail.com", tickets: [{ ticketId: 304 }], payment: { dateTime: "2025-01-17 06:28:38" } },
  { id: 1461, firstName: "Stanley", lastName: "Lui", email: "drakonide@gmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-17 10:17:12" } },
  { id: 1462, firstName: "Haley", lastName: "Le", email: "haleyleth@gmail.com", tickets: [{ ticketId: 304 }], payment: { dateTime: "2025-01-17 11:30:50" } },
  { id: 1463, firstName: "Joseph", lastName: "Toong Toong", email: "toongbh@hotmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-17 12:28:29" } },
  { id: 1464, firstName: "Javen", lastName: "Leo", email: "e0725986@u.nus.edu", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-17 14:00:02" } },
  { id: 1465, firstName: "Olivia", lastName: "Griselda", email: "oliv.griselda@gmail.com", tickets: [{ ticketId: 306 }], payment: { dateTime: "2025-01-17 15:36:00" } },
  { id: 1466, firstName: "Marc", lastName: "Tham", email: "marctham13@gmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-17 16:33:08" } },
  { id: 1467, firstName: "Cheng Yoke", lastName: "", email: "mybonheur@gmail.com", tickets: [{ ticketId: 304 }], payment: { dateTime: "2025-01-17 17:39:30" } },
  { id: 1468, firstName: "Teagan", lastName: "Tan", email: "kaifetan0@gmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-17 18:16:26" } },
  { id: 1469, firstName: "Ga Eun", lastName: "Ku", email: "springbloomsky@gmail.com", tickets: [{ ticketId: 304 }], payment: { dateTime: "2025-01-18 02:04:25" } },
  { id: 1470, firstName: "Dominic", lastName: "Yiu", email: "dominic.yiucy@gmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-18 03:18:11" } },
  { id: 1471, firstName: "Nathaniel", lastName: "Chua", email: "nathanielchua30@gmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-18 04:51:40" } },
  { id: 1472, firstName: "Jobelle", lastName: "Wee", email: "Jobellewee@rocketmail.com", tickets: [{ ticketId: 304 }], payment: { dateTime: "2025-01-18 07:48:09" } },
  { id: 1473, firstName: "Andrei", lastName: "Sim", email: "Cryptohuatlah@gmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-18 08:49:43" } },
  { id: 1474, firstName: "Felicia", lastName: "", email: "Bluepuplin@gmail.com", tickets: [{ ticketId: 304 }], payment: { dateTime: "2025-01-18 14:48:27" } },
  { id: 1475, firstName: "Khai Yang", lastName: "Ong", email: "okhaiyang@gmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-18 15:52:26" } },
  { id: 1476, firstName: "Fernanda", lastName: "Wee", email: "fernlin90@gmail.com", tickets: [{ ticketId: 304 }], payment: { dateTime: "2025-01-19 02:21:43" } },
  { id: 1477, firstName: "Joshua", lastName: "Chin", email: "joshuachinwj@gmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-19 05:20:07" } },
  { id: 1478, firstName: "Jia Rong", lastName: "Ching", email: "kacchinggg@gmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-19 07:42:27" } },
  { id: 1479, firstName: "Jiansheng", lastName: "Mark", email: "Markjian9671@gmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-19 08:12:51" } },
  { id: 1480, firstName: "Jiayi", lastName: "Min", email: "minjiayi97@gmail.com", tickets: [{ ticketId: 304 }], payment: { dateTime: "2025-01-19 09:47:29" } },
  { id: 1481, firstName: "Elgin", lastName: "Mah", email: "elginmahcx@gmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-19 12:55:57" } },
  { id: 1482, firstName: "Elizabeth", lastName: "Yeo", email: "zeelele13@gmail.com", tickets: [{ ticketId: 304 }], payment: { dateTime: "2025-01-19 15:08:19" } },
  { id: 1485, firstName: "Joseph", lastName: "Lee", email: "jsphl94@gmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-20 04:16:38" } },
  { id: 1486, firstName: "Yibin", lastName: "Park", email: "eebinism_97@hotmail.com", tickets: [{ ticketId: 304 }], payment: { dateTime: "2025-01-20 05:42:52" } },
  { id: 1488, firstName: "Chester", lastName: "Chin", email: "Chesterchin97@gmail.com", tickets: [{ ticketId: 303 }], payment: { dateTime: "2025-01-20 13:37:02" } },
];

// Amelia times are UTC+8 (Singapore) – convert to UTC ISO
function sgToUtc(str) {
  return new Date(str.replace(" ", "T") + "+08:00").toISOString();
}

async function ensureProfile(booking) {
  const email = booking.email.toLowerCase().trim();
  const gender = genderFromTickets(booking.tickets);
  const displayName = [booking.firstName, booking.lastName].filter(Boolean).join(" ").trim();

  // 1. Check if profile already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, email, status")
    .ilike("email", email)
    .maybeSingle();

  if (existing) {
    return { profileId: existing.id, action: "existing_profile" };
  }

  // 2. Check if auth user exists (orphaned from a previous failed run)
  let authUserId = null;
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: randomPassword(),
    email_confirm: true,
    user_metadata: { display_name: displayName, name: displayName },
  });

  if (authErr) {
    if (authErr.message.toLowerCase().includes("already") || authErr.status === 422) {
      // Auth user already exists – find it
      const existingAuthUser = await getAuthUserByEmail(email);
      if (!existingAuthUser) throw new Error(`Auth user exists but could not be found: ${email}`);
      authUserId = existingAuthUser.id;
    } else {
      throw new Error(`Auth creation failed for ${email}: ${authErr.message}`);
    }
  } else {
    authUserId = authData.user.id;
  }

  // 3. Create profile
  const { error: profileErr } = await supabase.from("profiles").insert({
    id: authUserId,
    email,
    display_name: displayName,
    name: displayName,
    gender,
    city: "sg",
    status: "approved",
    role: "user",
    wp_source: "amelia_import",
  });

  if (profileErr) throw new Error(`Profile insert failed for ${email}: ${profileErr.message}`);

  return { profileId: authUserId, action: "created" };
}

async function ensureAttendee(profileId, booking) {
  const paidAt = sgToUtc(booking.payment.dateTime);

  const { error } = await supabase.from("event_attendees").upsert(
    {
      event_id: EVENT_ID,
      profile_id: profileId,
      payment_status: "paid",
      ticket_status: "paid",
      paid_at: paidAt,
    },
    { onConflict: "event_id,profile_id" }
  );

  if (error) throw new Error(`Attendee upsert failed for profile ${profileId}: ${error.message}`);
}

async function run() {
  console.log(DRY_RUN ? "🔍  DRY RUN — no writes" : "🚀  LIVE RUN — writing to Supabase");
  console.log(`📋  Processing ${BOOKINGS.length} bookings for event ${EVENT_ID}\n`);

  const results = { created: 0, existing: 0, attendees: 0, errors: [] };

  for (const booking of BOOKINGS) {
    const email = booking.email.toLowerCase().trim();
    const displayName = [booking.firstName, booking.lastName].filter(Boolean).join(" ").trim();
    const gender = genderFromTickets(booking.tickets);

    console.log(`  → ${displayName} <${email}> [${gender ?? "unknown"}]`);

    if (DRY_RUN) {
      console.log(`     [DRY RUN] would ensure profile + add as paid attendee`);
      continue;
    }

    try {
      const { profileId, action: profileAction } = await ensureProfile(booking);
      console.log(`     profile: ${profileAction} (${profileId})`);
      if (profileAction === "created") results.created++;
      else results.existing++;

      await ensureAttendee(profileId, booking);
      console.log(`     attendee: upserted ✓`);
      results.attendees++;
    } catch (err) {
      console.error(`     ❌  ${err.message}`);
      results.errors.push({ email, error: err.message });
    }
  }

  console.log("\n─────────────────────────────");
  if (DRY_RUN) {
    console.log("✅  Dry run complete. Run with CONFIRM=true to execute.");
  } else {
    console.log(`✅  Done.`);
    console.log(`   Profiles created  : ${results.created}`);
    console.log(`   Profiles existing : ${results.existing}`);
    console.log(`   Attendees upserted: ${results.attendees}`);
    if (results.errors.length) {
      console.log(`   ❌  Errors (${results.errors.length}):`);
      results.errors.forEach((e) => console.log(`      ${e.email}: ${e.error}`));
    }
  }
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
