#!/usr/bin/env node
/**
 * import-amelia-bookings-kl-dating-123.cjs
 *
 * Imports 57 approved Amelia bookings for WP event #123
 * "Dating Mixer (20s to 30s) – Kuala Lumpur" (2026-04-18)
 * into Supabase.
 *
 * For each attendee:
 *   1. Create Supabase auth user + profile if not already present
 *      (status=approved, city=kl, gender inferred from Amelia ticket type)
 *   2. Upsert event_attendee on the NS event
 *      payment_status=paid, ticket_status=paid, paid_at from booking date
 *
 * Usage:
 *   node scripts/import-amelia-bookings-kl-dating-123.cjs           # dry-run
 *   CONFIRM=true node scripts/import-amelia-bookings-kl-dating-123.cjs   # execute
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

// Amelia eventTicketId → gender
// 295 = Male (+1 Free Drink & Afterparty)
// 296 = Female (+1 Free Drink & Afterparty)
// 297 = [Early Bird] Male (+1 Free Drink & Afterparty)
// 298 = [Early Bird] Female (+1 Free Drink & Afterparty)
function genderFromTicketId(ticketId) {
  if (ticketId === 296 || ticketId === 298) return "female";
  if (ticketId === 295 || ticketId === 297) return "male";
  return null;
}

function buildDisplayName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
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

// ── 57 approved Amelia bookings for WP event #123 ────────────────────────────
const BOOKINGS = [
  { id: 6932, firstName: "Francesca",       lastName: "Clews",             email: "Clewsi@icloud.com",               ticketId: 298, paymentDate: "2026-03-15 08:12:29" },
  { id: 6937, firstName: "Wuming",          lastName: "Sia",               email: "wumingsia@gmail.com",             ticketId: 297, paymentDate: "2026-03-15 11:14:54" },
  { id: 6940, firstName: "Kai Li",          lastName: "Lim",               email: "limkaili34@gmail.com",            ticketId: 298, paymentDate: "2026-03-15 13:23:22" },
  { id: 6941, firstName: "Jian",            lastName: "Lee",               email: "leejian1997@gmail.com",           ticketId: 297, paymentDate: "2026-03-15 14:03:03" },
  { id: 6964, firstName: "Anandharama",     lastName: "Manirajan",         email: "blood28demon@gmail.com",          ticketId: 297, paymentDate: "2026-03-17 12:02:23" },
  { id: 6985, firstName: "Yong Chun",       lastName: "Wee",               email: "weeyongchun2000@gmail.com",       ticketId: 297, paymentDate: "2026-03-19 02:49:20" },
  { id: 7006, firstName: "Jiaxi",           lastName: "Lim",               email: "Ljiaxi2000@gmail.com",            ticketId: 298, paymentDate: "2026-03-20 13:14:21" },
  { id: 7008, firstName: "Lee Ying",        lastName: "Foo",               email: "leeyingfoo@gmail.com",            ticketId: 298, paymentDate: "2026-03-21 02:18:54" },
  { id: 7017, firstName: "Amirzing",        lastName: "Shamsul",           email: "amirshamsul333@gmail.com",         ticketId: 297, paymentDate: "2026-03-22 01:28:04" },
  { id: 7046, firstName: "Ryan",            lastName: "Low",               email: "ryanlow2896@gmail.com",           ticketId: 295, paymentDate: "2026-03-23 14:48:07" },
  { id: 7056, firstName: "Ben",             lastName: "Yong",              email: "blyong86@gmail.com",              ticketId: 295, paymentDate: "2026-03-23 16:58:48" },
  { id: 7059, firstName: "LIEW",            lastName: "ZUN SHAN",          email: "liewzunshan@gmail.com",           ticketId: 295, paymentDate: "2026-03-24 03:23:43" },
  { id: 7079, firstName: "Ashereen Jessy",  lastName: "Kanesan",           email: "ashereen5@gmail.com",             ticketId: 298, paymentDate: "2026-03-24 23:19:03" },
  { id: 7089, firstName: "samuel",          lastName: "lim",               email: "samuellimjinqju@gmail.com",       ticketId: 295, paymentDate: "2026-03-25 14:27:21" },
  { id: 7105, firstName: "Tom",             lastName: "Crawshaw",          email: "djtomcrawshaw@gmail.com",         ticketId: 295, paymentDate: "2026-03-27 00:52:31" },
  { id: 7111, firstName: "Poovendran",      lastName: "Thangarajah",       email: "poovenjunior@gmail.com",          ticketId: 295, paymentDate: "2026-03-27 04:20:24" },
  { id: 7131, firstName: "Khai",            lastName: "Az",                email: "deleven5.khairil@gmail.com",      ticketId: 295, paymentDate: "2026-03-29 08:09:44" },
  { id: 7132, firstName: "Shannon",         lastName: "Khoo",              email: "shannonkhoo@gmail.com",           ticketId: 296, paymentDate: "2026-03-29 14:59:56" },
  { id: 7133, firstName: "Estine",          lastName: "Kim",               email: "estine_kim@hotmail.com",          ticketId: 296, paymentDate: "2026-03-29 15:00:09" },
  { id: 7135, firstName: "Jared",           lastName: "Loi",               email: "j4redloi@gmail.com",             ticketId: 295, paymentDate: "2026-03-30 02:43:13" },
  { id: 7150, firstName: "Kyle",            lastName: "Lee",               email: "akylelee13@outlook.com",          ticketId: 295, paymentDate: "2026-03-31 10:00:40" },
  { id: 7176, firstName: "Clarise",         lastName: "Kong",              email: "shiling_823@hotmail.com",         ticketId: 296, paymentDate: "2026-04-01 12:09:01" },
  { id: 7217, firstName: "Nicholas",        lastName: "Phang",             email: "nicholasphang@yahoo.com",         ticketId: 295, paymentDate: "2026-04-03 04:32:07" },
  { id: 7218, firstName: "Scarlet",         lastName: "Vale",              email: "suannetasha15@gmail.com",         ticketId: 296, paymentDate: "2026-04-03 04:59:27" },
  { id: 7223, firstName: "Synne",           lastName: "Sogge Støhlmacher", email: "ss@humaninc.co",                 ticketId: 296, paymentDate: "2026-04-03 08:12:19" },
  { id: 7228, firstName: "Lucas",           lastName: "Tan",               email: "lucastnjl@gmail.com",             ticketId: 295, paymentDate: "2026-04-03 13:15:22" },
  { id: 7236, firstName: "Nicholas",        lastName: "Keng",              email: "nicholasteoh98@gmail.com",        ticketId: 295, paymentDate: "2026-04-04 03:07:37" },
  { id: 7241, firstName: "Zainab",          lastName: "Zahirah",           email: "zainabzahirah@gmail.com",         ticketId: 296, paymentDate: "2026-04-04 11:33:49" },
  { id: 7246, firstName: "Shi Ying",        lastName: "Tan",               email: "nightmerial@gmail.com",           ticketId: 296, paymentDate: "2026-04-04 13:38:00" },
  { id: 7250, firstName: "Azzman",          lastName: "Farid",             email: "azzmanariff@gmail.com",           ticketId: 295, paymentDate: "2026-04-04 13:44:56" },
  { id: 7320, firstName: "Poovan",          lastName: "Bryan",             email: "poovan96@yahoo.com",              ticketId: 295, paymentDate: "2026-04-07 10:44:35" },
  { id: 7325, firstName: "Nicholas",        lastName: "Jack",              email: "nicholasjack90@gmail.com",        ticketId: 295, paymentDate: "2026-04-07 14:35:05" },
  { id: 7326, firstName: "Park Hin",        lastName: "Yeung",             email: "parkvisualisations@gmail.com",    ticketId: 295, paymentDate: "2026-04-08 00:11:00" },
  { id: 7349, firstName: "Priyalini",       lastName: "R Vikneswaran",     email: "priyalini1997.pv@gmail.com",      ticketId: 296, paymentDate: "2026-04-08 14:33:22" },
  { id: 7350, firstName: "Valiant Neil",    lastName: "Dawson",            email: "valiantneildawson@gmail.com",     ticketId: 295, paymentDate: "2026-04-08 14:38:51" },
  { id: 7353, firstName: "Fiona",           lastName: "Keah",              email: "fionakeah@gmail.com",             ticketId: 296, paymentDate: "2026-04-08 15:50:16" },
  { id: 7355, firstName: "Ashley",          lastName: "Yuen",              email: "Ashleyyuenpuiyern@gmail.com",     ticketId: 296, paymentDate: "2026-04-08 23:19:39" },
  { id: 7356, firstName: "Yong Kang",       lastName: "Ee",                email: "r3play137@gmail.com",             ticketId: 295, paymentDate: "2026-04-08 23:35:47" },
  { id: 7370, firstName: "Yi Jun",          lastName: "Phung",             email: "yijun.phung@gmail.com",           ticketId: 296, paymentDate: "2026-04-10 02:24:04" },
  { id: 7371, firstName: "ng",              lastName: "andy wei how",      email: "andynwh@hotmail.com",             ticketId: 295, paymentDate: "2026-04-10 03:55:48" },
  { id: 7378, firstName: "Jing Biao",       lastName: "Foo",               email: "jingbiao20@gmail.com",            ticketId: 295, paymentDate: "2026-04-10 14:08:04" },
  { id: 7394, firstName: "Joyie",           lastName: "Chooi",             email: "Joyiechooi@hotmail.com",          ticketId: 296, paymentDate: "2026-04-11 20:04:18" },
  { id: 7396, firstName: "Jessica",         lastName: "Ngan",              email: "jessica.ngan8@gmail.com",         ticketId: 296, paymentDate: "2026-04-12 13:03:30" },
  { id: 7399, firstName: "Ariessa",         lastName: "Jasmine",           email: "ariessa12@gmail.com",             ticketId: 296, paymentDate: "2026-04-13 03:34:16" },
  { id: 7400, firstName: "Alyssa",          lastName: "Jasmine",           email: "alyssajasmine2211@gmail.com",     ticketId: 296, paymentDate: "2026-04-13 03:38:08" },
  { id: 7406, firstName: "Jessica",         lastName: "Murthy",            email: "jessicamurthy@gmail.com",         ticketId: 296, paymentDate: "2026-04-13 05:55:41" },
  { id: 7407, firstName: "Indah",           lastName: "Khadeeja",          email: "indahkhadeeja47@gmail.com",       ticketId: 296, paymentDate: "2026-04-13 07:11:53" },
  { id: 7411, firstName: "Takahiro",        lastName: "Omori",             email: "suzutoyo48@gmail.com",            ticketId: 295, paymentDate: "2026-04-13 13:49:56" },
  { id: 7412, firstName: "Kevindev",        lastName: "Singh",             email: "kevindev1989@gmail.com",          ticketId: 295, paymentDate: "2026-04-13 15:14:58" },
  { id: 7431, firstName: "Vijay",           lastName: "Verma",             email: "vermavijay15@gmail.com",          ticketId: 296, paymentDate: "2026-04-15 11:09:33" },
  { id: 7434, firstName: "Meen",            lastName: "Chew",              email: "chewmeen@gmail.com",              ticketId: 296, paymentDate: "2026-04-15 16:24:35" },
  { id: 7435, firstName: "Zhi Tung",        lastName: "Lim",               email: "zhitunglim@gmail.com",            ticketId: 296, paymentDate: "2026-04-15 16:25:53" },
  { id: 7443, firstName: "Zong Ying",       lastName: "Tan",               email: "zongying28@gmail.com",            ticketId: 296, paymentDate: "2026-04-16 08:32:51" },
  { id: 7444, firstName: "Farra Atiqa",     lastName: "Azmi",              email: "farraatiqa97@gmail.com",          ticketId: 296, paymentDate: "2026-04-16 12:01:46" },
  { id: 7448, firstName: "Ping Yuan",       lastName: "Lye",               email: "pingyuanlye_12@hotmail.com",      ticketId: 296, paymentDate: "2026-04-16 13:07:01" },
  { id: 7449, firstName: "Delyn",           lastName: "Choong",            email: "delynchoong95@gmail.com",         ticketId: 296, paymentDate: "2026-04-16 13:08:56" },
  { id: 7459, firstName: "Nicholas",        lastName: "Chu",               email: "nicholas0224@yahoo.com",          ticketId: 295, paymentDate: "2026-04-16 15:34:52" },
];

// Amelia times are UTC+8 (Malaysia) – convert to UTC ISO
function sgToUtc(str) {
  return new Date(str.replace(" ", "T") + "+08:00").toISOString();
}

async function findEventId() {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, start_at, city")
    .ilike("title", "%Dating Mixer%Kuala Lumpur%")
    .gte("start_at", "2026-04-18T00:00:00Z")
    .lte("start_at", "2026-04-19T00:00:00Z")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Event lookup failed: ${error.message}`);
  if (!data) throw new Error("Event not found. Make sure 'Dating Mixer (20s to 30s) – Kuala Lumpur' (2026-04-18) exists in the events table.");
  return data.id;
}

async function ensureProfile(booking, eventId) {
  const email = booking.email.toLowerCase().trim();
  const gender = genderFromTicketId(booking.ticketId);
  const displayName = buildDisplayName(booking.firstName, booking.lastName);

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, email, status")
    .ilike("email", email)
    .maybeSingle();

  if (existing) {
    if (existing.status !== "approved") {
      await supabase.from("profiles").update({ status: "approved" }).eq("id", existing.id);
      return { profileId: existing.id, action: "approved_existing" };
    }
    return { profileId: existing.id, action: "existing_profile" };
  }

  let authUserId = null;
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: randomPassword(),
    email_confirm: true,
    user_metadata: { display_name: displayName, name: displayName },
  });

  if (authErr) {
    if (authErr.message.toLowerCase().includes("already") || authErr.status === 422) {
      const existingAuthUser = await getAuthUserByEmail(email);
      if (!existingAuthUser) throw new Error(`Auth user exists but could not be found: ${email}`);
      authUserId = existingAuthUser.id;
    } else {
      throw new Error(`Auth creation failed for ${email}: ${authErr.message}`);
    }
  } else {
    authUserId = authData.user.id;
  }

  const { error: profileErr } = await supabase.from("profiles").insert({
    id: authUserId,
    email,
    display_name: displayName,
    name: displayName,
    gender,
    city: "kl",
    status: "approved",
    role: "user",
    wp_source: "amelia_import",
  });

  if (profileErr) throw new Error(`Profile insert failed for ${email}: ${profileErr.message}`);

  return { profileId: authUserId, action: "created" };
}

async function ensureAttendee(profileId, booking, eventId) {
  const paidAt = sgToUtc(booking.paymentDate);

  const { error } = await supabase.from("event_attendees").upsert(
    {
      event_id: eventId,
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

  const eventId = await findEventId();
  console.log(`📋  Event found: ${eventId}`);
  console.log(`📋  Processing ${BOOKINGS.length} approved bookings\n`);

  const results = { created: 0, approved: 0, existing: 0, attendees: 0, errors: [] };

  for (const booking of BOOKINGS) {
    const email = booking.email.toLowerCase().trim();
    const displayName = buildDisplayName(booking.firstName, booking.lastName);
    const gender = genderFromTicketId(booking.ticketId);

    console.log(`  → ${displayName} <${email}> [${gender ?? "unknown"}]`);

    if (DRY_RUN) {
      console.log(`     [DRY RUN] would ensure profile (approved) + add as paid attendee`);
      continue;
    }

    try {
      const { profileId, action: profileAction } = await ensureProfile(booking, eventId);
      console.log(`     profile: ${profileAction} (${profileId})`);
      if (profileAction === "created") results.created++;
      else if (profileAction === "approved_existing") results.approved++;
      else results.existing++;

      await ensureAttendee(profileId, booking, eventId);
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
    console.log(`   Profiles created         : ${results.created}`);
    console.log(`   Profiles approved (fixed): ${results.approved}`);
    console.log(`   Profiles already OK      : ${results.existing}`);
    console.log(`   Attendees upserted       : ${results.attendees}`);
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
