#!/usr/bin/env node
/**
 * import-amelia-bookings-event125-v2.cjs
 * All 87 Amelia bookings for Call a Cupid event.
 * Usage:
 *   node scripts/import-amelia-bookings-event125-v2.cjs           # dry-run
 *   CONFIRM=true node scripts/import-amelia-bookings-event125-v2.cjs   # execute
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
const EVENT_ID = "2a898049-e9b2-425f-bb2f-375092ec4aa1";

function genderFromTickets(tickets) {
  for (const t of tickets) {
    if (t.ticketId === 304 || t.ticketId === 306) return "female";
    if (t.ticketId === 303 || t.ticketId === 305) return "male";
  }
  return null;
}

function cleanLastName(ln) {
  if (!ln) return "";
  if (/gmail-com|hotmail-com|yahoo-com|icloud-com|outlook-com|bongzy-me|nus-edu|rocketmail/i.test(ln)) return "";
  if (ln === "-") return "";
  return ln;
}

function buildDisplayName(first, last) {
  return [first, cleanLastName(last)].filter(Boolean).join(" ").trim();
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
  { id: 7007,  firstName: "Preethy",     lastName: "Janarthanan",  email: "preethyjana@gmail.com",             tickets: [{ticketId:306}], payment: {dateTime:"2026-03-21 00:49:35"} },
  { id: 7028,  firstName: "Anna",         lastName: "Lipscomb",     email: "annalipscomb@icloud.com",           tickets: [{ticketId:306}], payment: {dateTime:"2026-03-23 09:07:26"} },
  { id: 7031,  firstName: "Huining",      lastName: "",             email: "bitbityang@gmail.com",              tickets: [{ticketId:306}], payment: {dateTime:"2026-03-23 10:53:45"} },
  { id: 7034,  firstName: "Jun Han",      lastName: "Tham",         email: "yoyojunhan@gmail.com",              tickets: [{ticketId:305}], payment: {dateTime:"2026-03-23 13:07:06"} },
  { id: 7035,  firstName: "Joie",         lastName: "Ho",           email: "joieho@live.com",                   tickets: [{ticketId:306}], payment: {dateTime:"2026-03-23 13:16:57"} },
  { id: 7036,  firstName: "Sheryl",       lastName: "S",            email: "Sherylx97@gmail.com",               tickets: [{ticketId:306}], payment: {dateTime:"2026-03-23 13:21:50"} },
  { id: 7042,  firstName: "Shabeer",      lastName: "bin Abubakar", email: "shabeerinc@gmail.com",              tickets: [{ticketId:305}], payment: {dateTime:"2026-03-23 14:09:56"} },
  { id: 7044,  firstName: "Lee",          lastName: "Tseng Wee",    email: "leetsengwee32@gmail.com",           tickets: [{ticketId:305}], payment: {dateTime:"2026-03-23 14:30:05"} },
  { id: 7052,  firstName: "Joseph",       lastName: "Ang",          email: "josephangwk@gmail.com",             tickets: [{ticketId:305}], payment: {dateTime:"2026-03-23 15:32:47"} },
  { id: 7062,  firstName: "Stanley",      lastName: "Lui",          email: "drakonide@gmail.com",               tickets: [{ticketId:305}], payment: {dateTime:"2026-03-24 03:52:25"} },
  { id: 7078,  firstName: "Vishaalini",   lastName: "",             email: "vishaalini.vv@gmail.com",           tickets: [{ticketId:304}], payment: {dateTime:"2026-03-24 22:54:17"} },
  { id: 7087,  firstName: "Haley",        lastName: "Le",           email: "haleyleth@gmail.com",               tickets: [{ticketId:304}], payment: {dateTime:"2026-03-25 12:27:45"} },
  { id: 7094,  firstName: "Olivia",       lastName: "Griselda",     email: "oliv.griselda@gmail.com",           tickets: [{ticketId:304}], payment: {dateTime:"2026-03-26 08:25:48"} },
  { id: 7122,  firstName: "Cheng",        lastName: "Yoke",         email: "mybonheur@gmail.com",               tickets: [{ticketId:304}], payment: {dateTime:"2026-03-27 15:38:18"} },
  { id: 7125,  firstName: "Ga Eun",       lastName: "Ku",           email: "springbloomsky@gmail.com",          tickets: [{ticketId:304}], payment: {dateTime:"2026-03-28 11:52:58"} },
  { id: 7126,  firstName: "Joseph Toong", lastName: "Toong",        email: "toongbh@hotmail.com",               tickets: [{ticketId:303}], payment: {dateTime:"2026-03-28 13:50:33"} },
  { id: 7129,  firstName: "Jobelle",      lastName: "Wee",          email: "Jobellewee@rocketmail.com",         tickets: [{ticketId:304}], payment: {dateTime:"2026-03-29 07:50:06"} },
  { id: 7130,  firstName: "Felicia",      lastName: "",             email: "Bluepuplin@gmail.com",              tickets: [{ticketId:304}], payment: {dateTime:"2026-03-29 07:50:49"} },
  { id: 7134,  firstName: "Javen",        lastName: "Leo",          email: "e0725986@u.nus.edu",                tickets: [{ticketId:303}], payment: {dateTime:"2026-03-29 15:35:58"} },
  { id: 7137,  firstName: "Marc",         lastName: "Tham",         email: "marctham13@gmail.com",              tickets: [{ticketId:303}], payment: {dateTime:"2026-03-30 05:48:25"} },
  { id: 7141,  firstName: "Fernanda",     lastName: "Wee",          email: "fernlin90@gmail.com",               tickets: [{ticketId:304}], payment: {dateTime:"2026-03-30 10:26:12"} },
  { id: 7142,  firstName: "Jiayi",        lastName: "Min",          email: "minjiayi97@gmail.com",              tickets: [{ticketId:304}], payment: {dateTime:"2026-03-30 12:36:13"} },
  { id: 7148,  firstName: "Elizabeth",    lastName: "Yeo",          email: "zeelele13@gmail.com",               tickets: [{ticketId:304}], payment: {dateTime:"2026-03-30 23:33:42"} },
  { id: 7149,  firstName: "Teagan Tan",   lastName: "",             email: "kaifetan0@gmail.com",               tickets: [{ticketId:303}], payment: {dateTime:"2026-03-30 23:43:49"} },
  { id: 7160,  firstName: "Dominic",      lastName: "Yiu",          email: "dominic.yiucy@gmail.com",           tickets: [{ticketId:303}], payment: {dateTime:"2026-03-31 15:27:55"} },
  { id: 7166,  firstName: "Nathaniel",    lastName: "Chua",         email: "nathanielchua30@gmail.com",         tickets: [{ticketId:303}], payment: {dateTime:"2026-04-01 03:53:16"} },
  { id: 7169,  firstName: "Andrei",       lastName: "Sim",          email: "Cryptohuatlah@gmail.com",           tickets: [{ticketId:303}], payment: {dateTime:"2026-04-01 05:21:13"} },
  { id: 7172,  firstName: "Khai Yang",    lastName: "Ong",          email: "okhaiyang@gmail.com",               tickets: [{ticketId:303}], payment: {dateTime:"2026-04-01 06:43:10"} },
  { id: 7177,  firstName: "Joshua",       lastName: "Chin",         email: "joshuachinwj@gmail.com",            tickets: [{ticketId:303}], payment: {dateTime:"2026-04-01 12:09:44"} },
  { id: 7180,  firstName: "Jia Rong",     lastName: "Ching",        email: "kacchinggg@gmail.com",              tickets: [{ticketId:303}], payment: {dateTime:"2026-04-01 13:06:44"} },
  { id: 7181,  firstName: "Jiansheng",    lastName: "Mark",         email: "Markjian9671@gmail.com",            tickets: [{ticketId:303}], payment: {dateTime:"2026-04-01 13:14:48"} },
  { id: 7183,  firstName: "Elgin",        lastName: "Mah",          email: "elginmahcx@gmail.com",              tickets: [{ticketId:303}], payment: {dateTime:"2026-04-01 14:53:09"} },
  { id: 7184,  firstName: "Yibin",        lastName: "Park",         email: "eebinism_97@hotmail.com",           tickets: [{ticketId:304}], payment: {dateTime:"2026-04-01 15:18:33"} },
  { id: 7186,  firstName: "Joseph",       lastName: "Lee",          email: "jsphl94@gmail.com",                 tickets: [{ticketId:303}], payment: {dateTime:"2026-04-01 15:47:34"} },
  { id: 7189,  firstName: "Chester",      lastName: "Chin",         email: "Chesterchin97@gmail.com",           tickets: [{ticketId:303}], payment: {dateTime:"2026-04-02 05:47:54"} },
  { id: 7195,  firstName: "Michelle",     lastName: "Wong",         email: "Mwongxy@yahoo.com.sg",              tickets: [{ticketId:304}], payment: {dateTime:"2026-04-02 07:59:24"} },
  { id: 7196,  firstName: "Yi Ting",      lastName: "Lim",          email: "Yitingg.lim@gmail.com",             tickets: [{ticketId:304}], payment: {dateTime:"2026-04-02 07:59:26"} },
  { id: 7205,  firstName: "Nin",          lastName: "Tan",          email: "e1505281@u.nus.edu",                tickets: [{ticketId:304}], payment: {dateTime:"2026-04-02 10:23:13"} },
  { id: 7206,  firstName: "Priscilla",    lastName: "Chan",         email: "priscillachan169@gmail.com",        tickets: [{ticketId:304}], payment: {dateTime:"2026-04-02 10:49:00"} },
  { id: 7214,  firstName: "Cedric",       lastName: "Lim",          email: "cedriclim1995@gmail.com",           tickets: [{ticketId:303}], payment: {dateTime:"2026-04-03 03:42:39"} },
  { id: 7215,  firstName: "Sze Lin",      lastName: "Chan",         email: "Chanszelinx@gmail.com",             tickets: [{ticketId:304}], payment: {dateTime:"2026-04-03 03:43:17"} },
  { id: 7216,  firstName: "Jian Hao",     lastName: "Wong",         email: "jianhao75@gmail.com",               tickets: [{ticketId:303}], payment: {dateTime:"2026-04-03 03:43:20"} },
  { id: 7219,  firstName: "Rara",         lastName: "Noviarti",     email: "Raradwin@gmail.com",                tickets: [{ticketId:304}], payment: {dateTime:"2026-04-03 05:45:35"} },
  { id: 7229,  firstName: "Yngran",       lastName: "Guinto",       email: "yngran@yahoo.com",                  tickets: [{ticketId:304}], payment: {dateTime:"2026-04-03 13:59:21"} },
  { id: 7231,  firstName: "Charmaine",    lastName: "Nicolas",      email: "gladyscharm94@gmail.com",           tickets: [{ticketId:304}], payment: {dateTime:"2026-04-03 14:36:17"} },
  { id: 7233,  firstName: "Kelvin",       lastName: "Tan",          email: "white_91@live.com",                 tickets: [{ticketId:303}], payment: {dateTime:"2026-04-03 14:55:50"} },
  { id: 7235,  firstName: "Stephanie",    lastName: "Burt",         email: "ariesmoontaurussun@gmail.com",      tickets: [{ticketId:304}], payment: {dateTime:"2026-04-04 00:54:49"} },
  { id: 7237,  firstName: "Angeline",     lastName: "Choong",       email: "angeline.choong001@gmail.com",      tickets: [{ticketId:304}], payment: {dateTime:"2026-04-04 04:01:06"} },
  { id: 7240,  firstName: "Jeanne",       lastName: "Wang",         email: "jeanne.wangyu3@outlook.com",        tickets: [{ticketId:304}], payment: {dateTime:"2026-04-04 11:22:33"} },
  { id: 7243,  firstName: "Joey",         lastName: "Yeung",        email: "Kira_joey@hotmail.com",             tickets: [{ticketId:303}], payment: {dateTime:"2026-04-04 13:09:18"} },
  { id: 7247,  firstName: "Joo Wee",      lastName: "Quek",         email: "Chewiegum123@gmail.com",            tickets: [{ticketId:303}], payment: {dateTime:"2026-04-04 13:39:54"} },
  { id: 7265,  firstName: "Shane",        lastName: "Lee",          email: "xuanshane@gmail.com",               tickets: [{ticketId:304}], payment: {dateTime:"2026-04-05 01:31:41"} },
  { id: 7267,  firstName: "Sean",         lastName: "Chong",        email: "myseanchong@gmail.com",             tickets: [{ticketId:303}], payment: {dateTime:"2026-04-05 02:11:29"} },
  { id: 7268,  firstName: "Alicia",       lastName: "Chiang",       email: "alicia.chiang1995@gmail.com",       tickets: [{ticketId:304}], payment: {dateTime:"2026-04-05 02:40:02"} },
  { id: 7271,  firstName: "Daniel",       lastName: "Lai",          email: "kwanghong92@gmail.com",             tickets: [{ticketId:303}], payment: {dateTime:"2026-04-05 04:35:22"} },
  { id: 7276,  firstName: "Jun Zhen",     lastName: "Lai",          email: "junzhenlai@gmail.com",              tickets: [{ticketId:303}], payment: {dateTime:"2026-04-05 12:15:37"} },
  { id: 7279,  firstName: "Jas",          lastName: "Y",            email: "Ttay9026@gmail.com",                tickets: [{ticketId:304}], payment: {dateTime:"2026-04-05 14:15:04"} },
  { id: 7284,  firstName: "Mal",          lastName: "Lim",          email: "malcolmlimb4414@gmail.com",         tickets: [{ticketId:303}], payment: {dateTime:"2026-04-05 17:48:33"} },
  { id: 7289,  firstName: "Darren",       lastName: "Kessler",      email: "darrenkessler@hotmail.com",         tickets: [{ticketId:303}], payment: {dateTime:"2026-04-06 03:57:26"} },
  { id: 7290,  firstName: "Boaz",         lastName: "Magundayao",   email: "boaz.magundayao@gmail.com",         tickets: [{ticketId:303}], payment: {dateTime:"2026-04-06 04:05:51"} },
  { id: 7292,  firstName: "Michelle",     lastName: "Fong",         email: "michellefong25@gmail.com",          tickets: [{ticketId:304}], payment: {dateTime:"2026-04-06 04:36:50"} },
  { id: 7293,  firstName: "Jas",          lastName: "Chan",         email: "Yt07233@gmail.com",                 tickets: [{ticketId:304}], payment: {dateTime:"2026-04-06 05:25:51"} },
  { id: 7294,  firstName: "Valerie",      lastName: "Goh",          email: "valeriegohps28@gmail.com",          tickets: [{ticketId:304}], payment: {dateTime:"2026-04-06 05:27:09"} },
  { id: 7295,  firstName: "Ying Jie",     lastName: "Yeo",          email: "musathemusic@gmail.com",            tickets: [{ticketId:304}], payment: {dateTime:"2026-04-06 05:29:27"} },
  { id: 7301,  firstName: "Jin Kang",     lastName: "Koa",          email: "Koajinkang@gmail.com",              tickets: [{ticketId:303}], payment: {dateTime:"2026-04-06 12:41:41"} },
  { id: 7302,  firstName: "Nandini",      lastName: "Kulkarni",     email: "nxndini15@gmail.com",               tickets: [{ticketId:304}], payment: {dateTime:"2026-04-06 13:31:38"} },
  { id: 7303,  firstName: "Aloysious",    lastName: "Lim",          email: "aloysiouslim@hotmail.com",          tickets: [{ticketId:303}], payment: {dateTime:"2026-04-06 13:32:55"} },
  { id: 7304,  firstName: "Brandon Ong",  lastName: "",             email: "socials+neverstrangers@bongzy.me",  tickets: [{ticketId:303}], payment: {dateTime:"2026-04-06 14:11:27"} },
  { id: 7305,  firstName: "Caryn",        lastName: "Tan",          email: "natnyrac@gmail.com",                tickets: [{ticketId:304}], payment: {dateTime:"2026-04-06 14:16:52"} },
  { id: 7306,  firstName: "Jacqueline",   lastName: "Tan",          email: "jacquelinetansiewping@gmail.com",   tickets: [{ticketId:304}], payment: {dateTime:"2026-04-06 14:19:02"} },
  { id: 7310,  firstName: "Yi Wen",       lastName: "Liau",         email: "yiwen_yvonne@icloud.com",           tickets: [{ticketId:304}], payment: {dateTime:"2026-04-06 16:08:23"} },
  { id: 7312,  firstName: "Jun Ying",     lastName: "Wong",         email: "junying95@gmail.com",               tickets: [{ticketId:304}], payment: {dateTime:"2026-04-06 17:38:19"} },
  { id: 7315,  firstName: "Jonathan",     lastName: "Dinesh",       email: "Jonathan_dinesh@yahoo.com.sg",      tickets: [{ticketId:303}], payment: {dateTime:"2026-04-07 04:22:56"} },
  { id: 7316,  firstName: "Zhi Hong",     lastName: "Ng",           email: "blueskyng33@gmail.com",             tickets: [{ticketId:303}], payment: {dateTime:"2026-04-07 07:26:19"} },
  { id: 7321,  firstName: "Ning",         lastName: "Ong",          email: "potatotes.ning@gmail.com",          tickets: [{ticketId:304}], payment: {dateTime:"2026-04-07 11:37:05"} },
  { id: 7322,  firstName: "Marion",       lastName: "Lim",          email: "marimllw10@gmail.com",              tickets: [{ticketId:304}], payment: {dateTime:"2026-04-07 11:40:35"} },
  { id: 7331,  firstName: "Tom",          lastName: "Li",           email: "g.t.li@outlook.com",                tickets: [{ticketId:303}], payment: {dateTime:"2026-04-08 03:03:04"} },
  { id: 7332,  firstName: "Weiqiao",      lastName: "Cheng",        email: "c.weiqiao97@gmail.com",             tickets: [{ticketId:303}], payment: {dateTime:"2026-04-08 03:40:25"} },
  { id: 7333,  firstName: "Rishi",        lastName: "A",            email: "alecm3984@gmail.com",               tickets: [{ticketId:303}], payment: {dateTime:"2026-04-08 04:11:14"} },
  { id: 7334,  firstName: "Zheng Teck",   lastName: "Goh",          email: "adamgoh1998@gmail.com",             tickets: [{ticketId:303}], payment: {dateTime:"2026-04-08 05:33:39"} },
  { id: 7335,  firstName: "Sharan",       lastName: "M",            email: "Sharan1301coolz@gmail.com",         tickets: [{ticketId:303}], payment: {dateTime:"2026-04-08 06:20:24"} },
  { id: 7336,  firstName: "Charlotte",    lastName: "Chia",         email: "lottechia@gmail.com",               tickets: [{ticketId:304}], payment: {dateTime:"2026-04-08 06:48:09"} },
  { id: 7337,  firstName: "Nadya",        lastName: "Chua",         email: "nadyachuats@gmail.com",             tickets: [{ticketId:304}], payment: {dateTime:"2026-04-08 06:56:10"} },
  { id: 7338,  firstName: "Zhen Fei",     lastName: "Wong",         email: "zhnfxii19@gmail.com",               tickets: [{ticketId:304}], payment: {dateTime:"2026-04-08 07:28:55"} },
  { id: 7339,  firstName: "Yan Qing",     lastName: "Toh",          email: "username.toh@gmail.com",            tickets: [{ticketId:304}], payment: {dateTime:"2026-04-08 07:30:09"} },
  { id: 7340,  firstName: "Jin Jie",      lastName: "Peh",          email: "pehjj2@gmail.com",                  tickets: [{ticketId:303}], payment: {dateTime:"2026-04-08 07:32:48"} },
  { id: 7344,  firstName: "Elgin",        lastName: "Chan",         email: "elginchan13@gmail.com",             tickets: [{ticketId:303}], payment: {dateTime:"2026-04-08 09:18:29"} },
];

function sgToUtc(str) {
  return new Date(str.replace(" ", "T") + "+08:00").toISOString();
}

async function ensureProfile(booking) {
  const email = booking.email.toLowerCase().trim();
  const gender = genderFromTickets(booking.tickets);
  const displayName = buildDisplayName(booking.firstName, booking.lastName);

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
    gender, city: "sg", status: "approved", role: "user", wp_source: "amelia_import",
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
  console.log("Processing " + BOOKINGS.length + " bookings for event " + EVENT_ID + "\n");
  const results = { created: 0, approved: 0, existing: 0, attendees: 0, errors: [] };

  for (const booking of BOOKINGS) {
    const email = booking.email.toLowerCase().trim();
    const displayName = buildDisplayName(booking.firstName, booking.lastName);
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
