/**
 * Verify that a dating event has zero same-gender match pairs.
 *
 * Usage (after running matching in admin UI):
 *   npx tsx scripts/verify-dating-matching.ts --event-id <uuid>
 *   npx tsx scripts/verify-dating-matching.ts  # uses event_id from scripts/.seed-output/dating30.json
 *
 * Exits 0 on pass, 1 on failure.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function parseArgs(argv: string[]): { eventId?: string } {
  let eventId: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--event-id" && argv[i + 1]) eventId = argv[++i];
  }
  return { eventId };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { eventId: argEventId } = parseArgs(process.argv.slice(2));

  // Resolve event ID from arg or from seed output JSON
  let eventId = argEventId;
  if (!eventId) {
    const seedOut = path.join(__dirname, ".seed-output", "dating30.json");
    if (fs.existsSync(seedOut)) {
      const json = JSON.parse(fs.readFileSync(seedOut, "utf8")) as { event_id?: string };
      eventId = json.event_id;
      console.log(`ℹ️  Using event_id from dating30.json: ${eventId}`);
    }
  }
  if (!eventId) {
    console.error("❌ No --event-id provided and dating30.json not found.");
    process.exit(1);
  }

  // Verify event is dating category
  const { data: event, error: evtErr } = await supabase
    .from("events")
    .select("id, title, category")
    .eq("id", eventId)
    .maybeSingle();
  if (evtErr || !event) {
    console.error(`❌ Event not found: ${eventId}`);
    process.exit(1);
  }
  if ((event as { category: string }).category !== "dating") {
    console.warn(`⚠️  Event "${(event as { title: string }).title}" category is "${(event as { category: string }).category}", not "dating". Skipping gender check.`);
    process.exit(0);
  }

  // Load all match results
  const { data: results, error: resErr } = await supabase
    .from("match_results")
    .select("id, a_profile_id, b_profile_id, round, score")
    .eq("event_id", eventId)
    .order("round", { ascending: true });
  if (resErr) {
    console.error("❌ Error loading match_results:", resErr.message);
    process.exit(1);
  }
  if (!results?.length) {
    console.log("ℹ️  No match_results found yet. Run matching in admin UI first.");
    process.exit(0);
  }

  // Load genders for all matched profiles
  const profileIds = Array.from(
    new Set(results.flatMap((r: { a_profile_id: string; b_profile_id: string }) =>
      [r.a_profile_id, r.b_profile_id]
    ))
  );
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, gender")
    .in("id", profileIds);
  if (profErr) {
    console.error("❌ Error loading profiles:", profErr.message);
    process.exit(1);
  }
  const genderById = new Map<string, string>(
    (profiles || []).map((p: { id: string; gender: string | null }) => [p.id, p.gender ?? "unknown"])
  );

  // Check each pair
  let violations = 0;
  let unknownGender = 0;

  console.log(`\n🔍 Checking ${results.length} match pair(s) for event: "${(event as { title: string }).title}"\n`);

  for (const r of results as Array<{ id: string; a_profile_id: string; b_profile_id: string; round: number; score: number }>) {
    const ga = genderById.get(r.a_profile_id) ?? "unknown";
    const gb = genderById.get(r.b_profile_id) ?? "unknown";
    const isOpposite = (ga === "male" && gb === "female") || (ga === "female" && gb === "male");
    const hasUnknown = ga === "unknown" || gb === "unknown";

    if (hasUnknown) {
      console.warn(`  ⚠️  Round ${r.round} pair has unknown gender: ${r.a_profile_id} (${ga}) ↔ ${r.b_profile_id} (${gb})`);
      unknownGender++;
    } else if (!isOpposite) {
      console.error(`  ❌ SAME-GENDER PAIR: Round ${r.round} — ${r.a_profile_id} (${ga}) ↔ ${r.b_profile_id} (${gb})`);
      violations++;
    } else {
      console.log(`  ✓  Round ${r.round} — ${ga} ↔ ${gb} (score: ${r.score})`);
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   Total pairs:      ${results.length}`);
  console.log(`   Same-gender:      ${violations}`);
  console.log(`   Unknown gender:   ${unknownGender}`);
  console.log(`   Valid (M↔F):      ${results.length - violations - unknownGender}`);

  if (violations > 0) {
    console.error(`\n❌ FAIL: ${violations} same-gender pair(s) found. Dating constraint is broken.`);
    process.exit(1);
  }
  if (unknownGender > 0) {
    console.warn(`\n⚠️  WARN: ${unknownGender} pair(s) involve unknown gender. Check profile data.`);
    process.exit(0);
  }
  console.log(`\n✅ PASS: All pairs are male↔female. Dating constraint is working correctly.`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
