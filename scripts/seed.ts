/**
 * Unified seed CLI.
 *
 * Usage:
 *   SEED_CONFIRM=true npx tsx scripts/seed.ts --label <label> [options]
 *   SEED_CONFIRM=true npx tsx scripts/seed.ts --config scripts/seed/configs/dating-bkk-30.json
 *
 * CLI flags (all override config file):
 *   --label <string>         required
 *   --config <path>          JSON config file
 *   --city <string>
 *   --category <friends|dating>
 *   --users <number>
 *   --paid                   boolean flag (payment required)
 *   --price <cents>
 *   --questions <defaults|tags|random>
 *   --questionsCount <n>
 *   --checkedIn <all|percent|late>
 *   --checkedInValue <n>     percent value when --checkedIn=percent
 *   --force                  cleanup existing label first
 *   --dry-run                print plan without DB writes
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { mergeWithDefaults, validateConfig, parseStartAt, type SeedConfig } from "./seed/config";
import { buildSeedPreferences, buildFriendsPreferences, type Gender } from "./helpers/profileDefaults";

// ── Name pools ────────────────────────────────────────────────────────────────

const FEMALE_FIRST = [
  "Anya","Priya","Mei","Sofia","Natasha","Lena","Aisha","Hana",
  "Yuki","Chloe","Zara","Suki","Mira","Dina","Linh","Rin","Aria","Tara",
  "Nina","Vera","Isla","Riya","Luna","Ella","Emma","Rose","Jade","Lily",
  "Sara","Nora",
];
const MALE_FIRST = [
  "James","Kai","Arjun","Lucas","Marco","Sven","Ethan","Ryo",
  "Oliver","Felix","Nico","Kian","Alex","Ben","Liam","Noah","Adam","Raj",
  "Hugo","Leon","Omar","Ren","Seo","Tai","Zach","Ivan","Yusuf","Darius",
  "Miles","Seth",
];
const LAST_NAMES = [
  "Chen","Kim","Nguyen","Santos","Müller","Patel","Tanaka","Smith",
  "Rossi","Park","Lee","Dubois","Costa","Johansson","Cruz","Sato","Ali","Kovac",
  "Wang","Garcia","Reyes","Andersen","Osman","Nakamura","Steele",
  "Ito","Martins","Fischer","Popov","Andrade",
];
const REASONS = [
  "Tired of swipe culture. Looking for something real.",
  "I want to meet people at an actual event, not on an app.",
  "Work takes over my life — need a reason to actually go out.",
  "I'm new to this city and want to make connections.",
  "My friends convinced me and I'm cautiously optimistic.",
  "Looking for depth, not just good photos.",
  "I value face-to-face conversations above everything.",
  "The algorithmic matching concept intrigues me.",
  "I've been here 2 years and still haven't found my people.",
  "Quality > quantity. I want a curated room.",
];

// ── Archetype answer system (scale 1–4, 20 questions) ────────────────────────

const ARCHETYPES: Record<string, number[]> = {
  social_extrovert: [4,3,4,4,3,4,3,4,4,3, 3,2,3,2,3,3,4,3,3,2],
  deep_talker:      [2,4,2,3,4,2,4,2,3,4, 4,4,4,4,4,4,4,4,4,4],
  balanced:         [3,3,3,3,3,3,3,3,3,3, 3,3,3,3,3,3,3,3,3,3],
  adventurous:      [3,2,4,3,2,4,4,4,4,2, 2,1,2,2,3,2,3,2,2,1],
};
const ARCHETYPE_KEYS = Object.keys(ARCHETYPES);

function clamp(v: number, lo = 1, hi = 4) { return Math.max(lo, Math.min(hi, v)); }

function makeAnswers(archetypeIdx: number, count: number): number[] {
  const key = ARCHETYPE_KEYS[archetypeIdx % ARCHETYPE_KEYS.length];
  const base = ARCHETYPES[key];
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const bv = base[i % base.length];
    result.push(clamp(Math.round(bv + (Math.random() - 0.5) * 1.4)));
  }
  return result;
}

function deterministicDob(salt: string, minAge: number): string {
  const seed = Buffer.from(salt).reduce((a: number, b: number) => a + b, 0);
  const ageYears = minAge + (seed % 15);
  const d = new Date();
  d.setFullYear(d.getFullYear() - ageYears);
  d.setMonth(seed % 12);
  d.setDate(1 + (seed % 27));
  return d.toISOString().slice(0, 10);
}

// ── CLI arg parsing ───────────────────────────────────────────────────────────

type CliArgs = {
  label?: string;
  configPath?: string;
  city?: string;
  category?: "friends" | "dating";
  users?: number;
  paid?: boolean;
  price?: number;
  questions?: "defaults" | "tags" | "random";
  questionsCount?: number;
  checkedIn?: "all" | "percent" | "late";
  checkedInValue?: number;
  force: boolean;
  dryRun: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { force: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--label" && next) { args.label = next; i++; }
    else if (a === "--config" && next) { args.configPath = next; i++; }
    else if (a === "--city" && next) { args.city = next; i++; }
    else if (a === "--category" && next && (next === "friends" || next === "dating")) { args.category = next; i++; }
    else if (a === "--users" && next) { args.users = parseInt(next, 10); i++; }
    else if (a === "--paid") { args.paid = true; }
    else if (a === "--price" && next) { args.price = parseInt(next, 10); i++; }
    else if (a === "--questions" && next) { args.questions = next as "defaults" | "tags" | "random"; i++; }
    else if (a === "--questionsCount" && next) { args.questionsCount = parseInt(next, 10); i++; }
    else if (a === "--checkedIn" && next) { args.checkedIn = next as "all" | "percent" | "late"; i++; }
    else if (a === "--checkedInValue" && next) { args.checkedInValue = parseInt(next, 10); i++; }
    else if (a === "--force") { args.force = true; }
    else if (a === "--dry-run") { args.dryRun = true; }
  }
  return args;
}

function buildConfigFromArgs(cli: CliArgs): Partial<SeedConfig> {
  const cfg: Partial<SeedConfig> = {};
  if (cli.label) cfg.label = cli.label;
  if (cli.city) cfg.city = cli.city;
  if (cli.users) cfg.users = { total: cli.users, statuses: { approved: cli.users, pending: 0, rejected: 0 }, dobMinAge: 21 };
  if (cli.category || cli.paid || cli.price) {
    cfg.event = {
      category: cli.category ?? "friends",
      startAt: "+14d",
      payment: {
        required: cli.paid ?? false,
        priceCents: cli.price,
      },
    };
  }
  if (cli.questions || cli.questionsCount || cli.checkedIn) {
    const selection = cli.questions ?? "defaults";
    cfg.attendees = {
      joinAllApproved: true,
      checkedIn: cli.checkedIn === "percent"
        ? { mode: "percent", value: cli.checkedInValue ?? 100 }
        : cli.checkedIn === "late"
        ? { mode: "late" }
        : { mode: "all" },
      questionnaire: {
        complete: true,
        questionsCount: cli.questionsCount ?? 20,
        selection,
      } as NonNullable<SeedConfig["attendees"]>["questionnaire"],
    };
  }
  return cfg;
}

// ── Supabase client ───────────────────────────────────────────────────────────

let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_sb) {
    _sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _sb;
}

// ── Question loading ──────────────────────────────────────────────────────────

type QuestionTemplate = { id: string; prompt: string; type: string; options: unknown; weight: number; order: number };

type QuestionnaireCfg = NonNullable<SeedConfig["attendees"]>["questionnaire"];
async function loadQuestionTemplates(
  selection: QuestionnaireCfg,
): Promise<QuestionTemplate[]> {
  const count = selection.questionsCount;
  let q = sb().from("question_templates").select("id, prompt, type, options, weight, order").eq("is_active", true);

  if (selection.selection === "defaults") {
    q = q.eq("is_default", true).order("default_rank", { ascending: true }).limit(count);
  } else if (selection.selection === "tags" && "tags" in selection) {
    q = q.contains("tags", (selection as { tags: string[] }).tags).limit(count);
  } else {
    // random — fetch more, shuffle, take count
    q = q.limit(count * 3);
  }

  const { data, error } = await q;
  if (error || !data?.length) {
    throw new Error(`Failed to load question templates: ${error?.message ?? "empty result"}`);
  }

  let templates = data as QuestionTemplate[];
  if (selection.selection === "random") {
    templates = templates.sort(() => Math.random() - 0.5).slice(0, count);
  }

  return templates.slice(0, count);
}

// ── Gender distribution ───────────────────────────────────────────────────────

function buildGenderList(cfg: SeedConfig): Gender[] {
  const { total, genderSplit, statuses } = cfg.users;
  const approvedCount = statuses.approved;
  const femaleCount = genderSplit
    ? genderSplit.female
    : cfg.event?.category === "dating"
    ? Math.round(total * 0.6)
    : Math.round(total * 0.5);
  const maleCount = genderSplit ? genderSplit.male : total - femaleCount;
  const otherCount = total - femaleCount - maleCount;

  const list: Gender[] = [
    ...Array(femaleCount).fill("female"),
    ...Array(maleCount).fill("male"),
    ...Array(Math.max(0, otherCount)).fill("other"),
  ];
  return list.slice(0, total);
}

// ── Dry run print ─────────────────────────────────────────────────────────────

function printDryRun(cfg: SeedConfig) {
  console.log("\n📋 Dry-run plan:\n");
  console.log(`  label:    ${cfg.label}`);
  console.log(`  city:     ${cfg.city}`);
  const genders = buildGenderList(cfg);
  const fCount = genders.filter((g) => g === "female").length;
  const mCount = genders.filter((g) => g === "male").length;
  const oCount = genders.filter((g) => g === "other").length;
  console.log(`  users:    ${cfg.users.total} (${fCount}F / ${mCount}M${oCount ? ` / ${oCount}O` : ""})`);
  console.log(`  statuses: approved=${cfg.users.statuses.approved} pending=${cfg.users.statuses.pending} rejected=${cfg.users.statuses.rejected}`);

  if (cfg.event) {
    const startAt = parseStartAt(cfg.event.startAt);
    const endAt = cfg.event.endAt ? parseStartAt(cfg.event.endAt) : new Date(new Date(startAt).getTime() + 4*3600_000).toISOString();
    console.log(`  event:    "${cfg.event.titlePrefix ?? "[SEED]"} ${cfg.city} ${cfg.event.category}" @ ${startAt.slice(0,16)}`);
    console.log(`            ends ${endAt.slice(0,16)}`);
    console.log(`  payment:  ${cfg.event.payment.required ? `required (${cfg.event.payment.priceCents ?? 0} ${cfg.event.payment.currency ?? "thb"})` : "free"}`);
  }

  if (cfg.attendees) {
    const att = cfg.attendees;
    console.log(`  attendees: joinAll=${att.joinAllApproved} checkedIn=${JSON.stringify(att.checkedIn)}`);
    console.log(`  questions: ${att.questionnaire.questionsCount} (${att.questionnaire.selection}) complete=${att.questionnaire.complete}`);
    const paidPct = att.paymentStatus?.paidPercent ?? (cfg.event?.payment.required ? 100 : 100);
    console.log(`  paidPct:  ${paidPct}%`);
  }

  console.log("\n  (no DB changes — remove --dry-run to execute)\n");
}

// ── Main seed ─────────────────────────────────────────────────────────────────

async function runSeed(cfg: SeedConfig, dryRun: boolean) {
  console.log(`\n🌱 Seeding label="${cfg.label}" city="${cfg.city}"${dryRun ? " (DRY RUN)" : ""}…\n`);

  // 1. Check if seed_run already exists
  const { data: existing } = await sb()
    .from("seed_runs")
    .select("id")
    .eq("label", cfg.label)
    .maybeSingle();
  if (existing) {
    console.error(`❌ seed_run "${cfg.label}" already exists (id=${existing.id}). Use --force to clean it first.`);
    process.exit(1);
  }

  // 2. Load question templates (early so we fail fast if missing)
  let templates: QuestionTemplate[] = [];
  if (cfg.attendees?.questionnaire.complete) {
    console.log("📋 Loading question templates…");
    templates = await loadQuestionTemplates(cfg.attendees.questionnaire);
    console.log(`  Found ${templates.length} templates`);
    if (templates.length < cfg.attendees.questionnaire.questionsCount) {
      console.warn(`  ⚠️  Only ${templates.length} templates available (wanted ${cfg.attendees.questionnaire.questionsCount})`);
    }
  }

  // 3. Create seed_run
  console.log(`\n📌 Creating seed_run…`);
  const { data: seedRun, error: srErr } = await sb()
    .from("seed_runs")
    .insert({ label: cfg.label })
    .select("id")
    .single();
  if (srErr || !seedRun) { console.error("❌ seed_run:", srErr?.message); process.exit(1); }
  const seedRunId: string = seedRun.id;
  console.log(`  seed_run_id: ${seedRunId}`);

  // 4. Create event
  let eventId: string | null = null;
  let questionIds: string[] = [];
  let eventQuestionIds: string[] = []; // event_questions.id values (may be empty if table n/a)
  let ticketTypeId: string | null = null;

  if (cfg.event) {
    console.log("\n🎉 Creating event…");
    const startAt = parseStartAt(cfg.event.startAt);
    const endAt = cfg.event.endAt
      ? parseStartAt(cfg.event.endAt)
      : new Date(new Date(startAt).getTime() + 4 * 3600_000).toISOString();
    const title = `${cfg.event.titlePrefix ?? "[SEED]"} ${cfg.city} ${cfg.event.category === "dating" ? "Dating Night" : "Friends Mixer"}`;
    const { data: evt, error: evtErr } = await sb().from("events").insert({
      title,
      description: `Seeded data (${cfg.label}) for admin testing. Category: ${cfg.event.category}.`,
      city: cfg.city,
      start_at: startAt,
      end_at: endAt,
      status: "live",
      category: cfg.event.category,
      payment_required: cfg.event.payment.required,
      price_cents: cfg.event.payment.priceCents ?? (cfg.event.payment.required ? 4900 : 0),
      seed_run_id: seedRunId,
    }).select("id").single();
    if (evtErr || !evt) { console.error("❌ event:", evtErr?.message); process.exit(1); }
    eventId = evt.id;
    console.log(`  event_id: ${eventId}`);

    // 4a. Try event_questions (new path), fall back to questions (legacy)
    if (templates.length) {
      const eqRows = templates.map((t, idx) => ({
        event_id: eventId,
        template_id: t.id,
        prompt: t.prompt,
        type: t.type ?? "scale",
        options: t.options ?? null,
        weight: t.weight ?? 1,
        sort_order: idx + 1,
      }));
      const { data: eqData, error: eqErr } = await sb()
        .from("event_questions")
        .insert(eqRows)
        .select("id, sort_order");

      if (!eqErr && eqData?.length) {
        console.log(`  ✓ Created ${eqData.length} event_questions`);
        eventQuestionIds = (eqData as { id: string; sort_order: number }[])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((q) => q.id);
      } else {
        // Fall back to legacy questions table
        console.log(`  ↩  event_questions not available${eqErr ? `: ${eqErr.message}` : ""}, using questions table`);
        const qRows = templates.map((t, idx) => ({
          event_id: eventId,
          prompt: t.prompt,
          type: t.type ?? "scale",
          options: t.options ?? null,
          weight: t.weight ?? 1,
          order_index: idx + 1,
        }));
        const { data: qData, error: qErr2 } = await sb().from("questions").insert(qRows).select("id, order_index");
        if (qErr2 || !qData?.length) { console.error("❌ questions:", qErr2?.message); process.exit(1); }
        questionIds = (qData as { id: string; order_index: number }[])
          .sort((a, b) => a.order_index - b.order_index)
          .map((q) => q.id);
        console.log(`  Created ${questionIds.length} questions (legacy)`);
      }
    }

    // 4b. Ticket type
    if (cfg.event.payment.required) {
      const { data: tt, error: ttErr } = await sb().from("event_ticket_types").insert({
        event_id: eventId,
        code: "general",
        name: "General Entry",
        price_cents: cfg.event.payment.priceCents ?? 4900,
        currency: cfg.event.payment.currency ?? "thb",
        cap: cfg.users.total + 10,
        sold: cfg.users.statuses.approved,
        is_active: true,
        sort_order: 0,
      }).select("id").single();
      if (!ttErr && tt) { ticketTypeId = tt.id; console.log(`  ticket_type_id: ${ticketTypeId}`); }
    }
  }

  // 5. Determine checked-in set
  const approvedCount = cfg.users.statuses.approved;
  let checkedInCount = approvedCount;
  const ciMode = cfg.attendees?.checkedIn ?? { mode: "all" };
  if (ciMode.mode === "percent" && "value" in ciMode) {
    checkedInCount = Math.round(approvedCount * (ciMode.value / 100));
  } else if (ciMode.mode === "late") {
    checkedInCount = approvedCount - Math.max(1, Math.round(approvedCount * 0.1));
  }

  // 6. Build user list
  const genders = buildGenderList(cfg);
  const dobMinAge = cfg.users.dobMinAge ?? 21;
  const now = new Date().toISOString();
  const paidPct = cfg.attendees?.paymentStatus?.paidPercent ?? 100;

  console.log(`\n👥 Creating ${cfg.users.total} users…`);

  type CreatedProfile = { email: string; password: string; profileId: string; gender: Gender; firstName: string; lastName: string };
  const createdProfiles: CreatedProfile[] = [];

  for (let i = 0; i < cfg.users.total; i++) {
    const gender = genders[i] ?? "other";
    const isOther = gender === "other";
    const firstPool = gender === "female" ? FEMALE_FIRST : gender === "male" ? MALE_FIRST : [...FEMALE_FIRST, ...MALE_FIRST];
    const firstName = firstPool[i % firstPool.length];
    const lastName = LAST_NAMES[(i * 7 + 3) % LAST_NAMES.length];
    const email = `seed+${cfg.label}+${String(i + 1).padStart(3, "0")}@neverstrangers.test`;
    const password = `Seed1234!`;
    const statusIdx = i < cfg.users.statuses.approved ? 0 : i < cfg.users.statuses.approved + cfg.users.statuses.pending ? 1 : 2;
    const status = statusIdx === 0 ? "approved" : statusIdx === 1 ? "pending_verification" : "rejected";
    const archIdx = i % ARCHETYPE_KEYS.length;

    process.stdout.write(`  [${i + 1}/${cfg.users.total}] ${email}… `);

    // Create auth user
    let userId: string | null = null;
    const { data: authData, error: authErr } = await sb().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authData?.user) {
      userId = authData.user.id;
    } else if (authErr?.message?.toLowerCase().includes("already been registered")) {
      for (let pg = 1; pg <= 5 && !userId; pg++) {
        const { data: listData } = await sb().auth.admin.listUsers({ page: pg, perPage: 100 });
        const found = listData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (found) userId = found.id;
        if (!listData?.users?.length) break;
      }
      if (userId) process.stdout.write("(existing) ");
    }
    if (!userId) { console.log(`SKIP (${authErr?.message})`); continue; }

    // Build profile
    const prefs = isOther || cfg.event?.category !== "dating"
      ? buildFriendsPreferences({ gender: isOther ? "other" : gender as Gender })
      : buildSeedPreferences({ gender: gender as "male" | "female" });

    const { error: pErr } = await sb().from("profiles").upsert({
      id: userId,
      email,
      name: `${firstName} ${lastName}`,
      full_name: `${firstName} ${lastName}`,
      display_name: firstName,
      city: cfg.city,
      gender: prefs.gender,
      attracted_to: prefs.attracted_to,
      orientation: prefs.orientation,
      dob: deterministicDob(email, dobMinAge),
      status,
      role: "user",
      instagram: cfg.users.includeInstagram ? `@${firstName.toLowerCase()}.${lastName.toLowerCase().slice(0,4)}` : null,
      preferred_language: i % 6 === 0 ? "th" : "en",
      reason: REASONS[i % REASONS.length],
      seed_run_id: seedRunId,
    }, { onConflict: "id" });
    if (pErr) { console.log(`PROFILE ERR (${pErr.message})`); continue; }

    // Attendee (only approved users + event exists)
    if (eventId && status === "approved" && cfg.attendees?.joinAllApproved) {
      const approvedIndex = createdProfiles.filter(p => p.gender !== undefined).length; // track order
      const isCheckedIn = approvedIndex < checkedInCount;
      const isPaid = paidPct >= 100 || Math.random() * 100 < paidPct || !cfg.event?.payment.required;
      const paymentStatus = !cfg.event?.payment.required
        ? "free"
        : isPaid
        ? "paid"
        : "unpaid";
      const ticketStatus = isPaid ? "paid" : "reserved";

      const { error: attErr } = await sb().from("event_attendees").upsert({
        event_id: eventId,
        profile_id: userId,
        ticket_type_id: ticketTypeId,
        payment_status: paymentStatus,
        ticket_status: ticketStatus,
        paid_at: isPaid ? now : null,
        checked_in: isCheckedIn,
        checked_in_at: isCheckedIn ? now : null,
        seed_run_id: seedRunId,
      }, { onConflict: "event_id,profile_id" });
      if (attErr) { console.log(`ATTENDEE ERR (${attErr.message})`); continue; }

      // Answers
      if (cfg.attendees.questionnaire.complete && isCheckedIn) {
        const { data: existingAns } = await sb().from("answers").select("id").eq("event_id", eventId).eq("profile_id", userId).limit(1);
        if (!existingAns?.length) {
          const answerVec = makeAnswers(archIdx, Math.max(eventQuestionIds.length, questionIds.length, 20));
          const useEq = eventQuestionIds.length > 0;
          const ids = useEq ? eventQuestionIds : questionIds;
          const answerRows = ids.map((qid, qi) => ({
            event_id: eventId,
            profile_id: userId,
            event_question_id: useEq ? qid : null,
            question_id: useEq ? null : qid,
            answer: { value: answerVec[qi] ?? 3 },
            seed_run_id: seedRunId,
          }));
          const { error: ansErr } = await sb().from("answers").insert(answerRows);
          if (ansErr) { console.log(`ANSWERS ERR (${ansErr.message})`); continue; }
        }
      }
    }

    createdProfiles.push({ email, password, profileId: userId, gender: gender as Gender, firstName, lastName });
    console.log("✓");
  }

  console.log(`\n  ✅ ${createdProfiles.length}/${cfg.users.total} users created`);

  // 7. Write output JSON
  const outputDir = path.join(__dirname, ".seed-output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const output = {
    seed_run_id: seedRunId,
    label: cfg.label,
    city: cfg.city,
    event_id: eventId,
    event_url: eventId ? `${appUrl}/events/${eventId}` : null,
    admin_event_url: eventId ? `${appUrl}/admin/events/${eventId}` : null,
    total_users: createdProfiles.length,
    women: createdProfiles.filter((u) => u.gender === "female").length,
    men: createdProfiles.filter((u) => u.gender === "male").length,
    questions: eventQuestionIds.length || questionIds.length,
    demo_accounts: {
      female: createdProfiles.find((u) => u.gender === "female")
        ? { email: createdProfiles.find((u) => u.gender === "female")!.email, password: "Seed1234!", name: `${createdProfiles.find((u) => u.gender === "female")!.firstName} ${createdProfiles.find((u) => u.gender === "female")!.lastName}` }
        : null,
      male: createdProfiles.find((u) => u.gender === "male")
        ? { email: createdProfiles.find((u) => u.gender === "male")!.email, password: "Seed1234!", name: `${createdProfiles.find((u) => u.gender === "male")!.firstName} ${createdProfiles.find((u) => u.gender === "male")!.lastName}` }
        : null,
    },
    generated_at: now,
  };
  const outPath = path.join(outputDir, `${cfg.label}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`\n📝 Output written to ${outPath}`);

  // 8. Print summary
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Seed complete");
  if (eventId) {
    console.log(`   Event:       ${appUrl}/events/${eventId}`);
    console.log(`   Admin event: ${appUrl}/admin/events/${eventId}`);
  }
  if (output.demo_accounts.female) console.log(`   Female demo: ${output.demo_accounts.female.email} / Seed1234!`);
  if (output.demo_accounts.male)   console.log(`   Male demo:   ${output.demo_accounts.male.email} / Seed1234!`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const cli = parseArgs(process.argv.slice(2));

  // Guard env on non-dry-run only
  if (!cli.dryRun) {
    if (!url || !key) { console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
    if (process.env.SEED_CONFIRM !== "true") { console.error("❌ Set SEED_CONFIRM=true to seed"); process.exit(1); }
  }

  // Load config file if provided
  let fileCfg: Partial<SeedConfig> = {};
  if (cli.configPath) {
    const cfgPath = path.resolve(process.cwd(), cli.configPath);
    if (!fs.existsSync(cfgPath)) { console.error(`❌ Config file not found: ${cfgPath}`); process.exit(1); }
    fileCfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  }

  // Merge: file → CLI overrides → defaults
  const cliCfg = buildConfigFromArgs(cli);
  const merged = mergeWithDefaults({ ...fileCfg, ...cliCfg, label: cli.label ?? fileCfg.label ?? "" });

  // Validate
  const errors = validateConfig(merged);
  if (errors.length) {
    console.error("❌ Config validation failed:");
    errors.forEach((e) => console.error(`  • ${e}`));
    process.exit(1);
  }

  if (cli.dryRun) {
    printDryRun(merged);
    return;
  }

  // Force cleanup first
  if (cli.force) {
    console.log(`\n🧹 --force: cleaning existing label "${merged.label}" first…`);
    const { execSync } = await import("child_process");
    execSync(
      `SEED_CONFIRM=true npx tsx ${path.join(__dirname, "cleanup.ts")} --label "${merged.label}"`,
      { stdio: "inherit" }
    );
  }

  await runSeed(merged, false);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
