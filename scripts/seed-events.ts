import "dotenv/config";
import fs from "fs";
import path from "path";
import { createAdminClient } from "../lib/supabase/adminClient";

type SeededEvent = {
  key: string;
  id: string;
  title: string;
  category: string;
  payment_required: boolean;
  price_cents: number;
};

function ensureEnvGuards() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const seedConfirm = process.env.SEED_CONFIRM;

  if (nodeEnv === "production" && seedConfirm !== "true") {
    console.error(
      "❌ Refusing to run in production without SEED_CONFIRM=true. Aborting."
    );
    process.exit(1);
  }

  if (seedConfirm !== "true") {
    console.error(
      "❌ SEED_CONFIRM=true is required to run seed-events. This script can modify data."
    );
    process.exit(1);
  }
}

function nowUtc(): Date {
  return new Date();
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
}): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("create_event_with_default_questions", {
    p_name: params.name,
    p_description: params.description,
    p_start_at: params.startAt.toISOString(),
    p_city: params.city,
    p_price_cents: params.priceCents,
    p_payment_required: params.paymentRequired,
    p_end_at: params.endAt.toISOString(),
    p_category: params.category,
    p_whats_included: params.whatsIncluded ?? null,
  });

  if (error) {
    throw new Error(
      `Failed to create event "${params.name}": ${error.message}`
    );
  }

  if (!data) {
    throw new Error(`RPC create_event_with_default_questions returned no id for "${params.name}"`);
  }

  return String(data);
}

async function seedTicketTypesForEvent(eventId: string) {
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

  const { error } = await supabase.from("event_ticket_types").insert(
    ticketTypes.map((t) => ({
      event_id: eventId,
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
    throw new Error(
      `Failed to create ticket types for event ${eventId}: ${error.message}`
    );
  }
}

function writeSeedOutput(events: SeededEvent[]) {
  const outputDir = path.join(__dirname, ".seed-output");
  const outputPath = path.join(outputDir, "events.json");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    events,
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`\n📝 Seed output written to ${outputPath}`);
}

async function main() {
  ensureEnvGuards();

  console.log("🌱 Seeding demo events...");

  const baseNow = nowUtc();
  const twoHoursMs = 2 * 60 * 60 * 1000;

  const pastStart = new Date(baseNow.getTime() - 14 * 24 * 60 * 60 * 1000);
  const pastEnd = new Date(pastStart.getTime() + twoHoursMs);

  const futureStart = new Date(baseNow.getTime() + 14 * 24 * 60 * 60 * 1000);
  const futureEnd = new Date(futureStart.getTime() + twoHoursMs);

  const todayStart = baseNow;
  const todayEnd = new Date(todayStart.getTime() + twoHoursMs);

  const seededEvents: SeededEvent[] = [];

  // 1) Past Friends Mixer (Free)
  const pastFreeId = await createEventWithDefaults({
    name: "Past Friends Mixer (Free)",
    description:
      "A past friends-focused mixer to test historical event views and completed flows.",
    startAt: pastStart,
    endAt: pastEnd,
    city: "Singapore",
    category: "friends",
    paymentRequired: false,
    priceCents: 0,
  });
  console.log(`- Created Past Friends Mixer (Free): ${pastFreeId}`);
  seededEvents.push({
    key: "past_friends_free",
    id: pastFreeId,
    title: "Past Friends Mixer (Free)",
    category: "friends",
    payment_required: false,
    price_cents: 0,
  });

  // 2) Future Friends Mixer (Free)
  const futureFreeId = await createEventWithDefaults({
    name: "Future Friends Mixer (Free)",
    description:
      "An upcoming free mixer for friends, used to test future event states.",
    startAt: futureStart,
    endAt: futureEnd,
    city: "Singapore",
    category: "friends",
    paymentRequired: false,
    priceCents: 0,
  });
  console.log(`- Created Future Friends Mixer (Free): ${futureFreeId}`);
  seededEvents.push({
    key: "future_friends_free",
    id: futureFreeId,
    title: "Future Friends Mixer (Free)",
    category: "friends",
    payment_required: false,
    price_cents: 0,
  });

  // 3) Dating Night (Paid Single Price)
  const datingPaidId = await createEventWithDefaults({
    name: "Dating Night (Paid Single Price)",
    description:
      "A dating-focused night event with a single ticket price to test paid dating flows.",
    startAt: futureStart,
    endAt: futureEnd,
    city: "Singapore",
    category: "dating",
    paymentRequired: true,
    priceCents: 3900,
  });
  console.log(`- Created Dating Night (Paid Single Price): ${datingPaidId}`);
  seededEvents.push({
    key: "dating_single_price",
    id: datingPaidId,
    title: "Dating Night (Paid Single Price)",
    category: "dating",
    payment_required: true,
    price_cents: 3900,
  });

  // 4) Friends Mixer (Paid Single Price)
  const friendsPaidId = await createEventWithDefaults({
    name: "Friends Mixer (Paid Single Price)",
    description:
      "A paid friends mixer with a single ticket price to test paid friends flows.",
    startAt: todayStart,
    endAt: todayEnd,
    city: "Singapore",
    category: "friends",
    paymentRequired: true,
    priceCents: 3100,
  });
  console.log(`- Created Friends Mixer (Paid Single Price): ${friendsPaidId}`);
  seededEvents.push({
    key: "friends_single_price",
    id: friendsPaidId,
    title: "Friends Mixer (Paid Single Price)",
    category: "friends",
    payment_required: true,
    price_cents: 3100,
  });

  // 5) Big Event (Tiered Tickets)
  const bigEventId = await createEventWithDefaults({
    name: "Big Event (Tiered Tickets)",
    description:
      "A large flagship event with multiple ticket tiers (Early Bird, Waves, VIP) to test tiered pricing and caps.",
    startAt: futureStart,
    endAt: new Date(futureEnd.getTime() + twoHoursMs),
    city: "Singapore",
    category: "friends",
    paymentRequired: true,
    priceCents: 0,
    whatsIncluded:
      "- Curated matches based on your questionnaire\n- 2 complimentary drinks\n- Hosted icebreakers and group activities\n- Post-event recommendations and follow-ups",
  });
  console.log(`- Created Big Event (Tiered Tickets): ${bigEventId}`);

  await seedTicketTypesForEvent(bigEventId);
  console.log(
    `  → Seeded ticket tiers (Early Bird, Wave 1, Wave 2, VIP) for ${bigEventId}`
  );

  seededEvents.push({
    key: "big_event_tiered",
    id: bigEventId,
    title: "Big Event (Tiered Tickets)",
    category: "friends",
    payment_required: true,
    price_cents: 0,
  });

  writeSeedOutput(seededEvents);

  console.log("\n✅ Seeded demo events successfully.");
}

main().catch((err) => {
  console.error("Unexpected error in seed-events:", err);
  process.exit(1);
});

