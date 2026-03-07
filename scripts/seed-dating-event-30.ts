/**
 * Seed: 1 dating event + 30 approved users in Bangkok
 * 18 women, 12 men — all paid + checked-in + questionnaire complete.
 * Admin can immediately run matching + reveal rounds.
 *
 * Usage:
 *   npm run seed:dating-30
 * Cleanup:
 *   SEED_CONFIRM=true npx tsx scripts/cleanup-test-data.ts --label dating30
 */
import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// ── Config ────────────────────────────────────────────────────────────────
const SEED_LABEL = "dating30";
const SEED_PREFIX = "[SEED:DATING30]";
const EMAIL_PREFIX = "seed+dating30+";
const CITY = "Bangkok";
const EVENT_TITLE = `${SEED_PREFIX} Bangkok Dating Night`;
const TICKET_PRICE_CENTS = 4900; // ~$49 USD
const TICKET_CAP = 50;

// 18 women + 12 men = 30
const WOMEN_COUNT = 18;
const MEN_COUNT = 12;
const TOTAL = WOMEN_COUNT + MEN_COUNT;

// Archetype answer vectors (scale 1–4, 20 questions)
// 4 archetypes × 20 questions
type AnswerVec = number[];
const ARCHETYPES: Record<string, AnswerVec> = {
  social_extrovert: [4,3,4,4,3,4,3,4,4,3,3,2,3,2,3,3,4,3,3,2],
  deep_talker:      [2,4,2,3,4,2,4,2,3,4,4,4,4,4,4,4,4,4,4,4],
  balanced:         [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
  adventurous:      [3,2,4,3,2,4,4,4,4,2,2,1,2,2,3,2,3,2,2,1],
};
const ARCHETYPE_KEYS = Object.keys(ARCHETYPES);

// Realistic names
const FEMALE_FIRST = [
  "Anya","Priya","Mei","Sofia","Natasha","Lena","Aisha","Hana",
  "Yuki","Chloe","Zara","Suki","Mira","Dina","Linh","Rin","Aria","Tara",
];
const MALE_FIRST = [
  "James","Kai","Arjun","Lucas","Marco","Sven","Ethan","Ryo",
  "Oliver","Felix","Nico","Kian",
];
const LAST_NAMES = [
  "Chen","Kim","Nguyen","Santos","Müller","Patel","Tanaka","Smith",
  "Rossi","Park","Lee","Dubois","Costa","Johansson","Cruz","Sato","Ali","Kovac",
  "Wang","Garcia","Reyes","Andersen","Mäkinen","Osman","Nakamura","Steele",
  "Ito","Martins","Fischer","Popov",
];

const INSTAGRAM_HANDLES = [
  "@anya.explores","@priya.life","@mei_bkk","@sofia.moments","@natashavibes",
  "@lenaway","@aisha.days","@hana_gram","@yukiworld","@chloekroo",
  "@zara.wanders","@sukistyle","@mira.earth","@dina_tales","@linh.goes",
  "@rin_photos","@aria_bkk","@tara.lens",
  "@jamesroams","@kaifocus","@arjunshots","@lucasframes","@marcostories",
  "@sventravel","@ethanvibe","@ryogram","@oliverway","@felixpix",
  "@nicojourneys","@kianlife",
];

const REASONS = [
  "Tired of swipe culture. Looking for something real.",
  "I want to meet people at an actual event, not on an app.",
  "Work takes over my life — need a reason to actually go out.",
  "I'm new to Bangkok and want to make connections.",
  "My friends convinced me and I'm cautiously optimistic.",
  "Looking for depth, not just good photos.",
  "I value face-to-face conversations above everything.",
  "The algorithmic matching concept intrigues me.",
];

function clamp(v: number, lo = 1, hi = 4) { return Math.max(lo, Math.min(hi, v)); }

/** Generate answers with archetype base + noise */
function makeAnswers(archetype: string): number[] {
  const base = ARCHETYPES[archetype];
  return base.map((v) => clamp(Math.round(v + (Math.random() - 0.5) * 1.4)));
}

/** Deterministic DOB: age 24–38 */
function randomDob(salt: string): string {
  const seed = Buffer.from(salt).reduce((a, b) => a + b, 0);
  const ageYears = 24 + (seed % 15);
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
  console.log("\n🎉 Creating dating event…");
  const startAt = new Date("2026-04-05T19:00:00+07:00").toISOString();
  const endAt   = new Date("2026-04-05T23:00:00+07:00").toISOString();

  const { data: event, error: evtErr } = await supabase
    .from("events")
    .insert({
      title: EVENT_TITLE,
      description: "An invite-only dating mixer in Bangkok. Seeded data for admin testing.",
      city: CITY,
      location: "Rooftop Bar, Sukhumvit Soi 11, Bangkok",
      start_at: startAt,
      end_at: endAt,
      status: "live",
      category: "dating",
      payment_required: true,
      seed_run_id: seedRunId,
    })
    .select("id")
    .single();
  if (evtErr || !event) { console.error("❌ event insert:", evtErr?.message); process.exit(1); }
  const eventId: string = event.id;
  console.log(`  event_id: ${eventId}`);

  // ── 4. Create event questions from templates ────────────────────────────
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

  // ── 5. Create ticket type ───────────────────────────────────────────────
  console.log("\n🎟 Creating ticket type…");
  const { data: ticketType, error: ttErr } = await supabase
    .from("event_ticket_types")
    .insert({
      event_id: eventId,
      code: "general",
      name: "General Entry",
      price_cents: TICKET_PRICE_CENTS,
      currency: "thb",
      cap: TICKET_CAP,
      sold: TOTAL,
      is_active: true,
      sort_order: 0,
    })
    .select("id")
    .single();
  if (ttErr || !ticketType) { console.error("❌ ticket_type:", ttErr?.message); process.exit(1); }
  const ticketTypeId: string = ticketType.id;
  console.log(`  ticket_type_id: ${ticketTypeId}`);

  // ── 6. Create 30 users ─────────────────────────────────────────────────
  console.log(`\n👥 Creating ${TOTAL} users (${WOMEN_COUNT}F / ${MEN_COUNT}M)…`);

  const userList: Array<{
    email: string; password: string; gender: string;
    first_name: string; last_name: string; archetype: string;
  }> = [];

  for (let i = 0; i < WOMEN_COUNT; i++) {
    const first = FEMALE_FIRST[i % FEMALE_FIRST.length];
    const last = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    userList.push({
      email: `${EMAIL_PREFIX}f${String(i + 1).padStart(2, "0")}@example.com`,
      password: `SeedD30F${i + 1}!Bkk`,
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
      password: `SeedD30M${i + 1}!Bkk`,
      gender: "male",
      first_name: first,
      last_name: last,
      archetype: ARCHETYPE_KEYS[(i + 1) % ARCHETYPE_KEYS.length],
    });
  }

  const createdProfiles: Array<{ email: string; password: string; profileId: string; gender: string }> = [];

  for (let i = 0; i < userList.length; i++) {
    const u = userList[i];
    process.stdout.write(`  [${i + 1}/${TOTAL}] ${u.email}… `);

    // Create auth user
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (authErr || !authUser?.user) {
      console.log(`SKIP (${authErr?.message})`);
      continue;
    }
    const userId = authUser.user.id;

    // instagram (some users only)
    const instagramIdx = i < INSTAGRAM_HANDLES.length ? i : -1;
    const instagram = instagramIdx >= 0 ? INSTAGRAM_HANDLES[instagramIdx] : null;

    // Upsert profile
    const { error: pErr } = await supabase.from("profiles").upsert({
      id: userId,
      name: `${u.first_name} ${u.last_name}`,
      full_name: `${u.first_name} ${u.last_name}`,
      display_name: u.first_name,
      city: CITY,
      gender: u.gender,
      dob: randomDob(u.email),
      status: "approved",
      role: "user",
      instagram: instagram,
      preferred_language: i % 5 === 0 ? "th" : "en",
      reason: REASONS[i % REASONS.length],
      seed_run_id: seedRunId,
    }, { onConflict: "id" });
    if (pErr) { console.log(`PROFILE ERR (${pErr.message})`); continue; }

    createdProfiles.push({ email: u.email, password: u.password, profileId: userId, gender: u.gender });
    console.log(`✓`);

    // Create attendee row
    const { error: attErr } = await supabase.from("event_attendees").insert({
      event_id: eventId,
      profile_id: userId,
      ticket_type_id: ticketTypeId,
      payment_status: "paid",
      ticket_status: "paid",
      paid_at: new Date().toISOString(),
      checked_in: true,
      checked_in_at: new Date().toISOString(),
      seed_run_id: seedRunId,
    });
    if (attErr) { console.error(`  ❌ attendee: ${attErr.message}`); continue; }

    // Insert answers for all questions
    const answerVec = makeAnswers(u.archetype);
    const answerRows = questionIds.map((qid: string, qi: number) => ({
      event_id: eventId,
      profile_id: userId,
      question_id: qid,
      answer: { value: answerVec[qi] ?? 3 },
      seed_run_id: seedRunId,
    }));
    const { error: ansErr } = await supabase.from("answers").insert(answerRows);
    if (ansErr) { console.error(`  ❌ answers: ${ansErr.message}`); }
  }

  console.log(`\n✅ Created ${createdProfiles.length} users out of ${TOTAL} attempted.`);

  // ── 7. Write output JSON ────────────────────────────────────────────────
  const outputDir = path.join(__dirname, ".seed-output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const output = {
    seed_run_id: seedRunId,
    event_id: eventId,
    event_title: EVENT_TITLE,
    event_url: `${appUrl}/admin/events/${eventId}`,
    city: CITY,
    total_users: createdProfiles.length,
    women: createdProfiles.filter((u) => u.gender === "female").length,
    men: createdProfiles.filter((u) => u.gender === "male").length,
    all_paid: true,
    all_checked_in: true,
    questionnaire_questions: questionIds.length,
    note: "All attendees are paid + checked-in + questionnaire complete. Do NOT pre-generate matches — use Admin UI.",
    cleanup_command: `SEED_CONFIRM=true npx tsx scripts/cleanup-test-data.ts --label ${SEED_LABEL}`,
    users: createdProfiles.map((u) => ({
      email: u.email,
      password: u.password,
      gender: u.gender,
    })),
  };

  const outPath = path.join(outputDir, "dating30.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");

  console.log(`\n📝 Output written to ${outPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Event:       ${EVENT_TITLE}`);
  console.log(`   Event ID:    ${eventId}`);
  console.log(`   City:        ${CITY}`);
  console.log(`   Women:       ${output.women}`);
  console.log(`   Men:         ${output.men}`);
  console.log(`   Questions:   ${questionIds.length}`);
  console.log(`\n🔗 Admin URL: ${output.event_url}`);
  console.log(`\n🧹 Cleanup: ${output.cleanup_command}`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
