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
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { buildSeedPreferences, type Gender } from "./helpers/profileDefaults";

// ── Config ────────────────────────────────────────────────────────────────
const SEED_LABEL = "dating30";
const SEED_PREFIX = "[SEED:DATING30]";
const EMAIL_PREFIX = "seed+dating30+";
const CITY = "Bangkok";
const EVENT_TITLE = `${SEED_PREFIX} Bangkok Dating Night`;
const TICKET_PRICE_CENTS = 4900;
const TICKET_CAP = 50;

const WOMEN_COUNT = 18;
const MEN_COUNT = 12;
const TOTAL = WOMEN_COUNT + MEN_COUNT;

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

function makeAnswers(archetype: string): number[] {
  const base = ARCHETYPES[archetype];
  return base.map((v) => clamp(Math.round(v + (Math.random() - 0.5) * 1.4)));
}

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
    order_index: idx + 1,
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

  // ── 6. Build user list ─────────────────────────────────────────────────
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

  // ── 7. Create users, profiles, attendees, answers ──────────────────────
  console.log(`\n👥 Creating ${TOTAL} users (${WOMEN_COUNT}F / ${MEN_COUNT}M)…`);

  const createdProfiles: Array<{
    email: string; password: string; profileId: string; gender: string;
    first_name: string; last_name: string;
  }> = [];
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
      // Look up existing user by scanning pages (service role)
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

    const instagram = i < INSTAGRAM_HANDLES.length ? INSTAGRAM_HANDLES[i] : null;

    // Upsert profile
    const prefs = buildSeedPreferences({ gender: u.gender as Gender });
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
      instagram: instagram,
      preferred_language: i % 5 === 0 ? "th" : "en",
      reason: REASONS[i % REASONS.length],
      seed_run_id: seedRunId,
    }, { onConflict: "id" });
    if (pErr) { console.log(`PROFILE ERR (${pErr.message})`); continue; }

    // Upsert attendee (idempotent on event+profile)
    const { error: attErr } = await supabase.from("event_attendees").upsert({
      event_id: eventId,
      profile_id: userId,
      ticket_type_id: ticketTypeId,
      payment_status: "paid",
      ticket_status: "paid",
      paid_at: now,
      checked_in: true,
      checked_in_at: now,
      seed_run_id: seedRunId,
    }, { onConflict: "event_id,profile_id" });
    if (attErr) { console.log(`ATTENDEE ERR (${attErr.message})`); continue; }

    // Insert answers (skip if already present for this event+profile)
    const { data: existingAnswers } = await supabase
      .from("answers")
      .select("question_id", { count: "exact", head: false })
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

  // ── 8. Validate inserted profiles ────────────────────────────────────────
  if (createdProfiles.length > 0) {
    console.log("\n🔎 Validating profile preference fields…");
    const sampleIds = createdProfiles.slice(0, 5).map((p) => p.profileId);
    const { data: sample, error: sampleErr } = await supabase
      .from("profiles")
      .select("id, gender, attracted_to, orientation")
      .in("id", sampleIds);
    if (sampleErr) {
      console.warn("  ⚠️  Could not validate profiles:", sampleErr.message);
    } else {
      const bad = (sample ?? []).filter(
        (p: { gender: unknown; attracted_to: unknown; orientation: unknown }) =>
          !p.gender || !p.attracted_to || !p.orientation
      );
      if (bad.length > 0) {
        console.error("  ❌ Profiles missing preference fields:", bad.map((p: { id: string }) => p.id));
        throw new Error(`${bad.length} seeded profile(s) are missing gender/attracted_to/orientation`);
      }
      console.log(`  ✓ All sampled profiles have gender, attracted_to, and orientation set`);
    }
  }

  // ── 9. Write output JSON ────────────────────────────────────────────────
  const outputDir = path.join(__dirname, ".seed-output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const females = createdProfiles.filter((u) => u.gender === "female");
  const males   = createdProfiles.filter((u) => u.gender === "male");

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
    all_paid: true,
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
      "All attendees are paid + checked-in + questionnaire complete.",
      "Do NOT pre-generate matches — use Admin UI: Run Matching → Reveal Round.",
      "Dating constraint: matching produces male↔female pairs only (no same-gender).",
      `Verify: npx tsx scripts/verify-dating-matching.ts --event-id ${eventId}`,
    ].join(" "),
    cleanup_command: `SEED_CONFIRM=true npx tsx scripts/cleanup-test-data.ts --label ${SEED_LABEL}`,
    users: createdProfiles.map((u) => ({
      email: u.email,
      password: u.password,
      gender: u.gender,
      name: `${u.first_name} ${u.last_name}`,
    })),
  };

  const outPath = path.join(outputDir, "dating30.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");

  console.log(`\n📝 Output written to ${outPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Event:          ${EVENT_TITLE}`);
  console.log(`   Event ID:       ${eventId}`);
  console.log(`   City:           ${CITY}`);
  console.log(`   Women:          ${output.women}`);
  console.log(`   Men:            ${output.men}`);
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
