/**
 * Seed: 1 friends event + 30 approved users in Bangkok
 * ~15 women, 14 men, 1 other — all free + checked-in + questionnaire complete.
 * Admin can immediately run matching + reveal rounds.
 *
 * Usage:
 *   npm run seed:friends-30
 * Cleanup:
 *   SEED_CONFIRM=true npx tsx scripts/cleanup-test-data.ts --label friends30
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { buildFriendsPreferences, type Gender } from "./helpers/profileDefaults";

// ── Config ────────────────────────────────────────────────────────────────
const SEED_LABEL = "friends30";
const SEED_PREFIX = "[SEED:FRIENDS30]";
const EMAIL_PREFIX = "seed+friends30+";
const CITY = "Bangkok";
const EVENT_TITLE = `${SEED_PREFIX} Bangkok Social Mixer`;

const WOMEN_COUNT = 15;
const MEN_COUNT = 14;
const OTHER_COUNT = 1;
const TOTAL = WOMEN_COUNT + MEN_COUNT + OTHER_COUNT;

// Archetype answer vectors (scale 1–4, 20 questions)
type AnswerVec = number[];
const ARCHETYPES: Record<string, AnswerVec> = {
  social_extrovert: [4,3,4,4,3,4,3,4,4,3,3,2,3,2,3,3,4,3,3,2],
  deep_talker:      [2,4,2,3,4,2,4,2,3,4,4,4,4,4,4,4,4,4,4,4],
  balanced:         [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
  adventurous:      [3,2,4,3,2,4,4,4,4,2,2,1,2,2,3,2,3,2,2,1],
};
const ARCHETYPE_KEYS = Object.keys(ARCHETYPES);

const FEMALE_FIRST = [
  "Anya","Priya","Mei","Sofia","Natasha","Lena","Aisha","Hana",
  "Yuki","Chloe","Zara","Suki","Mira","Dina","Linh",
];
const MALE_FIRST = [
  "James","Kai","Arjun","Lucas","Marco","Sven","Ethan","Ryo",
  "Oliver","Felix","Nico","Kian","Theo","Darius",
];
const OTHER_FIRST = ["Alex"];
const LAST_NAMES = [
  "Chen","Kim","Nguyen","Santos","Müller","Patel","Tanaka","Smith",
  "Rossi","Park","Lee","Dubois","Costa","Johansson","Cruz","Sato","Ali","Kovac",
  "Wang","Garcia","Reyes","Andersen","Mäkinen","Osman","Nakamura","Steele",
  "Ito","Martins","Fischer","Popov",
];
const REASONS = [
  "I want to expand my social circle beyond work colleagues.",
  "Looking for genuine friendships, not just LinkedIn connections.",
  "New to Bangkok — excited to meet people who share my vibe.",
  "I love meeting people from different backgrounds and cultures.",
  "My friends convinced me and I love the concept.",
  "Looking for a community, not just one-off interactions.",
  "I value face-to-face conversations above everything.",
  "The algorithmic matching concept intrigues me.",
];

function clamp(v: number, lo = 1, hi = 4) { return Math.max(lo, Math.min(hi, v)); }

function makeAnswers(archetype: string): number[] {
  const base = ARCHETYPES[archetype];
  return base.map((v) => clamp(Math.round(v + (Math.random() - 0.5) * 1.4)));
}

function randomDob(salt: string): string {
  const seed = Buffer.from(salt).reduce((a, b) => a + b, 0);
  const ageYears = 23 + (seed % 17);
  const d = new Date("2026-03-07");
  d.setFullYear(d.getFullYear() - ageYears);
  d.setMonth(seed % 12);
  d.setDate(1 + (seed % 27));
  return d.toISOString().slice(0, 10);
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  if (!url || !serviceKey) {
    console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if (process.env.SEED_CONFIRM !== "true") {
    console.error("❌ Set SEED_CONFIRM=true to run this script.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  // ── 1. Create seed_run ──────────────────────────────────────────────────
  console.log(`\n🌱 Creating seed_run "${SEED_LABEL}"…`);
  const { data: seedRun, error: srErr } = await supabase
    .from("seed_runs")
    .insert({ label: SEED_LABEL })
    .select("id")
    .single();
  if (srErr || !seedRun) { console.error("❌ seed_run:", srErr?.message); process.exit(1); }
  const seedRunId: string = seedRun.id;
  console.log(`  seed_run_id: ${seedRunId}`);

  // ── 2. Load question templates ──────────────────────────────────────────
  console.log("\n📋 Loading question templates…");
  const { data: templates, error: tplErr } = await supabase
    .from("question_templates")
    .select("id, prompt, type, options, weight, order")
    .eq("is_default", true)
    .order("order", { ascending: true });
  if (tplErr || !templates?.length) {
    console.error("❌ question_templates:", tplErr?.message || "empty");
    process.exit(1);
  }
  console.log(`  Found ${templates.length} question templates`);

  // ── 3. Create event ─────────────────────────────────────────────────────
  console.log("\n🎉 Creating friends event…");
  const startAt = new Date("2026-04-19T18:00:00+07:00").toISOString();
  const endAt   = new Date("2026-04-19T22:00:00+07:00").toISOString();

  const { data: event, error: evtErr } = await supabase
    .from("events")
    .insert({
      title: EVENT_TITLE,
      description: "A free social mixer in Bangkok. Seeded data for admin testing.",
      city: CITY,
      location: "Co-working Space, Ari, Bangkok",
      start_at: startAt,
      end_at: endAt,
      status: "live",
      category: "friends",
      payment_required: false,
      seed_run_id: seedRunId,
    })
    .select("id")
    .single();
  if (evtErr || !event) { console.error("❌ event insert:", evtErr?.message); process.exit(1); }
  const eventId: string = event.id;
  console.log(`  event_id: ${eventId}`);

  // ── 4. Create event questions ───────────────────────────────────────────
  console.log("\n❓ Creating event questions from templates…");
  const questionRows = templates.map((t: {
    prompt: string; type: string; options: unknown; weight: number; order: number;
  }, idx: number) => ({
    event_id: eventId,
    prompt: t.prompt,
    type: t.type ?? "scale",
    options: t.options ?? null,
    weight: t.weight ?? 1,
    order_index: t.order ?? idx + 1,
  }));
  const { data: insertedQs, error: qErr } = await supabase
    .from("questions")
    .insert(questionRows)
    .select("id, order_index");
  if (qErr || !insertedQs?.length) {
    console.error("❌ questions insert:", qErr?.message);
    process.exit(1);
  }
  const questionIds: string[] = insertedQs
    .sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
    .map((q: { id: string }) => q.id);
  console.log(`  Created ${questionIds.length} questions`);

  // ── 5. Build user list ─────────────────────────────────────────────────
  type UserSpec = {
    email: string; password: string; gender: string;
    first_name: string; last_name: string; archetype: string;
  };
  const userList: UserSpec[] = [];

  for (let i = 0; i < WOMEN_COUNT; i++) {
    const first = FEMALE_FIRST[i % FEMALE_FIRST.length];
    const last = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    userList.push({
      email: `${EMAIL_PREFIX}f${String(i + 1).padStart(2, "0")}@example.com`,
      password: `SeedF30F${i + 1}!Bkk`,
      gender: "female",
      first_name: first,
      last_name: last,
      archetype: ARCHETYPE_KEYS[i % ARCHETYPE_KEYS.length],
    });
  }
  for (let i = 0; i < MEN_COUNT; i++) {
    const first = MALE_FIRST[i % MALE_FIRST.length];
    const last = LAST_NAMES[(i * 7 + 5) % LAST_NAMES.length];
    userList.push({
      email: `${EMAIL_PREFIX}m${String(i + 1).padStart(2, "0")}@example.com`,
      password: `SeedF30M${i + 1}!Bkk`,
      gender: "male",
      first_name: first,
      last_name: last,
      archetype: ARCHETYPE_KEYS[(i + 1) % ARCHETYPE_KEYS.length],
    });
  }
  for (let i = 0; i < OTHER_COUNT; i++) {
    const first = OTHER_FIRST[i % OTHER_FIRST.length];
    const last = LAST_NAMES[(i * 11 + 2) % LAST_NAMES.length];
    userList.push({
      email: `${EMAIL_PREFIX}o${String(i + 1).padStart(2, "0")}@example.com`,
      password: `SeedF30O${i + 1}!Bkk`,
      gender: "other",
      first_name: first,
      last_name: last,
      archetype: ARCHETYPE_KEYS[(i + 2) % ARCHETYPE_KEYS.length],
    });
  }

  // ── 6. Create users, profiles, attendees, answers ──────────────────────
  console.log(`\n👥 Creating ${TOTAL} users (${WOMEN_COUNT}F / ${MEN_COUNT}M / ${OTHER_COUNT}O)…`);

  type CreatedProfile = {
    email: string; password: string; profileId: string; gender: string;
    first_name: string; last_name: string;
  };
  const createdProfiles: CreatedProfile[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < userList.length; i++) {
    const u = userList[i];
    process.stdout.write(`  [${i + 1}/${TOTAL}] ${u.email}… `);

    // Try to create auth user; if already registered, look up existing ID
    let userId: string | null = null;
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });

    if (authUser?.user) {
      userId = authUser.user.id;
    } else if (authErr?.message?.toLowerCase().includes("already been registered")) {
      for (let page = 1; page <= 5 && !userId; page++) {
        const { data: listData } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
        const found = listData?.users?.find(
          (usr) => (usr.email ?? "").toLowerCase() === u.email.toLowerCase()
        );
        if (found) userId = found.id;
        if (!listData?.users?.length) break;
      }
      if (userId) {
        process.stdout.write(`(reusing existing auth user) `);
      } else {
        console.log(`SKIP (could not find existing user)`);
        continue;
      }
    } else {
      console.log(`SKIP (${authErr?.message})`);
      continue;
    }

    // Upsert profile
    const prefs = buildFriendsPreferences({ gender: u.gender as Gender });
    const { error: pErr } = await supabase.from("profiles").upsert({
      id: userId,
      email: u.email,
      name: `${u.first_name} ${u.last_name}`,
      full_name: `${u.first_name} ${u.last_name}`,
      display_name: u.first_name,
      city: CITY,
      gender: prefs.gender,
      attracted_to: prefs.attracted_to,
      orientation: prefs.orientation,
      dob: randomDob(u.email),
      status: "approved",
      role: "user",
      preferred_language: i % 5 === 0 ? "th" : "en",
      reason: REASONS[i % REASONS.length],
      seed_run_id: seedRunId,
    }, { onConflict: "id" });
    if (pErr) { console.log(`PROFILE ERR (${pErr.message})`); continue; }

    // Upsert attendee — free event uses payment_status='free'
    const { error: attErr } = await supabase.from("event_attendees").upsert({
      event_id: eventId,
      profile_id: userId,
      payment_status: "free",
      ticket_status: "reserved",
      checked_in: true,
      checked_in_at: now,
      seed_run_id: seedRunId,
    }, { onConflict: "event_id,profile_id" });
    if (attErr) { console.log(`ATTENDEE ERR (${attErr.message})`); continue; }

    // Insert answers (idempotent)
    const { data: existingAnswers } = await supabase
      .from("answers")
      .select("question_id")
      .eq("event_id", eventId)
      .eq("profile_id", userId)
      .limit(1);

    if (!existingAnswers?.length) {
      const answerVec = makeAnswers(u.archetype);
      const answerRows = questionIds.map((qid: string, qi: number) => ({
        event_id: eventId,
        profile_id: userId,
        question_id: qid,
        answer: { value: answerVec[qi] ?? 3 },
        seed_run_id: seedRunId,
      }));
      const { error: ansErr } = await supabase.from("answers").insert(answerRows);
      if (ansErr) { console.log(`ANSWERS ERR (${ansErr.message})`); continue; }
    }

    createdProfiles.push({
      email: u.email,
      password: u.password,
      profileId: userId,
      gender: u.gender,
      first_name: u.first_name,
      last_name: u.last_name,
    });
    console.log(`✓`);
  }

  console.log(`\n✅ Created/updated ${createdProfiles.length} users out of ${TOTAL} attempted.`);

  // ── 7. Validate inserted profiles ────────────────────────────────────────
  if (createdProfiles.length > 0) {
    console.log("\n🔎 Validating profile preference fields…");
    const sampleIds = createdProfiles.slice(0, 5).map((p) => p.profileId);
    const { data: sample, error: sampleErr } = await supabase
      .from("profiles")
      .select("id, gender, orientation")
      .in("id", sampleIds);
    if (sampleErr) {
      console.warn("  ⚠️  Could not validate profiles:", sampleErr.message);
    } else {
      const bad = (sample ?? []).filter(
        (p: { gender: unknown; orientation: unknown }) => !p.gender || !p.orientation
      );
      if (bad.length > 0) {
        console.error("  ❌ Profiles missing preference fields:", bad.map((p: { id: string }) => p.id));
        throw new Error(`${bad.length} seeded profile(s) are missing gender/orientation`);
      }
      console.log(`  ✓ All sampled profiles have gender and orientation set`);
    }
  }

  // ── 8. Write output JSON ────────────────────────────────────────────────
  const outputDir = path.join(__dirname, ".seed-output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const females = createdProfiles.filter((u) => u.gender === "female");
  const males   = createdProfiles.filter((u) => u.gender === "male");
  const others  = createdProfiles.filter((u) => u.gender === "other");

  const output = {
    seed_run_id: seedRunId,
    event_id: eventId,
    event_title: EVENT_TITLE,
    event_url: `${appUrl}/events/${eventId}`,
    admin_event_url: `${appUrl}/admin/events/${eventId}`,
    city: CITY,
    total_users: createdProfiles.length,
    women: females.length,
    men: males.length,
    other: others.length,
    all_free: true,
    all_checked_in: true,
    questionnaire_questions: questionIds.length,
    demo_accounts: {
      female: females[0]
        ? { email: females[0].email, password: females[0].password, name: `${females[0].first_name} ${females[0].last_name}` }
        : null,
      male: males[0]
        ? { email: males[0].email, password: males[0].password, name: `${males[0].first_name} ${males[0].last_name}` }
        : null,
    },
    note: [
      "All attendees are free + checked-in + questionnaire complete.",
      "Do NOT pre-generate matches — use Admin UI: Run Matching → Reveal Round.",
      "Friends constraint: any-gender pairing allowed (no gender filter).",
      "Do: npx tsx scripts/verify-friends-matching.ts --event-id " + eventId,
    ].join(" "),
    cleanup_command: `SEED_CONFIRM=true npx tsx scripts/cleanup-test-data.ts --label ${SEED_LABEL}`,
    users: createdProfiles.map((u) => ({
      email: u.email,
      password: u.password,
      gender: u.gender,
      name: `${u.first_name} ${u.last_name}`,
    })),
  };

  const outPath = path.join(outputDir, "friends30.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");

  console.log(`\n📝 Output written to ${outPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Event:          ${EVENT_TITLE}`);
  console.log(`   Event ID:       ${eventId}`);
  console.log(`   City:           ${CITY}`);
  console.log(`   Women:          ${output.women}`);
  console.log(`   Men:            ${output.men}`);
  console.log(`   Other:          ${output.other}`);
  console.log(`   Questions:      ${questionIds.length}`);
  if (output.demo_accounts.female) {
    console.log(`\n   Demo ♀:  ${output.demo_accounts.female.email} / ${output.demo_accounts.female.password}`);
  }
  if (output.demo_accounts.male) {
    console.log(`   Demo ♂:  ${output.demo_accounts.male.email} / ${output.demo_accounts.male.password}`);
  }
  console.log(`\n🔗 Admin URL:  ${output.admin_event_url}`);
  console.log(`🔗 Event URL:  ${output.event_url}`);
  console.log(`\n🧹 Cleanup: ${output.cleanup_command}`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
