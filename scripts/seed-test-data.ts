import "dotenv/config";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { createAdminClient } from "../lib/supabase/adminClient";

type SeedCliOptions = {
  label?: string;
  cities: string[];
  usersPerCity: number;
  dryRun: boolean;
};

type SeedRunRecord = {
  id: string;
  label: string | null;
};

type SeedUserStatus = "approved" | "pending_approval" | "rejected";

type SeedProfileSummary = {
  profileId: string;
  authUserId: string;
  email: string;
  city: string;
  status: SeedUserStatus;
  fullName: string;
};

type SeedEventSummary = {
  id: string;
  city: string;
  title: string;
  category: "friends" | "dating";
  paymentRequired: boolean;
  hasTiers: boolean;
  startAt: string;
  endAt: string;
};

type SeedAttendeeSummary = {
  eventId: string;
  profileId: string;
  paymentStatus: string;
  checkedIn: boolean;
  questionnaireComplete: boolean;
};

type SeedOutput = {
  seedRun: SeedRunRecord;
  options: SeedCliOptions;
  users: SeedProfileSummary[];
  events: SeedEventSummary[];
  attendees: SeedAttendeeSummary[];
};

function parseCliArgs(argv: string[]): SeedCliOptions {
  let label: string | undefined;
  let cities: string[] | undefined;
  let usersPerCity = 10;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--label" && i + 1 < argv.length) {
      label = argv[++i];
    } else if (arg === "--cities" && i + 1 < argv.length) {
      cities = argv[++i]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg === "--users-per-city" && i + 1 < argv.length) {
      const raw = parseInt(argv[++i], 10);
      if (!Number.isNaN(raw) && raw > 0) {
        usersPerCity = raw;
      }
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return {
    label,
    cities: cities ?? ["Singapore", "Bangkok", "Manila"],
    usersPerCity,
    dryRun,
  };
}

function ensureEnvGuards(opts: SeedCliOptions) {
  const nodeEnv = process.env.NODE_ENV || "development";
  const seedConfirm = process.env.SEED_CONFIRM;
  const seedUserPassword = process.env.SEED_USER_PASSWORD;

  if (nodeEnv === "production" && seedConfirm !== "true") {
    console.error(
      "❌ Refusing to run in production without SEED_CONFIRM=true. Aborting."
    );
    process.exit(1);
  }

  if (!opts.dryRun && seedConfirm !== "true") {
    console.error(
      "❌ SEED_CONFIRM=true is required to run seed-test-data (non dry-run). Use --dry-run to preview."
    );
    process.exit(1);
  }

  if (!seedUserPassword) {
    console.error(
      "❌ SEED_USER_PASSWORD env var is required to create Supabase auth users for test data."
    );
    process.exit(1);
  }
}

async function createSeedRun(
  label: string | undefined,
  dryRun: boolean
): Promise<SeedRunRecord> {
  const effectiveLabel =
    label ??
    `test-seed-${new Date().toISOString().slice(0, 10)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  if (dryRun) {
    const id = randomUUID();
    console.log(
      `🧪 Dry run: would create seed_run with id=${id} label="${effectiveLabel}"`
    );
    return { id, label: effectiveLabel };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("seed_runs")
    .insert({ label: effectiveLabel })
    .select("id, label")
    .single();

  if (error || !data) {
    console.error("❌ Failed to create seed_run:", error?.message ?? "Unknown");
    process.exit(1);
  }

  console.log(
    `🌱 Created seed_run id=${data.id} label="${data.label ?? ""}"`
  );

  return { id: String(data.id), label: data.label ?? null };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function cityCode(city: string): string {
  const normalized = city.toLowerCase();
  if (normalized.startsWith("sing")) return "sg";
  if (normalized.startsWith("bang")) return "bkk";
  if (normalized.startsWith("man")) return "mnl";
  return slugify(city).slice(0, 6) || "city";
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomGender(): string {
  return randomChoice(["male", "female", "other"]);
}

function randomAttractedTo(gender: string): string {
  if (gender === "male") return randomChoice(["women", "both"]);
  if (gender === "female") return randomChoice(["men", "both"]);
  return randomChoice(["men", "women", "both"]);
}

function randomReason(city: string): string {
  const variants = [
    `Looking to meet new people in ${city} and explore new spots together.`,
    `Recently moved to ${city} and want to build a deeper community.`,
    `Hoping to find a small circle of like-minded people in ${city}.`,
    `Curious about more intentional, curated events in ${city}.`,
  ];
  return randomChoice(variants);
}

function randomPreferredLanguage(city: string): string {
  const normalized = city.toLowerCase();
  if (normalized.includes("bangkok") || normalized.includes("thai")) return "th";
  if (normalized.includes("manila") || normalized.includes("phil")) return "en";
  if (normalized.includes("ho chi") || normalized.includes("hanoi")) return "vi";
  return "en";
}

function buildFullName(
  city: string,
  status: SeedUserStatus,
  index: number
): string {
  const base =
    status === "approved"
      ? "Approved Guest"
      : status === "pending_approval"
      ? "Pending Guest"
      : "Rejected Guest";
  return `${base} ${cityCode(city).toUpperCase()} ${index}`;
}

async function createAuthUserWithProfile(params: {
  seedRunId: string;
  city: string;
  status: SeedUserStatus;
  index: number;
  emailPrefixBase: string;
  dryRun: boolean;
}): Promise<SeedProfileSummary> {
  const supabase = createAdminClient();
  const password = process.env.SEED_USER_PASSWORD as string;

  const code = cityCode(params.city);
  const email = `seed+${params.emailPrefixBase}+${code}+${params.status}+${params.index}@example.com`;
  const fullName = buildFullName(params.city, params.status, params.index);
  const gender = randomGender();
  const attractedTo = randomAttractedTo(gender);
  const phone = `+65${80000000 + Math.floor(Math.random() * 900000)}`; // pseudo-unique demo phone
  const preferredLanguage = randomPreferredLanguage(params.city);

  let authUserId: string;

  if (params.dryRun) {
    authUserId = randomUUID();
    console.log(
      `🧪 Dry run: would create auth user ${email} (${params.status}) with id=${authUserId}`
    );
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error || !data?.user) {
      console.error(
        `❌ Failed to create auth user for ${email}:`,
        error?.message ?? "Unknown"
      );
      process.exit(1);
    }

    authUserId = data.user.id;
  }

  const profileId = authUserId; // profiles.id is TEXT, but we use auth.uid()::text everywhere

  if (!params.dryRun) {
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: profileId,
        email,
        name: fullName,
        full_name: fullName,
        display_name: fullName,
        phone,
        phone_e164: phone,
        city: params.city,
        city_locked: params.status === "approved",
        instagram: `@${slugify(fullName)}`,
        dob: new Date(
          new Date().getFullYear() - (25 + (params.index % 10)),
          0,
          15
        ).toISOString(),
        gender,
        attracted_to: attractedTo,
        reason: randomReason(params.city),
        preferred_language: preferredLanguage,
        status: params.status,
        email_verified: true,
        role: "user",
        seed_run_id: params.seedRunId,
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      console.error(
        `❌ Failed to upsert profile for ${email}:`,
        profileError.message
      );
      process.exit(1);
    }
  } else {
    console.log(
      `🧪 Dry run: would upsert profile for ${email} with status=${params.status} city=${params.city}`
    );
  }

  return {
    profileId,
    authUserId,
    email,
    city: params.city,
    status: params.status,
    fullName,
  };
}

async function seedUsersForCity(params: {
  seedRunId: string;
  city: string;
  usersPerCity: number;
  emailPrefixBase: string;
  dryRun: boolean;
}): Promise<SeedProfileSummary[]> {
  const outputs: SeedProfileSummary[] = [];

  // Approved users (eligible for matching)
  for (let i = 1; i <= params.usersPerCity; i++) {
    outputs.push(
      await createAuthUserWithProfile({
        seedRunId: params.seedRunId,
        city: params.city,
        status: "approved",
        index: i,
        emailPrefixBase: params.emailPrefixBase,
        dryRun: params.dryRun,
      })
    );
  }

  // Pending users (gated)
  for (let i = 1; i <= 2; i++) {
    outputs.push(
      await createAuthUserWithProfile({
        seedRunId: params.seedRunId,
        city: params.city,
        status: "pending_approval",
        index: i,
        emailPrefixBase: params.emailPrefixBase,
        dryRun: params.dryRun,
      })
    );
  }

  // Rejected users (gated)
  for (let i = 1; i <= 2; i++) {
    outputs.push(
      await createAuthUserWithProfile({
        seedRunId: params.seedRunId,
        city: params.city,
        status: "rejected",
        index: i,
        emailPrefixBase: params.emailPrefixBase,
        dryRun: params.dryRun,
      })
    );
  }

  return outputs;
}

async function createEventWithDefaults(params: {
  name: string;
  description: string;
  startAt: Date;
  endAt: Date;
  city: string;
  category: "friends" | "dating";
  paymentRequired: boolean;
  priceCents: number;
  whatsIncluded?: string | null;
  seedRunId: string;
  dryRun: boolean;
}): Promise<string> {
  const supabase = createAdminClient();

  if (params.dryRun) {
    const fakeId = randomUUID();
    console.log(
      `🧪 Dry run: would create event "${params.name}" in ${params.city} with id=${fakeId}`
    );
    return fakeId;
  }

  const { data, error } = await supabase.rpc(
    "create_event_with_default_questions",
    {
      p_name: params.name,
      p_description: params.description,
      p_start_at: params.startAt.toISOString(),
      p_city: params.city,
      p_price_cents: params.priceCents,
      p_payment_required: params.paymentRequired,
      p_end_at: params.endAt.toISOString(),
      p_category: params.category,
      p_whats_included: params.whatsIncluded ?? null,
    }
  );

  if (error || !data) {
    console.error(
      `❌ Failed to create event "${params.name}":`,
      error?.message ?? "Unknown"
    );
    process.exit(1);
  }

  const eventId = String(data);

  const { error: tagError } = await supabase
    .from("events")
    .update({ seed_run_id: params.seedRunId })
    .eq("id", eventId);

  if (tagError) {
    console.error(
      `❌ Failed to tag event "${params.name}" with seed_run_id:`,
      tagError.message
    );
    process.exit(1);
  }

  return eventId;
}

async function seedTieredTicketTypesForEvent(params: {
  eventId: string;
  dryRun: boolean;
}): Promise<void> {
  const supabase = createAdminClient();

  const ticketTypes = [
    {
      code: "early_bird",
      name: "Early Bird",
      price_cents: 2500,
      cap: 20,
      sort_order: 1,
    },
    {
      code: "wave_1",
      name: "Wave 1",
      price_cents: 3100,
      cap: 30,
      sort_order: 2,
    },
    {
      code: "wave_2",
      name: "Wave 2",
      price_cents: 3500,
      cap: 30,
      sort_order: 3,
    },
    {
      code: "vip",
      name: "VIP",
      price_cents: 6000,
      cap: 10,
      sort_order: 4,
    },
  ];

  if (params.dryRun) {
    console.log(
      `🧪 Dry run: would insert ${ticketTypes.length} ticket tiers for event ${params.eventId}`
    );
    return;
  }

  const { error } = await supabase.from("event_ticket_types").insert(
    ticketTypes.map((t) => ({
      event_id: params.eventId,
      code: t.code,
      name: t.name,
      price_cents: t.price_cents,
      currency: "sgd",
      cap: t.cap,
      sort_order: t.sort_order,
      is_active: true,
    }))
  );

  if (error) {
    console.error(
      `❌ Failed to seed ticket types for event ${params.eventId}:`,
      error.message
    );
    process.exit(1);
  }
}

async function seedEventsForCities(params: {
  seedRunId: string;
  cities: string[];
  dryRun: boolean;
}): Promise<SeedEventSummary[]> {
  const outputs: SeedEventSummary[] = [];
  const now = new Date();
  const twoHoursMs = 2 * 60 * 60 * 1000;

  const supabase = createAdminClient();

  // Ensure at least one tiered paid event overall (in the first city).
  const primaryCity = params.cities[0] ?? "Singapore";

  // 1) Global past free event in primary city
  {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + twoHoursMs);
    const title = `[SEED] Past Friends Mixer (${primaryCity})`;
    const description =
      "A past friends mixer used to test historical event views and completed flows.";
    const id = await createEventWithDefaults({
      name: title,
      description,
      startAt: start,
      endAt: end,
      city: primaryCity,
      category: "friends",
      paymentRequired: false,
      priceCents: 0,
      seedRunId: params.seedRunId,
      dryRun: params.dryRun,
    });

    outputs.push({
      id,
      city: primaryCity,
      title,
      category: "friends",
      paymentRequired: false,
      hasTiers: false,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    });
  }

  // 2) Tiered paid flagship event in primary city
  {
    const start = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 3 * twoHoursMs);
    const title = `[SEED] Big Event (Tiered Tickets) – ${primaryCity}`;
    const description =
      "A flagship event with multiple ticket tiers (Early Bird, Waves, VIP) to test tiered pricing and caps.";

    const id = await createEventWithDefaults({
      name: title,
      description,
      startAt: start,
      endAt: end,
      city: primaryCity,
      category: "friends",
      paymentRequired: true,
      priceCents: 0,
      whatsIncluded:
        "- Curated matches based on your questionnaire\n- 2 complimentary drinks\n- Hosted icebreakers and group activities\n- Post-event recommendations and follow-ups",
      seedRunId: params.seedRunId,
      dryRun: params.dryRun,
    });

    await seedTieredTicketTypesForEvent({ eventId: id, dryRun: params.dryRun });

    outputs.push({
      id,
      city: primaryCity,
      title,
      category: "friends",
      paymentRequired: true,
      hasTiers: true,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    });
  }

  // 3) Per-city upcoming free + paid events
  for (const city of params.cities) {
    const baseOffsetDays =
      10 + Math.floor(Math.abs(slugify(city).charCodeAt(0) % 5));

    // Upcoming free friends event per city
    {
      const start = new Date(now.getTime() + baseOffsetDays * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + twoHoursMs);
      const title = `[SEED] Friends Mixer (Free) – ${city}`;
      const description =
        "An upcoming free mixer in this city to test RSVP, questionnaire, and matching eligibility.";

      const id = await createEventWithDefaults({
        name: title,
        description,
        startAt: start,
        endAt: end,
        city,
        category: "friends",
        paymentRequired: false,
        priceCents: 0,
        seedRunId: params.seedRunId,
        dryRun: params.dryRun,
      });

      outputs.push({
        id,
        city,
        title,
        category: "friends",
        paymentRequired: false,
        hasTiers: false,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      });
    }

    // Upcoming paid dating event per city
    {
      const start = new Date(
        now.getTime() + (baseOffsetDays + 3) * 24 * 60 * 60 * 1000
      );
      const end = new Date(start.getTime() + twoHoursMs);
      const title = `[SEED] Dating Night (Paid) – ${city}`;
      const description =
        "A dating-focused night event with a single ticket price to test paid dating flows.";

      const id = await createEventWithDefaults({
        name: title,
        description,
        startAt: start,
        endAt: end,
        city,
        category: "dating",
        paymentRequired: true,
        priceCents: 3900,
        seedRunId: params.seedRunId,
        dryRun: params.dryRun,
      });

      outputs.push({
        id,
        city,
        title,
        category: "dating",
        paymentRequired: true,
        hasTiers: false,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      });
    }
  }

  // Small sanity check when not in dry-run: ensure questions exist for all events
  if (!params.dryRun) {
    const eventIds = outputs.map((e) => e.id);
    const { data: questions, error } = await supabase
      .from("questions")
      .select("event_id")
      .in("event_id", eventIds);

    if (error) {
      console.error(
        "❌ Failed to verify questions for seeded events:",
        error.message
      );
      process.exit(1);
    }

    const withQuestions = new Set((questions ?? []).map((q) => q.event_id));
    const missing = eventIds.filter((id) => !withQuestions.has(id));
    if (missing.length > 0) {
      console.error(
        "❌ Some seeded events are missing questions. Check create_event_with_default_questions:",
        missing
      );
      process.exit(1);
    }
  }

  return outputs;
}

function clusterBaseValue(
  cluster: "extrovert" | "introvert" | "balanced",
  orderIndex: number
): number {
  if (cluster === "balanced") return 3;
  const mod = orderIndex % 4;
  if (cluster === "extrovert") {
    return mod === 0 || mod === 1 ? 4 : 3;
  }
  // introvert: prefer lower values on some social questions
  return mod === 0 || mod === 1 ? 2 : 3;
}

function jitter(value: number): number {
  const delta = randomChoice([0, 0, 1, -1]); // more weight on 0
  const v = value + delta;
  return Math.min(4, Math.max(1, v));
}

async function seedAttendeesAndAnswers(params: {
  seedRunId: string;
  users: SeedProfileSummary[];
  events: SeedEventSummary[];
  dryRun: boolean;
}): Promise<SeedAttendeeSummary[]> {
  const supabase = createAdminClient();
  const outputs: SeedAttendeeSummary[] = [];

  const approvedByCity = new Map<string, SeedProfileSummary[]>();
  for (const u of params.users) {
    if (u.status !== "approved") continue;
    if (!approvedByCity.has(u.city)) approvedByCity.set(u.city, []);
    approvedByCity.get(u.city)!.push(u);
  }

  // Preload questions per event
  const questionsByEvent = new Map<
    string,
    { id: string; order_index: number }[]
  >();

  if (!params.dryRun) {
    const eventIds = params.events.map((e) => e.id);
    const { data, error } = await supabase
      .from("questions")
      .select("id, event_id, order_index")
      .in("event_id", eventIds)
      .order("order_index", { ascending: true });

    if (error) {
      console.error(
        "❌ Failed to load questions for seeded events:",
        error.message
      );
      process.exit(1);
    }

    for (const row of data ?? []) {
      const list = questionsByEvent.get(row.event_id) ?? [];
      list.push({ id: row.id as string, order_index: row.order_index as number });
      questionsByEvent.set(row.event_id as string, list);
    }
  }

  for (const event of params.events) {
    const cityUsers = approvedByCity.get(event.city) ?? [];
    if (!cityUsers.length) continue;

    const targetCount = Math.min(
      cityUsers.length,
      8 + Math.floor(Math.random() * 3)
    );

    const shuffled = [...cityUsers].sort(() => Math.random() - 0.5);
    const attendees = shuffled.slice(0, targetCount);

    const isPaid = event.paymentRequired;
    const isTiered = event.hasTiers;

    let ticketTypesForEvent: { id: string; code: string }[] = [];
    if (!params.dryRun && isTiered) {
      const { data: tt, error: ttError } = await supabase
        .from("event_ticket_types")
        .select("id, code")
        .eq("event_id", event.id);
      if (ttError) {
        console.error(
          `❌ Failed to load ticket types for tiered event ${event.id}:`,
          ttError.message
        );
        process.exit(1);
      }
      ticketTypesForEvent = tt ?? [];
    }

    const attendeesRows: any[] = [];

    attendees.forEach((user, index) => {
      const isCheckedIn = index < Math.ceil(targetCount * 0.7);
      let paymentStatus = "paid";

      if (isPaid) {
        // Make roughly 20–30% unpaid to test gating.
        const unpaid = index >= Math.floor(targetCount * 0.7);
        paymentStatus = unpaid ? "unpaid" : "paid";
      }

      let ticketTypeId: string | null = null;
      let ticketStatus = "reserved";

      if (isTiered && ticketTypesForEvent.length > 0) {
        const tt = ticketTypesForEvent[index % ticketTypesForEvent.length];
        ticketTypeId = tt.id;
        ticketStatus = paymentStatus === "paid" ? "paid" : "reserved";
      }

      attendeesRows.push({
        event_id: event.id,
        profile_id: user.profileId,
        joined_at: new Date().toISOString(),
        payment_status: paymentStatus,
        ticket_type_id: ticketTypeId,
        ticket_status: ticketStatus,
        checked_in: isCheckedIn,
        checked_in_at: isCheckedIn ? new Date().toISOString() : null,
        checked_in_by: null,
        seed_run_id: params.seedRunId,
      });

      outputs.push({
        eventId: event.id,
        profileId: user.profileId,
        paymentStatus,
        checkedIn: isCheckedIn,
        questionnaireComplete: true,
      });
    });

    if (!params.dryRun && attendeesRows.length > 0) {
      const { error: insertError } = await supabase
        .from("event_attendees")
        .upsert(attendeesRows, { onConflict: "event_id,profile_id" });
      if (insertError) {
        console.error(
          `❌ Failed to insert attendees for event ${event.id}:`,
          insertError.message
        );
        process.exit(1);
      }
    } else if (params.dryRun) {
      console.log(
        `🧪 Dry run: would insert ${attendeesRows.length} attendees for event ${event.id} (${event.title})`
      );
    }

    // Answers: generate clustered patterns so matches look meaningful.
    if (params.dryRun) {
      console.log(
        `🧪 Dry run: would insert answers for ${attendees.length} attendees on event ${event.id}`
      );
      continue;
    }

    const questions = questionsByEvent.get(event.id) ?? [];
    if (!questions.length) continue;

    const answerRows: any[] = [];

    attendees.forEach((user, index) => {
      const cluster: "extrovert" | "introvert" | "balanced" =
        index % 3 === 0 ? "extrovert" : index % 3 === 1 ? "introvert" : "balanced";

      for (const q of questions) {
        const base = clusterBaseValue(cluster, q.order_index);
        const value = jitter(base);
        answerRows.push({
          event_id: event.id,
          question_id: q.id,
          profile_id: user.profileId,
          answer: { value },
          updated_at: new Date().toISOString(),
          seed_run_id: params.seedRunId,
        });
      }
    });

    if (answerRows.length > 0) {
      const { error: answersError } = await supabase
        .from("answers")
        .upsert(answerRows, {
          onConflict: "event_id,question_id,profile_id",
        });
      if (answersError) {
        console.error(
          `❌ Failed to insert answers for event ${event.id}:`,
          answersError.message
        );
        process.exit(1);
      }
    }
  }

  return outputs;
}

function writeSeedOutputFile(output: SeedOutput) {
  const outputDir = path.join(__dirname, ".seed-output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const safeLabel =
    output.seedRun.label && output.seedRun.label.length > 0
      ? slugify(output.seedRun.label)
      : output.seedRun.id;

  const outputPath = path.join(outputDir, `test-data-${safeLabel}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`\n📝 Seed summary written to ${outputPath}`);
}

async function main() {
  const opts = parseCliArgs(process.argv.slice(2));
  ensureEnvGuards(opts);

  console.log("🌱 Seeding Supabase test/demo data...");
  console.log(`  Dry run: ${opts.dryRun ? "yes" : "no"}`);
  console.log(`  Label: ${opts.label ?? "(auto-generated)"}`);
  console.log(`  Cities: ${opts.cities.join(", ")}`);
  console.log(`  Users per city (approved): ${opts.usersPerCity}`);

  const seedRun = await createSeedRun(opts.label, opts.dryRun);
  const emailPrefixBase = slugify(seedRun.label ?? seedRun.id);

  const allUsers: SeedProfileSummary[] = [];
  for (const city of opts.cities) {
    console.log(`\n👥 Seeding users for city: ${city}`);
    const users = await seedUsersForCity({
      seedRunId: seedRun.id,
      city,
      usersPerCity: opts.usersPerCity,
      emailPrefixBase,
      dryRun: opts.dryRun,
    });
    allUsers.push(...users);
  }

  console.log("\n🎟️ Seeding events for cities...");
  const events = await seedEventsForCities({
    seedRunId: seedRun.id,
    cities: opts.cities,
    dryRun: opts.dryRun,
  });

  console.log("\n🧾 Seeding attendees + answers for upcoming events...");
  const attendees = await seedAttendeesAndAnswers({
    seedRunId: seedRun.id,
    users: allUsers,
    events,
    dryRun: opts.dryRun,
  });

  const output: SeedOutput = {
    seedRun,
    options: opts,
    users: allUsers,
    events,
    attendees,
  };

  if (!opts.dryRun) {
    writeSeedOutputFile(output);
  } else {
    console.log(
      "\n🧪 Dry run complete – no database changes were made (no output file written)."
    );
  }

  console.log("\n✅ Seed-test-data script finished.");
}

main().catch((err) => {
  console.error("Unexpected error in seed-test-data:", err);
  process.exit(1);
});

